import { parseEther, parseUnits } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, BigNumberish, BytesLike, Wallet } from "ethers";
import { defaultAbiCoder } from "ethers/lib/utils";
import { ethers, network, upgrades } from "hardhat";
import { before } from "mocha";
import { ERC20, IbAlluo, IbAlluo__factory, VoteExecutorSlave, VoteExecutorSlave__factory,} from "../typechain";

function getInterestPerSecond(apyDecimal: number): BigNumber {
    return BigNumber.from(String(Math.round(Math.pow(apyDecimal, 1/31536000)*10**17)))
}

// Hardhat ethsign doesn't work well. Need a helper 
function sign(address: string, data: string) {
    return network.provider.send(
      "eth_sign",
      [address, ethers.utils.hexlify(ethers.utils.toUtf8Bytes('foo'))]
    )
  }
  

  

describe("Test L2 Contracts", function() {
    let VoteExecutorSlave : VoteExecutorSlave;
    let VoteExecutorSlaveFactory : VoteExecutorSlave__factory;
    let mneumonic  = process.env.MNEMONIC
    const interestPerSecond = BigNumber.from("10000002438562803");
    let wallet : Wallet;

    let ibAlluo1 : IbAlluo;
    let ibAlluo2 : IbAlluo;
    let ibAlluo3 : IbAlluo;
    let ibAlluo4 : IbAlluo;

    let ibAlluoFactory : IbAlluo__factory;
    // let mockERC20 : MetaTxERC20Token;
    let signers: SignerWithAddress[]
    beforeEach(async () => {
        if (typeof mneumonic !== "string") {
            return
        }
        VoteExecutorSlaveFactory = await ethers.getContractFactory("VoteExecutorSlave");
        VoteExecutorSlave = await VoteExecutorSlaveFactory.deploy();
        wallet = Wallet.fromMnemonic(mneumonic)        
        await VoteExecutorSlave.addToWhitelist(wallet.address);

        let mockERC20Factory = await ethers.getContractFactory("contracts/mock/testnet/MetaTxERC20Token.sol:ERC20");
        let mockERC20 = await mockERC20Factory.deploy();

        signers = await ethers.getSigners();
        // Switch these up to real handler and gnosis.
        let gnosisAddress = VoteExecutorSlave.address
        let handler = mockERC20.address
        let supportedTokens = [mockERC20.address];
      
        const ibAlluoFactory = await ethers.getContractFactory("IbAlluo");
      
        ibAlluo1 = await upgrades.deployProxy(ibAlluoFactory,
            [
                "Interest Bearing Alluo ETH",
                "IbAlluoETH",
                gnosisAddress,
                handler,
                supportedTokens,
                BigNumber.from("100000000470636740"),
                1600,
                "0x9399BB24DBB5C4b782C70c2969F58716Ebbd6a3b"],
            { initializer: 'initialize', kind: 'uups' }
        ) as IbAlluo;

        ibAlluo2 = await upgrades.deployProxy(ibAlluoFactory,
            [
                "Interest Bearing Alluo ETH",
                "IbAlluoETH",
                gnosisAddress,
                handler,
                supportedTokens,
                BigNumber.from("100000000470636740"),
                1600,
                "0x9399BB24DBB5C4b782C70c2969F58716Ebbd6a3b"],
            { initializer: 'initialize', kind: 'uups' }
        ) as IbAlluo;

        ibAlluo3 = await upgrades.deployProxy(ibAlluoFactory,
            [
                "Interest Bearing Alluo ETH",
                "IbAlluoETH",
                gnosisAddress,
                handler,
                supportedTokens,
                BigNumber.from("100000000470636740"),
                1600,
                "0x9399BB24DBB5C4b782C70c2969F58716Ebbd6a3b"],
            { initializer: 'initialize', kind: 'uups' }
        ) as IbAlluo;

        ibAlluo4 = await upgrades.deployProxy(ibAlluoFactory,
            [
                "Interest Bearing Alluo ETH",
                "IbAlluoETH",
                gnosisAddress,
                handler,
                supportedTokens,
                BigNumber.from("100000000470636740"),
                1600,
                "0x9399BB24DBB5C4b782C70c2969F58716Ebbd6a3b"],
            { initializer: 'initialize', kind: 'uups' }
        ) as IbAlluo;


    });
    it("Set APYs of ibAlluos in bulk.", async function() {
        
        if (typeof mneumonic !== "string") {
            return
        }
        let apydata1 = ethers.utils.defaultAbiCoder.encode(["uint256", "uint256", "address"], [800, getInterestPerSecond(1.08), ibAlluo1.address])
        let apydata2 = ethers.utils.defaultAbiCoder.encode(["uint256", "uint256", "address"], [1600,  getInterestPerSecond(1.16), ibAlluo2.address])
        let apydata3 = ethers.utils.defaultAbiCoder.encode(["uint256", "uint256", "address"], [2400,  getInterestPerSecond(1.24), ibAlluo3.address])
        let apydata4 = ethers.utils.defaultAbiCoder.encode(["uint256", "uint256", "address"], [0,  getInterestPerSecond(1), ibAlluo4.address])
      
        let messages = [apydata1, apydata2, apydata3, apydata4]
        let names = ["changeAPY", "changeAPY", "changeAPY", "changeAPY"]

        let encodedCommands = await VoteExecutorSlave.callStatic.encodeCommands(names, messages)
        var sig = await wallet.signMessage(ethers.utils.arrayify(encodedCommands.hashedCommands));
        let entryData = await VoteExecutorSlave.callStatic.encodeData(encodedCommands.hashedCommands, sig,encodedCommands.commands);
   
        await expect(VoteExecutorSlave.anyExecute(entryData)).to.emit(VoteExecutorSlave, "MessageReceived").withArgs(encodedCommands.hashedCommands);

        expect(await ibAlluo1.interestPerSecond()).equal(getInterestPerSecond(1.08).mul(10**10))
        expect(await ibAlluo2.interestPerSecond()).equal(getInterestPerSecond(1.16).mul(10**10))
        expect(await ibAlluo3.interestPerSecond()).equal(getInterestPerSecond(1.24).mul(10**10))
        expect(await ibAlluo4.interestPerSecond()).equal(getInterestPerSecond(1).mul(10**10))
        // (10**27) representation of APY per second on ibAlluos
    })
    it("Try set APYs in bulk, but with INCORRECT signer: should revert", async function() {
        if (typeof mneumonic !== "string") {
            return
        }
        let apydata1 = ethers.utils.defaultAbiCoder.encode(["uint256", "uint256", "address"], [800, getInterestPerSecond(1.08), ibAlluo1.address])
        let apydata2 = ethers.utils.defaultAbiCoder.encode(["uint256", "uint256", "address"], [1600,  getInterestPerSecond(1.16), ibAlluo2.address])
        let apydata3 = ethers.utils.defaultAbiCoder.encode(["uint256", "uint256", "address"], [2400,  getInterestPerSecond(1.24), ibAlluo3.address])
        let apydata4 = ethers.utils.defaultAbiCoder.encode(["uint256", "uint256", "address"], [0,  getInterestPerSecond(1), ibAlluo4.address])
      
        let messages = [apydata1, apydata2, apydata3, apydata4]
        let names = ["changeAPY", "changeAPY", "changeAPY", "changeAPY"]
        let encodedCommands = await VoteExecutorSlave.callStatic.encodeCommands(names, messages)
   

        let attacker =  signers[1]
        var fakeSig = await attacker.signMessage(ethers.utils.arrayify(encodedCommands.hashedCommands));

        let entryData = await VoteExecutorSlave.callStatic.encodeData(encodedCommands.hashedCommands, fakeSig,encodedCommands.commands);
        await expect(VoteExecutorSlave.anyExecute(entryData)).to.be.revertedWith("Isn't whitelisted");
     
    })

    it("Incorrect hash of commands should revert", async function() {
        if (typeof mneumonic !== "string") {
            return
        }
        let apydata1 = ethers.utils.defaultAbiCoder.encode(["uint256", "uint256", "address"], [800, getInterestPerSecond(1.08), ibAlluo1.address])
        let apydata2 = ethers.utils.defaultAbiCoder.encode(["uint256", "uint256", "address"], [1600,  getInterestPerSecond(1.16), ibAlluo2.address])
        let apydata3 = ethers.utils.defaultAbiCoder.encode(["uint256", "uint256", "address"], [2400,  getInterestPerSecond(1.24), ibAlluo3.address])
        let apydata4 = ethers.utils.defaultAbiCoder.encode(["uint256", "uint256", "address"], [0,  getInterestPerSecond(1), ibAlluo4.address])
      
        let messages = [apydata1, apydata2, apydata3, apydata4]
        let names = ["changeAPY", "changeAPY", "changeAPY", "changeAPY"]

        let encodedCommands = await VoteExecutorSlave.callStatic.encodeCommands(names, messages)
        var sig = await wallet.signMessage(ethers.utils.arrayify(encodedCommands.hashedCommands));

        let fakeMessages = [apydata1, apydata2, apydata3, apydata4, apydata1]
        let fakeNames = ["changeAPY", "changeAPY", "changeAPY", "changeAPY", "changeAPY"]
        let fakeEncodedCommands = await VoteExecutorSlave.callStatic.encodeCommands(fakeNames, fakeMessages)

        let entryData = await VoteExecutorSlave.callStatic.encodeData(encodedCommands.hashedCommands, sig,fakeEncodedCommands.commands);
   
        await expect(VoteExecutorSlave.anyExecute(entryData)).to.be.revertedWith("Hash doesn't match");
     
    })
})
// 0x00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000180000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000320000000000000000000000000000000000000000000000000016345786c15c884000000000000000000000000c6e7df5e7b4f2a278906862b61205850344d4e7d0000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000064000000000000000000000000000000000000000000000000001634578799758ce00000000000000000000000059b670e9fa9d0a427751af201d676719a970857b000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000009600000000000000000000000000000000000000000000000000163457886323ac20000000000000000000000004ed7c70f96b99c776995fb64377f0d4ab3b0e1c100000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000016345785d8a0000000000000000000000000000322813fd9a801c5507c9de605d63cea4f2ce6c44
// 0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000180000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000320000000000000000000000000000000000000000000000000016345786c15c884000000000000000000000000c6e7df5e7b4f2a278906862b61205850344d4e7d0000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000064000000000000000000000000000000000000000000000000001634578799758ce00000000000000000000000059b670e9fa9d0a427751af201d676719a970857b000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000009600000000000000000000000000000000000000000000000000163457886323ac20000000000000000000000004ed7c70f96b99c776995fb64377f0d4ab3b0e1c100000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000016345785d8a0000000000000000000000000000322813fd9a801c5507c9de605d63cea4f2ce6c44
// 0x0000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000008000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000180000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000320000000000000000000000000000000000000000000000000016345786c15c884000000000000000000000000c6e7df5e7b4f2a278906862b61205850344d4e7d0000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000064000000000000000000000000000000000000000000000000001634578799758ce00000000000000000000000059b670e9fa9d0a427751af201d676719a970857b000000000000000000000000000000000000000000000000000000000000006000000000000000000000000000000000000000000000000000000000000009600000000000000000000000000000000000000000000000000163457886323ac20000000000000000000000004ed7c70f96b99c776995fb64377f0d4ab3b0e1c100000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000016345785d8a0000000000000000000000000000322813fd9a801c5507c9de605d63cea4f2ce6c44