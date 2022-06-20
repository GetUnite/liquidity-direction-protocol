import { parseEther, parseUnits } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, BigNumberish, BytesLike, Wallet } from "ethers";
import { defaultAbiCoder } from "ethers/lib/utils";
import { ethers, network, upgrades } from "hardhat";
import { before } from "mocha";
import { ERC20, IbAlluo, IbAlluo__factory, PseudoMultisigWallet, VoteExecutorSlave, VoteExecutorSlave__factory,} from "../typechain";

function getInterestPerSecond(apyDecimal: number): BigNumber {
    return BigNumber.from(String(Math.round(Math.pow(apyDecimal, 1/31536000)*10**17)))
}


  

async function getImpersonatedSigner(address: string): Promise<SignerWithAddress> {
    await ethers.provider.send(
        'hardhat_impersonateAccount',
        [address]
    );

    return await ethers.getSigner(address);
}


describe("Test L2 Contracts", function() {
    let VoteExecutorSlave : VoteExecutorSlave;
    let VoteExecutorSlaveFactory : VoteExecutorSlave__factory;
    let PseudoMultisigWallet: PseudoMultisigWallet;
    let mneumonic  = process.env.MNEMONIC
    const interestPerSecond = BigNumber.from("10000002438562803");
    let wallet : Wallet;
    let admin: SignerWithAddress;

    let ibAlluoUSD : IbAlluo;
    let ibAlluoBTC : IbAlluo;
    let ibAlluoETH : IbAlluo;
    let ibAlluoEUR : IbAlluo;

    let ibAlluoFactory : IbAlluo__factory;
    // let mockERC20 : MetaTxERC20Token;
    let signers: SignerWithAddress[]
    let owners: string[];
    before(async function () {
        //We are forking Polygon mainnet, please set Alchemy key in .env
        await network.provider.request({
            method: "hardhat_reset",
            params: [{
                forking: {
                    enabled: true,
                    jsonRpcUrl: process.env.POLYGON_FORKING_URL as string,
                    //you can fork from last block by commenting next line
                    // blockNumber: 28729129,
                },
            },],
        });
    })

    beforeEach(async () => {
        if (typeof mneumonic !== "string") {
            return
        }

        admin = await getImpersonatedSigner("0x2580f9954529853Ca5aC5543cE39E9B5B1145135");
        let handler = "0x31a3439Ac7E6Ea7e0C0E4b846F45700c6354f8c1"

        VoteExecutorSlaveFactory = await ethers.getContractFactory("VoteExecutorSlave");

        VoteExecutorSlave = await upgrades.deployProxy(VoteExecutorSlaveFactory,
            [admin.address, handler],
            { initializer: 'initialize', kind: 'uups' }
        ) as VoteExecutorSlave;

        wallet = Wallet.fromMnemonic(mneumonic)        

        signers = await ethers.getSigners();
        
        // const DEFAULT_ADMIN_ROLE = await ibAlluoBTC.DEFAULT_ADMIN_ROLE();
        const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000"
        ibAlluoUSD = await ethers.getContractAt("IbAlluo", "0xC2DbaAEA2EfA47EBda3E572aa0e55B742E408BF6")
        ibAlluoEUR= await ethers.getContractAt("IbAlluo", "0xc9d8556645853C465D1D5e7d2c81A0031F0B8a92")
        ibAlluoETH = await ethers.getContractAt("IbAlluo", "0xc677B0918a96ad258A68785C2a3955428DeA7e50")
        ibAlluoBTC = await ethers.getContractAt("IbAlluo", "0xf272Ff86c86529504f0d074b210e95fc4cFCDce2")

        await ibAlluoUSD.connect(admin).grantRole(DEFAULT_ADMIN_ROLE, VoteExecutorSlave.address)
        await ibAlluoEUR.connect(admin).grantRole(DEFAULT_ADMIN_ROLE, VoteExecutorSlave.address)
        await ibAlluoETH.connect(admin).grantRole(DEFAULT_ADMIN_ROLE, VoteExecutorSlave.address)
        await ibAlluoBTC.connect(admin).grantRole(DEFAULT_ADMIN_ROLE, VoteExecutorSlave.address)

        await VoteExecutorSlave.updateIbAlluoAddresses();
        

        owners = [signers[3].address, signers[4].address, signers[5].address]
        const PseudoMultisigWalletFactory  = await ethers.getContractFactory("PseudoMultisigWallet");
        PseudoMultisigWallet = await PseudoMultisigWalletFactory.deploy(true);
        await PseudoMultisigWallet.addOwners(signers[3].address);
        await PseudoMultisigWallet.addOwners(signers[4].address);
        await PseudoMultisigWallet.addOwners(signers[5].address);
        await VoteExecutorSlave.setGnosis(PseudoMultisigWallet.address);
        // 0x90f79bf6eb2c4f870365e785982e1f101e93b906
        // 0x15d34aaf54267db7d7c367839aaf71a00a2c6a65
        // 0x9965507d1a55bcc2695c58ba16fb37d819b0a4dc
    });
    it("Set APYs of ibAlluos in bulk.", async function() {
        
        if (typeof mneumonic !== "string") {
            return
        }

        let encodedAPYETH = await VoteExecutorSlave.callStatic.encodeApyCommand("IbAlluoETH",800, getInterestPerSecond(1.08));
        let encodedAPYUSD = await VoteExecutorSlave.callStatic.encodeApyCommand("IbAlluoUSD",1600, getInterestPerSecond(1.16));
        let encodedAPYEUR = await VoteExecutorSlave.callStatic.encodeApyCommand("IbAlluoEUR",2400, getInterestPerSecond(1.24));
        let encodedAPYBTC = await VoteExecutorSlave.callStatic.encodeApyCommand("IbAlluoBTC",0, getInterestPerSecond(1));


        let commandIndexes = [encodedAPYETH[0], encodedAPYUSD[0], encodedAPYEUR[0], encodedAPYBTC[0]];
        let commandDatas = [encodedAPYETH[1], encodedAPYUSD[1], encodedAPYEUR[1], encodedAPYBTC[1]];

        let messages = await VoteExecutorSlave.callStatic.encodeAllMessages(commandIndexes, commandDatas);
        let encodedMessages = await VoteExecutorSlave.callStatic.encodeData( messages.messagesHash, messages.messages)
        let sigsArray = [];
        for (let i=0; i<owners.length; i++) {
            let currentOwner = await getImpersonatedSigner(owners[i]);
            let currentSig = await currentOwner.signMessage(ethers.utils.arrayify(messages.messagesHash))
            sigsArray.push(currentSig);
        }
        let entryData = ethers.utils.defaultAbiCoder.encode(["bytes", "bytes[]"], [encodedMessages, sigsArray])
        await expect(VoteExecutorSlave.anyExecute(entryData)).to.emit(VoteExecutorSlave, "MessageReceived").withArgs(messages.messagesHash);

        expect(await ibAlluoETH.interestPerSecond()).equal(getInterestPerSecond(1.08).mul(10**10))
        expect(await ibAlluoUSD.interestPerSecond()).equal(getInterestPerSecond(1.16).mul(10**10))
        expect(await ibAlluoEUR.interestPerSecond()).equal(getInterestPerSecond(1.24).mul(10**10))
        expect(await ibAlluoBTC.interestPerSecond()).equal(getInterestPerSecond(1).mul(10**10))
        // (10**27) representation of APY per second on ibAlluos
    })

    it("Calling anyExecute without enough approved sigs should revert (if it was somehow forced through anyCall)", async function() {
        
        if (typeof mneumonic !== "string") {
            return
        }

        let encodedAPYETH = await VoteExecutorSlave.callStatic.encodeApyCommand("IbAlluoETH",800, getInterestPerSecond(1.08));
        let encodedAPYUSD = await VoteExecutorSlave.callStatic.encodeApyCommand("IbAlluoUSD",1600, getInterestPerSecond(1.16));
        let encodedAPYEUR = await VoteExecutorSlave.callStatic.encodeApyCommand("IbAlluoEUR",2400, getInterestPerSecond(1.24));
        let encodedAPYBTC = await VoteExecutorSlave.callStatic.encodeApyCommand("IbAlluoBTC",0, getInterestPerSecond(1));


        let commandIndexes = [encodedAPYETH[0], encodedAPYUSD[0], encodedAPYEUR[0], encodedAPYBTC[0]];
        let commandDatas = [encodedAPYETH[1], encodedAPYUSD[1], encodedAPYEUR[1], encodedAPYBTC[1]];

        let messages = await VoteExecutorSlave.callStatic.encodeAllMessages(commandIndexes, commandDatas);
        let sigsArray = [];
        for (let i=0; i<2; i++) {
            // Only 2/3 signatures!
            let currentOwner = await getImpersonatedSigner(owners[i]);
            let currentSig = await currentOwner.signMessage(ethers.utils.arrayify(messages.messagesHash))
            sigsArray.push(currentSig);
        }
        let entryData = ethers.utils.defaultAbiCoder.encode(["bytes", "bytes[]"], [messages.inputData, sigsArray])

        await expect(VoteExecutorSlave.anyExecute(entryData)).to.be.revertedWith("Hash has not been approved");

        // (10**27) representation of APY per second on ibAlluos
    })
    it("Calling anyExecute without enough approved sigs should revert (if it was somehow forced through anyCall)", async function() {
        
        if (typeof mneumonic !== "string") {
            return
        }

        let encodedAPYETH = await VoteExecutorSlave.callStatic.encodeApyCommand("IbAlluoETH",800, getInterestPerSecond(1.08));
        let encodedAPYUSD = await VoteExecutorSlave.callStatic.encodeApyCommand("IbAlluoUSD",1600, getInterestPerSecond(1.16));
        let encodedAPYEUR = await VoteExecutorSlave.callStatic.encodeApyCommand("IbAlluoEUR",2400, getInterestPerSecond(1.24));
        let encodedAPYBTC = await VoteExecutorSlave.callStatic.encodeApyCommand("IbAlluoBTC",0, getInterestPerSecond(1));


        let commandIndexes = [encodedAPYETH[0], encodedAPYUSD[0], encodedAPYEUR[0], encodedAPYBTC[0]];
        let commandDatas = [encodedAPYETH[1], encodedAPYUSD[1], encodedAPYEUR[1], encodedAPYBTC[1]];

        let messages = await VoteExecutorSlave.callStatic.encodeAllMessages(commandIndexes, commandDatas);
        let sigsArray = [];
        for (let i=0; i<2; i++) {
            // Only 2/3 signatures!
            let currentOwner = await getImpersonatedSigner(owners[i]);
            let currentSig = await currentOwner.signMessage(ethers.utils.arrayify(messages.messagesHash))
            sigsArray.push(currentSig);
        }
        let entryData = ethers.utils.defaultAbiCoder.encode(["bytes", "bytes[]"], [messages.inputData, sigsArray])

        await expect(VoteExecutorSlave.anyExecute(entryData)).to.be.revertedWith("Hash has not been approved");

        // (10**27) representation of APY per second on ibAlluos
    })
    
    it("Calling anyExecute without enough approved sigs should revert (if it was somehow forced through anyCall)", async function() {
        
        if (typeof mneumonic !== "string") {
            return
        }

        let encodedAPYETH = await VoteExecutorSlave.callStatic.encodeApyCommand("IbAlluoETH",800, getInterestPerSecond(1.08));
        let encodedAPYUSD = await VoteExecutorSlave.callStatic.encodeApyCommand("IbAlluoUSD",1600, getInterestPerSecond(1.16));
        let encodedAPYEUR = await VoteExecutorSlave.callStatic.encodeApyCommand("IbAlluoEUR",2400, getInterestPerSecond(1.24));
        let encodedAPYBTC = await VoteExecutorSlave.callStatic.encodeApyCommand("IbAlluoBTC",0, getInterestPerSecond(1));


        let commandIndexes = [encodedAPYETH[0], encodedAPYUSD[0], encodedAPYEUR[0], encodedAPYBTC[0]];
        let commandDatas = [encodedAPYETH[1], encodedAPYUSD[1], encodedAPYEUR[1], encodedAPYBTC[1]];

        let messages = await VoteExecutorSlave.callStatic.encodeAllMessages(commandIndexes, commandDatas);
        let sigsArray = [];
        for (let i=0; i<owners.length; i++) {
            // Only 1 signature x3
            let currentOwner = await getImpersonatedSigner(owners[0]);
            let currentSig = await currentOwner.signMessage(ethers.utils.arrayify(messages.messagesHash))
            sigsArray.push(currentSig);
        }
        let entryData = ethers.utils.defaultAbiCoder.encode(["bytes", "bytes[]"], [messages.inputData, sigsArray])

        await expect(VoteExecutorSlave.anyExecute(entryData)).to.be.revertedWith("Hash has not been approved");

        // (10**27) representation of APY per second on ibAlluos
    })
    it("Calling anyExecute with fake sigs should revert (if it was somehow forced through anyCall", async function() {
        
        let encodedAPYETH = await VoteExecutorSlave.callStatic.encodeApyCommand("IbAlluoETH",800, getInterestPerSecond(1.08));
        let encodedAPYUSD = await VoteExecutorSlave.callStatic.encodeApyCommand("IbAlluoUSD",1600, getInterestPerSecond(1.16));
        let encodedAPYEUR = await VoteExecutorSlave.callStatic.encodeApyCommand("IbAlluoEUR",2400, getInterestPerSecond(1.24));
        let encodedAPYBTC = await VoteExecutorSlave.callStatic.encodeApyCommand("IbAlluoBTC",0, getInterestPerSecond(1));


        let commandIndexes = [encodedAPYETH[0], encodedAPYUSD[0], encodedAPYEUR[0], encodedAPYBTC[0]];
        let commandDatas = [encodedAPYETH[1], encodedAPYUSD[1], encodedAPYEUR[1], encodedAPYBTC[1]];

        let messages = await VoteExecutorSlave.callStatic.encodeAllMessages(commandIndexes, commandDatas);
        let sigsArray = [];
        for (let i=0; i<owners.length; i++) {
            // Random signers, not included in owners
            let currentSig = await signers[i+5].signMessage(ethers.utils.arrayify(messages.messagesHash))
            sigsArray.push(currentSig);
        }
        let entryData = ethers.utils.defaultAbiCoder.encode(["bytes", "bytes[]"], [messages.inputData, sigsArray])
        await expect(VoteExecutorSlave.anyExecute(entryData)).to.be.revertedWith("Hash has not been approved");

    })
    it("Calling anyExecute when the hash doesn't match the plaintext should revert", async function() {
        if (typeof mneumonic !== "string") {
            return
        }

        let encodedAPYETH = await VoteExecutorSlave.callStatic.encodeApyCommand("IbAlluoETH",800, getInterestPerSecond(1.08));
        let encodedAPYUSD = await VoteExecutorSlave.callStatic.encodeApyCommand("IbAlluoUSD",1600, getInterestPerSecond(1.16));
        let encodedAPYEUR = await VoteExecutorSlave.callStatic.encodeApyCommand("IbAlluoEUR",2400, getInterestPerSecond(1.24));
        let encodedAPYBTC = await VoteExecutorSlave.callStatic.encodeApyCommand("IbAlluoBTC",0, getInterestPerSecond(1));


        let commandIndexes = [encodedAPYETH[0], encodedAPYUSD[0], encodedAPYEUR[0], encodedAPYBTC[0]];
        let commandDatas = [encodedAPYETH[1], encodedAPYUSD[1], encodedAPYEUR[1], encodedAPYBTC[1]];

        let messages = await VoteExecutorSlave.callStatic.encodeAllMessages(commandIndexes, commandDatas);
        let sigsArray = [];
        for (let i=0; i<owners.length; i++) {
            let currentOwner = await getImpersonatedSigner(owners[i]);
            let currentSig = await currentOwner.signMessage(ethers.utils.arrayify(messages.messagesHash))
            sigsArray.push(currentSig);
        }

        let fakeencodedAPYUSD = await VoteExecutorSlave.callStatic.encodeApyCommand("IbAlluoUSD",1600, getInterestPerSecond(999));

        let fakecommandIndexes = [encodedAPYETH[0], encodedAPYUSD[0], encodedAPYEUR[0], encodedAPYBTC[0]];
        let fakecommandDatas = [encodedAPYETH[1], fakeencodedAPYUSD[1], encodedAPYEUR[1], encodedAPYBTC[1]];
        let fakemessages = await VoteExecutorSlave.callStatic.encodeAllMessages(fakecommandIndexes, fakecommandDatas);
        let fakeEncodedMessages =  await VoteExecutorSlave.callStatic.encodeData( messages.messagesHash, fakemessages.messages)

        let entryData = ethers.utils.defaultAbiCoder.encode(["bytes", "bytes[]"], [fakeEncodedMessages, sigsArray])

        await expect(VoteExecutorSlave.anyExecute(entryData)).to.be.revertedWith("Hash doesn't match the plaintext messages");

    })
})
