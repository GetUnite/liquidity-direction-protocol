import { expect } from "chai";
import { ethers } from "hardhat";
import { DecimalConverterTest } from "../../typechain"

describe("TestingDecimals", function () {
    let decimalConverter: DecimalConverterTest
    before(async function () {
        let decimalConverterTest = await ethers.getContractFactory("DecimalConverterTest")
        decimalConverter = await decimalConverterTest.deploy()
    })
    it("Should convert decimals upwards from 10 to 18", async function () {
        let number = ethers.utils.parseUnits("5", 10)
        let result = await decimalConverter.toDecimals(number, 10, 18)
        expect(result).to.equal(ethers.utils.parseUnits("5", 18))
    })
    it("Should convert decimals downwards from 18 to 10", async function () {
        let number = ethers.utils.parseUnits("5", 18)
        let result = await decimalConverter.toDecimals(number, 18, 10)
        expect(result).to.equal(ethers.utils.parseUnits("5", 10))
    })
    it("Should return the same if target == current decimals", async function () {
        let number = ethers.utils.parseUnits("5", 18)
        let result = await decimalConverter.toDecimals(number, 18, 18)
        expect(result).to.equal(ethers.utils.parseUnits("5", 18))
    })
})