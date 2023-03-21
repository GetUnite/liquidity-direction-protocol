// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {DecimalConverter} from "../../libs/DecimalConverter.sol";

contract DecimalConverterTest {
    function toDecimals(
        uint256 value,
        uint256 currentDecimals,
        uint256 targetDecimals
    ) external pure returns (uint256) {
        return
            DecimalConverter.toDecimals(value, currentDecimals, targetDecimals);
    }
}
