import { AlchemyWebSocketProvider } from "@ethersproject/providers";
import { getContractFactory } from "@nomiclabs/hardhat-ethers/types";
import {ethers, upgrades} from "hardhat"
import * as readline from 'readline';
import { LiquidityHandler } from "../../typechain";

async function main() {
    const Buffer = await ethers.getContractFactory("BufferManager");
    // const doo = await upgrades.prepareUpgrade("0xeDc37a63d74d2AB5C66067f979Cef378b4E3E591", Buffer);
    // const buffer = await Buffer.deploy();
    // const buffer = 0x327Fa075b5503A9A41fB92E610333351DEE59Ed0
    // await upgrades.upgradeTo("0x95fe340CD4EA33c0796Ba5135155C3d1126C820e", doo);
    let bufferProx = await ethers.getContractAt("BufferManager", "0xeDc37a63d74d2AB5C66067f979Cef378b4E3E591")
    await bufferProx.changeUpgradeStatus(true);
    await bufferProx.upgradeTo("0x95fe340CD4EA33c0796Ba5135155C3d1126C820e");

    // console.log(doo);
    // https://polygonscan.com/address/0xcDa93729562d609EE863e157a773E507439c423f#code
}
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
})