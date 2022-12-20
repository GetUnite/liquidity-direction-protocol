// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

interface ISuperfluidEndResolver {
    function addToChecker(
        address _sender,
        address _receiver,
        uint256 timestamp
    ) external;

    function removeFromChecker(address _sender, address _receiver) external;
}
