import * as dotenv from "dotenv";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { parseEther, parseUnits } from "ethers/lib/utils";
import { ethers, network } from "hardhat";
import { ICvxBooster, IERC20, IVoteExecutor, IUniversalCurveConvexStrategy, Unwinder } from "../typechain"

dotenv.config();

describe("Unwinder", async () => {
    let signers: SignerWithAddress[];
    let admin: SignerWithAddress;

    let unwinder: Unwinder;
    let strategy: IUniversalCurveConvexStrategy;
    let voteExecutor: IVoteExecutor;
    let dai: IERC20, usdc: IERC20, usdt: IERC20, frax: IERC20, crv: IERC20, cvx: IERC20;
    let convex: ICvxBooster;

    const someContractAddress = "0x00000000219ab540356cBB839Cbe05303d7705Fa";
    const exchange = "0x29c66CF57a03d41Cfe6d9ecB6883aa0E2AbA21Ec";
    const adminAddress = "0x1F020A4943EB57cd3b2213A66b355CB662Ea43C3";
    const adminRole = "0x0000000000000000000000000000000000000000000000000000000000000000";
    const zeroAddress = "0x0000000000000000000000000000000000000000";

    const transferAmount = parseUnits("1000.0", 6);

    const entry = [
        {
            weight: 45, //OK
            entryToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", //OK
            curvePool: "0xBaaa1F5DbA42C3389bDbc2c9D2dE134F5cD0Dc89", // OK
            poolToken: "0x853d955aCEf822Db058eb8505911ED77F175b99e", // OK
            poolSize: 3, // OK
            tokenIndexInCurve: 0, // OK 
            convexPoolAddress: "0xF403C135812408BFbE8713b5A23a04b3D48AAE31", //OK
            convexPoold: BigNumber.from(58) // OK
        },
        {
            weight: 38,
            entryToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // OK
            curvePool: "0xCEAF7747579696A2F0bb206a14210e3c9e6fB269", // OK
            poolToken: "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490", // OK
            poolSize: 2, // OK
            tokenIndexInCurve: 1, // OK
            convexPoolAddress: "0xF403C135812408BFbE8713b5A23a04b3D48AAE31", // OK
            convexPoold: BigNumber.from(59) // OK
        },
        {
            weight: 17,
            entryToken: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // OK
            curvePool: "0x5a6A4D54456819380173272A5E8E9B9904BdF41B", // OK
            poolToken: "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490", // OK
            poolSize: 2, // OK 
            tokenIndexInCurve: 1, // OK
            convexPoolAddress: "0xF403C135812408BFbE8713b5A23a04b3D48AAE31", // OK 
            convexPoold: BigNumber.from(40)
        }
    ]

    function validateEntries(
        arg0:
            ([number, string, string, string, number, number, string, BigNumber] &
            {
                weight: number;
                entryToken: string;
                curvePool: string;
                poolToken: string;
                poolSize: number;
                tokenIndexInCurve: number;
                convexPoolAddress: string;
                convexPoold: BigNumber;
            }),
        arg1:
            {
                weight: number;
                entryToken: string;
                curvePool: string;
                poolToken: string;
                poolSize: number;
                tokenIndexInCurve: number;
                convexPoolAddress: string;
                convexPoold: BigNumber;
            }
    ) {
        expect(arg0.weight).to.be.equal(arg1.weight);
        expect(arg0.entryToken).to.be.equal(arg1.entryToken);
        expect(arg0.curvePool).to.be.equal(arg1.curvePool);
        expect(arg0.poolToken).to.be.equal(arg1.poolToken);
        expect(arg0.poolSize).to.be.equal(arg1.poolSize);
        expect(arg0.tokenIndexInCurve).to.be.equal(arg1.tokenIndexInCurve);
        expect(arg0.convexPoolAddress).to.be.equal(arg1.convexPoolAddress);
        expect(arg0.convexPoold).to.be.equal(arg1.convexPoold);
    }

    async function incrementNextBlockTimestamp(amount: number): Promise<void> {
        return ethers.provider.send("evm_increaseTime", [amount]);
    }

    async function mine() {
        await ethers.provider.send("evm_mine", []);
    }

    before(async () => {

        await network.provider.request({
            method: "hardhat_reset",
            params: [{
                forking: {
                    enabled: true,
                    jsonRpcUrl: process.env.MAINNET_FORKING_URL as string,
                    //you can fork from last block by commenting next line
                    blockNumber: 14450115, 
                },
            },],
        });

        signers = await ethers.getSigners();

        strategy = await ethers.getContractAt("IUniversalCurveConvexStrategy", "0xa248Ba96d72005114e6C941f299D315757877c0e");
        voteExecutor = await ethers.getContractAt("IVoteExecutor", "0x85adEF77325af70AC8922195fB6010ce5641d739");
        dai = await ethers.getContractAt("IERC20", "0x6b175474e89094c44da98b954eedeac495271d0f");
        usdc = await ethers.getContractAt("IERC20", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
        usdt = await ethers.getContractAt("IERC20", "0xdAC17F958D2ee523a2206206994597C13D831ec7");
        frax = await ethers.getContractAt('IERC20', '0x853d955acef822db058eb8505911ed77f175b99e');
        convex = await ethers.getContractAt('ICvxBooster', "0xF403C135812408BFbE8713b5A23a04b3D48AAE31");
        crv = await ethers.getContractAt("IERC20", "0xD533a949740bb3306d119CC777fa900bA034cd52");
        cvx = await ethers.getContractAt("IERC20", "0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B");

        expect(await strategy.hasRole(adminRole, adminAddress)).to.be.true;
        expect(await voteExecutor.hasRole(adminRole, adminAddress)).to.be.true;

        const value = parseEther("2000.0");
        const iface = new ethers.utils.Interface([
            "function exchange(address from, address to, uint256 amountIn, uint256 minAmountOut) external payable returns(uint256)"
        ])

        await signers[0].sendTransaction({
            to: exchange,
            value: value,
            data: iface.encodeFunctionData("exchange", [zeroAddress, usdc.address, value, 0])
        });

        await ethers.provider.send(
            'hardhat_impersonateAccount',
            [adminAddress]
        );
        admin = await ethers.getSigner(adminAddress);

        await signers[0].sendTransaction({
            to: adminAddress,
            value: parseEther("5.0")
        });
    });

    beforeEach(async () => {
        const Unwinder = await ethers.getContractFactory("Unwinder");
        unwinder = await Unwinder.deploy(
            strategy.address,
            exchange,
            someContractAddress,
            voteExecutor.address,
            true);


        await strategy.connect(admin).grantRole(adminRole, unwinder.address);
        await voteExecutor.connect(admin).grantRole(adminRole, unwinder.address);
    });

    it("Should check initial values", async () => {
        expect(await unwinder.nextVotePoolId()).to.be.equal(0);
        expect(await unwinder.cvxRewards()).to.be.equal(cvx.address);
        expect(await unwinder.crvRewards()).to.be.equal(crv.address);
        expect(await unwinder.convex()).to.be.equal(convex.address);

        expect(await unwinder.strategy()).to.be.equal(strategy.address);
        expect(await unwinder.exchange()).to.be.equal(exchange);
        expect(await unwinder.voteExecutor()).to.be.equal(voteExecutor.address);
        expect((await unwinder.getActivePools()).length).to.be.equal(0);

        expect(await unwinder.hasRole(adminRole, someContractAddress)).to.be.true;
        expect(await unwinder.hasRole(adminRole, signers[0].address)).to.be.true;
    });

    it("Should check roles when deployed as not test", async () => {
        const Unwinder = await ethers.getContractFactory("Unwinder");
        unwinder = await Unwinder.deploy(
            strategy.address,
            exchange,
            someContractAddress,
            voteExecutor.address,
            false);

        expect(await unwinder.hasRole(adminRole, someContractAddress)).to.be.true;
        expect(await unwinder.hasRole(adminRole, signers[0].address)).to.be.false;
    });

    it("Should prevent setting gnosis as not contract", async () => {
        const Unwinder = await ethers.getContractFactory("Unwinder");
        await expect(Unwinder.deploy(
            strategy.address,
            exchange,
            signers[0].address,
            voteExecutor.address,
            false)).to.be.revertedWith("Unwinder: not contract");
    });

    it("Should be able to unwind all votes (keep rewards)", async () => {
        const receiver = signers[2];
        const exitCoin = usdc;

        await usdc.transfer(voteExecutor.address, transferAmount);
        (await unwinder.executeVote(entry)).wait();
        await incrementNextBlockTimestamp(3600);

        const coinBalanceBefore = await exitCoin.balanceOf(receiver.address);
        const crvBalanceBefore = await crv.balanceOf(receiver.address);
        const cvxBalanceBefore = await cvx.balanceOf(receiver.address);

        (await unwinder.unwindAll(100, exitCoin.address, receiver.address, false)).wait();
        await mine();

        for (let i = 0; i < entry.length; i++) {
            const element = entry[i];

            const poolInfo = await convex.poolInfo(element.convexPoold);
            const rewardsPool = await ethers.getContractAt("ICvxBaseRewardPool", poolInfo.crvRewards);
            const lpToken = await ethers.getContractAt("IERC20", poolInfo.lptoken);

            if (element.poolToken != exitCoin.address) {
                const poolToken = await ethers.getContractAt("IERC20", element.poolToken);
                expect(await poolToken.balanceOf(strategy.address)).to.be.equal(0);
            }

            expect(await rewardsPool.balanceOf(strategy.address)).to.be.equal(0);
            expect(await lpToken.balanceOf(strategy.address)).to.be.equal(0);

            const emptyEntry = await unwinder.getVotePool(i);
            expect(emptyEntry[1]).to.be.false;
            validateEntries(emptyEntry[0], {
                weight: 0,
                entryToken: zeroAddress,
                curvePool: zeroAddress,
                poolToken: zeroAddress,
                poolSize: 0,
                tokenIndexInCurve: 0,
                convexPoolAddress: zeroAddress,
                convexPoold: BigNumber.from("0")
            })
        }

        expect(await crv.balanceOf(strategy.address)).to.be.equal(0);
        expect(await cvx.balanceOf(strategy.address)).to.be.equal(0);
        expect(await exitCoin.balanceOf(strategy.address)).to.be.equal(0);

        const coinBalanceAfter = await exitCoin.balanceOf(receiver.address);
        const crvBalanceAfter = await crv.balanceOf(receiver.address);
        const cvxBalanceAfter = await cvx.balanceOf(receiver.address);

        expect(coinBalanceAfter).to.be.gt(coinBalanceBefore);
        expect(crvBalanceAfter).to.be.gt(crvBalanceBefore);
        expect(cvxBalanceAfter).to.be.gt(cvxBalanceBefore);

        expect((await unwinder.getActivePools()).length).to.be.equal(0);
    });

    it("Should be able to unwind *unregistered* vote (swap rewards)", async () => {
        const receiver = signers[1];
        const exitCoin = usdc;
        const coinBalanceBefore = await exitCoin.balanceOf(receiver.address);

        await usdc.transfer(voteExecutor.address, transferAmount);
        (await unwinder.executeVote(entry)).wait();
        await incrementNextBlockTimestamp(3600);

        await unwinder.unwindAny(entry, 100, exitCoin.address, receiver.address, true);

        for (let i = 0; i < entry.length; i++) {
            const element = entry[i];

            const poolInfo = await convex.poolInfo(element.convexPoold);
            const rewardsPool = await ethers.getContractAt("ICvxBaseRewardPool", poolInfo.crvRewards);
            const lpToken = await ethers.getContractAt("IERC20", poolInfo.lptoken)

            if (element.poolToken != exitCoin.address) {
                const poolToken = await ethers.getContractAt("IERC20", element.poolToken);
                expect(await poolToken.balanceOf(strategy.address)).to.be.equal(0);
            }
            expect(await rewardsPool.balanceOf(strategy.address)).to.be.equal(0);
            expect(await lpToken.balanceOf(strategy.address)).to.be.equal(0);
        }

        expect(await crv.balanceOf(strategy.address)).to.be.equal(0);
        expect(await cvx.balanceOf(strategy.address)).to.be.equal(0);
        expect(await exitCoin.balanceOf(strategy.address)).to.be.equal(0);

        expect(await crv.balanceOf(receiver.address)).to.be.equal(0);
        expect(await cvx.balanceOf(receiver.address)).to.be.equal(0);

        const coinBalanceAfter = await exitCoin.balanceOf(receiver.address);
        expect(coinBalanceAfter).to.be.gt(coinBalanceBefore);
    });

    it("Should execute votes", async () => {
        const times = 5
        for (let i = 0; i < times; i++) {
            await usdc.transfer(voteExecutor.address, transferAmount);
            await unwinder.executeVote(entry);

            expect(await unwinder.nextVotePoolId()).to.be.equal((i + 1) * entry.length);
            const activeVotes = await unwinder.getActivePools();

            expect(activeVotes.length).to.be.equal((i + 1) * entry.length);

            for (let j = 0; j < activeVotes.length; j++) {
                expect(activeVotes[j]).to.be.equal(j);
                const pool = await unwinder.getVotePool(j);
                validateEntries(pool[0], entry[j % entry.length])
                expect(pool[1]).to.be.true;
            }
        }
    });

    it("Should unwind only one pool of vote", async () => {
        const unwindIndex = 1
        const receiver = signers[1]

        await usdc.transfer(voteExecutor.address, transferAmount);
        (await unwinder.executeVote(entry)).wait();
        await incrementNextBlockTimestamp(3600);

        await unwinder.unwind([unwindIndex], 100, usdc.address, receiver.address, true);

        expect((await unwinder.getActivePools()).length).to.be.equal(entry.length - 1);

        for (let i = 0; i < entry.length; i++) {
            if (i == unwindIndex) continue;

            const activeEntry = await unwinder.getVotePool(i);
            expect(activeEntry[1]).to.be.true;
            validateEntries(activeEntry[0], entry[i])
        }
    })

    it("Should unwind only rewards", async () => {
        const unwindIndex = 1
        const receiver = signers[3]

        await usdc.transfer(voteExecutor.address, transferAmount);
        (await unwinder.executeVote(entry)).wait();
        await incrementNextBlockTimestamp(3600 * 24 * 180);
        await mine();
        await mine();

        const crvBalanceBefore = await crv.balanceOf(receiver.address);
        const cvxBalanceBefore = await cvx.balanceOf(receiver.address);

        await unwinder.unwindOnlyRewards([unwindIndex], usdc.address, receiver.address, false);

        const crvBalanceAfter = await crv.balanceOf(receiver.address);
        const cvxBalanceAfter = await cvx.balanceOf(receiver.address);

        expect(crvBalanceAfter).to.be.gt(crvBalanceBefore);
        expect(cvxBalanceAfter).to.be.gt(cvxBalanceBefore);
    });
})