// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface IHarvest {
    function harvest(address _mergedStrategy) external;
}
