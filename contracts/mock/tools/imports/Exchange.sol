// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import "alluo-exchange/contracts/Exchange.sol";

contract ExchangeCopy is Exchange {
    constructor(address gnosis, bool isTesting) Exchange(gnosis, isTesting) {}
}
