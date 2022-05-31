// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;

interface TokenFetcher {
    struct MajorRoute {
        string fromSymbol;
        address fromToken;
        address[] toTokens;
        string[] toSymbols;
        string[] routesName;
        uint128[] routesId;
    }

    struct MinorRoute {
        string fromSymbol;
        address fromToken;
        address[] toTokens;
        string[] toSymbols;
        string[] routesName;
        uint128[] routesId;
    }

    /// @notice Retrieve all major listed tokens with associated routes.
    /// @return Array of Major tokens
    function getAllMajorCoins() external view returns (MajorRoute[] memory);

    /// @notice Retrieve all minor listed tokens with associated routes.
    /// @return Array of Minor tokens
    function getAllMinorCoins() external view returns (MinorRoute[] memory) ;

}
