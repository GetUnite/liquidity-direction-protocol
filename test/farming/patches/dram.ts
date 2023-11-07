import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, BigNumberish } from "ethers";
import { formatEther, formatUnits, parseEther, parseUnits } from "ethers/lib/utils";
import { ethers, network, upgrades } from "hardhat";
import { BtcNoPoolAdapterUpgradeable, EthNoPoolAdapterUpgradeable, EurCurveAdapterUpgradeable, IbAlluo, ICurvePoolEUR, ICurvePoolUSD, IERC20Metadata, LiquidityHandler, LiquidityHandlerPolygon, PriceFeedRouterV2, TestERC20, UsdCurveAdapterUpgradeable } from "../../../typechain";
import { ExternalStablecoinReferenceFeedStrategyV2 } from "../../../typechain";
import { loadFixture } from "ethereum-waffle";

let usdc: IERC20Metadata, usdt: IERC20Metadata, dai: IERC20Metadata, weth: IERC20Metadata,
    wbtc: IERC20Metadata, eurt: IERC20Metadata, jeur: IERC20Metadata, par: IERC20Metadata,
    eurs: IERC20Metadata;

let priceFeedRouterV2: PriceFeedRouterV2;

let signers: SignerWithAddress[];



describe("IbAlluo With Price Oracles (Integration Tests)", async () => {
    let admin: SignerWithAddress;
    let ibAlluoUSD: IbAlluo;
    let liquidityHandler: LiquidityHandlerPolygon;
    let dram: TestERC20;
    beforeEach(async function () {
        await loadFixture(setup);
    });

    async function setup() {
        //We are forking Polygon mainnet, please set Alchemy key in .env
        await network.provider.request({
            method: "hardhat_reset",
            params: [{
                forking: {
                    enabled: true,
                    jsonRpcUrl: process.env.POLYGON_FORKING_URL as string,
                    //you can fork from last block by commenting next line
                    blockNumber: 49620269,
                },
            },],
        });
        usdc = await ethers.getContractAt("IERC20Metadata", "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174");
        usdt = await ethers.getContractAt("IERC20Metadata", "0xc2132D05D31c914a87C6611C10748AEb04B58e8F");
        dai = await ethers.getContractAt("IERC20Metadata", "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063");
        signers = await ethers.getSigners();

        ibAlluoUSD = await ethers.getContractAt("IbAlluo", "0xC2DbaAEA2EfA47EBda3E572aa0e55B742E408BF6");
        liquidityHandler = await ethers.getContractAt("LiquidityHandlerPolygon", "0x31a3439Ac7E6Ea7e0C0E4b846F45700c6354f8c1");

        // Deploy a DRAM token
        let testerc20 = await ethers.getContractFactory("TestERC20");
        dram = await testerc20.deploy("DRAM", "DRAM", 18, true, signers[0].address);

        // mint dram to the admin
        await dram.connect(signers[0]).mint(signers[0].address, parseEther("1000000"));


        admin = await ethers.getImpersonatedSigner("0x2580f9954529853Ca5aC5543cE39E9B5B1145135");
        const LiquidityHandler = await ethers.getContractFactory("LiquidityHandlerPolygon");
        const newLiquidityHandlerImp = await LiquidityHandler.deploy();

        const ibAlluo = await ethers.getContractFactory("IbAlluo");
        const newIbAlluoImp = await ibAlluo.deploy();

        await ibAlluoUSD.connect(admin).changeTokenStatus(dram.address, true);
        await ibAlluoUSD.connect(admin).changeUpgradeStatus(true);
        await ibAlluoUSD.connect(admin).upgradeTo(newIbAlluoImp.address);
        // Upgrade the handler with the DRAM logic 
        await liquidityHandler.connect(admin).changeUpgradeStatus(true);
        await liquidityHandler.connect(admin).upgradeTo(newLiquidityHandlerImp.address)
        await liquidityHandler.connect(admin).setDram(dram.address);
        // Step 3: set up price feed router to include DRAM

        const stablecoinStrategy = await ethers.getContractFactory("ExternalStablecoinReferenceFeedStrategyV2")
        const externalStablecoinStrategy = await upgrades.deployProxy(stablecoinStrategy,
            [signers[0].address],
            { initializer: 'initialize', kind: 'uups' }
        ) as ExternalStablecoinReferenceFeedStrategyV2;


        priceFeedRouterV2 = await ethers.getContractAt("PriceFeedRouterV2", "0x82220c7Be3a00ba0C6ed38572400A97445bdAEF2");
        await priceFeedRouterV2.connect(admin).setCryptoStrategy(externalStablecoinStrategy.address, dram.address);
    }

    describe("Test that the DRAM price route returns correct values", async () => {
        it("getPrice of one dram using fiat name should return 1", async () => {
            let price = await priceFeedRouterV2["getPrice(address,string)"](dram.address, "USD");
            console.log("price", price.value);
            expect(price.value).to.be.equal(parseUnits("1", 18));
        })

        it("getPrice of one dram using fiat id should return 1", async () => {
            let price = await priceFeedRouterV2["getPrice(address,uint256)"](dram.address, 0);
            console.log("price", price.value);
            expect(Number(price.value)).to.be.equal(Number(parseUnits("1", 18)));
        })

        it("getPriceOfAmount should return the correct value", async () => {
            let price = await priceFeedRouterV2["getPriceOfAmount(address,uint256,uint256)"](dram.address, parseEther("1000"), 0);
            console.log("price", price.value);
            expect(Number(formatUnits(price.value, price.decimals))).to.be.equal(1000);
        })
    });

    describe("Test that depositing and withdrawing DRAMs return the correct values", async () => {
        it("Depositing 1000 DRAM should give you 1000 dollars worth of IbAlluoUSD", async () => {
            let iballuoBalanceBeforeInUSD = await ibAlluoUSD.getBalance(signers[0].address);
            await dram.connect(signers[0]).approve(ibAlluoUSD.address, parseEther("1000"))
            await ibAlluoUSD.connect(signers[0]).deposit(dram.address, parseEther("1000"))
            let iballuoBalanceAfterInUSD = await ibAlluoUSD.getBalance(signers[0].address);
            let differenceInBalance = iballuoBalanceAfterInUSD.sub(iballuoBalanceBeforeInUSD);
            // Super small unlucky round down error (1e18 small)
            expect(differenceInBalance).to.be.closeTo(parseEther("1000"), 5)
        })

        it("Depositing then withdrawing 1000 DRAM should give you 1000 dirams back", async () => {
            let iballuoBalanceBeforeInUSD = await ibAlluoUSD.getBalance(signers[0].address);
            let dramBalanceBefore = await dram.balanceOf(signers[0].address);
            await dram.connect(signers[0]).approve(ibAlluoUSD.address, parseEther("1000"))
            await ibAlluoUSD.connect(signers[0]).deposit(dram.address, parseEther("1000"))
            let iballuoBalanceAfterInUSD = await ibAlluoUSD.getBalance(signers[0].address);
            let differenceInBalance = iballuoBalanceAfterInUSD.sub(iballuoBalanceBeforeInUSD);
            // expect(differenceInBalance).to.equal(parseEther("1000"))

            await ibAlluoUSD.withdraw(dram.address, parseEther("1000"))
            let dramBalanceAfter = await dram.balanceOf(signers[0].address);

            expect(dramBalanceAfter).to.equal(dramBalanceBefore);
        })
    });


    describe("Test that depositing and withdrawing in any combination of alternate tokens should work", async () => {
        it("Depositing 1000 DRAM, should then allow you to withdraw 1000 USDC, DAI or USDT", async () => {
            let usdtBalanceBefore = await usdt.balanceOf(signers[0].address);
            let usdcBalanceBefore = await usdc.balanceOf(signers[0].address);
            let daiBalanceBefore = await dai.balanceOf(signers[0].address);

            await dram.connect(signers[0]).approve(ibAlluoUSD.address, parseEther("1000"))
            await ibAlluoUSD.connect(signers[0]).deposit(dram.address, parseEther("1000"))
            await ibAlluoUSD.withdraw(usdc.address, parseEther("1000"))

            await dram.connect(signers[0]).approve(ibAlluoUSD.address, parseEther("1000"))
            await ibAlluoUSD.connect(signers[0]).deposit(dram.address, parseEther("1000"))
            await ibAlluoUSD.withdraw(usdt.address, parseEther("1000"))


            await dram.connect(signers[0]).approve(ibAlluoUSD.address, parseEther("1000"))
            await ibAlluoUSD.connect(signers[0]).deposit(dram.address, parseEther("1000"))
            await ibAlluoUSD.withdraw(dai.address, parseEther("1000"))

            let usdtBalanceAfter = await usdt.balanceOf(signers[0].address);
            let usdcBalanceAfter = await usdc.balanceOf(signers[0].address);
            let daiBalanceAfter = await dai.balanceOf(signers[0].address);
            console.log("Differences")
            console.log("USDT", formatUnits(usdtBalanceAfter.sub(usdtBalanceBefore), 6))
            console.log("USDC", formatUnits(usdcBalanceAfter.sub(usdcBalanceBefore), 6))
            console.log("DAI", formatUnits(daiBalanceAfter.sub(daiBalanceBefore), 18))
            // Oracle values mean that we receive slightly less than 1000 of each token. accept to 0.5 dollars
            expect(usdtBalanceAfter).to.closeTo(usdtBalanceBefore.add(parseUnits("1000", 6)), 500000);
            expect(usdcBalanceAfter).to.closeTo(usdcBalanceBefore.add(parseUnits("1000", 6)), 500000);
            expect(daiBalanceAfter).to.closeTo(daiBalanceBefore.add(parseUnits("1000", 18)), parseUnits("0.5", 18));
        })
    });
})