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

describe("TxHandler", function () {
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

    it("Should make deposit and fire an event", async () => {
        const user = signers[1];
        const amount = ethers.utils.parseUnits("10.0", await token.decimals());

        await token.mint(user.address, amount);

        await token.connect(user).approve(txHandler.address, amount);

        await expect(txHandler.connect(user).deposit(amount))
            .to.emit(txHandler, "Deposited")
            .withArgs(user.address, amount);
    });

    it("Should send tokens out of multisig wallet", async () => {
        const users = [signers[1], signers[2], signers[3]];
        const usersAddresses = users.map((signer) => signer.address);
        const amounts = [
            ethers.utils.parseUnits("10.0", await token.decimals()),
            ethers.utils.parseUnits("15.0", await token.decimals()),
            ethers.utils.parseUnits("20.0", await token.decimals())
        ];

        const sum = ethers.utils.parseUnits("45.0", await token.decimals());

        let approveABI = ["function approve(address spender, uint256 amount)"];
        let approveIface = new ethers.utils.Interface(approveABI);
        const approveCalldata = approveIface.encodeFunctionData(
            "approve",
            [
                txHandler.address,
                sum
            ]
        );

        let bulkSendABI = ["function bulkSend(address[] calldata users, uint256[] calldata amounts)"];
        let bulkSendIface = new ethers.utils.Interface(bulkSendABI);
        const bulkSendCalldata = bulkSendIface.encodeFunctionData("bulkSend", [usersAddresses, amounts]);

        await token.mint(multisig.address, sum);

        await multisig.executeCall(token.address, approveCalldata);
        await multisig.executeCall(txHandler.address, bulkSendCalldata);
    });

    it("Should transfer ownership to another contract", async () => {
        const Multisig = await ethers.getContractFactory("PseudoMultisigWallet") as PseudoMultisigWallet__factory;
        const newMultisig = await Multisig.deploy();

        let ABI = ["function transferOwnership(address newOwner)"];
        let iface = new ethers.utils.Interface(ABI);
        const calldata = iface.encodeFunctionData("transferOwnership", [newMultisig.address]);

        await multisig.executeCall(txHandler.address, calldata);

        expect(await txHandler.owner()).to.be.equal(newMultisig.address);
    });

    it("Should not transfer ownership (not owner)", async () => {
        const notOwner = signers[1];
        const newOwner = signers[2];

        const tx = txHandler.connect(notOwner).transferOwnership(newOwner.address);

        await expect(tx).to.be.revertedWith(`Ownable: caller is not the owner`);
    });

    it("Should not transfer ownership (zero address)", async () => {
        const newOwner = "0x0000000000000000000000000000000000000000";

        let ABI = ["function transferOwnership(address newOwner)"];
        let iface = new ethers.utils.Interface(ABI);
        const calldata = iface.encodeFunctionData("transferOwnership", [newOwner]);

        const tx = multisig.executeCall(txHandler.address, calldata);

        await expect(tx).to.be.revertedWith("Ownable: no zero address");
    });

    it("Should not transfer ownership (zero address)", async () => {
        const newOwner = signers[1];

        let ABI = ["function transferOwnership(address newOwner)"];
        let iface = new ethers.utils.Interface(ABI);
        const calldata = iface.encodeFunctionData("transferOwnership", [newOwner.address]);

        const tx = multisig.executeCall(txHandler.address, calldata);

        await expect(tx).to.be.revertedWith("TxHandler: EOA not allowed");
    });
});