// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import "../../../interfaces/curve/ICurvePoolUSD.sol";
import "hardhat/console.sol";

contract TestMainnetUsdCurveAdapter is AccessControl {
    using Address for address;
    using SafeERC20 for IERC20;

    // All address are Polygon addresses.
    address public constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address public constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;
    address public constant USDT = 0xdAC17F958D2ee523a2206206994597C13D831ec7;
    address public constant curvePool = 0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7;
    address public constant curveLp = 0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490;
    address public wallet;
    uint256 public slippage;

    constructor (address _multiSigWallet, address _liquidityHandler, uint256 _slippage) {
        require(_multiSigWallet.isContract(), "Adapter: Not contract");
        require(_liquidityHandler.isContract(), "Adapter: Not contract");
        _grantRole(DEFAULT_ADMIN_ROLE, _multiSigWallet);
        _grantRole(DEFAULT_ADMIN_ROLE, _liquidityHandler);
        wallet = _multiSigWallet;
        slippage = _slippage;
    }

    function adapterApproveAll() external onlyRole(DEFAULT_ADMIN_ROLE){
        IERC20(DAI).safeApprove(curvePool, type(uint256).max);
        IERC20(USDC).safeApprove(curvePool, type(uint256).max);
        IERC20(USDT).safeApprove(curvePool, type(uint256).max);
        IERC20(curveLp).safeApprove(curvePool, type(uint256).max);
    }

    /// @notice When called by liquidity buffer, moves some funds to the Gnosis multisig and others into a LP to be kept as a 'buffer'
    /// @param _token Deposit token address (eg. USDC)
    /// @param _fullAmount Full amount deposited in 10**18 called by liquidity buffer
    /// @param _leaveInPool  Amount to be left in the LP rather than be sent to the Gnosis wallet (the "buffer" amount)
    function deposit(address _token, uint256 _fullAmount, uint256 _leaveInPool) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 toSend = _fullAmount - _leaveInPool;
        if (_token == DAI) {
            uint256 lpAmount = ICurvePoolUSD(curvePool).add_liquidity([_fullAmount, 0, 0], 0);
            console.log("inhere2");
            if (toSend != 0) {
                ICurvePoolUSD(curvePool).remove_liquidity_imbalance(
                    [0, toSend / 10**12,0], 
                    lpAmount * (10000+slippage)/10000, 
                    true);
                    console.log("inhere3");
                IERC20(USDC).safeTransfer(wallet, toSend / 10**12);
            }
        }
        // Need to check for non zero or tranfers throw/run 
        else if (_token == USDC) {
                console.log("inhere2ha");

            if (toSend != 0) {
                IERC20(USDC).safeTransfer(wallet, toSend / 10**12);
            }
            if (_leaveInPool != 0) {
                console.log("hered");
                ICurvePoolUSD(curvePool).add_liquidity([0, _leaveInPool/ 10**12, 0], 0);
            }
        }

        else if (_token == USDT) {
            uint256 lpAmount = ICurvePoolUSD(curvePool).add_liquidity([0, 0, _fullAmount / 10**12], 0);
            if (toSend != 0) {
                ICurvePoolUSD(curvePool).remove_liquidity_imbalance(
                                [0, toSend / 10**12,0], 
                                lpAmount * (10000+slippage)/10000);
                IERC20(USDC).safeTransfer(wallet, toSend / 10**12);
            }
        }
    } 

    /// @notice When called by liquidity buffer, withdraws funds from liquidity pool
    /// @dev It checks against arbitragers attempting to exploit spreads in stablecoins.
    /// @param _user Recipient address
    /// @param _token Deposit token address (eg. USDC)
    /// @param _amount  Amount to be withdrawn in 10*18
    function withdraw (address _user, address _token, uint256 _amount ) external onlyRole(DEFAULT_ADMIN_ROLE) {
          if (_token == DAI) {
            ICurvePoolUSD(curvePool).remove_liquidity_imbalance(
                    [_amount, 0, 0], 
                    _amount * (10000 + slippage) / 10000 
                );
            IERC20(DAI).safeTransfer(_user, _amount);

        }

        else if (_token == USDC) {
            // We want to be save agains arbitragers so at any withraw of USDT/USDC
            // contract checks how much will be burned curveLp by withrawing this amount in DAI
            // and passes this burned amount to get USDC/USDT
            uint256 toBurn = ICurvePoolUSD(curvePool).calc_token_amount([_amount, 0, 0], false);
            uint256 toUser = ICurvePoolUSD(curvePool).remove_liquidity_one_coin(
                    toBurn, 
                    1, 
                    _amount/10**12 * (10000 - slippage) / 10000
                );
            // toUser is already in 10**6
            IERC20(USDC).safeTransfer(_user, toUser);
        }

        else if (_token == USDT) {
            uint256 toBurn = ICurvePoolUSD(curvePool).calc_token_amount([_amount, 0, 0], false);
            uint256 toUser = ICurvePoolUSD(curvePool).remove_liquidity_one_coin(
                    toBurn, 
                    2, 
                    _amount/10**12 * (10000 - slippage) / 10000
                );
            // ToUser is already in 10**6.
            IERC20(USDT).safeTransfer(_user, toUser);
        }
    }
    
    function getAdapterAmount() external view returns ( uint256 ) {
        uint256 curveLpAmount = IERC20(curveLp).balanceOf((address(this)));
        if(curveLpAmount != 0){
            // Returns in 10**18
            return ICurvePoolUSD(curvePool).calc_withdraw_one_coin(curveLpAmount, 0);
        } else {
            return 0;
        }
    }

    function setSlippage(uint32 _newSlippage) external onlyRole(DEFAULT_ADMIN_ROLE) {
        slippage = _newSlippage;
    }
    function setWallet(address _newWallet) external onlyRole(DEFAULT_ADMIN_ROLE) {
        wallet = _newWallet;
    }

    /**
     * @dev admin function for removing funds from contract
     * @param _address address of the token being removed
     * @param _amount amount of the token being removed
     */
    function removeTokenByAddress(address _address, address _to, uint256 _amount)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        IERC20(_address).safeTransfer(_to, _amount);
    }
}