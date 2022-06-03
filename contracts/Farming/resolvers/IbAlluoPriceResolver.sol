// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/interfaces/IERC20Metadata.sol";
import "./../../interfaces/IIbAlluo.sol";
import "./../LiquidityHandler.sol";

contract IbAlluoPriceResolver is AccessControl {
    address[] public ibAlluoAddress;
    address public alluoBank;
    address public liquidityHandlerAddress;

    event IbAlluoValue(
        address indexed user,
        string symbol,
        uint256 usdValue,
        uint256 amountOfIbAlluo,
        uint256 oneIbAlluoValue
    );

    constructor(
        address _liquidityHandlerAddress,
        address _newAdmin,
        address _alluoBank
    ) {
        _grantRole(DEFAULT_ADMIN_ROLE, _newAdmin);
        liquidityHandlerAddress = _liquidityHandlerAddress;
        alluoBank = _alluoBank;
    }

    function emitter() external {
        address[] memory iBAlluos  = LiquidityHandler(liquidityHandlerAddress).getListOfIbAlluos();
        for (uint i=0; i<iBAlluos.length; i++) {
            IIbAlluo(iBAlluos[i]).updateRatio();
            emit IbAlluoValue(
                alluoBank,
                IERC20Metadata(iBAlluos[i]).symbol(),
                IIbAlluo(iBAlluos[i]).getBalance(alluoBank),
                IIbAlluo(iBAlluos[i]).balanceOf(alluoBank),
                IIbAlluo(iBAlluos[i]).growingRatio()
            );
        }
    }
}
