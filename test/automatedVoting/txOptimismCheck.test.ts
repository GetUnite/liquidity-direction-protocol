import { ethers, upgrades } from "hardhat";
import { AlluoStrategyHandler, AlluoVoteExecutor, AlluoVoteExecutorUtils, BeefyStrategy, BeefyStrategyUniversal, ExchangePriceOracle, ExchangePriceOracle__factory, IBeefyBoost, IBeefyVaultV6, IERC20, IERC20Metadata, IExchange, IPriceFeedRouter, IPriceFeedRouterV2, ISpokePoolNew, IWrappedEther, LiquidityHandler, NullStrategy, OmnivaultStrategy, PseudoMultisigWallet } from "../../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { mine, reset, loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { LiquidityHandlerCurrent, SpokePoolMock } from "../../typechain";

describe("AlluoVoteExecutor Tests", function () {
    let alluoVoteExecutor: AlluoVoteExecutor;
    let alluoStrategyHandler: AlluoStrategyHandler;
    let alluoVoteExecutorUtils: AlluoVoteExecutorUtils;
    let signers: SignerWithAddress[];
    let admin: SignerWithAddress;
    let spokePool: string;
    let _recipient: string;
    let _recipientChainId: string;
    let _relayerFeePct: number;
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

    async function instantiateExistingSetup() {
        // await reset(process.env.OPTIMISM_URL, 106864451);
        await reset(process.env.OPTIMISM_URL);

        admin = await ethers.getImpersonatedSigner("0xc7061dD515B602F86733Fa0a0dBb6d6E6B34aED4")

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
    }
    async function setupContracts() {
        alluoVoteExecutor = await ethers.getContractAt("AlluoVoteExecutor", "0x3DC877A5a211a082E7c2D64aa816dd079b50AddB") as AlluoVoteExecutor;
        alluoVoteExecutorUtils = await ethers.getContractAt("AlluoVoteExecutorUtils", "0xDD9FC096606Ca0a3D8Be9178959f492c9C23966F") as AlluoVoteExecutorUtils;
        alluoStrategyHandler = await ethers.getContractAt("AlluoStrategyHandler", "0xca3708D709f1324D21ad2C0fb551CC4a0882FD29") as AlluoStrategyHandler;
        beefyStrategy = await ethers.getContractAt("BeefyStrategyUniversal", "0x525b00E7a3c26948fD9FEA341D9488Cd6aE3C935") as BeefyStrategyUniversal;
        nullStrategy = await ethers.getContractAt("NullStrategy", "0xc98c8E8fb3Bd0BB029547495DC2AA4185FB807c2") as NullStrategy;
        omnivaultStrategy = await ethers.getContractAt("OmnivaultStrategy", "0xdA32d82e3b5275424F130612797aDc6EFaB06515") as OmnivaultStrategy;

    }


    async function addOmnivaultStrategy(strategyName: string, directionId: number, omnivaultAddress: string, primaryToken: string, assetId: number, chainId: number,) {
        let entryData = await omnivaultStrategy.encodeData(omnivaultAddress, assetId, primaryToken);
        let exitData = entryData;
        let rewardsData = entryData;
        await alluoStrategyHandler.connect(admin).setLiquidityDirection(strategyName, directionId, omnivaultStrategy.address, primaryToken, assetId, chainId, entryData, exitData, rewardsData)
    }


    async function addNullStrategy(strategyName: string, directionId: number, primaryToken: string, assetId: number, chainId: number,) {
        let entryData = await nullStrategy.encodeData(assetId, primaryToken);
        let exitData = entryData;
        let rewardsData = entryData;
        await alluoStrategyHandler.connect(admin).setLiquidityDirection(strategyName, directionId, nullStrategy.address, primaryToken, assetId, chainId, entryData, exitData, rewardsData)
    }

    async function addBeefyStrategy(strategyName: string, directionId: number, beefyVaultAddress: string, beefyBoostAddress: string, primaryToken: string, entryToken: string, rewardTokensArray: string[], assetId: number, chainId: number,) {
        rewardTokensArray.forEach(async (tokenAddress: string) => {
            await beefyStrategy.connect(admin).changeExpectedRewardStatus(tokenAddress, true);
        });

        let entryData = await beefyStrategy.encodeData(beefyVaultAddress, beefyBoostAddress, 2, entryToken)
        let exitData = entryData;
        let rewardsData = entryData;

        await alluoStrategyHandler.connect(admin).setLiquidityDirection(strategyName, directionId, nullStrategy.address, primaryToken, assetId, chainId, entryData, exitData, rewardsData)
    }

    describe("Integration test to confirm deployment details", async function () {


        beforeEach(async function () {
            await loadFixture(instantiateExistingSetup);
            await loadFixture(setupContracts);

        })
        it("Check", async function () {
            // Upgrade the contract
            // Send some eth to admin 
            let signers = await ethers.getSigners();
            await signers[0].sendTransaction({ to: admin.address, value: ethers.utils.parseEther("1") })
            await alluoVoteExecutorUtils.connect(admin).grantRole(await alluoVoteExecutorUtils.UPGRADER_ROLE(), admin.address);
            await alluoVoteExecutorUtils.connect(admin).changeUpgradeStatus(true);
            let newImp = await (await ethers.getContractFactory("AlluoVoteExecutorUtils")).deploy();
            await alluoVoteExecutorUtils.connect(admin).upgradeTo(newImp.address);

            let caller = await ethers.getImpersonatedSigner("0xc5f1e9424217802880ac62cd24f8103e3017134d")
            await alluoVoteExecutorUtils.connect(admin).setUniversalExecutorBalances([[ethers.utils.parseEther("1010"), 0, 329890000000000, 0], [ethers.utils.parseEther("10"), 0, 0, 0]])

            // Encode the data:

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

            // let vote1 = await alluoVoteExecutorUtils.encodeLiquidityCommand("NullUSDCPolygon", 10000, 1)
            // let vote2 = await alluoVoteExecutorUtils.encodeLiquidityCommand("NullUSDCOptimism", 0, 0)
            // let encodedVotes = await alluoVoteExecutorUtils.encodeAllMessages([vote1[0], vote2[0]], [vote1[1], vote2[1]])
            // let messageHash = encodedVotes.messagesHash;

            // console.log("This is the messages hash", messageHash)
            // console.log("This is the raw data", encodedVotes.inputData)
            // await alluoVoteExecutor.submitData(encodedVotes.inputData);



            let vote3 = await alluoVoteExecutorUtils.encodeLiquidityCommand("NullUSDCPolygon", 0, 1)
            let vote4 = await alluoVoteExecutorUtils.encodeLiquidityCommand("NullUSDCOptimism", 1000, 0)
            let vote5 = await alluoVoteExecutorUtils.encodeLiquidityCommand("TopUSDYearnOmnivaultOptimism", 9000, 0)
            let encodedVotes2 = await alluoVoteExecutorUtils.encodeAllMessages([vote3[0], vote4[0], vote5[0]], [vote3[1], vote4[1], vote5[1]])
            let messageHash2 = encodedVotes2.messagesHash;

            console.log("This is the messages hash 2", messageHash2)
            console.log("This is the raw data 2", encodedVotes2.inputData)

            // await alluoVoteExecutor.submitData(encodedVotes2.inputData);

        })


    })

})

// npx hardhat test test/automatedVoting/fullSetupOptimism.test.ts