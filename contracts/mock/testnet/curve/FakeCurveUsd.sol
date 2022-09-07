// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "../../../Farming/Polygon/AlluoERC20Upgradable.sol";
import "hardhat/console.sol";

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

contract FakeCurveUsd is
    Initializable,
    PausableUpgradeable,
    AlluoERC20Upgradable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    using AddressUpgradeable for address;
    using SafeERC20Upgradeable for IERC20Upgradeable;
    using EnumerableSetUpgradeable for EnumerableSetUpgradeable.AddressSet;


    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    // admin and reserves address
    address public wallet;

    uint256 public usdtFee;
    uint256 public usdcFee;

    IERC20Upgradeable public constant DAI = IERC20Upgradeable(0x7E93BaA89c18a473e3de6fd7BD85715e1415Fc5C);
    IERC20Upgradeable public constant USDC = IERC20Upgradeable(0xB579C5ba3Bc8EA2F5DD5622f1a5EaC6282516fB1);
    IERC20Upgradeable public constant USDT = IERC20Upgradeable(0x9A4cBEe2f0FF57749caf66570692dAdB3462bAc9);

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() public initializer {
        __ERC20_init("Fake USD Curve LP", "FUCLP");
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);

        wallet = msg.sender;

        usdtFee = 40;
        usdcFee = 20;
    }

    function add_liquidity(address _token, uint256 _amount) external {
        if (IERC20Upgradeable(_token) == USDT) {
            USDT.transferFrom(msg.sender, wallet, _amount);
            _mint(msg.sender, _amount * 10 **12);
        } else if (IERC20Upgradeable(_token) == DAI) {
            DAI.transferFrom(msg.sender, wallet, _amount);
            _mint(msg.sender, _amount);
        } else if (IERC20Upgradeable(_token) == USDC) {
            USDC.transferFrom(msg.sender, wallet, _amount);
            _mint(msg.sender, _amount * 10 **12);
        }
    }

    function remove_liquidity(address _token, uint256 _amount)
        external
        returns (uint256)
    {
        if (IERC20Upgradeable(_token) == USDT) {
            _burn(msg.sender, _amount * 10 **12);
            uint256 amountWithFee = (_amount * (10000 - usdtFee)) / 10000;
            USDT.transferFrom(wallet, msg.sender, amountWithFee);
            return amountWithFee;
        } else if (IERC20Upgradeable(_token) == DAI) {
            _burn(msg.sender, _amount);
            DAI.transferFrom(wallet, msg.sender, _amount);
            return _amount;
        } else if (IERC20Upgradeable(_token) == USDC) {
            _burn(msg.sender, _amount * 10 **12);
            uint256 amountWithFee = (_amount * (10000 - usdcFee)) / 10000;
            USDC.transferFrom(wallet, msg.sender, amountWithFee);
            return amountWithFee;
        }
    }

    function setWallet(address newWallet)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        wallet = newWallet;
    }

    function changeFee(uint256 usdt, uint256 usdc)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        usdtFee = usdt;
        usdcFee = usdc;
    }

    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    function grantRole(bytes32 role, address account)
        public
        override
        onlyRole(getRoleAdmin(role))
    {
        _grantRole(role, account);
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(UPGRADER_ROLE)
    {}
}
