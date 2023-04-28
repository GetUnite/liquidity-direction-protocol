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
        uint256 _percent
    ) public view returns (uint256, bytes memory) {
        uint256 directionId = IAlluoStrategyHandler(strategyHandler)
            .getDirectionIdByName(_codeName);
        return (2, abi.encode(directionId, _percent));
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
}
