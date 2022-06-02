import { parseEther, parseUnits } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, BigNumberish, BytesLike } from "ethers";
import { formatUnits } from "ethers/lib/utils";
import { ethers, network, upgrades } from "hardhat";
import { before } from "mocha";
import { IERC20, PseudoMultisigWallet, PseudoMultisigWallet__factory, IbAlluo, IbAlluo__factory, LiquidityHandler, UsdCurveAdapter, LiquidityHandler__factory, UsdCurveAdapter__factory, EurCurveAdapter, EthNoPoolAdapter, EurCurveAdapter__factory, EthNoPoolAdapter__factory, Exchange, IWrappedEther, IERC20Metadata, } from "../typechain";


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

    // let dai: IERC20, usdc: IERC20, usdt: IERC20;
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

    type Edge = {
        swapProtocol: BigNumberish;
        pool: string;
        fromCoin: string;
        toCoin: string;
    };
    type Route = Edge[];
    let exchange: Exchange
    let usdt: IERC20Metadata, usdc: IERC20Metadata,
        dai: IERC20Metadata;
    let PolygonCurve3Lp: IERC20Metadata;

    let usdtUsdcRoute: Route, usdtDaiRoute: Route, usdcUsdtRoute: Route, usdcDaiRoute: Route, daiUsdcRoute: Route, daiUsdtRoute: Route;

    let polygonCurveEdge: Edge;



    const PolygonCurve3Pool = "0x445FE580eF8d70FF569aB36e80c647af338db351";
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


        dai = await ethers.getContractAt("IERC20Metadata", "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063");
        usdc = await ethers.getContractAt("IERC20Metadata", "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174");
        usdt = await ethers.getContractAt("IERC20Metadata", "0xc2132D05D31c914a87C6611C10748AEb04B58e8F");
        curveLpUSD = await ethers.getContractAt("IERC20", "0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171");

        jeur = await ethers.getContractAt("IERC20", "0x4e3Decbb3645551B8A19f0eA1678079FCB33fB4c");
        eurt = await ethers.getContractAt("IERC20", "0x7BDF330f423Ea880FF95fC41A280fD5eCFD3D09f");
        eurs = await ethers.getContractAt("IERC20", "0xE111178A87A3BFf0c8d18DECBa5798827539Ae99");

        weth = await ethers.getContractAt("IERC20", "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619");
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

        PolygonCurve3Lp = await ethers.getContractAt("IERC20Metadata", "0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171");

        polygonCurveEdge = { swapProtocol: 1, pool: PolygonCurve3Pool, fromCoin: PolygonCurve3Lp.address, toCoin: usdc.address };

        usdtUsdcRoute = [
            // USDT - USDC
            { swapProtocol: 1, pool: PolygonCurve3Pool, fromCoin: usdt.address, toCoin: usdc.address }
        ]
        usdtDaiRoute = [
            // USDT - DAI
            { swapProtocol: 1, pool: PolygonCurve3Pool, fromCoin: usdt.address, toCoin: dai.address }
        ]

        usdcUsdtRoute = [
            // USDC - USDT
            { swapProtocol: 1, pool: PolygonCurve3Pool, fromCoin: usdc.address, toCoin: usdt.address }
        ];
        usdcDaiRoute = [
            // USDC - DAI
            { swapProtocol: 1, pool: PolygonCurve3Pool, fromCoin: usdc.address, toCoin: dai.address }
        ];
        daiUsdcRoute = [
            // DAI - USDC
            { swapProtocol: 1, pool: PolygonCurve3Pool, fromCoin: dai.address, toCoin: usdc.address }
        ];
        daiUsdtRoute = [
            // DAI - USDT
            { swapProtocol: 1, pool: PolygonCurve3Pool, fromCoin: dai.address, toCoin: usdt.address }
        ];
    });


    beforeEach(async function () {


        // Deploy fake exchange with PolygonCurve3 Route
        const Exchange = await ethers.getContractFactory("Exchange");
        admin = await getImpersonatedSigner("0x2580f9954529853Ca5aC5543cE39E9B5B1145135");

        exchange = await Exchange.deploy(admin.address, true);
        await exchange.deployed();


        const PolygonCurve = await ethers.getContractFactory("PolygonCurve3Adapter");

        const polygonCurveAdapter = await PolygonCurve.deploy()
        const routes: Route[] = [
            usdtUsdcRoute, usdtDaiRoute, usdcUsdtRoute, usdcDaiRoute, daiUsdcRoute, daiUsdtRoute,
        ];
        await exchange.connect(admin).createInternalMajorRoutes(routes)

        await exchange.connect(admin).createLpToken(
            [{ swapProtocol: 1, pool: PolygonCurve3Pool }],
            [PolygonCurve3Pool],
            [[dai.address, usdt.address, usdc.address, PolygonCurve3Lp.address]]
        );

        await exchange.connect(admin).createApproval([dai.address, usdc.address, usdt.address],
            [exchange.address,
            exchange.address,
            exchange.address]);
        await exchange.connect(admin).registerAdapters([polygonCurveAdapter.address], [1])

        await exchange.connect(admin).createMinorCoinEdge([polygonCurveEdge])




        const IbAlluo = await ethers.getContractFactory("IbAlluo") as IbAlluo__factory;
        // Polygon Mainnet address for exchange.
        // Use fake exchange for now.
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
    async function testSwap(fromAddress: string, toAddress: string, amount: BigNumberish) {
        const from = await ethers.getContractAt("IERC20Metadata", fromAddress);
        await from.connect(usdWhale).approve(exchange.address, amount);
        // Usd whale doesn't have am3CRV, so change slightly,
        if (fromAddress == "0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171") {
            usdc.connect(usdWhale).approve(exchange.address, parseUnits("100", 6));
            const tx = await exchange.connect(usdWhale).exchange(usdc.address, "0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171", parseUnits("100", 6), 0)
            // Give some amCRV to the usdWhale so they can swap.
        }
        const to = await ethers.getContractAt("IERC20Metadata", toAddress);
        const balBefore = await to.balanceOf(usdWhale.address);
        const tx = await (await exchange.connect(usdWhale).exchange(fromAddress, toAddress, amount, 0)).wait();
        console.log("Swapped", formatUnits(amount, await from.decimals()),
            await from.symbol(), "for", formatUnits((await to.balanceOf(usdWhale.address)).sub(balBefore), await to.decimals()),
            await to.symbol() + ",", "gas used:", tx.cumulativeGasUsed.toString());
    }
    describe("Exchange Test", function () {
        it("The exchange should be working normally: Check all swap combinations", async function () {
            const supportedCoinList = [dai, usdc, usdt, PolygonCurve3Lp];
            // swap all combinations of all tokens
            for (let i = 0; i < supportedCoinList.length; i++) {
                for (let j = 0; j < supportedCoinList.length; j++) {
                    if (i == j) continue;

                    const coinIn = supportedCoinList[i];
                    const coinOut = supportedCoinList[j];
                    const oneToken = parseUnits("1.0", await coinIn.decimals());
                    await testSwap(coinIn.address, coinOut.address, oneToken);
                }
            }
        })
    })
    describe("UsdAdapter with Exchange Tests", function () {
        it("Depositing in amCurv3 should give you ibAlluoUsd", async function () {
            await deposit(signers[0], PolygonCurve3Lp, parseEther("100"));
            const ibAlluoBalance = await ibAlluoUsd.balanceOf(signers[0].address);
            expect(Number(ibAlluoBalance)).greaterThan(Number(0))
        })
        it("Depositing in amCrv3 and then withdrawing in Dai should give you amCrv3 back (without being added to withdrawal queue) ", async function () {
            await deposit(signers[0], PolygonCurve3Lp, parseEther("100"));
            expect(Number(await ibAlluoUsd.balanceOf(signers[0].address))).greaterThan(Number(0))
            await deposit(signers[8], PolygonCurve3Lp, parseEther("1000"));
            await deposit(signers[8], PolygonCurve3Lp, parseEther("1000"));
            await deposit(signers[8], PolygonCurve3Lp, parseEther("1000"));

            // Once there are sufficient buffer
            await ibAlluoUsd.connect(signers[0]).withdraw(PolygonCurve3Lp.address, parseEther("70"))
            // Roughly 1 am3CRV = 1.05 USD
            // 70 usd roughly 66.7 am3CRV so 
            const balAfter = await PolygonCurve3Lp.balanceOf(signers[0].address);
            console.log(balAfter);
            expect(Number(balAfter)).greaterThan(Number(parseEther("60")))
            expect(Number(balAfter)).lessThan(Number(parseEther("70")))


        })
        it("Depositing in amCrv3 and then withdrawing in amCrv3 should give you amCrv3 back (after being added to withdrawal queue) ", async function () {
            await deposit(signers[1], PolygonCurve3Lp, parseEther("100"));
            expect(Number(await ibAlluoUsd.balanceOf(signers[1].address))).greaterThan(Number(0))
            await ibAlluoUsd.connect(signers[1]).withdraw(PolygonCurve3Lp.address, parseEther("70"))

            await deposit(signers[8], dai, parseEther("10000"));

            // Once there are sufficient deposits, withdrawal is fufilled.
            await handler.satisfyAllWithdrawals();
            const balAfter = await PolygonCurve3Lp.balanceOf(signers[1].address);
            console.log(balAfter);
            expect(Number(balAfter)).greaterThan(Number(parseEther("60")))
            expect(Number(balAfter)).lessThan(Number(parseEther("70")))


        })

        it("Depositing in a token not supported by the exchange should revert", async function () {
            await expect(deposit(signers[4], jeur, parseUnits("100", 18))).to.be.reverted;
        })


        it("Withdrawing in a token not supported by the exchange should revert", async function () {
            await deposit(signers[3], usdc, parseUnits("1000", 6));
            await expect(ibAlluoUsd.connect(signers[3]).withdraw(jeur.address, parseEther("10"))).to.be.reverted;

        })

    })
    async function deposit(recipient: SignerWithAddress, token: IERC20, amount: BigNumberish) {
        if (token == eurs) {
            await token.connect(eursWhale).transfer(recipient.address, amount);
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
        } if (token == PolygonCurve3Lp) {
            // The usd whale doesn't have enough usdc.
            await usdc.connect(usdWhale).approve(exchange.address, parseUnits("10000000000", 6))
            await exchange.connect(usdWhale).exchange(usdc.address, PolygonCurve3Lp.address, parseUnits("1000", 6), 0)
            await token.connect(usdWhale).transfer(recipient.address, amount);
            await token.connect(recipient).approve(ibAlluoUsd.address, amount);
            await ibAlluoUsd.connect(recipient).deposit(token.address, amount);
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