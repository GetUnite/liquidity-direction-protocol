import { task } from "hardhat/config";

import { parseEther } from "@ethersproject/units"
import { BigNumber } from 'ethers';
import { config as dotenvConfig } from 'dotenv';
import { formatBytes32String, parseBytes32String } from "@ethersproject/strings";
import { Bytes } from "@ethersproject/bytes";
import { getHolders } from "../../../scripts/dev/getHolders";

import { writeFileSync } from 'fs';
import { join } from "path";

task("claimAll", "claim all balances on old alluoLp")
    .setAction(async function (taskArgs, hre) {

        const network = hre.network.name;

        console.log(network);

        const alluolp = await hre.ethers.getContractAt("AlluoLpV6", "0x29c66CF57a03d41Cfe6d9ecB6883aa0E2AbA21Ec");

        let holders: string[] = await getHolders(hre)

        let holdersInChunks = await chunkArray(holders, 90);

        for (let i = 0; i < holdersInChunks.length; i++) {
            let txn = await alluolp.claimAll(holdersInChunks[i])

            await writeClaiming(`\nChunk #${i} with hash: ` + txn.hash + "\n[")

            for (let g = 0; g < holdersInChunks[i].length; g++) {
                writeClaiming(`\"${holdersInChunks[i][g]}\",`)
            }

            await writeClaiming(`]`)
        }

        //in case some txn failed
        //part I
        // let list: string[] = []

        // await alluolp.claimAll(list)

        // again?
        //part II

        // for(let i = 0; i < list.length; i++){
        //     await alluolp.claim(list[i])
        //     console.log(list[i]);
        // }
    });

async function writeClaiming(line: string) {

    writeFileSync(join(__dirname, "./claiming.txt"), line + "\n", {
        flag: "a+",
    });
}

async function chunkArray(myArray: any[], chunk_size: number) {

    let tempArray = [];

    for (let index = 0; index < myArray.length; index += chunk_size) {
        let myChunk = myArray.slice(index, index + chunk_size);

        tempArray.push(myChunk);
    }
    console.log("Amount of chunks: " + tempArray.length);

    return tempArray;
}