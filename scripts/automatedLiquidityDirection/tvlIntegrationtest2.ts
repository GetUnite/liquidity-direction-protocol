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


    // let usdcApproveMax = usdc.interface.encodeFunctionData("approve", [spokePool, ethers.constants.MaxUint256])
    // let funcData = alluoVoteExecutor.interface.encodeFunctionData("multicall", [[usdc.address], [usdcApproveMax]])
    // await pseudoMultiSig.executeCall(alluoVoteExecutor.address, funcData);
    // let func5 = alluoVoteExecutor.interface.encodeFunctionData("setAcrossInformation", [spokePool, ethers.utils.parseUnits("4", 17)])
    // let func6 = alluoVoteExecutor.interface.encodeFunctionData("setFeeInformation", [usdc.address, 10, ethers.utils.parseUnits("5", 6)])
    // await pseudoMultiSig.executeCall(alluoVoteExecutor.address, func5)
    // await pseudoMultiSig.executeCall(alluoVoteExecutor.address, func6)

    let funcData2 = alluoVoteExecutor.interface.encodeFunctionData("grantRole", [await alluoVoteExecutor.DEFAULT_ADMIN_ROLE(), alluoStrategyHandler.address])
    let funcData3 = alluoVoteExecutor.interface.encodeFunctionData("grantRole", [await alluoVoteExecutor.DEFAULT_ADMIN_ROLE(), alluoVoteExecutorUtils.address])
    let funcData = alluoVoteExecutor.interface.encodeFunctionData("grantRole", [await alluoVoteExecutor.DEFAULT_ADMIN_ROLE(), admin.address])

    await pseudoMultiSig.executeCall(alluoVoteExecutor.address, funcData)
    // await pseudoMultiSig.executeCall(alluoVoteExecutor.address, funcData2)
    // await pseudoMultiSig.executeCall(alluoVoteExecutor.address, funcData3)
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
