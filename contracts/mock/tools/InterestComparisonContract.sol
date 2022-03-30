// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "../../interestHelper/compound.sol";

contract interestCheck is Interest {
    uint public DF = 10**20;
    uint public DENOMINATOR = 10**20;
    uint public interest = 8;
    uint public lastDFUpdate = block.timestamp;


    uint public interestRate = 100000000244041*10**13;
    uint public interestIndexFactor = 10**20;
    uint public interestIndex = 10**20;
    uint public lastInterestCompound = block.timestamp;

    function oldInterest() public returns (uint) {
        uint timeFromLastUpdate = block.timestamp - lastDFUpdate;
        DF =
            ((DF *
                (((interest * DENOMINATOR * timeFromLastUpdate) / 31536000) +
                    (100 * DENOMINATOR))) / DENOMINATOR) /
            100;
        lastDFUpdate = block.timestamp;
        return DF;
    }

    function updateInterestIndex() public returns (uint) {
        interestIndex = chargeInterest(interestIndex, interestRate, lastInterestCompound);
        lastInterestCompound = block.timestamp;
        return interestIndex;
    }


}