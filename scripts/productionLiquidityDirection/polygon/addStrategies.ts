import { ethers, upgrades, } from "hardhat";
import { AlluoStrategyHandler, AlluoVoteExecutor, AlluoVoteExecutorUtils, BeefyStrategy, BeefyStrategyUniversal, ExchangePriceOracle, ExchangePriceOracle__factory, IBeefyBoost, IBeefyVaultV6, IERC20, IERC20Metadata, IExchange, IPriceFeedRouter, IPriceFeedRouterV2, ISpokePoolNew, IWrappedEther, LiquidityHandler, NullStrategy, OmnivaultStrategy, PseudoMultisigWallet } from "../../../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { reset } from "@nomicfoundation/hardhat-network-helpers";
import { LiquidityHandlerCurrent } from "../../../typechain-types";
import { BigNumberish } from "@across-protocol/sdk-v2/dist/utils";

async function main() {
    let alluoVoteExecutor: AlluoVoteExecutor;
    let alluoStrategyHandler: AlluoStrategyHandler;
    let alluoVoteExecutorUtils: AlluoVoteExecutorUtils;
    let signers: SignerWithAddress[];
    let admin: SignerWithAddress;
    let spokePool: string;
    let _recipient: string;
    let _recipientChainId: string;
    let _relayerFeePct: BigNumberish;
    let _slippageTolerance: number;
    let _exchange: IExchange;
    let priceRouter: IPriceFeedRouterV2;

    let weth: IWrappedEther;
    let usdc: IERC20Metadata;
    let ageur: IERC20Metadata;
    let wbtc: IERC20Metadata;
    let usdt: IERC20Metadata;

    let liquidityHandler: LiquidityHandlerCurrent;
    let exchangePriceOracle: ExchangePriceOracle;


    let beefyStrategy: BeefyStrategyUniversal;
    let omnivaultStrategy: OmnivaultStrategy;
    let nullStrategy: NullStrategy;

    // await reset(process.env.POLYGON_URL)
    admin = await ethers.getSigner("0x2580f9954529853Ca5aC5543cE39E9B5B1145135")

    signers = await ethers.getSigners();

    _exchange = await ethers.getContractAt(
        "contracts/interfaces/IExchange.sol:IExchange",
        "0xeE0674C1E7d0f64057B6eCFe845DC2519443567F"
    ) as IExchange;

    priceRouter = await ethers.getContractAt("contracts/interfaces/IPriceFeedRouterV2.sol:IPriceFeedRouterV2", "0x82220c7Be3a00ba0C6ed38572400A97445bdAEF2") as IPriceFeedRouterV2;

    weth = await ethers.getContractAt(
        "contracts/interfaces/IWrappedEther.sol:IWrappedEther",
        "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619"
    ) as IWrappedEther;

    usdc = await ethers.getContractAt(
        "IERC20Metadata",
        "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174") as IERC20Metadata;


    wbtc = await ethers.getContractAt("IERC20Metadata", "0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6");

    ageur = await ethers.getContractAt("IERC20Metadata", "0xe0b52e49357fd4daf2c15e02058dce6bc0057db4");

    usdt = await ethers.getContractAt("IERC20Metadata", "0xc2132d05d31c914a87c6611c10748aeb04b58e8f");

    liquidityHandler = await ethers.getContractAt("LiquidityHandlerCurrent", "0x31a3439Ac7E6Ea7e0C0E4b846F45700c6354f8c1") as unknown as LiquidityHandlerCurrent;

    // Perhaps this may be set to 0 for certain chains
    exchangePriceOracle = await ethers.getContractAt("ExchangePriceOracle", "0xb6331aa98a78b90d671f4590544ed598b1e4c7ef")


    console.log("Signers", signers[0].address);

    alluoVoteExecutorUtils = await ethers.getContractAt("AlluoVoteExecutorUtils", "0xDD9FC096606Ca0a3D8Be9178959f492c9C23966F") as AlluoVoteExecutorUtils;
    alluoStrategyHandler = await ethers.getContractAt("AlluoStrategyHandler", "0xca3708D709f1324D21ad2C0fb551CC4a0882FD29") as AlluoStrategyHandler;
    alluoVoteExecutor = await ethers.getContractAt("AlluoVoteExecutor", "0x3DC877A5a211a082E7c2D64aa816dd079b50AddB") as AlluoVoteExecutor;
    beefyStrategy = await ethers.getContractAt("BeefyStrategyUniversal", "0x525b00E7a3c26948fD9FEA341D9488Cd6aE3C935") as BeefyStrategyUniversal;
    nullStrategy = await ethers.getContractAt("NullStrategy", "0xc98c8E8fb3Bd0BB029547495DC2AA4185FB807c2") as NullStrategy;
    omnivaultStrategy = await ethers.getContractAt("OmnivaultStrategy", "0xdA32d82e3b5275424F130612797aDc6EFaB06515") as OmnivaultStrategy;


    async function addOmnivaultStrategy(strategyName: string, directionId: number, omnivaultAddress: string, primaryToken: string, assetId: number, chainId: number,) {
        let entryData = await omnivaultStrategy.encodeData(omnivaultAddress, assetId, primaryToken);
        let exitData = entryData;
        let rewardsData = entryData;
        await alluoStrategyHandler.setLiquidityDirection(strategyName, directionId, omnivaultStrategy.address, primaryToken, assetId, chainId, entryData, exitData, rewardsData)
    }


    async function addNullStrategy(strategyName: string, directionId: number, primaryToken: string, assetId: number, chainId: number,) {
        let entryData = await nullStrategy.encodeData(assetId, primaryToken);
        let exitData = entryData;
        let rewardsData = entryData;
        await alluoStrategyHandler.setLiquidityDirection(strategyName, directionId, nullStrategy.address, primaryToken, assetId, chainId, entryData, exitData, rewardsData)
    }

    async function addBeefyStrategy(strategyName: string, directionId: number, beefyVaultAddress: string, beefyBoostAddress: string, primaryToken: string, entryToken: string, rewardTokensArray: string[], assetId: number, chainId: number,) {
        rewardTokensArray.forEach(async (tokenAddress: string) => {
            await beefyStrategy.changeExpectedRewardStatus(tokenAddress, true);
        });

        let entryData = await beefyStrategy.encodeData(beefyVaultAddress, beefyBoostAddress, 2, entryToken)
        let exitData = entryData;
        let rewardsData = entryData;

        await alluoStrategyHandler.setLiquidityDirection(strategyName, directionId, nullStrategy.address, primaryToken, assetId, chainId, entryData, exitData, rewardsData)
    }


    // // Add strategies and then 
    // // Add a null strategy for each asset
    // // Hardhat forks require 10 as chainID
    // await addNullStrategy("NullUSDCOptimism", 1, usdc.address, 0, 10);
    // await addNullStrategy("NullAGEUROptimism", 2, ageur.address, 1, 10);
    // await addNullStrategy("NullWETHOptimism", 3, weth.address, 2, 10);
    // await addNullStrategy("NullWBTCOptimism", 4, wbtc.address, 3, 10);

    // // Then for polygon 
    // // The token addresses dont matter because the chainID will filter irrelevant strategies out
    // await addNullStrategy("NullUSDCPolygon", 5, usdc.address, 0, 137);
    // await addNullStrategy("NullAGEURPolygon", 6, ageur.address, 1, 137);
    // await addNullStrategy("NullWETHPolygon", 7, usdc.address, 2, 137);
    // await addNullStrategy("NullWBTCPolygon", 8, usdc.address, 3, 137);

    // // Add omnivault strategies
    // await addOmnivaultStrategy("TopUSDYearnOmnivaultOptimism", 9, "0x306Df6b5D50abeD3f7bCbe7399C4b8e6BD55cB81", usdc.address, 0, 10);
    // await addOmnivaultStrategy("TopUSDBeefyOmnivaultOptimism", 10, "0xAf332f4d7A82854cB4B6345C4c133eC60c4eAd87", usdc.address, 0, 10);

    // Add omnivault strategies
    // "Alluo/Yearn TopOmnivaultUSD - 7.64%",
    // "Alluo/Yearn Top3OmnivaultUSD - 8.03%",
    // "Alluo/Beefy TopOmnivaultUSD - 22.60%",
    // "Alluo/Beefy Top3OmnivaultUSD - 17.03%"
    // "Alluo/Yearn TopOmnivaultETH - 4.53%",
    // "Alluo/Yearn Top3OmnivaultETH - 4.53%",
    // "Alluo/Beefy TopOmnivaultETH - 9.13%",
    // "Alluo/Beefy Top3OmnivaultETH - 8.91%"
    await addOmnivaultStrategy("Alluo/Yearn TopOmnivaultUSD", 11, "0x306Df6b5D50abeD3f7bCbe7399C4b8e6BD55cB81", usdc.address, 0, 10);
    await addOmnivaultStrategy("Alluo/Yearn Top3OmnivaultUSD", 12, "0x2682c8057426FE5c462237eb3bfcfEDFb9539004", usdc.address, 0, 10);
    await addOmnivaultStrategy("Alluo/Beefy TopOmnivaultUSD", 13, "0xAf332f4d7A82854cB4B6345C4c133eC60c4eAd87", usdc.address, 0, 10);
    await addOmnivaultStrategy("Alluo/Beefy Top3OmnivaultUSD", 14, "0x75862d2fEdb1c6a9123F3b5d5E36D614570B404d", usdc.address, 0, 10);

    // Add eth strategies
    await addOmnivaultStrategy("Alluo/Yearn TopOmnivaultETH", 15, "0x4eC3177F5c2500AAABE56DDbD8907d41d17Fc2E9", weth.address, 2, 10);
    await addOmnivaultStrategy("Alluo/Yearn Top3OmnivaultETH", 16, "0xDd7ebC54b851E629E61bc49DFcAed41C13fc67Da", weth.address, 2, 10);
    await addOmnivaultStrategy("Alluo/Beefy TopOmnivaultETH", 17, "0xA430432eEf5C062D34e4078540b91C2ec7DBe0c9", weth.address, 2, 10);
    await addOmnivaultStrategy("Alluo/Beefy Top3OmnivaultETH", 18, "0x2EC847395B6247Ab72b7B37432989f4547A0e947", weth.address, 2, 10);
    await alluoStrategyHandler.setLastDirectionId(18);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

//npx hardhat run scripts/deploy/deployHandler.ts --network polygon
//npx hardhat verify 0xb647c6fe9d2a6e7013c7e0924b71fa7926b2a0a3 --network polygon