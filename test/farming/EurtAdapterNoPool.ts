import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, BigNumberish, constants } from "ethers";
import { formatEther, formatUnits, parseEther, parseUnits } from "ethers/lib/utils";
import { ethers, network, upgrades } from "hardhat";
import { BufferManager, EurtNoPoolAdapterUpgradeable, IbAlluo, IERC20Metadata, LiquidityHandler, PriceFeedRouterV2 } from "../../typechain";

let eurt: IERC20Metadata;

let priceFeedRouterV2: PriceFeedRouterV2;

let signers: SignerWithAddress[];

async function forceSend(amount: BigNumberish, to: string) {
    const ForceSencer = await ethers.getContractFactory("ForceSender");
    const sender = await ForceSencer.deploy({ value: amount });
    await sender.forceSend(to);
}

async function getCoin(coin: IERC20Metadata, amount: BigNumberish, to: string) {
    const agEurWhale = await ethers.getImpersonatedSigner("0xb446bf7b8d6d4276d0c75ec0e3ee8dd7fe15783a");

    if (coin == eurt) {
        const txGas = await eurt.connect(agEurWhale).estimateGas.transfer(to, amount);
        const gasPrice = await ethers.provider.getGasPrice();
        const txCost = txGas.mul(gasPrice);

        await forceSend(txCost, agEurWhale.address);

        await eurt.connect(agEurWhale).transfer(to, amount, {
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

    let eurAdapter: EurtNoPoolAdapterUpgradeable;

    before(async () => {
        console.log("We are forking Polygon mainnet\n");

        eurt = await ethers.getContractAt("IERC20Metadata", "0x7BDF330f423Ea880FF95fC41A280fD5eCFD3D09f");

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
                    blockNumber: 40370956,
                },
            },],
        });

        admin = await ethers.getImpersonatedSigner("0x2580f9954529853Ca5aC5543cE39E9B5B1145135");

        const EurNoPoolAdapter = await ethers.getContractFactory("EurtNoPoolAdapterUpgradeable");
        // Step 1: deploy upgradeable adapter

        eurAdapter = await upgrades.deployProxy(
            EurNoPoolAdapter,
            [
                admin.address,
                liquidityHandler.address,
                liquidityHandler.address,
            ],
            { initializer: "initialize", kind: "uups" }
        ) as EurtNoPoolAdapterUpgradeable;

        // Step 2: enable only EURT deposits into ibAlluoEUR
        const tokens = await ibAlluoEUR.getListSupportedTokens();
        for (let i = 0; i < tokens.length; i++) {
            const element = tokens[i];
            await ibAlluoEUR.connect(admin).changeTokenStatus(element, false);
        }
        await ibAlluoEUR.connect(admin).changeTokenStatus(eurt.address, true);

        // Step 3: call `setAdapter` on handler with new adapter

        await liquidityHandler.connect(admin).setAdapter(
            2,
            "EUR No Pool EURT adapter",
            500,
            eurAdapter.address,
            true
        )

        // Step 4: set PriceFeedRouterV2
        priceFeedRouterV2 = await ethers.getContractAt("PriceFeedRouterV2", "0x82220c7Be3a00ba0C6ed38572400A97445bdAEF2");
        await ibAlluoEUR.connect(admin).setPriceRouterInfo(constants.AddressZero, 0);


        // Step 5: transfer liquidity
        const amount = parseUnits("0.981", 6);
        await getCoin(eurt, amount, eurAdapter.address);
    });

    describe("Adapters",async () => {
        it("Should return EUR value of EUR adapter", async () => {
            const adapterAmount = await eurAdapter.getAdapterAmount();
            console.log("Reported adapter amount: ",  formatUnits(adapterAmount, 18), "EUR");

            const eurtBalance = await eurt.balanceOf(eurAdapter.address);
            console.log("EURT balance:", formatUnits(eurtBalance, 6))

            const agEur18 = await priceFeedRouterV2.decimalsConverter(eurtBalance, await eurt.decimals(), 18);

            expect(agEur18).to.be.equal(adapterAmount);
        });
    })

    describe("EUR", async () => {
        it("Should deposit EURT", async () => {
            const depositor = signers[0];
            const amountAgEur = parseUnits("15.0", await eurt.decimals());
            const amount = "10.0";
            const amountUsd = parseUnits(amount, await eurt.decimals());
            expect(await ibAlluoEUR.balanceOf(depositor.address)).to.be.equal(0);

            await getCoin(eurt, amountAgEur, depositor.address);
            await eurt.connect(depositor).approve(ibAlluoEUR.address, amountAgEur);

            const ibAlluoBalanceBefore = await ibAlluoEUR.balanceOf(depositor.address);
            const adapterBalanceBefore = await eurt.balanceOf(eurAdapter.address);
            await ibAlluoEUR.connect(depositor).deposit(eurt.address, amountUsd);
            const ibAlluoBalanceAfter = await ibAlluoEUR.balanceOf(depositor.address);
            const adapterBalanceAfter = await eurt.balanceOf(eurAdapter.address);

            console.log(`User received ${formatUnits(ibAlluoBalanceAfter.sub(ibAlluoBalanceBefore), 18)} ibAlluoEUR when deposited ${amount} EURT`)
            console.log(`Adapter received ${formatUnits(adapterBalanceAfter.sub(adapterBalanceBefore), 6)} EURT when deposited ${amount} EURT`)

            await checkIbAlluoDepositResult(eurt, amountUsd, ibAlluoBalanceAfter.sub(ibAlluoBalanceBefore), undefined, ibAlluoEUR);    
        });

        it("Should deposit big amount of EURT", async () => {
            const depositor = signers[0];
            const amountAgEur = parseUnits("150000.0", await eurt.decimals());
            const amount = "100000.0";
            const amountUsd = parseUnits(amount, await eurt.decimals());
            expect(await ibAlluoEUR.balanceOf(depositor.address)).to.be.equal(0);

            await getCoin(eurt, amountAgEur, depositor.address);
            await eurt.connect(depositor).approve(ibAlluoEUR.address, amountAgEur);

            const ibAlluoBalanceBefore = await ibAlluoEUR.balanceOf(depositor.address);
            const adapterBalanceBefore = await eurt.balanceOf(eurAdapter.address);
            await ibAlluoEUR.connect(depositor).deposit(eurt.address, amountUsd);
            const ibAlluoBalanceAfter = await ibAlluoEUR.balanceOf(depositor.address);
            const adapterBalanceAfter = await eurt.balanceOf(eurAdapter.address);

            console.log(`User received ${formatUnits(ibAlluoBalanceAfter.sub(ibAlluoBalanceBefore), 18)} ibAlluoEUR when deposited ${amount} EURT`)
            console.log(`Adapter received ${formatUnits(adapterBalanceAfter.sub(adapterBalanceBefore), 6)} EURT when deposited ${amount} EURT`)

            await checkIbAlluoDepositResult(eurt, amountUsd, ibAlluoBalanceAfter.sub(ibAlluoBalanceBefore), undefined, ibAlluoEUR);    
        });

        it("Should withdraw EURT", async () => {
            const depositor = signers[0];
            const deposit = "10.04";
            const amountEur = parseUnits(deposit, await eurt.decimals());
            const amountAgEur = parseUnits("15.0", await eurt.decimals());
            const withdraw = "10.0";
            const withdrawAmount = parseUnits(withdraw, await ibAlluoEUR.decimals());
            expect(await ibAlluoEUR.balanceOf(depositor.address)).to.be.equal(0);

            await getCoin(eurt, amountAgEur, depositor.address);
            await eurt.connect(depositor).approve(ibAlluoEUR.address, amountAgEur);
            await ibAlluoEUR.connect(depositor).deposit(eurt.address, amountEur);

            const balanceBefore = await eurt.balanceOf(depositor.address);
            const adapterBalanceBefore = await eurt.balanceOf(eurAdapter.address);
            await ibAlluoEUR.connect(depositor).withdrawTo(depositor.address, eurt.address, withdrawAmount);
            const balanceAfter = await eurt.balanceOf(depositor.address);
            const adapterBalanceAfter = await eurt.balanceOf(eurAdapter.address);

            console.log(`User received ${formatUnits(balanceAfter.sub(balanceBefore), await eurt.decimals())} EURT when requested ${withdraw} EUR`)
            console.log(`Adapter sent ${formatUnits(adapterBalanceBefore.sub(adapterBalanceAfter), 6)} EURT when ${withdraw} EUR withdraw requested`);

        });
    });
})