// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import {IConstantOutflowNFT} from "../../interfaces/superfluid/IConstantOutflowNFT.sol";

contract PlaceholderNFTSuperfluid is IConstantOutflowNFT {
    function onCreate(address, address) external override {}

    function onUpdate(address, address) external override {}

    function onDelete(address, address) external override {}
}
