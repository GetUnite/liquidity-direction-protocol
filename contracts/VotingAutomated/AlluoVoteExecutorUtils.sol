// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {ECDSAUpgradeable} from "@openzeppelin/contracts-upgradeable/utils/cryptography/ECDSAUpgradeable.sol";

import {AlluoUpgradeableBase} from "../AlluoUpgradeableBase.sol";

import {IAlluoStrategyHandler} from "../interfaces/IAlluoStrategyHandler.sol";
import {IAlluoVoteExecutor} from "../interfaces/IAlluoVoteExecutor.sol";
import {IGnosis} from "../interfaces/IGnosis.sol";

import "hardhat/console.sol";

contract AlluoVoteExecutorUtils is AlluoUpgradeableBase {
    using ECDSAUpgradeable for bytes32;

    address public strategyHandler;
    address public voteExecutor;
    struct ExecutorTransfer {
        uint256 fromExecutor;
        uint256 toExecutor;
        uint256 tokenId;
        uint256 amount;
    }
    struct Message {
        uint256 commandIndex;
        bytes commandData;
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
        console.log("HELOOOOOOO", signs.length);
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
            // Skip the iteration if the _signs element is "0x"
            if (
                keccak256(abi.encodePacked(bytesToHex(_signs[i]))) ==
                keccak256(abi.encodePacked("0x"))
            ) {
                console.log("Gotinhere");
                continue;
            }
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

    function bytesToHex(
        bytes memory _bytes
    ) public pure returns (string memory) {
        bytes memory alphabet = "0123456789abcdef";

        bytes memory str = new bytes(2 * _bytes.length + 2);
        str[0] = "0";
        str[1] = "x";
        for (uint256 i = 0; i < _bytes.length; i++) {
            str[2 * i + 2] = alphabet[uint8(_bytes[i] >> 4)];
            str[2 * i + 3] = alphabet[uint8(_bytes[i] & 0x0f)];
        }
        return string(str);
    }

    function verify(
        bytes32 data,
        bytes memory signature,
        address account
    ) public pure returns (bool) {
        return data.toEthSignedMessageHash().recover(signature) == account;
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
