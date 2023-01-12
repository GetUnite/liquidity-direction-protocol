//SPDX-License-Identifier: MIT

pragma solidity ^0.8.11;

interface IBufferManager {
    function refillBuffer(address _ibAlluo) external returns (bool);

    function isAdapterPendingWithdrawal(
        address _ibAlluo
    ) external returns (bool);

    function adapterRequiredRefill(address _ibAlluo) external returns (uint256);
}
