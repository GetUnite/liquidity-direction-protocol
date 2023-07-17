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
        await reset(process.env.OPTIMISM_URL, 102871832);

        admin = await ethers.getImpersonatedSigner("0x2580f9954529853Ca5aC5543cE39E9B5B1145135")

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
    }
    async function setupContracts() {

        // Send some eth to the admin
        await signers[0].sendTransaction({ to: admin.address, value: ethers.utils.parseEther("1") })

        // Deploy VoteExecutorUtils
        // 
        let utilsFactory = await ethers.getContractFactory("AlluoVoteExecutorUtils");
        alluoVoteExecutorUtils = (await upgrades.deployProxy(utilsFactory, [
            ethers.constants.AddressZero,
            ethers.constants.AddressZero,
            admin.address
        ], {
            initializer: "initialize"
        })) as AlluoVoteExecutorUtils;



        // Bridging information
        spokePool = "0x9295ee1d8C5b022Be115A2AD3c30C72E34e7F096"
        _recipient = "0xa420b2d1c0841415A695b81E5B867BCD07Dff8C9"
        _recipientChainId = "10";
        _relayerFeePct = 1000000000;
        _slippageTolerance = 100;

        // Deploy StrategyHandler
        let strategyHandlerFactory = await ethers.getContractFactory("AlluoStrategyHandler");
        alluoStrategyHandler = (await upgrades.deployProxy(strategyHandlerFactory, [admin.address, spokePool, _recipient, _recipientChainId, _relayerFeePct, _slippageTolerance, _exchange.address, alluoVoteExecutorUtils.address])) as AlluoStrategyHandler;

        await alluoStrategyHandler.connect(admin).changeNumberOfAssets(4);
        await alluoStrategyHandler.connect(admin).setTokenToAssetId(usdc.address, 0);
        await alluoStrategyHandler.connect(admin).setTokenToAssetId(ageur.address, 1);
        await alluoStrategyHandler.connect(admin).setTokenToAssetId(weth.address, 2);
        await alluoStrategyHandler.connect(admin).setTokenToAssetId(wbtc.address, 3);

        // Now deploy AlluoVoteExecutor
        let voteExecutorFactory = await ethers.getContractFactory("AlluoVoteExecutor");

        alluoVoteExecutor = (await upgrades.deployProxy(voteExecutorFactory, [
            admin.address, _exchange.address, priceRouter.address, liquidityHandler.address, alluoStrategyHandler.address, "0xc22DB2874725B84e99EC0a644fdD042EA3F6F899", alluoVoteExecutorUtils.address, "0xdEBbFE665359B96523d364A19FceC66B0E43860D", 86400, 1, true
        ])) as AlluoVoteExecutor;

        // Bridging fee is to be paid of 40% of the bridging amount to improve circulation and prevent funds from piling in one chain
        await alluoVoteExecutor.connect(admin).setAcrossInformation(spokePool, ethers.utils.parseEther("0.4"))

        // To be 3 dollars
        await alluoVoteExecutor.connect(admin).setFeeInformation(usdt.address, 1, 3000000);
        await alluoVoteExecutor.connect(admin).setFeeInformation(usdt.address, 10, 3000000);
        await alluoVoteExecutor.connect(admin).setFeeInformation(usdt.address, 31337, 3000000);

        await alluoStrategyHandler.connect(admin).grantRole(await alluoStrategyHandler.DEFAULT_ADMIN_ROLE(), alluoVoteExecutor.address);
        await alluoStrategyHandler.connect(admin).grantRole(await alluoStrategyHandler.DEFAULT_ADMIN_ROLE(), alluoVoteExecutorUtils.address);

        await alluoVoteExecutorUtils.connect(admin).setStorageAddresses(alluoStrategyHandler.address, alluoVoteExecutor.address);

        // Also the voteExecutor should approve each primary token to the utils contract, so it can bridge funds
        let approve = usdc.interface.encodeFunctionData("approve", [alluoVoteExecutorUtils.address, ethers.constants.MaxUint256]);
        await alluoVoteExecutor.connect(admin).multicall([usdc.address, weth.address, wbtc.address, ageur.address], [approve, approve, approve, approve]);

        // Same for the strategyHandler so it can pull funds for deposits
        let approve2 = usdc.interface.encodeFunctionData("approve", [alluoStrategyHandler.address, ethers.constants.MaxUint256]);
        await alluoVoteExecutor.connect(admin).multicall([usdc.address, weth.address, wbtc.address, ageur.address], [approve2, approve2, approve2, approve2]);


    }

    async function deployStrategyContracts() {
        let beefyStrategyFactory = await ethers.getContractFactory("BeefyStrategy");
        beefyStrategy = await upgrades.deployProxy(
            beefyStrategyFactory,
            [
                admin.address,
                alluoVoteExecutor.address,
                alluoStrategyHandler.address,
                priceRouter.address,
                _exchange.address,
                weth.address
            ],
            { kind: 'uups' }
        ) as BeefyStrategyUniversal;


        let nullStrategyFactory = await ethers.getContractFactory("NullStrategy");
        nullStrategy = await upgrades.deployProxy(
            nullStrategyFactory,
            [admin.address, alluoVoteExecutor.address, alluoStrategyHandler.address, priceRouter.address, _exchange.address],
            { kind: 'uups' }
        ) as NullStrategy;


        let omnivaultStrategyFactory = await ethers.getContractFactory("OmnivaultStrategy");
        omnivaultStrategy = await upgrades.deployProxy(
            omnivaultStrategyFactory,
            [admin.address, alluoVoteExecutor.address, alluoStrategyHandler.address, priceRouter.address, _exchange.address, 100]
        ) as OmnivaultStrategy;
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

})

