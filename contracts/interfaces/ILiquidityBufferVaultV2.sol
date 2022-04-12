// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

interface ILiquidityBufferVaultV2 {
  function deposit(address _user, address _token, uint256 _amount) external;
  function withdraw(address _user, address _token, uint256 _amount) external;
}