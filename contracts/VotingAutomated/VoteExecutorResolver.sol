// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "../interfaces/IVoteExecutorMaster.sol";
import "hardhat/console.sol";

contract VoteExecutorResolver {
    struct Message {
        uint256 commandIndex;
        bytes commandData;
    }
    IVoteExecutorMaster public voteExecutorMaster;

    constructor(address _voteExecutorMaster) {
        voteExecutorMaster = IVoteExecutorMaster(_voteExecutorMaster);
    }

    function VoteExecutorChecker()
        external
        view
        returns (bool canExec, bytes memory execPayload)
    {
        uint256 lastDataId = _checkLastDataId();

        for (uint256 i; i < lastDataId; i++) {
            (bytes memory _data, , bytes[] memory _signs) = voteExecutorMaster
                .getSubmittedData(i);
            (bytes32 hashed, ) = abi.decode(_data, (bytes32, Message[]));
            (, uint256 timeSubmitted) = voteExecutorMaster.submittedData(i);
            // Disable first condition for test
            if (
                _signs.length >= voteExecutorMaster.minSigns() &&
                voteExecutorMaster.hashExecutionTime(hashed) == 0 &&
                timeSubmitted + voteExecutorMaster.timeLock() < block.timestamp
            ) {
                canExec = true;
                execPayload = abi.encodeWithSelector(
                    IVoteExecutorMaster.executeSpecificData.selector,
                    i
                );
                break;
            }
        }
        return (canExec, execPayload);
    }

    function _checkLastDataId() internal view returns (uint256) {
        bool checking = true;
        uint256 lastDataId;
        while (checking) {
            try voteExecutorMaster.getSubmittedData(lastDataId) {
                lastDataId++;
            } catch {
                checking = false;
            }
        }
        return lastDataId;
    }
}
