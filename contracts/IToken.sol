// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@openzeppelin/contracts/token/ERC777/IERC777.sol";

interface IToken {
    function mvpContract() external view returns (address);

    function mint(address to, uint256 amount) external;

    function burn(address from, uint256 amount) external;
}
