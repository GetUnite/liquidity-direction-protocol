// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

import {IERC20Upgradeable as IERC20, IERC20MetadataUpgradeable as IERC20Metadata} from "@openzeppelin/contracts-upgradeable/interfaces/IERC20MetadataUpgradeable.sol";
import {SafeERC20Upgradeable} from "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/AddressUpgradeable.sol";

import "../curve/FakeCurveEur.sol";
import "../../../interfaces/IPriceFeedRouter.sol";

contract EurCurveAdapterUpgradeableMumbai is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    using AddressUpgradeable for address;
    using SafeERC20Upgradeable for IERC20;

    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    address public constant JEUR = 0x4bf7737515EE8862306Ddc221cE34cA9d5C91200;
    address public constant EURS = 0x3Aa4345De8B32e5c9c14FC7146597EAf262Fd70E;
    address public constant EURT = 0x34A13C2D581efe6239b92F9a65c8BAa65dfdeBE9;
    address public CURVE_POOL = 0xB8057748b9A5faCD3F09fBF96Afc50cbb200746a;
    address public buffer;
    bool public upgradeStatus;
    uint64 public slippage;
    address public priceFeedRouter;
    uint64 public primaryTokenIndex;
    uint256 public fiatIndex;

    mapping(address => uint128) public indexes;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    // 0 = jEUR-18dec, 1 = EURS-2dec, 2 = EURT-6dec
    function initialize(
        address _multiSigWallet,
        address _buffer,
        address _liquidityHandler,
        uint64 _slippage
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
        slippage = _slippage;

        indexes[JEUR] = 0;
        indexes[EURS] = 1;
        indexes[EURT] = 2;

        primaryTokenIndex = 2;
    }

    function adapterApproveAll() external onlyRole(DEFAULT_ADMIN_ROLE) {
        IERC20(JEUR).safeApprove(CURVE_POOL, type(uint256).max);
        IERC20(EURS).safeApprove(CURVE_POOL, type(uint256).max);
        IERC20(EURT).safeApprove(CURVE_POOL, type(uint256).max);
        IERC20(CURVE_POOL).safeApprove(CURVE_POOL, type(uint256).max);
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
        if (_token == JEUR) {
            FakeCurveEur(CURVE_POOL).add_liquidity(JEUR, _fullAmount);
            if (toSend != 0) {
                uint amountBack = FakeCurveEur(CURVE_POOL).remove_liquidity(
                    EURT,
                    toSend / 10 ** 12
                );
                IERC20Upgradeable(EURT).safeTransfer(buffer, amountBack);
            }
        } else if (_token == EURT) {
            if (toSend != 0) {
                IERC20Upgradeable(EURT).safeTransfer(buffer, toSend / 10 ** 12);
            }
            if (_leaveInPool != 0) {
                FakeCurveEur(CURVE_POOL).add_liquidity(
                    EURT,
                    _leaveInPool / 10 ** 12
                );
            }
        } else if (_token == EURS) {
            FakeCurveEur(CURVE_POOL).add_liquidity(
                EURS,
                _fullAmount / 10 ** 16
            );
            if (toSend != 0) {
                uint amountBack = FakeCurveEur(CURVE_POOL).remove_liquidity(
                    EURT,
                    toSend / 10 ** 12
                );
                IERC20Upgradeable(EURT).safeTransfer(buffer, amountBack);
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
        if (_token == JEUR) {
            uint amountBack = FakeCurveEur(CURVE_POOL).remove_liquidity(
                JEUR,
                _amount
            );
            IERC20Upgradeable(JEUR).safeTransfer(_user, amountBack);
        } else if (_token == EURT) {
            uint amountBack = FakeCurveEur(CURVE_POOL).remove_liquidity(
                EURT,
                _amount / 10 ** 12
            );
            IERC20Upgradeable(EURT).safeTransfer(_user, amountBack);
        } else if (_token == EURS) {
            uint amountBack = FakeCurveEur(CURVE_POOL).remove_liquidity(
                EURS,
                _amount / 10 ** 16
            );
            IERC20Upgradeable(EURS).safeTransfer(_user, amountBack);
        }
    }

    function getAdapterAmount() external view returns (uint256) {
        uint256 amount = IERC20Upgradeable(CURVE_POOL).balanceOf(
            (address(this))
        );
        if (priceFeedRouter != address(0)) {
            (uint256 price, uint8 priceDecimals) = IPriceFeedRouter(
                priceFeedRouter
            ).getPrice(EURS, fiatIndex);
            amount = (amount * price) / 10 ** (uint256(priceDecimals));
        }

        return amount;
    }

    function getCoreTokens() external view returns (address primaryToken) {
        return EURT;
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
