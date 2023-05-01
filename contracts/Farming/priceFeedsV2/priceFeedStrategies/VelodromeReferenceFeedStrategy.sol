// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "./../IFeedStrategy.sol";

interface IUniswapV2Pair {
    function stable() external view returns (bool);

    function getAmountOut(
        uint256 amountIn,
        address tokenIn
    ) external view returns (uint256);

    function token0() external view returns (address);

    function token1() external view returns (address);
}

import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts/interfaces/IERC20Metadata.sol";

contract VelodromeReferenceFeedStrategy is
    Initializable,
    AccessControlUpgradeable,
    UUPSUpgradeable,
    IFeedStrategy
{
    IFeedStrategy public referenceFeed;
    IUniswapV2Pair public velodromePool;

    address public token0;
    address public token1;

    uint8 public decimals;
    uint8 public decimalsOpposite;
    bool public isResultToken0;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() initializer {}

    function initialize(
        address _multiSigWallet,
        address _referenceFeedAddress,
        address _velodromePool,
        bool _isResultToken0
    ) public initializer {
        __AccessControl_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, _multiSigWallet);

        velodromePool = IUniswapV2Pair(_velodromePool);
        referenceFeed = IFeedStrategy(_referenceFeedAddress);
        isResultToken0 = _isResultToken0;

        token0 = velodromePool.token0();
        token1 = velodromePool.token1();

        decimals = _isResultToken0
            ? IERC20Metadata(IUniswapV2Pair(_velodromePool).token1()).decimals()
            : IERC20Metadata(IUniswapV2Pair(_velodromePool).token0()).decimals();
    }

    function getPrice() external view returns (int256, uint8) {
        return getPriceOfAmount(10 ** decimals);
    }

    function getPriceOfAmount(
        uint256 amount
    ) public view returns (int256, uint8) {
        uint256 amountReturned;

        if (isResultToken0) {
            // token1 => token0
            amountReturned = velodromePool.getAmountOut(
                amount,
                token1
            );
        } else {
            // token0 => token1
            amountReturned = velodromePool.getAmountOut(
                amount,
                token0
            );
        }

        (int256 usdPrice, uint8 usdDecimals) = referenceFeed.getPrice();
        
        require(usdPrice > 0, "VeloRFS: feed lte 0");
        return (
            int256(amount) * usdPrice,
            usdDecimals + decimals
        );
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyRole(DEFAULT_ADMIN_ROLE) {}
}
