import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { constants } from "ethers";
import hre, { ethers } from "hardhat";
import { ChainlinkFeedStrategy, CurvePoolReferenceFeedStrategy, IERC20Metadata, PriceFeedRouter } from "../../../typechain";

async function main() {
    const ChainlinkStrategy = await ethers.getContractFactory("ChainlinkFeedStrategy");
    const CurveStrategy = await ethers.getContractFactory("CurvePoolReferenceFeedStrategy");
    const delay = (ms: any) => new Promise((res) => setTimeout(res, ms));

    type FiatRoute = {
        name: string,
        id: number;
        oracle: string,
        strategy?: ChainlinkFeedStrategy,
    }
    type CryptoRoute = {
        coin: IERC20Metadata,
        oracle: string,
        strategy?: ChainlinkFeedStrategy,
    }
    type CurveRoute = {
        outIndex: number,
        outDecimals: number,
        coin: IERC20Metadata,
        strategy?: CurvePoolReferenceFeedStrategy
    }

    let usdc: IERC20Metadata, usdt: IERC20Metadata, dai: IERC20Metadata, weth: IERC20Metadata,
        wbtc: IERC20Metadata, eurt: IERC20Metadata, jeur: IERC20Metadata, par: IERC20Metadata,
        eurs: IERC20Metadata;

    let fiatRoutes: FiatRoute[];
    let cryptoRoutes: CryptoRoute[];
    let curveRoutes: CurveRoute[];

    const curvePoolAddress = "0xAd326c253A84e9805559b73A08724e11E49ca651";
    const curveReferenceCoinIndex = 3; // EURT index in pool ^
    const curveReferenceCoinOne = 1000000; // 1.0 EURT with decimals

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
            coin: usdc,
            oracle: "0xfe4a8cc5b5b2366c1b58bea3858e81843581b2f7"
        },
        {
            // USDT
            // https://data.chain.link/polygon/mainnet/stablecoins/usdt-usd
            coin: usdt,
            oracle: "0x0a6513e40db6eb1b165753ad52e80663aea50545"
        },
        {
            // DAI
            // https://data.chain.link/polygon/mainnet/stablecoins/dai-usd
            coin: dai,
            oracle: "0x4746dec9e833a82ec7c2c1356372ccf2cfcd2f3d"
        },
        {
            // (W)ETH
            // https://data.chain.link/polygon/mainnet/crypto-usd/eth-usd
            coin: weth,
            oracle: "0xf9680d99d6c9589e2a93a78a04a279e509205945"
        },
        {
            // (W)BTC
            // https://data.chain.link/polygon/mainnet/crypto-usd/btc-usd
            coin: wbtc,
            oracle: "0xc907e116054ad103354f2d350fd2514433d57f6f"
        },
        {
            // EURT
            // https://data.chain.link/polygon/mainnet/stablecoins/eurt-usd
            coin: eurt,
            oracle: "0xe7ef3246654ac0fd0e22fc30dce40466cfdf597c"
        },
    ];

    fiatRoutes = [];

    curveRoutes = [
        {
            // jEUR
            coin: jeur,
            outDecimals: await jeur.decimals(),
            outIndex: 0
        },
        {
            // PAR
            coin: par,
            outDecimals: await par.decimals(),
            outIndex: 1
        }, {
            // EURS
            coin: eurs,
            outDecimals: await eurs.decimals(),
            outIndex: 2
        },
    ]

    // const Router = await ethers.getContractFactory("PriceFeedRouter");
    const router = await ethers.getContractAt("PriceFeedRouter", "0x54a6c19C7a7304A99489D547ce71DC990BF141a9") //await Router.deploy("0x2580f9954529853Ca5aC5543cE39E9B5B1145135", false);

    console.log("Core router deployed at:", router.address);
    console.log();
    console.log("Deploying fiat routes:");
    for (let i = 0; i < fiatRoutes.length; i++) {
        const element = fiatRoutes[i];
        const strategy = await ChainlinkStrategy.deploy(element.oracle);
        await strategy.deployed()
        element.strategy = strategy
        console.log(`${element.name} route: ${strategy.address}. Call setFiatStrategy from Gnosis with args: [${element.name}, ${element.id}, ${strategy.address}]`);
    }
    console.log();
    console.log("Deploying direct Chainlink routes:");
    for (let i = 0; i < cryptoRoutes.length; i++) {
        const element = cryptoRoutes[i];
        const strategy = await ChainlinkStrategy.deploy(element.oracle);
        await strategy.deployed()
        element.strategy = strategy
        console.log(`${await element.coin.symbol()} route: ${strategy.address}. Call setCrytoStrategy from Gnosis with args: [${strategy.address}, ${element.coin.address}]`);
    }
    console.log();
    console.log("Deploying Curve Pool routes:");
    for (let i = 0; i < curveRoutes.length; i++) {
        const element = curveRoutes[i];
        const strategy = await CurveStrategy.deploy(
            await router.crytoToUsdStrategies(eurt.address),
            curvePoolAddress,
            curveReferenceCoinIndex,
            element.outIndex,
            element.outDecimals,
            curveReferenceCoinOne
        )
        await strategy.deployed()
        element.strategy = strategy;
        console.log(`${await element.coin.symbol()} route: ${strategy.address}. Call setCrytoStrategy from Gnosis with args: [${strategy.address}, ${element.coin.address}]`);
    }
    console.log();
    console.log("Attempt to verify all contracts");

    console.log("Cleaning...");
    await hre.run("clean", {});
    console.log("Delay 35 seconds for Polygonscan to index all txs..");
    await delay(35000);

    console.log("Verifying core router...")
    try {
        await hre.run("verify:verify", {
            address: router.address,
            constructorArguments: ["0x2580f9954529853Ca5aC5543cE39E9B5B1145135", false],
        });
    } catch (error) {
        console.log(`Something wrong with verification of core router`);
    }

    console.log("Verifying fiat routes")
    for (let i = 0; i < fiatRoutes.length; i++) {
        const element = fiatRoutes[i];
        try {
            console.log(`${element.name}:`);
            await hre.run("verify:verify", {
                address: element.strategy,
                constructorArguments: [element.oracle],
            });
        } catch (error) {
            console.log(`Something wrong with verification of ${element.name} route`);
        }
    }

    console.log("Verifying direct Chainlink routes")
    for (let i = 0; i < cryptoRoutes.length; i++) {
        const element = cryptoRoutes[i];
        try {
            console.log(`${await element.coin.symbol()}:`);
            await hre.run("verify:verify", {
                address: element.strategy,
                constructorArguments: [element.oracle],
            });
        } catch (error) {
            console.log(`Something wrong with verification of ${await element.coin.symbol()} route`);
        }
    }

    console.log("Verifying direct Chainlink routes")
    for (let i = 0; i < curveRoutes.length; i++) {
        const element = curveRoutes[i];
        try {
            console.log(`${await element.coin.symbol()}:`);
            await hre.run("verify:verify", {
                address: element.strategy,
                constructorArguments: [
                    await router.crytoToUsdStrategies(eurt.address),
                    curvePoolAddress,
                    curveReferenceCoinIndex,
                    element.outIndex,
                    element.outDecimals,
                    curveReferenceCoinOne
                ],
            });
        } catch (error) {
            console.log(`Something wrong with verification of ${await element.coin.symbol()} route`);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
