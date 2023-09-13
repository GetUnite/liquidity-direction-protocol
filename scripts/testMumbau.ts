import { ethers, upgrades } from "hardhat"
import { LiquidityHandlerPolygon } from "../typechain-types";

async function main() {


    // // get current iballuoUSD and liquidity handlers
    let iballuoUSD = await ethers.getContractAt("IbAlluo", "0x71402a46d78a10c8eE7E7CdEf2AffeC8d1E312A1");
    // let liquidityHandler = await ethers.getContractAt("LiquidityHandler", "0xF877605269bB018c96bD1c93F276F834F45Ccc3f");


    // // Remove all existing tokens from iballuoUSD
    // let supportedTokens = await iballuoUSD.getListSupportedTokens();
    // for (let i = 0; i < supportedTokens.length; i++) {
    //     console.log("Removing token", supportedTokens[i])
    //     await iballuoUSD.changeTokenStatus(supportedTokens[i], false);
    // }

    // // Add new tokens to iballuoUSD
    // const DAI = "0x22a8D4294c64Fc02736D50D2094DbF49a92d3122";
    // const USDC = "0x7ffAE00B81355C763EF3F0ca042184762c48439F"
    // const USDT =  "0x2F32C5bF7b2C260951647A2e3A8E6c3176Ca4Db2"
    // await iballuoUSD.changeTokenStatus(USDT, true);
    // await iballuoUSD.changeTokenStatus(USDC, true);
    // await iballuoUSD.changeTokenStatus(DAI, true)


    let liquidityHandlerFac = await ethers.getContractFactory("LiquidityHandlerPolygon");
    let liquidityHandler = await upgrades.deployProxy(liquidityHandlerFac, ["0xabfe4d45c6381908f09ef7c501cc36e38d34c0d4",  "0xabfe4d45c6381908f09ef7c501cc36e38d34c0d4"]) as LiquidityHandlerPolygon


    let usdAdapterMumbaiFactory = await ethers.getContractFactory("USDAdapterMumbaiUnblock");
    // // deploy upgradeable
    let usdAdapterMumbai = await upgrades.deployProxy(usdAdapterMumbaiFactory, [liquidityHandler.address]);

    console.log("usdAdapterMumbai deployed to:", usdAdapterMumbai.address);


    await liquidityHandler.setAdapter(1,"USD FakeCurve", 200, usdAdapterMumbai.address, true);
    await liquidityHandler.grantRole(await liquidityHandler.DEFAULT_ADMIN_ROLE(), iballuoUSD.address);
    await liquidityHandler.setIbAlluoToAdapterId(iballuoUSD.address, 1);

    await iballuoUSD.setLiquidityHandler(liquidityHandler.address);
    console.log("All set")
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

//npx hardhat run scripts/deployTestToken.ts --network optimisticEthereum
//npx hardhat verify ... --network optimisticEthereum