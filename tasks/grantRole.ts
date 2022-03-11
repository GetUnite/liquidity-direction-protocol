import {task} from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import {parseEther} from "@ethersproject/units"

task("role", "burns tokens from account")
    .setAction(async function (taskArgs, hre) {

        const network = hre.network.name;

        console.log(network);

        
        const [...addr] = await hre.ethers.getSigners();

        const strategy = await hre.ethers.getContractAt("UniversalCurveConvexStrategy", "strategy");


        await strategy.connect(addr[0]).grantRole(await strategy.DEFAULT_ADMIN_ROLE(), "executor")
        

        console.log('role task Done!');
    });
