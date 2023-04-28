import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumberish, constants } from "ethers";
import { formatUnits, parseUnits } from "ethers/lib/utils";
import { ethers, network, upgrades } from "hardhat";
import { ChainlinkFeedStrategy, ChainlinkFeedStrategyV2, CurvePoolReferenceFeedStrategy, CurvePoolReferenceFeedStrategyV2, IERC20Metadata, IFeedStrategy, PriceFeedRouter, PriceFeedRouterV2, PriceFeedRouterV2__factory } from "../typechain-types";

describe("Price Feed Router", function () {
    type FiatRoute = {
        name: string,
        id: number;
        oracle: string,
        strategy?: ChainlinkFeedStrategyV2,
    }
    type CryptoRoute = {
        coin: string,
        oracle: string,
        strategy?: ChainlinkFeedStrategyV2,
    }
    type CurveRoute = {
        outIndex: number,
        oneTokenAmount: BigNumberish,
        coin: string,
        strategy?: CurvePoolReferenceFeedStrategyV2
    }

    let signers: SignerWithAddress[];
    let router: PriceFeedRouterV2;

    let usdc: IERC20Metadata, usdt: IERC20Metadata, dai: IERC20Metadata, weth: IERC20Metadata,
        wbtc: IERC20Metadata, eurt: IERC20Metadata, jeur: IERC20Metadata, par: IERC20Metadata,
        eurs: IERC20Metadata;

    let fiatRoutes: FiatRoute[];
    let cryptoRoutes: CryptoRoute[];
    let curveRoutes: CurveRoute[];

    const curvePoolAddress = "0xAd326c253A84e9805559b73A08724e11E49ca651";
    const curveReferenceCoinIndex = 3; // EURT index in pool ^
    const curveReferenceCoinDecimals = 6; // 1.0 EURT with decimals

    before(async function () {
        await network.provider.request({
            method: "hardhat_reset",
            params: [{
                forking: {
                    enabled: true,
                    jsonRpcUrl: process.env.POLYGON_FORKING_URL as string,
                },
            },],
        });

        usdc = await ethers.getContractAt("IERC20Metadata", "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174");
        usdt = await ethers.getContractAt("IERC20Metadata", "0xc2132D05D31c914a87C6611C10748AEb04B58e8F");
        dai = await ethers.getContractAt("IERC20Metadata", "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063");
        weth = await ethers.getContractAt("IERC20Metadata", "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619");
        wbtc = await ethers.getContractAt("IERC20Metadata", "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6");
        eurt = await ethers.getContractAt("IERC20Metadata", "0x7BDF330f423Ea880FF95fC41A280fD5eCFD3D09f");
        jeur = await ethers.getContractAt("IERC20Metadata", "0x4e3Decbb3645551B8A19f0eA1678079FCB33fB4c");
        par = await ethers.getContractAt("IERC20Metadata", "0xE2Aa7db6dA1dAE97C5f5C6914d285fBfCC32A128");
        eurs = await ethers.getContractAt("IERC20Metadata", "0xE111178A87A3BFf0c8d18DECBa5798827539Ae99");

        cryptoRoutes = [
            {
                // USDC
                // https://data.chain.link/polygon/mainnet/stablecoins/usdc-usd
                coin: usdc.address,
                oracle: "0xfe4a8cc5b5b2366c1b58bea3858e81843581b2f7"
            },
            {
                // USDT
                // https://data.chain.link/polygon/mainnet/stablecoins/usdt-usd
                coin: usdt.address,
                oracle: "0x0a6513e40db6eb1b165753ad52e80663aea50545"
            },
            {
                // DAI
                // https://data.chain.link/polygon/mainnet/stablecoins/dai-usd
                coin: dai.address,
                oracle: "0x4746dec9e833a82ec7c2c1356372ccf2cfcd2f3d"
            },
            {
                // (W)ETH
                // https://data.chain.link/polygon/mainnet/crypto-usd/eth-usd
                coin: weth.address,
                oracle: "0xf9680d99d6c9589e2a93a78a04a279e509205945"
            },
            {
                // (W)BTC
                // https://data.chain.link/polygon/mainnet/crypto-usd/btc-usd
                coin: wbtc.address,
                oracle: "0xc907e116054ad103354f2d350fd2514433d57f6f"
            },
            {
                // EURT
                // https://data.chain.link/polygon/mainnet/stablecoins/eurt-usd
                coin: eurt.address,
                oracle: "0xe7ef3246654ac0fd0e22fc30dce40466cfdf597c"
            },
        ];

        fiatRoutes = [
            {
                // https://data.chain.link/polygon/mainnet/fiat/eur-usd
                name: "EUR",
                id: 1,
                oracle: "0x73366fe0aa0ded304479862808e02506fe556a98"
            },
            {
                // https://data.chain.link/polygon/mainnet/fiat/gbp-usd
                name: "GBP",
                id: 2,
                oracle: "0x099a2540848573e94fb1ca0fa420b00acbbc845a"
            }
        ];

        curveRoutes = [
            {
                // jEUR
                coin: jeur.address,
                oneTokenAmount: parseUnits("1.0", await jeur.decimals()),
                outIndex: 0
            },
            {
                // PAR
                coin: par.address,
                oneTokenAmount: parseUnits("1.0", await par.decimals()),
                outIndex: 1
            }, {
                // EURS
                coin: eurs.address,
                oneTokenAmount: parseUnits("1.0", await eurs.decimals()),
                outIndex: 2
            },
        ]

        signers = await ethers.getSigners();
    })

    beforeEach(async function () {
        const Router = await ethers.getContractFactory("PriceFeedRouterV2") as PriceFeedRouterV2__factory;

        router = await upgrades.deployProxy(Router,
            [constants.AddressZero],
            { initializer: 'initialize', kind: 'uups' }
        ) as PriceFeedRouterV2;

    })

    describe("Empty router", async function () {
        it("Should check deploy (isTesting true)", async function () {
            expect(await router.fiatNameToFiatId("USD")).to.be.equal(0);
            // expect(await router.owner()).to.be.equal(signers[0].address);
        })

        // it("Should transferOwnership", async function () {
        //     const newOwner = "0xfE4A8cc5b5B2366C1B58Bea3858e81843581b2F7";
        //     expect(await router.owner()).to.not.be.equal(newOwner);

        //     await router.transferOwnership(newOwner);

        //     expect(await router.owner()).to.be.equal(newOwner);
        // });

        // it("Should revert transferOwnership (passing not contract)", async function () {
        //     const newOwner = signers[0].address;
        //     await expect(router.transferOwnership(newOwner)).to.be.revertedWith("PriceFeed: !contract");
        // });

        // it("Should revert transferOwnership (passing zero address)", async function () {
        //     const newOwner = constants.AddressZero;
        //     await expect(router.transferOwnership(newOwner)).to.be.revertedWith("Ownable: new owner is 0");
        // });

        it("Should not set fiat strategy (attempt to use reserved id 0)", async function () {
            const fiatSymbol = "RUB";
            const fiatId = 0;
            const fiatFeed = constants.AddressZero;

            await expect(router.setFiatStrategy(fiatSymbol, fiatId, fiatFeed)).to.be.revertedWith("PriceFeed: id 0 reserved for USD");
        })

        it("Should revert Curve strategy (reference strategy returned zero or less)", async function () {
            const curveRoute = curveRoutes[0];
            const BadStrategy = await ethers.getContractFactory("BadPriceStrategy");
            const badReferenceStragegy = await BadStrategy.deploy(0, 8);

            const CurveStrategy = await ethers.getContractFactory("CurvePoolReferenceFeedStrategy");
            const curveStrategy = await CurveStrategy.deploy(
                badReferenceStragegy.address,
                curvePoolAddress,
                curveReferenceCoinIndex,
                curveRoute.outIndex,
                curveReferenceCoinDecimals,
                curveRoute.oneTokenAmount
            );

            await router.setCryptoStrategy(curveStrategy.address, curveRoute.coin);
            await expect(router["getPrice(address,uint256)"](curveRoute.coin, 0)).to.be.revertedWith("CurvePRFS: feed lte 0");

            await badReferenceStragegy.changeParams(-5, 8);
            await expect(router["getPrice(address,uint256)"](curveRoute.coin, 0)).to.be.revertedWith("CurvePRFS: feed lte 0");
        })
    })

    describe("Filled router", async function () {
        beforeEach(async function () {
            const ChainlinkStrategy = await ethers.getContractFactory("ChainlinkFeedStrategyV2");
            const CurveStrategy = await ethers.getContractFactory("CurvePoolReferenceFeedStrategyV2");

            for (let i = 0; i < fiatRoutes.length; i++) {
                const element = fiatRoutes[i];
                const strategy = await upgrades.deployProxy(ChainlinkStrategy,
                    [constants.AddressZero, element.oracle],
                    { initializer: 'initialize', kind: 'uups' }
                ) as ChainlinkFeedStrategyV2;
                element.strategy = strategy
                await router.setFiatStrategy(element.name, element.id, strategy.address);
            }

            for (let i = 0; i < cryptoRoutes.length; i++) {
                const element = cryptoRoutes[i];
                const strategy = await upgrades.deployProxy(ChainlinkStrategy,
                    [constants.AddressZero, element.oracle],
                    { initializer: 'initialize', kind: 'uups' }
                ) as ChainlinkFeedStrategyV2;
                element.strategy = strategy
                await router.setCryptoStrategy(strategy.address, element.coin);
            }

            for (let i = 0; i < curveRoutes.length; i++) {
                const element = curveRoutes[i];

                const strategy = await upgrades.deployProxy(CurveStrategy,
                    [constants.AddressZero,
                    await router.cryptoToUsdStrategies(eurt.address),
                        curvePoolAddress,
                        curveReferenceCoinIndex,
                    element.outIndex,
                        curveReferenceCoinDecimals,
                    element.oneTokenAmount],
                    { initializer: 'initialize', kind: 'uups' }
                ) as CurvePoolReferenceFeedStrategyV2;

                element.strategy = strategy;
                await router.setCryptoStrategy(strategy.address, element.coin);
            }
        })

        it("Should check that fiat routes are set", async function () {
            for (let i = 0; i < fiatRoutes.length; i++) {
                const element = fiatRoutes[i];
                expect(await router.fiatNameToFiatId(element.name)).to.be.equal(element.id);
                expect(await router.fiatIdToUsdStrategies(element.id)).to.be.equal(element.strategy?.address);

                expect((await element.strategy!.chainlinkFeed()).toLowerCase()).to.be.equal(element.oracle);
            }
        })

        it("Should check that cryptocurrencies routes are set", async function () {
            for (let i = 0; i < cryptoRoutes.length; i++) {
                const element = cryptoRoutes[i];
                expect(await router.cryptoToUsdStrategies(element.coin)).to.be.equal(element.strategy?.address);

                expect((await element.strategy!.chainlinkFeed()).toLowerCase()).to.be.equal(element.oracle);
            }
        })

        it("Should check that Curve routes are set", async function () {
            for (let i = 0; i < curveRoutes.length; i++) {
                const element = curveRoutes[i];
                const strategy = element!.strategy;
                expect(await router.cryptoToUsdStrategies(element.coin)).to.be.equal(element.strategy?.address);

                expect(await strategy?.referenceFeed()).to.be.equal(await router.cryptoToUsdStrategies(eurt.address));
                expect(await strategy?.curvePool()).to.be.equal(curvePoolAddress);
                expect(await strategy?.referenceCoinIndex()).to.be.equal(curveReferenceCoinIndex);
                expect(await strategy?.desiredCoinIndex()).to.be.equal(element.outIndex);
                expect(await strategy?.referenceCoinDecimals()).to.be.equal(curveReferenceCoinDecimals);
                expect(await strategy?.desiredOneTokenAmount()).to.be.equal(element.oneTokenAmount);
            }
        })

        it("Should not get price (no cryptocurrency feed)", async function () {
            await expect(router["getPrice(address,uint256)"](constants.AddressZero, 0)).to.be.revertedWith("PriceFeedRouter: 1no priceFeed")
        })

        it("Should not get price (no fiat feed)", async function () {
            await expect(router["getPrice(address,uint256)"](usdc.address, 69)).to.be.revertedWith("PriceFeedRouter: 2no priceFeed")
        })

        it("Should not get price (bad strategy return value for cryptocurrency)", async function () {
            const BadStrategy = await ethers.getContractFactory("BadPriceStrategy");
            const badStragegy = await BadStrategy.deploy(0, 8);
            const badCryptocurrency = "0xa47c8bf37f92aBed4A126BDA807A7b7498661acD";

            await router.setCryptoStrategy(badStragegy.address, badCryptocurrency);
            await expect(router["getPrice(address,uint256)"](badCryptocurrency, 69)).to.be.revertedWith("PriceFeedRouter: 1feed lte 0");

            await badStragegy.changeParams(-5, 8);
            await expect(router["getPrice(address,uint256)"](badCryptocurrency, 69)).to.be.revertedWith("PriceFeedRouter: 1feed lte 0");
        })

        it("Should not get price (bad strategy return value for fiat)", async function () {
            const BadStrategy = await ethers.getContractFactory("BadPriceStrategy");
            const badStragegy = await BadStrategy.deploy(0, 8);
            const badFiatSymbol = "RUB";
            const badFiatId = 228;

            await router.setFiatStrategy(badFiatSymbol, badFiatId, badStragegy.address);
            await expect(router["getPrice(address,uint256)"](usdc.address, badFiatId)).to.be.revertedWith("PriceFeedRouter: 2feed lte 0");

            await badStragegy.changeParams(-5, 8);
            await expect(router["getPrice(address,uint256)"](usdc.address, badFiatId)).to.be.revertedWith("PriceFeedRouter: 2feed lte 0");
        })

        it("Should show same price when calling with fiatId and fiatName (USD)", async function () {
            const fiatName = "USD";
            const fiatId = await router.fiatNameToFiatId(fiatName);
            const cryptoAddress = weth.address;

            const priceWithName = await router["getPrice(address,string)"](cryptoAddress, fiatName);
            const priceWithId = await router["getPrice(address,uint256)"](cryptoAddress, fiatId);

            expect(priceWithName.value).to.be.equal(priceWithId.value);
            expect(priceWithName.decimals).to.be.equal(priceWithId.decimals);
        })

        it("Should show same price when calling with fiatId and fiatName (non USD)", async function () {
            const fiatName = "GBP";
            const fiatId = await router.fiatNameToFiatId(fiatName);
            const cryptoAddress = weth.address;

            const priceWithName = await router["getPrice(address,string)"](cryptoAddress, fiatName);
            const priceWithId = await router["getPrice(address,uint256)"](cryptoAddress, fiatId);

            expect(priceWithName.value).to.be.equal(priceWithId.value);
            expect(priceWithName.decimals).to.be.equal(priceWithId.decimals);
        })

        it("Should show current prices", async function () {
            const fiats = ["USD", "GBP", "EUR"];
            const cryptos = [usdc, usdt, dai, weth, wbtc, eurt, eurs, jeur, par];

            for (let i = 0; i < fiats.length; i++) {
                const fiat = fiats[i];
                for (let j = 0; j < cryptos.length; j++) {
                    const crypto = cryptos[j];
                    const price = await router["getPrice(address,string)"](crypto.address, fiat);
                    console.log(`1 ${await crypto.symbol()} costs ${formatUnits(price.value, price.decimals)} ${fiat}`);
                }
                console.log();
            }
        })
    })
})