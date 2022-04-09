import { parseEther, parseUnits } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, BigNumberish, BytesLike } from "ethers";
import { ethers, network, upgrades } from "hardhat";
import { before } from "mocha";
import { LiquidityBufferUSDAdaptor, LiquidityBufferUSDAdaptor__factory, IERC20, PseudoMultisigWallet, PseudoMultisigWallet__factory , AlluoLpV3, AlluoLpV3__factory, LiquidityBufferVault, LiquidityBufferVault__factory, LiquidityBufferVaultForTests__factory, LiquidityBufferVaultForTests,  IbAlluo, IbAlluo__factory, IbAlluoV2, LiquidityBufferVaultV2, IbAlluoV2__factory, LiquidityBufferVaultV2__factory} from "../typechain";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

async function skipDays(d: number) {
    ethers.provider.send('evm_increaseTime', [d * 86400]);
    ethers.provider.send('evm_mine', []);
}

function getRandomArbitrary(min: number, max: number) {
    return Math.floor(Math.random() * (max - min) + min);
  }

async function  prepareCallData(type: string, parameters: any[]) : Promise<BytesLike>{
    if(type == "status"){
        let ABI = ["function changeUpgradeStatus(bool _status)"];
        let iface = new ethers.utils.Interface(ABI);
        let calldata = iface.encodeFunctionData("changeUpgradeStatus", [parameters[0]]);
        return calldata;
    }
    else if(type == "role"){
        let ABI = ["function grantRole(bytes32 role, address account)"];
        let iface = new ethers.utils.Interface(ABI);
        let calldata = iface.encodeFunctionData("grantRole", [parameters[0], parameters[1]]);
        return calldata;
    }
    else{
        return ethers.utils.randomBytes(0);
    }
}


