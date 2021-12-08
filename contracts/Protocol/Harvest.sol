// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./IStaking.sol";
import "./IHarvest.sol";

contract Harvest is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    function deposit(
        uint256 amount,
        uint256 poolId,
        address staking
    ) external onlyOwner nonReentrant {
        IStaking(staking).deposit(poolId, amount);
    }

    function approve(
        address staking,
        address token,
        uint256 amount
    ) external nonReentrant {
        IERC20(token).safeApprove(staking, amount);
    }

    function transfer(
        address token,
        address to,
        uint256 amount
    ) external onlyOwner nonReentrant {
        IERC20(token).safeTransfer(to, amount);
    }

    function withdraw(
        uint256 amount,
        uint256 poolId,
        address staking
    ) external onlyOwner nonReentrant {
        IStaking(staking).withdraw(poolId, amount);
    }

    function harvest(address _mergedStrategy, address harvesting)
        external
        onlyOwner
    {
        IHarvest(harvesting).harvest(_mergedStrategy);
    }
}
