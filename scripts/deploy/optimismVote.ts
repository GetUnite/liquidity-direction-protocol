import { ethers, upgrades } from "hardhat";
import { AlluoStrategyHandler, AlluoVoteExecutor, AlluoVoteExecutorUtils, BeefyStrategy, BeefyStrategyUniversal, Exchange, IBeefyBoost, IBeefyVaultV6, IERC20, IERC20Metadata, IExchange, IPriceFeedRouter, IPriceFeedRouterV2, IWrappedEther, LiquidityHandler, PseudoMultisigWallet } from "../../typechain-types";
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
    let _exchange: Exchange;
    let priceRouter: IPriceFeedRouterV2;
    let weth: IWrappedEther;
    let usdc: IERC20Metadata;
    let beefyStrategy: BeefyStrategyUniversal;
    let ldo: IERC20Metadata;
    let liquidityHandler: LiquidityHandlerCurrent;

    let beefyVault: IBeefyVaultV6;
    let beefyBoost: IBeefyBoost;
    let beefyVaultLp: IERC20Metadata;

    //Set admin to me
    admin = await ethers.getSigner("0xABfE4d45c6381908F09EF7c501cc36E38D34c0d4");

    _exchange = await ethers.getContractAt(
        "Exchange",
        "0x66Ac11c106C3670988DEFDd24BC75dE786b91095"
    ) as unknown as Exchange;
    priceRouter = await ethers.getContractAt("contracts/interfaces/IPriceFeedRouterV2.sol:IPriceFeedRouterV2", "0x7E6FD319A856A210b9957Cd6490306995830aD25") as IPriceFeedRouterV2;

    weth = await ethers.getContractAt(
        "contracts/interfaces/IWrappedEther.sol:IWrappedEther",
        "0x4200000000000000000000000000000000000006"
    ) as IWrappedEther;

    usdc = await ethers.getContractAt(
        "IERC20Metadata",
        "0x7f5c764cbc14f9669b88837ca1490cca17c31607") as IERC20Metadata;

    spokePool = "0x6f26Bf09B1C792e3228e5467807a900A503c0281"    //Temp just for simulation
    _recipient = "0xa420b2d1c0841415A695b81E5B867BCD07Dff8C9"
    _recipientChainId = "137";
    _relayerFeePct = 0;
    _slippageTolerance = 300;
    //
    //
    pseudoMultiSig = await ethers.getContractAt("PseudoMultisigWallet", "0x1D9D527083A0A475272E09fe14C033F16ac0b554") as PseudoMultisigWallet;
    alluoVoteExecutor = await ethers.getContractAt("AlluoVoteExecutor", "0x8522f392AA7Da316984D3b1F816E3b700773187f") as AlluoVoteExecutor;
    alluoStrategyHandler = await ethers.getContractAt("AlluoStrategyHandler", "0xf669F4C895B0f15f96C6E07125f22CDdac3E01A3") as AlluoStrategyHandler;
    alluoVoteExecutorUtils = await ethers.getContractAt("AlluoVoteExecutorUtils", "0xdbA78564d79CA6D831252B2BfD38f859521d4e94") as AlluoVoteExecutorUtils;
    beefyStrategy = await ethers.getContractAt("BeefyStrategyUniversal", "0x90aa727b7ee79be2272e11698da9a211cd736db7") as BeefyStrategyUniversal;


    let polygonUSDCAddress = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"
    let entryData3 = await beefyStrategy.encodeData("0x1C480521100c962F7da106839a5A504B5A7457a1", ethers.constants.AddressZero, 0, polygonUSDCAddress)
    let exitData3 = entryData3
    let rewardsData3 = entryData3
    await alluoStrategyHandler.setLiquidityDirection("BeefyMooStargateUsdtPolygon", 3, beefyStrategy.address, polygonUSDCAddress, 0, 137, entryData3, exitData3, rewardsData3);
    // Withdraw all from usdc stargetate polygon
    // 20% to usdt polygon
    // 30% to maiUSDC optimism
    // 50% to DolaMai optimism
    //     let encodedMessage1 = await alluoVoteExecutorUtils.encodeLiquidityCommand("BeefyMooStargateUsdcPolygon", 0, 1);
    //     let encodedMessage2 = await alluoVoteExecutorUtils.encodeLiquidityCommand("BeefyMooStargateUsdtPolygon", 2000, 1);
    //     let encodedMessage3 = await alluoVoteExecutorUtils.encodeLiquidityCommand("BeefyMaiUsdcOptimism", 3000, 0);
    //     let encodedMessage4 = await alluoVoteExecutorUtils.encodeLiquidityCommand("BeefyDolaMaiOptimism", 5000, 0);
    //     let encodeAllMessages = await alluoVoteExecutorUtils.encodeAllMessages([encodedMessage1[0], encodedMessage2[0], encodedMessage3[0], encodedMessage4[0]], [encodedMessage1[1], encodedMessage2[1], encodedMessage3[1], encodedMessage4[1]]);
    //     await alluoVoteExecutor.submitData(encodeAllMessages.inputData);

    //     let signature = await admin.signMessage(ethers.utils.arrayify(encodeAllMessages[0]));
    //     await alluoVoteExecutor.approveSubmittedData(0, [signature])
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

//npx hardhat run scripts/deploy/deployHandler.ts --network polygon
//npx hardhat verify 0xb647c6fe9d2a6e7013c7e0924b71fa7926b2a0a3 --network polygon