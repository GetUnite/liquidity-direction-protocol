import { parseEther, parseUnits } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, BigNumberish, BytesLike, Wallet } from "ethers";
import { defaultAbiCoder } from "ethers/lib/utils";
import { ethers, network, upgrades } from "hardhat";
import { before } from "mocha";
import { ERC20, IbAlluo, IbAlluo__factory, PseudoMultisigWallet, VoteExecutorSlave, VoteExecutorSlave__factory, VoteExecutorMaster, PseudoMultisigWallet__factory, VoteExecutorResolver__factory} from "../../typechain";

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


describe("VoteExecutorResolver", function() {
   
    before(async function () {
        //We are forking Polygon mainnet, please set Alchemy key in .env
        await network.provider.request({
            method: "hardhat_reset",
            params: [{
                forking: {
                    enabled: true,
                    jsonRpcUrl: process.env.MAINNET_FORKING_URL as string,
                    //you can fork from last block by commenting next line
                    // blockNumber: 28729129,
                },
            },],
        });

    })

    it("Check if returns true", async function() {
        const signers = await ethers.getSigners();
        const PseudoMultisigWallet = await ethers.getContractFactory("PseudoMultisigWallet") as PseudoMultisigWallet__factory;
        const pseudoMultisigWallet = await PseudoMultisigWallet.deploy(true)
        await pseudoMultisigWallet.addOwners(signers[0].address)
        await pseudoMultisigWallet.addOwners(signers[1].address)

        let gnosis = await getImpersonatedSigner(pseudoMultisigWallet.address)

        await (await (await ethers.getContractFactory("ForceSender")).deploy({
            value: parseEther("10.0")
        })).forceSend(gnosis.address);

        // Please double check the addresses below and MinSigns
        let locker = "0xf295ee9f1fa3df84493ae21e08ec2e1ca9debbaf";
        let anyCall = "0xC10Ef9F491C9B59f936957026020C321651ac078";
        let timelock = 0;
        let MinSigns = 1;

        const VoteExecutorMasterFactory = await ethers.getContractFactory("VoteExecutorMaster");
        const VoteExecutorMaster = await upgrades.deployProxy(VoteExecutorMasterFactory, 
            [gnosis.address, locker, anyCall, timelock],
            { initializer: 'initialize', kind: 'uups' }
        ) as VoteExecutorMaster


        await VoteExecutorMaster.connect(gnosis).setMinSigns(MinSigns);
        await VoteExecutorMaster.connect(gnosis).setNextChainExecutor("0x1D147031b6B4998bE7D446DecF7028678aeb732A", "137");


        const message0 = await VoteExecutorMaster.encodeApyCommand("IbAlluoUSD", 1000, 1000);
        const encoded0 = await VoteExecutorMaster.encodeAllMessages([message0[0]], [message0[1]])

        

        const message1 = await VoteExecutorMaster.encodeApyCommand("IbAlluoEur", 1000, 1000);
        const encoded1 = await VoteExecutorMaster.encodeAllMessages([message1[0]], [message1[1]])

        

        const message2 = await VoteExecutorMaster.encodeApyCommand("IbAlluoBtc", 1000, 1000);
        const encoded2 = await VoteExecutorMaster.encodeAllMessages([message2[0]], [message2[1]])

        await VoteExecutorMaster.submitData(encoded0[2])
        await VoteExecutorMaster.submitData(encoded1[2])
        await VoteExecutorMaster.submitData(encoded2[2])

        const sig3 = await signers[0].signMessage(ethers.utils.arrayify(encoded0[0]))
        const sig4 = await signers[1].signMessage(ethers.utils.arrayify(encoded0[0]))
        await VoteExecutorMaster.approveSubmittedData(0, [sig3,sig4])
        await VoteExecutorMaster.executeSpecificData(0);

        const sig1 = await signers[0].signMessage(ethers.utils.arrayify(encoded2[0]))
        const sig2 = await signers[1].signMessage(ethers.utils.arrayify(encoded2[0]))
        await VoteExecutorMaster.approveSubmittedData(2, [sig1,sig2])

            
        const ResolverFactory = await ethers.getContractFactory("VoteExecutorResolver") as VoteExecutorResolver__factory
        const Resolver = await ResolverFactory.deploy(VoteExecutorMaster.address);

        const result = await Resolver.callStatic.VoteExecutorChecker();
        console.log(result);
        expect(result.canExec).equals(true);
        // if (result.canExec) {
        //     await VoteExecutorMaster.ex
        // }
    }
    )
})
