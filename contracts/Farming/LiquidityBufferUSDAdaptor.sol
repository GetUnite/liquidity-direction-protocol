// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "../interfaces/ICurvePool.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "hardhat/console.sol";

contract LiquidityBufferUSDAdaptor {
    function enterAdaptor(address _token, address _primaryToken, address _wallet, uint256 _amount, address _pool, uint256 slippage) external returns (uint256) {
        if (_token == 0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063) {
            uint256 lpAmount = ICurvePool(_pool).add_liquidity([_amount, 0, 0], 0, true);
            uint256 toWallet6 = ICurvePool(_pool).remove_liquidity_one_coin(
                    lpAmount,
                    1,
                    _amount/10**12 * (10000 - slippage) / 10000,
                    true
                );
            IERC20Upgradeable(_primaryToken).transfer(_wallet, toWallet6);
            return toWallet6;
        }

        else if (_token == 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174) {
            IERC20Upgradeable(_primaryToken).transfer(_wallet, _amount/ 10**12);
            return _amount/10**12;
        }

        else if (_token == 0xc2132D05D31c914a87C6611C10748AEb04B58e8F) {
            uint256 lpAmount = ICurvePool(_pool).add_liquidity([0, 0, _amount/10**12], 0, true);
            uint256 toWallet6 = ICurvePool(_pool).remove_liquidity_one_coin(
                    lpAmount,
                    1,
                    _amount/10**12 * (10000 - slippage) / 10000,
                    true
                );
            IERC20Upgradeable(_primaryToken).transfer(_wallet, toWallet6);
            return toWallet6;
        }
    }

    function exitAdaptor(address _user, address _token, address _primaryToken, address _wallet, uint256 _amount, address _pool, uint256 slippage ) external returns (uint256) {
         if (_token == 0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063) {
            ICurvePool(_pool).remove_liquidity_imbalance(
                    [_amount, 0, 0], 
                    _amount * (10000 + slippage) / 10000, 
                    true
                );
            IERC20Upgradeable(0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063).transfer(_user, _amount);
            return _amount;
        }

        else if (_token == _primaryToken) {
            // We want to be save agains arbitragers so at any withraw of USDT/_primaryToken
            // contract checks how much will be burned curveLp by withrawing this amount in DAI
            // and passes this burned amount to get _primaryToken/USDT
            uint256 toBurn = ICurvePool(_pool).calc_token_amount([_amount, 0, 0], false);
            uint256 toUser = ICurvePool(_pool).remove_liquidity_one_coin(
                    toBurn, 
                    1, 
                    _amount/10**12 * (10000 - slippage) / 10000, 
                    true
                );
            // toUser is already in 10**6
            IERC20Upgradeable(_primaryToken).transfer(_user, toUser);
            return toUser;
        }

        else if (_token == 0xc2132D05D31c914a87C6611C10748AEb04B58e8F) {
            uint256 toBurn = ICurvePool(_pool).calc_token_amount([_amount, 0, 0], false);
            uint256 toUser = ICurvePool(_pool).remove_liquidity_one_coin(
                    toBurn, 
                    2, 
                    _amount/10**12 * (10000 - slippage) / 10000, 
                    true
                );
            // ToUser is already in 10**6.
            IERC20Upgradeable(0xc2132D05D31c914a87C6611C10748AEb04B58e8F).transfer(_user, toUser);
            return toUser;
        }
    }

    function exitAdaptorGetBalance(address _pool) external view returns (uint256) {
        uint256 curveLp = IERC20Upgradeable(0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171).balanceOf((address(this)));
        if(curveLp != 0){
            // Returns in 10**18
            uint256 value = ICurvePool(_pool).calc_withdraw_one_coin(curveLp, 0);
            return value;
        }
        return 0;
    }

    function convertTokenToPrimaryToken(address _token, uint256 _amount, address _pool) external returns (uint256) {
        // While you could withdraw immediately in terms of _primaryToken, just keep inside curve pool.
        if (_token == 0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063) {
            uint256 lpAmount = ICurvePool(_pool).add_liquidity([_amount, 0, 0], 0, true);
            return lpAmount;
        }

        else  if (_token == 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174) {
            uint256 lpAmount = ICurvePool(_pool).add_liquidity([0, _amount/10**12, 0], 0, true);
            return lpAmount;
        }

        else  if (_token == 0xc2132D05D31c914a87C6611C10748AEb04B58e8F) {
            uint256 lpAmount = ICurvePool(_pool).add_liquidity([0, 0, _amount/10**12], 0, true);
            return lpAmount;

        }
    }

    function AdaptorApproveAll(address _pool) external {
        IERC20Upgradeable(0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063).approve(_pool, type(uint256).max);
        IERC20Upgradeable(0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174).approve(_pool, type(uint256).max);
        IERC20Upgradeable(0xc2132D05D31c914a87C6611C10748AEb04B58e8F).approve(_pool, type(uint256).max);
    }
}