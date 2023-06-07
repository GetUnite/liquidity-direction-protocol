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
    // await reset(process.env.POLYGON_FORKING_URL);

    //Set admin to me
    admin = await ethers.getSigner("0xABfE4d45c6381908F09EF7c501cc36E38D34c0d4");

    //For test
    signers = await ethers.getSigners();
    let realSigner = signers[6]
    console.log(realSigner.address)

    // admin = signers[0];

    //Existing setup:
    //
    //
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
        "0x2791bca1f2de4661ed88a30c99a7a9449aa84174") as IERC20Metadata;

    liquidityHandler = await ethers.getContractAt("LiquidityHandler", "0x31a3439Ac7E6Ea7e0C0E4b846F45700c6354f8c1") as LiquidityHandlerCurrent;


    spokePool = "0x9295ee1d8C5b022Be115A2AD3c30C72E34e7F096"    //Temp just for simulation
    _recipient = "0xa420b2d1c0841415A695b81E5B867BCD07Dff8C9" //Temp for simulation
    _recipientChainId = "10";
    _relayerFeePct = 100000000
    _slippageTolerance = 300;
    //
    //
    //


    // Step 1: Deploy pseudoMultisig wallet
    const PseudoMultisig = await ethers.getContractFactory("PseudoMultisigWallet", realSigner);
    pseudoMultiSig = await PseudoMultisig.deploy(false) as PseudoMultisigWallet
    await pseudoMultiSig.deployed();
    console.log("PseudoMultisig deployed to:", pseudoMultiSig.address);


    let strategyHandlerFactory = await ethers.getContractFactory("AlluoStrategyHandler", realSigner);


    // //  Deploy utils and strategyHandler
    let utilsFactory = await ethers.getContractFactory("AlluoVoteExecutorUtils", realSigner);
    alluoVoteExecutorUtils = (await upgrades.deployProxy(utilsFactory, [
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        admin.address
    ], {
        initializer: "initialize"
    })) as AlluoVoteExecutorUtils;

    // Careful of who admin is
    alluoStrategyHandler = (await upgrades.deployProxy(strategyHandlerFactory, [admin.address, spokePool, _recipient, _recipientChainId, _relayerFeePct, _slippageTolerance, _exchange.address, alluoVoteExecutorUtils.address])) as AlluoStrategyHandler;
    console.log("StrategyHandler deployed to: ", alluoStrategyHandler.address);

    //
    //
    //
    // Now deploy AlluoVoteExecutor
    //
    let voteExecutorFactory = await ethers.getContractFactory("AlluoVoteExecutor", realSigner);

    alluoVoteExecutor = (await upgrades.deployProxy(voteExecutorFactory, [
        pseudoMultiSig.address, _exchange.address, priceRouter.address, liquidityHandler.address, alluoStrategyHandler.address, "0xc22DB2874725B84e99EC0a644fdD042EA3F6F899", alluoVoteExecutorUtils.address, "0xdEBbFE665359B96523d364A19FceC66B0E43860D", 0, 1, false
    ])) as AlluoVoteExecutor;


    // Deploy the beefy strategyUSD
    let beefyStrategyFactory = await ethers.getContractFactory("BeefyStrategyUniversal", realSigner);
    beefyStrategy = await upgrades.deployProxy(
        beefyStrategyFactory,
        [
            admin.address,
            alluoVoteExecutor.address,
            alluoStrategyHandler.address,
            priceRouter.address,
            _exchange.address,
            weth.address
        ],
        { kind: 'uups' }
    ) as BeefyStrategyUniversal;

    console.log("BeefyStrategyUniversal deployed to: ", beefyStrategy.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

//npx hardhat run scripts/deploy/deployHandler.ts --network polygon
//npx hardhat verify 0xb647c6fe9d2a6e7013c7e0924b71fa7926b2a0a3 --network polygon