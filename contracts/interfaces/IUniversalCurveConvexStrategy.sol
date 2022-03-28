// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/access/IAccessControl.sol";
import "./ICvxBaseRewardPool.sol";

interface IUniversalCurveConvexStrategy is IAccessControl, IERC20{
  function claimAll ( ICvxBaseRewardPool pool ) external;
  function deployToConvex ( address cvxBoosterAddress, uint256 poolId ) external;
  function deployToCurve ( uint256[4] calldata fourPoolTokensAmount, IERC20[4] calldata tokens, uint8 poolSize, address curvePool ) external;
  function exit ( uint256[2] calldata twoPoolTokensAmount, uint256[3] calldata threePoolTokensAmount, uint256[4] calldata fourPoolTokensAmount, address pool, uint8 tokensCount ) external;
  function exitOneCoin ( address pool, uint256 coinIndex, uint256 lpBurnAmount ) external;
  function withdraw ( ICvxBaseRewardPool pool, uint256 lpAmount ) external;
  function withdrawTokens ( IERC20 token, address destination, uint256 amount ) external;
  function executeCall ( address destination, bytes calldata _calldata) external;
}
