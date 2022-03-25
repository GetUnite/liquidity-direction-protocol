import { parseEther, parseUnits } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, BigNumberish } from "ethers";
import { Interface } from "ethers/lib/utils";
import { ethers, upgrades } from "hardhat";
import { before } from "mocha";
import { AlluoLpV3, AlluoLpV3__factory, LiquidityBufferVault, LiquidityBufferVault__factory, PseudoMultisigWallet, PseudoMultisigWallet__factory, TestERC20, TestERC20__factory, UrgentAlluoLp, UrgentAlluoLp__factory, AlluoLpV4, AlluoLpV4__factory} from "../typechain";

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

        multisig = await Multisig.deploy(true);
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
    let alluoLpCurrent: AlluoLpV4;
    let alluoLpV3: AlluoLpV3;
    let multisig: PseudoMultisigWallet;
    let token: TestERC20;
    let depositor: SignerWithAddress
    let amount: BigNumber;
    let tenthamount: BigNumber;
    let twotenthamount: BigNumber;
    let buffer: LiquidityBufferVault;

    let recipient1: SignerWithAddress;
    let recipient2: SignerWithAddress;
    let recipient3: SignerWithAddress;
    before(async function () {
        signers = await ethers.getSigners();
    });

    beforeEach(async function () {
        const Multisig = await ethers.getContractFactory("PseudoMultisigWallet") as PseudoMultisigWallet__factory;
        const Token = await ethers.getContractFactory("TestERC20") as TestERC20__factory;
        const AlluoLPV3 = await ethers.getContractFactory("AlluoLpV3") as AlluoLpV3__factory;

        multisig = await Multisig.deploy(true);

        token = await Token.deploy("Test DAI", "TDAI", 18);
        
        alluoLpV3 = await upgrades.deployProxy(AlluoLPV3,
            [multisig.address,
            [token.address]],
            {initializer: 'initialize', kind:'uups'}
        ) as AlluoLpV3;

        let ABI = ["function changeUpgradeStatus(bool _status)"];
        let iface = new ethers.utils.Interface(ABI);
        let calldata = iface.encodeFunctionData("changeUpgradeStatus", [true]);

        await multisig.executeCall(alluoLpV3.address, calldata);

        ABI = ["function grantRole(bytes32 role, address account)"];
        iface = new ethers.utils.Interface(ABI);
        calldata = iface.encodeFunctionData("grantRole", [await alluoLpV3.UPGRADER_ROLE(), signers[0].address]);

        await multisig.executeCall(alluoLpV3.address, calldata);

        await upgrades.forceImport(alluoLpV3.address, AlluoLPV3)

        // Just set to anything so ERC20 transfers work
        ABI = ["function setLiquidityBuffer(address newBuffer)"];
        iface = new ethers.utils.Interface(ABI);
        calldata = iface.encodeFunctionData("setLiquidityBuffer", [alluoLpV3.address]);
        await multisig.executeCall(alluoLpV3.address, calldata);

        recipient1 = signers[1];
        recipient2 = signers[2];
        recipient3 = signers[3];
        // amounts of tokens to be minted, including decimals value of token
        const amount1 = "100.0";
        const amount2 = "135.3";
        const amount3 = "2500.0";
        await mintToOld(recipient1, ethers.utils.parseUnits(amount1, await alluoLpV3.decimals()));
        await mintToOld(recipient2, ethers.utils.parseUnits(amount2, await alluoLpV3.decimals()));
        await mintToOld(recipient3, ethers.utils.parseUnits(amount3, await alluoLpV3.decimals()));

        

    });
    it("Should migrate tokens from old contact", async function () {
         // amounts of tokens to be minted, including decimals value of token
         const amount1 = "100.0";
         const amount2 = "135.3";
         const amount3 = "2500.0";

        // First, claim all users tokens in the old contract. (compound first)
        skipDays(365);
        await claim(recipient1)
        await claim(recipient2)
        await claim(recipient3)

        // Upgrade contract to V4
        const AlluoLPV4 = await ethers.getContractFactory("AlluoLpV4") as AlluoLpV4__factory;
        const Buffer = await ethers.getContractFactory("LiquidityBufferVault") as LiquidityBufferVault__factory;
        let curvePool = "0x445FE580eF8d70FF569aB36e80c647af338db351"

        alluoLpCurrent = await upgrades.upgradeProxy(alluoLpV3.address, AlluoLPV4) as AlluoLpV4;

        buffer = await upgrades.deployProxy(Buffer,
            [multisig.address, alluoLpCurrent.address, curvePool],
            {initializer: 'initialize', kind:'uups'}
        ) as LiquidityBufferVault;

        let ABI = ["function setLiquidityBuffer(address newBuffer)"];
        let iface = new ethers.utils.Interface(ABI);
        let calldata = iface.encodeFunctionData("setLiquidityBuffer", [buffer.address]);

        await multisig.executeCall(alluoLpCurrent.address, calldata);

        depositor = signers[1];
        amount = ethers.utils.parseUnits("10000.0", await alluoLpCurrent.decimals());
        tenthamount = ethers.utils.parseUnits("1000.0", await alluoLpCurrent.decimals());
        twotenthamount = ethers.utils.parseUnits("2000.0", await alluoLpCurrent.decimals());
        await token.connect(depositor).approve(multisig.address, amount);
        await token.connect(depositor).approve(alluoLpCurrent.address, amount);
        await token.mint(depositor.address, amount);
        await token.mint(alluoLpCurrent.address, amount);

        // Finally, call the migrate function

        ABI = ["function migrate()"];
        iface = new ethers.utils.Interface(ABI);

        calldata = iface.encodeFunctionData("migrate");

        await multisig.executeCall(alluoLpCurrent.address, calldata);

        expect(approx(await alluoLpCurrent.getBalance(signers[1].address))).equal(Number((Number(amount1) * 1.08).toFixed(2)));
        expect(approx(await alluoLpCurrent.getBalance(signers[2].address))).to.equal(Number((Number(amount2) * 1.08).toFixed(2)));
        expect(approx(await alluoLpCurrent.getBalance(signers[3].address))).to.equal(Number((Number(amount3) * 1.08).toFixed(2)));

    })
    async function mintToOld(recipient: SignerWithAddress, amount: BigNumberish) {
        await token.mint(recipient.address, amount);
    
        await token.connect(recipient).approve(alluoLpV3.address, ethers.utils.parseUnits("20000.0", 18));
    
        await alluoLpV3.connect(recipient).deposit(token.address, amount);
    }
    async function claim(recipient:SignerWithAddress) {
        await alluoLpV3.claim(recipient.address)
    }
})

