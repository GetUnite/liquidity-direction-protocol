import { expect } from "chai";
import hre, { ethers, network, upgrades } from "hardhat";
import { BigNumber, ContractReceipt, ContractTransaction, Event } from 'ethers';
import { Contract, ContractFactory } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { parseEther } from "@ethersproject/units";
import { keccak256 } from "ethers/lib/utils";
import { AlluoLockedV3, IAlluoToken, PseudoMultisigWallet, TestERC20, AlluoLockedV2Final } from '../typechain';
import { getLockers } from "../scripts/dev/getLockers";
import { writeFileSync } from 'fs';
import { join } from "path";

let alluoToken: IAlluoToken;
let balancerAlluoLp: TestERC20;
let weth: TestERC20;

let Multisig: ContractFactory;
let multisig: PseudoMultisigWallet;

let Locker: ContractFactory;
let locker: AlluoLockedV3;
let oldLockerFinal: AlluoLockedV2Final;

let addr: Array<SignerWithAddress>;
let admin: SignerWithAddress;
let wethHolder: SignerWithAddress;

let oldLockers: any[];

let rewardPerDistribution: BigNumber = parseEther("86400");

let writeLogs: boolean = false;

async function getImpersonatedSigner(address: string): Promise<SignerWithAddress> {
    await ethers.provider.send(
        'hardhat_impersonateAccount',
        [address]
    );

    return await ethers.getSigner(address);
}

async function skipDays(days: number) {
    ethers.provider.send("evm_increaseTime", [days * 86400]);
    ethers.provider.send("evm_mine", []);
}

async function getEvents(txn: any, eventName: string, indexes: number[]) {
    const receipt = await txn.wait()

    let info: any[] = []
    for (let event of receipt.events!) {
        if (event.event == eventName) {
            for (let i = 0; i < indexes.length; i++) {
                info.push(event.args![indexes[i]])
            }
        }
    }
    return info;
}

async function migrate(): Promise<[string[], BigNumber[]]> {

    let alluoOnBalancer = await alluoToken.balanceOf("0xBA12222222228d8Ba445958a75a0704d566BF2C8")

    let totalSupplyBalancerLp = await balancerAlluoLp.totalSupply()

    let alluoPerLp = alluoOnBalancer.mul(BigNumber.from(10000000000)).mul(BigNumber.from(100)).div(totalSupplyBalancerLp).div(BigNumber.from(80))
    console.log("Alluo per lp: ", Number(alluoPerLp) / 10 ** 10);

    let totalUsersLp = BigNumber.from(0)

    let addreses: string[] = []
    let amounts: BigNumber[] = []

    oldLockers = await getLockers(hre, writeLogs)

    for (let i = 0; i < oldLockers.length; i++) {
        let user = oldLockers[i]
        let userAlluoAmount = user.staked.add(user.unlockAmount).add(user.claim)

        let userLpAmount = userAlluoAmount.mul(BigNumber.from(10000000000)).div(alluoPerLp)

        addreses.push(user.address)
        amounts.push(userLpAmount)
        if (writeLogs) {
            writeFileSync(join(__dirname, "./migration.txt"), user.address + " " + Number(userLpAmount) / 10 ** 18 + ` (${userLpAmount})` + `\n`, {
                flag: "a+",
            });
        }
        totalUsersLp = totalUsersLp.add(userLpAmount)
    }

    let treasuryLpAmount = totalSupplyBalancerLp.sub(totalUsersLp)

    console.log("Total users lp amount: ", Number(totalUsersLp) / 10 ** 18);
    console.log("Treasury lp amount:    ", Number(treasuryLpAmount) / 10 ** 18);
    console.log("Treasury lp percentage:", (Number(treasuryLpAmount) / 10 ** 16) / (Number(totalSupplyBalancerLp) / 10 ** 18));

    addreses.push(admin.address)
    amounts.push(treasuryLpAmount)

    if (writeLogs) {
        writeFileSync(join(__dirname, "./migration.txt"), admin.address + " " + Number(treasuryLpAmount) / 10 ** 18 + ` (${treasuryLpAmount})` + `\n`, {
            flag: "a+",
        });
    }
    await locker.connect(admin).migrationLock(addreses, amounts)
    return [addreses, amounts]
}

