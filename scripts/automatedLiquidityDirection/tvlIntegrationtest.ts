import { ethers, upgrades } from "hardhat";
import { AlluoStrategyHandler, AlluoVoteExecutor, AlluoVoteExecutorUtils, BeefyStrategy, BeefyStrategyUniversal, IBeefyBoost, IBeefyVaultV6, IERC20, IERC20Metadata, IExchange, IPriceFeedRouter, IPriceFeedRouterV2, IWrappedEther, LiquidityHandler, PseudoMultisigWallet } from "../../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { LiquidityHandlerCurrent, SpokePoolMock } from "../../typechain";
import { reset } from "@nomicfoundation/hardhat-network-helpers";

async function main() {
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
    let beefyStrategy: BeefyStrategyUniversal;
    let ldo: IERC20Metadata;
    let liquidityHandler: LiquidityHandlerCurrent;

    let beefyVault: IBeefyVaultV6;
    let beefyBoost: IBeefyBoost;
    let beefyVaultLp: IERC20Metadata;
    // await reset(process.env.OPTIMISM_URL);

    //Set admin to me
    admin = await ethers.getSigner("0xABfE4d45c6381908F09EF7c501cc36E38D34c0d4");

    //For test
    signers = await ethers.getSigners();
    admin = signers[0];

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
    _recipientChainId = "137";

    alluoStrategyHandler = await ethers.getContractAt("AlluoStrategyHandler", "0x4eaCDBFE57Bd641266Cab20D40174dc76802F955") as AlluoStrategyHandler;
    alluoVoteExecutor = await ethers.getContractAt("AlluoVoteExecutor", "0x546e8589E5eF88AA5cA19134FAb800a49D52eE66") as AlluoVoteExecutor;
    alluoVoteExecutorUtils = await ethers.getContractAt("AlluoVoteExecutorUtils", "0xA9081414C281De5d0B8c67a1b7a631332e259850") as AlluoVoteExecutorUtils
    beefyStrategy = await ethers.getContractAt("BeefyStrategyUniversal", "0x62cB09739920d071809dFD9B66D2b2cB27141410") as BeefyStrategyUniversal
    pseudoMultiSig = await ethers.getContractAt("PseudoMultisigWallet", "0xb26D2B27f75844E5ca8Bf605190a1D8796B38a25", signers[6]) as PseudoMultisigWallet


    let encodedMessage1 = await alluoVoteExecutorUtils.encodeLiquidityCommand("BeefyMooStargateUsdcPolygon", 5000, 1);
    let encodedMessage2 = await alluoVoteExecutorUtils.encodeLiquidityCommand("BeefyMooStargateUsdtPolygon", 5000, 1);
    let encodedMessage3 = await alluoVoteExecutorUtils.encodeLiquidityCommand("BeefyMaiUsdcOptimism", 0, 0);
    let encodedMessage4 = await alluoVoteExecutorUtils.encodeLiquidityCommand("BeefyDolaMaiOptimism", 0, 0);
    let encodedMessage5 = await alluoVoteExecutorUtils.encodeLiquidityCommand("BeefyStETHOptimism", 7000, 0);
    let encodedMessage6 = await alluoVoteExecutorUtils.encodeLiquidityCommand("BeefyFrxETHOptimism", 3000, 0);
    let encodeAllMessages = await alluoVoteExecutorUtils.encodeAllMessages([encodedMessage1[0], encodedMessage2[0], encodedMessage3[0], encodedMessage4[0], encodedMessage5[0], encodedMessage6[0]], [encodedMessage1[1], encodedMessage2[1], encodedMessage3[1], encodedMessage4[1], encodedMessage5[1], encodedMessage6[1]]);
    await alluoVoteExecutor.submitData(encodeAllMessages.inputData);

    let signature = await admin.signMessage(ethers.utils.arrayify(encodeAllMessages[0]));
    console.log("signature", signature)
    // Increment this number
    //
    //
    let tx = await alluoVoteExecutor.approveSubmittedData(12, [signature])
    await tx.wait()
    await alluoVoteExecutor.executeSpecificData(12)
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

    // npx hardhat run scripts/automatedLiquidityDirection/tvlIntegrationtest.ts --network optimisticEthereum