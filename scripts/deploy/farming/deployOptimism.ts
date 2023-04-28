import { Contract } from "ethers";
import { formatUnits } from "ethers/lib/utils";
import { ethers, upgrades } from "hardhat";
import { BtcOptimismAdapter, BufferManager, EthOptimismAdapter, IbAlluo, IbAlluoPriceResolver__factory, ICurvePoolBTC, ICurvePoolETH, ICurvePoolUSD, IExchange, IWrappedEther, LiquidityHandlerPolygon, StIbAlluo, Usd3PoolOptimismAdapter, WithdrawalRequestResolver__factory } from "../../../typechain-types";

// TODO: Update these to current APY values on farms
const apyUsd = 7.0;
const apyEth = 5.5;
const apyBtc = 4.0;

function getInterestPerSecondParam(apyPercent: number): string {
    const secondsInYear = 31536000;
    const decimalApy = 1 + (apyPercent / 100);
    const decimalInterest = Math.pow(decimalApy, 1 / secondsInYear);
    return Math.round(decimalInterest * (10 ** 17)).toString();
}

let sum: number = 0;
async function waitAndLogAddresses(contract: Contract, name: string, isProxy: boolean) {
    const tx = await contract.deployTransaction.wait();
    const gasUsed = tx.gasUsed.toNumber();

    sum += gasUsed;

    if (isProxy) {
        const impl = await upgrades.erc1967.getImplementationAddress(contract.address);
        console.log(name, "proxy deployed:", contract.address);
        console.log(name, "impln deployed:", impl);
        console.log("Gas used (proxy):", gasUsed);
    }
    else {
        console.log(name, "deployed:", contract.address);
        console.log("Gas used:", gasUsed);
    }

    console.log();
}

// Script execution: 35 767 017 gas
// L2 gas price    : 0.001 gwei
// L2 fee          : 0,000035767 ETH

// 25% gas         : 8 941 754 gas
// L1 gas price    : 20 gwei
// L1 fee          : 0,17883508 ETH

