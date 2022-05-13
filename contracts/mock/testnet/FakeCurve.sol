// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "./../../Farming/AlluoERC20Upgradable.sol";
import "hardhat/console.sol";

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

contract FakeCurve is
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

    IERC20Upgradeable public DAI;
    IERC20Upgradeable public USDC;
    IERC20Upgradeable public USDT;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize(
        address _dai,
        address _usdc,
        address _usdt
    ) public initializer {
        __ERC20_init("Fake Curve LP", "FCLP");
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);

        wallet = msg.sender;

        usdtFee = 40;
        usdcFee = 20;

        DAI = IERC20Upgradeable(_dai);
        USDC = IERC20Upgradeable(_usdc);
        USDT = IERC20Upgradeable(_usdt);
    }

    function add_liquidity(address _token, uint256 _amount) external {
        if (IERC20Upgradeable(_token) == USDT) {
            uint256 amountIn18 = _amount * 10**12;
            USDT.transferFrom(msg.sender, wallet, _amount);
            _mint(msg.sender, amountIn18);
        } else if (IERC20Upgradeable(_token) == DAI) {
            DAI.transferFrom(msg.sender, wallet, _amount);
            _mint(msg.sender, _amount);
        } else if (IERC20Upgradeable(_token) == USDC) {
            uint256 amountIn18 = _amount * 10**12;
            USDC.transferFrom(msg.sender, wallet, _amount);
            _mint(msg.sender, amountIn18);
        }
    }

    function remove_liquidity(address _token, uint256 _amount)
        external
        returns (uint256)
    {
        if (IERC20Upgradeable(_token) == USDT) {
            _burn(msg.sender, _amount);
            uint256 amountIn6 = _amount / 10**12;
            uint256 amountWithFee = (amountIn6 * (10000 - usdtFee)) / 10000;
            USDT.transferFrom(wallet, msg.sender, amountWithFee);
            return amountWithFee;
        } else if (IERC20Upgradeable(_token) == DAI) {
            _burn(msg.sender, _amount);
            DAI.transferFrom(wallet, msg.sender, _amount);
            return _amount;
        } else if (IERC20Upgradeable(_token) == USDC) {
            _burn(msg.sender, _amount);
            uint256 amountIn6 = _amount / 10**12;
            uint256 amountWithFee = (amountIn6 * (10000 - usdcFee)) / 10000;
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

    function setCoins(
        address newDai,
        address newUsdc,
        address newUsdt
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        DAI = IERC20Upgradeable(newDai);
        USDC = IERC20Upgradeable(newUsdc);
        USDC = IERC20Upgradeable(newUsdt);
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
