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
        spokePool = "0x6f26Bf09B1C792e3228e5467807a900A503c0281"
        _recipient = "0xa420b2d1c0841415A695b81E5B867BCD07Dff8C9"
        _recipientChainId = "1";
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

        await alluoStrategyHandler.connect(admin).changeAssetInfo(0, [1, 137, 31337], [usdc.address, usdc.address, usdc.address], "0x6b55495947F3793597C0777562C37C14cb958097");
        await alluoStrategyHandler.connect(admin).changeAssetInfo(1, [1, 137, 31337], [ageur.address, ageur.address, ageur.address], usdc.address);
        await alluoStrategyHandler.connect(admin).changeAssetInfo(2, [1, 137, 31337], [weth.address, weth.address, weth.address], "0x8BF24fea0Cae18DAB02A5b23c409E8E1f04Ff0ba");
        await alluoStrategyHandler.connect(admin).changeAssetInfo(3, [1, 137, 31337], [wbtc.address, wbtc.address, wbtc.address], "0x253eB6077db17a43Fd7b4f4E6e5a2D8b2F9A244d");

        // Now deploy AlluoVoteExecutor
        let voteExecutorFactory = await ethers.getContractFactory("AlluoVoteExecutor");

        alluoVoteExecutor = (await upgrades.deployProxy(voteExecutorFactory, [
            admin.address, _exchange.address, priceRouter.address, liquidityHandler.address, alluoStrategyHandler.address, "0xc22DB2874725B84e99EC0a644fdD042EA3F6F899", alluoVoteExecutorUtils.address, "0xdEBbFE665359B96523d364A19FceC66B0E43860D", 86400, 1, true
        ])) as AlluoVoteExecutor;

        // Bridging fee is to be paid of 40% of the bridging amount to improve circulation and prevent funds from piling in one chain
        await alluoVoteExecutor.connect(admin).setAcrossInformation(spokePool, ethers.utils.parseEther("0.4"))

        // To be 3 dollars
        await alluoVoteExecutor.connect(admin).setFeeInformation(usdt.address, 1, 3000000);
        await alluoVoteExecutor.connect(admin).setFeeInformation(usdt.address, 137, 3000000);
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

        // Set utils

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

    describe("Integration test to confirm deployment details", async function () {

        async function loadStrategies() {
            // Add a null strategy for each asset
            // Hardhat forks require 31337 as chainID
            await addNullStrategy("NullUSDCOptimism", 1, usdc.address, 0, 31337);
            await addNullStrategy("NullAGEUROptimism", 2, ageur.address, 1, 31337);
            await addNullStrategy("NullWETHOptimism", 3, weth.address, 2, 31337);
            await addNullStrategy("NullWBTCOptimism", 4, wbtc.address, 3, 31337);

            // Then for polygon 
            // The token addresses dont matter because the chainID will filter irrelevant strategies out
            await addNullStrategy("NullUSDCPolygon", 5, usdc.address, 0, 137);
            await addNullStrategy("NullAGEURPolygon", 6, ageur.address, 1, 137);
            await addNullStrategy("NullWETHPolygon", 7, usdc.address, 2, 137);
            await addNullStrategy("NullWBTCPolygon", 8, usdc.address, 3, 137);

            // Add omnivault strategies
            await addOmnivaultStrategy("TopUSDYearnOmnivaultOptimism", 9, "0x306Df6b5D50abeD3f7bCbe7399C4b8e6BD55cB81", usdc.address, 0, 31337);
            await addOmnivaultStrategy("TopUSDBeefyOmnivaultOptimism", 10, "0xAf332f4d7A82854cB4B6345C4c133eC60c4eAd87", usdc.address, 0, 31337);
            await alluoStrategyHandler.connect(admin).setLastDirectionId(10);

            // Send some crosschain usdt balance
            await _exchange.connect(signers[2]).exchange("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", usdt.address, ethers.utils.parseEther("0.01"), 0, { value: ethers.utils.parseEther("0.01") })
            let usdtBal = await usdt.balanceOf(signers[2].address);
            await usdt.connect(signers[2]).transfer(alluoVoteExecutor.address, usdtBal);

            await alluoVoteExecutor.connect(admin).setMinSigns(0);
        }

        async function depositStartingCapitalIntoNullStrategies() {
            // Fake a 100 eth deposit into this current chain
            // Let signer1 get some usdc through the exchange
            await _exchange.connect(signers[1]).exchange("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", usdc.address, ethers.utils.parseEther("100"), 0, { value: ethers.utils.parseEther("100") })
            let usdcBalance = await usdc.balanceOf(signers[1].address);
            await usdc.connect(signers[1]).transfer(nullStrategy.address, usdcBalance)
            let directionData = await alluoStrategyHandler.liquidityDirection(1);
            // Deposit through the strategy (should do nothing actually)
            await nullStrategy.connect(admin).invest(directionData.entryData, usdcBalance)

            // Add to active directions

            await alluoStrategyHandler.connect(admin).addToActiveDirections(1);

            // Convert to 10^18 precision
            let conversionFactor = ethers.BigNumber.from(10).pow(12);
            let convertedBalance = usdcBalance.mul(conversionFactor);
            // Fake that TVL call was executed
            await alluoVoteExecutorUtils.connect(admin).setExecutorInternalIds([0, 1, 2], [alluoVoteExecutor.address, signers[9].address, signers[10].address], [0, 1, 137]);
            await alluoVoteExecutorUtils.connect(admin).setUniversalExecutorBalances([[convertedBalance, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]);
            await alluoVoteExecutorUtils.connect(admin).setCrossChainInformation(signers[0].address, signers[1].address, signers[2].address, 99, 1 /*Important param here, next chainid*/, 10, 3, 0)
        }
        // async function simulateVoteSubmission()
        beforeEach(async function () {
            await loadFixture(instantiateExistingSetup);
            await loadFixture(setupContracts);
            await loadFixture(deployStrategyContracts);
            await loadFixture(loadStrategies);
            await loadFixture(depositStartingCapitalIntoNullStrategies)

        })
        it("Withdraw from null strategy and deposit all into the omnivault", async function () {
            // Should withdraw from null strategy and dump it into the yearn vault
            let encodedCommand1 = await alluoVoteExecutorUtils.encodeLiquidityCommand("TopUSDYearnOmnivaultOptimism", 10000, 0)
            let encodedCommand2 = await alluoVoteExecutorUtils.encodeLiquidityCommand("NullUSDCOptimism", 0, 0)

            let allEncoded = await alluoVoteExecutorUtils.encodeAllMessages([encodedCommand1[0], encodedCommand2[0],], [encodedCommand1[1], encodedCommand2[1]]);
            await alluoVoteExecutor.connect(admin).submitData(allEncoded.inputData);

            await alluoVoteExecutor.connect(admin).executeSpecificData(0);
            await alluoVoteExecutor.connect(admin).executeQueuedDeposits(0);

            let balanceHeldByExecutor = await usdc.balanceOf(alluoVoteExecutor.address);
            let balanceHeldByNullDirection = await alluoStrategyHandler.markDirectionToMarket(1);
            let balanceHeldByOmnivault = await alluoStrategyHandler.markDirectionToMarket(9);
            let totalAssetValue = await alluoStrategyHandler.markAssetToMarket(0);

            expect(balanceHeldByExecutor).to.equal(0);
            expect(balanceHeldByNullDirection).to.equal(0);
            expect(balanceHeldByOmnivault).to.be.greaterThan(0);
            expect(totalAssetValue).to.equal(balanceHeldByOmnivault);
        })

        it("Withdraw from null strategy and deposit all into the omnivault, then put it back all into then null strategy", async function () {
            // Should withdraw from null strategy and dump it into the yearn vault
            let encodedCommand1 = await alluoVoteExecutorUtils.encodeLiquidityCommand("TopUSDYearnOmnivaultOptimism", 10000, 0)
            let encodedCommand2 = await alluoVoteExecutorUtils.encodeLiquidityCommand("NullUSDCOptimism", 0, 0)

            let allEncoded = await alluoVoteExecutorUtils.encodeAllMessages([encodedCommand1[0], encodedCommand2[0],], [encodedCommand1[1], encodedCommand2[1]]);
            await alluoVoteExecutor.connect(admin).submitData(allEncoded.inputData);

            await alluoVoteExecutor.connect(admin).executeSpecificData(0);
            await alluoVoteExecutor.connect(admin).executeQueuedDeposits(0);


            // Should withdraw from null strategy and dump it into the yearn vault
            let encodedCommand3 = await alluoVoteExecutorUtils.encodeLiquidityCommand("TopUSDYearnOmnivaultOptimism", 0, 0)
            let encodedCommand4 = await alluoVoteExecutorUtils.encodeLiquidityCommand("NullUSDCOptimism", 10000, 0)
            let allEncoded2 = await alluoVoteExecutorUtils.encodeAllMessages([encodedCommand3[0], encodedCommand4[0],], [encodedCommand3[1], encodedCommand4[1]]);
            await alluoVoteExecutor.connect(admin).submitData(allEncoded2.inputData);


            await alluoVoteExecutor.connect(admin).executeSpecificData(1);
            await alluoVoteExecutor.connect(admin).executeQueuedDeposits(0);

            let balanceHeldByExecutor = await usdc.balanceOf(alluoVoteExecutor.address);
            let balanceHeldByNullDirection = await alluoStrategyHandler.markDirectionToMarket(1);
            let balanceHeldByOmnivault = await alluoStrategyHandler.markDirectionToMarket(9);
            let totalAssetValue = await alluoStrategyHandler.markAssetToMarket(0);

            expect(balanceHeldByExecutor).to.equal(0);
            expect(balanceHeldByOmnivault).to.equal(0);
            expect(balanceHeldByNullDirection).to.be.greaterThan(0);
            expect(totalAssetValue).to.equal(balanceHeldByNullDirection);
        })

    })

})

// npx hardhat test test/automatedVoting/fullSetupOptimism.test.ts