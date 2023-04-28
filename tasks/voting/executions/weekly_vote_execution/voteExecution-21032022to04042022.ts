import { task } from "hardhat/config";

import { Unwinder } from "../../typechain-types";

task("voteExecution-21032022to04042022", "Execute vote from Alluo DAO for liquidity direction")
    .setAction(async function (taskArgs, hre) {
        const network = hre.network.name;
        console.log("Network:", network);

        const usdc = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
        const dai = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
        const frax = "0x853d955aCEf822Db058eb8505911ED77F175b99e"
        const usdt = "0xdAC17F958D2ee523a2206206994597C13D831ec7"
        const crv3 = "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490"

        const exec = await hre.ethers.getContractAt("Unwinder", "0x0ccC76540E087b2E7567F7BFf80d7EEA0d4F00aC") as Unwinder;

        let entries = [
            {
                weight: 100, // Weight in percentage of how much of the total held by the contract should be invested in this vote.
                entryToken: usdc, // Stable held by the contract we want to use to enter the Curve pool, best to use the const above for the stables supported
                curvePool: "0x5a6A4D54456819380173272A5E8E9B9904BdF41B", // Address of the curvePool to enter
                poolToken: crv3, // Address of the token the pool accepts
                poolSize: 2, // How many entry tokens are supported by the Curve pool (most use 3CRV and something else, so the size would be 2)
                tokenIndexInCurve: 1, // Index of the poolToken in the array of supportedTokens (starts from 0)
                convexPoolAddress: "0xF403C135812408BFbE8713b5A23a04b3D48AAE31", // Address of the Convex pool we want to invest the Curve LP into
                convexPoold: 40 // ID of the Convex pool ID, best to use the task getPoolId.ts.
            }
        ]

        // when we can sort out multisig via tasks this will run
        //await exec.executeVote(entries);

        //for now just outputing the entries ready for copy paste
        console.log("Entries:", JSON.stringify(entries));

        console.log(`
----------------------
| Entry task Done 🚀 |
----------------------
        `);
    });
