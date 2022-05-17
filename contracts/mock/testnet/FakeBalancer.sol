// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "../../Farming/AlluoERC20Upgradable.sol";
import "hardhat/console.sol";

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

contract FakeBalancer is 
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

    uint256 public alluoPerLp;

    IERC20Upgradeable public ALLUO;
    IERC20Upgradeable public WETH;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize(
        address _alluo,
        address _weth
    ) public initializer {
        __ERC20_init("Fake Alluo Balancer LP", "FABLP");
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(UPGRADER_ROLE, msg.sender);

        ALLUO = IERC20Upgradeable(_alluo);
        WETH = IERC20Upgradeable(_weth);
        alluoPerLp = 562;
    }

    function enterPoolAlluo(uint256 amount) public returns(uint256){
        ALLUO.safeTransferFrom(msg.sender, address(this), amount);
        uint256 amountLp = amount * 100 / alluoPerLp;
        _mint(msg.sender, amountLp);
        return amountLp;
    }

    function enterPoolWeth(uint256 amount) public returns(uint256){
        WETH.safeTransferFrom(msg.sender, address(this), amount);
        uint256 amountLp = amount * 1000000 / alluoPerLp;
        _mint(msg.sender, amountLp);
        return amountLp;
    }


    function exitPoolAlluo(uint256 amount) public returns(uint256){
        _burn(msg.sender, amount);
        uint256 alluoAmount =  amount * alluoPerLp / 100;
        ALLUO.safeTransfer(msg.sender, alluoAmount);
        return alluoAmount;
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
        onlyRole(UPGRADER_ROLE)
        override
    {
    }
}
