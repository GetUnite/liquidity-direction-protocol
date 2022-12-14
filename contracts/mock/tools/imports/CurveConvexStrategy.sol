// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "alluo-strategies/contracts/deprecated/ethereum/CurveConvex/CurveConvexStrategy.sol";

contract CurveConvexStrategyCopy is CurveConvexStrategy {
    constructor(
        address voteExecutor,
        address gnosis,
        bool isTesting
    ) CurveConvexStrategy(voteExecutor, gnosis, isTesting) {}
}
