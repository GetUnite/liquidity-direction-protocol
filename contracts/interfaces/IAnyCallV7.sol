// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

interface IAnyCallV7 {
    function anyCall(
        address _to,
        bytes calldata _data,
        uint256 _toChainID,
        uint256 _flags,
        bytes calldata
    ) external;

    function executor() external view returns (address);
}

interface IAnyCallV7Executor {
    function anyCall(
        address _to,
        bytes calldata _data,
        uint256 _toChainID,
        uint256 _flags,
        bytes calldata
    ) external;
}
