// SPDX-License-Identifier: MIT
pragma solidity 0.8.11;
interface IHandlerAdapter {
     function getCoreTokens() external pure returns ( address mathToken, address primaryToken );
}