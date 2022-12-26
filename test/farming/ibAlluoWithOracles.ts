import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, BigNumberish } from "ethers";
import { formatEther, formatUnits, parseEther, parseUnits } from "ethers/lib/utils";
import { ethers, network, upgrades } from "hardhat";
import { BtcNoPoolAdapterUpgradeable, EthNoPoolAdapterUpgradeable, EurCurveAdapterUpgradeable, IbAlluo, ICurvePoolEUR, ICurvePoolUSD, IERC20Metadata, LiquidityHandler, PriceFeedRouterV2, UsdCurveAdapterUpgradeable } from "../../typechain";

let usdc: IERC20Metadata, usdt: IERC20Metadata, dai: IERC20Metadata, weth: IERC20Metadata,
    wbtc: IERC20Metadata, eurt: IERC20Metadata, jeur: IERC20Metadata, par: IERC20Metadata,
    eurs: IERC20Metadata;

let priceFeedRouterV2: PriceFeedRouterV2;

let signers: SignerWithAddress[];

async function forceSend(amount: BigNumberish, to: string) {
    const ForceSencer = await ethers.getContractFactory("ForceSender");
    const sender = await ForceSencer.deploy({ value: amount });
    await sender.forceSend(to);
}

async function getCoin(coin: IERC20Metadata, amount: BigNumberish, to: string) {
    const usdcWhale = await ethers.getImpersonatedSigner("0xF977814e90dA44bFA03b6295A0616a897441aceC");
    const wethWhale = await ethers.getImpersonatedSigner("0xBA12222222228d8Ba445958a75a0704d566BF2C8");
    const wbtcWhale = await ethers.getImpersonatedSigner("0x2093b4281990a568c9d588b8bce3bfd7a1557ebd");
    const eurosWhale = await ethers.getImpersonatedSigner("0xAd326c253A84e9805559b73A08724e11E49ca651");
    const exchange = await ethers.getContractAt("contracts/interfaces/IExchange.sol:IExchange", "0x6b45B9Ab699eFbb130464AcEFC23D49481a05773");

    if (coin == usdc) {
        await usdc.connect(usdcWhale).transfer(to, amount);
        return;
    }
    if (coin == weth) {
        const txGas = await weth.connect(wethWhale).estimateGas.transfer(to, amount);
        const gasPrice = await ethers.provider.getGasPrice();
        const txCost = txGas.mul(gasPrice);

        await forceSend(txCost, wethWhale.address);

        await weth.connect(wethWhale).transfer(to, amount, {
            gasPrice: gasPrice,
            gasLimit: txGas
        });
        return;
    }
    if (coin == wbtc) {
        const txGas = await wbtc.connect(wbtcWhale).estimateGas.transfer(to, amount);
        const gasPrice = await ethers.provider.getGasPrice();
        const txCost = txGas.mul(gasPrice);

        await forceSend(txCost, wbtcWhale.address);

        await wbtc.connect(wbtcWhale).transfer(to, amount, {
            gasPrice: gasPrice,
            gasLimit: txGas
        });
        return;
    }
    if (coin == jeur || coin == par || coin == eurs) {
        const txGas = await coin.connect(eurosWhale).estimateGas.transfer(to, amount);
        const gasPrice = await ethers.provider.getGasPrice();
        const txCost = txGas.mul(gasPrice);

        await forceSend(txCost, eurosWhale.address);

        await coin.connect(eurosWhale).transfer(to, amount, {
            gasPrice: gasPrice,
            gasLimit: txGas
        });
        return;
    }
    if (coin == usdt || coin == dai || coin == eurt) {
        const usdPriceQuery = await priceFeedRouterV2["getPriceOfAmount(address,uint256,uint256)"](
            coin.address,
            amount,
            0
        )
        const usdPriceExact = await priceFeedRouterV2.decimalsConverter(
            usdPriceQuery.value,
            usdPriceQuery.decimals,
            await usdc.decimals()
        )
        const usdcInput = usdPriceExact.add(usdPriceExact.div(20));

        await usdc.connect(usdcWhale).approve(exchange.address, usdcInput);
        await exchange.connect(usdcWhale).exchange(usdc.address, coin.address, usdcInput, amount);

        await coin.connect(usdcWhale).transfer(to, amount);
        return;
    }
}

