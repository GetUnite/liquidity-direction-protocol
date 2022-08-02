// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./../../Farming/priceFeeds/IFeedStrategy.sol";

contract BadPriceStrategy is IFeedStrategy {
    int256 private _value;
    uint8 private _decimals;

    constructor(int128 value, uint8 decimals) {
        _value = value;
        _decimals = decimals;
    }

    function getPrice() external view returns (int256 value, uint8 decimals) {
        return (_value, _decimals);
    }

    function changeParams(int128 value, uint8 decimals) external {
        _value = value;
        _decimals = decimals;
    }
}
