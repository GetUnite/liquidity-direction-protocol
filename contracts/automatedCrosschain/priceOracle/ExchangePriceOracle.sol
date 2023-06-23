// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract ExchangePriceOracle is AccessControl {
    using Address for address;

    bytes32 public constant PRICE_REQUESTER_ROLE =
        keccak256("PRICE_REQUESTER_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");

    struct PriceRequest {
        uint216 result;
        uint8 decimals;
        uint32 timestamp;
    }
    mapping(address => mapping(address => PriceRequest)) public priceRequests;

    event PriceRequested(address fromToken, address toToken);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PRICE_REQUESTER_ROLE, msg.sender);
        _grantRole(ORACLE_ROLE, msg.sender);
    }

    function requestPrice(
        address fromToken,
        address toToken
    ) external onlyRole(PRICE_REQUESTER_ROLE) {
        if (fromToken == toToken) return;
        emit PriceRequested(fromToken, toToken);
    }

    function submitPrice(
        address fromToken,
        address toToken,
        uint216 result,
        uint8 decimals
    ) external onlyRole(ORACLE_ROLE) {
        priceRequests[fromToken][toToken] = PriceRequest(
            result,
            decimals,
            uint32(block.timestamp)
        );
    }
}
