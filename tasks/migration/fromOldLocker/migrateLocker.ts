import { task } from "hardhat/config";

import { BigNumber } from 'ethers';
import { getLockers } from "../../../scripts/dev/getLockers";

import { writeFileSync } from 'fs';
import { join } from "path";
import * as readline from 'readline';

function ask(query: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }))
}


task("migrateLocker", "claim all balances on old alluoLp")
    .setAction(async function (taskArgs, hre) {

        let alluoToken = await hre.ethers.getContractAt("IAlluoToken", "0x1E5193ccC53f25638Aa22a940af899B692e10B09");
        let balancerAlluoLp = await hre.ethers.getContractAt("TestERC20", "0x85Be1e46283f5f438D1f864c2d925506571d544f");

        let alluoOnBalancer = await alluoToken.balanceOf("0xBA12222222228d8Ba445958a75a0704d566BF2C8")

        let totalSupplyBalancerLp = await balancerAlluoLp.totalSupply()

        let alluoPerLp = alluoOnBalancer.mul(BigNumber.from(10000000000)).mul(BigNumber.from(100)).div(totalSupplyBalancerLp).div(BigNumber.from(80))
        console.log("Alluo per lp: ", Number(alluoPerLp) / 10 ** 10);

        let totalUsersLp = BigNumber.from(0)

        let addreses: string[] = []
        let amounts: BigNumber[] = []

        let oldLockers = await getLockers(hre, true)

        for (let i = 0; i < oldLockers.length; i++) {
            let user = oldLockers[i]
            let userAlluoAmount = user.staked.add(user.unlockAmount).add(user.claim)

            let userLpAmount = userAlluoAmount.mul(BigNumber.from(10000000000)).div(alluoPerLp)

            addreses.push(user.address)
            amounts.push(userLpAmount)

            writeFileSync(join(__dirname, "./migration.txt"), user.address + " " + Number(userLpAmount) / 10 ** 18 + `\n`, {
                flag: "a+",
            });

            totalUsersLp = totalUsersLp.add(userLpAmount)
        }

        let treasuryLpAmount = totalSupplyBalancerLp.sub(totalUsersLp)

        console.log("Total users lp amount: ", Number(totalUsersLp) / 10 ** 18);
        console.log("Treasury lp amount:    ", Number(treasuryLpAmount) / 10 ** 18);
        console.log("Treasury lp percentage:", (Number(treasuryLpAmount) / 10 ** 16) / (Number(totalSupplyBalancerLp) / 10 ** 18));

        let gnosis = "0x1F020A4943EB57cd3b2213A66b355CB662Ea43C3"

        addreses.push(gnosis)
        amounts.push(treasuryLpAmount)

        let locker = await hre.ethers.getContractAt("AlluoLockedV3", "0xF295EE9F1FA3Df84493Ae21e08eC2e1Ca9DebbAf");

        await ask(`Are you sure?`);

        await locker.migrationLock(addreses, amounts)
        console.log('claimAll task Done!');
    })
