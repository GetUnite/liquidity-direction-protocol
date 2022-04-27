import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { BigNumber } from 'ethers';
import { Contract, ContractFactory } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { parseEther } from "@ethersproject/units";
import { keccak256 } from "ethers/lib/utils";
import { AlluoLocked, AlluoLockedNew, IAlluoToken, PseudoMultisigWallet, TestERC20 } from '../typechain';

import { Event } from "@ethersproject/contracts";

let Token: ContractFactory;
let lockingToken: IAlluoToken;
let rewardToken: IAlluoToken;

let Multisig: ContractFactory;
let multisig: PseudoMultisigWallet;

let Locker: ContractFactory;
let locker: AlluoLockedNew;

let addr: Array<SignerWithAddress>;
let admin: SignerWithAddress;

let rewardPerDistribution: BigNumber = parseEther("86400");
let startTime: number;
let distrbutionTime: number = 86400;

async function getTimestamp() {
    return (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
}

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

async function shiftToStart() {
    ethers.provider.send("evm_setNextBlockTimestamp", [startTime]);
    ethers.provider.send("evm_mine", []);
}

describe("Locking contract", function () {

    beforeEach(async function () {
        startTime = await getTimestamp() + 150;

        addr = await ethers.getSigners();

        const amountToAdmin = parseEther("10.0");
        admin = await getImpersonatedSigner("0x1F020A4943EB57cd3b2213A66b355CB662Ea43C3");
        await (await (await ethers.getContractFactory("ForceSender")).deploy({ value: amountToAdmin })).forceSend(admin.address);

        lockingToken = await ethers.getContractAt("IAlluoToken", "0x1E5193ccC53f25638Aa22a940af899B692e10B09");
        rewardToken = lockingToken;

        Multisig = await ethers.getContractFactory("PseudoMultisigWallet");
        multisig = await Multisig.deploy(true) as PseudoMultisigWallet;

        Locker = await ethers.getContractFactory("AlluoLocked");
        const NewLocker = await ethers.getContractFactory("AlluoLockedNew");

        const oldLocker = await upgrades.deployProxy(Locker,
            [
                admin.address,
                rewardPerDistribution,
                startTime,
                distrbutionTime,
                lockingToken.address,
                rewardToken.address
            ],
            { initializer: 'initialize', kind: 'uups' }
        ) as AlluoLocked;

        await oldLocker.connect(admin).grantRole(await oldLocker.UPGRADER_ROLE(), addr[0].address);
        await oldLocker.connect(admin).grantRole(await oldLocker.DEFAULT_ADMIN_ROLE(), multisig.address);
        await oldLocker.connect(admin).changeUpgradeStatus(true);

        locker = await upgrades.upgradeProxy(oldLocker, NewLocker) as AlluoLockedNew;
        await locker.connect(admin).initializeBalancerVersion();

        await lockingToken.connect(admin).mint(addr[0].address, parseEther("100000"))
        await rewardToken.connect(admin).mint(addr[0].address, parseEther("1000000"))

        await lockingToken.transfer(addr[1].address, parseEther("2500"));
        await lockingToken.transfer(addr[2].address, parseEther("7000"));
        await lockingToken.transfer(addr[3].address, parseEther("3500"));
        await lockingToken.transfer(addr[4].address, parseEther("35000"));

        await rewardToken.connect(addr[0]).approve(locker.address, parseEther("1000000"));

        await locker.addReward(parseEther("1000000"))

        await lockingToken.connect(addr[1]).approve(locker.address, parseEther("2500"));
        await lockingToken.connect(addr[2]).approve(locker.address, parseEther("7000"));
        await lockingToken.connect(addr[3]).approve(locker.address, parseEther("3500"));
        await lockingToken.connect(addr[4]).approve(locker.address, parseEther("35000"));
    });

    afterEach(async () => {
        expect(await lockingToken.balanceOf(locker.address)).to.be.equal(0);
    })

    describe("Basic functionality", function () {

        it("Should return info about vlAlluo", async function () {
            expect(await locker.name()).to.equal("Vote Locked Alluo Token"),
                expect(await locker.symbol()).to.equal("vlAlluo"),
                expect(await locker.decimals()).to.equal(18);
        });
        it("Should not allow to lock before start", async function () {
            await expect(locker.connect(addr[1]).lock(parseEther("1000"))
            ).to.be.revertedWith("Locking: locking time has not come yet");
        });
        it("Should allow lock/unlock + withdraw", async function () {
            await shiftToStart();

            await locker.update();
            await locker.connect(addr[1]).lock(parseEther("1000"));
            await skipDays(7);

            await locker.connect(addr[1]).unlockAll();
            await skipDays(5);

            await locker.connect(addr[1]).withdraw();
        });
        it("Should not allow unlock and withdraw before the lock time expires", async function () {
            await shiftToStart();

            await locker.update();
            await locker.connect(addr[1]).lock(parseEther("1000"));
            await locker.connect(addr[2]).lock(parseEther("1000"));
            await skipDays(5);

            await expect(locker.connect(addr[1]).unlockAll()
            ).to.be.revertedWith("Locking: Locked tokens are not available yet");
            await expect(locker.connect(addr[2]).unlock(parseEther("500"))
            ).to.be.revertedWith("Locking: Locked tokens are not available yet");
            await skipDays(2);

            await locker.connect(addr[1]).unlockAll();

            await expect(locker.connect(addr[1]).withdraw()
            ).to.be.revertedWith("Locking: Unlocked tokens are not available yet");

            await skipDays(5);
            await locker.connect(addr[1]).withdraw();
        });
        it("Should not allow withdraw not unlocked tokens", async function () {
            await shiftToStart();

            await locker.update();
            await locker.connect(addr[1]).lock(parseEther("1000"));
            await skipDays(7);

            await expect(locker.connect(addr[1]).withdraw()
            ).to.be.revertedWith("Locking: Not enough tokens to withdraw");

            await locker.connect(addr[1]).unlockAll();
            await skipDays(5);

            await locker.connect(addr[1]).withdraw();
        });
        it("Should allow unlock specified amount", async function () {
            await shiftToStart();

            await lockingToken.connect(addr[1]).transfer(addr[9].address, parseEther("2500"))
            await lockingToken.connect(addr[9]).approve(locker.address, parseEther("2500"))

            await locker.connect(addr[9]).lock(parseEther("1000"));
            await skipDays(7);

            await locker.connect(addr[9]).unlock(parseEther("500"));

            await skipDays(6);
            await locker.connect(addr[9]).withdraw();
            expect(await lockingToken.balanceOf(addr[9].address)).to.equal(parseEther("2000"));
        });

        it("Should allow to unlock and claim at the same time", async function () {
            await shiftToStart();

            await locker.connect(addr[1]).lock(parseEther("1000"));
            await skipDays(7);

            await locker.connect(addr[1]).claimAndUnlock();
        });
        it("Should not allow unlock amount higher then locked", async function () {
            await shiftToStart();

            await locker.connect(addr[1]).lock(parseEther("1000"));
            await skipDays(7);

            await expect(locker.connect(addr[1]).unlock(parseEther("1500"))
            ).to.be.revertedWith("Locking: Not enough tokens to unlock");

            await locker.connect(addr[1]).unlock(parseEther("1000"))

            await expect(locker.connect(addr[1]).unlockAll()
            ).to.be.revertedWith("Locking: Not enough tokens to unlock");
        });

        it("Should not allow claim 0 amount", async function () {
            await shiftToStart();
            await expect(locker.connect(addr[2]).claim()
            ).to.be.revertedWith("Locking: Nothing to claim");
        });

        it("Should return right total amount locked tokens after user lock/unlock", async function () {
            await shiftToStart();

            let amount = parseEther("1000");

            await locker.connect(addr[1]).lock(amount);
            await skipDays(7);
            expect(await locker.balanceOf(addr[1].address)).to.equal(amount);

            await locker.connect(addr[1]).unlock(parseEther("500"));

            expect(await locker.unlockedBalanceOf(addr[1].address)).to.equal(parseEther("500"));

            expect(await locker.totalSupply()).to.equal(amount);

        });

        it("Should return right full info about locker", async function () {
            await shiftToStart();

            let amount = parseEther("1000");

            await locker.connect(addr[1]).lock(amount);
            await skipDays(7);

            await locker.connect(addr[1]).unlock(parseEther("400"));

            let [locked, unlocked, forClaim, depositUnlockTime, withdrawUnlockTime] = await locker.getInfoByAddress(addr[1].address)
            expect(locked).to.equal(parseEther("600"));
            expect(unlocked).to.equal(parseEther("400"));
            expect(forClaim).to.be.gt(parseEther("604800"));
            expect(forClaim).to.be.lt(parseEther("604803"));
            expect(depositUnlockTime).to.equal(0);
            expect(withdrawUnlockTime).to.gt(startTime + 86400 * 12);
            expect(withdrawUnlockTime).to.lt(startTime + 86400 * 12 + 120);

        });

    });
    describe("Migration", function () {
        it("Should allow turn on migration by admin but not by others", async function () {

            await shiftToStart();

            // await expect(locker.connect(addr[1]).changeMigrationStatus(true)
            // ).to.be.reverted();

            let ABI = ["function changeMigrationStatus(bool _status)"];
            let iface = new ethers.utils.Interface(ABI);
            const calldata = iface.encodeFunctionData("changeMigrationStatus", [true]);

            await multisig.executeCall(locker.address, calldata);

        });

        it("Should allow withdraw all funds when migration is on", async function () {

            await shiftToStart();

            await locker.connect(addr[1]).lock(parseEther("1000"));
            await skipDays(1);

            let ABI = ["function changeMigrationStatus(bool _status)"];
            let iface = new ethers.utils.Interface(ABI);
            const calldata = iface.encodeFunctionData("changeMigrationStatus", [true]);

            await multisig.executeCall(locker.address, calldata);

            await locker.connect(addr[1]).migrate();
        });
    });
    describe("Reward calculation", function () {

        it("If there only one locker all rewards will go to him", async function () {

            await shiftToStart();

            await locker.connect(addr[1]).lock(parseEther("1000"));
            await skipDays(1);

            let claim = await locker.getClaim(addr[1].address);
            //console.log(claim.toString());

            expect(claim).to.be.gt(parseEther("86400"));
            expect(claim).to.be.lt(parseEther("86403"));

            await skipDays(1);

            await locker.connect(addr[1]).claim();
            claim = await rewardToken.balanceOf(addr[1].address);
            //console.log(claim.toString());

            expect(claim).to.be.gt(parseEther("172800"));
            expect(claim).to.be.lt(parseEther("172804"));
        });
        it("If there are two lockers lock at the same time rewards are distributed between them equally", async function () {

            await shiftToStart();

            await locker.connect(addr[1]).lock(parseEther("1000"));
            await locker.connect(addr[2]).lock(parseEther("1000"));
            await skipDays(1);

            let claim = await locker.getClaim(addr[1].address);
            //console.log(claim.toString());

            expect(claim).to.be.gt(parseEther("43200"));
            expect(claim).to.be.lt(parseEther("43203"));

            await skipDays(1);

            await locker.connect(addr[2]).claim();
            claim = await rewardToken.balanceOf(addr[2].address);
            //console.log(claim.toString());

            expect(claim).to.be.gt(parseEther("86400"));
            expect(claim).to.be.lt(parseEther("86403"));
        });
        it("If there are two lockers the rewards are distributed in proportion to their share", async function () {
            await shiftToStart();

            let ABI = ["function setReward(uint256 _amounts)"];
            let iface = new ethers.utils.Interface(ABI);
            const calldata = iface.encodeFunctionData("setReward", [parseEther("100000")]);

            await multisig.executeCall(locker.address, calldata);

            //await locker.connect(multisig).setReward(parseEther("100000"))

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
            expect(claim1).to.be.lt(parseEther("133338"));


            expect(claim2).to.be.gt(parseEther("66665"));
            expect(claim2).to.be.lt(parseEther("66668"));

        });
        it("At the begining set reward to 0 and then change back", async function () {
            await shiftToStart();

            let ABI = ["function setReward(uint256 _amounts)"];
            let iface = new ethers.utils.Interface(ABI);
            let calldata = iface.encodeFunctionData("setReward", [0]);

            await multisig.executeCall(locker.address, calldata);

            await locker.connect(addr[1]).lock(parseEther("1000"));
            await skipDays(10);
            let claim1 = await locker.getClaim(addr[1].address);
            expect(claim1).to.be.lt(parseEther("2"));


            ABI = ["function setReward(uint256 _amounts)"];
            iface = new ethers.utils.Interface(ABI);
            calldata = iface.encodeFunctionData("setReward", [parseEther("100000")]);

            await multisig.executeCall(locker.address, calldata);

            await skipDays(1);

            claim1 = await locker.getClaim(addr[1].address);
            expect(claim1).to.be.gt(parseEther("100000"));
            expect(claim1).to.be.lt(parseEther("100003"));

            await locker.connect(addr[2]).lock(parseEther("2000"));

            await skipDays(1);
            claim1 = await locker.getClaim(addr[1].address);
            let claim2 = await locker.getClaim(addr[2].address);
            expect(claim1).to.be.gt(parseEther("133332"));
            expect(claim1).to.be.lt(parseEther("133337"));


            expect(claim2).to.be.gt(parseEther("66665"));
            expect(claim2).to.be.lt(parseEther("66668"));

        });
        it("Full cycle with 4 lockers, different amount and time", async function () {

            await shiftToStart();
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
            expect(claim).to.be.lt(parseEther("115203"));

            await locker.connect(addr[3]).lock(parseEther("2500"));
            await skipDays(1);
            // 4 day
            claim = await locker.getClaim(addr[1].address);
            expect(claim).to.be.gt(parseEther("130909"));
            expect(claim).to.be.lt(parseEther("130912"));

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

            expect(await locker.getClaim(addr[1].address)).to.be.lt(parseEther("210414"));
            expect(await locker.getClaim(addr[1].address)).to.be.gt(parseEther("210411"));

            expect(await locker.getClaim(addr[2].address)).to.be.lt(parseEther("203622"));
            expect(await locker.getClaim(addr[2].address)).to.be.gt(parseEther("203618"));

            expect(await locker.getClaim(addr[3].address)).to.be.lt(parseEther("128976"));
            expect(await locker.getClaim(addr[3].address)).to.be.gt(parseEther("128972"));

            expect(await locker.getClaim(addr[4].address)).to.be.lt(parseEther("321002"));
            expect(await locker.getClaim(addr[4].address)).to.be.gt(parseEther("320998"));

        });

    });

    describe("Admin functions and pause", async () => {
        it("Should not allow interaction with the contract on pause", async function () {
            await shiftToStart();

            await locker.connect(addr[1]).lock(parseEther("1000"));
            await skipDays(7);
            await locker.connect(addr[1]).unlock(parseEther("500"));

            let ABI = ["function pause()"];
            let iface = new ethers.utils.Interface(ABI);
            let calldata = iface.encodeFunctionData("pause", []);

            await multisig.executeCall(locker.address, calldata);

            await expect(locker.connect(addr[1]).unlockAll()
            ).to.be.revertedWith("Pausable: paused");
            await expect(locker.connect(addr[1]).claim()
            ).to.be.revertedWith("Pausable: paused");
            await expect(locker.connect(addr[1]).lock(parseEther("500"))
            ).to.be.revertedWith("Pausable: paused");
            await skipDays(5);
            await expect(locker.connect(addr[1]).withdraw()
            ).to.be.revertedWith("Pausable: paused");


            ABI = ["function unpause()"];
            iface = new ethers.utils.Interface(ABI);
            calldata = iface.encodeFunctionData("unpause", []);

            await multisig.executeCall(locker.address, calldata);

        });
    });

    describe("Mainnet upgrade", async () => {
        it("Should check if upgrade is good", async () => {
            const oldLocker = await ethers.getContractAt("AlluoLocked", "0x34618270647971a3203579380b61De79ecC474D1");
            const NewLocker = await ethers.getContractFactory("AlluoLockedNew");

            await oldLocker.connect(admin).grantRole(await oldLocker.UPGRADER_ROLE(), addr[0].address);
            await oldLocker.connect(admin).changeUpgradeStatus(true);

            const newLocker = await upgrades.upgradeProxy(oldLocker, NewLocker) as AlluoLockedNew;

            if (await lockingToken.balanceOf(newLocker.address))
                console.log("Alluo balance on locker detected.");
            await newLocker.connect(admin).initializeBalancerVersion();

            expect(await lockingToken.balanceOf(newLocker.address)).to.be.equal(0);
        })
    });
});