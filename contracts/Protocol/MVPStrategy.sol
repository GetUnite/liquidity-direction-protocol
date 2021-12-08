// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Create2.sol";
import "./IPool.sol";
import "./IToken.sol";
import "./IStaking.sol";
import "./Harvest.sol";

contract MVPStrategy is ReentrancyGuard, Ownable {
    using SafeERC20 for IERC20;

    address public constant DAI = 0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063;
    address public constant USDC = 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174;
    address public constant USDT = 0xc2132D05D31c914a87C6611C10748AEb04B58e8F;

    uint256 public poolId;

    address public pool;
    address public lpToken;
    address public staking;

    address public daiA;
    address public usdcA;
    address public usdtA;
    address public lpA;

    mapping(address => address) public harvestContracts;

    constructor(
        uint256 poolId_,
        address pool_,
        address lpToken_,
        address staking_,
        address daiA_,
        address usdcA_,
        address usdtA_,
        address lpA_
    ) {
        poolId = poolId_;
        pool = pool_;
        lpToken = lpToken_;
        staking = staking_;
        daiA = daiA_;
        usdcA = usdcA_;
        usdtA = usdtA_;
        lpA = lpA_;
    }

    function receiveFunds(uint256[3] calldata amounts) external nonReentrant {
        IERC20(DAI).safeTransferFrom(msg.sender, address(this), amounts[0]);
        IERC20(USDC).safeTransferFrom(msg.sender, address(this), amounts[1]);
        IERC20(USDT).safeTransferFrom(msg.sender, address(this), amounts[2]);

        IToken(daiA).mint(msg.sender, amounts[0]);
        IToken(usdcA).mint(msg.sender, amounts[1]);
        IToken(usdtA).mint(msg.sender, amounts[2]);
    }

    function getLP(uint256[3] calldata amounts) external nonReentrant {
        IToken(daiA).burn(msg.sender, amounts[0]);
        IToken(usdcA).burn(msg.sender, amounts[1]);
        IToken(usdtA).burn(msg.sender, amounts[2]);

        IERC20(DAI).safeApprove(pool, amounts[0]);
        IERC20(USDC).safeApprove(pool, amounts[1]);
        IERC20(USDT).safeApprove(pool, amounts[2]);
        uint256 lpAmount = IPool(pool).add_liquidity(amounts, 0, true);

        IToken(lpA).mint(msg.sender, lpAmount);
    }

    function farmLP(uint256 amount) external nonReentrant {
        IToken(lpA).burn(msg.sender, amount);

        address harvestContract = harvestContracts[msg.sender];

        // create staker contract for user, only once per address
        if (harvestContract == address(0)) {
            bytes32 salt = keccak256(abi.encodePacked(msg.sender));
            address newHarvest = Create2.deploy(
                0,
                salt,
                type(Harvest).creationCode
            );
            harvestContracts[msg.sender] = newHarvest;
            harvestContract = newHarvest;
        }

        // transfer tokens to user personal staker contract
        IERC20(lpToken).safeTransfer(harvestContract, amount);

        // safe approve tokens of personal staker contract to staking
        Harvest(harvestContract).approve(staking, lpToken, amount);

        // deposit tokens from user personal staker contract
        Harvest(harvestContract).deposit(amount, poolId, staking);
    }

    function withdrawMaxStables() external {
        address harvestContract = harvestContracts[msg.sender];
        require(
            harvestContract != address(0),
            "MVPStrategy: you have no stake"
        );

        // get back lp tokens
        uint256 amount = IStaking(staking).stakedWantTokens(
            poolId,
            harvestContract
        ); // get ALL amount of staked LP tokens to withdraw them all
        Harvest(harvestContract).withdraw(amount, poolId, staking);
        Harvest(harvestContract).transfer(lpToken, address(this), amount);

        // remove stables from pool
        uint256[3] memory amounts = IPool(pool).remove_liquidity(
            amount,
            [uint256(0), 0, 0],
            true
        );

        // give back all stables
        IERC20(DAI).safeTransfer(msg.sender, amounts[0]);
        IERC20(USDC).safeTransfer(msg.sender, amounts[1]);
        IERC20(USDT).safeTransfer(msg.sender, amounts[2]);
    }

    function withdrawAnyToken(address token, uint256 amount)
        external
        onlyOwner
    {
        IERC20(token).transfer(msg.sender, amount);
    }
}
