// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

library DecimalConverter {
    function toDecimals(
        uint256 value,
        uint256 currentDecimals,
        uint256 targetDecimals
    ) internal pure returns (uint256) {
        if (currentDecimals < targetDecimals) {
            return value * 10 ** (targetDecimals - currentDecimals);
        } else {
            return value / 10 ** (currentDecimals - targetDecimals);
        }
    }
}
