import { ethers, network, upgrades } from "hardhat"
import { ExternalStablecoinReferenceFeedStrategyV2, LiquidityHandlerPolygon } from "../../../typechain";

async function main() {

    // await network.provider.request({
    //     method: "hardhat_reset",
    //     params: [{
    //         forking: {
    //             enabled: true,
    //             jsonRpcUrl: process.env.POLYGON_FORKING_URL as string,
    //             //you can fork from last block by commenting next line
    //             blockNumber: 49665518
    //             ,
    //         },
    //     },],
    // });
    const multisigAddress = "0x2580f9954529853Ca5aC5543cE39E9B5B1145135";
    const Handler = await ethers.getContractFactory("LiquidityHandlerPolygon");
    let dram = await ethers.getContractAt("TestERC20", "0x12C20bcEe31bD34064cAa6eC0FD5c4c2Fce179C7")
    const deployedhandler = await ethers.getContractAt("LiquidityHandlerPolygon", "0x31a3439Ac7E6Ea7e0C0E4b846F45700c6354f8c1");

    // let newHandlerImp = await Handler.deploy();
    // let changeUpgradeStatus = newHandlerImp.interface.encodeFunctionData("changeUpgradeStatus", [true])
    // let upgradeTo = newHandlerImp.interface.encodeFunctionData("upgradeTo", [newHandlerImp.address])
    // let setDram = newHandlerImp.interface.encodeFunctionData("setDram", [dram.address])

    // console.log("Target cntract", deployedhandler.address)
    // console.log("Change upgrade status data", changeUpgradeStatus)
    // console.log("Upgrade to data", upgradeTo)
    // console.log("Set dram data", setDram)



    const stablecoinStrategy = await ethers.getContractFactory("ExternalStablecoinReferenceFeedStrategyV2")
    const externalStablecoinStrategy = await upgrades.deployProxy(stablecoinStrategy,
        [multisigAddress],
        { initializer: 'initialize', kind: 'uups' }
    ) as ExternalStablecoinReferenceFeedStrategyV2;

    console.log("External stablecoin strategy deployed to:", externalStablecoinStrategy.address);

    let priceFeedRouterV2 = await ethers.getContractAt("PriceFeedRouterV2", "0x82220c7Be3a00ba0C6ed38572400A97445bdAEF2");

    let setCryptoStrategy = priceFeedRouterV2.interface.encodeFunctionData("setCryptoStrategy", [externalStablecoinStrategy.address, dram.address])

    console.log("Target cntract", priceFeedRouterV2.address)
    console.log("Set crypto strategy data", setCryptoStrategy)


    let iballuoUSD = await ethers.getContractAt("IbAlluoTestnetAfter", "0xC2DbaAEA2EfA47EBda3E572aa0e55B742E408BF6");
    let changeTokenStatus = iballuoUSD.interface.encodeFunctionData("changeTokenStatus", [dram.address, true])
    console.log("Target cntract", iballuoUSD.address)
    console.log("Change token status data", changeTokenStatus)
    // SIMULATION START

    // const multisigSimulatedSigner = await ethers.getImpersonatedSigner(multisigAddress);
    // // send some dram to the multisig
    // let tester = await ethers.getImpersonatedSigner("0xaf4c0B70B2Ea9FB7487C7CbB37aDa259579fe040");
    // // send matic to the multisig
    // await tester.sendTransaction({ to: multisigAddress, value: ethers.utils.parseEther("10") })
    // await multisigSimulatedSigner.sendTransaction({ to: deployedhandler.address, data: changeUpgradeStatus })
    // console.log("Upgrade status changed")
    // await multisigSimulatedSigner.sendTransaction({ to: deployedhandler.address, data: upgradeTo })
    // console.log("Upgraded")
    // await multisigSimulatedSigner.sendTransaction({ to: deployedhandler.address, data: setDram })
    // console.log("Dram set")
    // await multisigSimulatedSigner.sendTransaction({ to: priceFeedRouterV2.address, data: setCryptoStrategy })
    // console.log("Crypto strategy set")
    // await multisigSimulatedSigner.sendTransaction({ to: iballuoUSD.address, data: changeTokenStatus })
    // console.log("Token status changed")

    // const dramHolder = await ethers.getImpersonatedSigner("0x040eB4673D7929927f40D52581b22aF54E7C6cBe");
    // const randomIballuoHolder = await ethers.getImpersonatedSigner("0x16Dbf19b17b83B66C82A96FA164eDE626b70a23e");
    // await tester.sendTransaction({ to: randomIballuoHolder.address, value: ethers.utils.parseEther("10") })

    // await dram.connect(dramHolder).approve(iballuoUSD.address, ethers.utils.parseEther("1000000000"))
    // await iballuoUSD.connect(dramHolder).deposit(dram.address, ethers.utils.parseEther("10"))
    // await iballuoUSD.connect(dramHolder).withdraw(dram.address, ethers.utils.parseEther("10"))
    // await iballuoUSD.connect(dramHolder).deposit(dram.address, ethers.utils.parseEther("10"))
    // await iballuoUSD.connect(randomIballuoHolder).withdraw(dram.address, ethers.utils.parseEther("10"))


    // // Now we check the random iballuoholder's balance
    // const dramBalance = await dram.balanceOf(randomIballuoHolder.address);
    // // check that the dram holder's balance after is the same at 150
    // const dramHolderBalance = await dram.balanceOf(dramHolder.address);
    // console.log("DRAM balance of dram holder", dramHolderBalance.toString());
    // console.log("DRAM balance of random iballuo holder", dramBalance.toString());
    // console.log("Simulation complete")

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

//npx hardhat run scripts/deploy/deployHandler.ts --network polygon
//npx hardhat verify 0xb647c6fe9d2a6e7013c7e0924b71fa7926b2a0a3 --network polygon