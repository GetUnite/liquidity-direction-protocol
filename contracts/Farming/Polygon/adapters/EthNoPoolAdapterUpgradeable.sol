// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Address.sol";

contract EthNoPoolAdapter is AccessControl {
    using Address for address;
    using SafeERC20 for IERC20;

    address public constant WETH = 0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619;
    address public wallet;

    constructor(address _multiSigWallet, address _liquidityHandler) {
        require(_multiSigWallet.isContract(), "Adapter: Not contract");
        require(_liquidityHandler.isContract(), "Adapter: Not contract");
        _grantRole(DEFAULT_ADMIN_ROLE, _multiSigWallet);
        _grantRole(DEFAULT_ADMIN_ROLE, _liquidityHandler);
        wallet = _multiSigWallet;
    }

    function deposit(
        address _token,
        uint256 _fullAmount,
        uint256 _leaveInPool
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 toSend = _fullAmount - _leaveInPool;
        if (toSend != 0) {
            IERC20(WETH).safeTransfer(wallet, toSend);
        }
    }

    function withdraw(
        address _user,
        address _token,
        uint256 _amount
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        IERC20(WETH).safeTransfer(_user, _amount);
    }

    function getAdapterAmount() external view returns (uint256) {
        return IERC20(WETH).balanceOf(address(this));
    }

    function getCoreTokens()
        external
        pure
        returns (address mathToken, address primaryToken)
    {
        return (WETH, WETH);
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
        IERC20(_address).safeTransfer(_to, _amount);
    }
}
