
import { ethers, upgrades } from "hardhat";
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
    admin = await ethers.getSigner("0xc7061dD515B602F86733Fa0a0dBb6d6E6B34aED4")

    signers = await ethers.getSigners();

    _exchange = await ethers.getContractAt(
        "contracts/interfaces/IExchange.sol:IExchange",
        "0x66Ac11c106C3670988DEFDd24BC75dE786b91095"
    ) as IExchange;

    priceRouter = await ethers.getContractAt("contracts/interfaces/IPriceFeedRouterV2.sol:IPriceFeedRouterV2", "0x7E6FD319A856A210b9957Cd6490306995830aD25") as IPriceFeedRouterV2;

    weth = await ethers.getContractAt(
        "contracts/interfaces/IWrappedEther.sol:IWrappedEther",
        "0x4200000000000000000000000000000000000006"
    ) as IWrappedEther;

    usdc = await ethers.getContractAt(
        "IERC20Metadata",
        "0x7f5c764cbc14f9669b88837ca1490cca17c31607") as IERC20Metadata;


    wbtc = await ethers.getContractAt("IERC20Metadata", "0x68f180fcCe6836688e9084f035309E29Bf0A2095");

    ageur = await ethers.getContractAt("IERC20Metadata", "0x9485aca5bbBE1667AD97c7fE7C4531a624C8b1ED");

    usdt = await ethers.getContractAt("IERC20Metadata", "0x94b008aA00579c1307B0EF2c499aD98a8ce58e58");

    liquidityHandler = await ethers.getContractAt("LiquidityHandlerCurrent", "0x937F7125994a91d5E2Ce31846b97578131056Bb4") as unknown as LiquidityHandlerCurrent;

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


}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

//npx hardhat run scripts/deploy/deployHandler.ts --network polygon
//npx hardhat verify 0xb647c6fe9d2a6e7013c7e0924b71fa7926b2a0a3 --network polygon
