// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./IPool.sol";

contract Exchange is ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public constant DAI = 0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063;
    address public constant USDC = 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174;
    address public constant USDT = 0xc2132D05D31c914a87C6611C10748AEb04B58e8F;

    address public exchangeAddress;

    constructor(address exchange_) {
        exchangeAddress = exchange_;
    }

    function exchange(uint256 daiAmount) external nonReentrant {
        uint256 tokenAmount = daiAmount / 3;

        // will take only 2/3 of total DAI amount, rest 1/3 will be untouched
        IERC20(DAI).safeTransferFrom(
            msg.sender,
            address(this),
            tokenAmount * 2
        );
        IERC20(DAI).safeApprove(exchangeAddress, tokenAmount * 2);

        uint256 usdcSwapped = IPool(exchangeAddress).exchange_underlying(
            0,
            1,
            tokenAmount,
            0
        );
        uint256 usdtSwapped = IPool(exchangeAddress).exchange_underlying(
            0,
            2,
            tokenAmount,
            0
        );

        IERC20(USDC).safeTransfer(msg.sender, usdcSwapped);
        IERC20(USDT).safeTransfer(msg.sender, usdtSwapped);
    }
}
