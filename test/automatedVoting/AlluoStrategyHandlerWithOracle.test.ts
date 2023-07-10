import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { AlluoStrategyHandler, AlluoVoteExecutorUtils, BeefyStrategy, ExchangePriceOracle, ExchangePriceOracle__factory, IBeefyBoost, IBeefyVaultV6, IERC20, IERC20Metadata, IExchange, IPriceFeedRouter, IPriceFeedRouterV2, ISpokePoolNew, IWrappedEther, PseudoMultisigWallet } from "../../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { mine, reset, loadFixture } from "@nomicfoundation/hardhat-network-helpers";

describe("AlluoStrategyHandler Tests with Price Oracle", function () {
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
    let beefyStrategy: BeefyStrategy;
    let ldo: IERC20Metadata;
    let exchangePriceOracle: ExchangePriceOracle;

    let beefyVault: IBeefyVaultV6;
    let beefyBoost: IBeefyBoost;
    let beefyVaultLp: IERC20Metadata;
    async function setupContractsWithOracles() {
        // Test on optimism
        await reset(process.env.OPTIMISM_URL, 94688806);

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
        let beefyStrategyFactory = await ethers.getContractFactory("BeefyStrategy");
        beefyVault = await ethers.getContractAt("IBeefyVaultV6", "0x0892a178c363b4739e5Ac89E9155B9c30214C0c0") as IBeefyVaultV6;
        beefyVaultLp = await ethers.getContractAt("IERC20Metadata", await beefyVault.want()) as IERC20Metadata;

        beefyBoost = await ethers.getContractAt("IBeefyBoost", "0x358B7D1a3B7E5c508c40756242f55991a354cd41") as IBeefyBoost;
        ldo = await ethers.getContractAt("IERC20Metadata", "0xFdb794692724153d1488CcdBE0C56c252596735F") as IERC20Metadata;

        beefyStrategy = await upgrades.deployProxy(
            beefyStrategyFactory,
            [
                admin.address,
                ethers.constants.AddressZero,
                alluoStrategyHandler.address,
                priceRouter.address,
                _exchange.address,
                weth.address
            ],
            { kind: 'uups' }
        ) as BeefyStrategy;

        const oracleFactory = await ethers.getContractFactory("ExchangePriceOracle") as ExchangePriceOracle__factory;
        exchangePriceOracle = await oracleFactory.deploy();
        await beefyStrategy.connect(admin).setOracle(exchangePriceOracle.address);
        await alluoStrategyHandler.connect(admin).setOracle(exchangePriceOracle.address);

        await beefyStrategy.connect(admin).setPriceDeadline(60);
        await beefyStrategy.connect(admin).setAcceptableSlippage(3000); // 3%

        await alluoStrategyHandler.connect(admin).setPriceDeadline(60);
        await alluoStrategyHandler.connect(admin).setSlippageTolerance(300); // 3%

        await exchangePriceOracle.submitPrice(
            "0xefde221f306152971d8e9f181bfe998447975810",
            "0x4200000000000000000000000000000000000006",
            ethers.BigNumber.from("1008394874840000000"),
            18
        );

        await exchangePriceOracle.submitPrice(
            "0x4200000000000000000000000000000000000006",
            "0xefde221f306152971d8e9f181bfe998447975810",
            ethers.utils.parseEther("0.97"),
            18
        );

        beefyStrategy.connect(admin).changeExpectedRewardStatus(ldo.address, true);
        let entryData = await beefyStrategy.encodeData(beefyVault.address, beefyBoost.address, 2)
        let exitData = entryData;
        let rewardsData = entryData;
        await alluoStrategyHandler.connect(admin).setLiquidityDirection("BeefyETHStrategy", 1, beefyStrategy.address, beefyVaultLp.address, 2, 10, entryData, exitData, rewardsData);
        // await alluoStrategyHandler.connect(admin).setLiquidityDirection("BeefyETHStrategy2", 2, beefyStrategy.address, weth.address, 2, 10, entryData, exitData, rewardsData);

        await alluoStrategyHandler.connect(admin).addToActiveDirections(1);
        await alluoStrategyHandler.connect(admin).changeAssetInfo(2, [31337], [weth.address], usdc.address);

        // Let signer1 get some usdc through the exchange
        await _exchange.connect(signers[1]).exchange("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", usdc.address, ethers.utils.parseEther("10"), 0, { value: ethers.utils.parseEther("10") })

        // We first need some existing position in direction 1.


        // Deposit some usdc through the strategyFirst
        let signerBalanceUsdc = await usdc.balanceOf(signers[1].address);
        await usdc.connect(signers[1]).approve(_exchange.address, signerBalanceUsdc);
        // Swap to "MAI-USDC beefy"
        await _exchange.connect(signers[1]).exchange(usdc.address, beefyVaultLp.address, signerBalanceUsdc, 0);
        let beefyVaultLpBalance = await beefyVaultLp.balanceOf(signers[1].address);
        console.log(beefyVaultLpBalance)
        await beefyVaultLp.connect(signers[1]).transfer(beefyStrategy.address, beefyVaultLpBalance)
        let directionData = await alluoStrategyHandler.liquidityDirection(1);
        // Deposit through the strategy
        await beefyStrategy.connect(admin).invest(directionData.entryData, beefyVaultLpBalance)
    }

    beforeEach(async () => {
        await loadFixture(setupContractsWithOracles);
        await loadFixture(additionalSetup);
    });


    describe("Main liquidity direction functions", async () => {

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
            // Send some weth to the 'caller' who is the admin (but is supposed to be the voteExecutorMaster)
            await weth.connect(signers[1]).deposit({ value: depositQueue })
            await weth.connect(signers[1]).transfer(admin.address, depositQueue)
            await weth.connect(admin).approve(alluoStrategyHandler.address, ethers.constants.MaxUint256);
            // Now executeQueuedDeposits
            await alluoStrategyHandler.connect(admin).executeQueuedDeposits(2);
            expect(await weth.balanceOf(alluoStrategyHandler.address)).to.equal(0);
            let newMarkedToMarketBalanceOfStrategy = await alluoStrategyHandler.connect(admin).markAssetToMarket(2);
            console.log("Difference between old and new", newMarkedToMarketBalanceOfStrategy.sub(oldMarkedToMarketBalanceOfStrategy).toString())
            expect(newMarkedToMarketBalanceOfStrategy).to.be.greaterThan(oldMarkedToMarketBalanceOfStrategy);
        })

        it("A queued deposit should be reverted if there is too much difference between the total deposit amount and funds held by the caller", async () => {
            await alluoStrategyHandler.connect(admin).rebalanceUntilTarget(2, 1, 10000, ethers.utils.parseEther("11")) // Total tvl is 11 eth, there is 10 ethish in the strategy.
            // Deposit of 1eth ish queued.
            await expect(alluoStrategyHandler.connect(admin).executeQueuedDeposits(2)).to.be.revertedWith("Not enough funds")
        })

        it("Bridging should work if there are no pending deposits and there are funds spare", async () => {
            // Technically this logic is all handled in the vote executor
            let wethBalanceOfAdminBefore = await weth.balanceOf(admin.address);
            await alluoStrategyHandler.connect(admin).rebalanceUntilTarget(2, 1, 0, ethers.utils.parseEther("10000")) // TVL doesnt matter when doing a 0% rebalance
            let wethBalanceOfAdminAfter = await weth.balanceOf(admin.address);
            let balanceTransferred = wethBalanceOfAdminAfter.sub(wethBalanceOfAdminBefore);
            // Then simulate transferring it to the strategyHandler
            await weth.connect(admin).transfer(alluoStrategyHandler.address, balanceTransferred);


            // Now attempt to bridge
            await alluoStrategyHandler.connect(admin).bridgeRemainingFunds(2);

        })

        it("Bridging when there are no funds spare, the contract should revert", async () => {
            // Technically this logic is all handled in the vote executor
            let wethBalanceOfAdminBefore = await weth.balanceOf(admin.address);
            await alluoStrategyHandler.connect(admin).rebalanceUntilTarget(2, 1, 0, ethers.utils.parseEther("10000")) // TVL doesnt matter when doing a 0% rebalance
            let wethBalanceOfAdminAfter = await weth.balanceOf(admin.address);
            let balanceTransferred = wethBalanceOfAdminAfter.sub(wethBalanceOfAdminBefore);
            // Then simulate transferring it to the strategyHandler


            // Now attempt to bridge
            await expect(alluoStrategyHandler.connect(admin).bridgeRemainingFunds(2)).to.be.revertedWith("No funds to bridge");

        })

        it("Bridging when there are funds spare BUT there is a deposit queue should revert", async () => {
            // Technically this logic is all handled in the vote executor
            let wethBalanceOfAdminBefore = await weth.balanceOf(admin.address);
            await alluoStrategyHandler.connect(admin).rebalanceUntilTarget(2, 1, 0, ethers.utils.parseEther("10000")) // TVL doesnt matter when doing a 0% rebalance
            let wethBalanceOfAdminAfter = await weth.balanceOf(admin.address);
            let balanceTransferred = wethBalanceOfAdminAfter.sub(wethBalanceOfAdminBefore);
            await weth.connect(admin).transfer(alluoStrategyHandler.address, balanceTransferred);

            // Then simulate queueing a deposit
            await alluoStrategyHandler.connect(admin).rebalanceUntilTarget(2, 1, 10000, ethers.utils.parseEther("10000")) // TVL doesnt matter when doing a 0% rebalance


            // Now attempt to bridge
            await expect(alluoStrategyHandler.connect(admin).bridgeRemainingFunds(2)).to.be.revertedWith("There are still funds to be deployed");

        })

        it("Speedup should succeed if there was a requested bridge before", async () => {
            // Technically this logic is all handled in the vote executor
            let wethBalanceOfAdminBefore = await weth.balanceOf(admin.address);
            await alluoStrategyHandler.connect(admin).rebalanceUntilTarget(2, 1, 0, ethers.utils.parseEther("10000")) // TVL doesnt matter when doing a 0% rebalance
            let wethBalanceOfAdminAfter = await weth.balanceOf(admin.address);
            let balanceTransferred = wethBalanceOfAdminAfter.sub(wethBalanceOfAdminBefore);
            // Then simulate transferring it to the strategyHandler
            await weth.connect(admin).transfer(alluoStrategyHandler.address, balanceTransferred);
            // Now attempt to bridge
            await alluoStrategyHandler.connect(admin).bridgeRemainingFunds(2);

            let spokePoolContract = await ethers.getContractAt("ISpokePoolNew", spokePool) as ISpokePoolNew
            let depositId = await spokePoolContract.numberOfDeposits();
            let modifiedRelayerFeePct = 1000
            let updatedRecipient = alluoStrategyHandler.address
            let updatedMessage = "0x1234"
            let originChainId = await signers[0].getChainId();

            const typedData = {
                types: {
                    UpdateDepositDetails: [
                        { name: "depositId", type: "uint32" },
                        { name: "originChainId", type: "uint256" },
                        { name: "updatedRelayerFeePct", type: "int64" },
                        { name: "updatedRecipient", type: "address" },
                        { name: "updatedMessage", type: "bytes" },
                    ],
                },
                domain: {
                    name: "ACROSS-V2",
                    version: "1.0.0",
                    chainId: Number(originChainId),
                },
                message: {
                    depositId,
                    originChainId,
                    updatedRelayerFeePct: modifiedRelayerFeePct,
                    updatedRecipient,
                    updatedMessage,
                },
            };
            const signature = await signers[0]._signTypedData(typedData.domain, typedData.types, typedData.message);
            await alluoStrategyHandler.connect(admin).speedUpDeposit(modifiedRelayerFeePct, depositId, updatedRecipient, updatedMessage, signature)

        })
        it("Speedup should fail if signer is not a member of gnosis safe", async () => {
            // Technically this logic is all handled in the vote executor
            let wethBalanceOfAdminBefore = await weth.balanceOf(admin.address);
            await alluoStrategyHandler.connect(admin).rebalanceUntilTarget(2, 1, 0, ethers.utils.parseEther("10000")) // TVL doesnt matter when doing a 0% rebalance
            let wethBalanceOfAdminAfter = await weth.balanceOf(admin.address);
            let balanceTransferred = wethBalanceOfAdminAfter.sub(wethBalanceOfAdminBefore);
            // Then simulate transferring it to the strategyHandler
            await weth.connect(admin).transfer(alluoStrategyHandler.address, balanceTransferred);
            // Now attempt to bridge
            await alluoStrategyHandler.connect(admin).bridgeRemainingFunds(2);

            let spokePoolContract = await ethers.getContractAt("ISpokePoolNew", spokePool) as ISpokePoolNew
            let depositId = await spokePoolContract.numberOfDeposits();
            let modifiedRelayerFeePct = 1000
            let updatedRecipient = alluoStrategyHandler.address
            let updatedMessage = "0x1234"
            let originChainId = await signers[0].getChainId();

            const typedData = {
                types: {
                    UpdateDepositDetails: [
                        { name: "depositId", type: "uint32" },
                        { name: "originChainId", type: "uint256" },
                        { name: "updatedRelayerFeePct", type: "int64" },
                        { name: "updatedRecipient", type: "address" },
                        { name: "updatedMessage", type: "bytes" },
                    ],
                },
                domain: {
                    name: "ACROSS-V2",
                    version: "1.0.0",
                    chainId: Number(originChainId),
                },
                message: {
                    depositId,
                    originChainId,
                    updatedRelayerFeePct: modifiedRelayerFeePct,
                    updatedRecipient,
                    updatedMessage,
                },
            };
            // Not member of gnosis
            const signature = await signers[1]._signTypedData(typedData.domain, typedData.types, typedData.message);
            await expect(alluoStrategyHandler.connect(admin).speedUpDeposit(modifiedRelayerFeePct, depositId, updatedRecipient, updatedMessage, signature)).to.be.revertedWith("invalid signature")

        })
    })
})