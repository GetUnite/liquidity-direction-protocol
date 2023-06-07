// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import {IERC20MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import {EnumerableSetUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";
import {AddressUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import {ECDSAUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";

import {DecimalConverter} from "../libs/DecimalConverter.sol";
import {AlluoAcrossMessaging} from "../crosschain/AlluoAcrossMessaging.sol";
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

contract AlluoVoteExecutor is AlluoUpgradeableBase, AlluoAcrossMessaging {
    using ECDSAUpgradeable for bytes32;
    using AddressUpgradeable for address;
    using SafeERC20Upgradeable for IERC20MetadataUpgradeable;

    address public constant ALLUO = 0x1E5193ccC53f25638Aa22a940af899B692e10B09;
    address public constant FUND_MANAGER =
        0xBac731029f8F92D147Acc701aB1B4B099C31A3c4;

    IWrappedEther public constant WETH =
        IWrappedEther(0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2);
    bytes4 internal constant MAGICVALUE = 0x1626ba7e;
    bool public isMaster;

    address public gnosis;
    address public locker;
    address public exchangeAddress;
    address public priceFeed;
    address public liquidityHandler;
    address public strategyHandler;
    address public cvxDistributor;
    address public voteExecutorUtils;

    uint256 public timeLock;
    uint256 public minSigns;

    mapping(string => address) public ibAlluoSymbolToAddress;
    mapping(bytes32 => uint256) public hashExecutionTime;
    mapping(uint256 => Deposit[]) public assetIdToDepositPercentages;

    SubmittedData[] public submittedData;
    bytes[] public executionHistory;
    bytes[] public storedCrosschainData;
    mapping(bytes32 => bool) public executed;
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
    event logged(bytes data);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    // Set all parameters
    function initialize(
        address _multiSigWallet,
        address _exchangeAddress,
        address _priceFeed,
        address _liquidityHandler,
        address _strategyHandler,
        address _cvxDistributor,
        address _voteExecutorUtils,
        address _locker,
        uint256 _timeLock,
        uint256 _minSigns,
        bool _isMaster
    ) public initializer {
        __AlluoUpgradeableBase_init();
        gnosis = _multiSigWallet;
        minSigns = _minSigns;
        exchangeAddress = _exchangeAddress;
        priceFeed = _priceFeed;
        liquidityHandler = _liquidityHandler;
        strategyHandler = _strategyHandler;
        cvxDistributor = _cvxDistributor;
        voteExecutorUtils = _voteExecutorUtils;
        locker = _locker;
        timeLock = _timeLock;
        isMaster = _isMaster;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);
        _grantRole(DEFAULT_ADMIN_ROLE, _multiSigWallet);
        _grantRole(UPGRADER_ROLE, _multiSigWallet);
    }

    receive() external payable {
        // if (msg.sender != address(WETH)) {
        //     WETH.deposit{value: msg.value}();
        // }
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

    function executeSpecificData(
        uint256 index
    ) public onlyRole(DEFAULT_ADMIN_ROLE) {
        SubmittedData memory exactData = submittedData[index];
        // _anyExecuteLogic(exactData.data);
        _internalExecutionofData(exactData.data, exactData.signs);
    }

    function _internalExecutionofData(
        bytes memory message,
        bytes[] memory signs
    ) internal returns (bool success, bytes memory result) {
        IAlluoVoteExecutorUtils utils = IAlluoVoteExecutorUtils(
            voteExecutorUtils
        );

        (bytes32 hashed, Message[] memory messages, uint256 timestamp) = abi
            .decode(message, (bytes32, Message[], uint256));

        require(
            utils.timestampLastUpdatedWithinPeriod(timestamp, timeLock),
            "Data too old"
        );

        if (signs.length == 0 && minSigns != 0) {
            require(
                messages.length == 1 && messages[0].commandIndex == 4,
                "Only TVL update allowed"
            );
            uint256[][] memory executorBalances = abi.decode(
                messages[0].commandData,
                (uint256[][])
            );
            _executeTVLCommand(executorBalances);
            return (true, "");
        }

        bytes memory data = abi.encode(message, signs);
        utils.confirmDataIntegrity(data, gnosis, minSigns);
        require(hashExecutionTime[hashed] == 0, "Duplicate hash");
        uint256 universalTVLUpdated = utils.universalTVLUpdated();
        require(
            utils.timestampLastUpdatedWithinPeriod(
                universalTVLUpdated,
                60 minutes
            ),
            "Universal TVL has not been updated"
        );
        // Now that the data has been confirmed, we can execute it

        // First delete the array of desiredPercentagesByChain because this will be completely updated.
        utils.clearDesiredPercentagesByChain();
        IAlluoVoteExecutorUtils.CrossChainInformation
            memory crossChainInformation = utils.crossChainInformation();
        for (uint256 i; i < messages.length; i++) {
            Message memory currentMessage = messages[i];
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
                (
                    uint256 directionId,
                    uint256 percent,
                    uint256 executorLocalId
                ) = abi.decode(
                        currentMessage.commandData,
                        (uint256, uint256, uint256)
                    );

                (address strategyPrimaryToken, ) = handler
                    .getDirectionFullInfoById(directionId);
                if (
                    executorLocalId ==
                    crossChainInformation.currentExecutorInternalId
                ) {
                    uint8 assetId = handler.tokenToAssetId(
                        strategyPrimaryToken
                    );
                    uint256 tvlForAsset = utils.universalTVL(assetId);
                    handler.rebalanceUntilTarget(
                        assetId,
                        directionId,
                        percent,
                        tvlForAsset
                    );
                }
                utils.saveDesiredPercentage(
                    directionId,
                    percent,
                    executorLocalId
                );
            }
        }

        executionHistory.push(message);
        hashExecutionTime[hashed] = block.timestamp;
        success = true;
        result = "";
        emit MessageReceived(hashed);

        bytes memory finalData = abi.encode(message, signs);
        if (finalData.length > 0) {
            // Now send the message to the next chain
            _sendMessage(
                crossChainInformation.nextExecutor,
                chainIdToBridgingFeeToken[
                    crossChainInformation.nextExecutorChainId
                ],
                chainIdToFeeAmount[crossChainInformation.nextExecutorChainId],
                crossChainInformation.nextExecutorChainId,
                finalData
            );
        }
        emit logged(finalData);
    }

    function _acrossExecuteLogic(
        bytes calldata data
    ) internal override returns (bool success, bytes memory result) {
        storedCrosschainData.push(data);
        return (true, "");
    }

    function executeCrosschainData(
        uint256 index
    )
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
        returns (bool success, bytes memory result)
    {
        bytes memory data = storedCrosschainData[index];
        // Permanently delete executed data. This is to ensure double execution cannot exist
        delete storedCrosschainData[index];
        (bytes memory message, bytes[] memory signs) = abi.decode(
            data,
            (bytes, bytes[])
        );
        return _internalExecutionofData(message, signs);
    }

    function markAllChainPositions() external onlyRole(DEFAULT_ADMIN_ROLE) {
        // Mark all chains' positions to market and store these tvl values per each asset
        // Only execute deposits and withdrawals if these TVL values are updated.
        // Also this means you can only change treasury exposure if you update TVL values, but the main master contract can calculate how much exactly.
        // handler mark asset to market
        require(isMaster, "Only master can execute this function");
        IAlluoVoteExecutorUtils utils = IAlluoVoteExecutorUtils(
            voteExecutorUtils
        );
        IAlluoVoteExecutorUtils.CrossChainInformation
            memory crossChainInformation = utils.crossChainInformation();
        uint256[][] memory voteExecutorBalances = new uint256[][](
            crossChainInformation.numberOfExecutors + 1
        );

        _executeTVLCommand(voteExecutorBalances);
    }

    function _executeTVLCommand(uint256[][] memory executorBalances) internal {
        IAlluoVoteExecutorUtils utils = IAlluoVoteExecutorUtils(
            voteExecutorUtils
        );
        IAlluoVoteExecutorUtils.CrossChainInformation
            memory crossChainInformation = utils.crossChainInformation();
        bytes memory finalData = utils.executeTVLCommand(executorBalances);
        if (finalData.length > 0) {
            emit logged(finalData);
            _sendMessage(
                crossChainInformation.nextExecutor,
                chainIdToBridgingFeeToken[
                    crossChainInformation.nextExecutorChainId
                ],
                chainIdToFeeAmount[crossChainInformation.nextExecutorChainId],
                crossChainInformation.nextExecutorChainId,
                finalData
            );
        }
    }

    function setAcrossInformation(
        address payable _spokePoolAddress,
        int64 _relayerFeePct
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setSpokePool(_spokePoolAddress, _relayerFeePct);
    }

    function setFeeInformation(
        address _bridgingFeeToken,
        uint256 _chainId,
        uint256 _feeAmount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setFeeInformation(_bridgingFeeToken, _chainId, _feeAmount);
    }

    function setMinSigns(
        uint256 _minSigns
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        minSigns = _minSigns;
    }

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

    function getSubmittedData(
        uint256 _dataId
    ) external view returns (bytes memory, uint256, bytes[] memory) {
        SubmittedData memory submittedDataExact = submittedData[_dataId];
        return (
            submittedDataExact.data,
            submittedDataExact.time,
            submittedDataExact.signs
        );
    }

    function setMaster(bool _isMaster) external onlyRole(DEFAULT_ADMIN_ROLE) {
        isMaster = _isMaster;
    }

    function speedUpDeposit(
        int64 updatedRelayerFeePct,
        uint32 depositId,
        address updatedRecipient,
        bytes memory updatedMessage,
        bytes memory depositorSignature
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        spokePool.speedUpDeposit(
            address(this),
            updatedRelayerFeePct,
            depositId,
            updatedRecipient,
            updatedMessage,
            depositorSignature
        );
    }

    function isValidSignature(
        bytes32 messageHash,
        bytes memory signature
    ) public view returns (bytes4) {
        bool result = IAlluoVoteExecutorUtils(voteExecutorUtils)
            .isValidMutlisigSigner(signature, messageHash, gnosis);
        if (result) {
            return MAGICVALUE;
        } else {
            return 0x0;
        }
    }

    function setGnosis(address _gnosis) external onlyRole(DEFAULT_ADMIN_ROLE) {
        gnosis = _gnosis;
        _grantRole(DEFAULT_ADMIN_ROLE, _gnosis);
        _grantRole(UPGRADER_ROLE, _gnosis);
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
