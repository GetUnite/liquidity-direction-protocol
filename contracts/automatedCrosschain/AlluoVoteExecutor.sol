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
import {IAlluoStrategyV3} from "../interfaces/IAlluoStrategyV3.sol";
import {IExchange} from "../interfaces/IExchange.sol";
import {IWrappedEther} from "../interfaces/IWrappedEther.sol";
import {IIbAlluo} from "../interfaces/IIbAlluo.sol";
import {IPriceFeedRouterV2} from "../interfaces/IPriceFeedRouterV2.sol";
import {IAlluoStrategyHandler} from "../interfaces/IAlluoStrategyHandler.sol";
import {ICvxDistributor} from "../interfaces/ICvxDistributor.sol";
import {IAlluoVoteExecutorUtils} from "../interfaces/IAlluoVoteExecutorUtils.sol";
import {ExchangePriceOracle} from "./priceOracle/ExchangePriceOracle.sol";

// solhint-disable-next-line
import "hardhat/console.sol";

contract AlluoVoteExecutor is AlluoUpgradeableBase, AlluoAcrossMessaging {
    using ECDSAUpgradeable for bytes32;
    using AddressUpgradeable for address;
    using SafeERC20Upgradeable for IERC20MetadataUpgradeable;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.UintSet;

    // Used for granting permissions to our crosschain relayers
    bytes32 public constant RELAYER_ROLE = keccak256("RELAYER_ROLE");

    // Used for EIP-712 signing
    bytes4 internal constant MAGICVALUE = 0x1626ba7e;

    // Determines which executor is exclusively the master of the execution chain
    bool public isMaster;

    // Address of the Alluo multisig
    address public gnosis;

    // Address of a variable that will be used to distribute excess rewards
    address public locker;

    // Address of the exchange
    address public exchangeAddress;

    // Address of the priceFeed onchain oracles
    address public priceFeed;

    // Address of the local liquidity handler
    address public liquidityHandler;

    // Address of the local strategyHandler
    address public strategyHandler;

    address public cvxDistributor;

    // Address of the utility contract that holds logic and some storage
    address public voteExecutorUtils;

    // Uint that determines how long a vote can remain valid from submission
    uint256 public timeLock;

    // Uint that determines how many multisig signers are required to execute liquidity direction
    uint256 public minSigns;

    // Mapping that holds the iballuo symbol to address
    mapping(string => address) public ibAlluoSymbolToAddress;

    // Mapping that saves when and if a certain vote has been executed to prevent duplicates
    mapping(bytes32 => uint256) public hashExecutionTime;

    // Mapping that saves the current state of the liquidity direction vote
    mapping(uint256 => Deposit[]) public assetIdToDepositPercentages;

    // Array that holds all historical submitted data
    SubmittedData[] public submittedData;

    // Array that holds all historical executed data
    bytes[] public executionHistory;

    // Array that holds all crosschain submitted data
    bytes[] public storedCrosschainData;

    // Mapping that holds the indexes for storedCrosschainData that should be executed
    EnumerableSetUpgradeable.UintSet private queuedCrosschainMessageIndexes;

    // Offchain price oracle that can be invoked for prices
    ExchangePriceOracle public oracle;

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

    receive() external payable {}

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

    function handleAcrossMessage(
        address tokenSent,
        uint256 amount,
        bool fillCompleted,
        address relayer,
        bytes calldata message
    ) external override {
        if (fillCompleted && message.length > 0) {
            // Only execute when the fill is completed. This is because we dont want to deal with multiple executions.
            // There is duplicate hash execution protection anyways.
            require(msg.sender == address(spokePool), "Only spoke pool");
            require(hasRole(RELAYER_ROLE, relayer), "Only approved relayers");
            _acrossExecuteLogic(message);
        }
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
                3 hours
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
                _executeAPYCommand(currentMessage.commandData);
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
        if (
            finalData.length > 0 &&
            crossChainInformation.nextExecutorChainId !=
            crossChainInformation.finalExecutorChainId
        ) {
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

        // Since all withdrawals have been processed, it should be able to immediately trigger bridging. The only time we get to this code is if we have executed liquidity direction
        // If we only did TVL calculations, it would not get to this point
        // The reason we need a try catch is because certain votes do not require bridging to be triggered. It is more safe to just try and catch the error than to check if it is required.
        try utils.triggerBridging() {} catch {}
    }

    function _executeAPYCommand(bytes memory data) internal {
        (
            string memory _ibAlluoName,
            uint256 _newAnnualInterest,
            uint256 _newInterestPerSecond
        ) = abi.decode(data, (string, uint256, uint256));

        address ibAlluoAddress = ibAlluoSymbolToAddress[_ibAlluoName];
        IIbAlluo(ibAlluoAddress).setInterest(
            _newAnnualInterest,
            _newInterestPerSecond
        );
    }

    function executeQueuedDeposits(
        uint256 assetId
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        IAlluoStrategyHandler handler = IAlluoStrategyHandler(strategyHandler);
        // Dont forget to erc20 approve each token to the handler in setup.
        handler.executeQueuedDeposits(assetId);
    }

    function _acrossExecuteLogic(
        bytes calldata data
    ) internal override returns (bool success, bytes memory result) {
        storedCrosschainData.push(data);
        queuedCrosschainMessageIndexes.add(storedCrosschainData.length - 1);
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
        // Remove executed data from the queue
        queuedCrosschainMessageIndexes.remove(index);

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

    function requestExchangePrices() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _requestExchangePrices();
    }

    function _requestExchangePrices() internal {
        if (address(oracle) == address(0)) {
            return;
        }

        // if directionId 1 is set, there are 2 registered direstions [1, 2], need to increment lastDirectionId
        // no zeroes!
        uint256 directionsAmount = IAlluoStrategyHandler(strategyHandler)
            .lastDirectionId() + 1;

        for (uint256 i = 1; i <= directionsAmount; i++) {
            (
                address strategyAddress,
                address entryToken,
                uint256 assetId,
                uint256 chainId,
                bytes memory entryData,
                bytes memory exitData,
                bytes memory rewardsData,

            ) = IAlluoStrategyHandler(strategyHandler).liquidityDirection(i);

            if (chainId != block.chainid) {
                continue;
            }

            address primaryToken = IAlluoStrategyHandler(strategyHandler)
                .getPrimaryTokenForAsset(assetId);

            // step 1 - query prices to enter strategy (exchange call in AlluoStrategyHandler._depositToDirection)

            oracle.requestPrice(primaryToken, entryToken);

            // step 2 - query prices to enter strategy (potential exchange call in IAlluoStrategyV3.invest)
            IAlluoStrategyV3.ExchangeRequest[]
                memory entryExchanges = IAlluoStrategyV3(strategyAddress)
                    .getExpectedEntryExchangeRequests(entryData);

            for (uint256 j = 0; j < entryExchanges.length; j++) {
                oracle.requestPrice(
                    entryExchanges[j].fromToken,
                    entryExchanges[j].toToken
                );
            }

            // step 3 - query prices to exit strategy (potential exchange call in IAlluoStrategyV3.exitAll)
            IAlluoStrategyV3.ExchangeRequest[]
                memory exitExchanges = IAlluoStrategyV3(strategyAddress)
                    .getExpectedExitExchangeRequests(
                        exitData,
                        primaryToken,
                        true
                    );

            for (uint256 j = 0; j < exitExchanges.length; j++) {
                oracle.requestPrice(
                    exitExchanges[j].fromToken,
                    exitExchanges[j].toToken
                );
            }

            // step 4 - query prices to exit rewards (potential exchange call in IAlluoStrategyV3.withdrawRewards)
            IAlluoStrategyV3.ExchangeRequest[]
                memory rewardsExchanges = IAlluoStrategyV3(strategyAddress)
                    .getExpectedRewardsExchangeRequests(
                        rewardsData,
                        primaryToken,
                        true
                    );

            for (uint256 j = 0; j < rewardsExchanges.length; j++) {
                oracle.requestPrice(
                    rewardsExchanges[j].fromToken,
                    rewardsExchanges[j].toToken
                );
            }
        }
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

        _requestExchangePrices();
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

    function getSequentialQueuedCrosschainIndex()
        public
        view
        returns (bool canExec, bytes memory execPayload)
    {
        if (queuedCrosschainMessageIndexes.length() == 0) {
            return (false, "");
        } else {
            uint256 index = queuedCrosschainMessageIndexes.at(0);
            bytes memory payload = abi.encodeWithSelector(
                this.executeCrosschainData.selector,
                index
            );
            return (true, payload);
        }
    }

    function forceRemoveQueuedCrosschainIndex(
        uint256 index
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        queuedCrosschainMessageIndexes.remove(index);
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

    function setTimelock(
        uint256 _newTimeLock
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        timeLock = _newTimeLock;
    }

    function setOracle(address _oracle) external onlyRole(DEFAULT_ADMIN_ROLE) {
        oracle = ExchangePriceOracle(_oracle);
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
