import { ethers, upgrades } from "hardhat";
import { AlluoStrategyHandler, AlluoVoteExecutor, AlluoVoteExecutorUtils, BeefyStrategy, BeefyStrategyUniversal, Exchange, IBeefyBoost, IBeefyVaultV6, IERC20, IERC20Metadata, IExchange, IPriceFeedRouter, IPriceFeedRouterV2, IWrappedEther, LiquidityHandler, PseudoMultisigWallet } from "../../../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { reset } from "@nomicfoundation/hardhat-network-helpers";
import { run } from "hardhat";
async function main() {
    let alluoVoteExecutor: AlluoVoteExecutor;
    let alluoStrategyHandler: AlluoStrategyHandler;
    let alluoVoteExecutorUtils: AlluoVoteExecutorUtils;
    let signers: SignerWithAddress[];
    let admin: SignerWithAddress;
    let spokePool: string;
    let _recipientChainId: string;
    let _exchange: IExchange;
    let priceRouter: IPriceFeedRouterV2;
    let weth: IWrappedEther;
    let usdc: IERC20Metadata;

    admin = await ethers.getSigner("0xABfE4d45c6381908F09EF7c501cc36E38D34c0d4");

    //For test
    signers = await ethers.getSigners();
    // admin = signers[0];

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

    alluoStrategyHandler = await ethers.getContractAt("AlluoStrategyHandler", "0xca3708D709f1324D21ad2C0fb551CC4a0882FD29") as AlluoStrategyHandler;
    alluoVoteExecutor = await ethers.getContractAt("AlluoVoteExecutor", "0x3DC877A5a211a082E7c2D64aa816dd079b50AddB") as AlluoVoteExecutor;
    alluoVoteExecutorUtils = await ethers.getContractAt("AlluoVoteExecutorUtils", "0xDD9FC096606Ca0a3D8Be9178959f492c9C23966F") as AlluoVoteExecutorUtils

    //  OK lets upgrade the executor on polygon first
    let executorFactory = await ethers.getContractFactory("AlluoVoteExecutor");

    // let stauts = await alluoVoteExecutor.changeUpgradeStatus(true)
    // await stauts.wait()
    let exec = await upgrades.upgradeProxy(alluoVoteExecutor.address, executorFactory);

    console.log("Executor upgraded")

    // // Upgrade the handler
    // let handlerFactory = await ethers.getContractFactory("AlluoStrategyHandler");
    // let stauts1 = await alluoStrategyHandler.changeUpgradeStatus(true)
    // await stauts1.wait()
    // let handler = await upgrades.upgradeProxy(alluoStrategyHandler.address, handlerFactory);
    // console.log("Handler upgraded")

    // Upgrade the utils
    // let utilsFactory = await ethers.getContractFactory("AlluoVoteExecutorUtils");
    // let stauts3 = await alluoVoteExecutorUtils.changeUpgradeStatus(true)
    // await stauts3.wait()
    // let utils = await upgrades.upgradeProxy(alluoVoteExecutorUtils.address, utilsFactory);


    // let beefyStrategyFactory = await ethers.getContractFactory("BeefyStrategyUniversal");
    // let stauts4 = await beefyStrategy.changeUpgradeStatus(true)
    // await stauts4.wait()
    // let beefyStrategyUpgraded = await upgrades.upgradeProxy(beefyStrategy.address, beefyStrategyFactory);
    // console.log("Beefy upgraded")


    console.log("All complete")

    // // Now verify all the implementations
    console.log("verifying now")
    await verify(alluoVoteExecutor.address)
    console.log("verified executor")
    // await verify(alluoStrategyHandler.address)
    // console.log("verified handler")
    // // await verify(alluoVoteExecutorUtils.address)
    // // console.log("verified utils")
    // await verify(beefyStrategy.address)
    // console.log("verified beefy")

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

//npx hardhat run scripts/productionLiquidityDIrection/upgradeContracts.ts --network optimisticEthereum
