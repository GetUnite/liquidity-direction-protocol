import {task} from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import {parseEther} from "@ethersproject/units"

task("mint", "creates new tokens")
    .addParam("to", "tokens receiver")
    .addParam("amount", "amount to mint")
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
        
        await token.connect(addr[1]).mint(taskArgs.to, parseEther(taskArgs.amount));

        console.log('mint task Done!');
    });
