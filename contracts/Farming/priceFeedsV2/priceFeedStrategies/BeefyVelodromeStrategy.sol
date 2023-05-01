// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./../IFeedStrategy.sol";
import "./../../../interfaces/IChainlinkPriceFeed.sol";

import "@openzeppelin/contracts/interfaces/IERC20Metadata.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

interface IUniswapRouterSolidly {
    function quoteRemoveLiquidity(
        address tokenA,
        address tokenB,
        bool stable,
        uint256 liquidity
    ) external view returns (uint256 amountA, uint256 amountB);
}

interface IBeefyVault {
    function want() external view returns (address);

    function getPricePerFullShare() external view returns (uint256);
}

interface IUniswapV2Pair {
    function stable() external view returns (bool);

    function getAmountOut(
        uint256 amountIn,
        address tokenIn
    ) external view returns (uint256);

    function token0() external view returns (address);

    function token1() external view returns (address);
}

contract BeefyVelodromeStrategy is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    IFeedStrategy
{
    IUniswapRouterSolidly public constant ROUTER =
        IUniswapRouterSolidly(0xa132DAB612dB5cB9fC9Ac426A0Cc215A3423F9c9);

    IBeefyVault public mooToken;

    IUniswapV2Pair public lpToken;
    address public token0;
    address public token1;
    IFeedStrategy public referenceFeed;

    uint8 public decimals;

    bool public isStable;
    bool public isResultToken0;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize(
        address _multiSigWallet,
        address _token,
        bool _isResultToken0,
        address _referenceFeed
    ) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _multiSigWallet);

        mooToken = IBeefyVault(_token);
        address want = IBeefyVault(_token).want();

        token0 = IUniswapV2Pair(want).token0();
        token1 = IUniswapV2Pair(want).token1();

        isResultToken0 = _isResultToken0;
        lpToken = IUniswapV2Pair(want);
        referenceFeed = IFeedStrategy(_referenceFeed);

        isStable = IUniswapV2Pair(want).stable();

        decimals = isResultToken0
            ? IERC20Metadata(token0).decimals()
            : IERC20Metadata(token1).decimals();
    }

    function getPrice() external view returns (int256, uint8) {
        return getPriceOfAmount(1e18);
    }

    function getPriceOfAmount(
        uint256 amount
    ) public view returns (int256, uint8) {
        amount = (amount * mooToken.getPricePerFullShare()) / 1e18;

        (uint256 token0Received, uint256 token1Received) = ROUTER
            .quoteRemoveLiquidity(token0, token1, isStable, amount);

        uint256 totalOneSideWithdraw;
        if (isResultToken0) {
            // token1 => token0
            uint256 swapResultAmount = lpToken.getAmountOut(
                token1Received,
                token1
            );

            totalOneSideWithdraw = swapResultAmount + token0Received;
        } else {
            // token0 => token1
            uint256 swapResultAmount = lpToken.getAmountOut(
                token0Received,
                token0
            );

            totalOneSideWithdraw = swapResultAmount + token1Received;
        }

        (int256 usdPrice, uint8 usdDecimals) = referenceFeed.getPrice();

        require(usdPrice > 0, "BeefyPriceStrat: ref feed lte 0");

        return (
            int256(totalOneSideWithdraw) * usdPrice,
            usdDecimals + decimals
        );
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
