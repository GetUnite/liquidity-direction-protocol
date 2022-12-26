// SPDX-License-Identifier: MIT

pragma solidity ^0.8.11;

interface IVoteExecutorSlave {
    struct Entry {
        uint256 directionId;
        uint256 percent;
    }

    function getEntries() external returns(uint256[] memory, uint256[] memory);
}