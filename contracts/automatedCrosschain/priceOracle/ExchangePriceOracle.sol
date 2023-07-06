// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

contract ExchangePriceOracle is AccessControl {
    bytes32 public constant PRICE_REQUESTER_ROLE =
        keccak256("PRICE_REQUESTER_ROLE");
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");

    struct PriceRequest {
        uint216 result;
        uint8 decimals;
        uint32 timestamp;
    }
    mapping(address => mapping(address => PriceRequest)) public submittedPrices;

    event PriceRequested(address fromToken, address toToken);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PRICE_REQUESTER_ROLE, msg.sender);
        _grantRole(ORACLE_ROLE, msg.sender);
    }

    function priceRequests(
        address from,
        address to
    ) external view returns (uint216 result, uint8 decimals, uint32 timestamp) {
        if (uint160(from) > uint160(to)) {
            PriceRequest memory request = submittedPrices[from][to];
            return (request.result, request.decimals, request.timestamp);
        } else {
            PriceRequest memory request = submittedPrices[to][from];
            uint216 reversePrice = uint216(
                (10 ** (request.decimals * 2)) / uint256(request.result)
            );
            return (reversePrice, request.decimals, request.timestamp);
        }
    }

    function requestPrice(
        address fromToken,
        address toToken
    ) external onlyRole(PRICE_REQUESTER_ROLE) {
        if (fromToken == toToken) return;

        if (uint160(fromToken) > uint160(toToken)) {
            emit PriceRequested(fromToken, toToken);
        } else {
            emit PriceRequested(toToken, fromToken);
        }
    }

    function submitPrice(
        address fromToken,
        address toToken,
        uint216 result,
        uint8 decimals
    ) external onlyRole(ORACLE_ROLE) {
        submittedPrices[fromToken][toToken] = PriceRequest(
            result,
            decimals,
            uint32(block.timestamp)
        );
    }
}
