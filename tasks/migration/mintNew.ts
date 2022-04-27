import {task} from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import {parseEther} from "@ethersproject/units"
import { BigNumber } from 'ethers';
import { config as dotenvConfig } from 'dotenv';
import { formatBytes32String, parseBytes32String } from "@ethersproject/strings";
import { Bytes } from "@ethersproject/bytes";
import { getHolders } from "../../scripts/dev/getHolders";

task("mintNew", "mint tokens on new version")
    .setAction(async function (taskArgs, hre) {

    const network = hre.network.name;

    console.log(network);

    const ibAlluo = await hre.ethers.getContractAt("IbAlluoUSD", "address");
    let alluoLp = "0x29c66CF57a03d41Cfe6d9ecB6883aa0E2AbA21Ec"

    let holders: string[] = await getHolders(hre)

    var holdersInChunks = await chunkArray(holders, 15);

    for(let i = 0; i < holdersInChunks.length; i++){
        await ibAlluo.migrateStep1(alluoLp, holdersInChunks[i])
    }

    console.log('mintNew task Done!');
});

async function chunkArray(myArray: any[], chunk_size: number){

    let tempArray = [];
    
    for (let index = 0; index < myArray.length; index += chunk_size) {
        let myChunk = myArray.slice(index, index+chunk_size);

        tempArray.push(myChunk);
    }

    return tempArray;
}