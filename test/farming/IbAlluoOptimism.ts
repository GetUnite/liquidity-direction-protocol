
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { expect } from "chai";
import { BigNumberish, constants } from "ethers";
import { formatUnits, parseEther, parseUnits } from "ethers/lib/utils";
import { ethers, network, upgrades } from "hardhat";
import { before } from "mocha"
import { BtcOptimismAdapter, BufferManager, IbAlluo, ICurvePoolBTC, ICurvePoolETH, ICurvePoolUSD, IERC20Metadata, IExchange, IWrappedEther, LiquidityHandlerPolygon, PriceFeedRouterV2, StIbAlluo, SuperfluidEndResolver, SuperfluidResolver, Usd3PoolOptimismAdapter } from "../../typechain";
import { EthOptimismAdapter } from "../../typechain/EthOptimismAdapter";

function getInterestPerSecondParam(apyPercent: number): string {
    const secondsInYear = 31536000;
    const decimalApy = 1 + (apyPercent / 100);
    const decimalInterest = Math.pow(decimalApy, 1 / secondsInYear);
    return Math.round(decimalInterest * (10 ** 17)).toString();
}

async function forceSend(amount: BigNumberish, to: string) {
    const ForceSencer = await ethers.getContractFactory("ForceSender");
    const sender = await ForceSencer.deploy({ value: amount });
    await sender.forceSend(to);
}

async function skipDays(d: number) {
    ethers.provider.send('evm_increaseTime', [d * 86400]);
    ethers.provider.send('evm_mine', []);
}

