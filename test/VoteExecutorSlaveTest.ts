import { parseEther, parseUnits } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, BigNumberish, BytesLike, Wallet } from "ethers";
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
        let encodedMessages = ethers.utils.defaultAbiCoder.encode(["bytes", "bytes", "bytes", "bytes"], messages);
        let messageHash = ethers.utils.solidityKeccak256(['bytes'], [encodedMessages]);

        let names = ["changeAPY", "changeAPY", "changeAPY", "changeAPY"]
        var sig = await wallet.signMessage(ethers.utils.arrayify(messageHash));
        let entryData = await VoteExecutorSlave.callStatic.encodeData(messageHash, sig, names, messages);

        await expect(VoteExecutorSlave.anyExecute(entryData)).to.emit(VoteExecutorSlave, "MessageReceived").withArgs(messageHash);

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
        let encodedMessages = ethers.utils.defaultAbiCoder.encode(["bytes", "bytes", "bytes", "bytes"], messages);
        let messageHash = ethers.utils.solidityKeccak256(['bytes'], [encodedMessages]);

        let names = ["changeAPY", "changeAPY", "changeAPY", "changeAPY"]

        let attacker =  signers[1]
        var fakeSig = await attacker.signMessage(ethers.utils.arrayify(messageHash));

        let entryData = await VoteExecutorSlave.callStatic.encodeData(messageHash, fakeSig, names, messages);
        await expect(VoteExecutorSlave.anyExecute(entryData)).to.be.revertedWith("Isn't whitelisted");
     
    })
    
})
