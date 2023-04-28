import { task } from "hardhat/config";

import { parseEther } from "@ethersproject/units"
import { BigNumber } from 'ethers';
import { config as dotenvConfig } from 'dotenv';
import { formatBytes32String, parseBytes32String } from "@ethersproject/strings";
import { Bytes } from "@ethersproject/bytes";
import { getHolders } from "../../../scripts/dev/getHolders";

task("last", "mint tokens on new version")
    .setAction(async function (taskArgs, hre) {

        const network = hre.network.name;

        console.log(network);

        const ibAlluo = await hre.ethers.getContractAt("IbAlluoUSD", "0xC2DbaAEA2EfA47EBda3E572aa0e55B742E408BF6");

        await ibAlluo.migrateStep2()

        console.log('last task Done!');
    });
