// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import {SafeERC20Upgradeable, IERC20Upgradeable as IERC20} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";
import "../../../interfaces/IPriceFeedRouterV2.sol";

contract EurNoPoolAdapterUpgradeable is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    using AddressUpgradeable for address;
    using SafeERC20Upgradeable for IERC20;

    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    address public constant AGEUR = 0xE0B52e49357Fd4DAf2c15e02058DCE6BC0057db4;
    address public buffer;
    address public priceFeedRouter;
    uint256 public fiatIndex;

    bool public upgradeStatus;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

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
            IERC20(AGEUR).safeTransfer(buffer, toSend);
        }
    }

    function withdraw(
        address _user,
        address,
        uint256 _amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        IERC20(AGEUR).safeTransfer(_user, _amount);
    }

    function getAdapterAmount() external view returns (uint256) {
        uint256 balance = IERC20(AGEUR).balanceOf(address(this));
        if (priceFeedRouter == address(0)) {
            return balance;
        } else {
            (uint256 value, uint8 decimals) = IPriceFeedRouterV2(
                priceFeedRouter
            ).getPriceOfAmount(AGEUR, balance, fiatIndex);

            return
                IPriceFeedRouterV2(priceFeedRouter).decimalsConverter(
                    value,
                    decimals,
                    18
                );
        }
    }

    function getCoreTokens() external pure returns (address primaryToken) {
        return (AGEUR);
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
