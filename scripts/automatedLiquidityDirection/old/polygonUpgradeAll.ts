import { ethers, upgrades } from "hardhat";
import { AlluoStrategyHandler, AlluoVoteExecutor, AlluoVoteExecutorUtils, BeefyStrategy, BeefyStrategyUniversal, Exchange, IBeefyBoost, IBeefyVaultV6, IERC20, IERC20Metadata, IExchange, IPriceFeedRouter, IPriceFeedRouterV2, IWrappedEther, LiquidityHandler, PseudoMultisigWallet } from "../../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { LiquidityHandlerCurrent, SpokePoolMock } from "../../typechain";
import { reset } from "@nomicfoundation/hardhat-network-helpers";
import { run } from "hardhat";
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


    //Set admin to me
    admin = await ethers.getSigner("0xABfE4d45c6381908F09EF7c501cc36E38D34c0d4");
    _exchange = await ethers.getContractAt(
        "Exchange",
        "0xeE0674C1E7d0f64057B6eCFe845DC2519443567F"
    ) as unknown as Exchange;
    priceRouter = await ethers.getContractAt("contracts/interfaces/IPriceFeedRouterV2.sol:IPriceFeedRouterV2", "0x82220c7Be3a00ba0C6ed38572400A97445bdAEF2") as IPriceFeedRouterV2;

    weth = await ethers.getContractAt(
        "contracts/interfaces/IWrappedEther.sol:IWrappedEther",
        "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619"
    ) as IWrappedEther;

    usdc = await ethers.getContractAt(
        "IERC20Metadata",
        "0x2791bca1f2de4661ed88a30c99a7a9449aa84174") as IERC20Metadata;

    spokePool = "0x9295ee1d8C5b022Be115A2AD3c30C72E34e7F096"    //Temp just for simulation
    _recipient = "0xa420b2d1c0841415A695b81E5B867BCD07Dff8C9"
    _recipientChainId = "10";
    _relayerFeePct = 757873726198165;
    _slippageTolerance = 300;
    //
    //
    pseudoMultiSig = await ethers.getContractAt("PseudoMultisigWallet", "0xF5bcDf59Db2b1f18C88287387f30ba9Acfb1Dc43") as PseudoMultisigWallet;
    alluoVoteExecutor = await ethers.getContractAt("AlluoVoteExecutor", "0xD15c966D754e64D2620Eb3160F847c081E9d1727") as AlluoVoteExecutor;
    alluoStrategyHandler = await ethers.getContractAt("AlluoStrategyHandler", "0x4378d507b5254B6f625De3b43Fa9ac90D85aB412") as AlluoStrategyHandler;
    alluoVoteExecutorUtils = await ethers.getContractAt("AlluoVoteExecutorUtils", "0xF7CBd495712c02E1A83987EF65F81204b15cc02B") as AlluoVoteExecutorUtils;
    beefyStrategy = await ethers.getContractAt("BeefyStrategyUniversal", "0x3BD9e8831F007528275741C1d0728699aB8bcBe1") as BeefyStrategyUniversal;


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