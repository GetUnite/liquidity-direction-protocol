import { parseEther, parseUnits } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Address } from "cluster";
import { BigNumber, BigNumberish, BytesLike } from "ethers";
import { ethers, network, upgrades } from "hardhat";
import { IERC20, PseudoMultisigWallet, PseudoMultisigWallet__factory, IbAlluo, IbAlluo__factory, LiquidityHandler, UsdCurveAdapter, LiquidityHandler__factory, UsdCurveAdapter__factory, EurCurveAdapter, EthNoPoolAdapter, EurCurveAdapter__factory, EthNoPoolAdapter__factory, BtcCurveAdapter, StIbAlluo, ISuperTokenFactory, SuperfluidResolver, StIbAlluo__factory, BufferManager, BufferManager__factory } from "../../typechain-types";


async function skipDays(d: number) {
    ethers.provider.send('evm_increaseTime', [d * 86400]);
    ethers.provider.send('evm_mine', []);
}

function getRandomArbitrary(min: number, max: number) {
    return Math.floor(Math.random() * (max - min) + min);
}

async function getImpersonatedSigner(address: string): Promise<SignerWithAddress> {
    await ethers.provider.send(
        'hardhat_impersonateAccount',
        [address]
    );

    return await ethers.getSigner(address);
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

async function prepareCallData(type: string, parameters: any[]): Promise<BytesLike> {
    if (type == "status") {
        let ABI = ["function changeUpgradeStatus(bool _status)"];
        let iface = new ethers.utils.Interface(ABI);
        let calldata = iface.encodeFunctionData("changeUpgradeStatus", [parameters[0]]);
        return calldata;
    }
    else if (type == "role") {
        let ABI = ["function grantRole(bytes32 role, address account)"];
        let iface = new ethers.utils.Interface(ABI);
        let calldata = iface.encodeFunctionData("grantRole", [parameters[0], parameters[1]]);
        return calldata;
    }
    else {
        return ethers.utils.randomBytes(0);
    }
}
describe("Test adding pausability to deposits and withdrawals", function () {
    let signers: SignerWithAddress[];
    let admin: SignerWithAddress;

    let ibAlluoCurrent: IbAlluo;
    let StIbAlluo: StIbAlluo;

    let usdAdapter: UsdCurveAdapter;

    let multisig: PseudoMultisigWallet;
    let handler: LiquidityHandler;
    let buffer: BufferManager;

    let dai: IERC20, usdc: IERC20, usdt: IERC20;
    let curveLpUSD: IERC20;
    let superToken: IERC20;

    let usdWhale: SignerWithAddress;
    let curveUsdLpHolder: SignerWithAddress;

    let exchangeAddress: string;
    let superFactory: ISuperTokenFactory;
    let resolver: SuperfluidResolver;

    const spokepooladdress = "0x69B5c72837769eF1e7C164Abc6515DcFf217F920";
    const anycalladdress = "0xC10Ef9F491C9B59f936957026020C321651ac078";
    const gelatoaddress = "0x7A34b2f0DA5ea35b5117CaC735e99Ba0e2aCEECD";
    const iballuoaddress = "0xC2DbaAEA2EfA47EBda3E572aa0e55B742E408BF6";

    const ZERO_ADDR = ethers.constants.AddressZero;

    beforeEach(async function () {
        upgrades.silenceWarnings()

        //We are forking Polygon mainnet, please set Alchemy key in .env
        await network.provider.request({
            method: "hardhat_reset",
            params: [{
                forking: {
                    enabled: true,
                    jsonRpcUrl: process.env.POLYGON_URL as string,
                    //you can fork from last block by commenting next line
                },
            },],
        });

        signers = await ethers.getSigners();

        admin = await getImpersonatedSigner("0x2580f9954529853Ca5aC5543cE39E9B5B1145135");
        await (await (await ethers.getContractFactory("ForceSender")).deploy({
            value: parseEther("10.0")
        })).forceSend(admin.address);
    });

    describe("test fix", async function () {
        it("Test that after pausing, no one can deposit or withdraw ", async function () {


            let IbAlluoEth = await ethers.getContractAt("IbAlluo", "0xc677B0918a96ad258A68785C2a3955428DeA7e50");


            await IbAlluoEth.connect(admin).changeUpgradeStatus(true);

            let newIbAlluoPausable = await ethers.getContractFactory("IbAlluo");
            let newImplementaion = await newIbAlluoPausable.deploy();

            await IbAlluoEth.connect(admin).upgradeTo(newImplementaion.address);


            let impersonated = await ethers.getImpersonatedSigner("0x0d966513ed324144fa14aba2d6ac4ea58e325ab2");
            await signers[0].sendTransaction({ to: impersonated.address, value: parseEther("1.0") })

            await IbAlluoEth.connect(admin).pause();

            await expect(IbAlluoEth.connect(impersonated).withdraw("0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", parseEther("0.1"))).to.be.revertedWith("Pausable: paused")

            let weth = await ethers.getContractAt("IERC20Metadata", "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619");
            console.log("weth balance", await weth.balanceOf(impersonated.address))

            await weth.connect(impersonated).approve(IbAlluoEth.address, ethers.utils.parseEther("1000"))
            await expect(IbAlluoEth.connect(impersonated).deposit(weth.address, await weth.balanceOf(impersonated.address))).to.be.revertedWith("Pausable: paused")
        })

        it("Test that after pausing, unpausing should allow deposits and withdrawals to go through", async function () {


            let IbAlluoEth = await ethers.getContractAt("IbAlluo", "0xc677B0918a96ad258A68785C2a3955428DeA7e50");


            await IbAlluoEth.connect(admin).changeUpgradeStatus(true);

            let newIbAlluoPausable = await ethers.getContractFactory("IbAlluo");
            let newImplementaion = await newIbAlluoPausable.deploy();

            await IbAlluoEth.connect(admin).upgradeTo(newImplementaion.address);


            let impersonated = await ethers.getImpersonatedSigner("0x0d966513ed324144fa14aba2d6ac4ea58e325ab2");
            await signers[0].sendTransaction({ to: impersonated.address, value: parseEther("1.0") })

            await IbAlluoEth.connect(admin).pause();
            console.log("gothere")
            await IbAlluoEth.connect(admin).unpause();

            await IbAlluoEth.connect(impersonated).withdraw("0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", parseEther("0.1"))

            let weth = await ethers.getContractAt("IERC20Metadata", "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619");
            console.log("weth balance", await weth.balanceOf(impersonated.address))

            await weth.connect(impersonated).approve(IbAlluoEth.address, ethers.utils.parseEther("1000"))
            await IbAlluoEth.connect(impersonated).deposit(weth.address, await weth.balanceOf(impersonated.address))



        })

    })
});