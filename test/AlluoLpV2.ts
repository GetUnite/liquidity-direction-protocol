import { parseEther, parseUnits } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, BigNumberish } from "ethers";
import { Interface } from "ethers/lib/utils";
import { ethers, upgrades } from "hardhat";
import { before } from "mocha";
import { PseudoMultisigWallet, PseudoMultisigWallet__factory, TestERC20, TestERC20__factory, UrgentAlluoLp, UrgentAlluoLp__factory, AlluoLpUpgradableMintable, AlluoLpUpgradableMintable__factory,} from "../typechain";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

async function skipDays(d: number) {
    ethers.provider.send('evm_increaseTime', [d * 86400]);
    ethers.provider.send('evm_mine', []);
}

describe("AlluoLpV2: Withdraw, Deposit, Compounding features", function () {
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

    it("After calling deposit (with a compounding existing balance), ERC20 and deposit balance should be identical", async function() {
        await alluoLp.connect(depositor).deposit(token.address, tenthamount);
        expect(await alluoLp.getBalance(depositor.address)).equal(tenthamount);
        const periods = 10;
        const periodIntervals = 7;
        for (let i=0; i< periods; i++) {
            await skipDays(periodIntervals);
        }
        await alluoLp.connect(depositor).deposit(token.address, tenthamount);
        expect(await alluoLp.balanceOf(depositor.address)).equal(await alluoLp.getBalance(depositor.address))
    })

    it("After partially withdrawing (with a compounding existing balance), ERC20 and deposit balance should be identical", async function() {
        await alluoLp.connect(depositor).deposit(token.address, tenthamount);
        expect(await alluoLp.getBalance(depositor.address)).equal(tenthamount);
        const periods = 10;
        const periodIntervals = 7;
        for (let i=0; i< periods; i++) {
            await skipDays(periodIntervals);
        }
        await alluoLp.connect(depositor).withdraw(token.address, tenthamount);
        expect(await alluoLp.balanceOf(depositor.address)).equal(await alluoLp.getBalance(depositor.address))
    })

    it("After fully withdrawing (with a compounding existing balance), ERC20 and deposit balance should be identical", async function() {
        await alluoLp.connect(depositor).deposit(token.address, tenthamount);
        expect(await alluoLp.getBalance(depositor.address)).equal(tenthamount);
        const periods = 10;
        const periodIntervals = 7;
        for (let i=0; i< periods; i++) {
            await skipDays(periodIntervals);
        }
        await alluoLp.connect(depositor).withdraw(token.address, await alluoLp.getBalance(depositor.address));
        expect(await alluoLp.balanceOf(depositor.address)).equal(await alluoLp.getBalance(depositor.address))
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
        // console.log(await alluoLp.getBalance(depositor.address))
        // console.log(Number(tenthamount)* 1.00021087**(periods*periodIntervals))
        expect(Number(await alluoLp.getBalance(depositor.address))).lessThan(Number(tenthamount)* 1.00021087**(periods*periodIntervals))
    })
})

describe("AlluoV2: Allow transfers and accurate balances after transfers", function() {
    let signers: SignerWithAddress[];

    let alluoLp: AlluoLpUpgradableMintable;
    let alluoLpOld: UrgentAlluoLp;
    let multisig: PseudoMultisigWallet;
    let token: TestERC20;
    let depositor: SignerWithAddress;
    let differentUser: SignerWithAddress;
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
        differentUser = signers[2];
        amount = ethers.utils.parseUnits("10000.0", await alluoLp.decimals());
        tenthamount = ethers.utils.parseUnits("1000.0", await alluoLp.decimals());
        twotenthamount = ethers.utils.parseUnits("2000.0", await alluoLp.decimals());
        await token.connect(depositor).approve(multisig.address, amount);
        await token.connect(depositor).approve(alluoLp.address, amount);
        await token.connect(differentUser).approve(multisig.address, amount);
        await token.connect(differentUser).approve(alluoLp.address, amount);
        await token.mint(depositor.address, amount);
        await token.mint(alluoLp.address, amount);
        await token.mint(differentUser.address, amount);

    });
    it("Should be able to transfer LP tokens without compounding", async function() {
        await alluoLp.connect(depositor).deposit(token.address, tenthamount);
        expect(await alluoLp.balanceOf(depositor.address)).equal(tenthamount);
        await alluoLp.connect(depositor).transfer(differentUser.address, tenthamount);
        expect(await alluoLp.getBalance(depositor.address)).equal(0);
        expect(await alluoLp.getBalance(differentUser.address)).equal(tenthamount);
    });

    it("Should be able to transfer LP tokens and compound balance correctly before transfer", async function() {
        await alluoLp.connect(depositor).deposit(token.address, tenthamount);
        const periods = 5;
        const periodIntervals = 7;
        for (let i=0; i< periods; i++) {
            await skipDays(periodIntervals);
        }
        await alluoLp.connect(depositor).transfer(differentUser.address, tenthamount);
        expect(Number(await alluoLp.getBalance(depositor.address))).greaterThan(0);
        expect(await alluoLp.getBalance(differentUser.address)).equal(tenthamount);
    });

    it("Should be able to transfer LP tokens and compound both sender and receivers balances correctly before transfer", async function() {
        await alluoLp.connect(depositor).deposit(token.address, tenthamount);
        await alluoLp.connect(differentUser).deposit(token.address, amount);
        const periods = 5;
        const periodIntervals = 7;
        for (let i=0; i< periods; i++) {
            await skipDays(periodIntervals);
        }
        await alluoLp.connect(depositor).transfer(differentUser.address, tenthamount);
        expect(Number(await alluoLp.getBalance(depositor.address))).greaterThan(0);
        expect(Number(await alluoLp.getBalance(differentUser.address))).greaterThan(Number(amount.add(tenthamount)));
    })

    it("Deposits balance and ERC20 balance should be identical after a transfer", async function() {
        await alluoLp.connect(depositor).deposit(token.address, tenthamount);
        await alluoLp.connect(differentUser).deposit(token.address, amount);
        const periods = 5;
        const periodIntervals = 7;
        for (let i=0; i< periods; i++) {
            await skipDays(periodIntervals);
        }
        await alluoLp.connect(depositor).transfer(differentUser.address, tenthamount);
        // console.log(await alluoLp.getBalance(depositor.address));
        // console.log(await alluoLp.balanceOf(depositor.address));
        expect(await alluoLp.getBalance(depositor.address)).equal(await alluoLp.balanceOf(depositor.address));
        expect(await alluoLp.getBalance(differentUser.address)).equal(await alluoLp.balanceOf(differentUser.address));
    })
})

