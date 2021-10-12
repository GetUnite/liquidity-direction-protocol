// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./IPool.sol";
import "./IStaking.sol";

contract Test is ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public dai;
    IERC20 public usdc;
    IERC20 public usdt;
    IERC20 public lp;
    IPool public pool;
    IStaking public staking;

    constructor() {
        dai = IERC20(0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063);
        usdc = IERC20(0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174);
        usdt = IERC20(0xc2132D05D31c914a87C6611C10748AEb04B58e8F);
        lp = IERC20(0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171);
        pool = IPool(0x445FE580eF8d70FF569aB36e80c647af338db351);
        staking = IStaking(0x19793B454D3AfC7b454F206Ffe95aDE26cA6912c);
    }

    function execute(uint256[3] calldata amounts) external nonReentrant {
        dai.safeTransferFrom(msg.sender, address(this), amounts[0]);
        usdc.safeTransferFrom(msg.sender, address(this), amounts[1]);
        usdt.safeTransferFrom(msg.sender, address(this), amounts[2]);

        dai.safeApprove(address(pool), amounts[0]);
        usdc.safeApprove(address(pool), amounts[1]);
        usdt.safeApprove(address(pool), amounts[2]);

        uint256 lpAmount = pool.add_liquidity(amounts, 0);

        lp.safeApprove(address(staking), lpAmount);

        staking.deposit(lpAmount, msg.sender);
    }
}
