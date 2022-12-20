// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

import "../curve/FakeCurveUsd.sol";

contract UsdCurveAdapterMumbai is
    Initializable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    using AddressUpgradeable for address;
    using SafeERC20Upgradeable for IERC20Upgradeable;

    address public constant DAI = 0x7E93BaA89c18a473e3de6fd7BD85715e1415Fc5C;
    address public constant USDC = 0xB579C5ba3Bc8EA2F5DD5622f1a5EaC6282516fB1;
    address public constant USDT = 0x9A4cBEe2f0FF57749caf66570692dAdB3462bAc9;
    address public curvePool;
    address public wallet;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize(
        address _liquidityHandler,
        address _curvePool
    ) public initializer {
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _liquidityHandler);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        wallet = msg.sender;
        curvePool = _curvePool;
    }

    function adapterApproveAll() external onlyRole(DEFAULT_ADMIN_ROLE) {
        IERC20Upgradeable(DAI).safeApprove(curvePool, type(uint256).max);
        IERC20Upgradeable(USDC).safeApprove(curvePool, type(uint256).max);
        IERC20Upgradeable(USDT).safeApprove(curvePool, type(uint256).max);
    }

    /// @notice When called by liquidity buffer, moves some funds to the Gnosis multisig and others into a LP to be kept as a 'buffer'
    /// @param _token Deposit token address (eg. USDC)
    /// @param _fullAmount Full amount deposited in 10**18 called by liquidity buffer
    /// @param _leaveInPool  Amount to be left in the LP rather than be sent to the Gnosis wallet (the "buffer" amount)
    function deposit(
        address _token,
        uint256 _fullAmount,
        uint256 _leaveInPool
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 toSend = _fullAmount - _leaveInPool;
        if (_token == DAI) {
            FakeCurveUsd(curvePool).add_liquidity(DAI, _fullAmount);
            if (toSend != 0) {
                uint amountBack = FakeCurveUsd(curvePool).remove_liquidity(
                    USDC,
                    toSend / 10 ** 12
                );
                IERC20Upgradeable(USDC).safeTransfer(wallet, amountBack);
            }
        } else if (_token == USDC) {
            if (toSend != 0) {
                IERC20Upgradeable(USDC).safeTransfer(wallet, toSend / 10 ** 12);
            }
            if (_leaveInPool != 0) {
                FakeCurveUsd(curvePool).add_liquidity(
                    USDC,
                    _leaveInPool / 10 ** 12
                );
            }
        } else if (_token == USDT) {
            FakeCurveUsd(curvePool).add_liquidity(USDT, _fullAmount / 10 ** 12);
            if (toSend != 0) {
                uint amountBack = FakeCurveUsd(curvePool).remove_liquidity(
                    USDC,
                    toSend / 10 ** 12
                );
                IERC20Upgradeable(USDC).safeTransfer(wallet, amountBack);
            }
        }
    }

    /// @notice When called by liquidity buffer, withdraws funds from liquidity pool
    /// @dev It checks against arbitragers attempting to exploit spreads in stablecoins. EURS is chosen as it has the most liquidity.
    /// @param _user Recipient address
    /// @param _token Deposit token address (eg. USDC)
    /// @param _amount  Amount to be withdrawn in 10*18
    function withdraw(
        address _user,
        address _token,
        uint256 _amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_token == DAI) {
            uint amountBack = FakeCurveUsd(curvePool).remove_liquidity(
                DAI,
                _amount
            );
            IERC20Upgradeable(DAI).safeTransfer(_user, amountBack);
        } else if (_token == USDC) {
            uint amountBack = FakeCurveUsd(curvePool).remove_liquidity(
                USDC,
                _amount / 10 ** 12
            );
            IERC20Upgradeable(USDC).safeTransfer(_user, amountBack);
        } else if (_token == USDT) {
            uint amountBack = FakeCurveUsd(curvePool).remove_liquidity(
                USDT,
                _amount / 10 ** 12
            );
            IERC20Upgradeable(USDT).safeTransfer(_user, amountBack);
        }
    }

    function getAdapterAmount() external view returns (uint256) {
        uint256 curveLpAmount = IERC20Upgradeable(curvePool).balanceOf(
            (address(this))
        );
        return curveLpAmount;
    }

    function setWallet(
        address _newWallet
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        wallet = _newWallet;
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
        IERC20Upgradeable(_address).safeTransfer(_to, _amount);
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(UPGRADER_ROLE) {}
}
