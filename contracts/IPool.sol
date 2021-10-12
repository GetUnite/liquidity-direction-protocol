// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

// Generated from pool contract ABI (https://polygonscan.com/address/0x445FE580eF8d70FF569aB36e80c647af338db351#code)
// and interface generator (https://bia.is/tools/abi2solidity/)
interface IPool {
    function add_liquidity(uint256[3] memory _amounts, uint256 _min_mint_amount)
        external
        returns (uint256);
}
