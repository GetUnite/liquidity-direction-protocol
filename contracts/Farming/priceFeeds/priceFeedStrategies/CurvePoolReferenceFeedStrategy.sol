// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./../IFeedStrategy.sol";

import "hardhat/console.sol";

interface ICurvePool {
    function get_dy(
        int128 i,
        int128 j,
        uint256 dx
    ) external view returns (uint256);
}

contract CurvePoolReferenceFeedStrategy is IFeedStrategy {
    IFeedStrategy public immutable referenceFeed;
    ICurvePool public immutable curvePool;
    int8 public immutable referenceCoinIndex;
    int8 public immutable outputCoinIndex;
    uint8 public immutable outputCoinDecimals;
    uint256 public immutable oneToken;

    constructor(
        address referenceFeedAddress, // price feed to use
        address curvePoolAddress, // 0xAd326c253A84e9805559b73A08724e11E49ca651 - curve pool to use
        int8 coinIndex, // 3 - token index which feed (referenceFeedAddress) we already have
        int8 outIndex, // index of coin in pool we are outputing
        uint8 outDecimals, // decimals of coin in pool we are outputing
        uint256 oneTokenAmount // 1000000 - 1.0 of reference coin token with decimals
    ) {
        curvePool = ICurvePool(curvePoolAddress);
        referenceCoinIndex = coinIndex;
        outputCoinIndex = outIndex;
        oneToken = oneTokenAmount;
        referenceFeed = IFeedStrategy(referenceFeedAddress);
        outputCoinDecimals = outDecimals;
    }

    function getPrice() external view returns (int256 value, uint8 decimals) {
        uint256 l1price = curvePool.get_dy(
            referenceCoinIndex,
            outputCoinIndex,
            oneToken
        );

        (int256 usdPrice, uint8 usdDecimals) = referenceFeed.getPrice();
        require(usdPrice > 0, "CurvePRFS: feed lte 0");

        return (
            int256(l1price * 10**usdDecimals) / usdPrice,
            outputCoinDecimals
        );
    }
}
