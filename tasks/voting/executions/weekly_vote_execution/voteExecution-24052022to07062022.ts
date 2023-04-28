import { task } from "hardhat/config";


task("voteExecution-24052022to07062022", "Execute vote from Alluo DAO for liquidity direction")
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

        let entryData1 = await strategy.encodeEntryParams(
            "0x43b4FdFD4Ff969587185cDB6f0BD875c5Fc83f8c",
            "0x43b4FdFD4Ff969587185cDB6f0BD875c5Fc83f8c",
            crv3,
            2,
            1,
            36
        )

        let entryData2 = await strategy.encodeEntryParams(
            "0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B",
            "0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B",
            crv3,
            2,
            1,
            32
        )

        let entries = [{
            weight: 2005,
            strategyAddress: "0xa95eDB5D867996717d873Ca1c2a586feC9c80754",
            entryToken: usdt,
            poolToken: crv3,
            data: entryData1
        }, {
            weight: 7995,
            strategyAddress: "0xa95eDB5D867996717d873Ca1c2a586feC9c80754",
            entryToken: usdt,
            poolToken: crv3,
            data: entryData2
        },]


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