async function checkIbAlluoDepositResult(
    tokenIn: IERC20Metadata,
    tokenInAmount: BigNumber,
    ibAlluoReceived: BigNumber,
    fiatId: number | undefined,
    ibAlluo: IbAlluo
) {
    const amountIn18 = parseUnits(formatUnits(tokenInAmount, await tokenIn.decimals()), await ibAlluo.decimals());
    const multiplier = parseEther("1");
    const growingRatio = await ibAlluo.growingRatio();
    let adjustedAmount = amountIn18.mul(multiplier).div(growingRatio);
    
    if (fiatId != undefined) {
        const priceInfo = await priceFeedRouterV2["getPrice(address,uint256)"](tokenIn.address, fiatId);
        console.log("Adjusted amount before:", formatEther(adjustedAmount));
        adjustedAmount = (adjustedAmount.mul(priceInfo.value)).div(parseUnits("1.0", priceInfo.decimals));
        console.log(`Price info: 1 ${await tokenIn.symbol()} costs ${formatUnits(priceInfo.value, priceInfo.decimals)} USD/EUR...`);
        console.log("Adjusted amount after:", formatEther(adjustedAmount));
        console.log("Adjusted ibAlluo mint amount according to the price of " + await tokenIn.symbol());
    }
    else {
        console.log("Adjusted ibAlluo mint amount used WITHOUT price oracles");
        console.log("Adjusted amount:", formatEther(adjustedAmount));
    }

    expect(ibAlluoReceived).to.be.equal(adjustedAmount);
    console.log("Checked ibAlluo")
}

