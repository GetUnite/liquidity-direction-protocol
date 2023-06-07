import { ethers, upgrades } from "hardhat";
import { AlluoStrategyHandler, AlluoVoteExecutor, AlluoVoteExecutorUtils, BeefyStrategy, BeefyStrategyUniversal, IBeefyBoost, IBeefyVaultV6, IERC20, IERC20Metadata, IExchange, IPriceFeedRouter, IPriceFeedRouterV2, IWrappedEther, LiquidityHandler, PseudoMultisigWallet } from "../../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { LiquidityHandlerCurrent, SpokePoolMock } from "../../typechain";
import { reset } from "@nomicfoundation/hardhat-network-helpers";

async function main() {
    let alluoVoteExecutor: AlluoVoteExecutor;
    let alluoStrategyHandler: AlluoStrategyHandler;
    let alluoVoteExecutorUtils: AlluoVoteExecutorUtils;
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
    let liquidityHandler: LiquidityHandlerCurrent;

    // await reset(process.env.OPTIMISM_URL);


    //Set admin to me
    admin = await ethers.getSigner("0xABfE4d45c6381908F09EF7c501cc36E38D34c0d4");

    //For test
    let signers = await ethers.getSigners();
    let realSigner = signers[6]
    //Existing setup:
    //
    //
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

    liquidityHandler = await ethers.getContractAt("LiquidityHandler", "0x937F7125994a91d5E2Ce31846b97578131056Bb4") as LiquidityHandlerCurrent;


    spokePool = "0x6f26Bf09B1C792e3228e5467807a900A503c0281"    //Temp just for simulation
    _recipient = "0xa420b2d1c0841415A695b81E5B867BCD07Dff8C9" //Temp for simulation
    _recipientChainId = "137";
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
        pseudoMultiSig.address, _exchange.address, priceRouter.address, liquidityHandler.address, alluoStrategyHandler.address, "0xc22DB2874725B84e99EC0a644fdD042EA3F6F899", alluoVoteExecutorUtils.address, "0xdEBbFE665359B96523d364A19FceC66B0E43860D", 0, 1, true
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