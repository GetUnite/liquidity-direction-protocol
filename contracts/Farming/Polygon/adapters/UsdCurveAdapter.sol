// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import "../../../interfaces/curve/ICurvePoolUSD.sol";
import "../../../interfaces/IPriceFeedRouter.sol";

import "hardhat/console.sol";

contract UsdCurveAdapter is AccessControl {
    using Address for address;
    using SafeERC20 for IERC20;

    // All address are Polygon addresses.
    address public constant DAI = 0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063;
    address public constant USDC = 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174;
    address public constant USDT = 0xc2132D05D31c914a87C6611C10748AEb04B58e8F;
    address public constant CURVE_POOL =
        0x445FE580eF8d70FF569aB36e80c647af338db351;
    address public constant CURVE_LP =
        0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171;
    address public buffer;
    uint64 public slippage;
    address public priceFeedRouter;
    uint64 public primaryTokenIndex;
    uint128 public liquidTokenIndex;
    uint64 public maxSendSlippage;

    mapping(address => uint128) public indexes;

    constructor (
        address _multiSigWallet, 
        address _bufferManager, 
        address _liquidityHandler, 
        uint64 _lowSlippage,
        uint64 _maxSlippage
    ) {
        require(_multiSigWallet.isContract(), "Adapter: Not contract");
        require(_liquidityHandler.isContract(), "Adapter: Not contract");
        _grantRole(DEFAULT_ADMIN_ROLE, _multiSigWallet);
        _grantRole(DEFAULT_ADMIN_ROLE, _liquidityHandler);
        buffer = _bufferManager;
        slippage = _lowSlippage;
        maxSendSlippage = _maxSlippage;


        indexes[DAI] = 0;
        indexes[USDC] = 1;
        indexes[USDT] = 2;

        primaryTokenIndex = 1;
    }

    function adapterApproveAll() external onlyRole(DEFAULT_ADMIN_ROLE) {
        IERC20(DAI).safeApprove(CURVE_POOL, type(uint256).max);
        IERC20(USDC).safeApprove(CURVE_POOL, type(uint256).max);
        IERC20(USDT).safeApprove(CURVE_POOL, type(uint256).max);
        IERC20(CURVE_LP).safeApprove(CURVE_POOL, type(uint256).max);
    }

    /// @notice When called by liquidity handler, moves some funds to the Gnosis multisig and others into a LP to be kept as a 'buffer'
    /// @param _token Deposit token address (eg. USDC)
    /// @param _fullAmount Full amount deposited in 10**18 called by liquidity handler
    /// @param _leaveInPool  Amount to be left in the LP rather than be sent to the Buffer Manager contract (the "buffer" amount)
    function deposit(
        address _token,
        uint256 _fullAmount,
        uint256 _leaveInPool
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 toSend = _fullAmount - _leaveInPool;
        address primaryToken = ICurvePoolUSD(CURVE_POOL).underlying_coins(
            primaryTokenIndex
        );
        if (_token == primaryToken) {
            if (toSend != 0) {
                IERC20(primaryToken).safeTransfer(
                    buffer,
                    toSend /
                        10 ** (18 - IERC20Metadata(primaryToken).decimals())
                );
            }
            if (_leaveInPool != 0) {
                uint256[3] memory amounts;
                amounts[primaryTokenIndex] =
                    _leaveInPool /
                    10 ** (18 - IERC20Metadata(primaryToken).decimals());
                ICurvePoolUSD(CURVE_POOL).add_liquidity(amounts, 0, true);
            }
        } else {
            uint256[3] memory amounts;
            amounts[indexes[_token]] =
                _fullAmount /
                10 ** (18 - IERC20Metadata(_token).decimals());

            uint256 lpAmount = ICurvePoolUSD(CURVE_POOL).add_liquidity(
                amounts,
                0,
                true
            );
            delete amounts;
            if (toSend != 0) {
                toSend =
                    toSend /
                    10 ** (18 - IERC20Metadata(primaryToken).decimals());
                amounts[primaryTokenIndex] = toSend;
                ICurvePoolUSD(CURVE_POOL).remove_liquidity_imbalance(
                    amounts,
                    (lpAmount * (10000 + slippage)) / 10000,
                    true
                );
                IERC20(primaryToken).safeTransfer(buffer, toSend);
            }
        }
    }

    /// @notice When called by liquidity handler, withdraws funds from liquidity pool
    /// @param _user Recipient address
    /// @param _token Deposit token address (eg. USDC)
    /// @param _amount  Amount to be withdrawn in 10*18
    function withdraw(
        address _user,
        address _token,
        uint256 _amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256[3] memory amounts;
        uint256 amount = _amount /
            10 ** (18 - IERC20Metadata(liquidToken).decimals());
        amounts[liquidTokenIndex] = amount;

        if (_token == liquidToken) {
            ICurvePoolUSD(CURVE_POOL).remove_liquidity_imbalance(
                amounts,
                (_amount * (10000 + slippage)) / 10000,
                true
            );
            IERC20(_token).safeTransfer(_user, amount);
        } else {
            // We want to be save agains arbitragers so at any withraw contract checks
            // how much will be burned curveLp by withrawing this amount in token with most liquidity
            // and passes this burned amount to get tokens
            uint256 toBurn = ICurvePoolUSD(CURVE_POOL).calc_token_amount(
                amounts,
                false
            );
            uint256 minAmountOut = _amount /
                10 ** (18 - IERC20Metadata(_token).decimals());
            uint256 toUser = ICurvePoolUSD(CURVE_POOL)
                .remove_liquidity_one_coin(
                    toBurn,
                    int128(indexes[_token]),
                    (minAmountOut * (10000 - slippage)) / 10000,
                    true
                );
            uint256 toUser18 = toUser *
                10 ** (18 - IERC20Metadata(_token).decimals());
            require(
                toUser18 <= (_amount * (10000 + maxSendSlippage)) / 10000,
                "Adapter: too much sending"
            );
            IERC20(_token).safeTransfer(_user, toUser);
        }
    }

    function getAdapterAmount() external view returns (uint256) {
        // get price feed for primary token in usd
        // return the usd value to amount
        // return in 10**18

        uint256 curveLpAmount = IERC20(CURVE_LP).balanceOf((address(this)));
        if (curveLpAmount != 0) {
            address primaryToken = ICurvePoolUSD(CURVE_POOL).underlying_coins(
                primaryTokenIndex
            );
            uint256 amount = (
                ICurvePoolUSD(CURVE_POOL).calc_withdraw_one_coin(
                    curveLpAmount,
                    int128(uint128(primaryTokenIndex))
                )
            ) * 10 ** (18 - ERC20(primaryToken).decimals());

            if (priceFeedRouter != address(0)) {
                (uint256 price, uint8 priceDecimals) = IPriceFeedRouter(
                    priceFeedRouter
                ).getPrice(primaryToken, fiatIndex);
                amount = (amount * price) / 10 ** (uint256(priceDecimals));
            }

            return amount;
        } else {
            return 0;
        }
    }

    function getCoreTokens() external view returns (address primaryToken) {
        return (ICurvePoolUSD(CURVE_POOL).underlying_coins(primaryTokenIndex));
    }

    function changePrimaryTokenIndex(
        uint64 _newPrimaryTokenIndex
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        primaryTokenIndex = _newPrimaryTokenIndex;
    }

    function setSlippage(
        uint64 _lowSlippage,
        uint64 _maxSlippage
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        slippage = _lowSlippage;
        maxSendSlippage = _maxSlippage;
    }

    function setBuffer(
        address _newBufferManager
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        buffer = _newBufferManager;
    }

    function setPriceRouterInfo(
        address _priceFeedRouter,
        uint256 _fiatIndex
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        priceFeedRouter = _priceFeedRouter;
        fiatIndex = _fiatIndex;
    }

    /**
     * @dev admin function for removing funds from contract
     * @param _address address of the token being removed
     * @param _amount amount of the token being removed
     */
    function removeTokenByAddress(
        address _address,
        address _to,
        uint256 _amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        IERC20(_address).safeTransfer(_to, _amount);
    }
}
