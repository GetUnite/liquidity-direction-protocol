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

    // await reset(process.env.OPTIMISM_URL);

    //Set admin to me
    admin = await ethers.getSigner("0xABfE4d45c6381908F09EF7c501cc36E38D34c0d4");

    //For test
    signers = await ethers.getSigners();
    // admin = signers[0];

    _exchange = await ethers.getContractAt(
        "contracts/interfaces/IExchange.sol:IExchange",
        "0xeE0674C1E7d0f64057B6eCFe845DC2519443567F"
    ) as IExchange;
    priceRouter = await ethers.getContractAt("contracts/interfaces/IPriceFeedRouterV2.sol:IPriceFeedRouterV2", "0x82220c7Be3a00ba0C6ed38572400A97445bdAEF2") as IPriceFeedRouterV2;

    weth = await ethers.getContractAt(
        "contracts/interfaces/IWrappedEther.sol:IWrappedEther",
        "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619"
    ) as IWrappedEther;

    usdc = await ethers.getContractAt(
        "IERC20Metadata",
        "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174") as IERC20Metadata;

    spokePool = "0x9295ee1d8C5b022Be115A2AD3c30C72E34e7F096"
    _recipientChainId = "10";

    alluoStrategyHandler = await ethers.getContractAt("AlluoStrategyHandler", "0xca3708D709f1324D21ad2C0fb551CC4a0882FD29") as AlluoStrategyHandler;
    alluoVoteExecutor = await ethers.getContractAt("AlluoVoteExecutor", "0x3DC877A5a211a082E7c2D64aa816dd079b50AddB") as AlluoVoteExecutor;
    alluoVoteExecutorUtils = await ethers.getContractAt("AlluoVoteExecutorUtils", "0xDD9FC096606Ca0a3D8Be9178959f492c9C23966F") as AlluoVoteExecutorUtils

    //  OK lets upgrade the executor on polygon first
    let executorFactory = await ethers.getContractFactory("AlluoVoteExecutor");
    // let stauts = await alluoVoteExecutor.changeUpgradeStatus(true)
    // await stauts.wait()
    let exec = await upgrades.upgradeProxy(alluoVoteExecutor.address, executorFactory);
    console.log("Executor upgraded")


    // // // // Upgrade the handler
    // let handlerFactory = await ethers.getContractFactory("AlluoStrategyHandler");
    // let stauts1 = await alluoStrategyHandler.changeUpgradeStatus(true)
    // await stauts1.wait()
    // let handler = await upgrades.upgradeProxy(alluoStrategyHandler.address, handlerFactory);
    // console.log("Handler upgraded")

    // // // Upgrade the utils
    // let utilsFactory = await ethers.getContractFactory("AlluoVoteExecutorUtils");
    // let stauts3 = await alluoVoteExecutorUtils.changeUpgradeStatus(true)
    // await stauts3.wait()
    // let utils = await upgrades.upgradeProxy(alluoVoteExecutorUtils.address, utilsFactory);
    // console.log("All complete")



    // Now verify all the implementations
    console.log("verifying now")
    await verify(alluoVoteExecutor.address)
    console.log("verified executor")
    // await verify(alluoStrategyHandler.address)
    // console.log("verified handler")
    // await verify(alluoVoteExecutorUtils.address)
    // console.log("verified utils")


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

// npx hardhat run scripts/productionLiquidityDIrection/polygon/upgradeContracts.ts --network polygon
