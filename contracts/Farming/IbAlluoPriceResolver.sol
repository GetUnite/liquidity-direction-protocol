// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "../interfaces/IIbAlluo.sol";

contract IbAlluoUSDPriceResolver is AccessControl{

    address public ibAlluoAddress;
    address public alluoBank;
    event IbAlluoUSDValue(address indexed user, uint256 usdValue, uint256 amountOfIbAlluo, uint256 oneIbAlluoValue); 

    constructor(address _ibAlluoAddress, address _newAdmin, address _alluoBank) public {
        _grantRole(DEFAULT_ADMIN_ROLE, _newAdmin);
        ibAlluoAddress = _ibAlluoAddress;
        alluoBank = _alluoBank;
    }
    
    function emitter()
        external
    {
        IIbAlluo(ibAlluoAddress).updateRatio();
        emit IbAlluoUSDValue(alluoBank, IIbAlluo(ibAlluoAddress).getBalance(alluoBank), IIbAlluo(ibAlluoAddress).balanceOf(alluoBank), IIbAlluo(ibAlluoAddress).growingRatio());
    }
}