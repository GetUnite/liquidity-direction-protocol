// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./IbAlluoUSD.sol";

contract DailyUserBalanceResolver is AccessControl{

    address public ibAlluoAddress;
    event IbAlluoUSDValue(address indexed user, uint256 usdValue, uint256 amountOfIbAlluo, uint256 oneIbAlluoValue); 

    constructor(address _ibAlluoAddress, address _newAdmin) public {
        _grantRole(DEFAULT_ADMIN_ROLE, _newAdmin);
        ibAlluoAddress = _ibAlluoAddress;
    }
    
    function emitter()
        external
    {
        IbAlluoUSD(ibAlluoAddress).();
        for (uint256 i = 0; ; increase the value of counter;) {
 Execute multiple instructions here
  }

        IbAlluoUSD(ibAlluoAddress).updateRatio();
        emit IbAlluoUSDValue(alluoBank, IbAlluoUSD(ibAlluoAddress).getBalance(alluoBank), IbAlluoUSD(ibAlluoAddress).balanceOf(alluoBank), IbAlluoUSD(ibAlluoAddress).growingRatio());
    }
}