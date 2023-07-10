import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { AlluoStrategyHandler, AlluoVoteExecutor, AlluoVoteExecutorUtils, BeefyStrategy, ExchangePriceOracle, ExchangePriceOracle__factory, IBeefyBoost, IBeefyVaultV6, IERC20, IERC20Metadata, IExchange, IPriceFeedRouter, IPriceFeedRouterV2, ISpokePoolNew, IWrappedEther, LiquidityHandler, PseudoMultisigWallet } from "../../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { mine, reset, loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";
import { LiquidityHandlerCurrent, SpokePoolMock } from "../../typechain";

describe("AlluoVoteExecutor Tests", function () {
    let alluoVoteExecutor: AlluoVoteExecutor;
    let alluoStrategyHandler: AlluoStrategyHandler;
    let alluoVoteExecutorUtils: AlluoVoteExecutorUtils;
    let signers: SignerWithAddress[];
    let admin: SignerWithAddress;
    let pseudoMultiSig: PseudoMultisigWallet
    let spokePool: string;
    let _recipient: string;
    let _recipientChainId: string;
    let _relayerFeePct: number;
    let _slippageTolerance: number;
    let _exchange: IExchange;
    let priceRouter: IPriceFeedRouterV2;
    let weth: IWrappedEther;
    let usdc: IERC20Metadata;
    let beefyStrategy: BeefyStrategy;
    let ldo: IERC20Metadata;
    let liquidityHandler: LiquidityHandlerCurrent;

    let beefyVault: IBeefyVaultV6;
    let beefyBoost: IBeefyBoost;
    let beefyVaultLp: IERC20Metadata;

    let exchangePriceOracle: ExchangePriceOracle;

    async function setupContracts() {
        await reset(process.env.OPTIMISM_URL, 102871832);
        const pseudoMultiSigFactory = await ethers.getContractFactory("PseudoMultisigWallet");
        pseudoMultiSig = await pseudoMultiSigFactory.deploy(true) as PseudoMultisigWallet;
        admin = await ethers.getImpersonatedSigner(pseudoMultiSig.address)

        signers = await ethers.getSigners();

        // Send some eth to the admin
        await signers[0].sendTransaction({ to: admin.address, value: ethers.utils.parseEther("1") })

        // Deploy StrategyHandler
        //
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
        // spokePool = fakeSpokePool.address;
        //Temp just for simulation
        _recipient = "0xa420b2d1c0841415A695b81E5B867BCD07Dff8C9"
        _recipientChainId = "1";
        _relayerFeePct = 0;
        _slippageTolerance = 150;


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

        alluoStrategyHandler = (await upgrades.deployProxy(strategyHandlerFactory, [admin.address, spokePool, _recipient, _recipientChainId, _relayerFeePct, _slippageTolerance, _exchange.address, alluoVoteExecutorUtils.address])) as AlluoStrategyHandler;

        await alluoStrategyHandler.connect(admin).changeNumberOfAssets(4);
        await alluoStrategyHandler.connect(admin).setTokenToAssetId(weth.address, 2);
        liquidityHandler = await ethers.getContractAt("LiquidityHandlerCurrent", "0x937F7125994a91d5E2Ce31846b97578131056Bb4") as unknown as LiquidityHandlerCurrent;

        // Now deploy AlluoVoteExecutor
        //
        let voteExecutorFactory = await ethers.getContractFactory("AlluoVoteExecutor");

        alluoVoteExecutor = (await upgrades.deployProxy(voteExecutorFactory, [
            pseudoMultiSig.address, _exchange.address, priceRouter.address, liquidityHandler.address, alluoStrategyHandler.address, "0xc22DB2874725B84e99EC0a644fdD042EA3F6F899", alluoVoteExecutorUtils.address, "0xdEBbFE665359B96523d364A19FceC66B0E43860D", 86400, 1, true
        ])) as AlluoVoteExecutor;

        await alluoVoteExecutor.connect(admin).setAcrossInformation(spokePool, 10000000)
        await alluoVoteExecutor.connect(admin).setFeeInformation(usdc.address, 1, 1);
        await alluoVoteExecutor.connect(admin).setFeeInformation(usdc.address, 137, 1);
        await alluoVoteExecutor.connect(admin).setFeeInformation(usdc.address, 31337, 1);

        await alluoStrategyHandler.connect(admin).grantRole(await alluoStrategyHandler.DEFAULT_ADMIN_ROLE(), alluoVoteExecutor.address);
        await alluoStrategyHandler.connect(admin).grantRole(await alluoStrategyHandler.DEFAULT_ADMIN_ROLE(), alluoVoteExecutorUtils.address);

        await alluoVoteExecutorUtils.connect(admin).setStorageAddresses(alluoStrategyHandler.address, alluoVoteExecutor.address);

        // Also the voteExecutor should approve each primary token to the utils contract
        let approve = usdc.interface.encodeFunctionData("approve", [alluoVoteExecutorUtils.address, ethers.constants.MaxUint256]);
        await alluoVoteExecutor.connect(admin).multicall([usdc.address, weth.address], [approve, approve]);

        const oracleFactory = await ethers.getContractFactory("ExchangePriceOracle") as ExchangePriceOracle__factory;
        exchangePriceOracle = await oracleFactory.deploy();
    }
    beforeEach(async () => {
        // Test on optimism
        await loadFixture(setupContracts)

    });
    describe("Test TVL information", async () => {
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
            await alluoStrategyHandler.connect(admin).setLiquidityDirection("BeefyETHStrategy", 1, beefyStrategy.address, beefyVaultLp.address, 2, 31337, entryData, exitData, rewardsData);
            // await alluoStrategyHandler.connect(admin).setLiquidityDirection("BeefyETHStrategy2", 2, beefyStrategy.address, weth.address, 2, 10, entryData, exitData, rewardsData);
            // Now lets set Liquidity direction ifnormation
            await alluoStrategyHandler.connect(admin).setLiquidityDirection("BeefyETHStrategyChain69", 2, beefyStrategy.address, beefyVaultLp.address, 2, 69, entryData, exitData, rewardsData);
            await alluoStrategyHandler.connect(admin).setLiquidityDirection("BeefyETHStrategyChain96", 3, beefyStrategy.address, beefyVaultLp.address, 2, 96, entryData, exitData, rewardsData);
            await alluoStrategyHandler.connect(admin).setLastDirectionId(2);

            await alluoStrategyHandler.connect(admin).addToActiveDirections(1);
            await alluoStrategyHandler.connect(admin).changeAssetInfo(2, [31337, 69, 96], [weth.address, weth.address, weth.address], usdc.address);
            // await alluoVoteExecutor.connect(admin).setCrossChainInformation(signers[0].address, signers[1].address, signers[2].address, 99, 1 /*Important param here, next chainid*/, 10, 3, 0)
            await alluoVoteExecutorUtils.connect(admin).setCrossChainInformation(signers[0].address, signers[1].address, signers[2].address, 99, 1 /*Important param here, next chainid*/, 10, 3, 0)

            await alluoVoteExecutor.setAcrossInformation(spokePool, 10000000)

            await _exchange.connect(signers[1]).exchange("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", usdc.address, ethers.utils.parseEther("10"), 0, { value: ethers.utils.parseEther("10") })
            await usdc.connect(signers[1]).transfer(alluoVoteExecutor.address, ethers.utils.parseUnits("100", 6));

            // First set the parameters correctly 
            // 3 executors, ids 0 , 1 ,2 
            // Executor addresses 0 = me, 1 = signers[9], 2= signers[10]
            // Executor balances : Lets put 100 eth inside the main one, and 50 eth in the other two.
            // Then in the data, we will set it so that there is expected to be 50eth  transfer each to the other two
            // Lets fake that TVL call happened correctly

            await alluoVoteExecutorUtils.connect(admin).setExecutorInternalIds([0, 1, 2], [alluoVoteExecutor.address, signers[9].address, signers[10].address], [0, 1, 137]);
            await alluoVoteExecutorUtils.connect(admin).setUniversalExecutorBalances([[0, 0, ethers.utils.parseEther("100"), 0], [0, 0, ethers.utils.parseEther("50"), 0], [0, 0, ethers.utils.parseEther("50"), 0]]);
            await alluoVoteExecutorUtils.connect(admin).setCrossChainInformation(signers[0].address, signers[1].address, signers[2].address, 99, 1 /*Important param here, next chainid*/, 10, 3, 0)
        }

        async function votePreparation() {
            // Fake a 100 eth deposit into this current chain
            // Let signer1 get some usdc through the exchange
            await _exchange.connect(signers[1]).exchange("0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", beefyVaultLp.address, ethers.utils.parseEther("100"), 0, { value: ethers.utils.parseEther("100") })
            let beefyVaultLpBalance = await beefyVaultLp.balanceOf(signers[1].address);
            await beefyVaultLp.connect(signers[1]).transfer(beefyStrategy.address, beefyVaultLpBalance)
            let directionData = await alluoStrategyHandler.liquidityDirection(1);
            // Deposit through the strategy
            await beefyStrategy.connect(admin).invest(directionData.entryData, beefyVaultLpBalance)


            // Now let's encode the data and submit it as usual
            let encodedCommand1 = await alluoVoteExecutorUtils.encodeLiquidityCommand("BeefyETHStrategy", 0, 0)
            let encodedCommand2 = await alluoVoteExecutorUtils.encodeLiquidityCommand("BeefyETHStrategyChain69", 5000, 1)
            let encodedCommand3 = await alluoVoteExecutorUtils.encodeLiquidityCommand("BeefyETHStrategyChain96", 5000, 2)

            let allEncoded = await alluoVoteExecutorUtils.encodeAllMessages([encodedCommand1[0], encodedCommand2[0], encodedCommand3[0]], [encodedCommand1[1], encodedCommand2[1], encodedCommand3[1]]);
            await alluoVoteExecutor.connect(admin).submitData(allEncoded.inputData);

            await alluoVoteExecutor.connect(admin).setMinSigns(0);
        }

        async function priceOracleSetup() {
            // Setup price oracle for this test case
            await alluoVoteExecutor.setOracle(exchangePriceOracle.address);
            await exchangePriceOracle.grantRole(
                await exchangePriceOracle.PRICE_REQUESTER_ROLE(),
                alluoVoteExecutor.address
            )

            await beefyStrategy.connect(admin).setPriceDeadline(60);
            await beefyStrategy.connect(admin).setAcceptableSlippage(3000); // 3%
            await beefyStrategy.connect(admin).setOracle(exchangePriceOracle.address);
        }
        beforeEach(async () => {
            await loadFixture(additionalSetup);
            await loadFixture(votePreparation);
        })
        it("Test that speedup works on the VoteExecutor contract", async () => {
            await alluoVoteExecutor.connect(admin).markAllChainPositions();
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
            await alluoVoteExecutor.connect(admin).speedUpDeposit(modifiedRelayerFeePct, depositId, updatedRecipient, updatedMessage, signature)
        })

        it("Test that speedup reverts if the signer is not part of the multisig", async () => {
            await alluoVoteExecutor.connect(admin).markAllChainPositions();
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
            const signature = await signers[12]._signTypedData(typedData.domain, typedData.types, typedData.message);
            await expect(alluoVoteExecutor.connect(admin).speedUpDeposit(modifiedRelayerFeePct, depositId, updatedRecipient, updatedMessage, signature)).to.be.revertedWith("invalid signature")
        })
        it("Test markAllChainPositions after fixtures loads", async () => {
            await loadFixture(priceOracleSetup);
            await alluoVoteExecutor.connect(admin).markAllChainPositions();
        });

        it("Test that the bridging triggering works as expected", async () => {
            // Now execte the vote
            let tx = await alluoVoteExecutor.connect(admin).executeSpecificData(0);
            await expect(tx).to.emit(alluoStrategyHandler, "Bridged")
            // There should be 0 balance held in the vote executor since bridge was triggered above
            let voteExecutorWethBalance = await weth.balanceOf(alluoVoteExecutor.address);
            console.log("Vote executor weth balance", voteExecutorWethBalance.toString())
            expect(voteExecutorWethBalance).to.equal(0)
        })


        it("Test markAllChainPositions (with price oracle)", async () => {
            await loadFixture(priceOracleSetup);

            const tx = await alluoVoteExecutor.connect(admin).markAllChainPositions();

            // Check that Price Oracle receives correct set of requests

            // primaryToken -> entryToken
            await expect(tx).to.emit(exchangePriceOracle, "PriceRequested")
                .withArgs("0x4200000000000000000000000000000000000006", "0xEfDE221f306152971D8e9f181bFe998447975810");
            // entryToken -> primaryToken
            await expect(tx).to.emit(exchangePriceOracle, "PriceRequested")
                .withArgs("0xEfDE221f306152971D8e9f181bFe998447975810", "0x4200000000000000000000000000000000000006");
            // rewards
            await expect(tx).to.emit(exchangePriceOracle, "PriceRequested")
                .withArgs("0xFdb794692724153d1488CcdBE0C56c252596735F", "0x4200000000000000000000000000000000000006");
        });

        it("Test that the bridging triggering works as expected (with price oracles)", async () => {
            await loadFixture(priceOracleSetup);

            //             __Exchange__
            // from 0xefde221f306152971d8e9f181bfe998447975810
            // to 0x4200000000000000000000000000000000000006
            // amount 97.104650302229072876
            // result output: 99.861924694063452840
            // per token: 1.028394874840000000

            await exchangePriceOracle.submitPrice(
                "0xefde221f306152971d8e9f181bfe998447975810",
                "0x4200000000000000000000000000000000000006",
                ethers.BigNumber.from("1028394874840000000"),
                18
            );

            // Now exeucte the vote
            await alluoVoteExecutor.connect(admin).executeSpecificData(0);
            let voteExecutorWethBalanceAfter = await weth.balanceOf(alluoVoteExecutor.address);
            console.log("Vote executor weth balance after", voteExecutorWethBalanceAfter.toString())
            expect(voteExecutorWethBalanceAfter).to.equal("0");
        });

        it("Execute specific data should fail if slippage exceeds limit (with price oracles)", async () => {
            await loadFixture(priceOracleSetup);

            //             __Exchange__
            // from 0xefde221f306152971d8e9f181bfe998447975810
            // to 0x4200000000000000000000000000000000000006
            // amount 97.104650302229072876
            // result output: 99.861924694063452840
            // per token: 1.092834874840000000

            // +3.5% - 1.131308409550000000

            await exchangePriceOracle.submitPrice(
                "0xefde221f306152971d8e9f181bfe998447975810",
                "0x4200000000000000000000000000000000000006",
                ethers.BigNumber.from("1131308409550000000"),
                18
            );

            // Execution should fail because of 3.5% slippage (with only 3% allowed)
            const tx = alluoVoteExecutor.connect(admin).executeSpecificData(0);
            await expect(tx).to.be.revertedWith("Exchange: slippage");
        });

        it("Execute specific data should fail if prices are outdated (with price oracles)", async () => {
            await loadFixture(priceOracleSetup);

            //             __Exchange__
            // from 0xefde221f306152971d8e9f181bfe998447975810
            // to 0x4200000000000000000000000000000000000006
            // amount 97.104650302229072876
            // result output: 99.861924694063452840
            // per token: 1.092834874840000000

            // +3.5% - 1.131308409550000000

            await exchangePriceOracle.submitPrice(
                "0xefde221f306152971d8e9f181bfe998447975810",
                "0x4200000000000000000000000000000000000006",
                ethers.BigNumber.from("1028394874840000000"),
                18
            );

            // Limit is set to 60s,
            await time.increase(60);

            // Execution should fail because submitted prices are outdated
            const tx = alluoVoteExecutor.connect(admin).executeSpecificData(0);
            await expect(tx).to.be.revertedWith("Oracle: Price too old");
        });


    })
    describe("All tests for simulating crosschain message functions", async () => {
        beforeEach(async () => {
            // Need to set a custom spokePool
            await alluoVoteExecutor.connect(admin).setAcrossInformation(signers[6].address, 999);
            // Need to set a custom relayer
            let RELAYER_ROLE = await alluoVoteExecutor.RELAYER_ROLE();
            await alluoVoteExecutor.connect(admin).grantRole(RELAYER_ROLE, signers[7].address);
        })
        it("Should receive an across message and add it to the queue successfully", async () => {
            let message = ethers.utils.formatBytes32String("Hello world");
            expect((await alluoVoteExecutor.getSequentialQueuedCrosschainIndex()).canExec).to.equal(false);
            await expect(alluoVoteExecutor.storedCrosschainData(0)).to.be.reverted

            await alluoVoteExecutor.connect(signers[6]).handleAcrossMessage(usdc.address, 100, true, signers[7].address, message);
            expect((await alluoVoteExecutor.getSequentialQueuedCrosschainIndex()).canExec).to.equal(true);
            expect(await alluoVoteExecutor.storedCrosschainData(0)).to.equal(message)
        })

        it("Should not receive an across message if the relayer is not the correct one", async () => {
            let message = ethers.utils.formatBytes32String("Hello world");
            await expect(alluoVoteExecutor.connect(signers[6]).handleAcrossMessage(usdc.address, 100, true, signers[5].address, message)).to.be.revertedWith("Only approved relayers");
            expect((await alluoVoteExecutor.getSequentialQueuedCrosschainIndex()).canExec).to.equal(false);
            await expect(alluoVoteExecutor.storedCrosschainData(0)).to.be.reverted
        })

        it("Should not receive an across message if the spokePool is not the correct one", async () => {
            let message = ethers.utils.formatBytes32String("Hello world");
            await expect(alluoVoteExecutor.connect(signers[5]).handleAcrossMessage(usdc.address, 100, true, signers[7].address, message)).to.be.revertedWith("Only spoke pool");
            expect((await alluoVoteExecutor.getSequentialQueuedCrosschainIndex()).canExec).to.equal(false);
            await expect(alluoVoteExecutor.storedCrosschainData(0)).to.be.reverted
        })

        it("Should succeed but not enter logic if fill is not completed", async () => {
            let message = ethers.utils.formatBytes32String("Hello world");
            await alluoVoteExecutor.connect(signers[6]).handleAcrossMessage(usdc.address, 100, false, signers[6].address, message)
            expect((await alluoVoteExecutor.getSequentialQueuedCrosschainIndex()).canExec).to.equal(false);
            await expect(alluoVoteExecutor.storedCrosschainData(0)).to.be.reverted
        })
        it("Should succeed but not enter logic if message length is zero", async () => {
            let message = "0x"
            await alluoVoteExecutor.connect(signers[6]).handleAcrossMessage(usdc.address, 100, true, signers[7].address, message)
            expect((await alluoVoteExecutor.getSequentialQueuedCrosschainIndex()).canExec).to.equal(false);
            await expect(alluoVoteExecutor.storedCrosschainData(0)).to.be.reverted
        })

        it("Should be able to force remove a crosschain message", async () => {
            let message = ethers.utils.formatBytes32String("Hello world");
            await alluoVoteExecutor.connect(signers[6]).handleAcrossMessage(usdc.address, 100, true, signers[7].address, message)
            expect((await alluoVoteExecutor.getSequentialQueuedCrosschainIndex()).canExec).to.equal(true);
            await alluoVoteExecutor.connect(admin).forceRemoveQueuedCrosschainIndex(0);
            expect((await alluoVoteExecutor.getSequentialQueuedCrosschainIndex()).canExec).to.equal(false);
            expect(await alluoVoteExecutor.storedCrosschainData(0)).to.equal(message)
            // Even though it is removed from the queued list, it should have still been stored.
        })

    })

    describe("All configuration and view functions", async () => {
        it("Test multiCall", async () => {
            // Should transfer some usdc back to the user
            // user exchanges some eth for usdc
            await _exchange.connect(signers[0]).exchange(ethers.constants.AddressZero, usdc.address, ethers.utils.parseEther("1"), 0, { value: ethers.utils.parseEther("1") });
            let usdcBalanceBefore = await usdc.balanceOf(signers[0].address);
            // Transfer some to the master
            await usdc.connect(signers[0]).transfer(alluoVoteExecutor.address, usdcBalanceBefore);
            let voteExecutorBalance = await usdc.balanceOf(alluoVoteExecutor.address);
            // Encode transferring
            let transferData = usdc.interface.encodeFunctionData("transfer", [signers[0].address, voteExecutorBalance]);
            await alluoVoteExecutor.connect(admin).multicall([usdc.address], [transferData]);
            let usdcBalanceAfter = await usdc.balanceOf(signers[0].address);
            expect(usdcBalanceAfter).to.be.equal(usdcBalanceBefore);
        })


        it("Test updateAllIbAlluoAddresses()", async () => {
            let initialIbAlluoAdress = await alluoVoteExecutor.ibAlluoSymbolToAddress("IbAlluoUSD");
            expect(initialIbAlluoAdress).to.be.equal(ethers.constants.AddressZero);
            await alluoVoteExecutor.connect(admin).updateAllIbAlluoAddresses();
            let updatedIbAlluoAdress = await alluoVoteExecutor.ibAlluoSymbolToAddress("IbAlluoUSD");
            expect(updatedIbAlluoAdress).to.be.equal("0x6b55495947F3793597C0777562C37C14cb958097");
        })

        it("Initial getAssetIdToDepositPercentages() should return 0x", async () => {
            let assetIdToDepositPercentages = await alluoVoteExecutor.getAssetIdToDepositPercentages(0);
            expect(assetIdToDepositPercentages.length).to.be.equal(0);
        })
        it("Initial getSubmittedData should revert", async () => {
            await expect(alluoVoteExecutor.getSubmittedData(0)).to.be.reverted;
        })
        it("GetSubmittedData should return data after submission is complete", async () => {
            // First submit data
            let delta = "-300";
            let encodedCommand2 = await alluoVoteExecutorUtils.encodeTreasuryAllocationChangeCommand(delta);
            let newMintAmount = 1000;
            let period = 10000
            let encodedCommand3 = await alluoVoteExecutorUtils.encodeMintCommand(newMintAmount, period);
            let allEncoded = await alluoVoteExecutorUtils.encodeAllMessages([encodedCommand2[0], encodedCommand3[0]], [encodedCommand2[1], encodedCommand3[1]]);
            await alluoVoteExecutor.connect(admin).submitData(allEncoded.inputData);
            // Now get the data
            let submittedData = await alluoVoteExecutor.getSubmittedData(0);
            expect(submittedData[1]).to.be.greaterThan(0);
            expect(submittedData[2].length).to.equal(0);

        })

        it("Approving data should succeed", async () => {
            let delta = "-300";
            let encodedCommand2 = await alluoVoteExecutorUtils.encodeTreasuryAllocationChangeCommand(delta);
            let newMintAmount = 1000;
            let period = 10000
            let encodedCommand3 = await alluoVoteExecutorUtils.encodeMintCommand(newMintAmount, period);
            let allEncoded = await alluoVoteExecutorUtils.encodeAllMessages([encodedCommand2[0], encodedCommand3[0]], [encodedCommand2[1], encodedCommand3[1]]);
            await alluoVoteExecutor.connect(admin).submitData(allEncoded.inputData);

            let signature = await signers[0].signMessage(ethers.utils.arrayify(allEncoded[0]));
            await alluoVoteExecutor.approveSubmittedData(0, [signature])

            let submittedData = await alluoVoteExecutor.getSubmittedData(0);
            expect(submittedData[2].length).to.equal(1);
        })
        it("Approving data with wrong signer should fail, but function shouldn't revert", async () => {
            let delta = "-300";
            let encodedCommand2 = await alluoVoteExecutorUtils.encodeTreasuryAllocationChangeCommand(delta);
            let newMintAmount = 1000;
            let period = 10000
            let encodedCommand3 = await alluoVoteExecutorUtils.encodeMintCommand(newMintAmount, period);
            let allEncoded = await alluoVoteExecutorUtils.encodeAllMessages([encodedCommand2[0], encodedCommand3[0]], [encodedCommand2[1], encodedCommand3[1]]);
            await alluoVoteExecutor.connect(admin).submitData(allEncoded.inputData);

            let signature = await signers[2].signMessage(ethers.utils.arrayify(allEncoded[0]));
            await alluoVoteExecutor.approveSubmittedData(0, [signature])

            let submittedData = await alluoVoteExecutor.getSubmittedData(0);
            expect(submittedData[2].length).to.equal(0);
        })

        it("Should set Master correctly to true", async () => {
            expect(await alluoVoteExecutor.isMaster()).to.be.true;
            await alluoVoteExecutor.connect(admin).setMaster(true);
            expect(await alluoVoteExecutor.isMaster()).to.be.true;
        })
        it("Should set Master correctly to false", async () => {
            expect(await alluoVoteExecutor.isMaster()).to.be.true;
            await alluoVoteExecutor.connect(admin).setMaster(false);
            expect(await alluoVoteExecutor.isMaster()).to.be.false;
        })

        it("Should set Gnosis correctly and they should get the correct roles", async () => {
            let newGnosis = signers[8].address;
            expect(await alluoVoteExecutor.gnosis()).to.not.equal(newGnosis);
            let DEFAULT_ADMIN_ROLE = await alluoVoteExecutor.DEFAULT_ADMIN_ROLE();
            let UPGRADER_ROLE = await alluoVoteExecutor.UPGRADER_ROLE();
            let hasDefaultAdmin = await alluoVoteExecutor.hasRole(DEFAULT_ADMIN_ROLE, newGnosis);
            let hasUpgrader = await alluoVoteExecutor.hasRole(UPGRADER_ROLE, newGnosis);
            expect(hasDefaultAdmin).to.be.false;
            expect(hasUpgrader).to.be.false;

            await alluoVoteExecutor.connect(admin).setGnosis(newGnosis);
            expect(await alluoVoteExecutor.gnosis()).to.equal(newGnosis);
            hasDefaultAdmin = await alluoVoteExecutor.hasRole(DEFAULT_ADMIN_ROLE, newGnosis);
            hasUpgrader = await alluoVoteExecutor.hasRole(UPGRADER_ROLE, newGnosis);

            expect(hasDefaultAdmin).to.be.true;
            expect(hasUpgrader).to.be.true;
        })

        it("Should set timelock correctly", async () => {
            let newTimelock = 69;
            expect(await alluoVoteExecutor.timeLock()).to.not.equal(newTimelock);
            await alluoVoteExecutor.connect(admin).setTimelock(newTimelock);
            expect(await alluoVoteExecutor.timeLock()).to.equal(newTimelock);
        })

        it("Should set Oracle address correctly", async () => {
            let newOracle = signers[9].address;
            expect(await alluoVoteExecutor.oracle()).to.not.equal(newOracle);
            await alluoVoteExecutor.connect(admin).setOracle(newOracle);
            expect(await alluoVoteExecutor.oracle()).to.equal(newOracle);
        })
        describe("Testing balanceTokens function extensively", async () => {
            it("Should return an empty array when no tokens are present", async () => {
                const executorsBalances = [
                    [0, 0, 0],
                    [0, 0, 0],
                    [0, 0, 0]
                ];
                const tokenIds = [0, 1, 2];
                const desiredPercentages = [
                    [2500, 5000, 2500],
                    [5000, 2500, 2500],
                    [2500, 2500, 5000]
                ];

                const expectedResult = [];

                const result = await alluoVoteExecutorUtils.balanceTokens(
                    executorsBalances,
                    tokenIds,
                    desiredPercentages
                );

                expect(result.length).to.equal(expectedResult.length);
            });
            it("Should return an empty array when no transfers are required", async () => {
                const executorsBalances = [
                    [1000, 1000, 0],
                    [1000, 1000, 0],
                    [1000, 1000, 0]
                ];
                const tokenIds = [0, 1, 2];
                const desiredPercentages = [
                    [5000, 5000, 0],
                    [5000, 5000, 0],
                    [5000, 5000, 0]
                ];

                const expectedResult = [];

                const result = await alluoVoteExecutorUtils.balanceTokens(
                    executorsBalances,
                    tokenIds,
                    desiredPercentages
                );

                expect(result.length).to.equal(expectedResult.length);
            });

            it("Should transfer all tokens from one executor to the others", async () => {
                const executorsBalances = [
                    [0, 0, 0],
                    [6000, 0, 0],
                    [0, 0, 0]
                ];
                const tokenIds = [0, 1, 2];
                const desiredPercentages = [
                    [2500, 5000, 2500],
                    [5000, 2500, 2500],
                    [2500, 2500, 5000]
                ];

                const expectedResult = [
                    { from: 1, to: 0, tokenId: 0, amount: 1500 },
                    { from: 1, to: 2, tokenId: 0, amount: 1500 }
                ];

                const result = await alluoVoteExecutorUtils.balanceTokens(
                    executorsBalances,
                    tokenIds,
                    desiredPercentages
                );

                expect(result.length).to.equal(expectedResult.length);
                console.log("Test result", result)
                for (let i = 0; i < result.length; i++) {
                    expect(result[i].fromExecutor).to.equal(expectedResult[i].from);
                    expect(result[i].toExecutor).to.equal(expectedResult[i].to);
                    expect(result[i].tokenId).to.equal(expectedResult[i].tokenId);
                    expect(result[i].amount).to.equal(expectedResult[i].amount);
                }
            });
            it("Should return an empty array when there is only one executor", async () => {
                const executorsBalances = [
                    [1000, 2000, 3000]
                ];
                const tokenIds = [0, 1, 2];
                const desiredPercentages = [
                    [10000, 10000, 10000]
                ];

                const expectedResult = [];

                const result = await alluoVoteExecutorUtils.balanceTokens(
                    executorsBalances,
                    tokenIds,
                    desiredPercentages
                );

                expect(result.length).to.equal(expectedResult.length);
            });
            it("Should transfer tokens between multiple executors with various balances", async () => {
                const executorsBalances = [
                    [1000, 2000, 3000],
                    [2000, 1000, 2000],
                    [3000, 3000, 1000]
                ];
                const tokenIds = [0, 1, 2];
                const desiredPercentages = [
                    [2500, 5000, 2500],
                    [5000, 2500, 2500],
                    [2500, 2500, 5000]
                ];

                const expectedResult = [
                    { from: 2, to: 0, tokenId: 0, amount: 500 },
                    { from: 2, to: 1, tokenId: 0, amount: 1000 },
                    { from: 2, to: 0, tokenId: 1, amount: 1000 },
                    { from: 2, to: 1, tokenId: 1, amount: 500 },
                    { from: 0, to: 2, tokenId: 2, amount: 1500 },
                    { from: 1, to: 2, tokenId: 2, amount: 500 }
                ];

                const result = await alluoVoteExecutorUtils.balanceTokens(
                    executorsBalances,
                    tokenIds,
                    desiredPercentages
                );
                console.log(result)
                expect(result.length).to.equal(expectedResult.length);
                for (let i = 0; i < result.length; i++) {
                    expect(result[i].fromExecutor).to.equal(expectedResult[i].from);
                    expect(result[i].toExecutor).to.equal(expectedResult[i].to);
                    expect(result[i].tokenId).to.equal(expectedResult[i].tokenId);
                    expect(result[i].amount).to.equal(expectedResult[i].amount);
                }
            });
        })
    })

})