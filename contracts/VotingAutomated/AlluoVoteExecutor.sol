// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {IERC20MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import {EnumerableSetUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import {AddressUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import {ECDSAUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";

import {DecimalConverter} from "../libs/DecimalConverter.sol";
import {AlluoMessaging} from "../crosschain/AlluoMessaging.sol";
import {AlluoUpgradeableBase} from "../AlluoUpgradeableBase.sol";

import {ILiquidityHandler} from "../interfaces/ILiquidityHandler.sol";
import {IAlluoToken} from "../interfaces/IAlluoToken.sol";
import {ILocker} from "../interfaces/ILocker.sol";
import {IGnosis} from "../interfaces/IGnosis.sol";
import {IAlluoStrategyV2} from "../interfaces/IAlluoStrategyV2.sol";
import {IExchange} from "../interfaces/IExchange.sol";
import {IWrappedEther} from "../interfaces/IWrappedEther.sol";
import {IIbAlluo} from "../interfaces/IIbAlluo.sol";
import {IPriceFeedRouterV2} from "../interfaces/IPriceFeedRouterV2.sol";
import {IAlluoStrategyHandler} from "../interfaces/IAlluoStrategyHandler.sol";
import {ICvxDistributor} from "../interfaces/ICvxDistributor.sol";
import {IAlluoVoteExecutorUtils} from "../interfaces/IAlluoVoteExecutorUtils.sol";

// solhint-disable-next-line
import "hardhat/console.sol";

