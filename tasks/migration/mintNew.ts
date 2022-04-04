import {task} from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import {parseEther} from "@ethersproject/units"
import { BigNumber } from 'ethers';
import { config as dotenvConfig } from 'dotenv';
import { formatBytes32String, parseBytes32String } from "@ethersproject/strings";
import { Bytes } from "@ethersproject/bytes";

task("mintNew", "mint tokens on new version")
    .setAction(async function (taskArgs, hre) {

        const network = hre.network.name;

        console.log(network);

        const ibAlluo = await hre.ethers.getContractAt("IbAlluoForMumbai", "0x71402a46d78a10c8eE7E7CdEf2AffeC8d1E312A1");
        const buffer = await hre.ethers.getContractAt("LiquidityBufferVaultForMumbai", "0x4f7917c053dB2ac459A7E931A96e552951cE7458");
        const token = await hre.ethers.getContractAt("TestERC20", "0xf40AaA8ed0adDb9140115D88579d06081d2EC41a");

        let oldVersion = "0xe6f724cC3133554aB6314cC9cc7B836ECe887843"

        let list: string[] = [
            '0x4b948c0354c82f1dc3c510bfa93578540dab917d', 
            '0xc24444c91a370151bdb06a0c11da8b1006fe1bbe', 
            '0xfb7a51c6f6a5116ac748c1adf4d4682c3d50889e',
            '0x9c205edd78bd7ea0a940847f1f98d5822f126e67',
            '0x76d885d38c219895758eaf45449bb4ed8f664f31'
        ];

        await ibAlluo.migrateStep1(oldVersion, list)
        // await ibAlluo.migrateStep2()
        
        

        console.log('mintNew task Done!');
    });
