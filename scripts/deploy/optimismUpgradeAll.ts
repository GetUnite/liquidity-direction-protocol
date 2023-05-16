import { ethers, upgrades } from "hardhat";
import { AlluoStrategyHandler, AlluoVoteExecutor, AlluoVoteExecutorUtils, BeefyStrategy, BeefyStrategyUniversal, Exchange, IBeefyBoost, IBeefyVaultV6, IERC20, IERC20Metadata, IExchange, IPriceFeedRouter, IPriceFeedRouterV2, IWrappedEther, LiquidityHandler, PseudoMultisigWallet } from "../../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { LiquidityHandlerCurrent, SpokePoolMock } from "../../typechain";
import { reset } from "@nomicfoundation/hardhat-network-helpers";
import { run } from "hardhat";
import { AnyAaaaRecord } from "dns";

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

    let entryData4 = await beefyStrategy.encodeData("0x2F4BBA9fC4F77F16829F84181eB7C8b50F639F95", ethers.constants.AddressZero, 0, usdc.address)
    let exitData4 = entryData4
    let rewardsData4 = entryData4
    let setData = await alluoStrategyHandler.setLiquidityDirection("BeefyMooStargateUsdcPolygon", 4, beefyStrategy.address, usdc.address, 0, 137, entryData4, exitData4, rewardsData4);
    await setData.wait()
    console.log("Set data complete")

    //  OK lets upgrade the executor on polygon first
    let executorFactory = await ethers.getContractFactory("AlluoVoteExecutor");
    let stauts = await alluoVoteExecutor.changeUpgradeStatus(true)
    await stauts.wait()
    let executor = await upgrades.upgradeProxy(alluoVoteExecutor.address, executorFactory);
    console.log("Executor upgraded")
    // Upgrade the handler
    let handlerFactory = await ethers.getContractFactory("AlluoStrategyHandler");
    let stauts1 = await alluoStrategyHandler.changeUpgradeStatus(true)
    await stauts1.wait()
    let handler = await upgrades.upgradeProxy(alluoStrategyHandler.address, handlerFactory);
    console.log("Handler upgraded")

    // // Upgrade the utils
    let utilsFactory = await ethers.getContractFactory("AlluoVoteExecutorUtils");
    let stauts3 = await alluoVoteExecutorUtils.changeUpgradeStatus(true)
    await stauts3.wait()
    let utils = await upgrades.upgradeProxy(alluoVoteExecutorUtils.address, utilsFactory);
    console.log("All complete")

    // Now verify all the implementations
    console.log("verifying now")
    await verify(alluoVoteExecutor.address)
    console.log("verified executor")
    await verify(alluoStrategyHandler.address)
    console.log("verified handler")
    await verify(alluoVoteExecutorUtils.address)
    console.log("verified utils")
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

const verify = async (contractAddress: any) => {
    console.log("Verifying contract...");
    try {
        await run("verify:verify", {
            address: contractAddress,
        });
    } catch (e: any) {
        if (e.message.toLowerCase().includes("already verified")) {
            console.log("Already verified!");
        } else {
            console.log(e);
        }
    }
};

//npx hardhat run scripts/deploy/deployHandler.ts --network polygon
//npx hardhat verify 0xb647c6fe9d2a6e7013c7e0924b71fa7926b2a0a3 --network polygon