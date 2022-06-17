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

    });
    it("Set APYs of ibAlluos in bulk.", async function() {
        
        if (typeof mneumonic !== "string") {
            return
        }
        let apydataETH = ethers.utils.defaultAbiCoder.encode(["uint256", "uint256", "string"], [800, getInterestPerSecond(1.08), "IbAlluoETH"])
        let apydataUSD= ethers.utils.defaultAbiCoder.encode(["uint256", "uint256", "string"], [1600,  getInterestPerSecond(1.16), "IbAlluoUSD"])
        let apydataEUR = ethers.utils.defaultAbiCoder.encode(["uint256", "uint256", "string"], [2400,  getInterestPerSecond(1.24), "IbAlluoEUR"])
        let apydataBTC = ethers.utils.defaultAbiCoder.encode(["uint256", "uint256", "string"], [0,  getInterestPerSecond(1), "IbAlluoBTC"])
      
        let messages = [apydataETH, apydataUSD, apydataEUR, apydataBTC]
        let names = [0,0, 0, 0]

        let encodedCommands = await VoteExecutorSlave.callStatic.encodeCommands(names, messages)
        let entryData = await VoteExecutorSlave.callStatic.encodeData(encodedCommands.hashedCommands,encodedCommands.commands);
        await VoteExecutorSlave.connect(admin).approveHash(encodedCommands.hashedCommands)
        await expect(VoteExecutorSlave.anyExecute(entryData)).to.emit(VoteExecutorSlave, "MessageReceived").withArgs(encodedCommands.hashedCommands);

        expect(await ibAlluoETH.interestPerSecond()).equal(getInterestPerSecond(1.08).mul(10**10))
        expect(await ibAlluoUSD.interestPerSecond()).equal(getInterestPerSecond(1.16).mul(10**10))
        expect(await ibAlluoEUR.interestPerSecond()).equal(getInterestPerSecond(1.24).mul(10**10))
        expect(await ibAlluoBTC.interestPerSecond()).equal(getInterestPerSecond(1).mul(10**10))
        // (10**27) representation of APY per second on ibAlluos
    })

    it("Calling anyExecute without hash approved by admin on L2 should revert", async function() {
        
        if (typeof mneumonic !== "string") {
            return
        }
        let apydataETH = ethers.utils.defaultAbiCoder.encode(["uint256", "uint256", "string"], [800, getInterestPerSecond(1.08), "IbAlluoETH"])
        let apydataUSD= ethers.utils.defaultAbiCoder.encode(["uint256", "uint256", "string"], [1600,  getInterestPerSecond(1.16), "IbAlluoUSD"])
        let apydataEUR = ethers.utils.defaultAbiCoder.encode(["uint256", "uint256", "string"], [2400,  getInterestPerSecond(1.24), "IbAlluoEUR"])
        let apydataBTC = ethers.utils.defaultAbiCoder.encode(["uint256", "uint256", "string"], [0,  getInterestPerSecond(1), "IbAlluoBTC"])
      
        let messages = [apydataETH, apydataUSD, apydataEUR, apydataBTC]
        let names = [0,0, 0, 0]

        let encodedCommands = await VoteExecutorSlave.callStatic.encodeCommands(names, messages)
        let entryData = await VoteExecutorSlave.callStatic.encodeData(encodedCommands.hashedCommands,encodedCommands.commands);

        // Do NOT approve with multisig.
        // await VoteExecutorSlave.connect(admin).approveHash(encodedCommands.hashedCommands)

        await expect(VoteExecutorSlave.anyExecute(entryData)).to.be.revertedWith("Hash has not been approved");

        // (10**27) representation of APY per second on ibAlluos
    })
    it("Calling anyExecute when the hash doesn't match the plaintext should revert", async function() {
        
        if (typeof mneumonic !== "string") {
            return
        }
        let apydataETH = ethers.utils.defaultAbiCoder.encode(["uint256", "uint256", "string"], [800, getInterestPerSecond(1.08), "IbAlluoETH"])
        let apydataUSD= ethers.utils.defaultAbiCoder.encode(["uint256", "uint256", "string"], [1600,  getInterestPerSecond(1.16), "IbAlluoUSD"])
        let apydataEUR = ethers.utils.defaultAbiCoder.encode(["uint256", "uint256", "string"], [2400,  getInterestPerSecond(1.24), "IbAlluoEUR"])
        let apydataBTC = ethers.utils.defaultAbiCoder.encode(["uint256", "uint256", "string"], [0,  getInterestPerSecond(1), "IbAlluoBTC"])
      
        let messages = [apydataETH, apydataUSD, apydataEUR, apydataBTC]
        let names = [0,0, 0, 0]

        let encodedCommands = await VoteExecutorSlave.callStatic.encodeCommands(names, messages)

        apydataEUR = ethers.utils.defaultAbiCoder.encode(["uint256", "uint256", "string"], [2400,  getInterestPerSecond(99), "IbAlluoEUR"])
        let fakemessages = [apydataETH, apydataUSD, apydataEUR, apydataBTC]
        let fakenames = [0,0, 0, 0]
        let fakeencodedCommands = await VoteExecutorSlave.callStatic.encodeCommands(fakenames, fakemessages)

        let entryData = await VoteExecutorSlave.callStatic.encodeData(fakeencodedCommands.hashedCommands,encodedCommands.commands);

        await VoteExecutorSlave.connect(admin).approveHash(encodedCommands.hashedCommands)

        await expect(VoteExecutorSlave.anyExecute(entryData)).to.be.revertedWith("Hash doesn't match the plaintext commands");

    })
})
