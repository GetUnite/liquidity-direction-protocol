// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "../interfaces/ICurvePoolUSD.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import "hardhat/console.sol";

contract USDAdaptor is AccessControl {
    using Address for address;

    address public Wallet;
    address public curvePool = 0x445FE580eF8d70FF569aB36e80c647af338db351;
    address public DAI = 0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063;
    address public USDC = 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174;
    address public USDT = 0xc2132D05D31c914a87C6611C10748AEb04B58e8F;
    uint256 public slippage;

    constructor (address _multiSigWallet, address _liquidityBuffer) {
        require(_multiSigWallet.isContract(), "Buffer: Not contract");
        _grantRole(DEFAULT_ADMIN_ROLE, _multiSigWallet);
        _grantRole(DEFAULT_ADMIN_ROLE, _liquidityBuffer);
        Wallet = _multiSigWallet;
    }
    function setSlippage ( uint32 _newSlippage ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        slippage = _newSlippage;
    }
    function setWallet ( address newWallet ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        Wallet = newWallet;
    }

    // amounts are in 10**18
    function deposit(address _token, uint256 _fullAmount, uint256 _leaveInPool) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 toSend = _fullAmount - _leaveInPool;
        if (_token == DAI) {
            uint256 lpAmount = ICurvePoolUSD(curvePool).add_liquidity([_fullAmount, 0, 0], 0, true);
            if (toSend != 0) {
                uint256 lpTokensBurned = ICurvePoolUSD(curvePool).remove_liquidity_imbalance(
                    [0, toSend / 10**12,0], 
                    lpAmount, 
                    true);
                IERC20Upgradeable(USDC).transfer(Wallet, toSend / 10**12);
            }
        }

        else if (_token == USDC) {
            IERC20Upgradeable(USDC).transfer(Wallet, toSend / 10**12);
            uint256 lpTokensBurned = ICurvePoolUSD(curvePool).add_liquidity([0, _leaveInPool/ 10**12, 0], 0, true);

        }

        else if (_token == USDT) {
            uint256 lpAmount = ICurvePoolUSD(curvePool).add_liquidity([0, 0, _fullAmount / 10**12], 0, true);
            if (toSend != 0) {
                uint256 lpTokensBurned = ICurvePoolUSD(curvePool).remove_liquidity_imbalance(
                                [0, toSend / 10**12,0], 
                                lpAmount, 
                                true);
                IERC20Upgradeable(USDC).transfer(Wallet, toSend / 10**12);
            }
        }
    } 
  
    function withdraw (address _user, address _token, uint256 _amount ) external onlyRole(DEFAULT_ADMIN_ROLE) {
          if (_token == DAI) {
            ICurvePoolUSD(curvePool).remove_liquidity_imbalance(
                    [_amount, 0, 0], 
                    _amount * (10000 + slippage) / 10000, 
                    true
                );
            IERC20Upgradeable(DAI).transfer(_user, _amount);
        }

        else if (_token == USDC) {
            // We want to be save agains arbitragers so at any withraw of USDT/USDC
            // contract checks how much will be burned curveLp by withrawing this amount in DAI
            // and passes this burned amount to get USDC/USDT
            uint256 toBurn = ICurvePoolUSD(curvePool).calc_token_amount([_amount, 0, 0], false);
            uint256 toUser = ICurvePoolUSD(curvePool).remove_liquidity_one_coin(
                    toBurn, 
                    1, 
                    _amount/10**12 * (10000 - slippage) / 10000, 
                    true
                );
            // toUser is already in 10**6
            IERC20Upgradeable(USDC).transfer(_user, toUser);
        }

        else if (_token == USDT) {
            uint256 toBurn = ICurvePoolUSD(curvePool).calc_token_amount([_amount, 0, 0], false);
            uint256 toUser = ICurvePoolUSD(curvePool).remove_liquidity_one_coin(
                    toBurn, 
                    2, 
                    _amount/10**12 * (10000 - slippage) / 10000, 
                    true
                );
            // ToUser is already in 10**6.
            IERC20Upgradeable(USDT).transfer(_user, toUser);
        }
    }

    function AdaptorApproveAll() external {
        IERC20Upgradeable(DAI).approve(curvePool, type(uint256).max);
        IERC20Upgradeable(USDC).approve(curvePool, type(uint256).max);
        IERC20Upgradeable(USDT).approve(curvePool, type(uint256).max);
        IERC20Upgradeable(0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171).approve(curvePool, type(uint256).max);
    }
    function getAdapterAmount () external view returns ( uint256 ) {
        uint256 curveLp = IERC20Upgradeable(0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171).balanceOf((address(this)));
        if(curveLp != 0){
            // Returns in 10**18
            uint256 value = ICurvePoolUSD(curvePool).calc_withdraw_one_coin(curveLp, 0);
            return value;
        } else {
            return 0;
        }
    }
}