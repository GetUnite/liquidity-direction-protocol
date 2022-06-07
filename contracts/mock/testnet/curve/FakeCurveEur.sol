// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "../../../Farming/AlluoERC20Upgradable.sol";
import "hardhat/console.sol";

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

contract FakeCurveEur is
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

    uint256 public jeurFee;
    uint256 public eurtFee;

    IERC20Upgradeable public constant EURS = IERC20Upgradeable(0x3Aa4345De8B32e5c9c14FC7146597EAf262Fd70E);
    IERC20Upgradeable public constant JEUR = IERC20Upgradeable(0x4bf7737515EE8862306Ddc221cE34cA9d5C91200);
    IERC20Upgradeable public constant EURT = IERC20Upgradeable(0x34A13C2D581efe6239b92F9a65c8BAa65dfdeBE9);
    //IERC20Upgradeable public constant  = ;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize() public initializer {
        __ERC20_init("Fake EUR Curve LP", "FECLP");
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);

        wallet = msg.sender;
        jeurFee = 60;
        eurtFee = 40;
    }

    function add_liquidity(address _token, uint256 _amount) external {
        if (IERC20Upgradeable(_token) == EURS) {
            EURS.transferFrom(msg.sender, wallet, _amount);
            _mint(msg.sender, _amount * 10 ** 16);
        } else if (IERC20Upgradeable(_token) == JEUR) {
            JEUR.transferFrom(msg.sender, wallet, _amount);
            _mint(msg.sender, _amount);
        } else if (IERC20Upgradeable(_token) == EURT) {
            EURT.transferFrom(msg.sender, wallet, _amount);
            _mint(msg.sender, _amount * 10 **12);
        }
    }

    function remove_liquidity(address _token, uint256 _amount)
        external
        returns (uint256)
    {
        if (IERC20Upgradeable(_token) == EURT) {
            _burn(msg.sender, _amount * 10 ** 12);
            uint256 amountWithFee = (_amount * (10000 - eurtFee)) / 10000;
            EURT.transferFrom(wallet, msg.sender, amountWithFee);
            return amountWithFee;
        } else if (IERC20Upgradeable(_token) == EURS) {
            _burn(msg.sender, _amount * 10**16);
            EURS.transferFrom(wallet, msg.sender, _amount);
            return _amount;
        } else if (IERC20Upgradeable(_token) == JEUR) {
            _burn(msg.sender, _amount);
            uint256 amountWithFee = (_amount * (10000 - jeurFee)) / 10000;
            JEUR.transferFrom(wallet, msg.sender, amountWithFee);
            return amountWithFee;
        }
    }

    function setWallet(address newWallet)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        wallet = newWallet;
    }

    function changeFee(uint256 jeur, uint256 eurt)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        jeurFee = jeur;
        eurtFee = eurt;
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
