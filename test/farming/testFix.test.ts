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
describe("IbAlluoUSD and Handler", function () {
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

    before(async function () {
        upgrades.silenceWarnings()

        //We are forking Polygon mainnet, please set Alchemy key in .env
        await network.provider.request({
            method: "hardhat_reset",
            params: [{
                forking: {
                    enabled: true,
                    jsonRpcUrl: process.env.POLYGON_FORKING_URL as string,
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
        it("Test", async function () {

            let IbAlluoUsd = await ethers.getContractAt("IbAlluo", "0xC2DbaAEA2EfA47EBda3E572aa0e55B742E408BF6");
            let IbAlluoEur = await ethers.getContractAt("IbAlluo", "0xc9d8556645853C465D1D5e7d2c81A0031F0B8a92");
            let IbAlluoEth = await ethers.getContractAt("IbAlluo", "0xc677B0918a96ad258A68785C2a3955428DeA7e50");
            let IbAlluoBtc = await ethers.getContractAt("IbAlluo", "0xf272Ff86c86529504f0d074b210e95fc4cFCDce2");

            // // Upgrade each one

            // await IbAlluoUsd.connect(admin).changeUpgradeStatus(true);
            // await IbAlluoEur.connect(admin).changeUpgradeStatus(true);
            // await IbAlluoEth.connect(admin).changeUpgradeStatus(true);
            // await IbAlluoBtc.connect(admin).changeUpgradeStatus(true);

            // let newimp = "0x761b59b1982798687c73b0896b33ee3323518f89";
            // await IbAlluoUsd.connect(admin).upgradeTo(newimp);
            // await IbAlluoEur.connect(admin).upgradeTo(newimp);
            // await IbAlluoEth.connect(admin).upgradeTo(newimp);
            // await IbAlluoBtc.connect(admin).upgradeTo(newimp);


            // await IbAlluoUsd.connect(admin).setInterest(1, 1)
            // await IbAlluoEth.connect(admin).setInterest(1, 1)
            // await IbAlluoBtc.connect(admin).setInterest(1, 1)

            // // Ok now all is upgraded

            // await IbAlluoUsd.connect(admin).setGrowingRatioBack("1091813962690508603");
            // await IbAlluoEth.connect(admin).setGrowingRatioBack("1057961272232775543");
            // await IbAlluoBtc.connect(admin).setGrowingRatioBack("1039693581846048938");

            function getInterestPerSecondParam(apyPercent: number): string {
                const secondsInYear = 31536000;
                const decimalApy = 1 + (apyPercent / 100);
                const decimalInterest = Math.pow(decimalApy, 1 / secondsInYear);
                return Math.round(decimalInterest * (10 ** 17)).toString();
            }

            function getAnnualInterestParam(apyPercent: number): number {
                return Math.round(apyPercent * 100);
            }

            // await IbAlluoUsd.connect(admin).setInterest(getAnnualInterestParam(7), getInterestPerSecondParam(7))
            // await IbAlluoEth.connect(admin).setInterest(getAnnualInterestParam(5), getInterestPerSecondParam(5))
            // await IbAlluoBtc.connect(admin).setInterest(getAnnualInterestParam(2.5), getInterestPerSecondParam(2.5))

            // console.log("Check growing ratio");
            // console.log("IbAlluoUsd: ", (await IbAlluoUsd.growingRatio()).toString());
            // console.log("IbAlluoEth: ", (await IbAlluoEth.growingRatio()).toString());
            // console.log("IbAlluoBtc: ", (await IbAlluoBtc.growingRatio()).toString());
            let impersonated = await ethers.getImpersonatedSigner("0x089df29ABcF12a49379DCE0d2cD7027b15c2Ab62");
            let signers = await ethers.getSigners();
            await IbAlluoUsd.connect(impersonated).transfer(signers[0].address, parseEther("25000"))
            await signers[0].sendTransaction({ to: impersonated.address, value: parseEther("1.0") })
            await IbAlluoUsd.connect(impersonated).withdraw("0x2791bca1f2de4661ed88a30c99a7a9449aa84174", (await IbAlluoUsd.getBalance(impersonated.address)).mul(999).div(1000))

            let usdc = await ethers.getContractAt("IERC20Metadata", "0x2791bca1f2de4661ed88a30c99a7a9449aa84174");
            console.log("usdc balance", await usdc.balanceOf(impersonated.address))

            await usdc.connect(impersonated).approve(IbAlluoUsd.address, ethers.utils.parseEther("1000"))
            await IbAlluoUsd.connect(impersonated).deposit(usdc.address, await usdc.balanceOf(impersonated.address));

            await IbAlluoUsd.connect(impersonated).withdraw("0x2791bca1f2de4661ed88a30c99a7a9449aa84174", (await IbAlluoUsd.getBalance(impersonated.address)).mul(999).div(1000))
            console.log("usdc balance", await usdc.balanceOf(impersonated.address))

            console.log("remaining balance", (await IbAlluoUsd.getBalance(impersonated.address)))

            // await IbAlluoUsd.connect(admin).setInterest(getAnnualInterestParam(7), getInterestPerSecondParam(7))
            // await IbAlluoEth.connect(admin).setInterest(getAnnualInterestParam(5), getInterestPerSecondParam(5))
            // await IbAlluoBtc.connect(admin).setInterest(getAnnualInterestParam(2.5), getInterestPerSecondParam(2.5))
            // console.log("Annual Interest USD", getAnnualInterestParam(7), getInterestPerSecondParam(7))
            // console.log("Annual Interest ETH", getAnnualInterestParam(5), getInterestPerSecondParam(5))
            // console.log("Annual Interest BTC", getAnnualInterestParam(2.5), getInterestPerSecondParam(2.5))

            // let currentTotalAssetSupplyUsd = await IbAlluoUsd.totalAssetSupply();
            // let currentTotalAssetSupplyEth = await IbAlluoEth.totalAssetSupply();
            // let currentTotalAssetSupplyBtc = await IbAlluoBtc.totalAssetSupply();

            // console.log("currentTotalAssetSupplyUsd", currentTotalAssetSupplyUsd.toString())
            // console.log("currentTotalAssetSupplyEth", currentTotalAssetSupplyEth.toString())
            // console.log("currentTotalAssetSupplyBtc", currentTotalAssetSupplyBtc.toString())


            // console.log("USD growing ratio", (await IbAlluoUsd.growingRatio()).toString())
            // console.log("ETH growing ratio", (await IbAlluoEth.growingRatio()).toString())
            // console.log("BTC growing ratio", (await IbAlluoBtc.growingRatio()).toString())
            // await IbAlluoUsd.connect(admin).setGrowingRatioBack("1091813962690508603");
            // await IbAlluoEth.connect(admin).setGrowingRatioBack("1057961272232775543");
            // await IbAlluoBtc.connect(admin).setGrowingRatioBack("1039693581846048938");

            // currentTotalAssetSupplyUsd = await IbAlluoUsd.totalAssetSupply();
            // currentTotalAssetSupplyEth = await IbAlluoEth.totalAssetSupply();
            // currentTotalAssetSupplyBtc = await IbAlluoBtc.totalAssetSupply();

            // console.log("currentTotalAssetSupplyUsd", currentTotalAssetSupplyUsd.toString())
            // console.log("currentTotalAssetSupplyEth", currentTotalAssetSupplyEth.toString())
            // console.log("currentTotalAssetSupplyBtc", currentTotalAssetSupplyBtc.toString())

            // // Update growign ratio
            // await IbAlluoUsd.updateRatio();
            // await IbAlluoEth.updateRatio();
            // await IbAlluoBtc.updateRatio();

            // currentTotalAssetSupplyUsd = await IbAlluoUsd.totalAssetSupply();
            // currentTotalAssetSupplyEth = await IbAlluoEth.totalAssetSupply();
            // currentTotalAssetSupplyBtc = await IbAlluoBtc.totalAssetSupply();

            // console.log("currentTotalAssetSupplyUsd", currentTotalAssetSupplyUsd.toString())
            // console.log("currentTotalAssetSupplyEth", currentTotalAssetSupplyEth.toString())
            // console.log("currentTotalAssetSupplyBtc", currentTotalAssetSupplyBtc.toString())

            // 449.546258
            // 449.287807

        })
        it("Test withdraw before", async function () {
            //We are forking Polygon mainnet, please set Alchemy key in .env
            await network.provider.request({
                method: "hardhat_reset",
                params: [{
                    forking: {
                        enabled: true,
                        jsonRpcUrl: process.env.POLYGON_FORKING_URL as string,
                        //you can fork from last block by commenting next line,
                        blockNumber: 45532567
                    },
                },],
            });
            let IbAlluoUsd = await ethers.getContractAt("IbAlluo", "0xC2DbaAEA2EfA47EBda3E572aa0e55B742E408BF6");
            let IbAlluoEur = await ethers.getContractAt("IbAlluo", "0xc9d8556645853C465D1D5e7d2c81A0031F0B8a92");
            let IbAlluoEth = await ethers.getContractAt("IbAlluo", "0xc677B0918a96ad258A68785C2a3955428DeA7e50");
            let IbAlluoBtc = await ethers.getContractAt("IbAlluo", "0xf272Ff86c86529504f0d074b210e95fc4cFCDce2");
            console.log("Check growing ratio");
            console.log("IbAlluoUsd: ", (await IbAlluoUsd.growingRatio()).toString());
            console.log("IbAlluoEth: ", (await IbAlluoEth.growingRatio()).toString());
            console.log("IbAlluoBtc: ", (await IbAlluoBtc.growingRatio()).toString());
            let impersonated = await ethers.getImpersonatedSigner("0x089df29ABcF12a49379DCE0d2cD7027b15c2Ab62");
            let signers = await ethers.getSigners();
            await IbAlluoUsd.connect(impersonated).transfer(signers[0].address, parseEther("25000"))
            await signers[0].sendTransaction({ to: impersonated.address, value: parseEther("1.0") })
            await IbAlluoUsd.connect(impersonated).withdraw("0x2791bca1f2de4661ed88a30c99a7a9449aa84174", (await IbAlluoUsd.getBalance(impersonated.address)).mul(999).div(1000))

            let usdc = await ethers.getContractAt("IERC20Metadata", "0x2791bca1f2de4661ed88a30c99a7a9449aa84174");
            console.log("usdc balance", await usdc.balanceOf(impersonated.address))

            await usdc.connect(impersonated).approve(IbAlluoUsd.address, ethers.utils.parseEther("1000"))
            await IbAlluoUsd.connect(impersonated).deposit(usdc.address, await usdc.balanceOf(impersonated.address));

            await IbAlluoUsd.connect(impersonated).withdraw("0x2791bca1f2de4661ed88a30c99a7a9449aa84174", (await IbAlluoUsd.getBalance(impersonated.address)).mul(999).div(1000))
            console.log("usdc balance", await usdc.balanceOf(impersonated.address))
            console.log("remaining balance", (await IbAlluoUsd.getBalance(impersonated.address)))

            let currentTotalAssetSupplyUsd = await IbAlluoUsd.totalAssetSupply();
            let currentTotalAssetSupplyEth = await IbAlluoEth.totalAssetSupply();
            let currentTotalAssetSupplyBtc = await IbAlluoBtc.totalAssetSupply();

            console.log("currentTotalAssetSupplyUsd", currentTotalAssetSupplyUsd.toString())
            console.log("currentTotalAssetSupplyEth", currentTotalAssetSupplyEth.toString())
            console.log("currentTotalAssetSupplyBtc", currentTotalAssetSupplyBtc.toString())


        })
    })
});