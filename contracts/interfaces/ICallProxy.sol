// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

interface ICallProxy {
    function anyCall(
        address _to,
        bytes calldata _data,
        address _fallback,
        uint256 _toChainID,
        uint256 _flags
    ) external;
}
