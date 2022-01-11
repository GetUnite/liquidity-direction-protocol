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

    IERC20 public constant DAI =
        IERC20(0x6B175474E89094C44Da98b954EedeAC495271d0F);

    event Deposited(address indexed user, uint256 amount);
    event BulkSent(address[] users, uint256[] amounts);

    constructor(address _gnosisWallet) {
        require(_gnosisWallet.isContract(), "TxHandler: EOA not allowed");

        _transferOwnership(_gnosisWallet);
    }

    function deposit(uint256 amount) external nonReentrant {
        DAI.safeTransferFrom(msg.sender, owner(), amount);

        emit Deposited(msg.sender, amount);
    }

    function bulkSend(address[] calldata users, uint256[] calldata amounts)
        external
        onlyOwner
    {
        for (uint256 index = 0; index < users.length; index++) {
            DAI.safeTransferFrom(owner(), users[index], amounts[index]);
        }

        emit BulkSent(users, amounts);
    }

    function transferOwnership(address newOwner) public override onlyOwner {
        require(newOwner != address(0), "Ownable: no zero address");
        require(newOwner.isContract(), "TxHandler: EOA not allowed");
        _transferOwnership(newOwner);
    }
}