describe("IbAlluo Optimism Integration Test", async () => {
    let signers: SignerWithAddress[];
    let priceRouter: PriceFeedRouterV2;
    let exchange: IExchange;
    let gnosis: SignerWithAddress;

    let usdc: IERC20Metadata, usdt: IERC20Metadata, dai: IERC20Metadata, 
        weth: IWrappedEther, wbtc: IERC20Metadata, usdLpToken: ICurvePoolUSD,
        ethLpToken: ICurvePoolETH, btcLpToken: ICurvePoolBTC;

    before(async () => {
        await network.provider.request({
            method: "hardhat_reset",
            params: [{
                forking: {
                    enabled: true,
                    jsonRpcUrl: process.env.OPTIMISM_URL as string,
                },
            },],
        });

        exchange = await ethers.getContractAt(
            "contracts/interfaces/IExchange.sol:IExchange",
            "0x66Ac11c106C3670988DEFDd24BC75dE786b91095"
        ) as IExchange;
        priceRouter = await ethers.getContractAt("PriceFeedRouterV2", "0x7E6FD319A856A210b9957Cd6490306995830aD25");
        gnosis = await ethers.getImpersonatedSigner("0xc7061dD515B602F86733Fa0a0dBb6d6E6B34aED4")

        // Checks on recent optimism block

        const deployer = "0xFc57eBe6d333980E620A923B6edb78fc7FB5cC3f";
        const role = constants.HashZero;

        expect(await exchange.hasRole(role, gnosis.address)).to.be.true;
        expect(await priceRouter.hasRole(role, gnosis.address)).to.be.true;

        if (await exchange.hasRole(role, deployer)) {
            console.warn("\n ⚠️ Deployer has DEFAULT_ADMIN_ROLE on Exchange");
        }
        if (await priceRouter.hasRole(role, deployer)) {
            console.warn("\n ⚠️ Deployer has DEFAULT_ADMIN_ROLE on PriceFeedRouterV2\n");
        }

        await network.provider.request({
            method: "hardhat_reset",
            params: [{
                forking: {
                    enabled: true,
                    jsonRpcUrl: process.env.OPTIMISM_URL as string,
                    blockNumber: 74118749
                },
            },],
        });

        upgrades.silenceWarnings()

        signers = await ethers.getSigners();
        gnosis = await ethers.getImpersonatedSigner("0xc7061dD515B602F86733Fa0a0dBb6d6E6B34aED4")
        usdc = await ethers.getContractAt("IERC20Metadata", "0x7f5c764cbc14f9669b88837ca1490cca17c31607");
        usdt = await ethers.getContractAt("IERC20Metadata", "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58");
        dai = await ethers.getContractAt("IERC20Metadata", "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1");
        weth = await ethers.getContractAt(
            "contracts/interfaces/IWrappedEther.sol:IWrappedEther",
            "0x4200000000000000000000000000000000000006"
        ) as IWrappedEther;
        wbtc = await ethers.getContractAt("IERC20Metadata", "0x68f180fcCe6836688e9084f035309E29Bf0A2095");
        usdLpToken = await ethers.getContractAt(
            "contracts/interfaces/curve/optimism/ICurvePoolUSD.sol:ICurvePoolUSD",
            "0x1337BedC9D22ecbe766dF105c9623922A27963EC"
        ) as ICurvePoolUSD;
        ethLpToken = await ethers.getContractAt(
            "contracts/interfaces/curve/optimism/ICurvePoolETH.sol:ICurvePoolETH",
            "0x7Bc5728BC2b59B45a58d9A576E2Ffc5f0505B35E"
        ) as ICurvePoolETH
        btcLpToken = await ethers.getContractAt(
            "contracts/interfaces/curve/optimism/ICurvePoolBTC.sol:ICurvePoolBTC",
            "0x9F2fE3500B1a7E285FDc337acacE94c480e00130"
        ) as ICurvePoolBTC

        await forceSend(parseEther("100.0"), gnosis.address);

        const usdcWhale = await ethers.getImpersonatedSigner("0x625e7708f30ca75bfd92586e17077590c60eb4cd");
        const usdtWhale = await ethers.getImpersonatedSigner("0x0d0707963952f2fba59dd06f2b425ace40b492fe");
        const daiWhale = await ethers.getImpersonatedSigner("0xad32aa4bff8b61b4ae07e3ba437cf81100af0cd7");
        const wbtcWhale = await ethers.getImpersonatedSigner("0x078f358208685046a11c85e8ad32895ded33a249");

        await forceSend(parseEther("100.0"), usdcWhale.address);
        await forceSend(parseEther("100.0"), usdtWhale.address);
        await forceSend(parseEther("100.0"), daiWhale.address);
        await forceSend(parseEther("100.0"), wbtcWhale.address);

        await usdc.connect(usdcWhale).transfer(signers[0].address, await usdc.balanceOf(usdcWhale.address))
        await usdt.connect(usdtWhale).transfer(signers[0].address, await usdt.balanceOf(usdtWhale.address))
        await dai.connect(daiWhale).transfer(signers[0].address, await dai.balanceOf(daiWhale.address))
        await wbtc.connect(wbtcWhale).transfer(signers[0].address, await wbtc.balanceOf(wbtcWhale.address))
        const ethToSend = (await signers[9].getBalance()).sub(parseEther("1"));
        await weth.connect(signers[9]).deposit({value: ethToSend});
        await weth.connect(signers[9]).transfer(signers[0].address, ethToSend);
    });

    let handler: LiquidityHandlerPolygon;
    let buffer: BufferManager;
    let usdAdapter: Usd3PoolOptimismAdapter;
    let ethAdapter: EthOptimismAdapter;
    let btcAdapter: BtcOptimismAdapter;
    let ibAlluoUSD: IbAlluo;
    let ibAlluoETH: IbAlluo;
    let ibAlluoBTC: IbAlluo;
    let stIbAlluoUSD: StIbAlluo;
    let stIbAlluoETH: StIbAlluo;
    let stIbAlluoBTC: StIbAlluo;
    let superfluidResolver: SuperfluidResolver;
    let superfluidEndResolver: SuperfluidEndResolver;
    beforeEach(async () => {
        // Step 1: Deploy LiquidityHandler, but setup later
        const handlerFactory = await ethers.getContractFactory("LiquidityHandlerPolygon");

        handler = await upgrades.deployProxy(
            handlerFactory,
            [
                gnosis.address,
                exchange.address
            ],
            { kind: "uups" }
        ) as LiquidityHandlerPolygon;

        // Step 2: Deploy BufferManager, but setup later
        const bufferFactory = await ethers.getContractFactory("BufferManager");
        const blockTimestamp = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
        const spokePool = "0xa420b2d1c0841415A695b81E5B867BCD07Dff8C9";
        buffer = await upgrades.deployProxy(
            bufferFactory,
            [
                86400, // epochDuration
                blockTimestamp, // bridgeGenesis
                28800, // bridgeInterval
                gnosis.address, // gnosis
                spokePool // spokePool
            ],
            { kind: "uups" }
        ) as BufferManager;

        // Step 3: Deploy and set USD, ETH, BTC adapters
        const usdAdapterFactory = await ethers.getContractFactory("Usd3PoolOptimismAdapter");
        usdAdapter = await upgrades.deployProxy(
            usdAdapterFactory,
            [
                gnosis.address,
                buffer.address,
                handler.address,
                200
            ],
            { kind: "uups" }
        ) as Usd3PoolOptimismAdapter;
        await usdAdapter.connect(gnosis).adapterApproveAll();
        await usdAdapter.connect(gnosis).setPriceRouterInfo(priceRouter.address, 0);
        await handler.connect(gnosis).setAdapter(
            1,
            "USD 3pool Curve",
            50,
            usdAdapter.address,
            true
        );

        // id 2 reserved for EUR

        const ethAdapterFactory = await ethers.getContractFactory("EthOptimismAdapter");
        ethAdapter = await upgrades.deployProxy(
            ethAdapterFactory,
            [
                gnosis.address,
                buffer.address,
                handler.address,
                200
            ],
            { kind: "uups" }
        ) as EthOptimismAdapter;
        await ethAdapter.connect(gnosis).adapterApproveAll();
        await handler.connect(gnosis).setAdapter(
            3,
            "sETH/ETH Curve",
            100,
            ethAdapter.address,
            true
        );

        const btcAdapterFactory = await ethers.getContractFactory("BtcOptimismAdapter");
        btcAdapter = await upgrades.deployProxy(
            btcAdapterFactory,
            [
                gnosis.address,
                buffer.address,
                handler.address,
                200
            ],
            { kind: "uups" }
        ) as BtcOptimismAdapter;
        await btcAdapter.connect(gnosis).adapterApproveAll();
        await handler.connect(gnosis).setAdapter(
            4,
            "sBTC/wbtc Curve",
            100,
            btcAdapter.address,
            true
        );

        // Step 4: ibAlluoUSD, ETH, BTC deploy and setup
        const apyUsd = 7.0;
        const apyEth = 5.5;
        const apyBtc = 4.0;
        const apyIntegerUsd = 700;
        const apyIntegerEth = 550;
        const apyIntegerBtc = 400;
        const interestPerSecondUSD = getInterestPerSecondParam(apyUsd);
        const interestPerSecondETH = getInterestPerSecondParam(apyEth);
        const interestPerSecondBTC = getInterestPerSecondParam(apyBtc);
        const ibAlluoFactory = await ethers.getContractFactory("IbAlluo");
        const trustedForwarder = "0xEFbA8a2A82ec1fB1273806174f5E28FBb917Cf95";

        ibAlluoUSD = await upgrades.deployProxy(
            ibAlluoFactory,
            [
                "Interest Bearing Alluo USD",
                "IbAlluoUSD",
                gnosis.address,
                handler.address,
                [dai.address, usdc.address, usdt.address],
                interestPerSecondUSD,
                apyIntegerUsd,
                trustedForwarder,
                exchange.address
            ],
            { kind: "uups" }
        ) as IbAlluo;
        ibAlluoETH = await upgrades.deployProxy(
            ibAlluoFactory,
            [
                "Interest Bearing Alluo ETH",
                "IbAlluoETH",
                gnosis.address,
                handler.address,
                [weth.address],
                interestPerSecondETH,
                apyIntegerEth,
                trustedForwarder,
                exchange.address
            ],
            { kind: "uups", useDeployedImplementation: true }
        ) as IbAlluo;
        ibAlluoBTC = await upgrades.deployProxy(
            ibAlluoFactory,
            [
                "Interest Bearing Alluo BTC",
                "IbAlluoBTC",
                gnosis.address,
                handler.address,
                [wbtc.address],
                interestPerSecondBTC,
                apyIntegerBtc,
                trustedForwarder,
                exchange.address
            ],
            { kind: "uups", useDeployedImplementation: true }
        ) as IbAlluo;

        await handler.connect(gnosis).grantRole(constants.HashZero, ibAlluoUSD.address);
        await handler.connect(gnosis).grantRole(constants.HashZero, ibAlluoETH.address);
        await handler.connect(gnosis).grantRole(constants.HashZero, ibAlluoBTC.address);
        await handler.connect(gnosis).setIbAlluoToAdapterId(ibAlluoUSD.address, 1);
        await handler.connect(gnosis).setIbAlluoToAdapterId(ibAlluoETH.address, 3);
        await handler.connect(gnosis).setIbAlluoToAdapterId(ibAlluoBTC.address, 4);
        await ibAlluoUSD.connect(gnosis).setPriceRouterInfo(priceRouter.address, 0);

        // Step 5: Setup Superfluid contracts
        const StIbAlluoFactory = await ethers.getContractFactory("StIbAlluo");
        const superfluidHost = "0x567c4B141ED61923967cA25Ef4906C8781069a10"
        const cfaV1 = "0x204C6f131bb7F258b2Ea1593f5309911d8E458eD";

        stIbAlluoUSD = await upgrades.deployProxy(
            StIbAlluoFactory,
            [
                ibAlluoUSD.address,
                18,
                "Streaming IbAlluo USD",
                "StIbAlluoUSD",
                superfluidHost,
                gnosis.address,
                [ibAlluoUSD.address]
            ], {
            initializer: 'alluoInitialize',
            kind: 'uups',
            unsafeAllow: ["delegatecall"]
        }
        ) as StIbAlluo;

        stIbAlluoETH = await upgrades.deployProxy(
            StIbAlluoFactory,
            [
                ibAlluoETH.address,
                18,
                "Streaming IbAlluo ETH",
                "StIbAlluoETH",
                superfluidHost,
                gnosis.address,
                [ibAlluoETH.address]
            ], {
            initializer: 'alluoInitialize',
            kind: 'uups',
            unsafeAllow: ["delegatecall"],
            useDeployedImplementation: true
        }
        ) as StIbAlluo;

        stIbAlluoBTC = await upgrades.deployProxy(
            StIbAlluoFactory,
            [
                ibAlluoBTC.address,
                18,
                "Streaming IbAlluo BTC",
                "StIbAlluoBTC",
                superfluidHost,
                gnosis.address,
                [ibAlluoBTC.address]
            ], {
            initializer: 'alluoInitialize',
            kind: 'uups',
            unsafeAllow: ["delegatecall"],
            useDeployedImplementation: true
        }
        ) as StIbAlluo;

        await ibAlluoUSD.connect(gnosis).setSuperToken(stIbAlluoUSD.address);
        await ibAlluoETH.connect(gnosis).setSuperToken(stIbAlluoETH.address);
        await ibAlluoBTC.connect(gnosis).setSuperToken(stIbAlluoBTC.address);

        const SuperfluidResolver = await ethers.getContractFactory("SuperfluidResolver");
        superfluidResolver = await SuperfluidResolver.deploy(
            [ibAlluoUSD.address, ibAlluoETH.address, ibAlluoBTC.address],
            cfaV1,
            gnosis.address
        );
        const SuperfluidEndResolver = await ethers.getContractFactory("SuperfluidEndResolver");
        superfluidEndResolver = await SuperfluidEndResolver.deploy(
            [ibAlluoUSD.address, ibAlluoETH.address, ibAlluoBTC.address],
            gnosis.address
        );
        await ibAlluoUSD.connect(gnosis).setSuperfluidResolver(superfluidResolver.address);
        await ibAlluoETH.connect(gnosis).setSuperfluidResolver(superfluidResolver.address);
        await ibAlluoBTC.connect(gnosis).setSuperfluidResolver(superfluidResolver.address);

        await ibAlluoUSD.connect(gnosis).setSuperfluidEndResolver(superfluidEndResolver.address);
        await ibAlluoETH.connect(gnosis).setSuperfluidEndResolver(superfluidEndResolver.address);
        await ibAlluoBTC.connect(gnosis).setSuperfluidEndResolver(superfluidEndResolver.address);

        // TODO:
        // look roles on (st)iballuo, use as reference
        // look at resolvers created by Remi address

        // Step 6: Setup BufferManager


    })

    it("Clean USDC deposit+withdraw & balance check", async () => {
        await usdc.approve(ibAlluoUSD.address, constants.MaxUint256);

        const ibAlluoBalanceBefore = await ibAlluoUSD.balanceOf(signers[0].address);
        await ibAlluoUSD.deposit(usdc.address, parseUnits("100.0", 6));
        const ibAlluoBalanceAfter = await ibAlluoUSD.balanceOf(signers[0].address);
        const ibAlluoReceived = ibAlluoBalanceAfter.sub(ibAlluoBalanceBefore);

        expect(ibAlluoReceived).to.be.gte(parseUnits("95.0", 18));
        // console.log("Received", formatUnits(ibAlluoReceived, 18), "ibAlluoUSD")

        const balanceBefore = await usdc.balanceOf(signers[0].address);
        await ibAlluoUSD.withdraw(usdc.address, parseUnits("0.45", 18));
        const balanceAfter = await usdc.balanceOf(signers[0].address);
        const received = balanceAfter.sub(balanceBefore);
        expect(received).to.be.gt(parseUnits("0.44", 6));
    })

    it("Clean USDT deposit+withdraw & balance check", async () => {
        await usdt.approve(ibAlluoUSD.address, constants.MaxUint256);

        const ibAlluoBalanceBefore = await ibAlluoUSD.balanceOf(signers[0].address);
        await ibAlluoUSD.deposit(usdt.address, parseUnits("100.0", 6));
        const ibAlluoBalanceAfter = await ibAlluoUSD.balanceOf(signers[0].address);
        const ibAlluoReceived = ibAlluoBalanceAfter.sub(ibAlluoBalanceBefore);

        expect(ibAlluoReceived).to.be.gte(parseUnits("95.0", 18));
        // console.log("Received", formatUnits(ibAlluoReceived, 18), "ibAlluoUSD")

        const balanceBefore = await usdt.balanceOf(signers[0].address);
        await ibAlluoUSD.withdraw(usdt.address, parseUnits("0.45", 18));
        const balanceAfter = await usdt.balanceOf(signers[0].address);
        const received = balanceAfter.sub(balanceBefore);
        expect(received).to.be.gt(parseUnits("0.44", 6));
    })

    it("Clean DAI deposit+withdraw & balance check", async () => {
        await dai.approve(ibAlluoUSD.address, constants.MaxUint256);

        const ibAlluoBalanceBefore = await ibAlluoUSD.balanceOf(signers[0].address);
        await ibAlluoUSD.deposit(dai.address, parseUnits("100.0", 18));
        const ibAlluoBalanceAfter = await ibAlluoUSD.balanceOf(signers[0].address);
        const ibAlluoReceived = ibAlluoBalanceAfter.sub(ibAlluoBalanceBefore);

        expect(ibAlluoReceived).to.be.gte(parseUnits("95.0", 18));
        // console.log("Received", formatUnits(ibAlluoReceived, 18), "ibAlluoUSD")

        const balanceBefore = await dai.balanceOf(signers[0].address);
        await ibAlluoUSD.withdraw(dai.address, parseUnits("0.45", 18));
        const balanceAfter = await dai.balanceOf(signers[0].address);
        const received = balanceAfter.sub(balanceBefore);
        expect(received).to.be.gt(parseUnits("0.44", 18));
    });

    it("Clean WETH deposit+withdraw & balance check", async () => {
        await weth.approve(ibAlluoETH.address, constants.MaxUint256);

        const ibAlluoBalanceBefore = await ibAlluoETH.balanceOf(signers[0].address);
        await ibAlluoETH.deposit(weth.address, parseUnits("100.0", 18));
        const ibAlluoBalanceAfter = await ibAlluoETH.balanceOf(signers[0].address);
        const ibAlluoReceived = ibAlluoBalanceAfter.sub(ibAlluoBalanceBefore);

        expect(ibAlluoReceived).to.be.gte(parseUnits("95.0", 18));
        // console.log("Received", formatUnits(ibAlluoReceived, 18), "ibAlluoETH")

        const balanceBefore = await weth.balanceOf(signers[0].address);
        await ibAlluoETH.withdraw(weth.address, parseUnits("0.45", 18));
        const balanceAfter = await weth.balanceOf(signers[0].address);
        const received = balanceAfter.sub(balanceBefore);
        expect(received).to.be.gt(parseUnits("0.44", 18));
    });

    it("Clean WBTC deposit+withdraw & balance check", async () => {
        await wbtc.approve(ibAlluoBTC.address, constants.MaxUint256);

        const ibAlluoBalanceBefore = await ibAlluoBTC.balanceOf(signers[0].address);
        await ibAlluoBTC.deposit(wbtc.address, parseUnits("100.0", 8));
        const ibAlluoBalanceAfter = await ibAlluoBTC.balanceOf(signers[0].address);
        const ibAlluoReceived = ibAlluoBalanceAfter.sub(ibAlluoBalanceBefore);

        expect(ibAlluoReceived).to.be.gte(parseUnits("95.0", 18));
        // console.log("Received", formatUnits(ibAlluoReceived, 18), "ibAlluoBTC")

        const balanceBefore = await wbtc.balanceOf(signers[0].address);
        await ibAlluoBTC.withdraw(wbtc.address, parseUnits("0.45", 18));
        const balanceAfter = await wbtc.balanceOf(signers[0].address);
        const received = balanceAfter.sub(balanceBefore);
        expect(received).to.be.gt(parseUnits("0.44", 8));
    });

    it("Check token flow USD", async () => {
        await usdc.approve(ibAlluoUSD.address, constants.MaxUint256);
        await usdt.approve(ibAlluoUSD.address, constants.MaxUint256);
        await dai.approve(ibAlluoUSD.address, constants.MaxUint256);

        await ibAlluoUSD.deposit(usdc.address, parseUnits("100.0", 6));
        await ibAlluoUSD.deposit(usdt.address, parseUnits("100.0", 6));
        await ibAlluoUSD.deposit(dai.address, parseUnits("100.0", 18));

        const adapterAmount = await usdAdapter.getAdapterAmount();
        const adapterLpBalance = await usdLpToken.balanceOf(usdAdapter.address);
        const bufferUsdcBalance = await usdc.balanceOf(buffer.address);
        const lpToUsdc = await usdLpToken.calc_withdraw_one_coin(adapterLpBalance, 1);

        expect(adapterAmount).to.be.gt(parseUnits("1.485", 18));
        expect(adapterLpBalance).to.be.gt(parseUnits("1.46", 18));
        expect(bufferUsdcBalance).to.be.gt(parseUnits("298.5", 6));
        expect(lpToUsdc).to.be.gt(parseUnits("1.485", 6));

        // console.log("Adapter amount:", formatUnits(adapterAmount, 18), "USD");
        // console.log("Adapter LP amount:", formatUnits(adapterLpBalance, 18), "LP");
        // console.log("Buffer amount:", formatUnits(bufferUsdcBalance, 6), "USDC");
        // console.log("LP -> USDC:", formatUnits(lpToUsdc, 6), "USDC");
        // console.log("USDC Price:", formatUnits(usdcPrice.value, usdcPrice.decimals), "USD");
    })

    it("Check token flow ETH", async () => {
        await weth.approve(ibAlluoETH.address, constants.MaxUint256);

        await ibAlluoETH.deposit(weth.address, parseUnits("100.0", 18));

        const adapterAmount = await ethAdapter.getAdapterAmount();
        const adapterLpBalance = await ethLpToken.balanceOf(ethAdapter.address);
        const bufferWethBalance = await weth.balanceOf(buffer.address);
        const lpToWeth = await ethLpToken.calc_withdraw_one_coin(adapterLpBalance, 0);

        expect(adapterAmount).to.be.gt(parseUnits("0.999", 18));
        expect(adapterLpBalance).to.be.gt(parseUnits("0.995", 18));
        expect(bufferWethBalance).to.be.eq(parseUnits("99.0", 18));
        expect(lpToWeth).to.be.gt(parseUnits("0.999", 18));

        console.log("Adapter amount:", formatUnits(adapterAmount, 18), "ETH");
        console.log("Adapter LP amount:", formatUnits(adapterLpBalance, 18), "LP");
        console.log("Buffer amount:", formatUnits(bufferWethBalance, 18), "WETH");
        console.log("LP -> WETH:", formatUnits(lpToWeth, 18), "WETH");
    })

    it("Check token flow BTC", async () => {
        await wbtc.approve(ibAlluoBTC.address, constants.MaxUint256);

        await ibAlluoBTC.deposit(wbtc.address, parseUnits("100.0", 8));

        const adapterAmount = await btcAdapter.getAdapterAmount();
        const adapterLpBalance = await btcLpToken.balanceOf(btcAdapter.address);
        const bufferWbtcBalance = await wbtc.balanceOf(buffer.address);
        const lpToWeth = await btcLpToken.calc_withdraw_one_coin(adapterLpBalance, 1);

        expect(adapterAmount).to.be.gt(parseUnits("0.999", 18));
        expect(adapterLpBalance).to.be.gt(parseUnits("0.995", 18));
        expect(bufferWbtcBalance).to.be.eq(parseUnits("99.0", 8));
        expect(lpToWeth).to.be.gt(parseUnits("0.999", 8));

        console.log("Adapter amount:", formatUnits(adapterAmount, 18), "BTC");
        console.log("Adapter LP amount:", formatUnits(adapterLpBalance, 18), "LP");
        console.log("Buffer amount:", formatUnits(bufferWbtcBalance, 8), "WBTC");
        console.log("LP -> WBTC:", formatUnits(lpToWeth, 8), "WBTC");
    })

    it("Check withdraw (instant)", async () => {
        await usdc.approve(ibAlluoUSD.address, constants.MaxUint256);
        await ibAlluoUSD.deposit(
            usdc.address,
            parseUnits("100000.0", 6)
        ); // available for instant withdraw ~500 USD

        const daiBefore = await dai.balanceOf(signers[0].address);
        await ibAlluoUSD.withdraw(dai.address, parseUnits("400.0", 18));
        const daiAfter = await dai.balanceOf(signers[0].address);
        const receivedDai = daiAfter.sub(daiBefore);
        // console.log("Received DAI:", formatUnits(receivedDai));

        expect(receivedDai).to.be.gt(parseUnits("399.0", 18));
    })

    it("Check withdraw (with queue)", async () => {
        await usdc.approve(ibAlluoUSD.address, constants.MaxUint256);
        await dai.approve(ibAlluoUSD.address, constants.MaxUint256);
        await ibAlluoUSD.deposit(
            usdc.address,
            parseUnits("100000.0", 6)
        ); // available for instant withdraw ~500 USD

        const daiBefore = await dai.balanceOf(signers[0].address);
        await ibAlluoUSD.withdraw(usdt.address, parseUnits("600.0", 18));
        const daiAfter = await dai.balanceOf(signers[0].address);
        const receivedDai = daiAfter.sub(daiBefore);
        // console.log("Received DAI:", formatUnits(receivedDai));

        expect(receivedDai).to.be.eq(receivedDai);

        await ibAlluoUSD.deposit(
            dai.address,
            parseUnits("200.0", 18)
        ); // available for instant withdraw ~700 USD, enough to satisfy 600 USD

        const daiBeforeSatisfied = await usdt.balanceOf(signers[0].address);
        await handler.satisfyAllWithdrawals();
        const daiAfterSatisfied = await usdt.balanceOf(signers[0].address);
        const receivedSatisfiedDai = daiAfterSatisfied.sub(daiBeforeSatisfied);
        // console.log("Received DAI after satisfyAllWithdrawals:", formatUnits(receivedSatisfiedDai, 6));

        expect(receivedSatisfiedDai).to.be.gt(parseUnits("599.0", 6));
    })

    it('Should return right user balance after one year even without claim', async function () {
        const amount = parseUnits("100.0", await ibAlluoUSD.decimals());

        await dai.approve(ibAlluoUSD.address, constants.MaxUint256)
        await ibAlluoUSD.deposit(dai.address, amount);

        await skipDays(365);

        //view function that returns balance with APY
        let balance = await ibAlluoUSD.getBalance(signers[0].address);
        expect(balance).to.be.gt(parseUnits("106.9", await ibAlluoUSD.decimals()));
        expect(balance).to.be.lt(parseUnits("107.1", await ibAlluoUSD.decimals()));
    });

    it("Should check all transferAssetValue functions ", async function () {
        await dai.approve(ibAlluoUSD.address, constants.MaxUint256)

        await ibAlluoUSD.deposit(dai.address, parseUnits("1000", 18));
        await ibAlluoUSD.transfer(signers[2].address, parseEther("100"))
        await ibAlluoUSD.transfer(signers[3].address, parseEther("100"))
        await skipDays(365);

        let totalAsset = await ibAlluoUSD.totalAssetSupply()
        expect(totalAsset).to.be.gt(parseUnits("1069", await ibAlluoUSD.decimals()));
        expect(totalAsset).to.be.lt(parseUnits("1070.1", await ibAlluoUSD.decimals()));

        await ibAlluoUSD.connect(signers[2]).transferAssetValue(signers[1].address, parseEther("106.9"))

        let tokenBalance = await ibAlluoUSD.balanceOf(signers[0].address);
        expect(tokenBalance).to.be.gt(parseUnits("799", await ibAlluoUSD.decimals()));
        expect(tokenBalance).to.be.lt(parseUnits("800", await ibAlluoUSD.decimals()));

        let valueBalance = await ibAlluoUSD.getBalance(signers[0].address)
        expect(valueBalance).to.be.gt(parseUnits("855", await ibAlluoUSD.decimals()));
        expect(valueBalance).to.be.lt(parseUnits("856", await ibAlluoUSD.decimals()));
    });

    // TODO: Some tests for superfluid
})