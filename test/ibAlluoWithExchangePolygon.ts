import { parseEther, parseUnits } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, BigNumberish, BytesLike } from "ethers";
import { ethers, network, upgrades } from "hardhat";
import { before } from "mocha";
import { IERC20, PseudoMultisigWallet, PseudoMultisigWallet__factory, IbAlluo, IbAlluo__factory, LiquidityHandler, UsdCurveAdapter, LiquidityHandler__factory, UsdCurveAdapter__factory, EurCurveAdapter, EthNoPoolAdapter, EurCurveAdapter__factory, EthNoPoolAdapter__factory, Exchange, IWrappedEther, } from "../typechain";


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
    let fraxWhale: SignerWithAddress;

    let weth: IERC20;
    let frax: IERC20;
    let wethWhale: SignerWithAddress;

    let exchange: Exchange;

    type Edge = {
        swapProtocol: BigNumberish;
        pool: string;
        fromCoin: string;
        toCoin: string;
    };
    type Route = Edge[];

    let fraxUsdcRoute: Route, fraxDaiRoute: Route, fraxUsdtRoute: Route, usdtFraxRoute: Route
        , daiFraxRoute: Route, usdcFraxRoute: Route
    // On polygon
    // const fraxPoolAddress = "0x5e5A23b52Cb48F5E70271Be83079cA5bC9c9e9ac";
    const fraxPoolAddress = "0x92215849c439E1f8612b6646060B4E3E5ef822cC";
    // let exchangeAddress = "0x6b45B9Ab699eFbb130464AcEFC23D49481a05773";
    let exchangeAddress;
    before(async function () {
        //We are forking Polygon mainnet, please set Alchemy key in .env
        await network.provider.request({
            method: "hardhat_reset",
            params: [{
                forking: {
                    enabled: true,
                    jsonRpcUrl: process.env.POLYGON_FORKING_URL as string,
                    //you can fork from last block by commenting next line
                    blockNumber: 28729129,
                },
            },],
        });

        signers = await ethers.getSigners();
        admin = await getImpersonatedSigner("0x2580f9954529853Ca5aC5543cE39E9B5B1145135");
        await (await (await ethers.getContractFactory("ForceSender")).deploy({ value: parseEther("10.0") })).forceSend(admin.address);

        usdWhale = await getImpersonatedSigner("0x075e72a5eDf65F0A5f44699c7654C1a76941Ddc8");
        curveUsdLpHolder = await getImpersonatedSigner("0x7117de93b352ae048925323f3fcb1cd4b4d52ec4");

        jeurWhale = await getImpersonatedSigner("0x00d7c133b923548f29cc2cc01ecb1ea2acdf2d4c");
        eurtWhale = await getImpersonatedSigner("0x1a4b038c31a8e5f98b00016b1005751296adc9a4");
        eursWhale = await getImpersonatedSigner("0x6de2865067b65d4571c17f6b9eeb8dbdd5e36584");

        wethWhale = await getImpersonatedSigner("0x72a53cdbbcc1b9efa39c834a540550e23463aacb");
        fraxWhale = await getImpersonatedSigner("0xaca39b187352d9805deced6e73a3d72abf86e7a0")


        dai = await ethers.getContractAt("IERC20", "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063");
        usdc = await ethers.getContractAt("IERC20", "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174");
        usdt = await ethers.getContractAt("IERC20", "0xc2132D05D31c914a87C6611C10748AEb04B58e8F");
        curveLpUSD = await ethers.getContractAt("IERC20", "0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171");

        jeur = await ethers.getContractAt("IERC20", "0x4e3Decbb3645551B8A19f0eA1678079FCB33fB4c");
        eurt = await ethers.getContractAt("IERC20", "0x7BDF330f423Ea880FF95fC41A280fD5eCFD3D09f");
        eurs = await ethers.getContractAt("IERC20", "0xE111178A87A3BFf0c8d18DECBa5798827539Ae99");

        weth = await ethers.getContractAt("IERC20", "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619");
        frax = await ethers.getContractAt("IERC20", "0x45c32fA6DF82ead1e2EF74d17b76547EDdFaFF89")
        // Temp test
        frax = weth;
        exchange = await ethers.getContractAt("Exchange", "0x6b45B9Ab699eFbb130464AcEFC23D49481a05773")

        console.log("We are forking Polygon mainnet\n");
        expect(await dai.balanceOf(usdWhale.address)).to.be.gt(0, "Whale has no DAI, or you are not forking Polygon");
        expect(await usdc.balanceOf(usdWhale.address)).to.be.gt(0, "Whale has no USDC, or you are not forking Polygon");
        expect(await usdt.balanceOf(usdWhale.address)).to.be.gt(0, "Whale has no USDT, or you are not forking Polygon");
        expect(await jeur.balanceOf(jeurWhale.address)).to.be.gt(0, "Whale has no jeur, or you are not forking Polygon");
        expect(await eurt.balanceOf(eurtWhale.address)).to.be.gt(0, "Whale has no eurt, or you are not forking Polygon");
        expect(await eurs.balanceOf(eursWhale.address)).to.be.gt(0, "Whale has no eurs, or you are not forking Polygon");
        expect(await weth.balanceOf(wethWhale.address)).to.be.gt(0, "Whale has no weth, or you are not forking Polygon");

        await sendEth([usdWhale.address, jeurWhale.address, eurtWhale.address, eursWhale.address, wethWhale.address])

        // Add frax-USD routes to exchange as it is currently empty.
        fraxUsdcRoute = [
            // FRAX - USDC
            { swapProtocol: 1, pool: fraxPoolAddress, fromCoin: frax.address, toCoin: usdc.address },
        ];
        fraxDaiRoute = [
            // FRAX - DAI
            { swapProtocol: 1, pool: fraxPoolAddress, fromCoin: frax.address, toCoin: dai.address },
        ];
        fraxUsdtRoute = [
            // FRAX - DAI
            { swapProtocol: 1, pool: fraxPoolAddress, fromCoin: frax.address, toCoin: usdt.address },
        ];
        usdtFraxRoute = [
            // USDT - FRAX
            { swapProtocol: 1, pool: fraxPoolAddress, fromCoin: usdt.address, toCoin: frax.address },
        ];
        daiFraxRoute = [
            // DAI - FRAX
            { swapProtocol: 1, pool: fraxPoolAddress, fromCoin: dai.address, toCoin: frax.address },
        ];
        usdcFraxRoute = [
            // USDC - FRAX
            { swapProtocol: 1, pool: fraxPoolAddress, fromCoin: usdc.address, toCoin: frax.address },
        ];

        const routes: Route[] = [
            usdtFraxRoute, daiFraxRoute, usdcFraxRoute, fraxUsdcRoute, fraxDaiRoute,
            fraxUsdtRoute,
        ];

        // Deploy fake exchange while waiting for polygon one to be filled.
        const Exchange = await ethers.getContractFactory("Exchange");
        exchange = await Exchange.connect(admin).deploy(admin.address, false);
        exchangeAddress = exchange.address;
        await (await exchange.connect(admin).createInternalMajorRoutes(routes)).wait();
        const Frax = await ethers.getContractFactory("CurveFraxAdapter");
        const fraxAdapter = await (await Frax.deploy()).deployed();
        await (await exchange.connect(admin).registerAdapters([fraxAdapter.address], [1])).wait();

        await exchange.connect(admin).createApproval([dai.address, usdc.address, usdt.address],
            [exchangeAddress,
                exchangeAddress,
                exchangeAddress]);


    });


    beforeEach(async function () {
        const IbAlluo = await ethers.getContractFactory("IbAlluo") as IbAlluo__factory;
        // Polygon Mainnet address for exchange.
        exchangeAddress = exchange.address;

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

        const UsdAdapter = await ethers.getContractFactory("UsdCurveAdapter") as UsdCurveAdapter__factory;
        const EurAdapter = await ethers.getContractFactory("EurCurveAdapter") as EurCurveAdapter__factory;
        const EthAdapter = await ethers.getContractFactory("EthNoPoolAdapter") as EthNoPoolAdapter__factory;

        eurAdapter = await EurAdapter.deploy(admin.address, handler.address, 200);
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

        await eurAdapter.connect(admin).adapterApproveAll()
        await handler.connect(admin).setAdapter(
            2,
            "EUR Curve-Aave",
            500,
            eurAdapter.address,
            true
        )



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
                exchangeAddress],
            { initializer: 'initialize', kind: 'uups' }
        ) as IbAlluo;

        await handler.connect(admin).grantIbAlluoPermissions(ibAlluoUsd.address)
        await handler.connect(admin).setIbAlluoToAdapterId(ibAlluoUsd.address, 1)



        ibAlluoEur = await upgrades.deployProxy(IbAlluo,
            [
                "Interest Bearing Alluo EUR",
                "ibAlluoEur",
                admin.address,
                handler.address,
                [jeur.address,
                eurt.address,
                eurs.address],
                BigNumber.from("100000000470636740"),
                1600,
                trustedForwarder, exchangeAddress],
            { initializer: 'initialize', kind: 'uups' }
        ) as IbAlluo;

        await handler.connect(admin).grantIbAlluoPermissions(ibAlluoEur.address)
        await handler.connect(admin).setIbAlluoToAdapterId(ibAlluoEur.address, 2)


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
                exchangeAddress],
            { initializer: 'initialize', kind: 'uups' }
        ) as IbAlluo;


        await handler.connect(admin).grantIbAlluoPermissions(ibAlluoEth.address)
        await handler.connect(admin).setIbAlluoToAdapterId(ibAlluoEth.address, 3)



    });
    describe("UsdAdapter with Exchange Tests", function () {
        it("Depositing in Frax should give you ibAlluoUsd", async function () {
            await deposit(signers[0], frax, parseEther("100"));
            expect(Number(await ibAlluoEth.balanceOf(signers[0].address))).greaterThan(Number(0))
        })
        // it("Depositing in Dai and then withdrawing in Dai should give you Dai back (without being added to withdrawal queue) ", async function () {
        //     await deposit(signers[0], dai, parseEther("100"));
        //     expect(Number(await ibAlluoEth.balanceOf(signers[0].address))).greaterThan(Number(0))
        //     await deposit(signers[8], dai, parseEther("1000"));
        //     await deposit(signers[8], dai, parseEther("1000"));
        //     await deposit(signers[8], dai, parseEther("1000"));

        //     await ibAlluoEth.connect(signers[0]).withdraw(dai.address, parseEther("0.039"))
        //     // Once there are sufficient deposits, withdrawal is fufilled.
        //     // await deposit(signers[0], dai, parseEther("1000"));
        //     console.log(await dai.balanceOf(signers[0].address));
        //     expect(Number(await dai.balanceOf(signers[0].address))).greaterThan(Number(70))

        // })
        // it("Depositing in Dai and then withdrawing in Dai should give you Dai back (after being added to withdrawal queue) ", async function () {
        //     await deposit(signers[1], dai, parseEther("100"));
        //     expect(Number(await ibAlluoEth.balanceOf(signers[1].address))).greaterThan(Number(0))
        //     await ibAlluoEth.connect(signers[1]).withdraw(dai.address, parseEther("0.039"))

        //     await deposit(signers[8], dai, parseEther("10000"));

        //     // Once there are sufficient deposits, withdrawal is fufilled.
        //     await handler.satisfyAllWithdrawals();
        //     console.log(await dai.balanceOf(signers[1].address));
        //     expect(Number(await dai.balanceOf(signers[1].address))).greaterThan(Number(70))

        // })

        // it("Depositing in USDC should give you ibAlluoEth", async function () {
        //     await deposit(signers[2], usdc, parseUnits("100", 6));
        //     expect(Number(await ibAlluoEth.balanceOf(signers[2].address))).greaterThan(Number(0))
        // })
        // it("Depositing in USDC and then withdrawing in Dai should give you Dai back (without being added to withdrawal queue) ", async function () {
        //     console.log(await dai.balanceOf(signers[3].address), "before");

        //     await deposit(signers[3], usdc, parseUnits("100", 6));
        //     expect(Number(await ibAlluoEth.balanceOf(signers[3].address))).greaterThan(Number(0))
        //     await deposit(signers[8], dai, parseEther("10000"));


        //     await ibAlluoEth.connect(signers[3]).withdraw(dai.address, parseEther("0.039"))

        //     console.log(await dai.balanceOf(signers[3].address));
        //     expect(Number(await dai.balanceOf(signers[3].address))).greaterThan(Number(70))

        // })
        // it("Depositing in USDC and then withdrawing in Dai should give you Dai back (after being added to withdrawal queue) ", async function () {
        //     console.log(await dai.balanceOf(signers[4].address), "before");

        //     await deposit(signers[4], usdc, parseUnits("100", 6));
        //     expect(Number(await ibAlluoEth.balanceOf(signers[4].address))).greaterThan(Number(0))
        //     await ibAlluoEth.connect(signers[4]).withdraw(dai.address, parseEther("0.039"))

        //     await deposit(signers[8], dai, parseEther("1000"));

        //     // Once there are sufficient deposits, withdrawal is fufilled.
        //     await handler.satisfyAllWithdrawals();
        //     console.log(await dai.balanceOf(signers[4].address));
        //     expect(Number(await dai.balanceOf(signers[4].address))).greaterThan(Number(70))

        // })

        // it("Depositing in a token not supported by the exchange should revert", async function () {
        //     await expect(deposit(signers[4], jeur, parseUnits("100", 18))).to.be.reverted;
        // })


        // it("Withdrawing in a token not supported by the exchange should revert", async function () {
        //     await deposit(signers[3], usdc, parseUnits("1000", 6));
        //     await expect(ibAlluoEth.connect(signers[3]).withdraw(jeur.address, parseEther("0.039"))).to.be.reverted;

        // })




    })

    async function approveExchange(recipient: SignerWithAddress) {
        const exchange = await ethers.getContractAt("IERC20", "0x6b45B9Ab699eFbb130464AcEFC23D49481a05773");
    }
    async function deposit(recipient: SignerWithAddress, token: IERC20, amount: BigNumberish) {
        if (token == eurs) {
            await token.connect(eursWhale).transfer(recipient.address, amount);
            await token.connect(recipient).approve(ibAlluoUsd.address, amount);
            await ibAlluoUsd.connect(recipient).deposit(token.address, amount);
        }
        else if (token == frax) {
            await token.connect(fraxWhale).transfer(recipient.address, amount);
            await token.connect(recipient).approve(ibAlluoUsd.address, amount);
            await ibAlluoUsd.connect(recipient).deposit(token.address, amount);
        }
        else if (token == eurt) {
            await token.connect(eurtWhale).transfer(recipient.address, amount);
            await token.connect(recipient).approve(ibAlluoUsd.address, amount);
            await ibAlluoUsd.connect(recipient).deposit(token.address, amount);
        }

        else if (token == jeur) {
            await token.connect(jeurWhale).transfer(recipient.address, amount);
            await token.connect(recipient).approve(ibAlluoUsd.address, amount);
            await ibAlluoUsd.connect(recipient).deposit(token.address, amount);
        }

        else if (token == weth) {
            await weth.connect(wethWhale).transfer(recipient.address, amount);
            await token.connect(recipient).approve(ibAlluoUsd.address, amount);
            await ibAlluoUsd.connect(recipient).deposit(token.address, amount)
        }

        else {
            await token.connect(usdWhale).transfer(recipient.address, amount);
            await token.connect(recipient).approve(ibAlluoUsd.address, amount);
            await ibAlluoUsd.connect(recipient).deposit(token.address, amount);

        }
    }

    async function depositToibAlluoEth(recipient: SignerWithAddress, token: IERC20, amount: BigNumberish) {
        await token.connect(recipient).approve(ibAlluoEth.address, amount);
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