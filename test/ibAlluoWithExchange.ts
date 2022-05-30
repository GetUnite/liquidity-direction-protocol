import { parseEther, parseUnits } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, BigNumberish, BytesLike } from "ethers";
import { ethers, network, upgrades } from "hardhat";
import { before } from "mocha";
import { IERC20, PseudoMultisigWallet, PseudoMultisigWallet__factory, IbAlluo, IbAlluo__factory, LiquidityHandler, UsdCurveAdapter, LiquidityHandler__factory, UsdCurveAdapter__factory, EurCurveAdapter, EthNoPoolAdapter, EurCurveAdapter__factory, EthNoPoolAdapter__factory, TestMainnetUsdCurveAdapter, TestMainnetUsdCurveAdapter__factory, TestMainnetEthNoPoolAdapter, TestMainnetEthNoPoolAdapter__factory } from "../typechain";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
async function skipDays(d: number) {
    ethers.provider.send('evm_increaseTime', [d * 86400]);
    ethers.provider.send('evm_mine', []);
}

function getRandomArbitrary(min: number, max: number) {
    return Math.floor(Math.random() * (max - min) + min);
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


async function getImpersonatedSigner(address: string): Promise<SignerWithAddress> {
    await ethers.provider.send(
        'hardhat_impersonateAccount',
        [address]
    );

    return await ethers.getSigner(address);
}

async function sendEth(addresses: string[]) {
    let signers = await ethers.getSigners();

    for (let i = 0; i < addresses.length; i++) {
        await signers[0].sendTransaction({
            to: addresses[i],
            value: parseEther("3.0")
        });
    }
}

describe("IbAlluo and handler", function () {
    let signers: SignerWithAddress[];
    let admin: SignerWithAddress;

    let ibAlluoUsd: IbAlluo;
    let ibAlluoEur: IbAlluo;
    let ibAlluoEth: IbAlluo;

    let usdAdapter: UsdCurveAdapter;
    let eurAdapter: EurCurveAdapter;
    let ethAdapter: EthNoPoolAdapter;

    let multisig: PseudoMultisigWallet;
    let handler: LiquidityHandler;

    let dai: IERC20, usdc: IERC20, usdt: IERC20;
    let curveLpUSD: IERC20;

    let usdWhale: SignerWithAddress;
    let curveUsdLpHolder: SignerWithAddress;

    let jeur: IERC20, eurt: IERC20, eurs: IERC20;
    let curveLpEUR: IERC20;

    let jeurWhale: SignerWithAddress;
    let eurtWhale: SignerWithAddress;
    let eursWhale: SignerWithAddress;

    let weth: IERC20;

    let wethWhale: SignerWithAddress;
    before(async function () {
        //We are forking mainnet mainnet, please set Alchemy key in .env
        await network.provider.request({
            method: "hardhat_reset",
            params: [{
                forking: {
                    enabled: true,
                    jsonRpcUrl: process.env.MAINNET_FORKING_URL as string,
                    //you can fork from last block by commenting next line
                    blockNumber: 14870065,
                },
            },],
        });

        signers = await ethers.getSigners();

        admin = await getImpersonatedSigner("0x1F020A4943EB57cd3b2213A66b355CB662Ea43C3");
        await (await (await ethers.getContractFactory("ForceSender")).deploy({ value: parseEther("10.0") })).forceSend(admin.address);

        usdWhale = await getImpersonatedSigner("0xd6216fc19db775df9774a6e33526131da7d19a2c");
        curveUsdLpHolder = await getImpersonatedSigner("0xd6216fc19db775df9774a6e33526131da7d19a2c");

        jeurWhale = await getImpersonatedSigner("0x4f0CF2F63913524b85c1126AB7eE7957857f3482");
        eurtWhale = await getImpersonatedSigner("0x6Cf9AA65EBaD7028536E353393630e2340ca6049");
        eursWhale = await getImpersonatedSigner("0x8dF9E3ec00Ba27415B679e033179377766A299E1");

        wethWhale = await getImpersonatedSigner("0xEf22c14F46858d5aC61326497b056974167F2eE1");

        dai = await ethers.getContractAt("IERC20", "0x6B175474E89094C44Da98b954EedeAC495271d0F");
        usdc = await ethers.getContractAt("IERC20", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
        usdt = await ethers.getContractAt("IERC20", "0xdAC17F958D2ee523a2206206994597C13D831ec7");
        curveLpUSD = await ethers.getContractAt("IERC20", "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490");

        jeur = await ethers.getContractAt("IERC20", "0x0f17BC9a994b87b5225cFb6a2Cd4D667ADb4F20B");
        eurt = await ethers.getContractAt("IERC20", "0xC581b735A1688071A1746c968e0798D642EDE491");
        eurs = await ethers.getContractAt("IERC20", "0xdB25f211AB05b1c97D595516F45794528a807ad8");

        weth = await ethers.getContractAt("IERC20", "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");

        console.log("We are forking mainnet \n");
        expect(await dai.balanceOf(usdWhale.address)).to.be.gt(0, "Whale has no DAI, or you are not forking mainnet");
        expect(await usdc.balanceOf(usdWhale.address)).to.be.gt(0, "Whale has no USDC, or you are not forking mainnet");
        expect(await usdt.balanceOf(usdWhale.address)).to.be.gt(0, "Whale has no USDT, or you are not forking mainnet");
        expect(await jeur.balanceOf(jeurWhale.address)).to.be.gt(0, "Whale has no jeur, or you are not forking mainnet");
        expect(await eurt.balanceOf(eurtWhale.address)).to.be.gt(0, "Whale has no eurt, or you are not forking mainnet");
        expect(await eurs.balanceOf(eursWhale.address)).to.be.gt(0, "Whale has no eurs, or you are not forking mainnet");
        expect(await weth.balanceOf(wethWhale.address)).to.be.gt(0, "Whale has no weth, or you are not forking mainnet");

        await sendEth([usdWhale.address, jeurWhale.address, eurtWhale.address, eursWhale.address, wethWhale.address])
    });


    beforeEach(async function () {
        const IbAlluo = await ethers.getContractFactory("IbAlluo") as IbAlluo__factory;
        // Mainnet address for exchange.
        const exchangeAddress = "0x29c66CF57a03d41Cfe6d9ecB6883aa0E2AbA21Ec";
        const exchangeSlippage = 500;
        // Change trustedForwarder for mainnet (TODO!)
        const trustedForwarder = "0x86C80a8aa58e0A4fa09A69624c31Ab2a6CAD56b8";
        //We are using this contract to simulate Gnosis multisig wallet
        const Multisig = await ethers.getContractFactory("PseudoMultisigWallet") as PseudoMultisigWallet__factory;
        multisig = await Multisig.deploy(true);

        const Handler = await ethers.getContractFactory("LiquidityHandler") as LiquidityHandler__factory;

        handler = await upgrades.deployProxy(Handler,
            [admin.address, exchangeAddress, exchangeSlippage],
            { initializer: 'initialize', kind: 'uups' }
        ) as LiquidityHandler;

        await handler.connect(admin).grantRole(await handler.DEFAULT_ADMIN_ROLE(), admin.address)

        const UsdAdapter = await ethers.getContractFactory("TestMainnetUsdCurveAdapter") as TestMainnetUsdCurveAdapter__factory;
        const EurAdapter = await ethers.getContractFactory("EurCurveAdapter") as EurCurveAdapter__factory;
        const EthAdapter = await ethers.getContractFactory("TestMainnetEthNoPoolAdapter") as TestMainnetEthNoPoolAdapter__factory;

        // eurAdapter = await EurAdapter.deploy(admin.address, handler.address, 200);
        usdAdapter = await UsdAdapter.deploy(admin.address, handler.address, 200);
        ethAdapter = await EthAdapter.deploy(admin.address, handler.address);

        await usdAdapter.connect(admin).adapterApproveAll()
        await handler.connect(admin).setAdapter(
            1,
            "USD Curve-Aave",
            500,
            usdAdapter.address,
            true
        )

        // await eurAdapter.connect(admin).adapterApproveAll()
        // await handler.connect(admin).setAdapter(
        //     2,
        //     "EUR Curve-Aave",
        //     500,
        //     eurAdapter.address,
        //     true
        // )



        await handler.connect(admin).setAdapter(
            3,
            "ETH No Pool Adapter",
            500,
            ethAdapter.address,
            true
        )


        ibAlluoUsd = await upgrades.deployProxy(IbAlluo,
            [
                "Interest Bearing Alluo USD",
                "ibAlluoUsd",
                admin.address,
                handler.address,
                [dai.address,
                usdc.address,
                usdt.address],
                BigNumber.from("100000000470636740"),
                1600,
                trustedForwarder,
                exchangeAddress,
                exchangeSlippage],
            { initializer: 'initialize', kind: 'uups' }
        ) as IbAlluo;

        await handler.connect(admin).grantIbAlluoPermissions(ibAlluoUsd.address)
        await handler.connect(admin).setIbAlluoToAdapterId(ibAlluoUsd.address, 1)



        // ibAlluoEur = await upgrades.deployProxy(IbAlluo,
        //     [
        //         "Interest Bearing Alluo EUR",
        //         "ibAlluoEur",
        //         admin.address,
        //         handler.address,
        //         [jeur.address,
        //         eurt.address,
        //         eurs.address],
        //         BigNumber.from("100000000470636740"),
        //         1600,
        //         trustedForwarder,
        //         exchangeAddress,
        //         exchangeSlippage],
        //     { initializer: 'initialize', kind: 'uups' }
        // ) as IbAlluo;

        // await handler.connect(admin).grantIbAlluoPermissions(ibAlluoEur.address)
        // await handler.connect(admin).setIbAlluoToAdapterId(ibAlluoEur.address, 2)


        ibAlluoEth = await upgrades.deployProxy(IbAlluo,
            [
                "Interest Bearing Alluo ETH",
                "ibAlluoEth",
                admin.address,
                handler.address,
                [weth.address],
                BigNumber.from("100000000470636740"),
                1600,
                trustedForwarder,
                exchangeAddress,
                exchangeSlippage],
            { initializer: 'initialize', kind: 'uups' }
        ) as IbAlluo;


        await handler.connect(admin).grantIbAlluoPermissions(ibAlluoEth.address)
        await handler.connect(admin).setIbAlluoToAdapterId(ibAlluoEth.address, 3)

    });
    describe("ETHAdapter with Exchange Tests", function () {
        it("Depositing in Dai should give you ibAlluoEth", async function () {
            await depositToibAlluoEth(signers[0], dai, parseEther("100"));
            expect(Number(await ibAlluoEth.balanceOf(signers[0].address))).greaterThan(Number(0))
        })
        it("Depositing in Dai and then withdrawing in Dai should give you Dai back (without being added to withdrawal queue) ", async function () {
            await depositToibAlluoEth(signers[0], dai, parseEther("100"));
            expect(Number(await ibAlluoEth.balanceOf(signers[0].address))).greaterThan(Number(0))
            await depositToibAlluoEth(signers[0], dai, parseEther("1000"));
            await depositToibAlluoEth(signers[0], dai, parseEther("1000"));
            await depositToibAlluoEth(signers[0], dai, parseEther("1000"));

            await ibAlluoEth.connect(signers[0]).withdraw(dai.address, parseEther("0.039"))
            // Once there are sufficient deposits, withdrawal is fufilled.
            // await depositToibAlluoEth(signers[0], dai, parseEther("1000"));
            console.log(await dai.balanceOf(signers[0].address));
            expect(Number(await dai.balanceOf(signers[0].address))).greaterThan(Number(70))

        })
        it("Depositing in Dai and then withdrawing in Dai should give you Dai back (after being added to withdrawal queue) ", async function () {
            await depositToibAlluoEth(signers[0], dai, parseEther("100"));
            expect(Number(await ibAlluoEth.balanceOf(signers[0].address))).greaterThan(Number(0))
            await ibAlluoEth.connect(signers[0]).withdraw(dai.address, parseEther("0.039"))

            await depositToibAlluoEth(signers[0], dai, parseEther("1000"));

            // Once there are sufficient deposits, withdrawal is fufilled.
            await handler.satisfyAllWithdrawals();
            console.log(await dai.balanceOf(signers[0].address));
            expect(Number(await dai.balanceOf(signers[0].address))).greaterThan(Number(70))

        })
    })
    // describe("EThAdapter no pool: Test cases", function () {
    //     it("Depositing 100 weth and immediately attempting to withdraw 50 should put you in the waiting list", async function () {
    //         await deposit(signers[0], weth, parseEther("100"));
    //         await ibAlluoEth.connect(signers[0]).withdraw(weth.address, parseEther("50"));
    //         let withdrawalArray = await handler.ibAlluoLastWithdrawalCheck(ibAlluoEth.address)
    //         expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);
    //     })
    //     it("Depositing 100 weth, attempt to withdraw 50 and then only get paid after there is a deposit", async function () {
    //         await deposit(signers[0], weth, parseEther("100"));
    //         await ibAlluoEth.connect(signers[0]).withdraw(weth.address, parseEther("50"));
    //         let withdrawalArray = await handler.ibAlluoLastWithdrawalCheck(ibAlluoEth.address)
    //         expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);

    //         await deposit(signers[1], weth, parseEther("100"));
    //         await handler.satisfyAdapterWithdrawals(ibAlluoEth.address);
    //         expect(Number(await weth.balanceOf(signers[0].address))).greaterThanOrEqual(Number(parseUnits("49", 18)))
    //     })



    //     it("The balance of the multisig wallet should increase with weth deposits.", async function () {
    //         let walletBalance = await weth.balanceOf(admin.address);

    //         await deposit(signers[0], weth, parseEther("100"));
    //         expect(Number(await weth.balanceOf(admin.address))).greaterThan(Number(walletBalance))
    //         walletBalance = await weth.balanceOf(admin.address);


    //         await deposit(signers[0], weth, parseEther("100"));
    //         expect(Number(await weth.balanceOf(admin.address))).greaterThan(Number(walletBalance))
    //         walletBalance = await weth.balanceOf(admin.address);

    //         await deposit(signers[0], weth, parseEther("100"));
    //         expect(Number(await weth.balanceOf(admin.address))).greaterThan(Number(walletBalance))
    //         walletBalance = await weth.balanceOf(admin.address);

    //         await deposit(signers[0], weth, parseEther("100"));
    //         expect(Number(await weth.balanceOf(admin.address))).greaterThan(Number(walletBalance))
    //         walletBalance = await weth.balanceOf(admin.address);

    //         await deposit(signers[0], weth, parseEther("100"));
    //         expect(Number(await weth.balanceOf(admin.address))).greaterThan(Number(walletBalance))
    //         walletBalance = await weth.balanceOf(admin.address);

    //         await deposit(signers[0], weth, parseEther("100"));
    //         expect(Number(await weth.balanceOf(admin.address))).greaterThan(Number(walletBalance))
    //         walletBalance = await weth.balanceOf(admin.address);

    //         await deposit(signers[0], weth, parseEther("100"));
    //         expect(Number(await weth.balanceOf(admin.address))).greaterThan(Number(walletBalance))
    //         walletBalance = await weth.balanceOf(admin.address);

    //         console.log("Final multisig balance:", walletBalance);

    //     })
    //     it("Attemping to withdraw more weth than allowed causes revert.", async function () {
    //         let walletBalance = await weth.balanceOf(admin.address);
    //         await deposit(signers[0], weth, parseEther("100"));
    //         expect(Number(await weth.balanceOf(admin.address))).greaterThan(Number(walletBalance))
    //         walletBalance = await weth.balanceOf(admin.address);

    //         await expect(ibAlluoEth.connect(signers[1]).withdraw(weth.address, parseUnits("500", 18))).to.be.revertedWith('ERC20: burn amount exceeds balance')
    //     })


    // })
    // describe('weth Mass deposits and withdrawal test cases', function () {
    //     it("Multiple deposits and withdrawals: Eventually, all withdrawers should be paid", async function () {
    //         let walletBalance = await weth.balanceOf(admin.address);

    //         await deposit(signers[0], weth, parseEther("100"));
    //         expect(Number(await weth.balanceOf(admin.address))).greaterThan(Number(walletBalance))
    //         walletBalance = await weth.balanceOf(admin.address);

    //         await deposit(signers[1], weth, parseEther("50"));
    //         expect(Number(await weth.balanceOf(admin.address))).greaterThan(Number(walletBalance))
    //         walletBalance = await weth.balanceOf(admin.address);

    //         await deposit(signers[2], weth, parseEther("180"));
    //         expect(Number(await weth.balanceOf(admin.address))).greaterThan(Number(walletBalance))
    //         walletBalance = await weth.balanceOf(admin.address);


    //         await ibAlluoEth.connect(signers[0]).withdraw(weth.address, parseEther("50"));
    //         let withdrawalArray = await handler.ibAlluoLastWithdrawalCheck(ibAlluoEth.address)
    //         expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);

    //         await ibAlluoEth.connect(signers[1]).withdraw(weth.address, parseEther("35"));
    //         withdrawalArray = await handler.ibAlluoLastWithdrawalCheck(ibAlluoEth.address)
    //         expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);

    //         await ibAlluoEth.connect(signers[2]).withdraw(weth.address, parseEther("180"));
    //         withdrawalArray = await handler.ibAlluoLastWithdrawalCheck(ibAlluoEth.address)
    //         expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);

    //         // When there are deposits, should pay everyone back.
    //         await deposit(signers[2], weth, parseUnits("1000", 18));
    //         await handler.satisfyAdapterWithdrawals(ibAlluoEth.address);
    //         expect(Number(await weth.balanceOf(admin.address))).greaterThan(Number(walletBalance))

    //         expect(Number(await weth.balanceOf(signers[0].address))).greaterThanOrEqual(Number(parseUnits("49", 18)))
    //         expect(Number(await weth.balanceOf(signers[1].address))).greaterThanOrEqual(Number(parseUnits("34", 18)))
    //         expect(Number(await weth.balanceOf(signers[2].address))).greaterThanOrEqual(Number(parseUnits("179", 18)))



    //     })

    // })


    describe('EUR Adaptor with IbAlluoV2: Test cases', function () {
        // it("Depositing 100 jeur and immediately attempting to withdraw 50 should put you in the waiting list", async function () {
        //     await deposit(signers[0], jeur, parseEther("100"));
        //     await ibAlluoEur.connect(signers[0]).withdraw(jeur.address, parseEther("50"));
        //     let withdrawalArray = await handler.ibAlluoLastWithdrawalCheck(ibAlluoEur.address)
        //     expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);
        // })
        // it("Depositing 100 jeur, attempt to withdraw 50 and then only get paid after there is a deposit", async function () {
        //     await deposit(signers[0], jeur, parseEther("100"));
        //     await ibAlluoEur.connect(signers[0]).withdraw(jeur.address, parseEther("50"));
        //     let withdrawalArray = await handler.ibAlluoLastWithdrawalCheck(ibAlluoEur.address)
        //     expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);

        //     await deposit(signers[1], jeur, parseEther("100"));
        //     await handler.satisfyAdapterWithdrawals(ibAlluoEur.address);
        //     // Loss from slippage makes tests awkward.

        //     expect(Number(await jeur.balanceOf(signers[0].address))).greaterThanOrEqual(Number(parseUnits("49", 18)))
        // })

        // it("Depositing 100 eurt and immediately attempting to withdraw 50 should put you in the waiting list", async function () {
        //     await deposit(signers[0], eurt, parseUnits("100", 6));
        //     await ibAlluoEur.connect(signers[0]).withdraw(eurt.address, parseUnits("100", 18));
        //     let withdrawalArray = await handler.ibAlluoLastWithdrawalCheck(ibAlluoEur.address)
        //     expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);
        // })
        // it("Depositing 100 eurt, attempt to withdraw 50 and then only get paid after there is a deposit", async function () {
        //     await deposit(signers[0], eurt, parseUnits("100", 6));
        //     await ibAlluoEur.connect(signers[0]).withdraw(eurt.address, parseUnits("50", 18));
        //     let withdrawalArray = await handler.ibAlluoLastWithdrawalCheck(ibAlluoEur.address)
        //     expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);

        //     await deposit(signers[1], eurt, parseUnits("100", 6));
        //     await handler.satisfyAdapterWithdrawals(ibAlluoEur.address);
        //     expect(Number(await eurt.balanceOf(signers[0].address))).greaterThanOrEqual(Number(parseUnits("49", 6)))
        // })

        // it("Depositing 100 eurs and immediately attempting to withdraw 50 should put you in the waiting list", async function () {
        //     await deposit(signers[0], eurs, parseUnits("100", 2));
        //     await ibAlluoEur.connect(signers[0]).withdraw(eurs.address, parseUnits("50", 18));
        //     let withdrawalArray = await handler.ibAlluoLastWithdrawalCheck(ibAlluoEur.address)
        //     expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);
        // })
        // it("Depositing 100 eurs, attempt to withdraw 50 and then only get paid after there is a deposit", async function () {
        //     await deposit(signers[0], eurs, parseUnits("100", 2));
        //     await ibAlluoEur.connect(signers[0]).withdraw(eurs.address, parseUnits("50", 18));
        //     let withdrawalArray = await handler.ibAlluoLastWithdrawalCheck(ibAlluoEur.address)
        //     expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);

        //     await deposit(signers[1], eurs, parseUnits("100", 2));
        //     await handler.satisfyAdapterWithdrawals(ibAlluoEur.address);
        //     expect(Number(await eurs.balanceOf(signers[0].address))).greaterThanOrEqual(Number(parseUnits("49", 2)))
        // })

        // it("The balance of the multisig wallet should increase with deposits.", async function () {
        //     let walletBalance = await eurt.balanceOf(admin.address);

        //     await deposit(signers[0], jeur, parseEther("100"));
        //     expect(Number(await eurt.balanceOf(admin.address))).greaterThan(Number(walletBalance))
        //     walletBalance = await eurt.balanceOf(admin.address);


        //     await deposit(signers[0], eurt, parseUnits("100", 6));
        //     expect(Number(await eurt.balanceOf(admin.address))).greaterThan(Number(walletBalance))
        //     walletBalance = await eurt.balanceOf(admin.address);

        //     await deposit(signers[0], eurs, parseUnits("100", 2));
        //     expect(Number(await eurt.balanceOf(admin.address))).greaterThan(Number(walletBalance))
        //     walletBalance = await eurt.balanceOf(admin.address);

        //     await deposit(signers[0], jeur, parseEther("100"));
        //     expect(Number(await eurt.balanceOf(admin.address))).greaterThan(Number(walletBalance))
        //     walletBalance = await eurt.balanceOf(admin.address);


        //     await deposit(signers[0], eurt, parseUnits("100", 6));
        //     expect(Number(await eurt.balanceOf(admin.address))).greaterThan(Number(walletBalance))
        //     walletBalance = await eurt.balanceOf(admin.address);

        //     await deposit(signers[0], eurs, parseUnits("100", 2));
        //     expect(Number(await eurt.balanceOf(admin.address))).greaterThan(Number(walletBalance))
        //     walletBalance = await eurt.balanceOf(admin.address);

        //     await deposit(signers[0], jeur, parseEther("100"));
        //     expect(Number(await eurt.balanceOf(admin.address))).greaterThan(Number(walletBalance))
        //     walletBalance = await eurt.balanceOf(admin.address);


        //     await deposit(signers[0], eurt, parseUnits("100", 6));
        //     expect(Number(await eurt.balanceOf(admin.address))).greaterThan(Number(walletBalance))
        //     walletBalance = await eurt.balanceOf(admin.address);

        //     await deposit(signers[0], eurs, parseUnits("100", 2));
        //     expect(Number(await eurt.balanceOf(admin.address))).greaterThan(Number(walletBalance))
        //     walletBalance = await eurt.balanceOf(admin.address);

        //     console.log("Final multisig balance:", walletBalance);

        // })
        // it("Attemping to withdraw more than allowed causes revert.", async function () {
        //     let walletBalance = await eurt.balanceOf(admin.address);
        //     await deposit(signers[1], eurt, parseUnits("100", 6));
        //     expect(Number(await eurt.balanceOf(admin.address))).greaterThan(Number(walletBalance))
        //     await expect(ibAlluoEur.connect(signers[1]).withdraw(eurt.address, parseUnits("500", 18))).to.be.revertedWith('ERC20: burn amount exceeds balance')
        // })
        // describe('EUR Mass deposits and withdrawal test cases', function () {
        //     it("Multiple deposits and withdrawals: Eventually, all withdrawers should be paid", async function () {
        //         let walletBalance = await eurt.balanceOf(admin.address);

        //         await deposit(signers[0], jeur, parseEther("100"));
        //         expect(Number(await eurt.balanceOf(admin.address))).greaterThan(Number(walletBalance))
        //         walletBalance = await eurt.balanceOf(admin.address);


        //         await deposit(signers[1], eurt, parseUnits("100", 6));
        //         expect(Number(await eurt.balanceOf(admin.address))).greaterThan(Number(walletBalance))
        //         walletBalance = await eurt.balanceOf(admin.address);

        //         await deposit(signers[2], eurs, parseUnits("100", 2));
        //         expect(Number(await eurt.balanceOf(admin.address))).greaterThan(Number(walletBalance))
        //         walletBalance = await eurt.balanceOf(admin.address);

        //         await ibAlluoEur.connect(signers[0]).withdraw(jeur.address, parseEther("50"));
        //         let withdrawalArray = await handler.ibAlluoLastWithdrawalCheck(ibAlluoEur.address)
        //         expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);
        //         await ibAlluoEur.connect(signers[1]).withdraw(eurt.address, parseUnits("50", 18));
        //         withdrawalArray = await handler.ibAlluoLastWithdrawalCheck(ibAlluoEur.address)
        //         expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);
        //         await ibAlluoEur.connect(signers[2]).withdraw(eurs.address, parseUnits("50", 18));
        //         withdrawalArray = await handler.ibAlluoLastWithdrawalCheck(ibAlluoEur.address)
        //         expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);

        //         // When there are deposits, should pay everyone back.
        //         await deposit(signers[2], eurs, parseUnits("1000", 2));
        //         await handler.satisfyAdapterWithdrawals(ibAlluoEur.address);
        //         expect(Number(await eurt.balanceOf(admin.address))).greaterThan(Number(walletBalance))

        //         expect(Number(await jeur.balanceOf(signers[0].address))).greaterThanOrEqual(Number(parseUnits("49", 18)))
        //         expect(Number(await eurt.balanceOf(signers[1].address))).greaterThanOrEqual(Number(parseUnits("49", 6)))
        //         expect(Number(await eurs.balanceOf(signers[2].address))).greaterThanOrEqual(Number(parseUnits("49", 2)))



        //     })

        // })

        // describe("USD Tests", function () {
        //     it("Depositing 100 DAI and immediately attempting to withdraw 50 should put you in the waiting list", async function () {
        //         await deposit(signers[0], dai, parseEther("100"));
        //         await ibAlluoUsd.connect(signers[0]).withdraw(dai.address, parseEther("50"));
        //         let withdrawalArray = await handler.ibAlluoLastWithdrawalCheck(ibAlluoUsd.address)
        //         expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);
        //     })
        //     it("Depositing 100 DAI, attempt to withdraw 50 and then only get paid after there is a deposit", async function () {
        //         await deposit(signers[0], dai, parseEther("100"));
        //         await ibAlluoUsd.connect(signers[0]).withdraw(dai.address, parseEther("50"));
        //         let withdrawalArray = await handler.ibAlluoLastWithdrawalCheck(ibAlluoUsd.address)
        //         expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);

        //         await deposit(signers[1], dai, parseEther("100"));
        //         await handler.satisfyAdapterWithdrawals(ibAlluoUsd.address);
        //         expect(await dai.balanceOf(signers[0].address)).equal(parseEther("50"))
        //     })

        //     it("Depositing 100 USDC and immediately attempting to withdraw 50 should put you in the waiting list", async function () {
        //         await deposit(signers[0], usdc, parseUnits("100", 6));
        //         await ibAlluoUsd.connect(signers[0]).withdraw(usdc.address, parseUnits("100", 18));
        //         let withdrawalArray = await handler.ibAlluoLastWithdrawalCheck(ibAlluoUsd.address)
        //         expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);
        //     })


        //     it("Depositing surplus USDC should not revert (Checking USD Adaptor Deposit function: Check toSend", async function () {
        //         await deposit(signers[0], usdc, parseUnits("100", 6));
        //         await deposit(signers[0], usdc, parseUnits("100", 6));
        //         await deposit(signers[0], usdc, parseUnits("100", 6));
        //         await deposit(signers[0], usdc, parseUnits("100", 6))
        //     })

        //     it("Depositing USDC when there is outstanding withdrawals (leaveInPool>0, toSend =0) should not revert (Checking USD Adaptor Deposit function: Check leaveInPool", async function () {
        //         await deposit(signers[0], usdc, parseUnits("10000", 6));
        //         await ibAlluoUsd.connect(signers[0]).withdraw(usdc.address, parseUnits("10000", 18));

        //         await deposit(signers[0], usdc, parseUnits("100", 6));

        //     })


        //     it("Depositing 100 USDC, attempt to withdraw 50 and then only get paid after there is a deposit", async function () {
        //         await deposit(signers[0], usdc, parseUnits("100", 6));
        //         await ibAlluoUsd.connect(signers[0]).withdraw(usdc.address, parseUnits("50", 18));
        //         let withdrawalArray = await handler.ibAlluoLastWithdrawalCheck(ibAlluoUsd.address)
        //         expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);

        //         await deposit(signers[1], usdc, parseUnits("100", 6));
        //         await handler.satisfyAdapterWithdrawals(ibAlluoUsd.address);
        //         expect(Number(await usdc.balanceOf(signers[0].address))).greaterThanOrEqual(Number(parseUnits("49", 6)))
        //     })

        //     it("Depositing 100 USDT and immediately attempting to withdraw 50 should put you in the waiting list", async function () {
        //         await deposit(signers[0], usdt, parseUnits("100", 6));
        //         await ibAlluoUsd.connect(signers[0]).withdraw(usdt.address, parseUnits("50", 18));
        //         let withdrawalArray = await handler.ibAlluoLastWithdrawalCheck(ibAlluoUsd.address)
        //         expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);
        //     })
        //     it("Depositing 100 USDT, attempt to withdraw 50 and then only get paid after there is a deposit", async function () {
        //         await deposit(signers[0], usdt, parseUnits("100", 6));
        //         await ibAlluoUsd.connect(signers[0]).withdraw(usdt.address, parseUnits("50", 18));
        //         let withdrawalArray = await handler.ibAlluoLastWithdrawalCheck(ibAlluoUsd.address)
        //         expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);

        //         await deposit(signers[1], usdt, parseUnits("100", 6));
        //         await handler.satisfyAdapterWithdrawals(ibAlluoUsd.address);

        //         expect(Number(await usdt.balanceOf(signers[0].address))).greaterThanOrEqual(Number(parseUnits("49", 6)))
        //     })

        //     it("The balance of the multisig wallet should increase with deposits.", async function () {
        //         let walletBalance = await usdc.balanceOf(admin.address);

        //         await deposit(signers[0], dai, parseEther("100"));
        //         expect(Number(await usdc.balanceOf(admin.address))).greaterThan(Number(walletBalance))
        //         walletBalance = await usdc.balanceOf(admin.address);


        //         await deposit(signers[0], usdc, parseUnits("100", 6));
        //         expect(Number(await usdc.balanceOf(admin.address))).greaterThan(Number(walletBalance))
        //         walletBalance = await usdc.balanceOf(admin.address);

        //         await deposit(signers[0], usdt, parseUnits("100", 6));
        //         expect(Number(await usdc.balanceOf(admin.address))).greaterThan(Number(walletBalance))
        //         walletBalance = await usdc.balanceOf(admin.address);

        //         await deposit(signers[0], dai, parseEther("100"));
        //         expect(Number(await usdc.balanceOf(admin.address))).greaterThan(Number(walletBalance))
        //         walletBalance = await usdc.balanceOf(admin.address);


        //         await deposit(signers[0], usdc, parseUnits("100", 6));
        //         expect(Number(await usdc.balanceOf(admin.address))).greaterThan(Number(walletBalance))
        //         walletBalance = await usdc.balanceOf(admin.address);

        //         await deposit(signers[0], usdt, parseUnits("100", 6));
        //         expect(Number(await usdc.balanceOf(admin.address))).greaterThan(Number(walletBalance))
        //         walletBalance = await usdc.balanceOf(admin.address);

        //         await deposit(signers[0], dai, parseEther("100"));
        //         expect(Number(await usdc.balanceOf(admin.address))).greaterThan(Number(walletBalance))
        //         walletBalance = await usdc.balanceOf(admin.address);


        //         await deposit(signers[0], usdc, parseUnits("100", 6));
        //         expect(Number(await usdc.balanceOf(admin.address))).greaterThan(Number(walletBalance))
        //         walletBalance = await usdc.balanceOf(admin.address);

        //         await deposit(signers[0], usdt, parseUnits("100", 6));
        //         expect(Number(await usdc.balanceOf(admin.address))).greaterThan(Number(walletBalance))
        //         walletBalance = await usdc.balanceOf(admin.address);

        //         console.log("Final multisig balance:", walletBalance);

        //     })
        //     it("Attemping to withdraw more than allowed causes revert.", async function () {
        //         let walletBalance = await usdc.balanceOf(admin.address);
        //         await deposit(signers[1], usdc, parseUnits("100", 6));
        //         expect(Number(await usdc.balanceOf(admin.address))).greaterThan(Number(walletBalance))
        //         await expect(ibAlluoUsd.connect(signers[1]).withdraw(usdc.address, parseUnits("500", 18))).to.be.revertedWith('ERC20: burn amount exceeds balance')
        //     })


        // })


        //     describe('Mass deposits and withdrawal test cases', function () {
        //         it("Multiple deposits and withdrawals: Eventually, all withdrawers should be paid", async function () {
        //             let walletBalance = await usdc.balanceOf(admin.address);

        //             await deposit(signers[0], dai, parseEther("100"));
        //             expect(Number(await usdc.balanceOf(admin.address))).greaterThan(Number(walletBalance))
        //             walletBalance = await usdc.balanceOf(admin.address);


        //             await deposit(signers[1], usdc, parseUnits("100", 6));
        //             expect(Number(await usdc.balanceOf(admin.address))).greaterThan(Number(walletBalance))
        //             walletBalance = await usdc.balanceOf(admin.address);


        //             await deposit(signers[2], usdt, parseUnits("100", 6));
        //             expect(Number(await usdc.balanceOf(admin.address))).greaterThan(Number(walletBalance))
        //             walletBalance = await usdc.balanceOf(admin.address);


        //             await ibAlluoUsd.connect(signers[0]).withdraw(dai.address, parseEther("50"));
        //             let withdrawalArray = await handler.ibAlluoLastWithdrawalCheck(ibAlluoUsd.address)
        //             expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);

        //             await ibAlluoUsd.connect(signers[1]).withdraw(usdc.address, parseUnits("50", 18));
        //             withdrawalArray = await handler.ibAlluoLastWithdrawalCheck(ibAlluoUsd.address)
        //             expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);



        //             await ibAlluoUsd.connect(signers[2]).withdraw(usdt.address, parseUnits("50", 18));
        //             withdrawalArray = await handler.ibAlluoLastWithdrawalCheck(ibAlluoUsd.address)
        //             expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);


        //             // When there are deposits, should pay everyone back.
        //             await deposit(signers[2], usdt, parseUnits("1000", 6));
        //             await handler.satisfyAdapterWithdrawals(ibAlluoUsd.address);


        //             expect(Number(await dai.balanceOf(signers[0].address))).greaterThanOrEqual(Number(parseUnits("49", 18)))
        //             expect(Number(await usdc.balanceOf(signers[1].address))).greaterThanOrEqual(Number(parseUnits("49", 6)))
        //             expect(Number(await usdt.balanceOf(signers[2].address))).greaterThanOrEqual(Number(parseUnits("49", 6)))



        //         })
        //     })

    })
    // async function sendFundsToMultiSig(token: TestERC20, amount:BigNumberish) {
    //     let ABI = ["function sendFundsToMultiSig(address _token, uint256 _amount)"];
    //     let iface = new ethers.utils.Interface(ABI);
    //     let calldata = iface.encodeFunctionData("sendFundsToMultiSig", [token.address, amount]);
    //     await multisig.executeCall(handler.address, calldata);
    // }
    async function approveExchange(recipient: SignerWithAddress) {
        const exchange = await ethers.getContractAt("IERC20", "0x29c66CF57a03d41Cfe6d9ecB6883aa0E2AbA21Ec");
    }
    async function deposit(recipient: SignerWithAddress, token: IERC20, amount: BigNumberish) {

        if (token == eurs) {
            await token.connect(eursWhale).transfer(recipient.address, amount);
            await token.connect(recipient).approve(ibAlluoEur.address, amount);
            await token.connect(recipient).approve("0x29c66CF57a03d41Cfe6d9ecB6883aa0E2AbA21Ec", amount)
            await ibAlluoEur.connect(recipient).deposit(token.address, amount);
        }
        else if (token == eurt) {
            await token.connect(eurtWhale).transfer(recipient.address, amount);
            await token.connect(recipient).approve(ibAlluoEur.address, amount);
            await ibAlluoEur.connect(recipient).deposit(token.address, amount);
        }

        else if (token == jeur) {
            await token.connect(jeurWhale).transfer(recipient.address, amount);
            await token.connect(recipient).approve(ibAlluoEur.address, amount);
            await ibAlluoEur.connect(recipient).deposit(token.address, amount);
        }

        else if (token == weth) {
            await weth.connect(wethWhale).transfer(recipient.address, amount);
            await token.connect(recipient).approve(ibAlluoEth.address, amount);
            await ibAlluoEth.connect(recipient).deposit(token.address, amount)
        }

        else {
            await token.connect(usdWhale).transfer(recipient.address, amount);
            await token.connect(recipient).approve(ibAlluoUsd.address, amount);
            await ibAlluoUsd.connect(recipient).deposit(token.address, amount);

        }
    }

    async function depositToibAlluoEth(recipient: SignerWithAddress, token: IERC20, amount: BigNumberish) {
        await token.connect(recipient).approve(ibAlluoEth.address, amount);
        await token.connect(recipient).approve("0x29c66CF57a03d41Cfe6d9ecB6883aa0E2AbA21Ec", amount)
        if (token == eurs) {
            await token.connect(eursWhale).transfer(recipient.address, amount);
        }
        else if (token == eurt) {
            await token.connect(eurtWhale).transfer(recipient.address, amount);
        }

        else if (token == jeur) {
            await token.connect(jeurWhale).transfer(recipient.address, amount);
        }

        else if (token == weth) {
            await weth.connect(wethWhale).transfer(recipient.address, amount);
        }

        else {
            await token.connect(usdWhale).transfer(recipient.address, amount);
        }
        await ibAlluoEth.connect(recipient).deposit(token.address, amount);
    }

});