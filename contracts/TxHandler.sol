// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";

// using Ethereum Mainnet
contract TxHandler is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;
    using Address for address;

    IERC20 public immutable dai;

    event Deposited(address indexed user, uint256 amount);
    event BulkSent(address[] users, uint256[] amounts);

    constructor(address _gnosisWallet, address tokenAddress) {
        require(_gnosisWallet.isContract(), "TxHandler: EOA not allowed");

        _transferOwnership(_gnosisWallet);

        dai = IERC20(tokenAddress);
    }

    function deposit(uint256 amount) external nonReentrant {
        dai.safeTransferFrom(msg.sender, owner(), amount);

        emit Deposited(msg.sender, amount);
    }

    function bulkSend(address[] calldata users, uint256[] calldata amounts)
        external
        onlyOwner
    {
        for (uint256 index = 0; index < users.length; index++) {
            dai.safeTransferFrom(owner(), users[index], amounts[index]);
        }

        emit BulkSent(users, amounts);
    }

    function transferOwnership(address newOwner) public override onlyOwner {
        require(newOwner != address(0), "Ownable: no zero address");
        require(newOwner.isContract(), "TxHandler: EOA not allowed");
        _transferOwnership(newOwner);
    }
}
