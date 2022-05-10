// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "../IbAlluoUsd.sol";

contract IbAlluoUSDPriceResolver is AccessControl{

    address public ibAlluoAddress;
    address public pokeMe;
    address public alluoBank
    event IbAlluoUSDValue(address indexed user, uint256 amount); 

    modifier onlyPokeMe() {
        require(msg.sender == pokeMe, "Only PokeMe");
        _;
    }

    //current liquidityBuffer on Polygon: 0xa248Ba96d72005114e6C941f299D315757877c0e
    constructor(address _pokeMe, address _ibAlluoAddress, address _newAdmin, address _alluoBank) public {
        pokeMe = _pokeMe;
        _grantRole(DEFAULT_ADMIN_ROLE, _newAdmin);
        ibAlluoAddress = _ibAlluoAddress;
        alluoBank = _alluoBank;
    }
    
    function checker()
        external
        view
        onlyPokeMe()
        returns (bool canExec, bytes memory execPayload)
    {
        canExec = IbAlluoUsd(ibAlluoAddress).getBalance(alluoBank);
        execPayload = "0x";
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