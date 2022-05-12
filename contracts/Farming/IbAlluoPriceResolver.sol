pragma solidity ^0.8.11;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./IbAlluoUSD.sol";

contract IbAlluoUSDPriceResolver is AccessControl{

    address public ibAlluoAddress;
    address public pokeMe;
    address public alluoBank;
    event IbAlluoUSDValue(address indexed user, uint256 amount); 

    //current liquidityBuffer on Polygon: 0xa248Ba96d72005114e6C941f299D315757877c0e
    constructor(address _ibAlluoAddress, address _newAdmin, address _alluoBank) public {
        _grantRole(DEFAULT_ADMIN_ROLE, _newAdmin);
        ibAlluoAddress = _ibAlluoAddress;
        alluoBank = _alluoBank;
    }
    
    function emitter()
        external
    {
        emit IbAlluoUSDValue(alluoBank, IbAlluoUSD(ibAlluoAddress).getBalance(alluoBank));
    }

    function withdrawFunds() 
        external 
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        payable(msg.sender).transfer(address(this).balance);
    }

    function receiveFunds() public payable {}
}