import { parseEther, parseUnits } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, BigNumberish } from "ethers";
import { Interface } from "ethers/lib/utils";
import { ethers, upgrades } from "hardhat";
import { before } from "mocha";
import { InterestCheck__factory, InterestCheck} from "../../typechain";


async function skipDays(d: number) {
    ethers.provider.send('evm_increaseTime', [d * 86400]);
    ethers.provider.send('evm_mine', []);
}

describe("Comparison of old interest method and new interest method", function () {
    let signers: SignerWithAddress[];
    let interestContract: InterestCheck;
    let interestIndexFactor: BigNumber;
    let Denominator: BigNumber;

    before(async function () {
        signers = await ethers.getSigners();
    });

    beforeEach(async function () {
        const interestFactory = await ethers.getContractFactory("interestCheck") as InterestCheck__factory;
        interestContract = await interestFactory.deploy();
        interestIndexFactor = await interestContract.interestIndexFactor();
        Denominator = await interestContract.DENOMINATOR();

    });
    it ("Show difference in precision between old and new with over 1 year", async function() {
        skipDays(365);
        await interestContract.oldInterest();
        await interestContract.updateInterestIndex();
        const oldInterestIndex = await interestContract.DF();
        const newInterestIndex = await interestContract.interestIndex();
        const expectedValue = 1.08 * 10**20;

        console.log("Old: % difference from expected value", 100*(Number(oldInterestIndex) - expectedValue)/expectedValue)
        console.log("New: % difference from expected value", 100*(Number(newInterestIndex) - expectedValue)/expectedValue)

    })



    it ("Show difference in precision between old and new over 2 years", async function() {
        skipDays(365*2);
        await interestContract.oldInterest();
        await interestContract.updateInterestIndex();
        const oldInterestIndex = await interestContract.DF();
        const newInterestIndex = await interestContract.interestIndex();
        const expectedValue = 1.08 **2 * 10**20;


        console.log("Old: % difference from expected value", (Number(oldInterestIndex) - expectedValue)/expectedValue)
        console.log("New: % difference from expected value", (Number(newInterestIndex) - expectedValue)/expectedValue)
    })

    it ("Show difference in precision between old and new over 6 months", async function() {
        skipDays(180);
        await interestContract.oldInterest();
        await interestContract.updateInterestIndex();
        const oldInterestIndex = await interestContract.DF();
        const newInterestIndex = await interestContract.interestIndex();
        const expectedValue = 1.08**0.5 * 10**20;

        // 6 month APY

        console.log("Old: % difference from expected value", (Number(oldInterestIndex) - expectedValue)/expectedValue)
        console.log("New: % difference from expected value", (Number(newInterestIndex) - expectedValue)/expectedValue)
    })

    it ("Show difference in precision between old and new over 3 months", async function() {
        skipDays(90);
        await interestContract.oldInterest();
        await interestContract.updateInterestIndex();
        const oldInterestIndex = await interestContract.DF();
        const newInterestIndex = await interestContract.interestIndex();
        const expectedValue = 1.08**0.25 * 10**20;

        console.log("Old: % difference from expected value", (Number(oldInterestIndex) - expectedValue)/expectedValue)
        console.log("New: % difference from expected value", (Number(newInterestIndex) - expectedValue)/expectedValue)
    })

    it ("Show difference in precision between old and new over 1 month", async function() {
        skipDays(30);
        await interestContract.oldInterest();
        await interestContract.updateInterestIndex();
        const oldInterestIndex = await interestContract.DF();
        const newInterestIndex = await interestContract.interestIndex();
        const expectedValue = 1.08**(1/12) * 10**20;

        console.log("Old: % difference from expected value", (Number(oldInterestIndex) - expectedValue)/expectedValue)
        console.log("New: % difference from expected value", (Number(newInterestIndex) - expectedValue)/expectedValue)
    })

    it ("Show difference in precision between old and new over 2 weeks", async function() {
        skipDays(14);
        await interestContract.oldInterest();
        await interestContract.updateInterestIndex();
        const oldInterestIndex = await interestContract.DF();
        const newInterestIndex = await interestContract.interestIndex();
        const expectedValue = 1.08**(1/26) * 10**20;

        console.log("Old: % difference from expected value", (Number(oldInterestIndex) - expectedValue)/expectedValue)
        console.log("New: % difference from expected value", (Number(newInterestIndex) - expectedValue)/expectedValue)
    })

    it ("Show difference in precision between old and new over 1 day", async function() {
        skipDays(1);
        await interestContract.oldInterest();
        await interestContract.updateInterestIndex();
        const oldInterestIndex = await interestContract.DF();
        const newInterestIndex = await interestContract.interestIndex();
        const expectedValue = 1.08**(1/365) * 10**20;

        console.log("Old: % difference from expected value", (Number(oldInterestIndex) - expectedValue)/expectedValue)
        console.log("New: % difference from expected value", (Number(newInterestIndex) - expectedValue)/expectedValue)
    })

    it ("Show difference in precision between old and new over 0.5 days", async function() {
        skipDays(0.5);
        await interestContract.oldInterest();
        await interestContract.updateInterestIndex();
        const oldInterestIndex = await interestContract.DF();
        const newInterestIndex = await interestContract.interestIndex();
        const expectedValue = 1.08**(1/(365*2)) * 10**20;

        console.log("Old: % difference from expected value", (Number(oldInterestIndex) - expectedValue)/expectedValue)
        console.log("New: % difference from expected value", (Number(newInterestIndex) - expectedValue)/expectedValue)
    })



})