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

    alluoStrategyHandler = await ethers.getContractAt("AlluoStrategyHandler", "0x4eaCDBFE57Bd641266Cab20D40174dc76802F955") as AlluoStrategyHandler;
    alluoVoteExecutor = await ethers.getContractAt("AlluoVoteExecutor", "0x546e8589E5eF88AA5cA19134FAb800a49D52eE66") as AlluoVoteExecutor;
    alluoVoteExecutorUtils = await ethers.getContractAt("AlluoVoteExecutorUtils", "0xA9081414C281De5d0B8c67a1b7a631332e259850") as AlluoVoteExecutorUtils
    beefyStrategy = await ethers.getContractAt("BeefyStrategyUniversal", "0x62cB09739920d071809dFD9B66D2b2cB27141410") as BeefyStrategyUniversal
    pseudoMultiSig = await ethers.getContractAt("PseudoMultisigWallet", "0xb26D2B27f75844E5ca8Bf605190a1D8796B38a25", signers[6]) as PseudoMultisigWallet

    let optimismWETHAddress = "0x4200000000000000000000000000000000000006"

    // let wethBalance = await weth.balanceOf(beefyStrategy.address)


    // let entryData3 = await beefyStrategy.encodeData("0xcAdC68d5834898D54929E694eD19e833e0117694", ethers.constants.AddressZero, 2, optimismWETHAddress)
    // let exitData3 = entryData3
    // let rewardsData3 = entryData3
    // await alluoStrategyHandler.setLiquidityDirection("BeefyStETHOptimism", 5, beefyStrategy.address, optimismWETHAddress, 2, 10, entryData3, exitData3, rewardsData3);
    // await beefyStrategy.invest(entryData3, wethBalance.div(2))

    // // // mooStargateUSDC Polygon
    // let entryData4 = await beefyStrategy.encodeData("0x1b620BE62788e940b4c4ae6Df933c50981AcAB80", ethers.constants.AddressZero, 2, optimismWETHAddress)
    // let exitData4 = entryData4
    // let rewardsData4 = entryData4
    // await alluoStrategyHandler.setLiquidityDirection("BeefyFrxETHOptimism", 6, beefyStrategy.address, optimismWETHAddress, 2, 10, entryData4, exitData4, rewardsData4);
    // await beefyStrategy.invest(entryData4, wethBalance.div(2))
    let polygonETHAddress = "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619"
    let entryData5 = await beefyStrategy.encodeData("0x5A0801BAd20B6c62d86C566ca90688A6b9ea1d3f", ethers.constants.AddressZero, 2, polygonETHAddress);
    let exitData5 = entryData5;
    let rewardsData5 = entryData5;
    await alluoStrategyHandler.setLiquidityDirection("BeefyaTriCrypto3EthPolygon", 7, beefyStrategy.address, polygonETHAddress, 2, 137, entryData5, exitData5, rewardsData5);


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

//npx hardhat run scripts/automatedLiquidityDIrection/optimismUpgrade.ts --network optimisticEthereum
