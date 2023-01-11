import { getContractFactory } from "@nomiclabs/hardhat-ethers/types";
import {ethers, upgrades} from "hardhat"
import { UsdCurveAdapterUpgradeableMumbai, UsdCurveAdapterUpgradeableMumbai__factory, LiquidityHandlerCurrent__factory, BufferManager} from "../../typechain";

async function main() {
    const buffer = await ethers.getContractAt("BufferManager", "0xeDc37a63d74d2AB5C66067f979Cef378b4E3E591")
    const gnosis = await ethers.getContractAt("GnosisMock", "0x466b375cE0D1161aEb3e69f92B2B9c365f7877BE");
    // const handler = await ethers.getContractAt("LiquidityHandler", "0xF877605269bB018c96bD1c93F276F834F45Ccc3f")
    // const Adapter = await ethers.getContractFactory("UsdCurveAdapterUpgradeableMumbai")
    // const Handler = await ethers.getContractFactory("LiquidityHandler")
    const Buffer = await ethers.getContractFactory("BufferManager")
    // let adapter = await ethers.getContractAt("UsdCurveAdapterUpgradeableMumbai", "0x7800b5B43cb955dB6fF1565dC85734dA75959440")
    // let LiquidityHandlerCurrentFactory = await ethers.getContractFactory("LiquidityHandlerCurrent")
    const BufferManagerCurrent = await ethers.getContractFactory("BufferManagerCurrent")
    
    const calldata1 = buffer.interface.encodeFunctionData(
        "grantRole",
        [
            await buffer.UPGRADER_ROLE(),
            "0x7a34b2f0da5ea35b5117cac735e99ba0e2aceecd"
        ]
       
    )
    await gnosis.execute(buffer.address, 0, calldata1);
    const calldata = buffer.interface.encodeFunctionData(
        "changeUpgradeStatus",
        [
            true
        ]
    )
    await gnosis.execute(buffer.address, 0, calldata);
    await upgrades.forceImport("0x8C1e42322295E58079A51140dB232B26B70eD6dD", BufferManagerCurrent)
    await upgrades.upgradeProxy(
        "0xeDc37a63d74d2AB5C66067f979Cef378b4E3E591",
        Buffer
    );


}
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
})