// Total           : 0,17887084 ETH
async function main() {
    const handlerFactory = await ethers.getContractFactory("LiquidityHandlerPolygon");
    const bufferFactory = await ethers.getContractFactory("BufferManager");
    const usdAdapterFactory = await ethers.getContractFactory("Usd3PoolOptimismAdapter");
    const ethAdapterFactory = await ethers.getContractFactory("EthOptimismAdapter");
    const btcAdapterFactory = await ethers.getContractFactory("BtcOptimismAdapter");
    const ibAlluoFactory = await ethers.getContractFactory("IbAlluo");
    const StIbAlluoFactory = await ethers.getContractFactory("StIbAlluo");
    const SuperfluidResolverFactory = await ethers.getContractFactory("SuperfluidResolver");
    const SuperfluidEndResolverFactory = await ethers.getContractFactory("SuperfluidEndResolver");
    const handlerResolverFactory = await ethers.getContractFactory(
        "contracts/Farming/Polygon/resolvers/WithdrawalRequestResolver.sol:WithdrawalRequestResolver"
    ) as WithdrawalRequestResolver__factory;
    const priceResolverFactory = await ethers.getContractFactory(
        "contracts/Farming/Polygon/resolvers/IbAlluoPriceResolver.sol:IbAlluoPriceResolver"
    ) as IbAlluoPriceResolver__factory;

    upgrades.silenceWarnings()

    const exchange = await ethers.getContractAt(
        "contracts/interfaces/IExchange.sol:IExchange",
        "0x66Ac11c106C3670988DEFDd24BC75dE786b91095"
    ) as IExchange;
    const priceRouter = await ethers.getContractAt("PriceFeedRouterV2", "0x7E6FD319A856A210b9957Cd6490306995830aD25");
    const gnosis = "0xc7061dD515B602F86733Fa0a0dBb6d6E6B34aED4";
    const signers = await ethers.getSigners();
    const usdc = await ethers.getContractAt("IERC20Metadata", "0x7f5c764cbc14f9669b88837ca1490cca17c31607");
    const usdt = await ethers.getContractAt("IERC20Metadata", "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58");
    const dai = await ethers.getContractAt("IERC20Metadata", "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1");
    const weth = await ethers.getContractAt(
        "contracts/interfaces/IWrappedEther.sol:IWrappedEther",
        "0x4200000000000000000000000000000000000006"
    ) as IWrappedEther;
    const wbtc = await ethers.getContractAt("IERC20Metadata", "0x68f180fcCe6836688e9084f035309E29Bf0A2095");
    const usdLpToken = await ethers.getContractAt(
        "contracts/interfaces/curve/optimism/ICurvePoolUSD.sol:ICurvePoolUSD",
        "0x1337BedC9D22ecbe766dF105c9623922A27963EC"
    ) as ICurvePoolUSD;
    const ethLpToken = await ethers.getContractAt(
        "contracts/interfaces/curve/optimism/ICurvePoolETH.sol:ICurvePoolETH",
        "0x7Bc5728BC2b59B45a58d9A576E2Ffc5f0505B35E"
    ) as ICurvePoolETH
    const btcLpToken = await ethers.getContractAt(
        "contracts/interfaces/curve/optimism/ICurvePoolBTC.sol:ICurvePoolBTC",
        "0x9F2fE3500B1a7E285FDc337acacE94c480e00130"
    ) as ICurvePoolBTC

    // Step 1: Deploy LiquidityHandler, but setup later

    const handler = await upgrades.deployProxy(
        handlerFactory,
        [
            gnosis,
            exchange.address
        ],
        { kind: "uups" }
    ) as LiquidityHandlerPolygon;
    await waitAndLogAddresses(handler, "LiquidityHandlerPolygon", true)

    // Step 2: Deploy BufferManager, but setup later
    const blockTimestamp = (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp;
    const spokePool = "0xa420b2d1c0841415A695b81E5B867BCD07Dff8C9";
    const buffer = await upgrades.deployProxy(
        bufferFactory,
        [
            86400, // epochDuration
            blockTimestamp, // bridgeGenesis
            28800, // bridgeInterval
            gnosis, // gnosis
            spokePool // spokePool
        ],
        { kind: "uups", timeout: 3600000 }
    ) as BufferManager;
    await waitAndLogAddresses(buffer, "BufferManager", true);

    // Step 3: Deploy and set USD, ETH, BTC adapters
    const usdAdapter = await upgrades.deployProxy(
        usdAdapterFactory,
        [
            gnosis,
            buffer.address,
            handler.address,
            200
        ],
        { kind: "uups", timeout: 3600000 }
    ) as Usd3PoolOptimismAdapter;
    await waitAndLogAddresses(usdAdapter, "Usd3PoolOptimismAdapter", true);

    const ethAdapter = await upgrades.deployProxy(
        ethAdapterFactory,
        [
            gnosis,
            buffer.address,
            handler.address,
            200
        ],
        { kind: "uups", timeout: 3600000 }
    ) as EthOptimismAdapter;
    await waitAndLogAddresses(ethAdapter, "EthOptimismAdapter", true);

    const btcAdapter = await upgrades.deployProxy(
        btcAdapterFactory,
        [
            gnosis,
            buffer.address,
            handler.address,
            200
        ],
        { kind: "uups", timeout: 3600000 }
    ) as BtcOptimismAdapter;
    await waitAndLogAddresses(btcAdapter, "BtcOptimismAdapter", true);

    // Step 4: ibAlluoUSD, ETH, BTC deploy and setup
    const apyIntegerUsd = 700;
    const apyIntegerEth = 550;
    const apyIntegerBtc = 400;
    const interestPerSecondUSD = getInterestPerSecondParam(apyUsd);
    const interestPerSecondETH = getInterestPerSecondParam(apyEth);
    const interestPerSecondBTC = getInterestPerSecondParam(apyBtc);
    const trustedForwarder = "0xEFbA8a2A82ec1fB1273806174f5E28FBb917Cf95";

    const ibAlluoUSD = await upgrades.deployProxy(
        ibAlluoFactory,
        [
            "Interest Bearing Alluo USD",
            "IbAlluoUSD",
            gnosis,
            handler.address,
            [dai.address, usdc.address, usdt.address],
            interestPerSecondUSD,
            apyIntegerUsd,
            trustedForwarder,
            exchange.address
        ],
        { kind: "uups", timeout: 3600000 }
    ) as IbAlluo;
    await waitAndLogAddresses(ibAlluoUSD, "IbAlluoUSD", true);

    const ibAlluoETH = await upgrades.deployProxy(
        ibAlluoFactory,
        [
            "Interest Bearing Alluo ETH",
            "IbAlluoETH",
            gnosis,
            handler.address,
            [weth.address],
            interestPerSecondETH,
            apyIntegerEth,
            trustedForwarder,
            exchange.address
        ],
        { kind: "uups", timeout: 3600000, useDeployedImplementation: true }
    ) as IbAlluo;
    await waitAndLogAddresses(ibAlluoETH, "IbAlluoETH", true);

    const ibAlluoBTC = await upgrades.deployProxy(
        ibAlluoFactory,
        [
            "Interest Bearing Alluo BTC",
            "IbAlluoBTC",
            gnosis,
            handler.address,
            [wbtc.address],
            interestPerSecondBTC,
            apyIntegerBtc,
            trustedForwarder,
            exchange.address
        ],
        { kind: "uups", timeout: 3600000, useDeployedImplementation: true }
    ) as IbAlluo;
    await waitAndLogAddresses(ibAlluoBTC, "IbAlluoBTC", true);

    // Step 5: Setup Superfluid contracts
    const superfluidHost = "0x567c4B141ED61923967cA25Ef4906C8781069a10"
    const cfaV1 = "0x204C6f131bb7F258b2Ea1593f5309911d8E458eD";

    const stIbAlluoUSD = await upgrades.deployProxy(
        StIbAlluoFactory,
        [
            ibAlluoUSD.address,
            18,
            "Streaming IbAlluo USD",
            "StIbAlluoUSD",
            superfluidHost,
            gnosis,
            [ibAlluoUSD.address]
        ], {
        initializer: 'alluoInitialize',
        kind: 'uups', timeout: 3600000,
        unsafeAllow: ["delegatecall"]
    }
    ) as StIbAlluo;
    await waitAndLogAddresses(stIbAlluoUSD, "StIbAlluoUSD", true);

    const stIbAlluoETH = await upgrades.deployProxy(
        StIbAlluoFactory,
        [
            ibAlluoETH.address,
            18,
            "Streaming IbAlluo ETH",
            "StIbAlluoETH",
            superfluidHost,
            gnosis,
            [ibAlluoETH.address]
        ], {
        initializer: 'alluoInitialize',
        kind: 'uups', timeout: 3600000,
        unsafeAllow: ["delegatecall"],
        useDeployedImplementation: true
    }
    ) as StIbAlluo;
    await waitAndLogAddresses(stIbAlluoETH, "StIbAlluoETH", true);

    const stIbAlluoBTC = await upgrades.deployProxy(
        StIbAlluoFactory,
        [
            ibAlluoBTC.address,
            18,
            "Streaming IbAlluo BTC",
            "StIbAlluoBTC",
            superfluidHost,
            gnosis,
            [ibAlluoBTC.address]
        ], {
        initializer: 'alluoInitialize',
        kind: 'uups', timeout: 3600000,
        unsafeAllow: ["delegatecall"],
        useDeployedImplementation: true
    }
    ) as StIbAlluo;
    await waitAndLogAddresses(stIbAlluoBTC, "StIbAlluoBTC", true);

    const superfluidResolver = await SuperfluidResolverFactory.deploy(
        [ibAlluoUSD.address, ibAlluoETH.address, ibAlluoBTC.address],
        cfaV1,
        gnosis
    );
    await waitAndLogAddresses(superfluidResolver, "SuperfluidResolver", false);

    const superfluidEndResolver = await SuperfluidEndResolverFactory.deploy(
        [ibAlluoUSD.address, ibAlluoETH.address, ibAlluoBTC.address],
        gnosis
    );
    await waitAndLogAddresses(superfluidEndResolver, "SuperfluidEndResolver", false);

    const gelatoRole = await superfluidResolver.GELATO();
    const optimismGelatoExecutor = "0x6dad1cb747a95ae1fcd364af9adb5b4615f157a4";

    const optimismPokeMe = "0x340759c8346A1E6Ed92035FB8B6ec57cE1D82c2c";

    const handlerResolver = await handlerResolverFactory.deploy(optimismPokeMe, handler.address, gnosis);
    await waitAndLogAddresses(handlerResolver, "WithdrawalRequestResolver", false);


    const alluoBank = "0x645d275b7890823afd3c669f8805e24ea64ffdab"
    const priceResolver = await priceResolverFactory.deploy(
        handler.address,
        alluoBank
    );
    await waitAndLogAddresses(priceResolver, "IbAlluoPriceResolver", false);

    console.log("Logged gas usage:", sum)

    // Alluo - IbAlluoXXX Price resolvers
    console.log("1. Create resolver 'Alluo - IbAlluoXXX Price resolvers'");
    console.log("    Execute:");
    console.log("        Target Contract:", priceResolver.address);
    console.log("        Automated Function: emitter ( )");
    console.log("    When to execute:");
    console.log("        Interval: 5 hours");
    console.log("    Additional steps:");
    console.log("        Put ibAlluo tokens in alluoBank:", alluoBank);
    console.log();

    // Alluo - Liquidity buffer refiller
    console.log("2. Create resolver 'Alluo - Liquidity buffer refiller'");
    console.log("    Execute:");
    console.log("        Target Contract:", buffer.address);
    console.log("        Automated Function: refillBuffer ( address: _ibAlluo )");
    console.log("    When to execute:");
    console.log("        Resolver address:", buffer.address);
    console.log("        Resolver function: checkerRefill ( )");
    console.log();

    // Alluo - Superfluid liquidation protection
    console.log("3. Create resolver 'Alluo - Superfluid liquidation protection'");
    console.log("    Execute:");
    console.log("        Target Contract:", superfluidResolver.address);
    console.log("        Automated Function: liquidateSender ( address: _sender, address[]: _receivers, address: _token )");
    console.log("    When to execute:");
    console.log("        Resolver address:", superfluidResolver.address);
    console.log("        Resolver function: checker ( )");
    console.log();

    // Alluo - satisfyWithdrawals IbAlluoXXX    
    console.log("4. Create resolver 'Alluo - satisfyWithdrawals IbAlluoXXX'");
    console.log("    Execute:");
    console.log("        Target Contract:", handler.address);
    console.log("        Automated Function: satisfyAllWithdrawals ( )");
    console.log("    When to execute:");
    console.log("        Resolver address:", handlerResolver.address);
    console.log("        Resolver function: checker ( )");
    console.log();

    // Alluo - Superfluid end resolver
    console.log("5. Create resolver 'Alluo - Superfluid end resolver'");
    console.log("    Execute:");
    console.log("        Target Contract:", superfluidEndResolver.address);
    console.log("        Automated Function: liquidateSender ( address: _sender, address: _receiver, address: _token )");
    console.log("    When to execute:");
    console.log("        Resolver address:", superfluidEndResolver.address);
    console.log("        Resolver function: checker ( )");
    console.log();

    // Alluo - Liquidity buffer bridging
    console.log("6. Create resolver 'Alluo - Liquidity buffer bridging'");
    console.log("    Execute:");
    console.log("        Target Contract:", buffer.address);
    console.log("        Automated Function: swap ( uint256: amount, address: originToken )");
    console.log("    When to execute:");
    console.log("        Resolver address:", buffer.address);
    console.log("        Resolver function: checkerBridge ( )");
    console.log();

}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
})