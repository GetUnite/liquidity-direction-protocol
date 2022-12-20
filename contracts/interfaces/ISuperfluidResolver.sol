// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

interface ISuperfluidResolver {
    function addToChecker(address _sender, address _receiver) external;

    function removeFromChecker(address _sender, address _receiver) external;
}
