import {task} from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import {parseEther} from "@ethersproject/units"
import { BigNumber } from 'ethers';
import { config as dotenvConfig } from 'dotenv';
import { formatBytes32String, parseBytes32String } from "@ethersproject/strings";
import { Bytes } from "@ethersproject/bytes";
import { getHolders } from "../../scripts/dev/getHolders";

task("claimAll", "claim all balances on old alluoLp")
    .setAction(async function (taskArgs, hre) {

        const network = hre.network.name;

        console.log(network);

        const alluolp = await hre.ethers.getContractAt("AlluoLpV3", "0x29c66CF57a03d41Cfe6d9ecB6883aa0E2AbA21Ec");

        let holders: string[] = await getHolders(hre)
        
        for(let i = 0; i < holders.length; i++){
            // console.log(await alluolp.estimateGas.claim(holders[i]));
            await alluolp.claim(holders[i]);
            console.log("Claimed for:", holders[i]);
        }

        console.log('claimAll task Done!');
    });