describe("AlluoV2: Test transferFrom function (identical test cases as transfer)", function() {
    let signers: SignerWithAddress[];

    let alluoLp: AlluoLpUpgradableMintable;
    let alluoLpOld: UrgentAlluoLp;
    let multisig: PseudoMultisigWallet;
    let token: TestERC20;
    let depositor: SignerWithAddress;
    let differentUser: SignerWithAddress;
    let amount: BigNumber;
    let tenthamount: BigNumber;
    let twotenthamount: BigNumber;
    let backendExecutor: SignerWithAddress;
    let backendSigners: SignerWithAddress[];
    let iface: Interface;
    let calldata: string;
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
        differentUser = signers[2];
        amount = ethers.utils.parseUnits("10000.0", await alluoLp.decimals());
        tenthamount = ethers.utils.parseUnits("1000.0", await alluoLp.decimals());
        twotenthamount = ethers.utils.parseUnits("2000.0", await alluoLp.decimals());
        await token.connect(depositor).approve(multisig.address, amount);
        await token.connect(depositor).approve(alluoLp.address, amount);
        await token.connect(differentUser).approve(multisig.address, amount);
        await token.connect(differentUser).approve(alluoLp.address, amount);
        await token.mint(depositor.address, amount);
        await token.mint(alluoLp.address, amount);
        await token.mint(differentUser.address, amount);
        let ABI = ["function transferFrom( address from, address to, uint256 amount)"];
        iface = new ethers.utils.Interface(ABI);
        calldata = iface.encodeFunctionData("transferFrom", [depositor.address, differentUser.address, tenthamount]);
        await alluoLp.connect(depositor).approve(multisig.address, amount);

    });
    it("Should be able to transferFrom LP tokens without compounding", async function() {
        await alluoLp.connect(depositor).deposit(token.address, tenthamount);
        expect(await alluoLp.balanceOf(depositor.address)).equal(tenthamount);

        await multisig.executeCall(alluoLp.address, calldata);

        expect(await alluoLp.getBalance(depositor.address)).equal(0);
        expect(await alluoLp.getBalance(differentUser.address)).equal(tenthamount);
    });

    it("Should be able to transfer LP tokens and compound balance correctly before transfer", async function() {
        await alluoLp.connect(depositor).deposit(token.address, tenthamount);
        const periods = 5;
        const periodIntervals = 7;
        for (let i=0; i< periods; i++) {
            await skipDays(periodIntervals);
        }
        await multisig.executeCall(alluoLp.address, calldata);

        expect(Number(await alluoLp.getBalance(depositor.address))).greaterThan(0);
        expect(await alluoLp.getBalance(differentUser.address)).equal(tenthamount);
    });

    it("Should be able to transfer LP tokens and compound both sender and receivers balances correctly before transfer", async function() {
        await alluoLp.connect(depositor).deposit(token.address, tenthamount);
        await alluoLp.connect(differentUser).deposit(token.address, amount);
        const periods = 5;
        const periodIntervals = 7;
        for (let i=0; i< periods; i++) {
            await skipDays(periodIntervals);
        }
        await multisig.executeCall(alluoLp.address, calldata);
        expect(Number(await alluoLp.getBalance(depositor.address))).greaterThan(0);
        expect(Number(await alluoLp.getBalance(differentUser.address))).greaterThan(Number(amount.add(tenthamount)));
    })

    it("Deposits balance and ERC20 balance should be identical after a transfer", async function() {
        await alluoLp.connect(depositor).deposit(token.address, tenthamount);
        await alluoLp.connect(differentUser).deposit(token.address, amount);
        const periods = 5;
        const periodIntervals = 7;
        for (let i=0; i< periods; i++) {
            await skipDays(periodIntervals);
        }
        await multisig.executeCall(alluoLp.address, calldata);
        // console.log(await alluoLp.getBalance(depositor.address));
        // console.log(await alluoLp.balanceOf(depositor.address));
        expect(await alluoLp.getBalance(depositor.address)).equal(await alluoLp.balanceOf(depositor.address));
        expect(await alluoLp.getBalance(differentUser.address)).equal(await alluoLp.balanceOf(differentUser.address));
    })
})