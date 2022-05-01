// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

interface IBufferV2{

    function deposit (address _token, uint256 _amount) external;
    function withdraw (address _user, address _token, uint256 _amount ) external;
    
    function getExpectedAdapterAmount (uint256 _newAmount) external view returns ( uint256 );

    //I think it would be great to have 2 types of satisfy functions
    function satisfyAllWithdrawals () external;
    function satisfyAdaptorWithdrawals ( uint256 _id ) external;

    // i think in case where we turn off adaptor we will leave all tokens in buffer
    // but for now just have for this case one check 
    // at the beginning of deposit/withdraw functions in buffer
    function setAdaptorStatus (uint _id, bool _newStatus) external;

    // and all other admin functions for adaptors
    // ideally to have some functions for swithing for one entry token set adaptors 
    // and other stuff
    function setAdaptorPersentage (uint _id, uint32 _newPercentage ) external;
    // function that will return all info about all active adapters
    // + amounts
    function getActiveAdapters () external view ;
    // and another about all
    function getAllAdapters () external view ;
}

interface IAdapter{
    // maybe also pass amount from getAdapterAmount() to not call it 
    // second time inside adaptor
    function deposit(address _token, uint256 fullAmount, uint256 leaveInPool) external;
    // as usual
    function withdraw (address _user, address _token, uint256 _amount ) external;
    // admin function for withdrawing all funds from pool in primary token
    function withdrawAll() external;
    // something like with getBufferAmount in current buffer
    function getAdapterAmount () external view returns ( uint256 );
    
    // i dont think that we will ever change next 2 but anyways
    function setSlippage ( uint32 _newSlippage ) external;
    function setWallet ( address newWallet ) external;
}