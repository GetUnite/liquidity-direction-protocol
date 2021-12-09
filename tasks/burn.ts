import {task} from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import {parseEther} from "@ethersproject/units"

task("burn", "burns tokens from account")
    .addParam("from", "from which account")
    .addParam("amount", "amount to burn")
    .setAction(async function (taskArgs, hre) {

        const network = hre.network.name;
        const fs = require('fs');
        const dotenv = require('dotenv');
        const envConfig = dotenv.parse(fs.readFileSync(`.env-${network}`))
        for (const k in envConfig) {
            process.env[k] = envConfig[k]
        }
        console.log(network);
        
        const [...addr] = await hre.ethers.getSigners();

        const token = await hre.ethers.getContractAt("AlluoToken", process.env.TOKEN_ADDR as string);
        
        await token.connect(addr[1]).burn(taskArgs.from, parseEther(taskArgs.amount));

        console.log('burn task Done!');
    });
