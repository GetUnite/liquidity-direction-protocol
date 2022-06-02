// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

import "@openzeppelin/contracts/interfaces/IERC20.sol";
// Changed file pathing just for fake.
import "./interfaces/IExchangeAdapter.sol";

// solhint-disable func-name-mixedcase
// solhint-disable var-name-mixedcase
interface ICurve3Crv {
    function add_liquidity(uint256[3] memory amounts, uint256 min_mint_amount, bool _use_underlying)
        external;

    function remove_liquidity_one_coin(
        uint256 _token_amount,
        int128 i,
        uint256 min_amount,
        bool _use_underlying
    ) external;

    function exchange_underlying (
            int128 i,
            int128 j,
            uint256 dx,
            uint256 min_dy
        ) external returns (uint256);
}

contract PolygonCurve3Adapter is IExchangeAdapter {
    IERC20 public constant token3crv =
        IERC20(0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171);

    function indexByCoin(address coin) public pure returns (int128) {
        // We are using the underlying coins for swaps.
        if (coin == 0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063) return 1; // dai
        if (coin == 0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174) return 2; // usdc
        if (coin == 0xc2132D05D31c914a87C6611C10748AEb04B58e8F) return 3; // usdt
        return 0;
    }

    function executeSwap(
        address pool,
        address fromToken,
        address toToken,
        uint256 amount
    ) external payable returns (uint256) {
        ICurve3Crv pool3crv = ICurve3Crv(pool);

        if (toToken == address(token3crv)) {
            // enter 3crv pool to get 3crv token
            int128 i = indexByCoin(fromToken);
            require(i != 0, "PolygonCurve3Adapter: can't swap");
            uint256[3] memory amounts;
            amounts[uint256(int256(i - 1))] = amount;

            pool3crv.add_liquidity(amounts, 0, true);

            return token3crv.balanceOf(address(this));
        } else if (fromToken == address(token3crv)) {
            // exit 3crv pool to get stable
            int128 i = indexByCoin(toToken);
            require(i != 0, "PolygonCurve3Adapter: can't swap");

            pool3crv.remove_liquidity_one_coin(amount, i - 1, 0, true);

            return IERC20(toToken).balanceOf(address(this));
        } else {
            // Swap between two USD stable coins
            int128 i = indexByCoin(fromToken);
            int128 j = indexByCoin(toToken);
            require(i != 0 && j != 0, "PolygonCurve3Adapter: can't swap");
            pool3crv.exchange_underlying(i - 1, j - 1, amount, 0);
            return IERC20(toToken).balanceOf(address(this));
        }
    }

    function enterPool(
        address,
        address,
        uint256
    ) external payable returns (uint256) {
        revert("PolygonCurve3Adapter: cant enter");
    }

    function exitPool(
        address,
        address,
        uint256
    ) external payable returns (uint256) {
        revert("PolygonCurve3Adapter: can't exit");
    }
}
