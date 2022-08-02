// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/interfaces/IERC20Metadata.sol";
import "./../../../interfaces/IIbAlluo.sol";
import "./../../../interfaces/ILiquidityHandler.sol";

contract IbAlluoPriceResolver{
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
        address _alluoBank
    ) {
        liquidityHandlerAddress = _liquidityHandlerAddress;
        alluoBank = _alluoBank;
    }

    function emitter() external {
        address[] memory ibAlluos  = ILiquidityHandler(liquidityHandlerAddress).getListOfIbAlluos();
        for (uint i=0; i<ibAlluos.length; i++) {
            IIbAlluo(ibAlluos[i]).updateRatio();
            emit IbAlluoValue(
                alluoBank,
                IERC20Metadata(ibAlluos[i]).symbol(),
                IIbAlluo(ibAlluos[i]).getBalance(alluoBank),
                IIbAlluo(ibAlluos[i]).balanceOf(alluoBank),
                IIbAlluo(ibAlluos[i]).growingRatio()
            );
        }
    }
}
