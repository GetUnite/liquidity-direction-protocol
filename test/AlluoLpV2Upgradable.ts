import { parseEther, parseUnits } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, BigNumberish } from "ethers";
import { ethers, upgrades } from "hardhat";
import { before } from "mocha";
import { PseudoMultisigWallet, PseudoMultisigWallet__factory, IERC20, AlluoLpV2Upgradable, AlluoLpV2Upgradable__factory } from "../typechain";


const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

async function skipDays(d: number) {
    ethers.provider.send('evm_increaseTime', [d * 86400]);
    ethers.provider.send('evm_mine', []);
}

describe("AlluoLpV2", function () {
    let user: SignerWithAddress,
        investor: SignerWithAddress;

    let alluoLpV2: AlluoLpV2Upgradable;
    let multisigAddress = "0x1F020A4943EB57cd3b2213A66b355CB662Ea43C3";

    let supprotedTokens = [
        "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",// USDC
        "0x6B175474E89094C44Da98b954EedeAC495271d0F",// DAI
        "0xdAC17F958D2ee523a2206206994597C13D831ec7", //USDT
    ];
    let targetToken: IERC20; // USDC
    const exchangeAddress = "0x29c66CF57a03d41Cfe6d9ecB6883aa0E2AbA21Ec"// exchange eth
    const slippageBPS = 10;

    beforeEach(async function () {
        targetToken = await ethers.getContractAt("IERC20", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
        investor = await ethers.getSigner(multisigAddress);
        user = await ethers.getSigner("0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");

        const AlluoLPV2 = await ethers.getContractFactory("AlluoLpV2Upgradable") as AlluoLpV2Upgradable__factory;

        alluoLpV2 = await upgrades.deployProxy(AlluoLPV2,
            [multisigAddress, supprotedTokens, targetToken.address, exchangeAddress, slippageBPS],
            { initializer: 'initialize', kind: 'uups' }
        ) as AlluoLpV2Upgradable;

        await ethers.provider.send(
            'hardhat_impersonateAccount',
            [multisigAddress,]
        );

        await ethers.provider.send(
            'hardhat_impersonateAccount',
            ["0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"]
        );

        await targetToken.connect(investor).approve(alluoLpV2.address, parseEther("1000000"))
    });

    it("should mint on deposit", async function () {
        const depositTx = await alluoLpV2.connect(user).deposit(parseUnits("1000", "6"));
        depositTx.wait()
        console.log(depositTx);
        const balance = await alluoLpV2.balanceOf(user.address);
        expect(balance).to.equal(parseEther("1000"));
        await ethers.provider.send(
            'evm_increaseTime',
            [3600 * 10000]
        );
        const compoundedBalance = await alluoLpV2.getBalance(user.address);
        expect(compoundedBalance).to.greaterThan(parseEther("1000"));
    });

    it("should reinvest on deposit twice", async function () {
        const depositTx = await alluoLpV2.connect(user).deposit(parseUnits("1000", "6"));
        depositTx.wait()

        const balance = await alluoLpV2.balanceOf(user.address);
        expect(balance).to.equal(parseEther("1000"));
        await ethers.provider.send(
            'evm_increaseTime',
            [3600 * 10000]
        );
        const compoundedBalance = await alluoLpV2.getBalance(user.address);
        expect(compoundedBalance).to.greaterThan(parseEther("1000"));

        const depositTxSecondTime = await alluoLpV2.connect(user).deposit(parseUnits("1000", "6"));
        depositTxSecondTime.wait()
        const balanceAfterDeposit = await alluoLpV2.balanceOf(user.address);
        expect(balanceAfterDeposit).to.equal(parseEther("1000") + compoundedBalance);
    })

})
