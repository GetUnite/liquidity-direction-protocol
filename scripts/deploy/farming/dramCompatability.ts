import { ethers, upgrades } from "hardhat"
import { ExternalStablecoinReferenceFeedStrategyV2, LiquidityHandlerPolygon } from "../../../typechain";

async function main() {
    const tester = "0xABfE4d45c6381908F09EF7c501cc36E38D34c0d4"
    const Handler = await ethers.getContractFactory("LiquidityHandlerPolygon");


    // let testerc20 = await ethers.getContractFactory("TestERC20");
    // let dram = await testerc20.deploy("DRAM", "DRAM", 18, true, tester);
    // console.log("DRAM deployed to:", dram.address);
    // await dram.mint(tester, ethers.utils.parseEther("1000000"));
    let dram = await ethers.getContractAt("TestERC20", "0x2C6F431d8876817F64D00d00f60A16d7226c8407")

    const ibAlluoUSD = await ethers.getContractAt("IbAlluoTestnetAfter", "0x71402a46d78a10c8eE7E7CdEf2AffeC8d1E312A1")

    // await ibAlluoUSD.changeTokenStatus(dram.address, true);
    let iballuoFactory = await ethers.getContractFactory("IbAlluoTestnetAfter");
    // let newIbAlluoImp = await iballuoFactory.deploy();
    // await upgrades.forceImport(ibAlluoUSD.address, iballuoFactory)

    // await ibAlluoUSD.changeUpgradeStatus(true);
    // await ibAlluoUSD.upgradeTo(newIbAlluoImp.address);
    // // await upgrades.upgradeProxy(ibAlluoUSD.address, iballuoFactory);
    // console.log("upgraded successfully")


    // await upgrades.forceImport("0xF877605269bB018c96bD1c93F276F834F45Ccc3f", Handler)

    const deployedhandler = await ethers.getContractAt("LiquidityHandlerPolygon", "0xF877605269bB018c96bD1c93F276F834F45Ccc3f");



    // let newHandlerImp = await Handler.deploy();
    // const grantRoleBefore = deployedhandler.interface.encodeFunctionData("grantRole", [await deployedhandler.UPGRADER_ROLE(), ibAlluoUSD.address])
    // let changeUpgradeStatus = newHandlerImp.interface.encodeFunctionData("changeUpgradeStatus", [true])
    // let upgradeTo = newHandlerImp.interface.encodeFunctionData("upgradeTo", [newHandlerImp.address])
    // const grantRole = deployedhandler.interface.encodeFunctionData("grantRole", [await deployedhandler.DEFAULT_ADMIN_ROLE(), tester])
    // const upgraderRole = deployedhandler.interface.encodeFunctionData("grantRole", [await deployedhandler.UPGRADER_ROLE(), tester])
    // await ibAlluoUSD.multicall([deployedhandler.address, deployedhandler.address, deployedhandler.address, deployedhandler.address, deployedhandler.address], [grantRoleBefore, changeUpgradeStatus, upgradeTo, grantRole, upgraderRole])


    // await deployedhandler.setDram(dram.address);

    // await dram.approve(ibAlluoUSD.address, ethers.utils.parseEther("1000000000"))
    // await ibAlluoUSD.deposit(dram.address, ethers.utils.parseEther("1000000"))

    await ibAlluoUSD.withdraw(dram.address, ethers.utils.parseEther("1000"))
    // const stablecoinStrategy = await ethers.getContractFactory("ExternalStablecoinReferenceFeedStrategyV2")
    // const externalStablecoinStrategy = await upgrades.deployProxy(stablecoinStrategy,
    //     [tester],
    //     { initializer: 'initialize', kind: 'uups' }
    // ) as ExternalStablecoinReferenceFeedStrategyV2;




}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

//npx hardhat run scripts/deploy/deployHandler.ts --network polygon
//npx hardhat verify 0xb647c6fe9d2a6e7013c7e0924b71fa7926b2a0a3 --network polygon