// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

interface IPriceFeedRouter {
    function getPrice(
        address token,
        string calldata fiatName
    ) external returns (uint256 value, uint8 decimals);

    function getPrice(
        address token,
        uint256 fiatId
    ) external view returns (uint256 value, uint8 decimals);

    function setCrytoStrategy(address strategy, address coin) external;

    function setFiatStrategy(
        string calldata fiatSymbol,
        uint256 fiatId,
        address fiatFeed
    ) external;

    function transferOwnership(address newOwner) external;
}
