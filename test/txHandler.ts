import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";
import { PseudoMultisigWallet__factory, TxHandler__factory } from "../typechain";
import { AlluoERC20 } from "../typechain/AlluoERC20";
import { AlluoERC20__factory } from "../typechain/factories/AlluoERC20__factory";
import { TestERC20__factory } from "../typechain/factories/TestERC20__factory";
import { PseudoMultisigWallet } from "../typechain/PseudoMultisigWallet";
import { TestERC20 } from "../typechain/TestERC20";
import { TxHandler } from "../typechain/TxHandler";

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

describe("AlluoLP", function () {
    let signers: SignerWithAddress[];

    let txHandler: TxHandler;
    let multisig: PseudoMultisigWallet;
    let token: TestERC20;

    before(async function () {
        signers = await ethers.getSigners();
    });

    beforeEach(async () => {
        const TxHandler = await ethers.getContractFactory("TxHandler") as TxHandler__factory;
        const Multisig = await ethers.getContractFactory("PseudoMultisigWallet") as PseudoMultisigWallet__factory;
        const Token = await ethers.getContractFactory("TestERC20") as TestERC20__factory;

        multisig = await Multisig.deploy();
        token = await Token.deploy();
        txHandler = await TxHandler.deploy(multisig.address, token.address);
    });

    it("Should not deploy contract (attempt to put EOA as multisig wallet)", async function () {
        const eoa = signers[1];

        const TxHandler = await ethers.getContractFactory("TxHandler") as TxHandler__factory;
        const deployPromise = TxHandler.deploy(eoa.address, token.address);
        await expect(deployPromise).to.be.revertedWith("TxHandler: EOA not allowed");
    });
});