describe("Locking contract", function () {
    before(async function () {
        //We are forking Ethereum mainnet, please set Alchemy key in .env
        await network.provider.request({
            method: "hardhat_reset",
            params: [{
                //chainId: 1,
                forking: {
                    enabled: true,
                    jsonRpcUrl: process.env.MAINNET_FORKING_URL as string,
                    //you can fork from the last block by commenting next line
                    blockNumber: 14794595,
                },
            },],
        });
    });

    beforeEach(async function () {

        addr = await ethers.getSigners();

        const etherAmount = parseEther("10.0");
        admin = await getImpersonatedSigner("0x1F020A4943EB57cd3b2213A66b355CB662Ea43C3");
        wethHolder = await getImpersonatedSigner("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");
        await (await (await ethers.getContractFactory("ForceSender")).deploy({ value: etherAmount })).forceSend(admin.address);

        alluoToken = await ethers.getContractAt("IAlluoToken", "0x1E5193ccC53f25638Aa22a940af899B692e10B09");
        balancerAlluoLp = await ethers.getContractAt("TestERC20", "0x85Be1e46283f5f438D1f864c2d925506571d544f");
        weth = await ethers.getContractAt("TestERC20", "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");

        Multisig = await ethers.getContractFactory("PseudoMultisigWallet");
        multisig = await Multisig.deploy(true) as PseudoMultisigWallet;

        Locker = await ethers.getContractFactory("AlluoLockedV3");

        locker = await upgrades.deployProxy(Locker,
            [
                admin.address,
                0,
            ],
            { initializer: 'initialize', kind: 'uups' }
        ) as AlluoLockedV3;

        await alluoToken.connect(admin).mint(addr[0].address, parseEther("2000000"))

        await alluoToken.transfer(addr[1].address, parseEther("2500"));
        await alluoToken.transfer(addr[2].address, parseEther("7000"));
        await alluoToken.transfer(addr[3].address, parseEther("3500"));
        await alluoToken.transfer(addr[4].address, parseEther("35000"));

        await alluoToken.approve(locker.address, parseEther("1000000"));
        await locker.addReward(parseEther("1000000"))

        await alluoToken.connect(addr[1]).approve(locker.address, parseEther("2500"));
        await alluoToken.connect(addr[2]).approve(locker.address, parseEther("7000"));
        await alluoToken.connect(addr[3]).approve(locker.address, parseEther("3500"));
        await alluoToken.connect(addr[4]).approve(locker.address, parseEther("35000"));
    });

    afterEach(async () => {
        await alluoToken.connect(admin).burn(addr[1].address, await alluoToken.balanceOf(addr[1].address))
        await alluoToken.connect(admin).burn(addr[2].address, await alluoToken.balanceOf(addr[2].address))
        await alluoToken.connect(admin).burn(addr[3].address, await alluoToken.balanceOf(addr[3].address))
        await alluoToken.connect(admin).burn(addr[4].address, await alluoToken.balanceOf(addr[4].address))
    })
    describe("Migration", function () {
        // if the migration tests fail, uncomment chainId line in forking

        // it("Should do all migration steps and allow old and new users to do all actions", async function () {
        //     let [addreses, amounts] = await migrate()

        //     oldLocker = await ethers.getContractAt("AlluoLockedNew", "0x34618270647971a3203579380b61De79ecC474D1")
        //     oldLocker.connect(admin).changeUpgradeStatus(true)
        //     oldLocker.connect(admin).grantRole(await oldLocker.UPGRADER_ROLE(), addr[0].address)

        //     let OldFinalState = await ethers.getContractFactory("AlluoLockedV2Final")

        //     oldLockerFinal = await upgrades.upgradeProxy(oldLocker.address, OldFinalState) as AlluoLockedV2Final


        //     let amountOfLp = await balancerAlluoLp.balanceOf(oldLockerFinal.address)

        //     await oldLockerFinal.connect(admin).withdrawTokens(balancerAlluoLp.address, locker.address, amountOfLp)

        //     let balanceAfter = await balancerAlluoLp.balanceOf(locker.address)

        //     expect(balanceAfter).to.be.gt(BigNumber.from(0));

        //     expect(balanceAfter).to.equal(amountOfLp)

        //     let amoun10Percent = (await locker.totalSupply()).mul(BigNumber.from(10)).div(BigNumber.from(90))

        //     let amoun10PercentInAlluo = await locker.convertLpToAlluo(amoun10Percent)

        //     await alluoToken.connect(admin).mint(addr[1].address, amoun10PercentInAlluo)
        //     await alluoToken.connect(addr[1]).approve(locker.address, amoun10PercentInAlluo)

        //     await locker.connect(addr[1]).lock(amoun10PercentInAlluo);
        //     await locker.connect(admin).setReward(rewardPerDistribution)

        //     await skipDays(1);
        //     let claim10 = await locker.getClaim(addr[1].address)

        //     expect(claim10).to.be.lt(parseEther("8640"));
        //     expect(claim10).to.be.gt(parseEther("8500"));

        //     let randomOldLocker = await getImpersonatedSigner(addreses[13]);
        //     await (await (await ethers.getContractFactory("ForceSender")).deploy({ value: parseEther("10") })).forceSend(randomOldLocker.address);

        //     await expect(locker.connect(randomOldLocker).unlockAll()
        //     ).to.be.revertedWith("Locking: tokens not available");

        //     await skipDays(6);

        //     await locker.connect(addr[1]).unlock(parseEther("500"));
        //     await locker.connect(randomOldLocker).unlock(parseEther("500"));

        //     await skipDays(5);

        //     await locker.connect(addr[1]).withdraw();
        //     await locker.connect(randomOldLocker).withdraw();
        // });

    })
    describe("Basic functionality", function () {

        it("Should return info about vlAlluo", async function () {
            expect(await locker.name()).to.equal("Vote Locked Alluo Token"),
                expect(await locker.symbol()).to.equal("vlAlluo"),
                expect(await locker.decimals()).to.equal(18);
        });

        it("Should allow lock/unlock + withdraw", async function () {

            await locker.connect(addr[1]).lock(parseEther("1000"));
            await skipDays(7);

            await locker.connect(addr[1]).unlockAll();
            await skipDays(5);

            await locker.connect(addr[1]).withdraw();
        });
        it("Should allow lock weth + unlock", async function () {

            await weth.connect(wethHolder).transfer(addr[1].address, parseEther("5"))
            await weth.connect(addr[1]).approve(locker.address, parseEther("5"))

            await locker.connect(addr[2]).lock(parseEther("1000"));
            await locker.connect(addr[1]).lockWETH(parseEther("5"));

            await skipDays(7);

            await locker.connect(addr[1]).unlockAll();
            await skipDays(5);

            await locker.connect(addr[1]).withdraw();
        });
        it("Should not allow unlock and withdraw before the lock time expires", async function () {

            await locker.connect(addr[1]).lock(parseEther("1000"));
            await locker.connect(addr[2]).lock(parseEther("1000"));
            await skipDays(5);

            await expect(locker.connect(addr[1]).unlockAll()
            ).to.be.revertedWith("Locking: tokens not available");
            await expect(locker.connect(addr[2]).unlock(parseEther("500"))
            ).to.be.revertedWith("Locking: tokens not available");
            await skipDays(2);

            await locker.connect(addr[1]).unlockAll();

            await expect(locker.connect(addr[1]).withdraw()
            ).to.be.revertedWith("Locking: tokens not available");

            await skipDays(5);
            await locker.connect(addr[1]).withdraw();
        });
        it("Should not allow withdraw not unlocked tokens", async function () {
            await locker.connect(addr[1]).lock(parseEther("1000"));
            await skipDays(7);

            await expect(locker.connect(addr[1]).withdraw()
            ).to.be.revertedWith("Locking: not enough tokens");

            await locker.connect(addr[1]).unlockAll();
            await skipDays(5);

            await locker.connect(addr[1]).withdraw();
        });
        it("Should allow unlock specified amount", async function () {

            await locker.connect(addr[1]).lock(parseEther("1000"));
            await skipDays(7);

            let lp = await locker.convertAlluoToLp(parseEther("500"))
            await locker.connect(addr[1]).unlock(lp);

            await skipDays(6);
            await locker.connect(addr[1]).withdraw();

            let balance = await alluoToken.balanceOf(addr[1].address);
            expect(balance).to.be.lt(parseEther("2000"));
            expect(balance).to.be.gt(parseEther("1999"));
        });

        it("Should not allow unlock amount higher then locked", async function () {

            await locker.connect(addr[1]).lock(parseEther("1000"));
            await skipDays(7);

            await expect(locker.connect(addr[1]).unlock(parseEther("1500"))
            ).to.be.revertedWith("Locking: not enough lp tokens");

            await locker.connect(addr[1]).unlockAll()

            await expect(locker.connect(addr[1]).unlockAll()
            ).to.be.revertedWith("Locking: not enough lp tokens");
        });

        it("Should not allow claim 0 amount", async function () {
            await expect(locker.connect(addr[2]).claim()
            ).to.be.revertedWith("Locking: Nothing to claim");
        });

        it("Should return right total amount locked tokens after user lock/unlock", async function () {
            let amount = parseEther("1000");

            let txn = await locker.connect(addr[1]).lock(amount);

            let [lpAmountReturned] = await getEvents(txn, "TokensLocked", [3])

            await skipDays(7);
            expect(await locker.balanceOf(addr[1].address)).to.equal(lpAmountReturned);

            expect(await locker.totalSupply()).to.equal(lpAmountReturned);

            let lp = await locker.convertAlluoToLp(parseEther("500"))
            await locker.connect(addr[1]).unlock(lp);

            let unlockedBalance = await locker.unlockedBalanceOf(addr[1].address);

            expect(unlockedBalance).to.be.lt(parseEther("500"));
            expect(unlockedBalance).to.be.gt(parseEther("499"));

        });

        it("Should return right full info about locker", async function () {
            let amount = parseEther("1000");

            let txn = await locker.connect(addr[1]).lock(amount);
            let [lpAmountReturned] = await getEvents(txn, "TokensLocked", [3])

            await locker.connect(admin).setReward(rewardPerDistribution)
            await skipDays(7);

            let lp = await locker.convertAlluoToLp(parseEther("400"))
            await locker.connect(addr[1]).unlock(lp);

            let [locked, unlocked, forClaim, depositUnlockTime, withdrawUnlockTime] = await locker.getInfoByAddress(addr[1].address)
            expect(locked).to.equal(lpAmountReturned.sub(lp));
            expect(unlocked).to.be.lt(parseEther("400"));
            expect(unlocked).to.be.gt(parseEther("399"));
            expect(forClaim).to.be.gt(parseEther("604800"));
            expect(forClaim).to.be.lt(parseEther("604803"));
        });

    });

    describe("Reward calculation", function () {

        it("If there only one locker all rewards will go to him", async function () {

            await locker.connect(admin).setReward(rewardPerDistribution)

            await locker.connect(addr[1]).lock(parseEther("2500"));
            await skipDays(1);

            let claim = await locker.getClaim(addr[1].address);

            expect(claim).to.be.gt(parseEther("86400"));
            expect(claim).to.be.lt(parseEther("86404"));

            await skipDays(1);

            await locker.connect(addr[1]).claim();
            claim = await alluoToken.balanceOf(addr[1].address);

            expect(claim).to.be.gt(parseEther("172800"));
            expect(claim).to.be.lt(parseEther("172808"));
        });
        it("If there are two lockers lock at the same time rewards are distributed between them equally", async function () {

            await locker.connect(admin).setReward(rewardPerDistribution)

            await locker.connect(addr[1]).lock(parseEther("2500"));
            await locker.connect(addr[2]).lock(parseEther("2500"));
            await skipDays(1);

            let claim = await locker.getClaim(addr[1].address);

            expect(claim).to.be.gt(parseEther("43200"));
            expect(claim).to.be.lt(parseEther("43207"));

            await skipDays(1);

            await locker.connect(addr[1]).claim();
            await locker.connect(addr[2]).claim();
            let endBalance = await alluoToken.balanceOf(addr[1].address);
            expect(endBalance).to.be.gt(parseEther("86400"));
            expect(endBalance).to.be.lt(parseEther("86410"));
        });
        it("If there are two lockers the rewards are distributed in proportion to their share", async function () {

            await locker.connect(admin).setReward(parseEther("100000"))

            await locker.connect(addr[1]).lock(parseEther("1000"));
            await skipDays(1);
            let claim1 = await locker.getClaim(addr[1].address);
            expect(claim1).to.be.gt(parseEther("100000"));
            expect(claim1).to.be.lt(parseEther("100004"));

            await locker.connect(addr[2]).lock(parseEther("2000"));

            await skipDays(1);
            claim1 = await locker.getClaim(addr[1].address);
            let claim2 = await locker.getClaim(addr[2].address);
            expect(claim1).to.be.gt(parseEther("133332"));
            expect(claim1).to.be.lt(parseEther("133339"));


            expect(claim2).to.be.gt(parseEther("66664"));
            expect(claim2).to.be.lt(parseEther("66669"));

        });
        it("At the begining set reward to 0 and then change back", async function () {

            await locker.connect(addr[1]).lock(parseEther("1000"));
            await skipDays(10);
            let claim1 = await locker.getClaim(addr[1].address);
            expect(claim1).to.be.lt(parseEther("2"));

            await locker.connect(admin).setReward(parseEther("100000"))

            await skipDays(1);

            claim1 = await locker.getClaim(addr[1].address);
            expect(claim1).to.be.gt(parseEther("99999"));
            expect(claim1).to.be.lt(parseEther("100003"));

            await locker.connect(addr[2]).lock(parseEther("2000"));

            await skipDays(1);
            claim1 = await locker.getClaim(addr[1].address);
            let claim2 = await locker.getClaim(addr[2].address);
            expect(claim1).to.be.gt(parseEther("133332"));
            expect(claim1).to.be.lt(parseEther("133337"));


            expect(claim2).to.be.gt(parseEther("66664"));
            expect(claim2).to.be.lt(parseEther("66668"));

        });
        it("Full cycle with 4 lockers, different amount and time", async function () {

            await locker.connect(admin).setReward(rewardPerDistribution)

            // 1 day
            await locker.connect(addr[1]).lock(parseEther("1000"));
            await skipDays(1);
            // 2 day
            let claim = await locker.getClaim(addr[1].address);
            expect(claim).to.be.gt(parseEther("86400"));
            expect(claim).to.be.lt(parseEther("86403"));

            await locker.connect(addr[2]).lock(parseEther("2000"));
            await skipDays(1);
            // 3 day
            claim = await locker.getClaim(addr[1].address);
            expect(claim).to.be.gt(parseEther("115200"));
            expect(claim).to.be.lt(parseEther("115205"));

            await locker.connect(addr[3]).lock(parseEther("2500"));
            await skipDays(1);
            // 4 day
            claim = await locker.getClaim(addr[1].address);
            expect(claim).to.be.gt(parseEther("130909"));
            expect(claim).to.be.lt(parseEther("130917"));

            await locker.connect(addr[1]).lock(parseEther("1500"));
            await locker.connect(addr[4]).lock(parseEther("5000"));
            await skipDays(1);
            // 5 day
            //console.log((await locker.getClaim(addr[1].address)).toString());
            await skipDays(1);
            // 6 day
            //console.log((await locker.getClaim(addr[1].address)).toString());
            await skipDays(1);
            // 7 day
            await locker.connect(addr[2]).lock(parseEther("5000"));
            await locker.connect(addr[3]).lock(parseEther("1000"));
            await skipDays(1);
            // 8 day
            //console.log((await locker.getClaim(addr[1].address)).toString());
            await locker.connect(addr[4]).lock(parseEther("30000"));
            await skipDays(1);
            // 9 day
            //console.log((await locker.getClaim(addr[1].address)).toString());
            await skipDays(2);
            //end of 10 day

            expect(await locker.getClaim(addr[1].address)).to.be.lt(parseEther("210445"));
            expect(await locker.getClaim(addr[1].address)).to.be.gt(parseEther("210411"));

            expect(await locker.getClaim(addr[2].address)).to.be.lt(parseEther("203670"));
            expect(await locker.getClaim(addr[2].address)).to.be.gt(parseEther("203618"));

            expect(await locker.getClaim(addr[3].address)).to.be.lt(parseEther("128999"));
            expect(await locker.getClaim(addr[3].address)).to.be.gt(parseEther("128972"));

            expect(await locker.getClaim(addr[4].address)).to.be.lt(parseEther("321020"));
            expect(await locker.getClaim(addr[4].address)).to.be.gt(parseEther("320900"));

        });

    });

    describe("Admin functions and pause", async () => {
        it("Should not allow interaction with the contract on pause", async function () {

            await locker.connect(addr[1]).lock(parseEther("1000"));
            await skipDays(7);
            let lp = await locker.convertAlluoToLp(parseEther("500"))

            await locker.connect(addr[1]).unlock(lp);

            await locker.connect(admin).pause()

            await expect(locker.connect(addr[1]).unlockAll()
            ).to.be.revertedWith("Pausable: paused");
            await expect(locker.connect(addr[1]).claim()
            ).to.be.revertedWith("Pausable: paused");
            await expect(locker.connect(addr[1]).lock(parseEther("500"))
            ).to.be.revertedWith("Pausable: paused");
            await skipDays(5);
            await expect(locker.connect(addr[1]).withdraw()
            ).to.be.revertedWith("Pausable: paused");

            await locker.connect(admin).unpause()

            lp = await locker.convertAlluoToLp(parseEther("400"))

            await locker.connect(addr[1]).unlock(lp);
        });
    });


});