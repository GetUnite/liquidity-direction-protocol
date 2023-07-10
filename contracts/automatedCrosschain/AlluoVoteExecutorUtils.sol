// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;
import {IERC20MetadataUpgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/IERC20MetadataUpgradeable.sol";
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";

import {ECDSAUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";
import {DecimalConverter} from "../libs/DecimalConverter.sol";
import {AlluoUpgradeableBase} from "../AlluoUpgradeableBase.sol";

import {IAlluoStrategyHandler} from "../interfaces/IAlluoStrategyHandler.sol";
import {IAlluoVoteExecutor} from "../interfaces/IAlluoVoteExecutor.sol";
import {IGnosis} from "../interfaces/IGnosis.sol";
import {IIbAlluo} from "../interfaces/IIbAlluo.sol";

import "hardhat/console.sol";

contract AlluoVoteExecutorUtils is AlluoUpgradeableBase {
    using ECDSAUpgradeable for bytes32;
    using SafeERC20Upgradeable for IERC20MetadataUpgradeable;

    address public strategyHandler;
    address public voteExecutor;
    uint256 public universalTVLUpdated;

    CrossChainInformation public crossChainInformation;

    mapping(string => address) public ibAlluoSymbolToAddress;
    mapping(bytes32 => uint256) public hashExecutionTime;
    mapping(uint256 => Deposit[]) public assetIdToDepositPercentages;

    mapping(uint256 => uint256) public universalTVL;
    mapping(uint256 => address) public executorInternalIdToAddress;
    mapping(uint256 => uint256) public executorInternalIdToChainId;

    uint256[][] public universalExecutorBalances;
    uint256[][] public desiredPercentagesByChain;

    mapping(uint256 => address) public assetIdToIbAlluoAddress;

    struct Deposit {
        uint256 directionId;
        uint256 amount;
    }

    struct ExecutorTransfer {
        uint256 fromExecutor;
        uint256 toExecutor;
        uint256 tokenId;
        uint256 amount;
    }

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
    struct Message {
        uint256 commandIndex;
        bytes commandData;
    }

    event Profit(uint8 assetId, uint256 amount);
    event Loss(uint8 assetId, uint256 amount);

    function clearDesiredPercentagesByChain()
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        delete desiredPercentagesByChain;
    }

    function triggerBridging() external onlyRole(DEFAULT_ADMIN_ROLE) {
        // Since this is called immediately after data is executed on each chain (non TVL execution), then we are sure that new data has been submitted and executed
        // Since the data can't be executed without TVL being updated, it is sufficient to not have TVL checks here.
        // However, it may be wise to add some revert logic

        IAlluoStrategyHandler handler = IAlluoStrategyHandler(strategyHandler);
        uint8 numberOfAssets = handler.numberOfAssets();
        uint256[] memory tokenIds = new uint256[](numberOfAssets);
        for (uint256 i; i < numberOfAssets; i++) {
            tokenIds[i] = i;
        }

        ExecutorTransfer[] memory toTransfer = balanceTokens(
            universalExecutorBalances,
            tokenIds,
            desiredPercentagesByChain
        );

        // ALso i have to scale the amount to what is actually in the executor vs expected balance
        for (uint256 i; i < toTransfer.length; i++) {
            ExecutorTransfer memory currentTransfer = toTransfer[i];
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
                    .balanceOf(voteExecutor);

                // ALso currentTrasfer.amount is in 18 decimals, but the token might not be.
                // Scale the currentTransferAmount to the token decimals

                currentTransfer.amount = DecimalConverter.toDecimals(
                    currentTransfer.amount,
                    18,
                    IERC20MetadataUpgradeable(primaryToken).decimals()
                );
                if (currentBalance < currentTransfer.amount) {
                    currentTransfer.amount = currentBalance;
                    // This is to account for slippage when withdrawing.
                }
                IERC20MetadataUpgradeable(primaryToken).transferFrom(
                    voteExecutor,
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
    function saveDesiredPercentage(
        uint256 directionId,
        uint256 percent,
        uint256 executorLocalId
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
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
    }

    function executeTVLCommand(
        uint256[][] memory executorBalances
    ) external onlyRole(DEFAULT_ADMIN_ROLE) returns (bytes memory) {
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
        if (IAlluoVoteExecutor(voteExecutor).isMaster() && checkValue) {
            // If that specific value is max uint256, then we know that it has looped through twice. And since the current chain is the master, we can stop here.
            // Calculate P&L and emit as events
            return "";
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
            // Clear the universalTVL before updating
            for (uint8 i = 0; i < numberOfAssets; i++) {
                universalTVL[i] = 0;
            }

            for (uint8 i; i < executorBalances.length - 1; i++) {
                for (uint8 j; j < numberOfAssets; j++) {
                    universalTVL[j] += executorBalances[i][j];
                }
            }

            // New logic added here
            // Maybe only add this
            for (uint8 i = 0; i < numberOfAssets; i++) {
                uint256 oldExecutorBalance = universalExecutorBalances[
                    currentExecutorInternalId
                ][i];
                uint256 expectedAddition = (oldExecutorBalance *
                    getLatestAPY(i) *
                    (block.timestamp - universalTVLUpdated)) /
                    31536000 /
                    10000;

                uint256 expectedExecutorBalance = oldExecutorBalance +
                    expectedAddition;

                if (
                    executorBalances[currentExecutorInternalId][i] >
                    expectedExecutorBalance
                ) {
                    emit Profit(
                        i,
                        executorBalances[currentExecutorInternalId][i] -
                            expectedExecutorBalance
                    );
                } else {
                    emit Loss(
                        i,
                        expectedExecutorBalance -
                            executorBalances[currentExecutorInternalId][i]
                    );
                }
            }
            universalTVLUpdated = block.timestamp;
            universalExecutorBalances = removeLastArray(executorBalances);
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

        (uint256 commandIndex, bytes memory messageData) = encodeTvlCommand(
            executorBalances
        );

        uint256[] memory commandIndexes = new uint256[](1);
        bytes[] memory messages = new bytes[](1);
        address[] memory emptyAddresses = new address[](0);

        messages[0] = messageData;
        commandIndexes[0] = commandIndex;

        (, , bytes memory inputData) = encodeAllMessages(
            commandIndexes,
            messages
        );
        bytes memory finalData = abi.encode(inputData, emptyAddresses);
        return finalData;
    }

    function getLatestAPY(uint256 assetId) public view returns (uint256) {
        address ibAlluoAddress = assetIdToIbAlluoAddress[assetId];
        return IIbAlluo(ibAlluoAddress).annualInterest();
    }

    function setAssetIdToIbAlluoAddresses(
        address _ibAlluoAddress,
        uint256 _assetId
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        assetIdToIbAlluoAddress[_assetId] = _ibAlluoAddress;
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

    function initialize(
        address _strategyHandler,
        address _voteExecutor,
        address _multisig
    ) public initializer {
        strategyHandler = _strategyHandler;
        voteExecutor = _voteExecutor;
        _grantRole(DEFAULT_ADMIN_ROLE, _multisig);
    }

    function submitData(
        bytes memory inputData
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        IAlluoVoteExecutor(voteExecutor).submitData(inputData);
    }

    function setStorageAddresses(
        address _strategyHandler,
        address _voteExecutor
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        strategyHandler = _strategyHandler;
        voteExecutor = _voteExecutor;

        // ALso grant roles to the new contracts
        _grantRole(DEFAULT_ADMIN_ROLE, _strategyHandler);
        _grantRole(DEFAULT_ADMIN_ROLE, _voteExecutor);
    }

    function confirmDataIntegrity(
        bytes calldata _data,
        address gnosis,
        uint256 minSigns
    ) public view returns (bytes memory) {
        (bytes memory message, bytes[] memory signs) = abi.decode(
            _data,
            (bytes, bytes[])
        );
        (bytes32 hashed, Message[] memory _messages, uint256 timestamp) = abi
            .decode(message, (bytes32, Message[], uint256));

        require(
            hashed == keccak256(abi.encode(_messages, timestamp)),
            "Hash doesn't match"
        );
        require(
            checkSignedHashes(signs, hashed, gnosis, minSigns),
            "Hash has not been approved"
        );

        return message;
    }

    // Data utils
    /// @notice Checks the array of signatures from L1 for authentication
    /// @dev Grabs list of approved multisig signers and loops through eth_sign recovery and returns true if it exceeds minimum signs.
    /// @param _signs Array of signatures sent from L1
    /// @param _hashed The hash of the data from L1
    /// @return bool
    function checkSignedHashes(
        bytes[] memory _signs,
        bytes32 _hashed,
        address gnosis,
        uint256 minSigns
    ) public view returns (bool) {
        address[] memory owners = IGnosis(gnosis).getOwners();
        address[] memory uniqueSigners = new address[](owners.length);
        uint256 numberOfSigns;
        for (uint256 i; i < _signs.length; i++) {
            for (uint256 j; j < owners.length; j++) {
                if (
                    verify(_hashed, _signs[i], owners[j]) &&
                    checkUniqueSignature(uniqueSigners, owners[j])
                ) {
                    uniqueSigners[numberOfSigns] = owners[j];
                    numberOfSigns++;
                    break;
                }
            }
        }
        return numberOfSigns >= minSigns ? true : false;
    }

    function isValidMutlisigSigner(
        bytes memory _sign,
        bytes32 hashed,
        address gnosis
    ) public view returns (bool) {
        address[] memory owners = IGnosis(gnosis).getOwners();
        for (uint256 j; j < owners.length; j++) {
            if (hashed.recover(_sign) == owners[j]) {
                return true;
            }
        }
        return false;
    }

    function verify(
        bytes32 data,
        bytes memory signature,
        address account
    ) public pure returns (bool) {
        address signer = data.toEthSignedMessageHash().recover(signature);
        return signer == account;
    }

    function getSignerAddress(
        bytes32 data,
        bytes memory signature
    ) public pure returns (address) {
        return data.toEthSignedMessageHash().recover(signature);
    }

    function checkUniqueSignature(
        address[] memory _uniqueSigners,
        address _signer
    ) public pure returns (bool) {
        for (uint256 k; k < _uniqueSigners.length; k++) {
            if (_uniqueSigners[k] == _signer) {
                return false;
            }
        }
        return true;
    }

    function removeLastArray(
        uint256[][] memory executorBalances
    ) public pure returns (uint256[][] memory) {
        require(executorBalances.length > 0, "No arrays to remove");

        // Create a new array with reduced length
        uint256[][] memory updatedBalances = new uint256[][](
            executorBalances.length - 1
        );

        // Copy all arrays except the last one
        for (uint256 i = 0; i < executorBalances.length - 1; i++) {
            updatedBalances[i] = executorBalances[i];
        }

        return updatedBalances;
    }

    // StrategyHandler utils

    function getDirectionIdByName(
        string memory _codeName
    ) external view returns (uint256) {
        uint256 directionId = IAlluoStrategyHandler(strategyHandler)
            .directionNameToId(_codeName);
        require(directionId != 0);
        return directionId;
    }

    function isWithinSlippageTolerance(
        uint256 _amount,
        uint256 _amountToCompare,
        uint256 _slippageTolerance
    ) public pure returns (bool) {
        return
            _amount >=
            ((_amountToCompare * (10000 - _slippageTolerance)) / 10000) &&
            _amount <=
            ((_amountToCompare * (10000 + _slippageTolerance)) / 10000);
    }

    function timestampLastUpdatedWithinPeriod(
        uint256 _timestamp,
        uint256 _period
    ) public view returns (bool) {
        return block.timestamp - _timestamp <= _period;
    }

    // Executor utils

    function encodeApyCommand(
        string memory _ibAlluoName,
        uint256 _newAnnualInterest,
        uint256 _newInterestPerSecond
    ) public pure returns (uint256, bytes memory) {
        bytes memory encodedCommand = abi.encode(
            _ibAlluoName,
            _newAnnualInterest,
            _newInterestPerSecond
        );
        return (0, encodedCommand);
    }

    function encodeMintCommand(
        uint256 _newMintAmount,
        uint256 _period
    ) public pure returns (uint256, bytes memory) {
        bytes memory encodedCommand = abi.encode(_newMintAmount, _period);
        return (1, encodedCommand);
    }

    function encodeLiquidityCommand(
        string memory _codeName,
        uint256 _percent,
        uint256 _executorLocalId
    ) public view returns (uint256, bytes memory) {
        uint256 directionId = IAlluoStrategyHandler(strategyHandler)
            .directionNameToId(_codeName);
        return (2, abi.encode(directionId, _percent, _executorLocalId));
    }

    function encodeTreasuryAllocationChangeCommand(
        int256 _delta
    ) public pure returns (uint256, bytes memory) {
        bytes memory encodedCommand = abi.encode(_delta);
        return (3, encodedCommand);
    }

    function encodeTvlCommand(
        uint256[][] memory executorBalances
    ) public pure returns (uint256, bytes memory) {
        bytes memory encodedCommand = abi.encode(executorBalances);
        return (4, encodedCommand);
    }

    function encodeAllMessages(
        uint256[] memory _commandIndexes,
        bytes[] memory _messages
    )
        public
        view
        returns (
            bytes32 messagesHash,
            Message[] memory messages,
            bytes memory inputData
        )
    {
        uint256 timestamp = block.timestamp;
        uint length = _commandIndexes.length;
        require(length == _messages.length);

        for (uint256 i; i < length; i++) {
            if (_commandIndexes[i] == 3) {
                uint temporaryIndex = _commandIndexes[length - 1];
                bytes memory temporaryMessage = _messages[length - 1];
                _commandIndexes[length - 1] = _commandIndexes[i];
                _messages[length - 1] = _messages[i];
                _commandIndexes[i] = temporaryIndex;
                _messages[i] = temporaryMessage;
            }
        }

        messages = new Message[](length);
        for (uint256 i; i < length; i++) {
            messages[i] = Message(_commandIndexes[i], _messages[i]);
        }
        messagesHash = keccak256(abi.encode(messages, timestamp));
        inputData = abi.encode(messagesHash, messages, timestamp);
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
    ) public view returns (ExecutorTransfer[] memory) {
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
                    desiredPercentages[i][j]) / 10000;
                deltaMatrix[i][j] =
                    int256(desiredAmount) -
                    int256(executorsBalances[i][tokenIds[j]]);
            }
        }
        // // Print out delta matrix
        // for (uint256 i = 0; i < executorCount; i++) {
        //     for (uint256 j = 0; j < tokenCount; j++) {
        //         uint256 number;
        //         if (deltaMatrix[i][j] < 0) {
        //             console.log("Negative");
        //             number = uint256(-deltaMatrix[i][j]);
        //         } else {
        //             number = uint256(deltaMatrix[i][j]);
        //         }
        //         console.log("number:", number);
        //     }
        // }

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
                if (deltaMatrix[fromExecutor][tokenId] >= 0) {
                    // Change to >=
                    continue;
                }

                for (
                    uint256 toExecutor = 0;
                    toExecutor < executorCount;
                    toExecutor++
                ) {
                    if (
                        deltaMatrix[toExecutor][tokenId] <= 0 || // Change to <=
                        fromExecutor == toExecutor
                    ) {
                        continue;
                    }

                    int256 transferAmount = -deltaMatrix[fromExecutor][
                        tokenId
                    ] < deltaMatrix[toExecutor][tokenId]
                        ? -deltaMatrix[fromExecutor][tokenId]
                        : deltaMatrix[toExecutor][tokenId];
                    transfers[transferCount] = ExecutorTransfer(
                        fromExecutor, // Swap fromExecutor and toExecutor
                        toExecutor,
                        tokenId,
                        uint256(transferAmount)
                    );
                    transferCount++;
                    deltaMatrix[fromExecutor][tokenId] += transferAmount; // Swap += and -=
                    deltaMatrix[toExecutor][tokenId] -= transferAmount;

                    if (deltaMatrix[fromExecutor][tokenId] >= 0) {
                        // Change to >=
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
}
