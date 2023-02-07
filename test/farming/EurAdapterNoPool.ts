import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, BigNumberish } from "ethers";
import { formatEther, formatUnits, parseEther, parseUnits } from "ethers/lib/utils";
import { ethers, network, upgrades } from "hardhat";
import { BufferManager, EurNoPoolAdapterUpgradeable, IbAlluo, IERC20Metadata, LiquidityHandler, PriceFeedRouterV2 } from "../../typechain";

let agEur: IERC20Metadata;

let priceFeedRouterV2: PriceFeedRouterV2;

let signers: SignerWithAddress[];

async function forceSend(amount: BigNumberish, to: string) {
    const ForceSencer = await ethers.getContractFactory("ForceSender");
    const sender = await ForceSencer.deploy({ value: amount });
    await sender.forceSend(to);
}

async function getCoin(coin: IERC20Metadata, amount: BigNumberish, to: string) {
    const agEurWhale = await ethers.getImpersonatedSigner("0x2fa375961a0cb525db0f00af4e081a806a8639fd");

    if (coin == agEur) {
        const txGas = await agEur.connect(agEurWhale).estimateGas.transfer(to, amount);
        const gasPrice = await ethers.provider.getGasPrice();
        const txCost = txGas.mul(gasPrice);

        await forceSend(txCost, agEurWhale.address);

        await agEur.connect(agEurWhale).transfer(to, amount, {
            gasPrice: gasPrice,
            gasLimit: txGas
        });
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

describe("Euro No Pool Upgradeable Adapter for ibAlluo with Price Oracles", async () => {
    let admin: SignerWithAddress;

    let ibAlluoEUR: IbAlluo;

    let liquidityHandler: LiquidityHandler;
    let buffer: BufferManager;

    let eurAdapter: EurNoPoolAdapterUpgradeable;

    before(async () => {
        console.log("We are forking Polygon mainnet\n");

        agEur = await ethers.getContractAt("IERC20Metadata", "0xE0B52e49357Fd4DAf2c15e02058DCE6BC0057db4");

        ibAlluoEUR = await ethers.getContractAt("IbAlluo", "0xc9d8556645853C465D1D5e7d2c81A0031F0B8a92");
        liquidityHandler = await ethers.getContractAt("LiquidityHandler", "0x31a3439Ac7E6Ea7e0C0E4b846F45700c6354f8c1");
        buffer = await ethers.getContractAt("BufferManager", "0x466b375cE0D1161aEb3e69f92B2B9c365f7877BE");

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
                    blockNumber: 39030479,
                },
            },],
        });

        admin = await ethers.getImpersonatedSigner("0x2580f9954529853Ca5aC5543cE39E9B5B1145135");

        const EurNoPoolAdapter = await ethers.getContractFactory("EurNoPoolAdapterUpgradeable");
        // Step 1: deploy upgradeable adapter

        eurAdapter = await upgrades.deployProxy(
            EurNoPoolAdapter,
            [
                admin.address,
                liquidityHandler.address,
                liquidityHandler.address,
            ],
            { initializer: "initialize", kind: "uups" }
        ) as EurNoPoolAdapterUpgradeable;

        // Step 2: enable only agEUR deposits into ibAlluoEUR
        const tokens = await ibAlluoEUR.getListSupportedTokens();
        for (let i = 0; i < tokens.length; i++) {
            const element = tokens[i];
            await ibAlluoEUR.connect(admin).changeTokenStatus(element, false);
        }
        await ibAlluoEUR.connect(admin).changeTokenStatus(agEur.address, true);

        // Step 3: call `setAdapter` on handler with new adapter

        await liquidityHandler.connect(admin).setAdapter(
            2,
            "EUR No Pool agEUR adapter",
            500,
            eurAdapter.address,
            true
        )

        // Step 4: set PriceFeedRouterV2
        priceFeedRouterV2 = await ethers.getContractAt("PriceFeedRouterV2", "0x82220c7Be3a00ba0C6ed38572400A97445bdAEF2");
        await ibAlluoEUR.connect(admin).setPriceRouterInfo(priceFeedRouterV2.address, 2);
        await eurAdapter.connect(admin).setPriceRouterInfo(priceFeedRouterV2.address, 2);

        // Step 5: transfer liquidity
        const oldEurAdapter = await ethers.getContractAt("EurCurveAdapterUpgradeable", "0x0FB24CdF6Da7e7AB47eEF2389E2Dd7b9fbcAaa58");
        const amount = await oldEurAdapter.getAdapterAmount();

        await getCoin(agEur, amount, eurAdapter.address);
    });

    describe("Adapters",async () => {
        it("Should return EUR value of EUR adapter", async () => {
            const adapterAmount = await eurAdapter.getAdapterAmount();
            console.log("Reported adapter amount: ",  formatEther(adapterAmount), "EUR");
            const agEurPrice = await priceFeedRouterV2["getPrice(address,string)"](agEur.address, "EUR");
            console.log("agEUR price:", formatUnits(agEurPrice.value, agEurPrice.decimals));

            const agEurBalance = await agEur.balanceOf(eurAdapter.address);
            console.log("agEUR balance:", formatEther(agEurBalance))

            const agEurToEurQuery = await priceFeedRouterV2["getPriceOfAmount(address,uint256,string)"](agEur.address, agEurBalance, "EUR");
            const agEur18 = await priceFeedRouterV2.decimalsConverter(agEurToEurQuery.value, agEurToEurQuery.decimals, 18);

            expect(agEur18).to.be.equal(adapterAmount);
        });
    })

    describe("EUR", async () => {
        it("Should deposit agEUR", async () => {
            const depositor = signers[0];
            const amountAgEur = parseUnits("15.0", await agEur.decimals());
            const amount = "10.0";
            const amountUsd = parseUnits(amount, await agEur.decimals());
            expect(await ibAlluoEUR.balanceOf(depositor.address)).to.be.equal(0);

            await getCoin(agEur, amountAgEur, depositor.address);
            await agEur.connect(depositor).approve(ibAlluoEUR.address, amountAgEur);

            const ibAlluoBalanceBefore = await ibAlluoEUR.balanceOf(depositor.address);
            const adapterBalanceBefore = await agEur.balanceOf(eurAdapter.address);
            await ibAlluoEUR.connect(depositor).deposit(agEur.address, amountUsd);
            const ibAlluoBalanceAfter = await ibAlluoEUR.balanceOf(depositor.address);
            const adapterBalanceAfter = await agEur.balanceOf(eurAdapter.address);

            console.log(`User received ${formatEther(ibAlluoBalanceAfter.sub(ibAlluoBalanceBefore))} ibAlluoEUR when deposited ${amount} agEUR`)
            console.log(`Adapter received ${formatEther(adapterBalanceAfter.sub(adapterBalanceBefore))} agEUR when deposited ${amount} agEUR`)

            await checkIbAlluoDepositResult(agEur, amountUsd, ibAlluoBalanceAfter.sub(ibAlluoBalanceBefore), 2, ibAlluoEUR);    
        });

        it("Should deposit big amount of agEUR", async () => {
            const depositor = signers[0];
            const amountAgEur = parseUnits("150000.0", await agEur.decimals());
            const amount = "100000.0";
            const amountUsd = parseUnits(amount, await agEur.decimals());
            expect(await ibAlluoEUR.balanceOf(depositor.address)).to.be.equal(0);

            await getCoin(agEur, amountAgEur, depositor.address);
            await agEur.connect(depositor).approve(ibAlluoEUR.address, amountAgEur);

            const ibAlluoBalanceBefore = await ibAlluoEUR.balanceOf(depositor.address);
            const adapterBalanceBefore = await agEur.balanceOf(eurAdapter.address);
            await ibAlluoEUR.connect(depositor).deposit(agEur.address, amountUsd);
            const ibAlluoBalanceAfter = await ibAlluoEUR.balanceOf(depositor.address);
            const adapterBalanceAfter = await agEur.balanceOf(eurAdapter.address);

            console.log(`User received ${formatEther(ibAlluoBalanceAfter.sub(ibAlluoBalanceBefore))} ibAlluoEUR when deposited ${amount} agEUR`)
            console.log(`Adapter received ${formatEther(adapterBalanceAfter.sub(adapterBalanceBefore))} agEUR when deposited ${amount} agEUR`)

            await checkIbAlluoDepositResult(agEur, amountUsd, ibAlluoBalanceAfter.sub(ibAlluoBalanceBefore), 2, ibAlluoEUR);    
        });

        it("Should withdraw EURT", async () => {
            const depositor = signers[0];
            const deposit = "10.04";
            const amountEur = parseUnits(deposit, await agEur.decimals());
            const amountAgEur = parseUnits("15.0", await agEur.decimals());
            const withdraw = "10.0";
            const withdrawAmount = parseUnits(withdraw, await ibAlluoEUR.decimals());
            expect(await ibAlluoEUR.balanceOf(depositor.address)).to.be.equal(0);

            await getCoin(agEur, amountAgEur, depositor.address);
            await agEur.connect(depositor).approve(ibAlluoEUR.address, amountAgEur);
            await ibAlluoEUR.connect(depositor).deposit(agEur.address, amountEur);

            const balanceBefore = await agEur.balanceOf(depositor.address);
            const adapterBalanceBefore = await agEur.balanceOf(eurAdapter.address);
            await ibAlluoEUR.connect(depositor).withdrawTo(depositor.address, agEur.address, withdrawAmount);
            const balanceAfter = await agEur.balanceOf(depositor.address);
            const adapterBalanceAfter = await agEur.balanceOf(eurAdapter.address);

            console.log(`User received ${formatUnits(balanceAfter.sub(balanceBefore), await agEur.decimals())} agEUR when requested ${withdraw} EUR`)
            console.log(`Adapter sent ${formatEther(adapterBalanceBefore.sub(adapterBalanceAfter))} agEUR when ${withdraw} EUR withdraw requested`);

        });
    });
})