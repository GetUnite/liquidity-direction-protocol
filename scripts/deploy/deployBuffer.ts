import { AlchemyWebSocketProvider } from "@ethersproject/providers";
import { getContractFactory } from "@nomiclabs/hardhat-ethers/types";
import {ethers, upgrades} from "hardhat"
import * as readline from 'readline';
import { LiquidityHandler } from "../../typechain";

async function main() {
    const Buffer = await ethers.getContractFactory("BufferManager");
    const buffer = await Buffer.deploy();

    console.log("Buffer deployed to:", buffer.address);
}
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
})