describe("IbAlluo and Buffer", function () {
    let signers: SignerWithAddress[];
    let whale: SignerWithAddress;
    let curveLpHolder: SignerWithAddress;


    let ibAlluoCurrent: IbAlluoV2;
    let multisig: PseudoMultisigWallet;
    let buffer: LiquidityBufferVaultV2;

    let dai: IERC20, usdc: IERC20, usdt: IERC20;
    let curveLp: IERC20;
    let adaptor: LiquidityBufferUSDAdaptor;
    before(async function () {

        //We are forking Polygon mainnet, please set Alchemy key in .env
        await network.provider.request({
            method: "hardhat_reset",
            params: [{
                forking: {
                    enabled: true,
                    jsonRpcUrl: process.env.POLYGON_FORKING_URL as string,
                    //you can fork from last block by commenting next line
                    blockNumber: 26313740, 
                },
            },],
        });

        signers = await ethers.getSigners();
        const whaleAddress = "0x075e72a5eDf65F0A5f44699c7654C1a76941Ddc8";
        const curveLpHolderAddress = "0xa0f2e2f7b3ab58e3e52b74f08d94ae52778d46df";

        await ethers.provider.send(
            'hardhat_impersonateAccount',
            [whaleAddress]
        );

        await ethers.provider.send(
            'hardhat_impersonateAccount',
            [curveLpHolderAddress]
        );
        
        whale = await ethers.getSigner(whaleAddress);
        curveLpHolder = await ethers.getSigner(curveLpHolderAddress);
        dai = await ethers.getContractAt("IERC20", "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063");
        usdc = await ethers.getContractAt("IERC20", "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174");
        usdt = await ethers.getContractAt("IERC20", "0xc2132D05D31c914a87C6611C10748AEb04B58e8F");
        curveLp = await ethers.getContractAt("IERC20", "0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171");
        
        console.log("We are forking Polygon mainnet\n");
        expect(await dai.balanceOf(whale.address)).to.be.gt(0, "Whale has no DAI, or you are not forking Polygon");

        await signers[0].sendTransaction({
            to: whale.address,
            value: parseEther("100.0")
        });
    });


    beforeEach(async function () {

        const IbAlluo = await ethers.getContractFactory("IbAlluoV2") as IbAlluoV2__factory;
        //We are using this contract to simulate Gnosis multisig wallet
        const Multisig = await ethers.getContractFactory("PseudoMultisigWallet") as PseudoMultisigWallet__factory;
        const Adaptor = await ethers.getContractFactory("LiquidityBufferUSDAdaptor") as LiquidityBufferUSDAdaptor__factory;
        const Buffer = await ethers.getContractFactory("LiquidityBufferVaultV2") as LiquidityBufferVaultV2__factory;
        
        let curvePool = "0x445FE580eF8d70FF569aB36e80c647af338db351"

        multisig = await Multisig.deploy(true);
        await upgrades.silenceWarnings();
        buffer = await upgrades.deployProxy(Buffer,
            [multisig.address, multisig.address,],
            {initializer: 'initialize', kind:'uups',unsafeAllow: ['delegatecall']},
        ) as LiquidityBufferVaultV2;

        ibAlluoCurrent = await upgrades.deployProxy(IbAlluo,
            [multisig.address,
            buffer.address,
            [dai.address,
            usdc.address,
            usdt.address]],
            {initializer: 'initialize', kind:'uups'}
        ) as IbAlluoV2;
        
        adaptor = await Adaptor.deploy();
        // Necessary info for adaptor:
        // multisig.address, curvePool, dai.address, usdc.address, usdt.address

        let ABI = ["function setAlluoLp(address newAlluoLp)"];
        let iface = new ethers.utils.Interface(ABI);
        let calldata = iface.encodeFunctionData("setAlluoLp", [ibAlluoCurrent.address]);
        await multisig.executeCall(buffer.address, calldata);

        ABI = ["function setPrimaryToken(address newPrimaryToken)"];
        iface = new ethers.utils.Interface(ABI);
        calldata = iface.encodeFunctionData("setPrimaryToken", [usdc.address]);
        await multisig.executeCall(buffer.address, calldata);


        expect(await ibAlluoCurrent.liquidityBuffer()).equal(buffer.address);
        await ibAlluoCurrent.migrateStep2();

        ABI = ["function registerInputTokens(address[] calldata inputTokenAddresses, uint32[] calldata protocolIds, address[] calldata poolAddresses)"];
        iface = new ethers.utils.Interface(ABI);
        calldata = iface.encodeFunctionData("registerInputTokens", [[dai.address, usdc.address, usdt.address], [0,0,0], [ZERO_ADDRESS,ZERO_ADDRESS,ZERO_ADDRESS]] );
        await multisig.executeCall(buffer.address, calldata);

        ABI = ["function registerAdaptors(address[] calldata _adaptors, uint32[] calldata protocolIds)"];
        iface = new ethers.utils.Interface(ABI);
        calldata = iface.encodeFunctionData("registerAdaptors", [[adaptor.address], [0]]);
        await multisig.executeCall(buffer.address, calldata);
        console.log("this is the adaptor address", adaptor.address);

        // ABI = ["function approveAllDelegateCall (address _adaptor, address _pool)"];
        // iface = new ethers.utils.Interface(ABI);
        // calldata = iface.encodeFunctionData("approveAllDelegateCall", [adaptor.address, curvePool]);
        // await multisig.executeCall(buffer.address, calldata);
        await buffer.approveAllDelegateCall(adaptor.address, curvePool)
    });

    describe('USD Adaptor with IBAlluo + LiquidityBuffer', function () {

        it("Depositing dai should increase the balance of the liquidity buffer", async function () {
            // await deposit(signers[0], dai, parseEther("100"));
            // console.log(await buffer.getBufferAmount());
            // If delegatecall worked, we should have max approvals
            console.log(await dai.allowance(buffer.address, "0x445FE580eF8d70FF569aB36e80c647af338db351"))
        })
    })

    async function deposit(recipient: SignerWithAddress, token: IERC20, amount: BigNumberish) {
        await token.connect(whale).transfer(recipient.address, amount);

        await token.connect(recipient).approve(ibAlluoCurrent.address, amount);
        
        await ibAlluoCurrent.connect(recipient).deposit(token.address, amount);
    }
    
});
