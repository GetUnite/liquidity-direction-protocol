import {task} from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import {parseEther} from "@ethersproject/units"
import { BigNumber } from 'ethers';
import { config as dotenvConfig } from 'dotenv';
import { formatBytes32String, parseBytes32String } from "@ethersproject/strings";
import { Bytes } from "@ethersproject/bytes";

task("claimAll", "claim all balances from old alluoLp")
    .setAction(async function (taskArgs, hre) {

        const network = hre.network.name;

        console.log(network);

        const alluolp = await hre.ethers.getContractAt("AlluoLpV3", "0x29c66CF57a03d41Cfe6d9ecB6883aa0E2AbA21Ec");

        let list: string[] = [
            '0x4b948c0354c82f1dc3c510bfa93578540dab917d', 
            '0xc24444c91a370151bdb06a0c11da8b1006fe1bbe', 
            '0xfb7a51c6f6a5116ac748c1adf4d4682c3d50889e',
            '0x9c205edd78bd7ea0a940847f1f98d5822f126e67',
            '0x76d885d38c219895758eaf45449bb4ed8f664f31'
        ];
        
        let i =0;
        while(i < list.length){
            await alluolp.claim(list[i]);
            console.log("Claimed for:", list[i]);
            i++;
        }

        console.log('claimAll task Done!');
    });
