// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Address.sol";

import "../../interfaces/curve/ICurvePoolUSD.sol";

contract UsdCurveAdapter is AccessControl {
    using Address for address;
    using SafeERC20 for IERC20;

    // All address are Polygon addresses.
    address public constant DAI = 0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063;
    address public constant USDC = 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174;
    address public constant USDT = 0xc2132D05D31c914a87C6611C10748AEb04B58e8F;
    address public constant curvePool = 0x445FE580eF8d70FF569aB36e80c647af338db351;
    address public constant curveLp = 0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171;
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
            uint256 lpAmount = ICurvePoolUSD(curvePool).add_liquidity([_fullAmount, 0, 0], 0, true);
            if (toSend != 0) {
                ICurvePoolUSD(curvePool).remove_liquidity_imbalance(
                    [0, toSend / 10**12,0], 
                    lpAmount * (10000+slippage)/10000, 
                    true);
                IERC20(USDC).safeTransfer(wallet, toSend / 10**12);
            }
        }
        // Need to check for non zero or tranfers throw/run 
        else if (_token == USDC) {
            if (toSend != 0) {
                IERC20(USDC).safeTransfer(wallet, toSend / 10**12);
            }
            if (_leaveInPool != 0) {
                ICurvePoolUSD(curvePool).add_liquidity([0, _leaveInPool/ 10**12, 0], 0, true);
            }
        }

        else if (_token == USDT) {
            uint256 lpAmount = ICurvePoolUSD(curvePool).add_liquidity([0, 0, _fullAmount / 10**12], 0, true);
            if (toSend != 0) {
                ICurvePoolUSD(curvePool).remove_liquidity_imbalance(
                                [0, toSend / 10**12,0], 
                                lpAmount * (10000+slippage)/10000, 
                                true);
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
                    _amount * (10000 + slippage) / 10000, 
                    true
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
                    _amount/10**12 * (10000 - slippage) / 10000, 
                    true
                );
            // toUser is already in 10**6
            IERC20(USDC).safeTransfer(_user, toUser);
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