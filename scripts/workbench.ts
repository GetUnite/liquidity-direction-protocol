import { Contract, Wallet } from "ethers";
import { formatEther, parseEther } from "ethers/lib/utils";
import { ethers, upgrades } from "hardhat";

async function main() {
    // const factory = await ethers.getContractFactory("LiquidityHandlerPolygon");

    // const handler = await ethers.getContractAt("LiquidityHandlerPolygon", "0xF877605269bB018c96bD1c93F276F834F45Ccc3f");
    // const gnosis = await ethers.getContractAt("GnosisMock", "0x466b375cE0D1161aEb3e69f92B2B9c365f7877BE")

    // console.log(await handler.callStatic.)
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
})