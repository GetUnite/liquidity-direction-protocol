// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

interface ITestToken {
    function mint(address _to, uint256 _amount) external;
}
contract USDAdapterMumbaiUnblock is
    Initializable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    using AddressUpgradeable for address;
    using SafeERC20Upgradeable for IERC20Upgradeable;

    address public constant DAI = 0x22a8D4294c64Fc02736D50D2094DbF49a92d3122;
    address public constant USDC = 0x7ffAE00B81355C763EF3F0ca042184762c48439F;
    address public constant USDT = 0x2F32C5bF7b2C260951647A2e3A8E6c3176Ca4Db2;
    address public wallet;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize(
        address _liquidityHandler
    ) public initializer {
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _liquidityHandler);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        wallet = msg.sender;
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
        if (toSend != 0) {
            IERC20Upgradeable(_token).safeTransfer(wallet, toSend);
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
        uint256 contractBalance = IERC20Upgradeable(_token).balanceOf(
            address(this)
        );
        if (_amount > contractBalance ) {
            ITestToken(_token).mint(address(this), _amount - contractBalance);

        }
        IERC20Upgradeable(_token).safeTransfer(_user, _amount);
    }

    function getAdapterAmount() external view returns (uint256) {
        uint256 usdtBalance = IERC20Upgradeable(USDT).balanceOf(address(this));
        uint256 usdcBalance = IERC20Upgradeable(USDC).balanceOf(address(this));
        uint256 daiBalance = IERC20Upgradeable(DAI).balanceOf(address(this));
        return   usdtBalance + usdcBalance + daiBalance;
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
