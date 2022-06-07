import { task } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";

task("entryv2", "Execute vote from Alluo DAO for liquidity direction")
    .setAction(async function (taskArgs, hre) {
        const network = hre.network.name;
        console.log("Network:", network);

        const executor = await hre.ethers.getContractAt("VoteExecutorV2", "0xF5FF6A941516AF0D8311b98B77D011910f2559C4");
        const strategy = await hre.ethers.getContractAt("CurveConvexStrategy", "0xa95eDB5D867996717d873Ca1c2a586feC9c80754");
        const usdc = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
        const dai = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
        const frax = "0x853d955aCEf822Db058eb8505911ED77F175b99e"
        const usdt = "0xdAC17F958D2ee523a2206206994597C13D831ec7"
        const crv3 = "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490"

        let entryData = await strategy.encodeEntryParams(
            "", //Curve pool address
            "", //Curve LP token address
            "", //Entry coin address
            0, //Pool size
            0, //Token index in Curve
            0 //Convex pool id
        )

        let entries = [{
            weight: 10000, //Weight percentage with 2 decimals 10000 = 100.00
            strategyAddress: "", //Alluo Strategy address
            entryToken: "", //Coin we are using to enter the Strategy that is balance of the Vote Executor
            poolToken: "", //Token used to actually enter the Strategy, in case we need to exchange entryToken to poolToken 
            data: entryData
        }]


        // when we can sort out multisig via tasks this will run
        //await executor.execute(entries);

        //for now just outputing the entries ready for copy paste
        console.log("Entries:", JSON.stringify(entries));

        console.log(`
----------------------
| Entry task Done 🚀 |
----------------------
        `);
    });
