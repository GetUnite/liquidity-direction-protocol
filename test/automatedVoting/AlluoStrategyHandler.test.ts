import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { AlluoStrategyHandler, AlluoVoteExecutorUtils, BeefyStrategy, IBeefyBoost, IBeefyVaultV6, IERC20, IERC20Metadata, IExchange, IPriceFeedRouter, IPriceFeedRouterV2, ISpokePoolNew, IWrappedEther, PseudoMultisigWallet } from "../../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { mine, reset, loadFixture } from "@nomicfoundation/hardhat-network-helpers";

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
    let beefyStrategy: BeefyStrategy;
    let ldo: IERC20Metadata;

    let beefyVault: IBeefyVaultV6;
    let beefyBoost: IBeefyBoost;
    let beefyVaultLp: IERC20Metadata;

    async function setupContracts() {
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
    beforeEach(async () => {
        await loadFixture(setupContracts);
    });

    describe("All configuration and view functions", async () => {
        it("Should set liquidity  direction correctly", async () => {
            let beefyStrategyFactory = await ethers.getContractFactory("BeefyStrategy");
            let beefyStrategy = await upgrades.deployProxy(
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
            let entryData = await beefyStrategy.encodeData("0x01D9cfB8a9D43013a1FdC925640412D8d2D900F0", ethers.constants.AddressZero, 0)
            let exitData = entryData;
            let rewardsData = entryData;
            await alluoStrategyHandler.connect(admin).setLiquidityDirection("BeefyUSDStrategy", 1, beefyStrategy.address, usdc.address, 0, 10, entryData, exitData, rewardsData)
            // Now we should expect that the liquidity direction mapping is updated of id 1

            let fullInfo = await alluoStrategyHandler.getDirectionFullInfoById(1);
            expect(fullInfo[0]).to.equal(ethers.constants.AddressZero);
            let direction = fullInfo[1];
            expect(direction.strategyAddress).to.equal(beefyStrategy.address);
            expect(direction.entryToken).to.equal(ethers.utils.getAddress(usdc.address));
            expect(direction.entryData).to.equal(entryData);
            expect(direction.exitData).to.equal(exitData);
            expect(direction.rewardsData).to.equal(rewardsData);
            expect(direction.assetId).to.equal(0);
            expect(direction.chainId).to.equal(10);


        });

        it("Calling getDirectionFullinfoById with id == 0 should revert", async () => {
            await expect(alluoStrategyHandler.getDirectionFullInfoById(0)).to.be.reverted
        });

        it("Should change asset info correctly", async () => {
            let assetId = 0
            let chainIds = [1, 2, 31337]
            let chainIdToPrimaryToken = [usdc.address, usdc.address, usdc.address];
            let iballuoUSD = "0x6b55495947F3793597C0777562C37C14cb958097"
            await alluoStrategyHandler.connect(admin).changeAssetInfo(assetId, chainIds, chainIdToPrimaryToken, iballuoUSD);
            let primaryTokenForAsset = await alluoStrategyHandler.getPrimaryTokenForAsset(assetId);
            expect(primaryTokenForAsset).to.equal(ethers.utils.getAddress(usdc.address));
        });

        it("Should revert if chainIds.length != chainIdToPrimaryToken.length", async () => {
            let assetId = 0
            let chainIds = [1, 2]
            let chainIdToPrimaryToken = [usdc.address, usdc.address, usdc.address];
            let iballuoUSD = "0x6b55495947F3793597C0777562C37C14cb958097"
            await expect(alluoStrategyHandler.connect(admin).changeAssetInfo(assetId, chainIds, chainIdToPrimaryToken, iballuoUSD)).to.be.reverted;
        });

        it("Should change number of assets", async () => {
            await alluoStrategyHandler.connect(admin).changeNumberOfAssets(2);
            expect(await alluoStrategyHandler.numberOfAssets()).to.equal(2);
        });

        it("Should set the last direction id", async () => {
            await alluoStrategyHandler.connect(admin).setLastDirectionId(10);
            expect(await alluoStrategyHandler.lastDirectionId()).to.equal(10);
        })
        it("get asset amount should return 0", async () => {
            expect(await alluoStrategyHandler.getAssetAmount(0)).to.equal(0);
        })

        it("Adding to active direction should work", async () => {
            let beefyStrategyFactory = await ethers.getContractFactory("BeefyStrategy");
            let beefyStrategy = await upgrades.deployProxy(
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
            let entryData = await beefyStrategy.encodeData("0x01D9cfB8a9D43013a1FdC925640412D8d2D900F0", ethers.constants.AddressZero, 0)
            let exitData = entryData;
            let rewardsData = entryData;
            await alluoStrategyHandler.connect(admin).setLiquidityDirection("BeefyUSDStrategy", 1, beefyStrategy.address, usdc.address, 0, 10, entryData, exitData, rewardsData);

            await alluoStrategyHandler.connect(admin).addToActiveDirections(1);
        })

        it("Removing  from active direction should work", async () => {
            let beefyStrategyFactory = await ethers.getContractFactory("BeefyStrategy");
            let beefyStrategy = await upgrades.deployProxy(
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
            let entryData = await beefyStrategy.encodeData("0x01D9cfB8a9D43013a1FdC925640412D8d2D900F0", ethers.constants.AddressZero, 0)
            let exitData = entryData;
            let rewardsData = entryData;
            await alluoStrategyHandler.connect(admin).setLiquidityDirection("BeefyUSDStrategy", 1, beefyStrategy.address, usdc.address, 0, 10, entryData, exitData, rewardsData);

            await alluoStrategyHandler.connect(admin).removeFromActiveDirections(1);
        })

        it("Should set alluo bridging info", async () => {
            let newSpokePool = signers[1].address
            let newRecipient = signers[2].address
            let newRecipientChainId = 69;
            let newRelayerFeePct = 69;

            // Show that the values are not set
            expect((await alluoStrategyHandler.alluoBridgingInformation()).spokepool).to.not.equal(newSpokePool);
            expect((await alluoStrategyHandler.alluoBridgingInformation()).recipient).to.not.equal(newRecipient);
            expect((await alluoStrategyHandler.alluoBridgingInformation()).recipientChainId).to.not.equal(newRecipientChainId);
            expect((await alluoStrategyHandler.alluoBridgingInformation()).relayerFeePct).to.not.equal(newRelayerFeePct);

            // Set new values
            await alluoStrategyHandler.connect(admin).setAlluoBridging(newSpokePool, newRecipient, newRecipientChainId, newRelayerFeePct);

            // Show values are set correctly
            expect((await alluoStrategyHandler.alluoBridgingInformation()).spokepool).to.equal(newSpokePool);
            expect((await alluoStrategyHandler.alluoBridgingInformation()).recipient).to.equal(newRecipient);
            expect((await alluoStrategyHandler.alluoBridgingInformation()).recipientChainId).to.equal(newRecipientChainId);
            expect((await alluoStrategyHandler.alluoBridgingInformation()).relayerFeePct).to.equal(newRelayerFeePct);
        })

        it("Should set gnosis correctly with correct params", async () => {
            let newGnosis = signers[8].address;
            expect(await alluoStrategyHandler.gnosis()).to.not.equal(newGnosis);
            let DEFAULT_ADMIN_ROLE = await alluoStrategyHandler.DEFAULT_ADMIN_ROLE();
            let UPGRADER_ROLE = await alluoStrategyHandler.UPGRADER_ROLE();
            let hasDefaultAdmin = await alluoStrategyHandler.hasRole(DEFAULT_ADMIN_ROLE, newGnosis);
            let hasUpgrader = await alluoStrategyHandler.hasRole(UPGRADER_ROLE, newGnosis);
            expect(hasDefaultAdmin).to.be.false;
            expect(hasUpgrader).to.be.false;

            await alluoStrategyHandler.connect(admin).setGnosis(newGnosis);
            expect(await alluoStrategyHandler.gnosis()).to.equal(newGnosis);
            hasDefaultAdmin = await alluoStrategyHandler.hasRole(DEFAULT_ADMIN_ROLE, newGnosis);
            hasUpgrader = await alluoStrategyHandler.hasRole(UPGRADER_ROLE, newGnosis);

            expect(hasDefaultAdmin).to.be.true;
            expect(hasUpgrader).to.be.true;
        })

        it("Should set Oracle correctly with correct params", async () => {
            let newOracle = signers[9].address;
            expect(await alluoStrategyHandler.oracle()).to.not.equal(newOracle);
            await alluoStrategyHandler.connect(admin).setOracle(newOracle);
            expect(await alluoStrategyHandler.oracle()).to.equal(newOracle);
        })

        it("Should set priceDeadline correctly with correct params", async () => {
            let newDeadline = 69;
            expect(await alluoStrategyHandler.priceDeadline()).to.not.equal(newDeadline);
            await alluoStrategyHandler.connect(admin).setPriceDeadline(newDeadline);
            expect(await alluoStrategyHandler.priceDeadline()).to.equal(newDeadline);
        })

        it("Should set slippage tolerance correctly with correct params", async () => {
            let newSlippageTolerance = 69;
            expect(await alluoStrategyHandler.slippageTolerance()).to.not.equal(newSlippageTolerance);
            await alluoStrategyHandler.connect(admin).setSlippageTolerance(newSlippageTolerance);
            expect(await alluoStrategyHandler.slippageTolerance()).to.equal(newSlippageTolerance);
        })
    })

    describe("Main liquidity direction functions", async () => {
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
            await loadFixture(additionalSetup);
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
        // More rigorous testing needed on scaleDepositQueue with multiple deposits
        // Only possible when we have more price routers and exchange activated
        // Need more tests on checking the deposit queue amount

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

        describe("Tests for deposit queue gelatos", async function () {
            async function queueDeposits() {
                let wethBalanceOfAdminBefore = await weth.balanceOf(admin.address);
                await alluoStrategyHandler.connect(admin).rebalanceUntilTarget(2, 1, 0, ethers.utils.parseEther("10")) // TVL doesnt matter when doing a 0% rebalance
                let wethBalanceOfAdminAfter = await weth.balanceOf(admin.address);
                let balanceTransferred = wethBalanceOfAdminAfter.sub(wethBalanceOfAdminBefore);
                await weth.connect(admin).transfer(alluoStrategyHandler.address, balanceTransferred);

                // Then simulate queueing a deposit
                await alluoStrategyHandler.connect(admin).rebalanceUntilTarget(2, 1, 10000, ethers.utils.parseEther("10")) // TVL doesnt matter when doing a 0% rebalance

                // Pretend that the admin is the voteExecutor.
                // So that the checker returns the correct values.
                await alluoVoteExecutorUtils.connect(admin).setStorageAddresses(alluoStrategyHandler.address, admin.address);

                await alluoStrategyHandler.connect(admin).changeNumberOfAssets(3);
                await alluoStrategyHandler.connect(admin).changeAssetInfo(0, [31337], [usdc.address], usdc.address);
                await alluoStrategyHandler.connect(admin).changeAssetInfo(1, [31337], [beefyVault.address], usdc.address);
                await alluoStrategyHandler.connect(admin).changeAssetInfo(2, [31337], [weth.address], usdc.address);

                console.log("primarytoken", await alluoStrategyHandler.getPrimaryTokenForAsset(2));
                console.log("primarytoken", await alluoStrategyHandler.getPrimaryTokenForAsset(0));

            }

            beforeEach(async () => {
                await loadFixture(queueDeposits);
            })

            it("If there is a deposit in the queue and there are insufficient funds, it should return false for the specific asset id", async () => {
                let ready = await alluoStrategyHandler.isReadyToExecuteQueuedDeposits(2, admin.address);
                expect(ready).to.be.false;
            })

            it("If there is no deposit in the queue for a specific assetID, it should return false", async () => {
                let ready = await alluoStrategyHandler.isReadyToExecuteQueuedDeposits(0, admin.address);
                expect(ready).to.be.false;
            })

            it("If there are deposits in the queue but insufficient funds, it should return false for the universal checker", async () => {
                let ready = await alluoStrategyHandler.checkDepositsReady();
                expect(ready.canExec).to.be.false;
            })

            it("If there are deposits in the queue and sufficient funds, it should return true for the specific asset id", async () => {
                // Send funds to the admin
                await weth.connect(signers[2]).deposit({ value: ethers.utils.parseEther("11") });
                await weth.connect(signers[2]).transfer(admin.address, ethers.utils.parseEther("11"));

                let ready = await alluoStrategyHandler.isReadyToExecuteQueuedDeposits(2, admin.address);
                expect(ready).to.be.true;
            })
            it("If there are deposits in the queue and there are funds within the slippage threshold, it should return true for the specific asset id", async () => {
                // Send funds to the admin
                await weth.connect(signers[2]).deposit({ value: ethers.utils.parseEther("10.89") });
                await weth.connect(signers[2]).transfer(admin.address, ethers.utils.parseEther("10.89"));

                let ready = await alluoStrategyHandler.isReadyToExecuteQueuedDeposits(2, admin.address);
                expect(ready).to.be.true;
            })


            it("If there are deposits in the queue and sufficient funds, it should return true for the universal checker", async () => {
                // Send funds to the admin
                await weth.connect(signers[2]).deposit({ value: ethers.utils.parseEther("11") });
                await weth.connect(signers[2]).transfer(admin.address, ethers.utils.parseEther("11"));

                let ready = await alluoStrategyHandler.checkDepositsReady();
                expect(ready.canExec).to.be.true;

                // abi.encodeWithSelector(
                //     this.executeQueuedDeposits.selector,
                //     i
                // )
                let expectedData = alluoStrategyHandler.interface.encodeFunctionData("executeQueuedDeposits", [2])
                expect(ready.execPayload).to.equal(expectedData);
            })
            it("If there are deposits in the queue and there are funds within the slippage threshold, it should return true for the universal checker", async () => {
                // Send funds to the admin
                await weth.connect(signers[2]).deposit({ value: ethers.utils.parseEther("10.89") });
                await weth.connect(signers[2]).transfer(admin.address, ethers.utils.parseEther("10.89"));

                let ready = await alluoStrategyHandler.checkDepositsReady();
                expect(ready.canExec).to.be.true;
                let expectedData = alluoStrategyHandler.interface.encodeFunctionData("executeQueuedDeposits", [2])
                expect(ready.execPayload).to.equal(expectedData);
            })

        })
    })
})