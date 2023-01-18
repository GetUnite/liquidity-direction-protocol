import { AlchemyWebSocketProvider } from "@ethersproject/providers";
import { getContractFactory } from "@nomiclabs/hardhat-ethers/types";
import {ethers, upgrades} from "hardhat"
import * as readline from 'readline';
import { LiquidityHandler } from "../../typechain";

async function main() {
    // const buffer = await ethers.getContractAt("BufferManager", "0xeDc37a63d74d2AB5C66067f979Cef378b4E3E591")
    const gnosis = await ethers.getContractAt("GnosisMock", "0x466b375cE0D1161aEb3e69f92B2B9c365f7877BE");
    const handler = await ethers.getContractAt("LiquidityHandler", "0xF877605269bB018c96bD1c93F276F834F45Ccc3f")
    // const Adapter = await ethers.getContractFactory("UsdCurveAdapterUpgradeableMumbai")
    const Handler = await ethers.getContractFactory("LiquidityHandlerPolygon")
    // const Buffer = await ethers.getContractFactory("BufferManager")
    // let adapter = await ethers.getContractAt("UsdCurveAdapterUpgradeableMumbai", "0x7800b5B43cb955dB6fF1565dC85734dA75959440")
    let LiquidityHandlerCurrent = await ethers.getContractFactory("LiquidityHandlerCurrent")
    // const BufferManagerCurrent = await ethers.getContractFactory("BufferManagerCurrent")
    
    // const calldata1 = handler.interface.encodeFunctionData(
    //     "grantRole",
    //     [
    //         await handler.UPGRADER_ROLE(),
    //         "0x7a34b2f0da5ea35b5117cac735e99ba0e2aceecd"
    //     ]
       
    // )
    // await gnosis.execute(handler.address, 0, calldata1);
    // console.log("1")
    // const calldata = handler.interface.encodeFunctionData(
    //     "changeUpgradeStatus",
    //     [
    //         true
    //     ]
    // )
    // await gnosis.execute(handler.address, 0, calldata);
    // console.log("2")

    // await upgrades.validateUpgrade("0x1D147031b6B4998bE7D446DecF7028678aeb732A", Handler, {unsafeAllow: ["delegatecall"]});
    // const upgraded = await upgrades.prepareUpgrade("0xF877605269bB018c96bD1c93F276F834F45Ccc3f", Handler, {unsafeAllow: ["delegatecall"]});
    await upgrades.forceImport("0xF877605269bB018c96bD1c93F276F834F45Ccc3f", Handler)
    // await upgrades.upgradeProxy(
    //     "0xF877605269bB018c96bD1c93F276F834F45Ccc3f",
    //     Handler
    // );
    // console.log(upgraded)
    // await Handler.deploy();
    // const calldata2 = handler.interface.encodeFunctionData(
    //         "upgradeTo",
    //         [
    //             "0x5c9cDb056A89ebaFD7a5F1a06b1d737132864DdF"
    //         ]
    // )
    // await gnosis.execute(handler.address, 0, calldata2)
    // await handler.upgradeTo("0x5c9cDb056A89ebaFD7a5F1a06b1d737132864DdF")

}
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
})