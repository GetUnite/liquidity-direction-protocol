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

    mapping(uint256 => uint256) public universalTVL;
    mapping(uint256 => address) public executorInternalIdToAddress;
    mapping(uint256 => uint256) public executorInternalIdToChainId;

    uint256 public universalTVLUpdated;
    uint256[][] public universalExecutorBalances;
    uint256[][] public desiredPercentagesByChain;
    bool public isMaster;
    CrossChainInformation public crossChainInformation;
    SubmittedData[] public submittedData;
    bytes[] public executionHistory;

    struct CrossChainInformation {
        address nextExecutor;
        address previousExecutor;
        address finalExecutor;
        uint256 finalExecutorChainId;
        uint256 nextExecutorChainId;
        uint256 previousExecutorChainId;
        uint256 numberOfExecutors;
        uint256 currentExecutorInternalId;
    }
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
        (bytes32 hashed, Message[] memory messages, ) = abi.decode(
            message,
            (bytes32, Message[], uint256)
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
        IAlluoVoteExecutorUtils(voteExecutorUtils).confirmDataIntegrity(
            data,
            gnosis,
            minSigns
        );
        require(hashExecutionTime[hashed] == 0, "Duplicate hash");
        require(
            IAlluoVoteExecutorUtils(voteExecutorUtils)
                .timestampLastUpdatedWithinPeriod(
                    universalTVLUpdated,
                    60 minutes
                ),
            "Universal TVL has not been updated"
        );
        // Now that the data has been confirmed, we can execute it

        // First delete the array of desiredPercentagesByChain because this will be completely updated.
        delete desiredPercentagesByChain;
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
                    uint256 tvlForAsset = universalTVL[assetId];
                    handler.rebalanceUntilTarget(
                        assetId,
                        directionId,
                        percent,
                        tvlForAsset
                    );
                }
                _saveDesiredPercentage(directionId, percent, executorLocalId);
            }
        }

        executionHistory.push(message);
        hashExecutionTime[hashed] = block.timestamp;
        success = true;
        result = "";
        emit MessageReceived(hashed);

        bytes memory finalData = abi.encode(message, signs);
        _sendMessage(
            crossChainInformation.nextExecutor,
            finalData,
            crossChainInformation.nextExecutorChainId,
            2
        );

        emit logged(finalData);
        // Now send the message to the next chain
    }

    function _anyExecuteLogic(
        bytes calldata data
    ) internal override returns (bool success, bytes memory result) {
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
        uint256[][] memory voteExecutorBalances = new uint256[][](
            crossChainInformation.numberOfExecutors + 1
        );

        _executeTVLCommand(voteExecutorBalances);
    }

    function triggerBridging() external onlyRole(DEFAULT_ADMIN_ROLE) {
        // This requires some check that data has been executed and tvl has been updated...

        IAlluoStrategyHandler handler = IAlluoStrategyHandler(strategyHandler);
        uint8 numberOfAssets = handler.numberOfAssets();
        uint256[] memory tokenIds = new uint256[](numberOfAssets);
        for (uint256 i; i < numberOfAssets; i++) {
            tokenIds[i] = i;
        }

        IAlluoVoteExecutorUtils.ExecutorTransfer[]
            memory toTransfer = IAlluoVoteExecutorUtils(voteExecutorUtils)
                .balanceTokens(
                    universalExecutorBalances,
                    tokenIds,
                    desiredPercentagesByChain
                );
        // Consolelog for debugging

        // ALso i have to scale the amount to what is actually in the executor vs expected balance
        for (uint256 i; i < toTransfer.length; i++) {
            IAlluoVoteExecutorUtils.ExecutorTransfer
                memory currentTransfer = toTransfer[i];
            uint256 currentExecutorInternalId = crossChainInformation
                .currentExecutorInternalId;
            if (currentTransfer.fromExecutor == currentExecutorInternalId) {
                address recipientExecutorAddress = executorInternalIdToAddress[
                    currentTransfer.toExecutor
                ];
                uint256 recipientExecutorChainId = executorInternalIdToChainId[
                    currentTransfer.toExecutor
                ];
                // Bridge through handler.
                address primaryToken = handler.getPrimaryTokenForAsset(
                    currentTransfer.tokenId
                );

                // Get the balance of the token and transfer it to the handler
                uint256 currentBalance = IERC20MetadataUpgradeable(primaryToken)
                    .balanceOf(address(this));

                // ALso currentTrasfer.amount is in 18 decimals, but the token might not be.
                // Scale the currentTransferAmount to the token decimals
                currentTransfer.amount =
                    currentTransfer.amount /
                    10 **
                        (18 -
                            IERC20MetadataUpgradeable(primaryToken).decimals());
                if (currentBalance < currentTransfer.amount) {
                    currentTransfer.amount = currentBalance;
                    // This is to account for slippage when withdrawing.
                }
                IERC20MetadataUpgradeable(primaryToken).transfer(
                    address(handler),
                    currentTransfer.amount
                );

                handler.bridgeTo(
                    currentTransfer.amount,
                    uint8(currentTransfer.tokenId),
                    recipientExecutorAddress,
                    recipientExecutorChainId
                );
            }
        }
    }

    // Local id starts from 0 --> max(number of executors)
    // Global id is the chain.id
    function _saveDesiredPercentage(
        uint256 directionId,
        uint256 percent,
        uint256 executorLocalId
    ) internal {
        IAlluoStrategyHandler handler = IAlluoStrategyHandler(strategyHandler);
        (address strategyPrimaryToken, ) = handler.getDirectionFullInfoById(
            directionId
        );
        uint256 assetId = handler.tokenToAssetId(strategyPrimaryToken);

        // if desiredPercentagesByChain is not initialized, initialize it.
        if (desiredPercentagesByChain.length == 0) {
            desiredPercentagesByChain = new uint256[][](
                crossChainInformation.numberOfExecutors
            );

            for (
                uint256 i = 0;
                i < crossChainInformation.numberOfExecutors;
                i++
            ) {
                desiredPercentagesByChain[i] = new uint256[](
                    handler.numberOfAssets()
                );
            }
        }
        desiredPercentagesByChain[executorLocalId][assetId] += percent;
    }

    function _executeTVLCommand(uint256[][] memory executorBalances) internal {
        IAlluoStrategyHandler handler = IAlluoStrategyHandler(strategyHandler);
        uint8 numberOfAssets = handler.numberOfAssets();
        uint256 currentExecutorInternalId = crossChainInformation
            .currentExecutorInternalId;
        // Check if the inner array has been initialized
        bool isInitialized = executorBalances[executorBalances.length - 1]
            .length != 0
            ? true
            : false;
        bool checkValue;

        if (isInitialized) {
            // Check if the last value is max uint256 (this means that it has looped through twice
            executorBalances[executorBalances.length - 1][0] ==
                type(uint256).max
                ? checkValue = true
                : checkValue = false;
        }
        if (isMaster && checkValue) {
            // If that specific value is max uint256, then we know that it has looped through twice. And since the current chain is the master, we can stop here.
            return;
        }
        // Initialize the array if it doesnt already exist and fill it out:
        if (executorBalances[currentExecutorInternalId].length == 0) {
            executorBalances[currentExecutorInternalId] = new uint256[](
                numberOfAssets
            );
            for (uint8 i; i < numberOfAssets; i++) {
                uint256 assetValue = handler.markAssetToMarket(i);
                executorBalances[currentExecutorInternalId][i] = assetValue;
            }
        } else {
            // Now we definitely know that it has passed through at least once. Therefore we save this information locally (global tvl + executor balances)
            for (uint8 i; i < executorBalances.length - 1; i++) {
                for (uint8 j; j < numberOfAssets; j++) {
                    universalTVL[j] += executorBalances[i][j];
                }
            }
            universalTVLUpdated = block.timestamp;
            universalExecutorBalances = IAlluoVoteExecutorUtils(
                voteExecutorUtils
            ).removeLastArray(executorBalances);
            if (!isInitialized) {
                // This means that we have already executed the TVL command and we are just executing it again to update the global TVL
                // Initialize the last array to be the max value so that we know that we have already executed this command
                executorBalances[executorBalances.length - 1] = new uint256[](
                    1
                );
                executorBalances[executorBalances.length - 1][0] = type(uint256)
                    .max;
            }
        }

        (
            uint256 commandIndex,
            bytes memory messageData
        ) = IAlluoVoteExecutorUtils(voteExecutorUtils).encodeTvlCommand(
                executorBalances
            );

        uint256[] memory commandIndexes = new uint256[](1);
        bytes[] memory messages = new bytes[](1);
        address[] memory emptyAddresses = new address[](0);

        messages[0] = messageData;
        commandIndexes[0] = commandIndex;

        (, , bytes memory inputData) = IAlluoVoteExecutorUtils(
            voteExecutorUtils
        ).encodeAllMessages(commandIndexes, messages);
        bytes memory finalData = abi.encode(inputData, emptyAddresses);
        emit logged(finalData);
        _sendMessage(
            crossChainInformation.nextExecutor,
            finalData,
            crossChainInformation.nextExecutorChainId,
            2
        );
    }

    function setAnyCall(
        address _anyCallAddress
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _setAnyCall(_anyCallAddress);
    }

    function setCrossChainInformation(
        address _nextExecutor,
        address _previousExecutor,
        address _finalExecutor,
        uint256 _finalExecutorChainId,
        uint256 _nextExecutorChainId,
        uint256 _previousExecutorChainId,
        uint256 _numberOfExecutors,
        uint256 _currentExecutorInternalId
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        crossChainInformation = CrossChainInformation(
            _nextExecutor,
            _previousExecutor,
            _finalExecutor,
            _finalExecutorChainId,
            _nextExecutorChainId,
            _previousExecutorChainId,
            _numberOfExecutors,
            _currentExecutorInternalId
        );
        previousCaller = _previousExecutor;
    }

    function setExecutorInternalIds(
        uint256[] memory _executorInternalIds,
        address[] memory _executorAddresses,
        uint256[] memory _executorChainIds
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 executorCount = _executorInternalIds.length;
        for (uint256 i = 0; i < executorCount; i++) {
            uint256 executorInternalId = _executorInternalIds[i];
            address executorAddress = _executorAddresses[i];
            uint256 executorChainId = _executorChainIds[i];
            executorInternalIdToAddress[executorInternalId] = executorAddress;
            executorInternalIdToChainId[executorInternalId] = executorChainId;
        }
    }

    function setUniversalExecutorBalances(
        uint256[][] memory _executorBalances
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        universalExecutorBalances = _executorBalances;
        universalTVLUpdated = block.timestamp;
        // Update universal tvl
        IAlluoStrategyHandler handler = IAlluoStrategyHandler(strategyHandler);
        uint256 numberOfAssets = handler.numberOfAssets();
        for (uint256 i = 0; i < numberOfAssets; i++) {
            uint256 assetId = i;
            uint256 totalBalance;
            for (uint256 j = 0; j < universalExecutorBalances.length; j++) {
                totalBalance += universalExecutorBalances[j][assetId];
            }
            universalTVL[assetId] = totalBalance;
        }
        universalTVLUpdated = block.timestamp;
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
