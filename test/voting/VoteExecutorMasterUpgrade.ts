import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { formatUnits, parseEther, parseUnits } from "ethers/lib/utils";
import { ethers, network, upgrades } from "hardhat";
import { PseudoMultisigWallet, PseudoMultisigWallet__factory, VoteExecutorMaster } from "../../typechain";

describe("VoteExecutor", function () {
    let admin:SignerWithAddress
    let multisig: PseudoMultisigWallet;
  async function skipDays(d: number) {
    ethers.provider.send('evm_increaseTime', [d * 86400]);
    ethers.provider.send('evm_mine', []);
}
async function getImpersonatedSigner(address: string): Promise<SignerWithAddress> {
    await ethers.provider.send(
        'hardhat_impersonateAccount',
        [address]
    );

    return await ethers.getSigner(address);
}

function getInterestPerSecond(apyDecimal: number): BigNumber {
    return BigNumber.from(String(Math.round(Math.pow(apyDecimal, 1/31536000)*10**17)))
}


async function sendEth(users: SignerWithAddress[]) {
    let signers = await ethers.getSigners();

    for (let i = 0; i < users.length; i++) {
        await signers[0].sendTransaction({
            to: users[i].address,
            value: parseEther("1.0")

        });
    }
}
        before(async () => {

            await network.provider.request({
              method: "hardhat_reset",
              params: [{
                  forking: {
                      enabled: true,
                      jsonRpcUrl: process.env.MAINNET_FORKING_URL as string,
                      //you can fork from last block by commenting next line
                  },
              },],
          });
   

    })

    beforeEach(async () => {

    });

    describe('Test Master upgrade and new fix', function () {
        it("Try upgrade Master", async function () {
            admin = await getImpersonatedSigner("0x1F020A4943EB57cd3b2213A66b355CB662Ea43C3");
            let VoteExecutorMaster = await ethers.getContractAt("VoteExecutorMaster", "0x4Fd58328C2e0dDa1Ea8f4C70321C91B366582eA2" )
            await sendEth([admin]);
            await VoteExecutorMaster.connect(admin).grantRole("0x189ab7a9244df0848122154315af71fe140f3db0fe014031783b0946b8c9d2e3","0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266" )
            await VoteExecutorMaster.connect(admin).changeUpgradeStatus(true);
            const MasterNew = await ethers.getContractFactory("VoteExecutorMaster");

            await upgrades.upgradeProxy("0x4Fd58328C2e0dDa1Ea8f4C70321C91B366582eA2", MasterNew);
            console.log("Upgrade complete")
        });

        it("Try execute same hash twice and fail", async function () {
            admin = await getImpersonatedSigner("0x1F020A4943EB57cd3b2213A66b355CB662Ea43C3");
            let VoteExecutorMaster = await ethers.getContractAt("VoteExecutorMaster", "0x4Fd58328C2e0dDa1Ea8f4C70321C91B366582eA2" )
            await sendEth([admin]);
            await VoteExecutorMaster.connect(admin).grantRole("0x189ab7a9244df0848122154315af71fe140f3db0fe014031783b0946b8c9d2e3","0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266" )
            await VoteExecutorMaster.connect(admin).changeUpgradeStatus(true);
            const MasterNew = await ethers.getContractFactory("VoteExecutorMaster");
            let newImpl = await MasterNew.deploy();
            await VoteExecutorMaster.upgradeTo(newImpl.address)
            // await upgrades.upgradeProxy("0x4Fd58328C2e0dDa1Ea8f4C70321C91B366582eA2", MasterNew);

            // Set new gnosis with 
            multisig =await (await ethers.getContractFactory("PseudoMultisigWallet")).deploy(true)
            let signers = await ethers.getSigners();
            await multisig.addOwners(signers[0].address);
            await multisig.addOwners(signers[1].address);
            await VoteExecutorMaster.connect(admin).grantRole("0x0000000000000000000000000000000000000000000000000000000000000000",multisig.address )
            let impersonated = await getImpersonatedSigner(multisig.address)
            await sendEth([impersonated])
            console.log("got here")
            await VoteExecutorMaster.connect(impersonated).setGnosis(multisig.address);

            console.log("got here2")

            let encodedAPYETH = await VoteExecutorMaster.callStatic.encodeApyCommand("IbAlluoETH",800, getInterestPerSecond(1.08));
            let encodedAPYUSD = await VoteExecutorMaster.callStatic.encodeApyCommand("IbAlluoUSD",1600, getInterestPerSecond(1.16));
            let encodedAPYEUR = await VoteExecutorMaster.callStatic.encodeApyCommand("IbAlluoEUR",2400, getInterestPerSecond(1.24));
            let encodedAPYBTC = await VoteExecutorMaster.callStatic.encodeApyCommand("IbAlluoBTC",0, getInterestPerSecond(1));
    
    
            let commandIndexes = [encodedAPYETH[0], encodedAPYUSD[0], encodedAPYEUR[0], encodedAPYBTC[0]];
            let commandDatas = [encodedAPYETH[1], encodedAPYUSD[1], encodedAPYEUR[1], encodedAPYBTC[1]];
            console.log("got her3e")

            let messages = await VoteExecutorMaster.callStatic.encodeAllMessages(commandIndexes, commandDatas);
            let sigsArray = [];
            let owners = await multisig.getOwners();
            for (let i=0; i< owners.length; i++) {
                let currentOwner = await getImpersonatedSigner(owners[i]);
                let currentSig = await currentOwner.signMessage(ethers.utils.arrayify(messages.messagesHash))
                sigsArray.push(currentSig);
            }
            await VoteExecutorMaster.submitData(messages.inputData)
            await VoteExecutorMaster.approveSubmittedData(4, sigsArray)
            await VoteExecutorMaster.executeSpecificData(4);
            await expect(VoteExecutorMaster.executeSpecificData(4)).to.be.revertedWith("Duplicate Hash")
        });
        it("Deploy gas estimation", async function() {
            const MasterNew = await ethers.getContractFactory("VoteExecutorMaster");
            let newImpl = await MasterNew.deploy();
            console.log("Newimpl", newImpl.address)
        })
        it("Try execute same hash twice after clearing it with admin", async function () {
            admin = await getImpersonatedSigner("0x1F020A4943EB57cd3b2213A66b355CB662Ea43C3");
            let VoteExecutorMaster = await ethers.getContractAt("VoteExecutorMaster", "0x4Fd58328C2e0dDa1Ea8f4C70321C91B366582eA2" )
            await sendEth([admin]);
            await VoteExecutorMaster.connect(admin).grantRole("0x189ab7a9244df0848122154315af71fe140f3db0fe014031783b0946b8c9d2e3","0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266" )
            await VoteExecutorMaster.connect(admin).changeUpgradeStatus(true);
            const MasterNew = await ethers.getContractFactory("VoteExecutorMaster");
            let newImpl = await MasterNew.deploy();
            await VoteExecutorMaster.upgradeTo(newImpl.address)
            // await upgrades.upgradeProxy("0x4Fd58328C2e0dDa1Ea8f4C70321C91B366582eA2", MasterNew);

            // Set new gnosis with 
            multisig =await (await ethers.getContractFactory("PseudoMultisigWallet")).deploy(true)
            let signers = await ethers.getSigners();
            await multisig.addOwners(signers[0].address);
            await multisig.addOwners(signers[1].address);
            await VoteExecutorMaster.connect(admin).grantRole("0x0000000000000000000000000000000000000000000000000000000000000000",multisig.address )
            let impersonated = await getImpersonatedSigner(multisig.address)
            await sendEth([impersonated])
            await VoteExecutorMaster.connect(impersonated).setGnosis(multisig.address);

            let encodedAPYETH = await VoteExecutorMaster.callStatic.encodeApyCommand("IbAlluoETH",800, getInterestPerSecond(1.08));
            let encodedAPYUSD = await VoteExecutorMaster.callStatic.encodeApyCommand("IbAlluoUSD",1600, getInterestPerSecond(1.16));
            let encodedAPYEUR = await VoteExecutorMaster.callStatic.encodeApyCommand("IbAlluoEUR",2400, getInterestPerSecond(1.24));
            let encodedAPYBTC = await VoteExecutorMaster.callStatic.encodeApyCommand("IbAlluoBTC",0, getInterestPerSecond(1));
    
    
            let commandIndexes = [encodedAPYETH[0], encodedAPYUSD[0], encodedAPYEUR[0], encodedAPYBTC[0]];
            let commandDatas = [encodedAPYETH[1], encodedAPYUSD[1], encodedAPYEUR[1], encodedAPYBTC[1]];
            console.log("got her3e")

            let messages = await VoteExecutorMaster.callStatic.encodeAllMessages(commandIndexes, commandDatas);
            let sigsArray = [];
            let owners = await multisig.getOwners();
            for (let i=0; i< owners.length; i++) {
                let currentOwner = await getImpersonatedSigner(owners[i]);
                let currentSig = await currentOwner.signMessage(ethers.utils.arrayify(messages.messagesHash))
                sigsArray.push(currentSig);
            }
            await VoteExecutorMaster.submitData(messages.inputData)
            await VoteExecutorMaster.approveSubmittedData(4, sigsArray)
            await VoteExecutorMaster.executeSpecificData(4);

            await VoteExecutorMaster.connect(admin).clearExecutionHash(messages.messagesHash);

            await VoteExecutorMaster.executeSpecificData(4);
            // await expect(VoteExecutorMaster.executeSpecificData(4)).to.be.revertedWith("Duplicate Hash")
        });
    });

});