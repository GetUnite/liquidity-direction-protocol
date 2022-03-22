import { parseEther, parseUnits } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, BigNumberish } from "ethers";
import { ethers, upgrades } from "hardhat";
import { before } from "mocha";
import { PseudoMultisigWallet, PseudoMultisigWallet__factory, TestERC20, TestERC20__factory, UrgentAlluoLp, UrgentAlluoLp__factory, AlluoLpUpgradableMintable, AlluoLpUpgradableMintable__factory,  } from "../typechain";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

async function skipDays(d: number) {
    ethers.provider.send('evm_increaseTime', [d * 86400]);
    ethers.provider.send('evm_mine', []);
}

describe("AlluoLpV2", function () {
    let signers: SignerWithAddress[];

    let alluoLp: AlluoLpUpgradableMintable;
    let alluoLpOld: UrgentAlluoLp;
    let multisig: PseudoMultisigWallet;
    let token: TestERC20;
    let depositor: SignerWithAddress
    let amount: BigNumber;
    let tenthamount: BigNumber;
    let twotenthamount: BigNumber;
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
        const AlluoLP = await ethers.getContractFactory("AlluoLpUpgradableMintable") as AlluoLpUpgradableMintable__factory;
        const AlluoLPOld = await ethers.getContractFactory("UrgentAlluoLp") as UrgentAlluoLp__factory;
        const Multisig = await ethers.getContractFactory("PseudoMultisigWallet") as PseudoMultisigWallet__factory;
        const Token = await ethers.getContractFactory("TestERC20") as TestERC20__factory;

        multisig = await Multisig.deploy();
        token = await Token.deploy("Test DAI", "TDAI", 18);
        alluoLpOld = await AlluoLPOld.deploy(multisig.address, token.address);

        alluoLp = await upgrades.deployProxy(AlluoLP,
            [multisig.address,
            [token.address]],
            {initializer: 'initialize', kind:'uups'}
        ) as AlluoLpUpgradableMintable;

        depositor = signers[1];
        amount = ethers.utils.parseUnits("10000.0", await alluoLp.decimals());
        tenthamount = ethers.utils.parseUnits("1000.0", await alluoLp.decimals());
        twotenthamount = ethers.utils.parseUnits("2000.0", await alluoLp.decimals());
        await token.connect(depositor).approve(multisig.address, amount);
        await token.connect(depositor).approve(alluoLp.address, amount);
        await token.mint(depositor.address, amount);
        await token.mint(alluoLp.address, amount);
    });
    it("Should be able to deposit when balance is zero", async function () {
        await alluoLp.connect(depositor).deposit(token.address, amount);
        expect(await alluoLp.getBalance(depositor.address)).equal(amount)
    })
    it("Should be able to deposit when balance is not zero, with no compounding", async function () {
        await alluoLp.connect(depositor).deposit(token.address, tenthamount);
        expect(await alluoLp.getBalance(depositor.address)).equal(tenthamount)
        await alluoLp.connect(depositor).deposit(token.address, tenthamount);
        expect(await alluoLp.getBalance(depositor.address)).equal(twotenthamount)
    })
    it("Should be able to deposit when balance is not zero, and get compounded balance afterwards", async function() {
        await alluoLp.connect(depositor).deposit(token.address, tenthamount);
        expect(await alluoLp.getBalance(depositor.address)).equal(tenthamount)
        const periods = 10;
        const periodIntervals = 7;
        for (let i=0; i< periods; i++) {
            await skipDays(periodIntervals);
        }
        await alluoLp.connect(depositor).deposit(token.address, tenthamount);
        const initialDeposit = Number(tenthamount)/ 10**18
        const finalBal = Number(await alluoLp.getBalance(depositor.address))/10**18;
        const expectedFinalBal = (initialDeposit + Number((initialDeposit*1.00021087**(periods*periodIntervals)))).toFixed(5)
        expect(finalBal.toFixed(5)).equal(expectedFinalBal);
    })
    it("Should be able to deposit and get compounded value without withdrawal", async function() {
        await alluoLp.connect(depositor).deposit(token.address, tenthamount);
        const initialDeposit = Number(tenthamount)/ 10**18
        const periods = 60;
        const periodIntervals = 7;
        for (let i=0; i< periods; i++) {
            await skipDays(periodIntervals);
            // const newBal = Number(await alluoLp.getBalance(depositor.address))/10**18;
            // console.log("Rate:", ((newBal - initialDeposit)/initialDeposit) * 100);
        }
        const finalBal = Number(await alluoLp.getBalance(depositor.address))/10**18;
        expect(finalBal).is.greaterThan(initialDeposit);
        expect(finalBal.toFixed(5)).equal((initialDeposit*1.00021087**(periods*periodIntervals)).toFixed(5))
    })

    it("Should be able to deposit and withdraw without compounding", async function() {
        await alluoLp.connect(depositor).deposit(token.address, tenthamount);
        expect(await alluoLp.getBalance(depositor.address)).equal(tenthamount);
        await alluoLp.connect(depositor).withdraw(token.address, tenthamount);
        expect(await alluoLp.getBalance(depositor.address)).equal(0);
    })

    it("Should be able to deposit, get compounding rewards, then withdraw all funds", async function() {
        await alluoLp.connect(depositor).deposit(token.address, tenthamount);
        expect(await alluoLp.getBalance(depositor.address)).equal(tenthamount);
        const periods = 10;
        const periodIntervals = 7;
        for (let i=0; i< periods; i++) {
            await skipDays(periodIntervals);
        }
        const totalBalance = await alluoLp.getBalance(depositor.address);
        await alluoLp.connect(depositor).withdraw(token.address, totalBalance);
        expect(await alluoLp.getBalance(depositor.address)).equal(0);
    })

    it("Should be able to deposit, get compounding rewards, then withdraw partial funds", async function() {
        await alluoLp.connect(depositor).deposit(token.address, tenthamount);
        expect(await alluoLp.getBalance(depositor.address)).equal(tenthamount);
        const periods = 10;
        const periodIntervals = 7;
        for (let i=0; i< periods; i++) {
            await skipDays(periodIntervals);
        }
        const totalBalance = await alluoLp.getBalance(depositor.address);
        await alluoLp.connect(depositor).withdraw(token.address, tenthamount);
        expect(await alluoLp.getBalance(depositor.address)).equal(totalBalance.sub(tenthamount));
    })

    it("Should be able to deposit with multiple interest rate changes and get the balance at the end", async function() {
        await alluoLp.connect(depositor).deposit(token.address, tenthamount);
        const periods = 10;
        const periodIntervals = 7;
        let ABI = ["function setInterest(uint _newInterest)"];
        let iface = new ethers.utils.Interface(ABI);

        for (let i=0; i< periods; i++) {
            await skipDays(periodIntervals);
            if (i % 2 != 0) {
                const calldata = iface.encodeFunctionData("setInterest", [100021087 -i*1000]);
                await multisig.executeCall(alluoLp.address, calldata);
            }
        }
        console.log(await alluoLp.getBalance(depositor.address))
        console.log(Number(tenthamount)* 1.00021087**(periods*periodIntervals))
        expect(Number(await alluoLp.getBalance(depositor.address))).lessThan(Number(tenthamount)* 1.00021087**(periods*periodIntervals))
    })
})