import { parseEther, parseUnits } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, BigNumberish } from "ethers";
import { Interface } from "ethers/lib/utils";
import { ethers, upgrades } from "hardhat";
import { before } from "mocha";
import { PseudoMultisigWallet, PseudoMultisigWallet__factory, TestERC20, TestERC20__factory, UrgentAlluoLp, UrgentAlluoLp__factory, AlluoLpV3, AlluoLpV3__factory} from "../typechain";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

async function skipDays(d: number) {
    ethers.provider.send('evm_increaseTime', [d * 86400]);
    ethers.provider.send('evm_mine', []);
}

describe("AlluoLpV2: Withdraw, Deposit, Compounding features", function () {
    let signers: SignerWithAddress[];
    let alluoLp: AlluoLpV3;
    let alluoLpOld: UrgentAlluoLp;
    let multisig: PseudoMultisigWallet;
    let token: TestERC20;
    let depositor: SignerWithAddress
    let amount: BigNumber;
    let tenthamount: BigNumber;
    let twotenthamount: BigNumber;

    before(async function () {
        signers = await ethers.getSigners();
    });

    beforeEach(async function () {
        const AlluoLP = await ethers.getContractFactory("AlluoLpV3") as AlluoLpV3__factory;
        const Multisig = await ethers.getContractFactory("PseudoMultisigWallet") as PseudoMultisigWallet__factory;
        const Token = await ethers.getContractFactory("TestERC20") as TestERC20__factory;

        multisig = await Multisig.deploy();
        token = await Token.deploy("Test DAI", "TDAI", 18);


        alluoLp = await upgrades.deployProxy(AlluoLP,
            [multisig.address,
            [token.address]],
            {initializer: 'initialize', kind:'uups'}
        ) as AlluoLpV3;

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
    it("Should be able to deposit and get compounded value without withdrawal", async function() {
        await alluoLp.connect(depositor).deposit(token.address, tenthamount);
        const initialDeposit = Number(tenthamount)/ 10**18
        const periods = 60;
        const periodIntervals = 7;
        for (let i=0; i< periods; i++) {
            await skipDays(periodIntervals);
    
        }
        const finalBal = Number(await alluoLp.getBalance(depositor.address))/10**18;
        expect(finalBal).is.greaterThan(initialDeposit);
        expect(finalBal.toFixed(4)).equal((initialDeposit*1.00021087**(periods*periodIntervals)).toFixed(4))
    })
    it("Should be able to deposit when balance is not zero, and get compounded balance afterwards", async function() {
        await alluoLp.connect(depositor).deposit(token.address, tenthamount);
        const periods = 10;
        const periodIntervals = 7;
        for (let i=0; i< periods; i++) {
            await skipDays(periodIntervals);
        }
        await alluoLp.connect(depositor).deposit(token.address, tenthamount);
        expect(Number(await alluoLp.balanceOf(depositor.address))).lessThan(Number(twotenthamount));

        const initialDeposit = Number(tenthamount)/ 10**18
        const expectedFinalBal = (initialDeposit + Number((initialDeposit*1.00021087**(periods*periodIntervals)))).toFixed(5)

        const finalBal = Number(await alluoLp.getBalance(depositor.address)) / 10**18;
        expect((finalBal).toFixed(4)).equal(Number(expectedFinalBal).toFixed(4));
    })
    it("Should be able to deposit and withdraw without compounding", async function() {
        await alluoLp.connect(depositor).deposit(token.address, tenthamount);
        expect(await alluoLp.getBalance(depositor.address)).equal(tenthamount);
        await alluoLp.connect(depositor).withdraw(token.address, tenthamount);
        expect(await alluoLp.getBalance(depositor.address)).equal(0);
    })

    it("Should be able to deposit, get compounding rewards, then withdraw all funds", async function() {
        await alluoLp.connect(depositor).deposit(token.address, tenthamount);
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
        expect(Number(await alluoLp.getBalance(depositor.address))).equal(Number(totalBalance.sub(tenthamount)));
        // Convert to Number as bignumber has an infinitesimal rounding error. 
        // expect error: "14868800860799297001" to be equal 14868800860799297000
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
        expect(Number(await alluoLp.getBalance(depositor.address))).lessThan(Number(tenthamount)* 1.00021087**(periods*periodIntervals))
    })
})
