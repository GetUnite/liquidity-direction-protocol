import { BigNumber, BigNumberish, constants } from "ethers";
import { defaultAbiCoder, formatUnits, parseUnits } from "ethers/lib/utils";
import { ethers, network } from "hardhat";
import { AlluoLockedV3Interface } from "../../typechain/AlluoLockedV3";

type Locker = {
    address: string,
    lpAmount: BigNumberish, // staked and active LPs
    alluoRewards: BigNumberish, // alluo rewards available to claim immediately
    unlocked: BigNumberish, // alluos that are no longer staked and will be available to withdraw
    depositUnlockTime: BigNumberish, // timestamp when user will be able to unstake LPs (but withdraw only in +7 days)
    withdrawUnlockTime: BigNumberish, // timestamp after unstake when user will be able to withdraw alluos
    dumpTimestamp: number,
}

async function main() {
    await network.provider.request({
        method: "hardhat_reset",
        params: [{
            forking: {
                enabled: true,
                jsonRpcUrl: process.env.MAINNET_FORKING_URL as string,
                blockNumber: 15817704
            },
        },],
    });

    const oldVlAlluo = await ethers.getContractAt("AlluoLockedV3", "0xF295EE9F1FA3Df84493Ae21e08eC2e1Ca9DebbAf");
    const lp = await ethers.getContractAt("IERC20Metadata", "0x85Be1e46283f5f438D1f864c2d925506571d544f");
    const balancer = await ethers.getContractAt("IBalancer", "0xBA12222222228d8Ba445958a75a0704d566BF2C8");
    const poolId = "0x85be1e46283f5f438d1f864c2d925506571d544f0002000000000000000001aa";
    const deployBlockNumber = 14794654;
    const currentBlock = await ethers.provider.getBlockNumber();

    const filterIn = oldVlAlluo.filters.Transfer(constants.AddressZero, null, null);

    const queryIn = await oldVlAlluo.queryFilter(
        filterIn,
        deployBlockNumber,
        currentBlock
    );

    const result: Locker[] = [];

    for (let i = 0; i < queryIn.length; i++) {
        const locker = queryIn[i];
        const to = locker.args.to;

        if (result.find((x) => x.address == to) != undefined) {
            continue;
        }

        let info;
        try {
            info = await oldVlAlluo.callStatic.getInfoByAddress(to);
        } catch (error: any) {
            const result: string = error.data;
            info = defaultAbiCoder.decode(
                ["uint256", "uint256", "uint256", "uint256", "uint256"],
                result
            )
        }

        result.push({
            address: to,
            lpAmount: info[0],
            alluoRewards: info[2],
            unlocked: info[1],
            depositUnlockTime: info[3],
            withdrawUnlockTime: info[4],
            dumpTimestamp: (await ethers.provider.getBlock(currentBlock)).timestamp,
        });
    }

    console.log("Loaded", result.length, "lockers");

    const oneToken = BigNumber.from("1000000000000000000");

    const lpTotalSupplyCurrent = await lp.totalSupply();
    const balancerInfoCurrent = await balancer.getPoolTokens(poolId);
    const alluoPoolBalanceCurrent = balancerInfoCurrent.balances[0];
    const totalAlluoTokensCurrent = alluoPoolBalanceCurrent.mul(10).div(8);
    const alluoPerLpCurrent = totalAlluoTokensCurrent.mul(oneToken).div(lpTotalSupplyCurrent)

    console.log("Currnet LP Total Supply is:", formatUnits(lpTotalSupplyCurrent, 18));
    console.log("Current Alluo amount in pool is:", formatUnits(alluoPoolBalanceCurrent, 18));
    console.log("Current total Alluo tokens is", formatUnits(totalAlluoTokensCurrent, 18));
    console.log("Current amount of ALLUO per LP:", formatUnits(alluoPerLpCurrent, 18));

    const totalAmounts: any = [];
    const usersToMigrateLock: any[] = [];
    for (let i = 0; i < result.length; i++) {
        const locker = result[i];

        const lpToAlluoAmountCurrent = (locker.lpAmount as BigNumber).mul(alluoPerLpCurrent).div(oneToken);

        let isUserMigrateLocking = false;
        if (locker.lpAmount > 0 && locker.address != "0x1F020A4943EB57cd3b2213A66b355CB662Ea43C3") {
            isUserMigrateLocking = true;
            usersToMigrateLock.push({
                address: locker.address,
                newStakeTotalAmountCurrentBlock: lpToAlluoAmountCurrent.add(locker.alluoRewards),
            });
        }

        totalAmounts.push({
            address: locker.address,
            currentLockedLp: formatUnits(locker.lpAmount, 18),
            alluoRewardsAvailable: formatUnits(locker.alluoRewards, 18),
            lpToTokenAmountCurrentBlock: formatUnits(lpToAlluoAmountCurrent, 18),
            newStakeTotalAmountCurrentBlock: formatUnits(lpToAlluoAmountCurrent.add(locker.alluoRewards), 18),
            unlockPendingAmount: formatUnits(locker.unlocked, 18),
            unlockRequestAfterLockingAvailableAt: (locker.depositUnlockTime as BigNumber).toNumber(),
            unlockedWithdrawAvailableAt: (locker.withdrawUnlockTime as BigNumber).toNumber(),
            dataDumpedAtBlockTimestamp: locker.dumpTimestamp,
            isUserMigrateLocking: isUserMigrateLocking
        })
    }



    const vlAlluo = (await ethers.getContractFactory("AlluoLockedV3")).interface as AlluoLockedV3Interface;

    console.log(
        vlAlluo.encodeFunctionData(
            "migrationLock",
            [
                usersToMigrateLock.map((x) => x.address),
                usersToMigrateLock.map((x) => x.newStakeTotalAmountCurrentBlock),
            ]
        )
    )
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