contract AlluoVoteExecutor is AlluoUpgradeableBase, AlluoMessaging {
    using ECDSAUpgradeable for bytes32;
    using AddressUpgradeable for address;
    using SafeERC20Upgradeable for IERC20MetadataUpgradeable;

    address public constant ALLUO = 0x1E5193ccC53f25638Aa22a940af899B692e10B09;
    address public constant FUND_MANAGER =
        0xBac731029f8F92D147Acc701aB1B4B099C31A3c4;

    IWrappedEther public constant WETH =
        IWrappedEther(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2);

    address public gnosis;
    address public locker;
    address public exchangeAddress;
    address public priceFeed;
    address public liquidityHandler;
    address public strategyHandler;
    uint256 public timeLock;
    uint256 public minSigns;
    address public cvxDistributor;
    address public voteExecutorUtils;

    mapping(string => address) public ibAlluoSymbolToAddress;
    mapping(bytes32 => uint256) public hashExecutionTime;
    mapping(uint256 => Deposit[]) public assetIdToDepositPercentages;

    SubmittedData[] public submittedData;
    bytes[] public executionHistory;

    struct Deposit {
        uint256 directionId;
        uint256 amount;
    }

    struct Message {
        uint256 commandIndex;
        bytes commandData;
    }

    struct SubmittedData {
        bytes data;
        uint256 time;
        bytes[] signs;
    }

    event MessageReceived(bytes32 indexed hashed);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize(address _multiSigWallet) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        require(_multiSigWallet.isContract());
        gnosis = _multiSigWallet;
        minSigns = 1;
        exchangeAddress = 0x29c66CF57a03d41Cfe6d9ecB6883aa0E2AbA21Ec;

        _grantRole(DEFAULT_ADMIN_ROLE, _multiSigWallet);
        _grantRole(UPGRADER_ROLE, _multiSigWallet);
    }

    receive() external payable {
        if (msg.sender != address(WETH)) {
            WETH.deposit{value: msg.value}();
        }
    }

    /// @notice Allows anyone to submit data for execution of votes
    /// @dev Attempts to parse at high level and then confirm hash before submitting to queue
    /// @param data Payload fully encoded as required (see formatting using encoding functions below)

    function submitData(bytes memory data) external {
        (bytes32 hashed, Message[] memory _messages, uint256 timestamp) = abi
            .decode(data, (bytes32, Message[], uint256));

        require(hashed == keccak256(abi.encode(_messages, timestamp)));

        SubmittedData memory newSubmittedData;
        newSubmittedData.data = data;
        newSubmittedData.time = block.timestamp;
        submittedData.push(newSubmittedData);
    }

    /// @notice Allow anyone to approve data for execution given off-chain signatures
    /// @dev Checks against existing sigs submitted and only allow non-duplicate multisig owner signatures to approve the payload
    /// @param _dataId Id of data payload to be approved
    /// @param _signs Array of off-chain EOA signatures to approve the payload.

    function approveSubmittedData(
        uint256 _dataId,
        bytes[] memory _signs
    ) external {
        // SubmittedData storage fullSubmittedData = submittedData[_dataId];
        (bytes32 dataHash, , ) = abi.decode(
            submittedData[_dataId].data,
            (bytes32, Message[], uint256)
        );
        address[] memory owners = IGnosis(gnosis).getOwners();
        bytes[] memory submittedSigns = submittedData[_dataId].signs;
        address[] memory uniqueSigners = new address[](owners.length);
        uint256 numberOfSigns;

        for (uint256 i; i < submittedSigns.length; i++) {
            numberOfSigns++;
            uniqueSigners[i] = IAlluoVoteExecutorUtils(voteExecutorUtils)
                .getSignerAddress(dataHash, submittedSigns[i]);
        }

        for (uint256 i; i < _signs.length; i++) {
            for (uint256 j; j < owners.length; j++) {
                if (
                    IAlluoVoteExecutorUtils(voteExecutorUtils).verify(
                        dataHash,
                        _signs[i],
                        owners[j]
                    ) &&
                    IAlluoVoteExecutorUtils(voteExecutorUtils)
                        .checkUniqueSignature(uniqueSigners, owners[j])
                ) {
                    submittedData[_dataId].signs.push(_signs[i]);
                    uniqueSigners[numberOfSigns] = owners[j];
                    numberOfSigns++;
                    break;
                }
            }
        }
    }

    function _anyExecuteLogic(
        bytes calldata data
    ) internal override returns (bool success, bytes memory result) {
        bytes memory returnedData = IAlluoVoteExecutorUtils(voteExecutorUtils)
            .confirmDataIntegrity(data, gnosis, minSigns);
        (bytes32 hashed, Message[] memory messages, ) = abi.decode(
            returnedData,
            (bytes32, Message[], uint256)
        );

        require(hashExecutionTime[hashed] == 0, "Duplicate hash");

        // Now that the data has been confirmed, we can execute it
        for (uint256 i; i < messages.length; i++) {
            Message memory currentMessage = messages[i];
            console.log("Message index", currentMessage.commandIndex);
            if (currentMessage.commandIndex == 0) {
                // _executeAPYCommand(currentMessage.commandData);
            } else if (currentMessage.commandIndex == 1) {
                // _executeMintCommand(currentMessage.commandData);
            } else if (
                currentMessage.commandIndex == 2 ||
                currentMessage.commandIndex == 3
            ) {
                // If the message is anything to do with liquidity direction, queue it because we need to execute them in bulk together after TVL is updated.
                //                uint8 assetId,
                // uint256 directionId,
                // uint256 percentage,
                // uint256 tvlForAsset
                IAlluoStrategyHandler handler = IAlluoStrategyHandler(
                    strategyHandler
                );
                (uint256 directionId, uint256 percent) = abi.decode(
                    currentMessage.commandData,
                    (uint256, uint256)
                );

                (
                    address strategyPrimaryToken,
                    IAlluoStrategyHandler.LiquidityDirection memory direction
                ) = handler.getDirectionFullInfoById(directionId);
                if (direction.chainId == block.chainid) {
                    uint8 assetId = handler.tokenToAssetId(
                        strategyPrimaryToken
                    );
                    uint256 tvlForAsset = handler.getAssetAmount(assetId);
                    console.log("directionId", directionId);
                    handler.rebalanceUntilTarget(
                        assetId,
                        directionId,
                        percent,
                        tvlForAsset
                    );
                }
            }
        }

        executionHistory.push(data);
        hashExecutionTime[hashed] = block.timestamp;

        // Crosschain call.

        success = true;
        result = "";
        emit MessageReceived(hashed);
    }

    function markAllChainPositions() external {
        // Mark all chains' positions to market and store these tvl values per each asset
        // Only execute deposits and withdrawals if these TVL values are updated.
        // Also this means you can only change treasury exposure if you update TVL values, but the main master contract can calculate how much exactly.
    }

    // Function to send funds to CVX-ETH

    /// @notice Updates all the ibAlluo addresses used when setting APY
    function updateAllIbAlluoAddresses() public {
        address[] memory ibAlluoAddressList = ILiquidityHandler(
            liquidityHandler
        ).getListOfIbAlluos();
        for (uint256 i; i < ibAlluoAddressList.length; i++) {
            ibAlluoSymbolToAddress[
                IIbAlluo(ibAlluoAddressList[i]).symbol()
            ] = ibAlluoAddressList[i];
        }
    }

    function getAssetIdToDepositPercentages(
        uint256 _assetId
    ) public view returns (Deposit[] memory) {
        return assetIdToDepositPercentages[_assetId];
    }

    function multicall(
        address[] calldata destinations,
        bytes[] calldata calldatas
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 length = destinations.length;
        for (uint256 i = 0; i < length; i++) {
            destinations[i].functionCall(calldatas[i]);
        }
    }
}
