import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { AlluoStrategyHandler, AlluoVoteExecutorUtils, BeefyStrategy, IAlluoOmnivault, IBeefyBoost, IBeefyVaultV6, IERC20, IERC20Metadata, IExchange, IPriceFeedRouter, IPriceFeedRouterV2, ISpokePoolNew, IWrappedEther, OmnivaultStrategy, PseudoMultisigWallet } from "../../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { mine, reset, loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { BigNumberish } from "ethers";

describe("AlluoStrategyHandler Tests", function () {
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
    let _voteExecutorUtils: string;
    let priceRouter: IPriceFeedRouterV2;
    let weth: IWrappedEther;
    let usdc: IERC20Metadata;
    let ldo: IERC20Metadata;

    let omnivault: IAlluoOmnivault
    let omnivaultStrategy: OmnivaultStrategy;


    async function setupContracts() {
        // Test on optimism
        await reset(process.env.OPTIMISM_URL, 106554292);

        signers = await ethers.getSigners();
        admin = await ethers.getImpersonatedSigner("0xc7061dD515B602F86733Fa0a0dBb6d6E6B34aED4")
        let pseudoMultiSigFactory = await ethers.getContractFactory("PseudoMultisigWallet");
        let pseudoMultiSig = await pseudoMultiSigFactory.deploy(true)
        admin = await ethers.getImpersonatedSigner(pseudoMultiSig.address)
        // Send some eth to the admin
        await signers[0].sendTransaction({ to: admin.address, value: ethers.utils.parseEther("1") })
        let strategyHandlerFactory = await ethers.getContractFactory("AlluoStrategyHandler");

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

        spokePool = "0x6f26Bf09B1C792e3228e5467807a900A503c0281"
        //Temp just for simulation
        _recipient = "0xa420b2d1c0841415A695b81E5B867BCD07Dff8C9"
        _recipientChainId = "1";
        _relayerFeePct = 0;
        _slippageTolerance = 150;

        let utilsFactory = await ethers.getContractFactory("AlluoVoteExecutorUtils");
        alluoVoteExecutorUtils = (await upgrades.deployProxy(utilsFactory, [
            ethers.constants.AddressZero,
            ethers.constants.AddressZero,
            admin.address
        ], {
            initializer: "initialize"
        })) as AlluoVoteExecutorUtils;

        alluoStrategyHandler = (await upgrades.deployProxy(strategyHandlerFactory, [admin.address, spokePool, _recipient, _recipientChainId, _relayerFeePct, _slippageTolerance, _exchange.address, alluoVoteExecutorUtils.address])) as AlluoStrategyHandler;

        await alluoVoteExecutorUtils.connect(admin).setStorageAddresses(alluoStrategyHandler.address, ethers.constants.AddressZero)

    }

    async function additionalSetup() {
        let omnivaultStrategyFactory = await ethers.getContractFactory("OmnivaultStrategy");
        omnivault = await ethers.getContractAt("IAlluoOmnivault", "0x75862d2fEdb1c6a9123F3b5d5E36D614570B404d") as IAlluoOmnivault;
        omnivaultStrategy = await upgrades.deployProxy(
            omnivaultStrategyFactory,
            [
                admin.address,
                ethers.constants.AddressZero,
                alluoStrategyHandler.address,
                priceRouter.address,
                _exchange.address,
                100
            ],
            { kind: 'uups' }
        ) as OmnivaultStrategy;
        let entryData = await omnivaultStrategy.encodeData(omnivault.address, 2, usdc.address);
        let exitData = entryData;
        let rewardsData = entryData;
        await alluoStrategyHandler.connect(admin).setLiquidityDirection("OmnivaultTop3Strategy", 1, omnivaultStrategy.address, usdc.address, 2, 10, entryData, exitData, rewardsData);

        // await alluoStrategyHandler.connect(admin).setLiquidityDirection("BeefyETHStrategy2", 2, beefyStrategy.address, weth.address, 2, 10, entryData, exitData, rewardsData);

        await alluoStrategyHandler.connect(admin).addToActiveDirections(1);
        await alluoStrategyHandler.connect(admin).changeAssetInfo(2, [31337], [weth.address], usdc.address);
    }

    async function depositIntoStrategy() {
        // Let signer1 get some usdc through the exchange
        await _exchange.connect(signers[1]).exchange("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", usdc.address, ethers.utils.parseEther("10"), 0, { value: ethers.utils.parseEther("10") })

        // Deposit some usdc through the strategyFirst
        let signerBalanceUsdc = await usdc.balanceOf(signers[1].address);
        await usdc.connect(signers[1]).transfer(omnivaultStrategy.address, signerBalanceUsdc)
        let directionData = await alluoStrategyHandler.liquidityDirection(1);
        // Deposit through the strategy
        await omnivaultStrategy.connect(admin).invest(directionData.entryData, signerBalanceUsdc)
    }
    beforeEach(async () => {
        await loadFixture(setupContracts);
        await loadFixture(additionalSetup);

    });

    describe("Unit tests for Omnivault", async () => {
        let ETHValueInUSDC: BigNumberish;
        async function getFunds() {
            let usdcBalanceBefore = await usdc.balanceOf(signers[1].address)
            await _exchange.connect(signers[1]).exchange("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", usdc.address, ethers.utils.parseEther("10"), 0, { value: ethers.utils.parseEther("10") })
            let additionalUSDC = (await usdc.balanceOf(signers[1].address)).sub(usdcBalanceBefore);
            ETHValueInUSDC = additionalUSDC.div(10)
        }
        beforeEach(async () => {
            // Signer 1 gets a bunch of usdc first

            await loadFixture(getFunds)
        })
        it.only("Depositing 1k usdc should return approx 1k through getDeployedAmount", async () => {
            await usdc.connect(signers[1]).transfer(omnivaultStrategy.address, ethers.utils.parseUnits("15000", 6))
            let directionData = await alluoStrategyHandler.liquidityDirection(1);
            await omnivaultStrategy.connect(admin).invest(directionData.entryData, ethers.utils.parseUnits("15000", 6))

            let balanceViewed = await omnivaultStrategy.getDeployedAmount(directionData.entryData);
            // This is in ETH, convert this to usdc
            let balanceInUSDC = ethers.utils.formatUnits(balanceViewed.mul(ETHValueInUSDC), 24)
            console.log("bababa", balanceInUSDC);

            // Now withdraw 100%
            let signerBalanceUsdcBefore = await usdc.balanceOf(signers[1].address);
            await omnivaultStrategy.connect(admin).exitAll(directionData.entryData, 10000, usdc.address, signers[1].address, true, true);
            let signerBalanceUsdcAfter = await usdc.balanceOf(signers[1].address);
            console.log(ethers.utils.formatUnits(signerBalanceUsdcAfter.sub(signerBalanceUsdcBefore), 6))
        })
    })

    describe("Main liquidity direction functions", async () => {
        beforeEach(async () => {
            await loadFixture(depositIntoStrategy);
        })
        it("Should mark asset to market correctly", async () => {

            // Once it has invested, we can mark it to market
            let markedToMarket = await alluoStrategyHandler.connect(admin).markAssetToMarket(2);
            console.log(markedToMarket, "marked");
            expect(Number(markedToMarket)).to.be.greaterThan(0);

        })
        it("Should mark direction specifically to market (should do the same as above as there is only 1)", async () => {


            // Once it has invested, we can mark it to market
            let markedToMarketDirection = await alluoStrategyHandler.connect(admin).markDirectionToMarket(1);
            let markedToMarketAsset = await alluoStrategyHandler.connect(admin).markAssetToMarket(2);
            console.log(markedToMarketAsset, markedToMarketDirection, "marked");
            expect(Number(markedToMarketDirection)).to.be.greaterThan(0);
            expect(markedToMarketAsset).to.equal(markedToMarketDirection)
        })

        it("RebalanceUntilTarget, for percentage 0 should withdraw all", async () => {
            let wethBalanceOfAdminBefore = await weth.balanceOf(admin.address);
            await alluoStrategyHandler.connect(admin).rebalanceUntilTarget(2, 1, 0, ethers.utils.parseEther("10000")) // TVL doesnt matter when doing a 0% rebalance
            let wethBalanceOfAdminAfter = await weth.balanceOf(admin.address);
            let balanceTransferred = wethBalanceOfAdminAfter.sub(wethBalanceOfAdminBefore);

            console.log("Balance transferred", balanceTransferred.toString())
            expect(balanceTransferred).to.be.greaterThan(0);
        })

        it("RebalanceUntilTarget, for a certain percentage, should queue a deposit", async () => {
            await alluoStrategyHandler.connect(admin).rebalanceUntilTarget(2, 1, 10000, ethers.utils.parseEther("10000")) // TVL doesnt matter when doing a 0% rebalance
            let depositQueue = await alluoStrategyHandler.assetIdToDepositQueue(2);
            // Something is strange with ethers and how it handles this struct in this mapping
            expect(depositQueue).to.be.greaterThan(ethers.utils.parseEther("10"))
        })


        it("A queued deposit should be executed successfully", async () => {
            let oldMarkedToMarketBalanceOfStrategy = await alluoStrategyHandler.connect(admin).markAssetToMarket(2);
            await alluoStrategyHandler.connect(admin).rebalanceUntilTarget(2, 1, 10000, ethers.utils.parseEther("11")) // Total tvl is 11 eth, there is 10 ethish in the strategy
            let depositQueue = await alluoStrategyHandler.assetIdToDepositQueue(2);
            console.log("Deposit queue value", depositQueue.toString())
            // Send some weth to the 'caller' who is the admin (but is supposed to be the voteExecutorMaster)
            await weth.connect(signers[1]).deposit({ value: depositQueue })
            await weth.connect(signers[1]).transfer(admin.address, depositQueue)
            await weth.connect(admin).approve(alluoStrategyHandler.address, ethers.constants.MaxUint256);
            // Now executeQueuedDeposits
            await alluoStrategyHandler.connect(admin).executeQueuedDeposits(2);
            expect(await weth.balanceOf(alluoStrategyHandler.address)).is.closeTo("0", ethers.utils.parseEther("0.001"))
            let newMarkedToMarketBalanceOfStrategy = await alluoStrategyHandler.connect(admin).markAssetToMarket(2);
            console.log("Difference between old and new", newMarkedToMarketBalanceOfStrategy.sub(oldMarkedToMarketBalanceOfStrategy).toString())
            expect(newMarkedToMarketBalanceOfStrategy).to.be.greaterThan(oldMarkedToMarketBalanceOfStrategy);
        })

        it("A queued deposit should be reverted if there is too much difference between the total deposit amount and funds held by the caller", async () => {
            await alluoStrategyHandler.connect(admin).rebalanceUntilTarget(2, 1, 10000, ethers.utils.parseEther("11")) // Total tvl is 11 eth, there is 10 ethish in the strategy.
            // Deposit of 1eth ish queued.
            await expect(alluoStrategyHandler.connect(admin).executeQueuedDeposits(2)).to.be.revertedWith("Not enough funds")
        })

        it("A queued deposit should be accessed using getAssetIdToDepositQueue", async () => {
            let depositQueue = await alluoStrategyHandler.connect(admin).getAssetIdToDepositQueue(2);
            expect(depositQueue.length).to.equal(0);
            await alluoStrategyHandler.connect(admin).rebalanceUntilTarget(2, 1, 10000, ethers.utils.parseEther("11")) // Total tvl is 11 eth, there is 10 ethish in the strategy.
            // Deposit of 1eth ish queued.
            depositQueue = await alluoStrategyHandler.connect(admin).getAssetIdToDepositQueue(2);
            expect(depositQueue.length).to.equal(1);
        })

        it("A queue of deposits should be wiped with clearDepositQueue", async () => {
            await alluoStrategyHandler.connect(admin).rebalanceUntilTarget(2, 1, 10000, ethers.utils.parseEther("11")) // Total tvl is 11 eth, there is 10 ethish in the strategy.
            // Deposit of 1eth ish queued.
            let depositQueue = await alluoStrategyHandler.connect(admin).getAssetIdToDepositQueue(2);
            expect(depositQueue.length).to.equal(1);
            await alluoStrategyHandler.connect(admin).clearDepositQueue(2);
            depositQueue = await alluoStrategyHandler.connect(admin).getAssetIdToDepositQueue(2);
            expect(depositQueue.length).to.equal(0);
        })

    })
})