// SPDX-License-identifier: MIT

pragma solidity ^0.8.11;

import {ISpokePool} from "../../../interfaces/ISpokePool.sol";

contract RelayerTest {
    function swap(
        address distributor,
        address originToken,
        uint64 relayerFeePct,
        uint256 amount
    ) external {
        ISpokePool(0x69B5c72837769eF1e7C164Abc6515DcFf217F920).deposit(
            distributor,
            originToken,
            amount,
            1,
            relayerFeePct,
            uint32(block.timestamp)
        );
    }
}
