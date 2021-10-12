// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./IPool.sol";
import "./IToken.sol";
import "./IStaking.sol";

contract MVPStrategy is ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public constant DAI = 0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063;
    address public constant USDC = 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174;
    address public constant USDT = 0xc2132D05D31c914a87C6611C10748AEb04B58e8F;

    address public pool;
    address public lpToken;
    address public staking;

    address public daiA;
    address public usdcA;
    address public usdtA;
    address public lpA;

    constructor(
        address pool_,
        address lpToken_,
        address staking_,
        address daiA_,
        address usdcA_,
        address usdtA_,
        address lpA_
    ) {
        pool = pool_;
        lpToken = lpToken_;
        staking = staking_;
        daiA = daiA_;
        usdcA = usdcA_;
        usdtA = usdtA_;
        lpA = lpA_;
    }

    function receiveFunds(uint256 amount, address token) external nonReentrant {
        require(
            token == DAI || token == USDC || token == USDT,
            "MVPStrategy: invalid token"
        );

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        if (token == DAI) {
            IToken(daiA).mint(msg.sender, amount);
        } else if (token == USDC) {
            IToken(usdcA).mint(msg.sender, amount);
        } else {
            IToken(usdtA).mint(msg.sender, amount);
        }
    }

    function getLP(uint256[3] calldata amounts) external nonReentrant {
        IToken(daiA).burn(msg.sender, amounts[0]);
        IToken(usdcA).burn(msg.sender, amounts[1]);
        IToken(usdtA).burn(msg.sender, amounts[2]);

        IERC20(DAI).safeApprove(pool, amounts[0]);
        IERC20(USDC).safeApprove(pool, amounts[1]);
        IERC20(USDT).safeApprove(pool, amounts[2]);
        uint256 lpAmount = IPool(pool).add_liquidity(amounts, 0);

        IToken(lpA).mint(msg.sender, lpAmount);
    }

    function farmLP(uint256 amount) external nonReentrant {
        IToken(lpA).burn(msg.sender, amount);

        IERC20(lpToken).safeApprove(staking, amount);
        IStaking(staking).deposit(amount, msg.sender);
    }
}
