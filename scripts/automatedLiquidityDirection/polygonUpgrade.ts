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
    let _exchange: IExchange;
    let priceRouter: IPriceFeedRouterV2;
    let weth: IWrappedEther;
    let usdc: IERC20Metadata;
    let beefyStrategy: BeefyStrategyUniversal;
    let ldo: IERC20Metadata;
    let liquidityHandler: LiquidityHandlerCurrent;

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

    alluoStrategyHandler = await ethers.getContractAt("AlluoStrategyHandler", "0x4eaCDBFE57Bd641266Cab20D40174dc76802F955") as AlluoStrategyHandler;
    alluoVoteExecutor = await ethers.getContractAt("AlluoVoteExecutor", "0x546e8589E5eF88AA5cA19134FAb800a49D52eE66") as AlluoVoteExecutor;
    alluoVoteExecutorUtils = await ethers.getContractAt("AlluoVoteExecutorUtils", "0xA9081414C281De5d0B8c67a1b7a631332e259850") as AlluoVoteExecutorUtils
    beefyStrategy = await ethers.getContractAt("BeefyStrategyUniversal", "0x62cB09739920d071809dFD9B66D2b2cB27141410") as BeefyStrategyUniversal
    pseudoMultiSig = await ethers.getContractAt("PseudoMultisigWallet", "0xb26D2B27f75844E5ca8Bf605190a1D8796B38a25", signers[6]) as PseudoMultisigWallet

    //  OK lets upgrade the executor on polygon first
    // let executorFactory = await ethers.getContractFactory("AlluoVoteExecutor");
    // await upgrades.forceImport("0x546e8589E5eF88AA5cA19134FAb800a49D52eE66", executorFactory);
    // let stauts = await alluoVoteExecutor.changeUpgradeStatus(true)
    // await stauts.wait()
    // let exec = await upgrades.upgradeProxy(alluoVoteExecutor.address, executorFactory);
    // await alluoVoteExecutor.setTimelock(60 * 60 * 24)
    // console.log("Executor upgraded")


    // // // Upgrade the handler
    let handlerFactory = await ethers.getContractFactory("AlluoStrategyHandler");
    let stauts1 = await alluoStrategyHandler.changeUpgradeStatus(true)
    await stauts1.wait()
    let handler = await upgrades.upgradeProxy(alluoStrategyHandler.address, handlerFactory);
    console.log("Handler upgraded")
    await alluoStrategyHandler.clearDepositQueue(0);

    // // Upgrade the utils
    // let utilsFactory = await ethers.getContractFactory("AlluoVoteExecutorUtils");
    // let stauts3 = await alluoVoteExecutorUtils.changeUpgradeStatus(true)
    // await stauts3.wait()
    // let utils = await upgrades.upgradeProxy(alluoVoteExecutorUtils.address, utilsFactory);
    // console.log("All complete")
    // await alluoVoteExecutorUtils.setAssetIdToIbAlluoAddresses("0xC2DbaAEA2EfA47EBda3E572aa0e55B742E408BF6", 0)
    // await alluoVoteExecutorUtils.setAssetIdToIbAlluoAddresses("0xc9d8556645853C465D1D5e7d2c81A0031F0B8a92", 1)
    // await alluoVoteExecutorUtils.setAssetIdToIbAlluoAddresses("0xc677B0918a96ad258A68785C2a3955428DeA7e50", 2)
    // await alluoVoteExecutorUtils.setAssetIdToIbAlluoAddresses("0xf272Ff86c86529504f0d074b210e95fc4cFCDce2", 3)


    // // // Now verify all the implementations
    console.log("verifying now")
    // await verify(alluoVoteExecutor.address)
    // console.log("verified executor")
    await verify(alluoStrategyHandler.address)
    console.log("verified handler")
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

//npx hardhat run scripts/deploy/deployHandler.ts --network polygon
//npx hardhat verify 0xb647c6fe9d2a6e7013c7e0924b71fa7926b2a0a3 --network polygon