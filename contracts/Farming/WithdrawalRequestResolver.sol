// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "../interfaces/ILiquidityBufferVault.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract WithdrawalRequestResolver is AccessControl{

    address public liquidityBufferAddress;
    address public pokeMe;

    modifier onlyPokeMe() {
        require(msg.sender == pokeMe, "Only PokeMe");
        _;
    }

    //current liquidityBuffer on Polygon: 0xa248Ba96d72005114e6C941f299D315757877c0e
    constructor(address _pokeMe, address _liquidityBuffer, address _newAdmin) public {
        pokeMe = _pokeMe;
        _grantRole(DEFAULT_ADMIN_ROLE, _newAdmin);
        liquidityBufferAddress = _liquidityBuffer;
    }
    
    function checker()
        external
        view
        returns (bool canExec, bytes memory execPayload)
    {
        canExec = ILiquidityBufferVault(liquidityBufferAddress).keepersTrigger();
        execPayload = abi.encodeWithSelector(
            ILiquidityBufferVault.satisfyWithdrawals.selector
        );
        return (canExec, execPayload);
    }

    function withdrawFunds() 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        payable(msg.sender).transfer(address(this).balance);
    }

    function receiveFunds() public payable {}
}