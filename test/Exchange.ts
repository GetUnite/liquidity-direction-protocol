import { expect } from "chai";
import { parseEther } from "@ethersproject/units";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "@ethersproject/bignumber";
import { BigNumberish } from "@ethersproject/bignumber";
import { Exchange, IERC20 } from "../typechain";

describe("Exchange", function () {
    const daiAddress = "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063";
    const usdcAddress = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
    const usdtAddress = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";

    const daiDecimals = 18;
    const usdcDecimals = 6;
    const usdtDecimals = 6;

    const curveExchange = "0x445FE580eF8d70FF569aB36e80c647af338db351";

    const exchangeContractName = "Exchange";

    let dai: IERC20,
        usdc: IERC20,
        usdt: IERC20;

    let exchange: Exchange;

    let deployer: SignerWithAddress, newUser: SignerWithAddress;

    beforeEach(async function () {
        const accounts = await ethers.getSigners();
        deployer = accounts[0];
        newUser = accounts[1];

        dai = await ethers.getContractAt("IERC20", daiAddress) as IERC20;
        usdc = await ethers.getContractAt("IERC20", usdcAddress) as IERC20;
        usdt = await ethers.getContractAt("IERC20", usdtAddress) as IERC20;

        const Exchange = await ethers.getContractFactory(exchangeContractName);
        exchange = await Exchange.deploy(curveExchange);
    });

    it("Should make exchange", async function () {
        const daiExchangeAmount = ethers.utils.parseUnits("12", daiDecimals);
        const approveAmount = daiExchangeAmount.mul(2).div(3);

        console.log("Before exchange:");
        console.log(`DAI: ${ethers.utils.formatUnits((await dai.balanceOf(deployer.address)).toString(), daiDecimals)}`);
        console.log(`USDC: ${ethers.utils.formatUnits((await usdc.balanceOf(deployer.address)).toString(), usdcDecimals)}`);
        console.log(`USDT: ${ethers.utils.formatUnits((await usdt.balanceOf(deployer.address)).toString(), usdtDecimals)}\n`);

        console.log(`Approving ${ethers.utils.formatUnits(approveAmount, daiDecimals)} of DAI to exchange`);
        await dai.approve(exchange.address, approveAmount);
        console.log(`Buttering ${ethers.utils.formatUnits(daiExchangeAmount, daiDecimals)} DAI`);
        await exchange.exchange(daiExchangeAmount);

        console.log("\nAfter exchange:");
        console.log(`DAI: ${ethers.utils.formatUnits((await dai.balanceOf(deployer.address)).toString(), daiDecimals)}`);
        console.log(`USDC: ${ethers.utils.formatUnits((await usdc.balanceOf(deployer.address)).toString(), usdcDecimals)}`);
        console.log(`USDT: ${ethers.utils.formatUnits((await usdt.balanceOf(deployer.address)).toString(), usdtDecimals)}`);
    });

    it("Should make exchange (new user)", async function () {
        const daiExchangeAmount = ethers.utils.parseUnits("12", daiDecimals);
        const approveAmount = daiExchangeAmount.mul(2).div(3);

        console.log(`Giving new user without tokens ${ethers.utils.formatUnits(daiExchangeAmount, daiDecimals)} DAI`);
        await dai.transfer(newUser.address, daiExchangeAmount);

        console.log("Before exchange:");
        console.log(`DAI: ${ethers.utils.formatUnits((await dai.balanceOf(newUser.address)).toString(), daiDecimals)}`);
        console.log(`USDC: ${ethers.utils.formatUnits((await usdc.balanceOf(newUser.address)).toString(), usdcDecimals)}`);
        console.log(`USDT: ${ethers.utils.formatUnits((await usdt.balanceOf(newUser.address)).toString(), usdtDecimals)}\n`);

        console.log(`Approving ${ethers.utils.formatUnits(approveAmount, daiDecimals)} of DAI to exchange`);
        await dai.connect(newUser).approve(exchange.address, approveAmount);
        console.log(`Buttering ${ethers.utils.formatUnits(daiExchangeAmount, daiDecimals)} DAI`);
        await exchange.connect(newUser).exchange(daiExchangeAmount);

        console.log("\nAfter exchange:");
        console.log(`DAI: ${ethers.utils.formatUnits((await dai.balanceOf(newUser.address)).toString(), daiDecimals)}`);
        console.log(`USDC: ${ethers.utils.formatUnits((await usdc.balanceOf(newUser.address)).toString(), usdcDecimals)}`);
        console.log(`USDT: ${ethers.utils.formatUnits((await usdt.balanceOf(newUser.address)).toString(), usdtDecimals)}`);
    });
});