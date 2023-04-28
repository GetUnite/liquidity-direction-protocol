import { task } from "hardhat/config";


task("testIbPriceResolver", "testing emitter function")
    .setAction(async function (taskArgs, hre) {

        const network = hre.network.name;

        console.log(network);

        const ibAlluo = await hre.ethers.getContractAt("IbAlluoUSDPriceResolver", "0x9021de2b2085b6708af34e6019a78b364a7209b3");

        await ibAlluo.emitter()

        console.log('Task Done! check events on chain');
    });
