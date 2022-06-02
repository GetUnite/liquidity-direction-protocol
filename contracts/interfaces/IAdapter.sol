// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

interface IAdapter{
    function deposit(address _token, uint256 fullAmount, uint256 leaveInPool) external;
    function withdraw (address _user, address _token, uint256 _amount ) external;
    // admin function for withdrawing all funds from pool in primary token
    function withdrawAll() external;
    function getAdapterAmount () external view returns ( uint256 );
    
    function setSlippage ( uint32 _newSlippage ) external;
    function setWallet ( address newWallet ) external;
    function getCoreTokens() external pure returns ( address mathToken, address primaryToken );

}