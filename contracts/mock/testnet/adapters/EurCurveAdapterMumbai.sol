// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/structs/EnumerableSetUpgradeable.sol";

import "../curve/FakeCurveEur.sol";

contract EurCurveAdapterMumbai is 
    Initializable,
    PausableUpgradeable,
    AccessControlUpgradeable,
    UUPSUpgradeable
{
    bytes32 public constant UPGRADER_ROLE = keccak256("UPGRADER_ROLE");

    using AddressUpgradeable for address;
    using SafeERC20Upgradeable for IERC20Upgradeable;

    address public constant jEUR = 0x4bf7737515EE8862306Ddc221cE34cA9d5C91200;
    address public constant EURS = 0x3Aa4345De8B32e5c9c14FC7146597EAf262Fd70E;
    address public constant EURT = 0x34A13C2D581efe6239b92F9a65c8BAa65dfdeBE9;
    address public curvePool;
    address public wallet;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize(address _liquidityHandler, address _curvePool) public initializer {
        __Pausable_init();
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _liquidityHandler);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        wallet = msg.sender;
        curvePool = _curvePool;
    }

    function adapterApproveAll() external onlyRole(DEFAULT_ADMIN_ROLE){
        IERC20Upgradeable(jEUR).safeApprove(curvePool, type(uint256).max);
        IERC20Upgradeable(EURS).safeApprove(curvePool, type(uint256).max);
        IERC20Upgradeable(EURT).safeApprove(curvePool, type(uint256).max);
    }

    /// @notice When called by liquidity buffer, moves some funds to the Gnosis multisig and others into a LP to be kept as a 'buffer'
    /// @param _token Deposit token address (eg. USDC)
    /// @param _fullAmount Full amount deposited in 10**18 called by liquidity buffer
    /// @param _leaveInPool  Amount to be left in the LP rather than be sent to the Gnosis wallet (the "buffer" amount)
    function deposit(address _token, uint256 _fullAmount, uint256 _leaveInPool) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 toSend = _fullAmount - _leaveInPool;
        if (_token == jEUR) {
            FakeCurveEur(curvePool).add_liquidity(jEUR, _fullAmount);
            if (toSend != 0) {
                uint amountBack = FakeCurveEur(curvePool).remove_liquidity(
                            EURT, 
                            toSend / 10**12);
                IERC20Upgradeable(EURT).safeTransfer(wallet, amountBack);
            }
        }

        else if (_token == EURT) {
            if (toSend != 0) {
                IERC20Upgradeable(EURT).safeTransfer(wallet, toSend / 10**12);
            }
            if (_leaveInPool != 0) {
                FakeCurveEur(curvePool).add_liquidity(EURT, _leaveInPool / 10**12);
            }
        }

        else if (_token == EURS) {
            FakeCurveEur(curvePool).add_liquidity(EURS, _fullAmount / 10**16);
            if (toSend != 0) {
                uint amountBack = FakeCurveEur(curvePool).remove_liquidity(
                            EURT, 
                            toSend / 10**12);
                IERC20Upgradeable(EURT).safeTransfer(wallet, amountBack);
            }
        }
    } 
    
    /// @notice When called by liquidity buffer, withdraws funds from liquidity pool
    /// @dev It checks against arbitragers attempting to exploit spreads in stablecoins. EURS is chosen as it has the most liquidity.
    /// @param _user Recipient address
    /// @param _token Deposit token address (eg. USDC)
    /// @param _amount  Amount to be withdrawn in 10*18
    function withdraw (address _user, address _token, uint256 _amount ) external onlyRole(DEFAULT_ADMIN_ROLE) {
          if (_token == jEUR) {
            uint amountBack = FakeCurveEur(curvePool).remove_liquidity(
                        jEUR, 
                        _amount);
            IERC20Upgradeable(jEUR).safeTransfer(_user, amountBack);
        }

        else if (_token == EURT) {
            uint amountBack = FakeCurveEur(curvePool).remove_liquidity(
                        EURT, 
                        _amount / 10**12);
            IERC20Upgradeable(EURT).safeTransfer(_user, amountBack);
        }

        else if (_token == EURS) {
            uint amountBack = FakeCurveEur(curvePool).remove_liquidity(
                        EURS, 
                        _amount / 10**16);
            IERC20Upgradeable(EURS).safeTransfer(_user, amountBack);
        }
    }
    
    function getAdapterAmount () external view returns (uint256) {
        uint256 curveLpAmount = IERC20Upgradeable(curvePool).balanceOf((address(this)));
        return curveLpAmount;
    }
    
    function setWallet(address _newWallet) external onlyRole(DEFAULT_ADMIN_ROLE) {
        wallet = _newWallet;
    }

    /**
     * @dev admin function for removing funds from contract
     * @param _address address of the token being removed
     * @param _amount amount of the token being removed
     */
    function removeTokenByAddress(address _address, address _to, uint256 _amount)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        IERC20Upgradeable(_address).safeTransfer(_to, _amount);
    }

    function _authorizeUpgrade(address newImplementation)
        internal
        override
        onlyRole(UPGRADER_ROLE)
    {}
}