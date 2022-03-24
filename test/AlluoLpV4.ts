import { parseEther, parseUnits } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, BigNumberish } from "ethers";
import { Interface } from "ethers/lib/utils";
import { ethers, upgrades } from "hardhat";
import { before } from "mocha";
import { PseudoMultisigWallet, PseudoMultisigWallet__factory, TestERC20, TestERC20__factory, UrgentAlluoLp, UrgentAlluoLp__factory, AlluoLpV4, AlluoLpV4__factory} from "../typechain";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

async function skipDays(d: number) {
    ethers.provider.send('evm_increaseTime', [d * 86400]);
    ethers.provider.send('evm_mine', []);
}

function dayToMinutes(d: number) {
    return d*24*60
}

function approx(b: BigNumber) {
    return Number((Number(b)/10**18).toFixed(2));
}
describe("AlluoLpV4: Withdraw, Deposit, Compounding features", function () {
    let signers: SignerWithAddress[];
    let alluoLp: AlluoLpV4;
    let alluoLpOld: UrgentAlluoLp;
    let multisig: PseudoMultisigWallet;
    let token: TestERC20;
    let depositor: SignerWithAddress
    let amount: BigNumber;
    let tenthamount: BigNumber;
    let twotenthamount: BigNumber;
    let interestRate: number; //8% APY in compounding every 60 seconds

    before(async function () {
        signers = await ethers.getSigners();
    });

    beforeEach(async function () {
        const AlluoLP = await ethers.getContractFactory("AlluoLpV4") as AlluoLpV4__factory;
        const Multisig = await ethers.getContractFactory("PseudoMultisigWallet") as PseudoMultisigWallet__factory;
        const Token = await ethers.getContractFactory("TestERC20") as TestERC20__factory;

        multisig = await Multisig.deploy();
        token = await Token.deploy("Test DAI", "TDAI", 18);


        alluoLp = await upgrades.deployProxy(AlluoLP,
            [multisig.address,
            [token.address]],
            {initializer: 'initialize', kind:'uups'}
        ) as AlluoLpV4;

        interestRate = 1.0000001464;
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
        expect(approx(await alluoLp.getBalance(depositor.address))).equal(approx(amount))
        // This holds approximately because the actual contract compounds per second to give balance
    })
    it("Should be able to deposit when balance is not zero, with no compounding", async function () {
        await alluoLp.connect(depositor).deposit(token.address, tenthamount);
        expect(approx(await alluoLp.getBalance(depositor.address))).equal(approx(tenthamount))
        await alluoLp.connect(depositor).deposit(token.address, tenthamount);
        expect(approx(await alluoLp.getBalance(depositor.address))).equal(approx(twotenthamount))
    })
    it("Should be able to deposit and get compounded value without withdrawal", async function() {
        await alluoLp.connect(depositor).deposit(token.address, tenthamount);
        const initialDeposit = Number(tenthamount)/ 10**18
        // 1 year
        await skipDays(365)
        const finalBal = approx(await alluoLp.getBalance(depositor.address));
        expect(finalBal).is.greaterThan(initialDeposit);
        expect(finalBal).equal((initialDeposit*1.08))
    })

    it("Should be able to deposit when balance is not zero, and get compounded balance afterwards", async function() {
        await alluoLp.connect(depositor).deposit(token.address, tenthamount);
        const daysSkipped = 0.3;
        await skipDays(daysSkipped)
        await alluoLp.connect(depositor).deposit(token.address, tenthamount);
        const compoundingPeriods = dayToMinutes(daysSkipped);

        const initialDeposit = Number(tenthamount)/ 10**18
        const expectedFinalBal = (initialDeposit + initialDeposit*interestRate**(compoundingPeriods)).toFixed(5)

        const finalBal = Number(await alluoLp.getBalance(depositor.address)) / 10**18;
        expect((finalBal).toFixed(2)).equal(Number(expectedFinalBal).toFixed(2));
    })
    it("Should be able to deposit and withdraw without compounding", async function() {
        await alluoLp.connect(depositor).deposit(token.address, tenthamount);
        await alluoLp.connect(depositor).withdraw(token.address, tenthamount);
        expect(await alluoLp.getBalance(depositor.address)).equal(0);
    })

    it("Should be able to deposit, get compounding rewards, then withdraw all funds", async function() {
        await alluoLp.connect(depositor).deposit(token.address, tenthamount);
        const daysSkipped = 25;
        await skipDays(daysSkipped)
        const totalBalance = await alluoLp.getBalance(depositor.address);
        await alluoLp.connect(depositor).withdraw(token.address, totalBalance);
        expect(approx(await alluoLp.getBalance(depositor.address))).equal(0);
        // Use approx as there can be small dust remaining (10**-8 dollars)
    })

    it("Should be able to deposit, get compounding rewards, then withdraw partial funds", async function() {
        await alluoLp.connect(depositor).deposit(token.address, tenthamount);
        const daysSkipped = 13;
        await skipDays(daysSkipped)
        const totalBalance = await alluoLp.getBalance(depositor.address);
        await alluoLp.connect(depositor).withdraw(token.address, tenthamount);
        expect(approx(await alluoLp.getBalance(depositor.address))).equal(approx(totalBalance.sub(tenthamount)));
    })
    it("Total return after 1 year should not exceed 8% (if set at 8%)", async function() {
        await alluoLp.connect(depositor).deposit(token.address, tenthamount);
        await skipDays(365);
        const totalBalance = await alluoLp.getBalance(depositor.address);
        expect(approx(totalBalance)).lessThanOrEqual(approx(tenthamount)*1.08);
        // To address concerns from client. This implementation works :)
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
    it("Calling updateInterestIndex more than once a minute should still return the correct amount ", async function() {
        await alluoLp.connect(depositor).deposit(token.address, tenthamount);
        const periods = 10;
        const periodIntervals = 7;
        for (let i=0; i< periods; i++) {
            await skipDays(periodIntervals);
            await alluoLp.updateInterestIndex();
            await alluoLp.updateInterestIndex();
            await alluoLp.updateInterestIndex();
        }
        const totalBalance = await alluoLp.getBalance(depositor.address);
        await alluoLp.connect(depositor).withdraw(token.address, tenthamount);
        expect(approx(await alluoLp.getBalance(depositor.address))).equal(approx(totalBalance.sub(tenthamount)));
        // Convert to Number as bignumber has an infinitesimal rounding error. 
        // expect error: "14868800860799297001" to be equal 14868800860799297000
    })
    
})
describe('Migration', function (){
    let signers: SignerWithAddress[];
    let alluoLp: AlluoLpV4;
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
        const AlluoLP = await ethers.getContractFactory("AlluoLpV4") as AlluoLpV4__factory;
        const Multisig = await ethers.getContractFactory("PseudoMultisigWallet") as PseudoMultisigWallet__factory;
        const Token = await ethers.getContractFactory("TestERC20") as TestERC20__factory;
        const AlluoLPOld = await ethers.getContractFactory("UrgentAlluoLp") as UrgentAlluoLp__factory;
        multisig = await Multisig.deploy();
        token = await Token.deploy("Test DAI", "TDAI", 18);

        alluoLpOld = await AlluoLPOld.deploy(multisig.address, token.address);
        alluoLp = await upgrades.deployProxy(AlluoLP,
            [multisig.address,
            [token.address]],
            {initializer: 'initialize', kind:'uups'}
        ) as AlluoLpV4;

        depositor = signers[1];
        amount = ethers.utils.parseUnits("10000.0", await alluoLp.decimals());
        tenthamount = ethers.utils.parseUnits("1000.0", await alluoLp.decimals());
        twotenthamount = ethers.utils.parseUnits("2000.0", await alluoLp.decimals());
        await token.connect(depositor).approve(multisig.address, amount);
        await token.connect(depositor).approve(alluoLp.address, amount);
        await token.mint(depositor.address, amount);
        await token.mint(alluoLp.address, amount);
    });
    it("Should migrate tokens from old contact", async function () {
        // addresses that will get minted tokens
        const recipient1 = signers[1];
        const recipient2 = signers[2];
        const recipient3 = signers[3];
        // amounts of tokens to be minted, including decimals value of token
        const amount1 = "100.0";
        const amount2 = "135.3";
        const amount3 = "2500.0";
    
        await mintToOld(recipient1, ethers.utils.parseUnits(amount1, await alluoLpOld.decimals()));
        await mintToOld(recipient2, ethers.utils.parseUnits(amount2, await alluoLpOld.decimals()));
        await mintToOld(recipient3, ethers.utils.parseUnits(amount3, await alluoLpOld.decimals()));

        let ABI = ["function migrate(address _oldContract, address[] memory _users)"];
        let iface = new ethers.utils.Interface(ABI);

        const calldata = iface.encodeFunctionData("migrate", [alluoLpOld.address,
            [recipient1.address,
            recipient2.address,
            recipient3.address
        ]]);

        await multisig.executeCall(alluoLp.address, calldata);

        expect(await alluoLp.balanceOf(signers[1].address)).to.equal(parseUnits(amount1, await alluoLp.decimals()));
        expect(await alluoLp.balanceOf(signers[2].address)).to.equal(parseUnits(amount2, await alluoLp.decimals()));
        expect(await alluoLp.balanceOf(signers[3].address)).to.equal(parseUnits(amount3, await alluoLp.decimals()));

    })
    async function mintToOld(recipient: SignerWithAddress, amount: BigNumberish) {
        await token.mint(recipient.address, amount);
    
        await token.connect(recipient).approve(alluoLpOld.address, amount);
    
        await alluoLpOld.connect(recipient).deposit(amount);
    }
})

