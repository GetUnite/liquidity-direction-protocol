import { ethers, upgrades, } from "hardhat";
import { AlluoStrategyHandler, AlluoVoteExecutor, AlluoVoteExecutorUtils, BeefyStrategy, BeefyStrategyUniversal, ExchangePriceOracle, ExchangePriceOracle__factory, IBeefyBoost, IBeefyVaultV6, IERC20, IERC20Metadata, IExchange, IPriceFeedRouter, IPriceFeedRouterV2, ISpokePoolNew, IWrappedEther, LiquidityHandler, NullStrategy, OmnivaultStrategy, PseudoMultisigWallet } from "../../../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { reset } from "@nomicfoundation/hardhat-network-helpers";
import { LiquidityHandlerCurrent } from "../../../typechain-types";
import { BigNumberish } from "@across-protocol/sdk-v2/dist/utils";

async function main() {
    let alluoVoteExecutor: AlluoVoteExecutor;
    let alluoStrategyHandler: AlluoStrategyHandler;
    let alluoVoteExecutorUtils: AlluoVoteExecutorUtils;
    let signers: SignerWithAddress[];
    let admin: SignerWithAddress;
    let spokePool: string;
    let _recipient: string;
    let _recipientChainId: string;
    let _relayerFeePct: BigNumberish;
    let _slippageTolerance: number;
    let _exchange: IExchange;
    let priceRouter: IPriceFeedRouterV2;

    let weth: IWrappedEther;
    let usdc: IERC20Metadata;
    let ageur: IERC20Metadata;
    let wbtc: IERC20Metadata;
    let usdt: IERC20Metadata;

    let liquidityHandler: LiquidityHandlerCurrent;
    let exchangePriceOracle: ExchangePriceOracle;


    let beefyStrategy: BeefyStrategyUniversal;
    let omnivaultStrategy: OmnivaultStrategy;
    let nullStrategy: NullStrategy;

    // await reset(process.env.POLYGON_URL)
    admin = await ethers.getSigner("0x2580f9954529853Ca5aC5543cE39E9B5B1145135")

    signers = await ethers.getSigners();

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


    wbtc = await ethers.getContractAt("IERC20Metadata", "0x1bfd67037b42cf73acf2047067bd4f2c47d9bfd6");

    ageur = await ethers.getContractAt("IERC20Metadata", "0xe0b52e49357fd4daf2c15e02058dce6bc0057db4");

    usdt = await ethers.getContractAt("IERC20Metadata", "0xc2132d05d31c914a87c6611c10748aeb04b58e8f");

    liquidityHandler = await ethers.getContractAt("LiquidityHandlerCurrent", "0x31a3439Ac7E6Ea7e0C0E4b846F45700c6354f8c1") as unknown as LiquidityHandlerCurrent;

    // Perhaps this may be set to 0 for certain chains
    exchangePriceOracle = await ethers.getContractAt("ExchangePriceOracle", "0xb6331aa98a78b90d671f4590544ed598b1e4c7ef")


    console.log("Signers", signers[0].address);

    // if (signers[0].address !== "0xC5F1E9424217802880aC62cD24F8103E3017134D") {
    //     console.log("WRONGADDRES")
    //     return;
    // }
    // // console.log("Signers", signers.map(s => s.address));
    // // Deploy VoteExecutorUtils
    // // 
    // let utilsFactory = await ethers.getContractFactory("AlluoVoteExecutorUtils");
    // alluoVoteExecutorUtils = (await upgrades.deployProxy(utilsFactory, [
    //     ethers.constants.AddressZero,
    //     ethers.constants.AddressZero,
    //     admin.address
    // ], {
    //     initializer: "initialize"
    // })) as AlluoVoteExecutorUtils;


    // // Bridging information
    // spokePool = "0x6f26Bf09B1C792e3228e5467807a900A503c0281"
    // _recipient = "0xa420b2d1c0841415A695b81E5B867BCD07Dff8C9"
    // _recipientChainId = "1";
    // _relayerFeePct = 1000000000;
    // _slippageTolerance = 100;

    // // Deploy StrategyHandler
    // let strategyHandlerFactory = await ethers.getContractFactory("AlluoStrategyHandler");
    // alluoStrategyHandler = (await upgrades.deployProxy(strategyHandlerFactory, [admin.address, spokePool, _recipient, _recipientChainId, _relayerFeePct, _slippageTolerance, _exchange.address, alluoVoteExecutorUtils.address])) as AlluoStrategyHandler;

    // // Now deploy AlluoVoteExecutor
    // let voteExecutorFactory = await ethers.getContractFactory("AlluoVoteExecutor");

    // alluoVoteExecutor = (await upgrades.deployProxy(voteExecutorFactory, [
    //     admin.address, _exchange.address, priceRouter.address, liquidityHandler.address, alluoStrategyHandler.address, "0xc22DB2874725B84e99EC0a644fdD042EA3F6F899", alluoVoteExecutorUtils.address, "0xdEBbFE665359B96523d364A19FceC66B0E43860D", 86400, 1, true
    // ])) as AlluoVoteExecutor;


    // let beefyStrategyFactory = await ethers.getContractFactory("BeefyStrategy");
    // beefyStrategy = await upgrades.deployProxy(
    //     beefyStrategyFactory,
    //     [
    //         admin.address,
    //         alluoVoteExecutor.address,
    //         alluoStrategyHandler.address,
    //         priceRouter.address,
    //         _exchange.address,
    //         weth.address
    //     ],
    //     { kind: 'uups' }
    // ) as BeefyStrategyUniversal;


    // let nullStrategyFactory = await ethers.getContractFactory("NullStrategy");
    // nullStrategy = await upgrades.deployProxy(
    //     nullStrategyFactory,
    //     [admin.address, alluoVoteExecutor.address, alluoStrategyHandler.address, priceRouter.address, _exchange.address],
    //     { kind: 'uups' }
    // ) as NullStrategy;


    // let omnivaultStrategyFactory = await ethers.getContractFactory("OmnivaultStrategy");
    // omnivaultStrategy = await upgrades.deployProxy(
    //     omnivaultStrategyFactory,
    //     [admin.address, alluoVoteExecutor.address, alluoStrategyHandler.address, priceRouter.address, _exchange.address, 100]
    // ) as OmnivaultStrategy;


    // console.log("Deployed proxies:");
    // console.log("AlluoVoteExecutorUtils:", alluoVoteExecutorUtils.address);
    // console.log("AlluoStrategyHandler:", alluoStrategyHandler.address);
    // console.log("AlluoVoteExecutor:", alluoVoteExecutor.address);
    // console.log("BeefyStrategy:", beefyStrategy.address);
    // console.log("NullStrategy:", nullStrategy.address);
    // console.log("OmnivaultStrategy:", omnivaultStrategy.address);
    // Signers 0xC5F1E9424217802880aC62cD24F8103E3017134D
    // Deployed proxies:
    // AlluoVoteExecutorUtils: 0xDD9FC096606Ca0a3D8Be9178959f492c9C23966F
    // AlluoStrategyHandler: 0xca3708D709f1324D21ad2C0fb551CC4a0882FD29
    // AlluoVoteExecutor: 0x3DC877A5a211a082E7c2D64aa816dd079b50AddB
    // BeefyStrategy: 0x525b00E7a3c26948fD9FEA341D9488Cd6aE3C935
    // NullStrategy: 0xc98c8E8fb3Bd0BB029547495DC2AA4185FB807c2
    // OmnivaultStrategy: 0xdA32d82e3b5275424F130612797aDc6EFaB06515

    // await reset(process.env.POLYGON_URL);
    alluoVoteExecutorUtils = await ethers.getContractAt("AlluoVoteExecutorUtils", "0xDD9FC096606Ca0a3D8Be9178959f492c9C23966F") as AlluoVoteExecutorUtils;
    alluoStrategyHandler = await ethers.getContractAt("AlluoStrategyHandler", "0xca3708D709f1324D21ad2C0fb551CC4a0882FD29") as AlluoStrategyHandler;
    alluoVoteExecutor = await ethers.getContractAt("AlluoVoteExecutor", "0x3DC877A5a211a082E7c2D64aa816dd079b50AddB") as AlluoVoteExecutor;
    beefyStrategy = await ethers.getContractAt("BeefyStrategyUniversal", "0x525b00E7a3c26948fD9FEA341D9488Cd6aE3C935") as BeefyStrategyUniversal;
    nullStrategy = await ethers.getContractAt("NullStrategy", "0xc98c8E8fb3Bd0BB029547495DC2AA4185FB807c2") as NullStrategy;
    omnivaultStrategy = await ethers.getContractAt("OmnivaultStrategy", "0xdA32d82e3b5275424F130612797aDc6EFaB06515") as OmnivaultStrategy;
    // Set core params AFTER ALL DEPLOYED

    // Bridging information
    spokePool = "0x9295ee1d8C5b022Be115A2AD3c30C72E34e7F096"
    _recipient = "0x3DC877A5a211a082E7c2D64aa816dd079b50AddB"
    _recipientChainId = "10";
    _relayerFeePct = ethers.utils.parseEther("0.001");
    _slippageTolerance = 100;


    // Set core params AFTER ALL DEPLOYED


    // await alluoStrategyHandler.changeNumberOfAssets(4);
    // await alluoStrategyHandler.setTokenToAssetId(usdc.address, 0);
    // await alluoStrategyHandler.setTokenToAssetId(ageur.address, 1);
    // await alluoStrategyHandler.setTokenToAssetId(weth.address, 2);
    // await alluoStrategyHandler.setTokenToAssetId(wbtc.address, 3);

    // await alluoStrategyHandler.changeAssetInfo(0, [10, 137], [usdc.address, usdc.address], "0xC2DbaAEA2EfA47EBda3E572aa0e55B742E408BF6");
    // await alluoStrategyHandler.changeAssetInfo(1, [10, 137], [ageur.address, ageur.address], "0xc9d8556645853C465D1D5e7d2c81A0031F0B8a92");
    // await alluoStrategyHandler.changeAssetInfo(2, [10, 137], [weth.address, weth.address], "0xc677B0918a96ad258A68785C2a3955428DeA7e50");
    // await alluoStrategyHandler.changeAssetInfo(3, [10, 137], [wbtc.address, wbtc.address], "0xf272Ff86c86529504f0d074b210e95fc4cFCDce2");

    // // This is for bridging of the funds
    // await alluoStrategyHandler.setAlluoBridging(spokePool, _recipient, _recipientChainId, _relayerFeePct);

    // Bridging fee is to be paid of 40% of the bridging amount to improve circulation and prevent funds from piling in one chain
    await alluoVoteExecutor.setAcrossInformation(spokePool, ethers.utils.parseEther("0.4"))


    // To be 3 dollars
    await alluoVoteExecutor.setFeeInformation(usdt.address, 10, 3000000);
    await alluoVoteExecutor.setFeeInformation(usdt.address, 137, 3000000);

    await alluoStrategyHandler.grantRole(await alluoStrategyHandler.DEFAULT_ADMIN_ROLE(), alluoVoteExecutor.address);
    await alluoStrategyHandler.grantRole(await alluoStrategyHandler.DEFAULT_ADMIN_ROLE(), alluoVoteExecutorUtils.address);

    await alluoVoteExecutorUtils.setStorageAddresses(alluoStrategyHandler.address, alluoVoteExecutor.address);

    // Also the voteExecutor should approve each primary token to the utils contract, so it can bridge funds
    let approve = usdc.interface.encodeFunctionData("approve", [alluoVoteExecutorUtils.address, ethers.constants.MaxUint256]);
    await alluoVoteExecutor.multicall([usdc.address, weth.address, wbtc.address, ageur.address], [approve, approve, approve, approve]);

    // Same for the strategyHandler so it can pull funds for deposits
    let approve2 = usdc.interface.encodeFunctionData("approve", [alluoStrategyHandler.address, ethers.constants.MaxUint256]);
    await alluoVoteExecutor.multicall([usdc.address, weth.address, wbtc.address, ageur.address], [approve2, approve2, approve2, approve2]);

    // Dont forget to set utils afterwards
    //
    //
    await alluoVoteExecutorUtils.setExecutorInternalIds([0, 1], [alluoVoteExecutor.address, alluoVoteExecutor.address], [10, 137]);
    await alluoVoteExecutorUtils.setCrossChainInformation(alluoVoteExecutor.address, alluoVoteExecutor.address, alluoVoteExecutor.address, 10, 10  /*Important param here, next chainid*/, 10, 2, 1)


    await alluoVoteExecutor.setMaster(false);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

//npx hardhat run scripts/deploy/deployHandler.ts --network polygon
//npx hardhat verify 0xb647c6fe9d2a6e7013c7e0924b71fa7926b2a0a3 --network polygon