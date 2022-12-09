import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumberish, constants } from "ethers";
import { formatUnits, parseUnits } from "ethers/lib/utils";
import { ethers, network, upgrades } from "hardhat";
import { ChainlinkFeedStrategy, ChainlinkFeedStrategyV2, CurveLpReferenceFeedStrategyV2, CurvePoolReferenceFeedStrategy, CurvePoolReferenceFeedStrategyV2, IERC20Metadata, IFeedStrategy, PriceFeedRouter, PriceFeedRouterV2, PriceFeedRouterV2__factory } from "../typechain";

describe("Price Feed RouterV2", function () {
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
        desiredIndex: number,
        oneTokenAmount: BigNumberish,
        coin: string,
        strategy?: CurvePoolReferenceFeedStrategyV2
    }
    type CurveLpRoute = {
        coin: string,
        poolAddress: string,
        referenceCoinIndex: number,
        referenceCoinDecimals: number,
        oneTokenAmount: BigNumberish,
        strategy?: CurveLpReferenceFeedStrategyV2
    }

    let signers: SignerWithAddress[];
    let router: PriceFeedRouterV2;

    let usdc: IERC20Metadata, usdt: IERC20Metadata, dai: IERC20Metadata, weth: IERC20Metadata,
        wbtc: IERC20Metadata, eurt: IERC20Metadata, jeur: IERC20Metadata, par: IERC20Metadata,
        eurs: IERC20Metadata, frax: IERC20Metadata, susd: IERC20Metadata, crv3: IERC20Metadata,
        mimLp: IERC20Metadata;

    let fiatRoutes: FiatRoute[];
    let cryptoRoutes: CryptoRoute[];
    let curveRoutes: CurveRoute[];
    let curveLpRoutes: CurveLpRoute[];

    const curvePoolAddress = "0xA5407eAE9Ba41422680e2e00537571bcC53efBfD";
    const curveReferenceCoinIndex = 1; // USDC index in pool ^
    const curveReferenceCoinDecimals = 6; // 1.0 USDC with decimals

    before(async function () {
        await network.provider.request({
            method: "hardhat_reset",
            params: [{
                forking: {
                    enabled: true,
                    jsonRpcUrl: process.env.MAINNET_FORKING_URL as string,
                    blockNumber: 15713655,
                },
            },],
        });

        dai = await ethers.getContractAt("IERC20Metadata", "0x6b175474e89094c44da98b954eedeac495271d0f");
        frax = await ethers.getContractAt('IERC20Metadata', '0x853d955acef822db058eb8505911ed77f175b99e');
        usdc = await ethers.getContractAt("IERC20Metadata", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
        usdt = await ethers.getContractAt("IERC20Metadata", "0xdAC17F958D2ee523a2206206994597C13D831ec7");
        weth = await ethers.getContractAt("IERC20Metadata", "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");
        wbtc = await ethers.getContractAt("IERC20Metadata", "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599");
        susd = await ethers.getContractAt("IERC20Metadata", "0x57Ab1ec28D129707052df4dF418D58a2D46d5f51");
        crv3 = await ethers.getContractAt("IERC20Metadata", "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490");
        mimLp = await ethers.getContractAt("IERC20Metadata", "0x5a6A4D54456819380173272A5E8E9B9904BdF41B");

        // eurt = await ethers.getContractAt("IERC20Metadata", "0xC581b735A1688071A1746c968e0798D642EDE491");

        cryptoRoutes = [
            {
                // USDC
                coin: usdc.address,
                oracle: "0x8fffffd4afb6115b954bd326cbe7b4ba576818f6"
            },
            {
                // USDT
                coin: usdt.address,
                oracle: "0x3e7d1eab13ad0104d2750b8863b489d65364e32d"
            },
            {
                // DAI
                coin: dai.address,
                oracle: "0xaed0c38402a5d19df6e4c03f4e2dced6e29c1ee9"
            },
            // {
            //     // (W)ETH
            //     coin: weth.address,
            //     oracle: "0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419"
            // },
            // {
            //     // (W)BTC
            //     coin: wbtc.address,
            //     oracle: "0xf4030086522a5beea4988f8ca5b36dbc97bee88c"
            // },
            // {
            //     // EURT
            //     coin: eurt.address,
            //     oracle: "0x01d391a48f4f7339ac64ca2c83a07c22f95f587a"
            // },
        ];

        fiatRoutes = [
            {
                name: "EUR",
                id: 1,
                oracle: "0xb49f677943bc038e9857d61e7d053caa2c1734c1"
            },
            {
                name: "ETH",
                id: 2,
                oracle: "0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419"
            },
            {
                name: "BTC",
                id: 3,
                oracle: "0xf4030086522a5beea4988f8ca5b36dbc97bee88c"
            },
            {
                name: "GBP",
                id: 4,
                oracle: "0x5c0ab2d9b5a7ed9f470386e82bb36a3613cdd4b5"
            }
        ];

        curveRoutes = [
            {
                // sUSD
                coin: susd.address,
                oneTokenAmount: parseUnits("1.0", await susd.decimals()),
                desiredIndex: 3
            },
        ]

        curveLpRoutes = [
            {
                // 3CRV
                coin: crv3.address,
                oneTokenAmount: parseUnits("1.0", await crv3.decimals()),
                poolAddress: "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7",
                referenceCoinIndex: 1,
                referenceCoinDecimals: 6,
            },
            {
                // 3CRV
                coin: mimLp.address,
                oneTokenAmount: parseUnits("1.0", await mimLp.decimals()),
                poolAddress: "0x5a6A4D54456819380173272A5E8E9B9904BdF41B",
                referenceCoinIndex: 1,
                referenceCoinDecimals: 18,
            },
        ]

        signers = await ethers.getSigners();
    })

    beforeEach(async function () {
        const Router = await ethers.getContractFactory("PriceFeedRouterV2") as PriceFeedRouterV2__factory;

        router = await upgrades.deployProxy(Router,
            [constants.AddressZero],
            { initializer: 'initialize', kind: 'uups', }
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

        // it("Should revert Curve strategy (reference strategy returned zero or less)", async function () {
        //     const curveRoute = curveRoutes[0];
        //     const BadStrategy = await ethers.getContractFactory("BadPriceStrategy");
        //     const badReferenceStragegy = await BadStrategy.deploy(0, 8);

        //     const CurveStrategy = await ethers.getContractFactory("CurvePoolReferenceFeedStrategy");
        //     const curveStrategy = await CurveStrategy.deploy(
        //         badReferenceStragegy.address,
        //         curvePoolAddress,
        //         curveReferenceCoinIndex,
        //         curveRoute.desiredIndex,
        //         curveReferenceCoinDecimals,
        //         curveRoute.oneTokenAmount
        //     );

        //     await router.setCryptoStrategy(curveStrategy.address, curveRoute.coin);
        //     await expect(router["getPrice(address,uint256)"](curveRoute.coin, 0)).to.be.revertedWith("CurvePRFS: feed lte 0");

        //     await badReferenceStragegy.changeParams(-5, 8);
        //     await expect(router["getPrice(address,uint256)"](curveRoute.coin, 0)).to.be.revertedWith("CurvePRFS: feed lte 0");
        // })
    })

    describe("Filled router", async function () {
        beforeEach(async function () {
            const ChainlinkStrategy = await ethers.getContractFactory("ChainlinkFeedStrategyV2");
            const CurveStrategy = await ethers.getContractFactory("CurvePoolReferenceFeedStrategyV2");
            const CurveLpStrategy = await ethers.getContractFactory("CurveLpReferenceFeedStrategyV2");

            for (let i = 0; i < fiatRoutes.length; i++) {
                const element = fiatRoutes[i];
                const strategy = await upgrades.deployProxy(ChainlinkStrategy,
                    [constants.AddressZero, element.oracle, constants.AddressZero],
                    { initializer: 'initialize', kind: 'uups' }
                ) as ChainlinkFeedStrategyV2;
                element.strategy = strategy

                await router.setFiatStrategy(element.name, element.id, strategy.address);
            }

            for (let i = 0; i < cryptoRoutes.length; i++) {
                const element = cryptoRoutes[i];
                const strategy = await upgrades.deployProxy(ChainlinkStrategy,
                    [constants.AddressZero, element.oracle, element.coin],
                    { initializer: 'initialize', kind: 'uups' }
                ) as ChainlinkFeedStrategyV2;
                element.strategy = strategy
                await router.setCryptoStrategy(strategy.address, element.coin);
            }

            for (let i = 0; i < curveRoutes.length; i++) {
                const element = curveRoutes[i];

                const strategy = await upgrades.deployProxy(CurveStrategy,
                    [constants.AddressZero,
                    await router.cryptoToUsdStrategies(usdc.address),
                        curvePoolAddress,
                        curveReferenceCoinIndex,
                    element.desiredIndex,
                        curveReferenceCoinDecimals,
                    element.oneTokenAmount],
                    { initializer: 'initialize', kind: 'uups' }
                ) as CurvePoolReferenceFeedStrategyV2;

                element.strategy = strategy;
                await router.setCryptoStrategy(strategy.address, element.coin);
            }

            for (let i = 0; i < curveLpRoutes.length; i++) {
                const element = curveLpRoutes[i];
                let feed
                if (i == 0) {
                    feed = await router.cryptoToUsdStrategies(usdc.address);
                }
                else {
                    feed = await router.cryptoToUsdStrategies(crv3.address);
                }

                const strategy = await upgrades.deployProxy(CurveLpStrategy,
                    [constants.AddressZero,
                        feed,
                    element.poolAddress,
                    element.referenceCoinIndex,
                    element.referenceCoinDecimals,
                    element.oneTokenAmount,
                    ethers.utils.toUtf8Bytes("int128")],
                    { initializer: 'initialize', kind: 'uups' }
                ) as CurveLpReferenceFeedStrategyV2;

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

                expect(await strategy?.referenceFeed()).to.be.equal(await router.cryptoToUsdStrategies(usdc.address));
                expect(await strategy?.curvePool()).to.be.equal(curvePoolAddress);
                expect(await strategy?.referenceCoinIndex()).to.be.equal(curveReferenceCoinIndex);
                expect(await strategy?.desiredCoinIndex()).to.be.equal(element.desiredIndex);
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
            const cryptoAddress = usdc.address;

            const priceWithName = await router["getPrice(address,string)"](cryptoAddress, fiatName);
            const priceWithId = await router["getPrice(address,uint256)"](cryptoAddress, fiatId);

            expect(priceWithName.value).to.be.equal(priceWithId.value);
            expect(priceWithName.decimals).to.be.equal(priceWithId.decimals);
        })

        it("Should show same price when calling with fiatId and fiatName (non USD)", async function () {
            const fiatName = "GBP";
            const fiatId = await router.fiatNameToFiatId(fiatName);
            const cryptoAddress = usdc.address;

            const priceWithName = await router["getPrice(address,string)"](cryptoAddress, fiatName);
            const priceWithId = await router["getPrice(address,uint256)"](cryptoAddress, fiatId);

            expect(priceWithName.value).to.be.equal(priceWithId.value);
            expect(priceWithName.decimals).to.be.equal(priceWithId.decimals);
        })

        it("Should show current prices", async function () {
            const fiats = ["USD", "GBP", "EUR", "ETH", "BTC"];
            const cryptos = [usdc, usdt, dai, susd, crv3, mimLp];

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

        it("Should show current prices of amounts", async function () {
            const fiats = ["USD", "GBP", "EUR", "ETH", "BTC"];
            const cryptos = [usdc, usdt, dai, susd, crv3, mimLp];

            for (let i = 0; i < fiats.length; i++) {
                const fiat = fiats[i];
                for (let j = 0; j < cryptos.length; j++) {
                    const crypto = cryptos[j];
                    let amount = parseUnits("3000", await crypto.decimals())
                    const price = await router["getPriceOfAmount(address,uint256,string)"](crypto.address, amount, fiat);

                    console.log(`3000 ${await crypto.symbol()} costs ${formatUnits(price.value, price.decimals)} ${fiat}`);
                }
                console.log();
            }
        })
    })
})