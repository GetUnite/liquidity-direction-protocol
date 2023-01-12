// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import {SafeERC20Upgradeable, IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";

contract EthNoPoolAdapterUpgradeable is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    using AddressUpgradeable for address;
    using SafeERC20Upgradeable for IERC20;

    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    address public constant WETH = 0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619;
    address public buffer;
    bool public upgradeStatus;

    function initialize(
        address _multiSigWallet,
        address _buffer,
        address _liquidityHandler
    ) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        require(_multiSigWallet.isContract(), "Adapter: Not contract");
        require(_liquidityHandler.isContract(), "Adapter: Not contract");
        _grantRole(DEFAULT_ADMIN_ROLE, _multiSigWallet);
        _grantRole(DEFAULT_ADMIN_ROLE, _liquidityHandler);
        _grantRole(UPGRADER_ROLE, _multiSigWallet);
        _grantRole(DEFAULT_ADMIN_ROLE, _buffer);
        buffer = _buffer;
    }

    function deposit(
        address,
        uint256 _fullAmount,
        uint256 _leaveInPool
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 toSend = _fullAmount - _leaveInPool;
        if (toSend != 0) {
            IERC20(WETH).safeTransfer(buffer, toSend);
        }
    }

    function withdraw(
        address _user,
        address,
        uint256 _amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        IERC20(WETH).safeTransfer(_user, _amount);
    }

    function getAdapterAmount() external view returns (uint256) {
        return IERC20(WETH).balanceOf(address(this));
    }

    function getCoreTokens() external pure returns (address mathToken) {
        return (WETH);
    }

    function setBuffer(
        address _newBuffer
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        buffer = _newBuffer;
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
