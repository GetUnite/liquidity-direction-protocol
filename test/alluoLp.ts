import { parseEther, parseUnits } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, BigNumberish } from "ethers";
import { ethers } from "hardhat";
import { before } from "mocha";
import { PseudoMultisigWallet, PseudoMultisigWallet__factory, TestERC20, TestERC20__factory, UrgentAlluoLp, UrgentAlluoLp__factory } from "../typechain";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

async function incrementNextBlockTimestamp(amount: number): Promise<void> {
    return ethers.provider.send("evm_increaseTime", [amount]);
}

async function getLatestBlockTimestamp(): Promise<BigNumber> {
    let bl_num = await ethers.provider.send("eth_blockNumber", []);
    let cur_block = await ethers.provider.send("eth_getBlockByNumber", [bl_num, false]);
    return BigNumber.from(cur_block.timestamp);
}

async function skipDays(d: number) {
    ethers.provider.send('evm_increaseTime', [d * 86400]);
    ethers.provider.send('evm_mine', []);
}

describe("AlluoLP", function () {
    let signers: SignerWithAddress[];

    let alluoLp: UrgentAlluoLp;
    let multisig: PseudoMultisigWallet;
    let token: TestERC20;

    let backendExecutor: SignerWithAddress;
    let backendSigners: SignerWithAddress[];

    before(async function () {
        signers = await ethers.getSigners();

        backendExecutor = signers[5];
        backendSigners = [
            signers[6],
            signers[7],
            signers[8]
        ];
    });

    beforeEach(async function () {
        const AlluoLP = await ethers.getContractFactory("UrgentAlluoLp") as UrgentAlluoLp__factory;
        const Multisig = await ethers.getContractFactory("PseudoMultisigWallet") as PseudoMultisigWallet__factory;
        const Token = await ethers.getContractFactory("TestERC20") as TestERC20__factory;

        multisig = await Multisig.deploy();
        token = await Token.deploy();
        alluoLp = await AlluoLP.deploy(multisig.address, token.address);
    });

    it("Should create bridged tokens", async function () {
        // address that will get minted tokens
        const recipient = signers[1];
        // amount of tokens to be minted, including decimals value of token
        const amount = ethers.utils.parseUnits("10.0", await alluoLp.decimals());

        expect(await alluoLp.balanceOf(recipient.address)).to.be.equal(0);

        await mint(recipient, amount);

        expect(await alluoLp.balanceOf(recipient.address)).to.be.equal(amount);
    });

    it("Should not deploy contract (attempt to put EOA as multisig wallet)", async function () {
        const eoa = signers[1];

        const AlluoLP = await ethers.getContractFactory("UrgentAlluoLp");
        const deployPromise = AlluoLP.deploy(eoa.address, token.address);
        await expect(deployPromise).to.be.revertedWith("UrgentAlluoLp: not contract");
    });

    it("Should allow user to burn tokens for withdrawal", async () => {
        const recipient = signers[1];
        const amount = ethers.utils.parseUnits("10.0", await alluoLp.decimals());

        await mint(recipient, amount);

        await expect(alluoLp.connect(recipient).withdraw(amount))
            .to.emit(alluoLp, "BurnedForWithdraw")
            .withArgs(recipient.address, amount);
    });

    it("Should allow admin to withdraw and burn tokens in bulk", async () => {
        const recipient = signers[1];
        const amount = ethers.utils.parseUnits("10.0", await alluoLp.decimals());

        await mint(recipient, amount);

        let ABI = ["function withdrawBulk(uint256[] _amounts, address[] _users)"];
        let iface = new ethers.utils.Interface(ABI);
        const calldata = iface.encodeFunctionData("withdrawBulk", [[amount],[recipient.address]]);

        await multisig.executeCall(alluoLp.address, calldata);

        expect(await alluoLp.balanceOf(recipient.address)).to.be.equal(0);
    });

    it("Should grant role that can be granted only to contract", async () => {
        const role = await alluoLp.DEFAULT_ADMIN_ROLE();
        const NewContract = await ethers.getContractFactory('PseudoMultisigWallet') as PseudoMultisigWallet__factory;
        const newContract = await NewContract.deploy();

        expect(await alluoLp.hasRole(role, newContract.address)).to.be.false;

        let ABI = ["function grantRole(bytes32 role, address account)"];
        let iface = new ethers.utils.Interface(ABI);
        const calldata = iface.encodeFunctionData("grantRole", [role, newContract.address]);

        await multisig.executeCall(alluoLp.address, calldata);

        expect(await alluoLp.hasRole(role, newContract.address)).to.be.true;
    });

    it("Should not grant role that can be granted only to contract", async () => {
        const role = await alluoLp.DEFAULT_ADMIN_ROLE();
        const target = signers[1];

        expect(await alluoLp.hasRole(role, target.address)).to.be.false;

        let ABI = ["function grantRole(bytes32 role, address account)"];
        let iface = new ethers.utils.Interface(ABI);
        const calldata = iface.encodeFunctionData("grantRole", [role, target.address]);

        const tx = multisig.executeCall(alluoLp.address, calldata);

        expect(tx).to.be.revertedWith("UrgentAlluoLp: not contract");
    });

    it("Should set new interest", async () => {
        const newInterest = 9;
        const oldInterest = await alluoLp.interest();

        expect(oldInterest).to.be.not.equal(newInterest);

        let ABI = ["function setInterest(uint8 _newInterest)"];
        let iface = new ethers.utils.Interface(ABI);
        const calldata = iface.encodeFunctionData("setInterest", [newInterest]);

        await expect(multisig.executeCall(alluoLp.address, calldata))
            .to.emit(alluoLp, "InterestChanged")
            .withArgs(oldInterest, newInterest);
    });

    it("Should not set new interest (caller without DEFAULT_ADMIN_ROLE)", async () => {
        const newInterest = 9;
        const role = await alluoLp.DEFAULT_ADMIN_ROLE();
        const notAdmin = signers[1];

        await expect(alluoLp.connect(notAdmin).setInterest(newInterest)).to.be
            .revertedWith(`AccessControl: account ${notAdmin.address.toLowerCase()} is missing role ${role}`);
    });

    it("Should set new update time limit", async () => {
        const newLimit = 7200;
        const oldLimit = await alluoLp.updateTimeLimit();

        expect(newLimit).to.not.be.equal(oldLimit);

        let ABI = ["function setUpdateTimeLimit(uint256 _newLimit)"];
        let iface = new ethers.utils.Interface(ABI);
        const calldata = iface.encodeFunctionData("setUpdateTimeLimit", [newLimit]);

        await expect(multisig.executeCall(alluoLp.address, calldata)).to.emit(alluoLp, "UpdateTimeLimitSet").withArgs(oldLimit, newLimit);
    });

    it("Should not set new update time limit (caller without DEFAULT_ADMIN_ROLE)", async () => {
        const newLimit = 7200;
        const notAdmin = signers[1];
        const role = await alluoLp.DEFAULT_ADMIN_ROLE();

        await expect(alluoLp.connect(notAdmin).setUpdateTimeLimit(newLimit)).to.be
            .revertedWith(`AccessControl: account ${notAdmin.address.toLowerCase()} is missing role ${role}`);
    });

    it("Should set new wallet", async () => {
        const NewWallet = await ethers.getContractFactory('PseudoMultisigWallet') as PseudoMultisigWallet__factory;
        const newWallet = await NewWallet.deploy();
        const oldWallet = await alluoLp.wallet();

        expect(newWallet.address).to.not.be.equal(oldWallet);

        let ABI = ["function setWallet(address newWallet)"];
        let iface = new ethers.utils.Interface(ABI);
        const calldata = iface.encodeFunctionData("setWallet", [newWallet.address]);

        await expect(multisig.executeCall(alluoLp.address, calldata)).to.emit(alluoLp, "NewWalletSet").withArgs(oldWallet, newWallet.address);
    });

    it("Should not set new wallet (attempt to make wallet an EOA)", async () => {
        const newWallet = signers[2]

        let ABI = ["function setWallet(address newWallet)"];
        let iface = new ethers.utils.Interface(ABI);
        const calldata = iface.encodeFunctionData("setWallet", [newWallet.address]);

        const tx = multisig.executeCall(alluoLp.address, calldata);

        await expect(tx).to.be.revertedWith("UrgentAlluoLp: not contract")
    })

    describe('Token transfers and apy calculation', function () {
        it('Should return right user balance after one year even without claim', async function () {

            // address that will get minted tokens
            const recepient = signers[3];
            // amount of tokens to be minted, including decimals value of alluoLp
            const amount = ethers.utils.parseUnits("100.0", await alluoLp.decimals());

            await mint(recepient, amount);

            await skipDays(365);

            //view function that returns balance with APY
            let balance = await alluoLp.getBalance(signers[3].address);
            //console.log(balance.toString());
            expect(balance).to.be.gt(parseUnits("107.9", await alluoLp.decimals()));
            expect(balance).to.be.lt(parseUnits("108.1", await alluoLp.decimals()));
        });
        it('Should not change DF more than once an hour', async function () {

            // address that will get minted tokens
            const recepient = signers[3];
            // amount of tokens to be minted, including decimals value of alluoLp
            const amount = ethers.utils.parseUnits("100.0", await alluoLp.decimals());

            await mint(recepient, amount);

            await skipDays(365);

            let balance = await alluoLp.getBalance(signers[3].address);

            alluoLp.update();
            let oldDF = alluoLp.DF().toString;
            //Does not change DF again
            alluoLp.update();
            let newDF = alluoLp.DF().toString;
            expect(oldDF).to.equal(newDF)
            balance = await alluoLp.getBalance(signers[3].address);
            expect(balance).to.be.gt(parseUnits("107.9", await alluoLp.decimals()));
            expect(balance).to.be.lt(parseUnits("108.1", await alluoLp.decimals()));
        });

        it('getBalance should return zero if user dont have tokens', async function () {

            let balance = await alluoLp.getBalance(signers[3].address);
            //console.log(balance.toString());
            expect(balance).to.equal(0);
        });

        it('Should correctly calculate balances over time and various transfers', async function () {

            const amount = ethers.utils.parseUnits("100.0", await alluoLp.decimals());

            //big holder to simulate transfers between users
            const largeAmount = ethers.utils.parseUnits("1000.0", await alluoLp.decimals());
            await mint(signers[9], largeAmount);

            //start
            await mint(signers[1], amount);
            await skipDays(73);

            //after first period
            await alluoLp.connect(signers[9]).transfer(signers[1].address, amount);
            await mint(signers[2], amount);
            await skipDays(73);

            //after second period
            await mint(signers[4], amount);
            await alluoLp.connect(signers[9]).transfer(signers[3].address, amount);
            await skipDays(73);

            //after third period
            await mint(signers[4], amount);
            await skipDays(73);

            //after fourth period
            await alluoLp.connect(signers[3]).claim(signers[3].address);
            await alluoLp.update();
            let balance = await alluoLp.balanceOf(signers[3].address);
            //console.log(balance.toString());
            expect(balance).to.be.gt(parseUnits("103.22", await alluoLp.decimals()));
            expect(balance).to.be.lt(parseUnits("103.23", await alluoLp.decimals()));
            await alluoLp.connect(signers[3]).withdraw(balance);

            //changing interest
            const newInterest = 5;
            let ABI = ["function setInterest(uint8 _newInterest)"];
            let iface = new ethers.utils.Interface(ABI);
            const calldata = iface.encodeFunctionData("setInterest", [newInterest]);
            await multisig.executeCall(alluoLp.address, calldata);

            await alluoLp.connect(signers[9]).transfer(signers[4].address, amount);
            await skipDays(73);

            //after fifth period
            await alluoLp.connect(signers[1]).claim(signers[1].address);
            balance = await alluoLp.balanceOf(signers[1].address);
            //console.log(balance.toString());
            expect(balance).to.be.gt(parseUnits("213.54", await alluoLp.decimals()));
            expect(balance).to.be.lt(parseUnits("213.55", await alluoLp.decimals()));
            await alluoLp.connect(signers[1]).withdraw(balance);

            await alluoLp.connect(signers[2]).claim(signers[2].address);
            balance = await alluoLp.balanceOf(signers[2].address);
            //console.log(balance.toString());
            expect(balance).to.be.gt(parseUnits("105.92", await alluoLp.decimals()));
            expect(balance).to.be.lt(parseUnits("105.93", await alluoLp.decimals()));
            await alluoLp.connect(signers[2]).withdraw(balance);

            await alluoLp.connect(signers[4]).claim(signers[4].address);
            balance = await alluoLp.balanceOf(signers[4].address);
            //console.log(balance.toString());
            expect(balance).to.be.gt(parseUnits("307.87", await alluoLp.decimals()));
            expect(balance).to.be.lt(parseUnits("307.88", await alluoLp.decimals()));
            await alluoLp.connect(signers[4]).withdraw(balance);
        });
        it('Should not give rewards if the interest is zero', async function () {

            // address that will get minted tokens
            const recepient = signers[3];
            // amount of tokens to be minted, including decimals value of alluoLp
            const amount = ethers.utils.parseUnits("100.0", await alluoLp.decimals());

            await mint(recepient, amount);

            await skipDays(365);

            await alluoLp.connect(signers[3]).claim(signers[3].address);
            let balance = await alluoLp.balanceOf(signers[3].address);
            expect(balance).to.be.gt(parseUnits("107.9", await alluoLp.decimals()));
            expect(balance).to.be.lt(parseUnits("108.1", await alluoLp.decimals()));

            //changing interest
            const newInterest = 0;
            let ABI = ["function setInterest(uint8 _newInterest)"];
            let iface = new ethers.utils.Interface(ABI);
            const calldata = iface.encodeFunctionData("setInterest", [newInterest]);
            await multisig.executeCall(alluoLp.address, calldata);

            await skipDays(365);

            //balance is the same
            await alluoLp.connect(signers[3]).claim(signers[3].address);
            let newBalance = await alluoLp.balanceOf(signers[3].address);
            expect(balance).to.equal(newBalance);
        });
    });

    describe('Token basic functionality', function () {
        describe("Tokenomics and Info", function () {
            it("Should return basic information", async function () {
                expect(await alluoLp.name()).to.equal("ALLUO LP"),
                    expect(await alluoLp.symbol()).to.equal("LPALL"),
                    expect(await alluoLp.decimals()).to.equal(6);
            });
            it("Should return the total supply equal to 0", async function () {
                expect(await alluoLp.totalSupply()).to.equal(0);
            });
        });
        describe("Balances", function () {
            it('When the requested account has no tokens it returns zero', async function () {
                expect(await alluoLp.balanceOf(signers[1].address)).to.equal("0");
            });

            it('When the requested account has some tokens it returns the amount', async function () {
                await mint(signers[1], parseEther('50'));
                expect(await alluoLp.balanceOf(signers[1].address)).to.equal(parseEther('50'));
            });

        });
        describe("Transactions", function () {
            describe("Should fail when", function () {

                it('transfer to zero address', async function () {
                    await expect(alluoLp.transfer(ZERO_ADDRESS, parseEther('100'))
                    ).to.be.revertedWith("ERC20: transfer to the zero address");
                });

                it('transfer from zero address', async function () {
                    await expect(alluoLp.transferFrom(ZERO_ADDRESS, signers[1].address, parseEther('100'))
                    ).to.be.revertedWith("ERC20: transfer from the zero address");
                });

                it('sender doesn\'t have enough tokens', async function () {
                    await expect(alluoLp.connect(signers[1]).transfer(signers[2].address, parseEther('100'))
                    ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
                });

                it('transfer amount exceeds balance', async function () {
                    await expect(alluoLp.transferFrom(signers[1].address, signers[2].address, parseEther('100'))
                    ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
                });
            });
            describe("Should transfer when everything is correct", function () {
                it('from signer1 to signer2 with correct balances at the end', async function () {
                    await mint(signers[1], parseEther('50'));
                    await alluoLp.connect(signers[1]).transfer(signers[2].address, parseEther('25'));
                    const addr1Balance = await alluoLp.balanceOf(signers[1].address);
                    const addr2Balance = await alluoLp.balanceOf(signers[2].address);
                    expect(addr1Balance).to.equal(parseEther('25'));
                    expect(addr2Balance).to.equal(parseEther('25'));
                });
            });

        });

        describe('Approve', function () {
            it("Approving and TransferFrom", async function () {
                await mint(signers[1], parseEther('100'));
                await alluoLp.connect(signers[1]).approve(signers[2].address, parseEther('50'));
                expect(await alluoLp.allowance(signers[1].address, signers[2].address)).to.equal(parseEther('50'));

                await alluoLp.connect(signers[2]).transferFrom(signers[1].address, signers[2].address, parseEther("50"))
                let balance = await alluoLp.balanceOf(signers[1].address);
                expect(balance).to.equal(parseEther('50'));
            });
            it("Not approving becouse of zero address", async function () {
                await expect(alluoLp.approve(ZERO_ADDRESS, parseEther('100'))
                ).to.be.revertedWith("ERC20: approve to the zero address");
            });

            it("increasing and decreasing allowance", async function () {
                await mint(signers[1], parseEther('100'));
                await alluoLp.connect(signers[1]).increaseAllowance(signers[2].address, parseEther('50'));
                expect(await alluoLp.allowance(signers[1].address, signers[2].address)).to.equal(parseEther('50'));

                await expect(
                    alluoLp.connect(signers[2]).transferFrom(signers[1].address, signers[2].address, parseEther("60")))
                    .to.be.revertedWith("ERC20: transfer amount exceeds allowance");
                await alluoLp.connect(signers[1]).increaseAllowance(signers[2].address, parseEther('20'));
                await alluoLp.connect(signers[1]).decreaseAllowance(signers[2].address, parseEther('10'));
                await alluoLp.connect(signers[2]).transferFrom(signers[1].address, signers[2].address, parseEther("60"))
                await expect(
                    alluoLp.connect(signers[1]).decreaseAllowance(signers[2].address, parseEther("50")))
                    .to.be.revertedWith("ERC20: decreased allowance below zero");

                let balance = await alluoLp.balanceOf(signers[1].address);
                expect(balance).to.equal(parseEther('40'));
            });
        });
        describe('Mint / Burn', function () {
            it("burn fails because the amount exceeds the balance", async function () {
                await mint(signers[1], parseEther('100'));
                await expect(alluoLp.connect(signers[1]).withdraw(parseEther('200'))
                ).to.be.revertedWith("ERC20: burn amount exceeds balance");
            });
        });
    });


    async function mint(recipient: SignerWithAddress, amount: BigNumberish) {
        await token.mint(recipient.address, amount);

        await token.connect(recipient).approve(alluoLp.address, amount);

        await alluoLp.connect(recipient).deposit(amount);
    }
});