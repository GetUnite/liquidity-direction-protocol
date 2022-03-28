import { task } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import { Unwinder } from "../../typechain";

task("entry", "Execute vote from Alluo DAO for liquidity direction")
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
                weight: 45, //OK
                entryToken: usdc, //OK
                curvePool: "0xBaaa1F5DbA42C3389bDbc2c9D2dE134F5cD0Dc89", // OK
                poolToken: frax, // OK
                poolSize: 3, // OK
                tokenIndexInCurve: 0, // OK 
                convexPoolAddress: "0xF403C135812408BFbE8713b5A23a04b3D48AAE31", //OK
                convexPoold: 58 // OK
            },
            {
                weight: 38,
                entryToken: usdc, // OK
                curvePool: "0xCEAF7747579696A2F0bb206a14210e3c9e6fB269", // OK
                poolToken: crv3, // OK
                poolSize: 2, // OK
                tokenIndexInCurve: 1, // OK
                convexPoolAddress: "0xF403C135812408BFbE8713b5A23a04b3D48AAE31", // OK
                convexPoold: 59 // OK
            },
            {
                weight: 17,
                entryToken: usdc, // OK
                curvePool: "0x5a6A4D54456819380173272A5E8E9B9904BdF41B", // OK
                poolToken: crv3, // OK
                poolSize: 2, // OK 
                tokenIndexInCurve: 1, // OK
                convexPoolAddress: "0xF403C135812408BFbE8713b5A23a04b3D48AAE31", // OK 
                convexPoold: 40
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
