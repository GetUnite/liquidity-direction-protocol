// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import {IERC20Upgradeable as IERC20, IERC20MetadataUpgradeable as IERC20Metadata} from "@openzeppelin/contracts-upgradeable/interfaces/IERC20MetadataUpgradeable.sol";
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

import "../../../interfaces/IPriceFeedRouter.sol";

import "../curve/FakeCurveUsd.sol";
import "hardhat/console.sol";

contract UsdMumbaiCurrent is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    using AddressUpgradeable for address;
    using SafeERC20Upgradeable for IERC20;

    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // All address are Polygon addresses.
    address public constant DAI = 0x7E93BaA89c18a473e3de6fd7BD85715e1415Fc5C;
    address public constant USDC = 0xB579C5ba3Bc8EA2F5DD5622f1a5EaC6282516fB1;
    address public constant USDT = 0x9A4cBEe2f0FF57749caf66570692dAdB3462bAc9;
    address public constant CURVE_POOL =
        0x754E1c29e1C0109E7a5034Ca6F54aFbE52C3D1bA;
    address public buffer;
    bool public upgradeStatus;
    uint64 public slippage;
    address public priceFeedRouter;
    uint64 public primaryTokenIndex;
    uint256 public fiatIndex;

    mapping(address => uint128) public indexes;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize(
        address _multiSigWallet,
        address _buffer,
        address _liquidityHandler,
        uint64 _slippage
    ) public initializer {
        require(_multiSigWallet.isContract(), "Adapter: Not contract");
        require(_liquidityHandler.isContract(), "Adapter: Not contract");
        _grantRole(DEFAULT_ADMIN_ROLE, _multiSigWallet);
        _grantRole(DEFAULT_ADMIN_ROLE, _liquidityHandler);
        _grantRole(UPGRADER_ROLE, _multiSigWallet);
        _grantRole(DEFAULT_ADMIN_ROLE, _buffer);
        buffer = _buffer;
        slippage = _slippage;

        indexes[DAI] = 0;
        indexes[USDC] = 1;
        indexes[USDT] = 2;

        primaryTokenIndex = 1;
    }

    function adapterApproveAll() external onlyRole(DEFAULT_ADMIN_ROLE) {
        IERC20(DAI).safeApprove(CURVE_POOL, type(uint256).max);
        IERC20(USDC).safeApprove(CURVE_POOL, type(uint256).max);
        IERC20(USDT).safeApprove(CURVE_POOL, type(uint256).max);
    }

    /// @notice When called by liquidity handler, moves some funds to the Gnosis multisig and others into a LP to be kept as a 'buffer'
    /// @param _token Deposit token address (eg. USDC)
    /// @param _fullAmount Full amount deposited in 10**18 called by liquidity handler
    /// @param _leaveInPool  Amount to be left in the LP rather than be sent to the buffer (the "buffer" amount)
    function deposit(
        address _token,
        uint256 _fullAmount,
        uint256 _leaveInPool
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 toSend = _fullAmount - _leaveInPool;
        if (_token == DAI) {
            FakeCurveUsd(CURVE_POOL).add_liquidity(DAI, _fullAmount);
            if (toSend != 0) {
                uint amountBack = FakeCurveUsd(CURVE_POOL).remove_liquidity(
                    USDC,
                    toSend / 10 ** 12
                );
                IERC20Upgradeable(USDC).safeTransfer(buffer, amountBack);
            }
        } else if (_token == USDC) {
            if (toSend != 0) {
                IERC20Upgradeable(USDC).safeTransfer(buffer, toSend / 10 ** 12);
            }
            if (_leaveInPool != 0) {
                FakeCurveUsd(CURVE_POOL).add_liquidity(
                    USDC,
                    _leaveInPool / 10 ** 12
                );
            }
        } else if (_token == USDT) {
            FakeCurveUsd(CURVE_POOL).add_liquidity(
                USDT,
                _fullAmount / 10 ** 12
            );
            if (toSend != 0) {
                uint amountBack = FakeCurveUsd(CURVE_POOL).remove_liquidity(
                    USDC,
                    toSend / 10 ** 12
                );
                IERC20Upgradeable(USDC).safeTransfer(buffer, amountBack);
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
        if (_token == DAI) {
            uint amountBack = FakeCurveUsd(CURVE_POOL).remove_liquidity(
                DAI,
                _amount
            );
            IERC20Upgradeable(DAI).safeTransfer(_user, amountBack);
        } else if (_token == USDC) {
            uint amountBack = FakeCurveUsd(CURVE_POOL).remove_liquidity(
                USDC,
                _amount / 10 ** 12
            );
            IERC20Upgradeable(USDC).safeTransfer(_user, amountBack);
        } else if (_token == USDT) {
            uint amountBack = FakeCurveUsd(CURVE_POOL).remove_liquidity(
                USDT,
                _amount / 10 ** 12
            );
            IERC20Upgradeable(USDT).safeTransfer(_user, amountBack);
        }
    }

    function getAdapterAmount() external view returns (uint256) {
        uint256 amount = IERC20Upgradeable(CURVE_POOL).balanceOf(
            (address(this))
        );
        if (priceFeedRouter != address(0)) {
            (uint256 price, uint8 priceDecimals) = IPriceFeedRouter(
                priceFeedRouter
            ).getPrice(USDC, fiatIndex);
            amount = (amount * price) / 10 ** (uint256(priceDecimals));
        }

        return amount;
    }

    function getCoreTokens() external view returns (address primaryToken) {
        return USDC;
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
        address _newBuffer
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        buffer = _newBuffer;
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

    function changeUpgradeStatus(
        bool _status
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        upgradeStatus = _status;
    }

    function _authorizeUpgrade(
        address
    ) internal override onlyRole(UPGRADER_ROLE) {
        require(upgradeStatus, "Adapter: Upgrade not allowed");
        upgradeStatus = false;
    }
}
