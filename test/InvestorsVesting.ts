import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { ethers } from 'hardhat'
import { expect } from 'chai'

import { AlluoToken, AlluoToken__factory, InvestorsVesting, InvestorsVesting__factory } from '../typechain'
import { parseEther } from '@ethersproject/units'
import { BigNumber } from '@ethersproject/bignumber'


async function incrementNextBlockTimestamp(amount: number): Promise<void> {
    return ethers.provider.send("evm_increaseTime", [amount]);
}

async function getLatestBlockTimestamp(): Promise<BigNumber> {
    let bl_num = await ethers.provider.send("eth_blockNumber", []);
    let cur_block = await ethers.provider.send("eth_getBlockByNumber", [bl_num, false]);
    return BigNumber.from(cur_block.timestamp);
}

async function mine() {
    await ethers.provider.send("evm_mine", []);
}


describe('Contract: InvestorsVesting', () => {
    let accounts: SignerWithAddress[];
    let investorsVesting: InvestorsVesting;
    let token: AlluoToken;

    const percentPrecision = 100;
    const tgeAvailiblePercent = 10;
    const monthsCount = 12;
    const month = 2628000;

    before(async function () {
        accounts = await ethers.getSigners();
    });

    beforeEach(async function () {
        const deployer = accounts[0].address;

        let AcceptedToken = await ethers.getContractFactory("AlluoToken") as AlluoToken__factory;
        let InvestorsVesting = await ethers.getContractFactory('InvestorsVesting') as InvestorsVesting__factory;

        token = await AcceptedToken.deploy(deployer) as AlluoToken;
        investorsVesting = await InvestorsVesting.deploy(token.address) as InvestorsVesting;

        await investorsVesting.deployed();
        await token.deployed();
    });

    it("Should check that everything is initialized", async function () {
        expect(await investorsVesting.PERCENT_PRECISION()).to.be.equal(percentPrecision);
        expect(await investorsVesting.TGE_AVAILIBLE_PERCENT()).to.be.equal(tgeAvailiblePercent);
        expect(await investorsVesting.MONTHS_COUNT()).to.be.equal(monthsCount);
        expect(await investorsVesting.MONTH()).to.be.equal(month);

        expect(await investorsVesting.isStarted()).to.be.false;
    });

    it("Should add private user", async function () {
        const user = [accounts[1].address, accounts[2].address, accounts[3].address];
        const amount = [1000, 2000, 3000];
        const amountSum = amount.reduce((a, b) => a + b, 0);

        const totalAccumulatedBefore = await investorsVesting.totalTokensToPay();

        await token.mint(investorsVesting.address, amountSum)
        await investorsVesting.addPrivateUser(user, amount);

        for (let index = 0; index < user.length; index++) {
            expect((await investorsVesting.users(user[index])).accumulated).to.be.equal(amount[index]);
        }

        expect(await investorsVesting.totalTokensToPay()).to.be.equal(totalAccumulatedBefore.add(amountSum));
    });

    it("Should add private user (user re-add check)", async function () {
        const users = [accounts[1].address, accounts[2].address, accounts[3].address];
        const amounts = [parseEther("1000"), parseEther("2000"), parseEther("3000")];
        const amountsSum = parseEther("6000");

        await token.mint(investorsVesting.address, amountsSum);
        await investorsVesting.addPrivateUser(users, amounts);

        expect(await investorsVesting.totalTokensToPay()).to.be.equal(amountsSum);

        for (let index = 0; index < users.length; index++) {
            const user = users[index];
            const amount = amounts[index];

            const info = await investorsVesting.getUserInfo(user);

            expect(info.availableAmount).to.be.equal(0);
            expect(info.paidOut).to.be.equal(0);
            expect(info.totalAmountToPay).to.be.equal(amount);
        }

        const newAmounts = [parseEther("2000"), parseEther("3000"), parseEther("4000")];
        const newAmountsSum = parseEther("9000");

        await token.mint(investorsVesting.address, newAmountsSum.sub(amountsSum));
        await investorsVesting.addPrivateUser(users, newAmounts);

        expect(await investorsVesting.totalTokensToPay()).to.be.equal(newAmountsSum);

        for (let index = 0; index < users.length; index++) {
            const user = users[index];
            const amount = newAmounts[index];

            const info = await investorsVesting.getUserInfo(user);

            expect(info.availableAmount).to.be.equal(0);
            expect(info.paidOut).to.be.equal(0);
            expect(info.totalAmountToPay).to.be.equal(amount);
        }
    });

    it("Should not add private user (not owner)", async function () {
        const notAdmin = accounts[1];
        await expect(investorsVesting.connect(notAdmin).addPrivateUser([], [])).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should not add private user (some amount is zero)", async function () {
        const users = [accounts[1].address, accounts[2].address, accounts[3].address];
        const amounts = [parseEther("1000"), 0, parseEther("3000")];

        await expect(investorsVesting.addPrivateUser(users, amounts)).to.be.revertedWith("Vesting: some amount is zero");
    });

    it("Should not add private user (no tokens on contract)", async function () {
        const account = accounts[1].address;
        const amount = parseEther("1000");

        // not sending any tokens
        await expect(investorsVesting.addPrivateUser([account], [amount])).to.be.revertedWith("Vesting: total tokens to pay exceed balance");
    });

    it("Should get user info", async function () {
        const user = accounts[1].address;
        const amount = parseEther("1000");

        await token.mint(investorsVesting.address, amount)
        await investorsVesting.addPrivateUser([user], [amount]);

        const info = await investorsVesting.getUserInfo(user);

        expect(info.availableAmount).to.be.equal(0);
    });

    it("Should start vesting countdown", async function () {
        const users = [accounts[1].address, accounts[2].address, accounts[3].address];
        const amounts = [parseEther("1000"), parseEther("2000"), parseEther("3000")];
        const amountsSum = parseEther("6000");

        await token.mint(investorsVesting.address, amountsSum)
        await investorsVesting.addPrivateUser(users, amounts);

        await investorsVesting.startCountdown();
        const blockTimestamp = await getLatestBlockTimestamp();

        for (let index = 0; index < users.length; index++) {
            const user = users[index];
            const amount = amounts[index];

            const balance = await token.balanceOf(user);
            expect(balance).to.be.equal(amount.mul(tgeAvailiblePercent).div(percentPrecision));
        }

        expect(await investorsVesting.isStarted()).to.be.true;
        expect(await investorsVesting.vestingStartTime()).to.be.equal(blockTimestamp);
        expect(await investorsVesting.vestingEndTime()).to.be.equal(blockTimestamp.add(monthsCount * month));
    });

    it("Should not start vesting countdown (not owner)", async function () {
        const notOwner = accounts[1];
        await expect(investorsVesting.connect(notOwner).startCountdown()).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should not start vesting countdown (already started)", async function () {
        await investorsVesting.startCountdown();
        await expect(investorsVesting.startCountdown()).to.be.revertedWith("Vesting: countdown is already started");
    });

    it("Should claim no tokens (before start)", async function () {
        const user = accounts[0].address;
        const amount = parseEther("1000");

        await token.mint(investorsVesting.address, amount)
        await investorsVesting.addPrivateUser([user], [amount]);

        const userBalanceBeforeClaim = await token.balanceOf(user);
        await investorsVesting.claimToken();
        const userBalanceAfterClaim = await token.balanceOf(user);

        expect(userBalanceBeforeClaim).to.be.equal(userBalanceAfterClaim);
    });

    it("Should claim no tokens (unknown user)", async function () {
        const user = accounts[1];

        await expect(investorsVesting.connect(user).claimToken()).to.be.revertedWith("Vesting: not enough tokens to claim");
    });

    it("Should claim no tokens (already claimed everything)", async function () {
        const user = accounts[0].address;
        const amount = parseEther("1000");

        await token.mint(investorsVesting.address, amount);
        await investorsVesting.addPrivateUser([user], [amount]);
        await investorsVesting.startCountdown();

        incrementNextBlockTimestamp(monthsCount * month);

        await investorsVesting.claimToken();
        await expect(investorsVesting.claimToken()).to.be.revertedWith("Vesting: not enough tokens to claim");
    });

    it("Should be able to claim 10% of tokens and beyond on countdown start", async function () {
        const user = accounts[0].address;
        const amount = parseEther("1000");

        await token.mint(investorsVesting.address, amount);
        await investorsVesting.addPrivateUser([user], [amount]);

        const userBalanceBeforeClaim = await token.balanceOf(user);
        await investorsVesting.startCountdown();
        await investorsVesting.claimToken();
        const userBalanceAfterClaim = await token.balanceOf(user);
        const income = userBalanceAfterClaim.sub(userBalanceBeforeClaim);

        const blockTimestamp = await getLatestBlockTimestamp();
        const vestingStartTime = await investorsVesting.vestingStartTime();

        const timeDiff = blockTimestamp.sub(vestingStartTime);

        const initialPercent = amount.mul(tgeAvailiblePercent).div(percentPrecision);
        const timeEarning = amount.sub(initialPercent).mul(timeDiff).div(monthsCount * month);

        expect(income).to.be.equal(initialPercent.add(timeEarning));
    });

    it("Should check token reclaim", async function () {
        const user = accounts[0].address;
        const amount = parseEther("1000");

        await token.mint(investorsVesting.address, amount);
        await investorsVesting.addPrivateUser([user], [amount]);

        const userBalanceBeforeFirstClaim = await token.balanceOf(user);
        await investorsVesting.startCountdown();

        const viewAmountFirst = await investorsVesting.getUserInfo(user);
        await investorsVesting.claimToken(); // first immediate claim
        const userBalanceAfterFirstClaim = await token.balanceOf(user);
        const firstIncome = userBalanceAfterFirstClaim.sub(userBalanceBeforeFirstClaim);

        await incrementNextBlockTimestamp((monthsCount / 2) * month); // half way
        await mine();

        const userBalanceBeforeSecondClaim = await token.balanceOf(user);
        const viewAmountSecond = await investorsVesting.getUserInfo(user);
        await investorsVesting.claimToken(); // second claim after ~half period
        const userBalanceAfterSecondClaim = await token.balanceOf(user);
        const secondIncome = userBalanceAfterSecondClaim.sub(userBalanceBeforeSecondClaim);

        const blockTimestamp = await getLatestBlockTimestamp();
        const vestingStartTime = await investorsVesting.vestingStartTime();

        const timeDiff = blockTimestamp.sub(vestingStartTime);

        const initialPercent = amount.mul(tgeAvailiblePercent).div(percentPrecision);
        const timeEarning = amount.sub(initialPercent).mul(timeDiff).div(monthsCount * month);

        expect(firstIncome.add(secondIncome)).to.be.equal(initialPercent.add(timeEarning));
        expect(viewAmountFirst.availableAmount).to.be.equal(0);
        expect(viewAmountSecond.availableAmount).to.be.equal(amount.sub(initialPercent).div(2));
    });

    it("Should claim all user tokens (beyond vesting period)", async function () {
        const user = accounts[0].address;
        const amount = parseEther("1000");

        await token.mint(investorsVesting.address, amount);
        await investorsVesting.addPrivateUser([user], [amount]);

        const userBalanceBeforeClaim = await token.balanceOf(user);
        await investorsVesting.startCountdown();

        incrementNextBlockTimestamp(monthsCount * month + 1);
        await mine();

        const viewAmount = await investorsVesting.getUserInfo(user);
        await investorsVesting.claimToken();
        const userBalanceAfterClaim = await token.balanceOf(user);

        expect(userBalanceAfterClaim).to.be.equal(userBalanceBeforeClaim.add(amount));
        expect(viewAmount.availableAmount).to.be.equal(amount.sub(amount.mul(tgeAvailiblePercent).div(percentPrecision)));
    });
})