describe("IbAlluo With Price Oracles (Integration Tests)", async () => {
    let admin: SignerWithAddress;

    let curveLpUSD: IERC20Metadata, curveLpEUR: IERC20Metadata;
    let usdLiquidityPool: ICurvePoolUSD, eurLiquidityPool: ICurvePoolEUR;

    let ibAlluoUSD: IbAlluo;
    let ibAlluoEUR: IbAlluo;
    let ibAlluoETH: IbAlluo;
    let ibAlluoBTC: IbAlluo;

    let liquidityHandler: LiquidityHandler;

    let btcAdapter: BtcNoPoolAdapterUpgradeable;
    let ethAdapter: EthNoPoolAdapterUpgradeable;
    let eurAdapter: EurCurveAdapterUpgradeable;
    let usdAdapter: UsdCurveAdapterUpgradeable;

    before(async () => {
        console.log("We are forking Polygon mainnet\n");

        usdc = await ethers.getContractAt("IERC20Metadata", "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174");
        usdt = await ethers.getContractAt("IERC20Metadata", "0xc2132D05D31c914a87C6611C10748AEb04B58e8F");
        dai = await ethers.getContractAt("IERC20Metadata", "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063");
        weth = await ethers.getContractAt("IERC20Metadata", "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619");
        wbtc = await ethers.getContractAt("IERC20Metadata", "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6");
        eurt = await ethers.getContractAt("IERC20Metadata", "0x7BDF330f423Ea880FF95fC41A280fD5eCFD3D09f");
        jeur = await ethers.getContractAt("IERC20Metadata", "0x4e3Decbb3645551B8A19f0eA1678079FCB33fB4c");
        par = await ethers.getContractAt("IERC20Metadata", "0xE2Aa7db6dA1dAE97C5f5C6914d285fBfCC32A128");
        eurs = await ethers.getContractAt("IERC20Metadata", "0xE111178A87A3BFf0c8d18DECBa5798827539Ae99");
        curveLpUSD = await ethers.getContractAt("IERC20Metadata", "0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171");
        curveLpEUR = await ethers.getContractAt("IERC20Metadata", "0xAd326c253A84e9805559b73A08724e11E49ca651");

        usdLiquidityPool = await ethers.getContractAt("contracts/interfaces/curve/ICurvePoolUSD.sol:ICurvePoolUSD", "0x445FE580eF8d70FF569aB36e80c647af338db351");
        eurLiquidityPool = await ethers.getContractAt("contracts/interfaces/curve/ICurvePoolUSD.sol:ICurvePoolUSD", "0xAd326c253A84e9805559b73A08724e11E49ca651");

        ibAlluoUSD = await ethers.getContractAt("IbAlluo", "0xC2DbaAEA2EfA47EBda3E572aa0e55B742E408BF6");
        ibAlluoEUR = await ethers.getContractAt("IbAlluo", "0xc9d8556645853C465D1D5e7d2c81A0031F0B8a92");
        ibAlluoETH = await ethers.getContractAt("IbAlluo", "0xc677B0918a96ad258A68785C2a3955428DeA7e50");
        ibAlluoBTC = await ethers.getContractAt("IbAlluo", "0xf272Ff86c86529504f0d074b210e95fc4cFCDce2");
        liquidityHandler = await ethers.getContractAt("LiquidityHandler", "0x31a3439Ac7E6Ea7e0C0E4b846F45700c6354f8c1");

        signers = await ethers.getSigners();
    })

    beforeEach(async function () {
        //We are forking Polygon mainnet, please set Alchemy key in .env
        await network.provider.request({
            method: "hardhat_reset",
            params: [{
                forking: {
                    enabled: true,
                    jsonRpcUrl: process.env.POLYGON_FORKING_URL as string,
                    //you can fork from last block by commenting next line
                    blockNumber: 37116107,
                },
            },],
        });

        admin = await ethers.getImpersonatedSigner("0x2580f9954529853Ca5aC5543cE39E9B5B1145135");

        const IbAlluo = await ethers.getContractFactory("IbAlluo");
        const LiquidityHandler = await ethers.getContractFactory("LiquidityHandler");
        const OldIbAlluoFactory = await ethers.getContractFactory("IbAlluoWithoutPriceOracles");
        const OldLiquidityHandler = await ethers.getContractFactory("LiquidityHandlerWithoutPriceOracles");

        const BtcNoPoolAdapter = await ethers.getContractFactory("BtcNoPoolAdapterUpgradeable");
        const EthNoPoolAdapter = await ethers.getContractFactory("EthNoPoolAdapterUpgradeable");
        const EurCurveAdapter = await ethers.getContractFactory("EurCurveAdapterUpgradeable");
        const UsdCurveAdapter = await ethers.getContractFactory("UsdCurveAdapterUpgradeable");

        // Step 1: set up upgrade roles and statuses for all ibAlluos
        await ibAlluoUSD.connect(admin).grantRole(
            await ibAlluoUSD.UPGRADER_ROLE(),
            signers[0].address
        );
        await ibAlluoUSD.connect(admin).changeUpgradeStatus(true);

        await ibAlluoEUR.connect(admin).grantRole(
            await ibAlluoEUR.UPGRADER_ROLE(),
            signers[0].address
        );
        await ibAlluoEUR.connect(admin).changeUpgradeStatus(true);

        await ibAlluoETH.connect(admin).grantRole(
            await ibAlluoETH.UPGRADER_ROLE(),
            signers[0].address
        );
        await ibAlluoETH.connect(admin).changeUpgradeStatus(true);

        await ibAlluoBTC.connect(admin).grantRole(
            await ibAlluoBTC.UPGRADER_ROLE(),
            signers[0].address
        );
        await ibAlluoBTC.connect(admin).changeUpgradeStatus(true);

        await liquidityHandler.connect(admin).grantRole(
            await liquidityHandler.UPGRADER_ROLE(),
            signers[0].address
        );
        await liquidityHandler.connect(admin).changeUpgradeStatus(true);

        // Step 2: execute upgrades
        await upgrades.forceImport(ibAlluoUSD.address, OldIbAlluoFactory);
        await upgrades.upgradeProxy(ibAlluoUSD.address, IbAlluo);

        await upgrades.forceImport(ibAlluoEUR.address, OldIbAlluoFactory);
        await upgrades.upgradeProxy(ibAlluoEUR.address, IbAlluo);

        await upgrades.forceImport(ibAlluoETH.address, OldIbAlluoFactory);
        await upgrades.upgradeProxy(ibAlluoETH.address, IbAlluo);

        await upgrades.forceImport(ibAlluoBTC.address, OldIbAlluoFactory);
        await upgrades.upgradeProxy(ibAlluoBTC.address, IbAlluo);

        await upgrades.forceImport(liquidityHandler.address, OldLiquidityHandler);
        await upgrades.upgradeProxy(liquidityHandler.address, LiquidityHandler);

        // Step 3: deploy upgradeable adapters
        btcAdapter = await upgrades.deployProxy(
            BtcNoPoolAdapter,
            [
                admin.address,
                liquidityHandler.address
            ],
            { initializer: "initialize", kind: "uups" }
        ) as BtcNoPoolAdapterUpgradeable;

        ethAdapter = await upgrades.deployProxy(
            EthNoPoolAdapter,
            [
                admin.address,
                liquidityHandler.address
            ],
            { initializer: "initialize", kind: "uups" }
        ) as EthNoPoolAdapterUpgradeable;

        eurAdapter = await upgrades.deployProxy(
            EurCurveAdapter,
            [
                admin.address,
                liquidityHandler.address,
                200
            ],
            { initializer: "initialize", kind: "uups" }
        ) as EurCurveAdapterUpgradeable;

        usdAdapter = await upgrades.deployProxy(
            UsdCurveAdapter,
            [
                admin.address,
                liquidityHandler.address,
                200
            ],
            { initializer: "initialize", kind: "uups" }
        ) as UsdCurveAdapterUpgradeable;

        // Step 4: call `adapterApproveAll` on USD and EUR adapters
        await usdAdapter.connect(admin).adapterApproveAll();
        await eurAdapter.connect(admin).adapterApproveAll();

        // Step 5: call `setAdapter` on handler with all adapters
        await liquidityHandler.connect(admin).setAdapter(
            1,
            "USD Curve-3pool",
            500,
            usdAdapter.address,
            true
        )

        await liquidityHandler.connect(admin).setAdapter(
            2,
            "EUR Curve-3eur",
            500,
            eurAdapter.address,
            true
        )

        await liquidityHandler.connect(admin).setAdapter(
            3,
            "ETH No Pool Adapter",
            500,
            ethAdapter.address,
            true
        )

        await liquidityHandler.connect(admin).setAdapter(
            4,
            "BTC No Pool Adapter",
            500,
            btcAdapter.address,
            true
        );

        // Step 6: set PriceFeedRouterV2
        priceFeedRouterV2 = await ethers.getContractAt("PriceFeedRouterV2", "0x82220c7Be3a00ba0C6ed38572400A97445bdAEF2");
        await ibAlluoUSD.connect(admin).setPriceRouterInfo(priceFeedRouterV2.address, 0);
        await ibAlluoEUR.connect(admin).setPriceRouterInfo(priceFeedRouterV2.address, 2);

        await usdAdapter.connect(admin).setPriceRouterInfo(priceFeedRouterV2.address, 0);
        await eurAdapter.connect(admin).setPriceRouterInfo(priceFeedRouterV2.address, 2);

        // Step 7: transfer liquidity
        const oldUsdAdapter = await ethers.getContractAt("UsdCurveAdapter", "0x6074007EC98EbeB99dF494D0855c7885A4810586");
        const oldEurAdapter = await ethers.getContractAt("EurCurveAdapter", "0xcca0f9d479f02e44a32cd2263997dd0192c5eeac");
        const oldEthAdapter = await ethers.getContractAt("BtcNoPoolAdapter", "0x57Ea02C5147b3A79b5Cc27Fd30C0D9501505bE0B");
        const oldBtcAdapter = await ethers.getContractAt("EthNoPoolAdapter", "0x141e995f27A788a52cB437F0dda3508E857b4449");

        await oldUsdAdapter.connect(admin).removeTokenByAddress(curveLpUSD.address, usdAdapter.address, await curveLpUSD.balanceOf(oldUsdAdapter.address));
        await oldEurAdapter.connect(admin).removeTokenByAddress(curveLpEUR.address, eurAdapter.address, await curveLpEUR.balanceOf(oldEurAdapter.address));
        await oldEthAdapter.connect(admin).removeTokenByAddress(weth.address, ethAdapter.address, await weth.balanceOf(oldEthAdapter.address));
        await oldBtcAdapter.connect(admin).removeTokenByAddress(wbtc.address, btcAdapter.address, await wbtc.balanceOf(oldBtcAdapter.address));
    });

    describe("Adapters",async () => {
        it("Should return USD value of USD adapter", async () => {
            const adapterAmount = await usdAdapter.getAdapterAmount();
            console.log("Reported adapter amount: ",  formatEther(adapterAmount), "USD");

            const lpUsdBalance = await curveLpUSD.balanceOf(usdAdapter.address);
            const lpToUsdc = await usdLiquidityPool.calc_withdraw_one_coin(lpUsdBalance, await usdAdapter.indexes(usdc.address));

            const usdcToUsdQuery = await priceFeedRouterV2["getPriceOfAmount(address,uint256,string)"](usdc.address, lpToUsdc, "USD");
            const usdcToUsd = await priceFeedRouterV2.decimalsConverter(usdcToUsdQuery.value, usdcToUsdQuery.decimals, 18);

            expect(usdcToUsd).to.be.equal(adapterAmount);
        });

        it("Should return EUR value of EUR adapter", async () => {
            const adapterAmount = await eurAdapter.getAdapterAmount();
            console.log("Reported adapter amount: ",  formatEther(adapterAmount), "EUR");

            const lpEurBalance = await curveLpEUR.balanceOf(eurAdapter.address);
            const lpToEurt = await eurLiquidityPool.calc_withdraw_one_coin(lpEurBalance, await eurAdapter.indexes(eurt.address));
            const lpToEurt18 = await priceFeedRouterV2.decimalsConverter(lpToEurt, await eurt.decimals(), 18);

            const oneEurtToEurQuery = await priceFeedRouterV2["getPrice(address,string)"](eurt.address, "EUR");
            const oneEurtToEur = await priceFeedRouterV2.decimalsConverter(oneEurtToEurQuery.value, oneEurtToEurQuery.decimals, 18);

            const eurtToEur = lpToEurt18.mul(oneEurtToEur).div(parseEther("1.0"));

            expect(eurtToEur).to.be.equal(adapterAmount);
        });

        it("Should return ETH value of WETH adapter", async () => {
            const adapterAmount = await ethAdapter.getAdapterAmount();
            console.log("Reported adapter amount: ",  formatEther(adapterAmount), "ETH");

            expect(adapterAmount).to.be.equal(await weth.balanceOf(ethAdapter.address));
        });

        it("Should return BTC value of WBTC adapter", async () => {
            const adapterAmount = await btcAdapter.getAdapterAmount();
            console.log("Reported adapter amount: ",  formatEther(adapterAmount), "BTC");

            expect(adapterAmount).to.be.equal((await wbtc.balanceOf(btcAdapter.address)).mul("10000000000"));
        });
    })

    describe("USD", async () => {
        it("Should deposit USDC", async () => {
            const depositor = signers[0];
            const amountUsdc = parseUnits("15.0", await usdc.decimals());
            const amount = "10.0";
            const amountUsd = parseUnits(amount, await usdc.decimals());
            expect(await ibAlluoUSD.balanceOf(depositor.address)).to.be.equal(0);

            await getCoin(usdc, amountUsdc, depositor.address);
            await usdc.connect(depositor).approve(ibAlluoUSD.address, amountUsdc);

            const ibAlluoBalanceBefore = await ibAlluoUSD.balanceOf(depositor.address);
            await ibAlluoUSD.connect(depositor).deposit(usdc.address, amountUsd);
            const ibAlluoBalanceAfter = await ibAlluoUSD.balanceOf(depositor.address);
            console.log(`Received ${formatEther(ibAlluoBalanceAfter.sub(ibAlluoBalanceBefore))} ibAlluoUSD when deposited ${amount} USDC`);

            await checkIbAlluoDepositResult(usdc, amountUsd, ibAlluoBalanceAfter.sub(ibAlluoBalanceBefore), 0, ibAlluoUSD);
        });
        it("Should deposit USDT", async () => {
            const depositor = signers[0];
            const amountUsdt = parseUnits("15.0", await usdt.decimals());
            const amount = "10.0";
            const amountUsd = parseUnits(amount, await usdt.decimals());
            expect(await ibAlluoUSD.balanceOf(depositor.address)).to.be.equal(0);

            await getCoin(usdt, amountUsdt, depositor.address);
            await usdt.connect(depositor).approve(ibAlluoUSD.address, amountUsdt);

            const ibAlluoBalanceBefore = await ibAlluoUSD.balanceOf(depositor.address);
            await ibAlluoUSD.connect(depositor).deposit(usdt.address, amountUsd);
            const ibAlluoBalanceAfter = await ibAlluoUSD.balanceOf(depositor.address);
            console.log(`Received ${formatEther(ibAlluoBalanceAfter.sub(ibAlluoBalanceBefore))} ibAlluoUSD when deposited ${amount} USDT`)

            await checkIbAlluoDepositResult(usdt, amountUsd, ibAlluoBalanceAfter.sub(ibAlluoBalanceBefore), 0, ibAlluoUSD);
        });
        it("Should deposit DAI", async () => {
            const depositor = signers[0];
            const amountDai = parseUnits("15.0", await dai.decimals());
            const amount = "10.0";
            const amountUsd = parseUnits(amount, await dai.decimals());
            expect(await ibAlluoUSD.balanceOf(depositor.address)).to.be.equal(0);

            await getCoin(dai, amountDai, depositor.address);
            await dai.connect(depositor).approve(ibAlluoUSD.address, amountDai);

            const ibAlluoBalanceBefore = await ibAlluoUSD.balanceOf(depositor.address);
            await ibAlluoUSD.connect(depositor).deposit(dai.address, amountUsd);
            const ibAlluoBalanceAfter = await ibAlluoUSD.balanceOf(depositor.address);
            console.log(`Received ${formatEther(ibAlluoBalanceAfter.sub(ibAlluoBalanceBefore))} ibAlluoUSD when deposited ${amount} DAI`)

            await checkIbAlluoDepositResult(dai, amountUsd, ibAlluoBalanceAfter.sub(ibAlluoBalanceBefore), 0, ibAlluoUSD);
        });

        it("Should withdraw USDC", async () => {
            const depositor = signers[0];
            const deposit = "10.0";
            const amountUsd = parseUnits(deposit, await usdc.decimals());
            const amountUsdc = parseUnits("15.0", await usdc.decimals());
            const withdraw = "10.0";
            const withdrawAmount = parseUnits(withdraw, await ibAlluoUSD.decimals());
            expect(await ibAlluoUSD.balanceOf(depositor.address)).to.be.equal(0);

            await getCoin(usdc, amountUsdc, depositor.address);
            await usdc.connect(depositor).approve(ibAlluoUSD.address, amountUsdc);
            await ibAlluoUSD.connect(depositor).deposit(usdc.address, amountUsd);

            const balanceBefore = await usdc.balanceOf(depositor.address);
            await ibAlluoUSD.connect(depositor).withdrawTo(depositor.address, usdc.address, withdrawAmount);
            const balanceAfter = await usdc.balanceOf(depositor.address);
            console.log(`Received ${formatUnits(balanceAfter.sub(balanceBefore), await usdc.decimals())} USDC when requested ${withdraw} USD`)
        });
        it("Should withdraw USDT", async () => {
            const depositor = signers[0];
            const deposit = "10.0";
            const amountUsd = parseUnits(deposit, await usdt.decimals());
            const amountUsdt = parseUnits("15.0", await usdt.decimals());
            const withdraw = "10.0";
            const withdrawAmount = parseUnits(withdraw, await ibAlluoUSD.decimals());
            expect(await ibAlluoUSD.balanceOf(depositor.address)).to.be.equal(0);

            await getCoin(usdt, amountUsdt, depositor.address);
            await usdt.connect(depositor).approve(ibAlluoUSD.address, amountUsdt);
            await ibAlluoUSD.connect(depositor).deposit(usdt.address, amountUsd);

            const balanceBefore = await usdt.balanceOf(depositor.address);
            await ibAlluoUSD.connect(depositor).withdrawTo(depositor.address, usdt.address, withdrawAmount);
            const balanceAfter = await usdt.balanceOf(depositor.address);
            console.log(`Received ${formatUnits(balanceAfter.sub(balanceBefore), await usdt.decimals())} USDT when requested ${withdraw} USD`)
        });
        it("Should withdraw DAI", async () => {
            const depositor = signers[0];
            const deposit = "10.001";
            const amountUsd = parseUnits(deposit, await dai.decimals());
            const amountDai = parseUnits("15.0", await dai.decimals());
            const withdraw = "10.0";
            const withdrawAmount = parseUnits(withdraw, await ibAlluoUSD.decimals());
            expect(await ibAlluoUSD.balanceOf(depositor.address)).to.be.equal(0);

            await getCoin(dai, amountDai, depositor.address);
            await dai.connect(depositor).approve(ibAlluoUSD.address, amountDai);
            await ibAlluoUSD.connect(depositor).deposit(dai.address, amountUsd);

            const balanceBefore = await dai.balanceOf(depositor.address);
            await ibAlluoUSD.connect(depositor).withdrawTo(depositor.address, dai.address, withdrawAmount);
            const balanceAfter = await dai.balanceOf(depositor.address);
            console.log(`Received ${formatUnits(balanceAfter.sub(balanceBefore), await dai.decimals())} DAI when requested ${withdraw} USD`)
        });
    });

    describe("EUR", async () => {
        it("Should deposit EURT", async () => {
            const depositor = signers[0];
            const amountEurt = parseUnits("15.0", await eurt.decimals());
            const amount = "10.0";
            const amountUsd = parseUnits(amount, await eurt.decimals());
            expect(await ibAlluoEUR.balanceOf(depositor.address)).to.be.equal(0);

            await getCoin(eurt, amountEurt, depositor.address);
            await eurt.connect(depositor).approve(ibAlluoEUR.address, amountEurt);

            const ibAlluoBalanceBefore = await ibAlluoEUR.balanceOf(depositor.address);
            await ibAlluoEUR.connect(depositor).deposit(eurt.address, amountUsd);
            const ibAlluoBalanceAfter = await ibAlluoEUR.balanceOf(depositor.address);
            console.log(`Received ${formatEther(ibAlluoBalanceAfter.sub(ibAlluoBalanceBefore))} ibAlluoEUR when deposited ${amount} EURT`)

            await checkIbAlluoDepositResult(eurt, amountUsd, ibAlluoBalanceAfter.sub(ibAlluoBalanceBefore), 2, ibAlluoEUR);    
        });
        it("Should deposit jEUR", async () => {
            const depositor = signers[0];
            const amountJeur = parseUnits("15.0", await jeur.decimals());
            const amount = "10.0";
            const amountEur = parseUnits(amount, await jeur.decimals());
            expect(await ibAlluoEUR.balanceOf(depositor.address)).to.be.equal(0);

            await getCoin(jeur, amountJeur, depositor.address);
            await jeur.connect(depositor).approve(ibAlluoEUR.address, amountEur);

            const ibAlluoBalanceBefore = await ibAlluoEUR.balanceOf(depositor.address);
            await ibAlluoEUR.connect(depositor).deposit(jeur.address, amountEur);
            const ibAlluoBalanceAfter = await ibAlluoEUR.balanceOf(depositor.address);
            console.log(`Received ${formatEther(ibAlluoBalanceAfter.sub(ibAlluoBalanceBefore))} ibAlluoEUR when deposited ${amount} jEUR`)

            await checkIbAlluoDepositResult(jeur, amountEur, ibAlluoBalanceAfter.sub(ibAlluoBalanceBefore), 2, ibAlluoEUR);    
        });
        it("Should deposit PAR", async () => {
            const depositor = signers[0];
            const amountPar = parseUnits("15.0", await par.decimals());
            const amount = "10.0";
            const amountEur = parseUnits(amount, await par.decimals());
            expect(await ibAlluoEUR.balanceOf(depositor.address)).to.be.equal(0);

            await getCoin(par, amountPar, depositor.address);
            await par.connect(depositor).approve(ibAlluoEUR.address, amountEur);

            const ibAlluoBalanceBefore = await ibAlluoEUR.balanceOf(depositor.address);
            await ibAlluoEUR.connect(depositor).deposit(par.address, amountEur);
            const ibAlluoBalanceAfter = await ibAlluoEUR.balanceOf(depositor.address);
            console.log(`Received ${formatEther(ibAlluoBalanceAfter.sub(ibAlluoBalanceBefore))} ibAlluoEUR when deposited ${amount} PAR`)

            await checkIbAlluoDepositResult(par, amountEur, ibAlluoBalanceAfter.sub(ibAlluoBalanceBefore), 2, ibAlluoEUR);    
        });
        it("Should deposit EURS", async () => {
            const depositor = signers[0];
            const amountEurs = parseUnits("15.0", await eurs.decimals());
            const amount = "10.0";
            const amountEur = parseUnits(amount, await eurs.decimals());
            expect(await ibAlluoEUR.balanceOf(depositor.address)).to.be.equal(0);

            await getCoin(eurs, amountEurs, depositor.address);
            await eurs.connect(depositor).approve(ibAlluoEUR.address, amountEur);

            const ibAlluoBalanceBefore = await ibAlluoEUR.balanceOf(depositor.address);
            await ibAlluoEUR.connect(depositor).deposit(eurs.address, amountEur);
            const ibAlluoBalanceAfter = await ibAlluoEUR.balanceOf(depositor.address);
            console.log(`Received ${formatEther(ibAlluoBalanceAfter.sub(ibAlluoBalanceBefore))} ibAlluoEUR when deposited ${amount} EURS`)

            await checkIbAlluoDepositResult(eurs, amountEur, ibAlluoBalanceAfter.sub(ibAlluoBalanceBefore), 2, ibAlluoEUR);    
        });

        it("Should withdraw EURT", async () => {
            const depositor = signers[0];
            const deposit = "10.04";
            const amountEur = parseUnits(deposit, await eurt.decimals());
            const amountEurt = parseUnits("15.0", await eurt.decimals());
            const withdraw = "10.0";
            const withdrawAmount = parseUnits(withdraw, await ibAlluoEUR.decimals());
            expect(await ibAlluoEUR.balanceOf(depositor.address)).to.be.equal(0);

            await getCoin(eurt, amountEurt, depositor.address);
            await eurt.connect(depositor).approve(ibAlluoEUR.address, amountEurt);
            await ibAlluoEUR.connect(depositor).deposit(eurt.address, amountEur);

            const balanceBefore = await eurt.balanceOf(depositor.address);
            await ibAlluoEUR.connect(depositor).withdrawTo(depositor.address, eurt.address, withdrawAmount);
            const balanceAfter = await eurt.balanceOf(depositor.address);
            console.log(`Received ${formatUnits(balanceAfter.sub(balanceBefore), await eurt.decimals())} EURT when requested ${withdraw} EUR`)
        });
        it("Should withdraw jEUR", async () => {
            const depositor = signers[0];
            const deposit = "10.0";
            const amountEur = parseUnits(deposit, await jeur.decimals());
            const amountJeur = parseUnits("15.0", await jeur.decimals());
            const withdraw = "10.0";
            const withdrawAmount = parseUnits(withdraw, await ibAlluoEUR.decimals());
            expect(await ibAlluoEUR.balanceOf(depositor.address)).to.be.equal(0);

            await getCoin(jeur, amountJeur, depositor.address);
            await jeur.connect(depositor).approve(ibAlluoEUR.address, amountJeur);
            await ibAlluoEUR.connect(depositor).deposit(jeur.address, amountEur);

            const balanceBefore = await jeur.balanceOf(depositor.address);
            await ibAlluoEUR.connect(depositor).withdrawTo(depositor.address, jeur.address, withdrawAmount);
            const balanceAfter = await jeur.balanceOf(depositor.address);
            console.log(`Received ${formatUnits(balanceAfter.sub(balanceBefore), await jeur.decimals())} jEUR when requested ${withdraw} EUR`);
        });
        it("Should withdraw PAR", async () => {
            const depositor = signers[0];
            const deposit = "10.1";
            const amountEur = parseUnits(deposit, await par.decimals());
            const amountPar = parseUnits("15.0", await par.decimals());
            const withdraw = "10.0";
            const withdrawAmount = parseUnits(withdraw, await ibAlluoEUR.decimals());
            expect(await ibAlluoEUR.balanceOf(depositor.address)).to.be.equal(0);

            await getCoin(par, amountPar, depositor.address);
            await par.connect(depositor).approve(ibAlluoEUR.address, amountPar);
            await ibAlluoEUR.connect(depositor).deposit(par.address, amountEur);

            const balanceBefore = await par.balanceOf(depositor.address);
            await ibAlluoEUR.connect(depositor).withdrawTo(depositor.address, par.address, withdrawAmount);
            const balanceAfter = await par.balanceOf(depositor.address);
            console.log(`Received ${formatUnits(balanceAfter.sub(balanceBefore), await par.decimals())} PAR when requested ${withdraw} EUR`);
        });
        it("Should withdraw EURS", async () => {
            const depositor = signers[0];
            const deposit = "10.0";
            const amountEur = parseUnits(deposit, await eurs.decimals());
            const amountEurs = parseUnits("15.0", await eurs.decimals());
            const withdraw = "10.0";
            const withdrawAmount = parseUnits(withdraw, await ibAlluoEUR.decimals());
            expect(await ibAlluoEUR.balanceOf(depositor.address)).to.be.equal(0);

            await getCoin(eurs, amountEurs, depositor.address);
            await eurs.connect(depositor).approve(ibAlluoEUR.address, amountEurs);
            await ibAlluoEUR.connect(depositor).deposit(eurs.address, amountEur);

            const balanceBefore = await eurs.balanceOf(depositor.address);
            await ibAlluoEUR.connect(depositor).withdrawTo(depositor.address, eurs.address, withdrawAmount);
            const balanceAfter = await eurs.balanceOf(depositor.address);
            console.log(`Received ${formatUnits(balanceAfter.sub(balanceBefore), await eurs.decimals())} PAR when requested ${withdraw} EUR`);
        });
    });

    describe("ETH", async () => {
        it("Should deposit WETH", async () => {
            const depositor = signers[0];
            const amountWeth = parseUnits("1.0", await weth.decimals());
            const amount = "1.0";
            const amountEth = parseUnits(amount, await weth.decimals());
            expect(await ibAlluoETH.balanceOf(depositor.address)).to.be.equal(0);

            await getCoin(weth, amountWeth, depositor.address);
            await weth.connect(depositor).approve(ibAlluoETH.address, amountWeth);

            const ibAlluoBalanceBefore = await ibAlluoETH.balanceOf(depositor.address);
            await ibAlluoETH.connect(depositor).deposit(weth.address, amountEth);
            const ibAlluoBalanceAfter = await ibAlluoETH.balanceOf(depositor.address);
            console.log(`Received ${formatEther(ibAlluoBalanceAfter.sub(ibAlluoBalanceBefore))} ibAlluoETH when deposited ${amount} WETH`);

            await checkIbAlluoDepositResult(weth, amountEth, ibAlluoBalanceAfter.sub(ibAlluoBalanceBefore), undefined, ibAlluoETH);    
        });

        it("Should withdraw WETH", async () => {
            const depositor = signers[0];
            const deposit = "1.0";
            const amountEth = parseUnits(deposit, await weth.decimals());
            const withdraw = "1.0";
            const withdrawAmount = parseUnits(withdraw, await ibAlluoETH.decimals());
            expect(await ibAlluoETH.balanceOf(depositor.address)).to.be.equal(0);

            await getCoin(weth, amountEth, depositor.address);
            await weth.connect(depositor).approve(ibAlluoETH.address, amountEth);
            await ibAlluoETH.connect(depositor).deposit(weth.address, amountEth);

            const balanceBefore = await weth.balanceOf(depositor.address);
            await ibAlluoETH.connect(depositor).withdrawTo(depositor.address, weth.address, withdrawAmount);
            const balanceAfter = await weth.balanceOf(depositor.address);
            console.log(`Received ${formatUnits(balanceAfter.sub(balanceBefore), await weth.decimals())} WETH when requested ${withdraw} WETH`)
        });
    });

    describe("BTC", async () => {
        it("Should deposit WBTC", async () => {
            const depositor = signers[0];
            const amountWbtc = parseUnits("0.01", await wbtc.decimals());
            const amount = "0.01";
            const amountBtc = parseUnits(amount, await wbtc.decimals());
            expect(await ibAlluoBTC.balanceOf(depositor.address)).to.be.equal(0);

            await getCoin(wbtc, amountWbtc, depositor.address);
            await wbtc.connect(depositor).approve(ibAlluoBTC.address, amountWbtc);

            const ibAlluoBalanceBefore = await ibAlluoBTC.balanceOf(depositor.address);
            await ibAlluoBTC.connect(depositor).deposit(wbtc.address, amountBtc);
            const ibAlluoBalanceAfter = await ibAlluoBTC.balanceOf(depositor.address);
            console.log(`Received ${formatEther(ibAlluoBalanceAfter.sub(ibAlluoBalanceBefore))} ibAlluoBTC when deposited ${amount} WBTC`);

            await checkIbAlluoDepositResult(wbtc, amountBtc, ibAlluoBalanceAfter.sub(ibAlluoBalanceBefore), undefined, ibAlluoBTC);    
        });

        it("Should withdraw WBTC", async () => {
            const depositor = signers[0];
            const deposit = "0.01";
            const amountBtc = parseUnits(deposit, await wbtc.decimals());
            const withdraw = "0.01";
            const withdrawAmount = parseUnits(withdraw, await ibAlluoBTC.decimals());
            expect(await ibAlluoBTC.balanceOf(depositor.address)).to.be.equal(0);

            await getCoin(wbtc, amountBtc, depositor.address);
            await wbtc.connect(depositor).approve(ibAlluoBTC.address, amountBtc);
            await ibAlluoBTC.connect(depositor).deposit(wbtc.address, amountBtc);

            const balanceBefore = await wbtc.balanceOf(depositor.address);
            await ibAlluoBTC.connect(depositor).withdrawTo(depositor.address, wbtc.address, withdrawAmount);
            const balanceAfter = await wbtc.balanceOf(depositor.address);
            console.log(`Received ${formatUnits(balanceAfter.sub(balanceBefore), await wbtc.decimals())} WBTC when requested ${withdraw} WBTC`)
        });
    });
})