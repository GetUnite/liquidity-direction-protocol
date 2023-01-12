// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "../../../interfaces/curve/ICurvePoolEUR.sol";
import "../../../interfaces/IPriceFeedRouter.sol";

contract EurCurveAdapter is AccessControl {
    using Address for address;
    using SafeERC20 for IERC20;

    address public constant JEUR = 0x4e3Decbb3645551B8A19f0eA1678079FCB33fB4c;
    address public constant PAR = 0xE2Aa7db6dA1dAE97C5f5C6914d285fBfCC32A128;
    address public constant EURS = 0xE111178A87A3BFf0c8d18DECBa5798827539Ae99;
    address public constant EURT = 0x7BDF330f423Ea880FF95fC41A280fD5eCFD3D09f;
    address public constant CURVE_POOL =
        0xAd326c253A84e9805559b73A08724e11E49ca651;
    address public buffer;
    uint64 public slippage;
    address public priceFeedRouter;
    uint64 public primaryTokenIndex;
    uint256 public fiatIndex;

    mapping(address => uint128) public indexes;

    // 0 = jEUR-18dec, 1 = PAR-18dec , 2 = EURS-2dec, 3 = EURT-6dec
    constructor(
        address _multiSigWallet,
        address _bufferManager,
        address _liquidityHandler,
        uint64 _slippage
    ) {
        require(_multiSigWallet.isContract(), "Adapter: Not contract");
        require(_liquidityHandler.isContract(), "Adapter: Not contract");
        _grantRole(DEFAULT_ADMIN_ROLE, _multiSigWallet);
        _grantRole(DEFAULT_ADMIN_ROLE, _liquidityHandler);
        buffer = _bufferManager;
        slippage = _slippage;

        indexes[JEUR] = 0;
        indexes[PAR] = 1;
        indexes[EURS] = 2;
        indexes[EURT] = 3;

        primaryTokenIndex = 3;
    }

    function adapterApproveAll() external onlyRole(DEFAULT_ADMIN_ROLE) {
        IERC20(JEUR).safeApprove(CURVE_POOL, type(uint256).max);
        IERC20(PAR).safeApprove(CURVE_POOL, type(uint256).max);
        IERC20(EURS).safeApprove(CURVE_POOL, type(uint256).max);
        IERC20(EURT).safeApprove(CURVE_POOL, type(uint256).max);
        IERC20(CURVE_POOL).safeApprove(CURVE_POOL, type(uint256).max);
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
        address primaryToken = ICurvePoolEUR(CURVE_POOL).coins(
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
                uint256[4] memory amounts;
                amounts[primaryTokenIndex] =
                    _leaveInPool /
                    10 ** (18 - IERC20Metadata(primaryToken).decimals());
                ICurvePoolEUR(CURVE_POOL).add_liquidity(amounts, 0);
            }
        } else {
            uint256[4] memory amounts;
            amounts[indexes[_token]] =
                _fullAmount /
                10 ** (18 - IERC20Metadata(_token).decimals());

            uint256 lpAmount = ICurvePoolEUR(CURVE_POOL).add_liquidity(
                amounts,
                0
            );
            delete amounts;
            if (toSend != 0) {
                toSend =
                    toSend /
                    10 ** (18 - IERC20Metadata(primaryToken).decimals());
                amounts[primaryTokenIndex] = toSend;
                ICurvePoolEUR(CURVE_POOL).remove_liquidity_imbalance(
                    amounts,
                    (lpAmount * (10000 + slippage)) / 10000
                );
                IERC20(primaryToken).safeTransfer(buffer, toSend);
            }
        }
    }

    /// @notice When called by liquidity handler, withdraws funds from liquidity pool
    /// @dev It checks against arbitragers attempting to exploit spreads in stablecoins.
    /// @param _user Recipient address
    /// @param _token Deposit token address (eg. USDC)
    /// @param _amount  Amount to be withdrawn in 10*18
    function withdraw(
        address _user,
        address _token,
        uint256 _amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256[4] memory amounts;
        uint256 amount = _amount /
            10 ** (18 - IERC20Metadata(_token).decimals());
        amounts[indexes[_token]] = amount;
        ICurvePoolEUR(CURVE_POOL).remove_liquidity_imbalance(
            amounts,
            (_amount * (10000 + slippage)) / 10000
        );
        IERC20(_token).safeTransfer(_user, amount);
    }

    function getAdapterAmount() external view returns (uint256) {
        uint256 curveLpAmount = IERC20(CURVE_POOL).balanceOf((address(this)));
        if (curveLpAmount != 0) {
            address primaryToken = ICurvePoolEUR(CURVE_POOL).coins(
                primaryTokenIndex
            );
            uint256 amount = (
                ICurvePoolEUR(CURVE_POOL).calc_withdraw_one_coin(
                    curveLpAmount,
                    int128(uint128(primaryTokenIndex))
                )
            ) * 10 ** (18 - IERC20Metadata(primaryToken).decimals());

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
        return (ICurvePoolEUR(CURVE_POOL).coins(primaryTokenIndex));
    }

    function changePrimaryTokenIndex(
        uint64 _newPrimaryTokenIndex
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        primaryTokenIndex = _newPrimaryTokenIndex;
    }

    function setSlippage(
        uint64 _newSlippage
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        slippage = _newSlippage;
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
