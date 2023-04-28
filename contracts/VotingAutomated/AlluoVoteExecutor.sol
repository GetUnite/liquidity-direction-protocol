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

    struct ExecutorTransfer {
        uint256 fromExecutor;
        uint256 toExecutor;
        uint256 tokenId;
        uint256 amount;
    }
    event MessageReceived(bytes32 indexed hashed);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize(address _multiSigWallet) public initializer {
        __AlluoUpgradeableBase_init();
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
        (address from, , ) = anyCallV7Executor.context();

        require(
            from == crossChainInformation.previousExecutor,
            "Not from previous executor"
        );

        (bytes memory message, bytes[] memory signs) = abi.decode(
            data,
            (bytes, bytes[])
        );
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
                (
                    uint256 directionId,
                    uint256 percent,
                    uint256 executorLocalId
                ) = abi.decode(
                        currentMessage.commandData,
                        (uint256, uint256, uint256)
                    );

                (
                    address strategyPrimaryToken,
                    IAlluoStrategyHandler.LiquidityDirection memory direction
                ) = handler.getDirectionFullInfoById(directionId);
                if (direction.chainId == block.chainid) {
                    uint8 assetId = handler.tokenToAssetId(
                        strategyPrimaryToken
                    );
                    uint256 tvlForAsset = universalTVL[assetId];
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
        // Trigger the bridging messages.
        // We need the following information to bridge funds to the correct chains
        // VoteExecutor[] storage executors, (how much of each token each executor holds)
        // uint256[] memory tokenIds, GOTIT
        // uint256[][] memory desiredPercentages, GOTIT can save it during execution
        // Beauty is that we dont need to do crosschain calls for it because we now have all the information we need.
        IAlluoStrategyHandler handler = IAlluoStrategyHandler(strategyHandler);
        uint8 numberOfAssets = handler.numberOfAssets();
        uint256[] memory tokenIds = new uint256[](numberOfAssets);
        for (uint256 i; i < numberOfAssets; i++) {
            tokenIds[i] = i;
        }
        // When we do the submission of data, let's save the percentages everytime the data is passed around
        // desiredPercentage[i] = ith executor localId
        // desiredPercentage[i][j] = jth asset percentage
        // From directionId --> get assetId --> get token --> get token id
        // Write a function that loops through the direction messages and saves this to every single executor.
        // balanceTokens(universalExecutorBalances, tokenIds, desiredPercentages);
    }

    function _saveDesiredPercentages(
        bytes[] memory directionMessages
    ) internal {
        IAlluoStrategyHandler handler = IAlluoStrategyHandler(strategyHandler);
        uint8 numberOfAssets = handler.numberOfAssets();

        // Initialize desiredPercentage array if necessary
        if (desiredPercentagesByChain.length == 0) {
            desiredPercentagesByChain = new uint256[][](
                crossChainInformation.numberOfExecutors
            );
            for (
                uint256 i = 0;
                i < crossChainInformation.numberOfExecutors;
                i++
            ) {
                desiredPercentagesByChain[i] = new uint256[](numberOfAssets);
            }
        }

        // Loop through the direction messages
        for (uint256 i = 0; i < directionMessages.length; i++) {
            bytes memory currentMessage = directionMessages[i];
            (
                uint256 directionId,
                uint256 percent,
                uint256 executorLocalId
            ) = abi.decode(currentMessage, (uint256, uint256, uint256));

            (address strategyPrimaryToken, ) = handler.getDirectionFullInfoById(
                directionId
            );

            uint256 assetId = handler.tokenToAssetId(strategyPrimaryToken);

            // Save the percentage for the corresponding executor and asset in the desiredPercentage array
            desiredPercentagesByChain[executorLocalId][assetId] = uint256(
                percent
            );
        }
    }

    function _executeTVLCommand(uint256[][] memory executorBalances) internal {
        IAlluoStrategyHandler handler = IAlluoStrategyHandler(strategyHandler);
        uint8 numberOfAssets = handler.numberOfAssets();
        uint256 currentExecutorInternalId = crossChainInformation
            .currentExecutorInternalId;
        if (
            isMaster &&
            executorBalances[executorBalances.length - 1][0] ==
            type(uint256).max
        ) {
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
            for (uint8 i; i < executorBalances.length; i++) {
                for (uint8 j; j < numberOfAssets; j++) {
                    universalTVL[j] += executorBalances[i][j];
                }
            }
            universalTVLUpdated = block.timestamp;
            universalExecutorBalances = executorBalances;
            if (
                executorBalances[executorBalances.length - 1][0] !=
                type(uint256).max
            ) {
                // This means that we have already executed the TVL command and we are just executing it again to update the global TVL
                // Initialize the last array to be the max value so that we know that we have already executed this command
                executorBalances[executorBalances.length - 1] = new uint256[](
                    1
                );
                executorBalances[executorBalances.length - 1][0] = type(uint256)
                    .max;
            }
        }

        // Now just send the message off to the next executor
        (
            uint256 commandIndex,
            bytes memory messageData
        ) = IAlluoVoteExecutorUtils(voteExecutorUtils).encodeTvlCommand(
                executorBalances
            );

        uint256[] memory commandIndexes = new uint256[](1);
        bytes[] memory messages = new bytes[](1);
        address[] memory emptyAddresses = new address[](1);

        messages[0] = messageData;
        commandIndexes[0] = commandIndex;

        (, , bytes memory inputData) = IAlluoVoteExecutorUtils(
            voteExecutorUtils
        ).encodeAllMessages(commandIndexes, messages);
        bytes memory finalData = abi.encode(inputData, emptyAddresses);

        _sendMessage(
            crossChainInformation.nextExecutor,
            finalData,
            crossChainInformation.nextExecutorChainId,
            0
        );
    }

    // Once we calculate the amount of token balances each voteExecutor has
    // We calculate the amount of tokens each voteExecutor needs to transfer to each other
    // This is done in the following steps:
    // Give each executor a unique ID, as well as a unique ID for each primary token
    // From the inputs given by snapshot, calculate for each primary token, which percentage of the total balance each executor should have
    // For each primary token, calculate the difference between the current balance on that chain and the desired balance
    // Ex.) Executor 1 has 1000 tokens, Executor 2 has 2000 tokens, Executor 3 has 3000 tokens
    // Ex.) Executor 2 needs 50%, Executor 3 needs 25%, Executor 1 needs 25%
    // Ex.) Total balance after each should be: Executor1:1500, Executor2: 3000, Executor3: 1500
    // Ex.) Executor 2 needs 1000 tokens, Executor 3 has 1500 surplus tokens, Executor 1 needs 500 tokens
    // Create a delta matrix where we only put the amount of tokens that need to be transferred inwards/outwards (marked  by +- delta)
    // Then loop for each primary token,
    // Then loop for each executor x each executor
    // For each from and to executor, if the delta is is positive, it means it needs funds.
    // Only if the fromExecutor needs funds and the toExecutor has a surplus, we mark the transfer.
    // The transfer amount is the minimum of the two deltas. AKA transfer the maximum we can and need to. Then increment it.
    // Once the fromExecutor no longer needs funds (AKA we have now fufilled its request for funds, break and move to the next executor)
    function balanceTokens(
        uint256[][] memory executorsBalances,
        uint256[] memory tokenIds,
        uint256[][] memory desiredPercentages
    ) internal view returns (ExecutorTransfer[] memory) {
        uint256 executorCount = executorsBalances.length;
        uint256 tokenCount = tokenIds.length;
        uint256[] memory totalTokenBalances = new uint256[](tokenCount);
        for (uint256 i = 0; i < executorCount; i++) {
            for (uint256 j = 0; j < tokenCount; j++) {
                totalTokenBalances[j] += executorsBalances[i][tokenIds[j]];
            }
        }

        int256[][] memory deltaMatrix = new int256[][](executorCount);

        for (uint256 i = 0; i < executorCount; i++) {
            deltaMatrix[i] = new int256[](tokenCount);
            for (uint256 j = 0; j < tokenCount; j++) {
                uint256 desiredAmount = (totalTokenBalances[j] *
                    desiredPercentages[i][j]) / 100;
                deltaMatrix[i][j] =
                    int256(desiredAmount) -
                    int256(executorsBalances[i][tokenIds[j]]);
            }
        }

        uint256 maxTransfers = executorCount * tokenCount;
        ExecutorTransfer[] memory transfers = new ExecutorTransfer[](
            maxTransfers
        );
        uint256 transferCount = 0;

        for (uint256 tokenId = 0; tokenId < tokenCount; tokenId++) {
            for (
                uint256 fromExecutor = 0;
                fromExecutor < executorCount;
                fromExecutor++
            ) {
                if (deltaMatrix[fromExecutor][tokenId] <= 0) {
                    continue;
                }

                for (
                    uint256 toExecutor = 0;
                    toExecutor < executorCount;
                    toExecutor++
                ) {
                    if (
                        deltaMatrix[toExecutor][tokenId] >= 0 ||
                        fromExecutor == toExecutor
                    ) {
                        continue;
                    }
                    // For each from and to executor, if the delta is is positive, it means it needs funds.
                    // Only if the fromExecutor needs funds and the toExecutor has a surplus, we mark the transfer.
                    // The transfer amount is the minimum of the two deltas. AKA transfer the maximum we can and need to. Then increment it.
                    // Once the fromExecutor no longer needs funds (AKA we have now fufilled its request for funds, break and move to the next executor)
                    int256 transferAmount = deltaMatrix[fromExecutor][tokenId] <
                        -deltaMatrix[toExecutor][tokenId]
                        ? deltaMatrix[fromExecutor][tokenId]
                        : -deltaMatrix[toExecutor][tokenId];
                    transfers[transferCount] = ExecutorTransfer(
                        fromExecutor,
                        toExecutor,
                        tokenId,
                        uint256(transferAmount)
                    );
                    transferCount++;
                    deltaMatrix[fromExecutor][tokenId] -= transferAmount;
                    deltaMatrix[toExecutor][tokenId] += transferAmount;
                    if (deltaMatrix[fromExecutor][tokenId] <= 0) {
                        break;
                    }
                }
            }
        }
        ExecutorTransfer[] memory nonEmptyTransfers = new ExecutorTransfer[](
            transferCount
        );
        for (uint256 i = 0; i < transferCount; i++) {
            nonEmptyTransfers[i] = transfers[i];
        }

        return nonEmptyTransfers;
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
