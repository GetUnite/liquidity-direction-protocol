import { formatUnits, parseEther, parseUnits } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, BigNumberish, BytesLike, constants, Wallet } from "ethers";
import { defaultAbiCoder } from "ethers/lib/utils";
import { ethers, network, upgrades } from "hardhat";
import { before } from "mocha";
import { ChainlinkFeedStrategyV2, CurveConvexStrategyTest, CurveConvexStrategyV2, CurveConvexStrategyV2Native, CurveLpReferenceFeedStrategyV2, CurvePoolReferenceFeedStrategyV2, ERC20, IbAlluo, IbAlluo__factory, IERC20, IERC20Metadata, IExchange, PriceFeedRouterV2, PriceFeedRouterV2__factory, PseudoMultisigWallet, StrategyHandler, UsdCurveAdapter, VoteExecutorMaster, VoteExecutorSlave, VoteExecutorSlave__factory,} from "../typechain";
import { IExchangeInterface } from "../typechain/IExchange";

async function getImpersonatedSigner(address: string): Promise<SignerWithAddress> {
    await ethers.provider.send(
        'hardhat_impersonateAccount',
        [address]
    );
    return await ethers.getSigner(address);
}

async function skipDays(d: number) {
    ethers.provider.send('evm_increaseTime', [d * 86400]);
    ethers.provider.send('evm_mine', []);
}

describe("Test L1 Contract", function() {
    let voteExecutorMaster : VoteExecutorMaster;
    let router: PriceFeedRouterV2;
    let strategyHandler: StrategyHandler;
    let strategyUsd: CurveConvexStrategyV2;
    let strategyEur: CurveConvexStrategyV2;
    let strategyEth: CurveConvexStrategyV2Native;
    let strategyBtc: CurveConvexStrategyV2;
    let gnosis: PseudoMultisigWallet;

    let exchange: IExchange;

    let signers: SignerWithAddress[]

    type FiatRoute = {
        name: string,
        id: number;
        oracle: string,
        token: string,
        strategy?: ChainlinkFeedStrategyV2,
    }
    type CryptoRoute = {
        coin: string,
        oracle: string,
        strategy?: ChainlinkFeedStrategyV2,
    }
    type CurveRoute = {
        coin: string,
        poolAddress: string,
        desiredIndex: number,
        referenceCoinIndex: number,
        referenceCoinDecimals: number,
        referenceFeed: string,
        oneTokenAmount: BigNumberish,
        strategy?: CurvePoolReferenceFeedStrategyV2
    }
    type CurveLpRoute = {
        coin: string,
        poolAddress: string,
        referenceCoinIndex: number,
        referenceCoinDecimals: number,
        oneTokenAmount: BigNumberish,
        referenceFeed: string,
        typeOfTokenIndex: Uint8Array,
        strategy?: CurveLpReferenceFeedStrategyV2
    }

    let fiatRoutes: FiatRoute[];
    let cryptoRoutes: CryptoRoute[];
    let curveRoutes: CurveRoute[];
    let curveLpRoutes: CurveLpRoute[];

    let uint256 = ethers.utils.toUtf8Bytes("uint256");
    let int128 = ethers.utils.toUtf8Bytes("int128");

    let nativeETH: string;

    let usdc: IERC20Metadata, usdt: IERC20Metadata, dai: IERC20Metadata, weth: IERC20Metadata,
    wbtc: IERC20Metadata, eurt: IERC20Metadata, jeur: IERC20Metadata, par: IERC20Metadata,
    eurs: IERC20Metadata, frax: IERC20Metadata, susd: IERC20Metadata, crv3: IERC20Metadata,
    mimLp: IERC20Metadata, cvxLp: IERC20Metadata, stEthLp: IERC20Metadata, fraxUsdcLp: IERC20Metadata,
    musdLp: IERC20Metadata, agEur: IERC20Metadata, ceurLp: IERC20Metadata, eur3: IERC20Metadata,
    alEthLp:IERC20Metadata,lido:IERC20Metadata; 

    let whaleUsdc: SignerWithAddress;
    let whaleEurt: SignerWithAddress;
    let whaleWeth: SignerWithAddress;
    let whaleWbtc: SignerWithAddress;

    before(async function () {
        //We are forking Polygon mainnet, please set Alchemy key in .env
        await network.provider.request({
            method: "hardhat_reset",
            params: [{
                forking: {
                    enabled: true,
                    jsonRpcUrl: process.env.MAINNET_FORKING_URL as string,
                    //you can fork from last block by commenting next line
                    blockNumber: 15868944
                },
            },],
        });

        dai = await ethers.getContractAt("IERC20Metadata", "0x6b175474e89094c44da98b954eedeac495271d0f");
        frax = await ethers.getContractAt('IERC20Metadata', '0x853d955acef822db058eb8505911ed77f175b99e');
        usdc = await ethers.getContractAt("IERC20Metadata", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
        usdt = await ethers.getContractAt("IERC20Metadata", "0xdAC17F958D2ee523a2206206994597C13D831ec7");
        weth = await ethers.getContractAt("IERC20Metadata", "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");
        wbtc = await ethers.getContractAt("IERC20Metadata", "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599");
        susd = await ethers.getContractAt("IERC20Metadata", "0x57Ab1ec28D129707052df4dF418D58a2D46d5f51");
        crv3 = await ethers.getContractAt("IERC20Metadata", "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490");
        mimLp = await ethers.getContractAt("IERC20Metadata", "0x5a6A4D54456819380173272A5E8E9B9904BdF41B");
        musdLp = await ethers.getContractAt("IERC20Metadata", "0x1AEf73d49Dedc4b1778d0706583995958Dc862e6");
        cvxLp = await ethers.getContractAt("IERC20Metadata", "0x3A283D9c08E8b55966afb64C515f5143cf907611");
        fraxUsdcLp = await ethers.getContractAt("IERC20Metadata", "0x3175Df0976dFA876431C2E9eE6Bc45b65d3473CC");
        eurt = await ethers.getContractAt("IERC20Metadata", "0xC581b735A1688071A1746c968e0798D642EDE491");
        agEur = await ethers.getContractAt("IERC20Metadata", "0x1a7e4e63778B4f12a199C062f3eFdD288afCBce8");
        ceurLp = await ethers.getContractAt("IERC20Metadata", "0xe7A3b38c39F97E977723bd1239C3470702568e7B");
        eur3 = await ethers.getContractAt("IERC20Metadata", "0xb9446c4Ef5EBE66268dA6700D26f96273DE3d571");
        stEthLp = await ethers.getContractAt("IERC20Metadata", "0x06325440D014e39736583c165C2963BA99fAf14E");
        alEthLp = await ethers.getContractAt("IERC20Metadata", "0xC4C319E2D4d66CcA4464C0c2B32c9Bd23ebe784e");
        lido = await ethers.getContractAt("IERC20Metadata", "0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32");
        
        exchange = await ethers.getContractAt("contracts/interfaces/IExchange.sol:IExchange", "0x29c66CF57a03d41Cfe6d9ecB6883aa0E2AbA21Ec") as IExchange;
        nativeETH = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE"

        cryptoRoutes = [
            {
                // USDC
                coin: usdc.address,
                oracle: "0x8fffffd4afb6115b954bd326cbe7b4ba576818f6"
            },
            {
                // USDT
                coin: usdt.address,
                oracle: "0x3e7d1eab13ad0104d2750b8863b489d65364e32d"
            },
            {
                // DAI
                coin: dai.address,
                oracle: "0xaed0c38402a5d19df6e4c03f4e2dced6e29c1ee9"
            },
            {
                // eurt
                coin: eurt.address,
                oracle: "0x01d391a48f4f7339ac64ca2c83a07c22f95f587a"
            },
        ];


        fiatRoutes = [
            {
                name: "EUR",
                id: 1,
                oracle: "0xb49f677943bc038e9857d61e7d053caa2c1734c1",
                token: constants.AddressZero
            },
            {
                name: "ETH",
                id: 2,
                oracle: "0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419",
                token: weth.address
            },
            {
                name: "BTC",
                id: 3,
                oracle: "0xf4030086522a5beea4988f8ca5b36dbc97bee88c",
                token: wbtc.address
            },
        ];

        curveRoutes = [
            {
                // sUSD
                coin: susd.address,
                poolAddress: "0xA5407eAE9Ba41422680e2e00537571bcC53efBfD",
                desiredIndex: 3,
                referenceCoinIndex: 1,
                referenceFeed: usdc.address,
                referenceCoinDecimals: 6,
                oneTokenAmount: parseUnits("1.0", await susd.decimals()),
            },
            {
                // agEur
                coin: agEur.address,
                poolAddress: "0xb9446c4Ef5EBE66268dA6700D26f96273DE3d571",
                desiredIndex: 0,
                referenceCoinIndex: 1,
                referenceFeed: eurt.address,
                referenceCoinDecimals: 6,
                oneTokenAmount: parseUnits("1.0", await agEur.decimals()),
            },
        ]

        curveLpRoutes = [
            {
                // 3CRVLp
                coin: crv3.address,
                poolAddress: "0xbEbc44782C7dB0a1A60Cb6fe97d0b483032FF1C7",
                referenceCoinIndex: 1,
                referenceCoinDecimals: 6,
                typeOfTokenIndex: int128,
                referenceFeed: usdc.address,
                oneTokenAmount: parseUnits("1.0", await crv3.decimals()),
            },
            {
                // mimLp
                coin: mimLp.address,
                poolAddress: "0x5a6A4D54456819380173272A5E8E9B9904BdF41B",
                referenceCoinIndex: 1,
                referenceCoinDecimals: 18,
                referenceFeed: crv3.address,
                typeOfTokenIndex: int128,
                oneTokenAmount: parseUnits("1.0", await mimLp.decimals()),
            },
            {
                // musdLp
                coin: musdLp.address,
                poolAddress: "0x8474DdbE98F5aA3179B3B3F5942D724aFcdec9f6",
                referenceCoinIndex: 1,
                referenceCoinDecimals: 18,
                referenceFeed: crv3.address,
                typeOfTokenIndex: int128,
                oneTokenAmount: parseUnits("1.0", await musdLp.decimals()),
            },

            {
                // FraxUsdcLp
                coin: fraxUsdcLp.address,
                poolAddress: "0xDcEF968d416a41Cdac0ED8702fAC8128A64241A2",
                referenceCoinIndex: 1,
                referenceCoinDecimals: 6,
                typeOfTokenIndex: int128,
                referenceFeed: usdc.address,
                oneTokenAmount: parseUnits("1.0", await weth.decimals()),
            },

            {
                // ceurLp
                coin: ceurLp.address,
                poolAddress: "0xe7A3b38c39F97E977723bd1239C3470702568e7B",
                referenceCoinIndex: 1,
                referenceCoinDecimals: 18,
                typeOfTokenIndex: int128,
                referenceFeed: agEur.address,
                oneTokenAmount: parseUnits("1.0", await weth.decimals()),
            },
            {
                // eur3Lp
                coin: eur3.address,
                poolAddress: "0xb9446c4Ef5EBE66268dA6700D26f96273DE3d571",
                referenceCoinIndex: 1,
                referenceCoinDecimals: 6,
                typeOfTokenIndex: int128,
                referenceFeed: eurt.address,
                oneTokenAmount: parseUnits("1.0", await eur3.decimals()),
            },
            {
                // stEthLp
                coin: stEthLp.address,
                poolAddress: "0xDC24316b9AE028F1497c275EB9192a3Ea0f67022",
                referenceCoinIndex: 0,
                referenceCoinDecimals: 18,
                typeOfTokenIndex: int128,
                referenceFeed: weth.address,
                oneTokenAmount: parseUnits("1.0", await weth.decimals()),
            },
            {
                // alEthLp
                coin: alEthLp.address,
                poolAddress: "0xC4C319E2D4d66CcA4464C0c2B32c9Bd23ebe784e",
                referenceCoinIndex: 0,
                referenceCoinDecimals: 18,
                typeOfTokenIndex: int128,
                referenceFeed: weth.address,
                oneTokenAmount: parseUnits("1.0", await weth.decimals()),
            },
            {
                // cvxLp
                coin: cvxLp.address,
                poolAddress: "0xB576491F1E6e5E62f1d8F26062Ee822B40B0E0d4",
                referenceCoinIndex: 0,
                referenceCoinDecimals: 18,
                referenceFeed: weth.address,
                typeOfTokenIndex: uint256,
                oneTokenAmount: parseUnits("1.0", await cvxLp.decimals()),
            },
        ]
    })

    beforeEach(async () => {
        signers = await ethers.getSigners();

        //  = "0x6b140e772aCC4D5E0d5Eac3813D586aa6DB8Fbf7"

        gnosis = await (await ethers.getContractFactory("PseudoMultisigWallet")).deploy(true)
        await gnosis.addOwners(signers[0].address);

        const VoteExecutorMaster = await ethers.getContractFactory("VoteExecutorMaster");
        voteExecutorMaster = await upgrades.deployProxy(VoteExecutorMaster,
            [gnosis.address], {
                initializer: 'initialize',
                kind: 'uups'
            }
        ) as VoteExecutorMaster

        await voteExecutorMaster.setCrossChainInfo(
            "0xC10Ef9F491C9B59f936957026020C321651ac078", 
            "0x0C9f0ea6317038c9D7180Cf4A0aEeB58478D13A4",
            constants.AddressZero,
            constants.AddressZero,
            1,0,0)


        const Router = await ethers.getContractFactory("PriceFeedRouterV2") as PriceFeedRouterV2__factory;

        router = await upgrades.deployProxy(Router,
            [signers[0].address],
            { initializer: 'initialize', kind: 'uups' }
        ) as PriceFeedRouterV2;

        await voteExecutorMaster.setPriceFeed(router.address)
        
        const StrategyHandler = await ethers.getContractFactory("StrategyHandler");

        strategyHandler = await upgrades.deployProxy(StrategyHandler,
            [gnosis.address, router.address, voteExecutorMaster], {
                initializer: 'initialize',
                kind: 'uups'
            }
        ) as StrategyHandler

        await voteExecutorMaster.setStrategyHandler(strategyHandler.address)

        await strategyHandler.setBoosterAddress("0xdEBbFE665359B96523d364A19FceC66B0E43860D")
        await strategyHandler.setExecutorAddress(voteExecutorMaster.address)
        

        const Strategy = await ethers.getContractFactory("CurveConvexStrategyV2");
        const StrategyNative = await ethers.getContractFactory("CurveConvexStrategyV2Native");

        strategyUsd = await upgrades.deployProxy(Strategy,
            [gnosis.address, strategyHandler.address, voteExecutorMaster.address, router.address], {
                initializer: 'initialize',
                kind: 'uups'
            }
        ) as CurveConvexStrategyV2

        strategyEur = await upgrades.deployProxy(Strategy,
            [gnosis.address, strategyHandler.address, voteExecutorMaster.address, router.address], {
                initializer: 'initialize',
                kind: 'uups'
            }
        ) as CurveConvexStrategyV2

        strategyEth = await upgrades.deployProxy(StrategyNative,
            [gnosis.address, strategyHandler.address, voteExecutorMaster.address, router.address], {
                initializer: 'initialize',
                kind: 'uups'
            }
        ) as CurveConvexStrategyV2Native

        await strategyEth.changeAdditionalRewardTokenStatus(lido.address, true)

        strategyBtc = await upgrades.deployProxy(Strategy,
            [gnosis.address, strategyHandler.address, voteExecutorMaster.address, router.address], {
                initializer: 'initialize',
                kind: 'uups'
            }
        ) as CurveConvexStrategyV2


        whaleUsdc = await getImpersonatedSigner("0xf584f8728b874a6a5c7a8d4d387c9aae9172d621")
        // usdc.connect(whale).transfer(VoteExecutorSlave.address, parseUnits("1000000", "6"));

        whaleEurt = await getImpersonatedSigner("0x5754284f345afc66a98fbb0a0afe71e0f007b949")
        // eurt.connect(whale2).transfer(VoteExecutorSlave.address, parseUnits("1000000", "6"));

        whaleWeth = await getImpersonatedSigner("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2")
        // weth.connect(whale3).transfer(VoteExecutorSlave.address, parseEther("100"));
        
        whaleWbtc = await getImpersonatedSigner("0x218b95be3ed99141b0144dba6ce88807c4ad7c09")
        // wbtc.connect(whale4).transfer(VoteExecutorSlave.address, parseUnits("10", "8"));

        await strategyHandler.changeAssetInfo(0, [1], [usdc.address], "0xF555B595D04ee62f0EA9D0e72001D926a736A0f6")
        await strategyHandler.changeAssetInfo(1, [1], [eurt.address], "0xeb38D2f6a745Bd3f466F3F20A617D2C615b316eE")
        await strategyHandler.changeAssetInfo(2, [1], [weth.address], "0x98f49aC358187116462BDEA748daD1Df480865d7")
        await strategyHandler.changeAssetInfo(3, [1], [wbtc.address], "0xb4FFDec68c297B278D757C49c5094dde53f2F878")

        await strategyHandler.setLiquidityDirection(
            "Curve/Convex Frax+USDC",
            0,
            strategyUsd.address,
            usdc.address,
            0,
            1,
            await strategyUsd.encodeEntryParams("0xDcEF968d416a41Cdac0ED8702fAC8128A64241A2", usdc.address, "0x3175Df0976dFA876431C2E9eE6Bc45b65d3473CC",2,1,100),
            await strategyUsd.encodeExitParams("0xDcEF968d416a41Cdac0ED8702fAC8128A64241A2", usdc.address, "0x3175Df0976dFA876431C2E9eE6Bc45b65d3473CC",int128,1,100),
            await strategyUsd.encodeRewardsParams("0x3175Df0976dFA876431C2E9eE6Bc45b65d3473CC",100,0),
        )

        await strategyHandler.setLiquidityDirection(
            "Curve/Convex Mim+3CRV",
            1,
            strategyUsd.address,
            crv3.address,
            0,
            1,
            await strategyUsd.encodeEntryParams("0x5a6A4D54456819380173272A5E8E9B9904BdF41B", crv3.address, "0x5a6A4D54456819380173272A5E8E9B9904BdF41B",2,1,40),
            await strategyUsd.encodeExitParams("0x5a6A4D54456819380173272A5E8E9B9904BdF41B", crv3.address, "0x5a6A4D54456819380173272A5E8E9B9904BdF41B",int128,1,40),
            await strategyUsd.encodeRewardsParams("0x5a6A4D54456819380173272A5E8E9B9904BdF41B",40,0),
        )

        await strategyHandler.setLiquidityDirection(
            "Curve/Convex Musd+3CRV",
            2,
            strategyUsd.address,
            crv3.address,
            0,
            1,
            await strategyUsd.encodeEntryParams("0x8474DdbE98F5aA3179B3B3F5942D724aFcdec9f6", crv3.address, "0x1AEf73d49Dedc4b1778d0706583995958Dc862e6",2,1,14),
            await strategyUsd.encodeExitParams("0x8474DdbE98F5aA3179B3B3F5942D724aFcdec9f6", crv3.address, "0x1AEf73d49Dedc4b1778d0706583995958Dc862e6",int128,1,14),
            await strategyUsd.encodeRewardsParams("0x1AEf73d49Dedc4b1778d0706583995958Dc862e6",14,0),
        )

        await strategyHandler.setLiquidityDirection(
            "Curve/Convex cEUR+agEUR+EUROC",
            3,
            strategyEur.address,
            agEur.address,
            1,
            1,
            await strategyEur.encodeEntryParams("0xe7A3b38c39F97E977723bd1239C3470702568e7B", agEur.address, "0xe7A3b38c39F97E977723bd1239C3470702568e7B",3,1,112),
            await strategyEur.encodeExitParams("0xe7A3b38c39F97E977723bd1239C3470702568e7B", agEur.address, "0xe7A3b38c39F97E977723bd1239C3470702568e7B",int128,1,112),
            await strategyEur.encodeRewardsParams("0xe7A3b38c39F97E977723bd1239C3470702568e7B",112,1),
        )

        await strategyHandler.setLiquidityDirection(
            "3eur:Convex",
            4,
            strategyEur.address,
            eurt.address,
            1,
            1,
            await strategyEur.encodeEntryParams("0xb9446c4Ef5EBE66268dA6700D26f96273DE3d571", eurt.address, "0xb9446c4Ef5EBE66268dA6700D26f96273DE3d571",3,1,60),
            await strategyEur.encodeExitParams("0xb9446c4Ef5EBE66268dA6700D26f96273DE3d571", eurt.address, "0xb9446c4Ef5EBE66268dA6700D26f96273DE3d571",int128,1,60),
            await strategyEur.encodeRewardsParams("0xb9446c4Ef5EBE66268dA6700D26f96273DE3d571",60,1),
        )

        await strategyHandler.setLiquidityDirection(
            "Curve/Convex stETH+ETH",
            5,
            strategyEth.address,
            weth.address,
            2,
            1,
            await strategyEth.encodeEntryParams("0xDC24316b9AE028F1497c275EB9192a3Ea0f67022", nativeETH, "0x06325440D014e39736583c165C2963BA99fAf14E",2,0,25),
            await strategyEth.encodeExitParams("0xDC24316b9AE028F1497c275EB9192a3Ea0f67022", nativeETH, "0x06325440D014e39736583c165C2963BA99fAf14E",int128,0,25),
            await strategyEth.encodeRewardsParams("0x06325440D014e39736583c165C2963BA99fAf14E",25,2),
        )

        await strategyHandler.setLiquidityDirection(
            "Curve/Convex alETH+ETH",
            6,
            strategyEth.address,
            weth.address,
            2,
            1,
            await strategyEth.encodeEntryParams("0xC4C319E2D4d66CcA4464C0c2B32c9Bd23ebe784e", nativeETH, "0xC4C319E2D4d66CcA4464C0c2B32c9Bd23ebe784e",2,0,49),
            await strategyEth.encodeExitParams("0xC4C319E2D4d66CcA4464C0c2B32c9Bd23ebe784e", nativeETH, "0xC4C319E2D4d66CcA4464C0c2B32c9Bd23ebe784e",int128,0,49),
            await strategyEth.encodeRewardsParams("0xC4C319E2D4d66CcA4464C0c2B32c9Bd23ebe784e",49,2),
        )

        const ChainlinkStrategy = await ethers.getContractFactory("ChainlinkFeedStrategyV2");
        const CurveStrategy = await ethers.getContractFactory("CurvePoolReferenceFeedStrategyV2");
        const CurveLpStrategy = await ethers.getContractFactory("CurveLpReferenceFeedStrategyV2");

        for (let i = 0; i < fiatRoutes.length; i++) {
            const element = fiatRoutes[i];

            const strategy = await upgrades.deployProxy(ChainlinkStrategy,
                [constants.AddressZero, element.oracle, element.token],
                { initializer: 'initialize', kind: 'uups' }
            ) as ChainlinkFeedStrategyV2;
            element.strategy = strategy
            
            await router.setFiatStrategy(element.name, element.id, strategy.address);
            if(element.token != constants.AddressZero){
                await router.setCryptoStrategy(strategy.address, element.token);
            }
        }

        for (let i = 0; i < cryptoRoutes.length; i++) {
        const element = cryptoRoutes[i];
            const strategy = await upgrades.deployProxy(ChainlinkStrategy,
                [constants.AddressZero, element.oracle, element.coin],
                { initializer: 'initialize', kind: 'uups' }
            ) as ChainlinkFeedStrategyV2;
            element.strategy = strategy
            await router.setCryptoStrategy(strategy.address, element.coin);
        }

        for (let i = 0; i < curveRoutes.length; i++) {
            const element = curveRoutes[i];

            const strategy = await upgrades.deployProxy(CurveStrategy,
                [   constants.AddressZero,
                    await router.cryptoToUsdStrategies(element.referenceFeed),
                    element.poolAddress,
                    element.referenceCoinIndex,
                    element.desiredIndex,
                    element.referenceCoinDecimals,
                    element.oneTokenAmount],
                { initializer: 'initialize', kind: 'uups' }
            ) as CurvePoolReferenceFeedStrategyV2;

            element.strategy = strategy;
            await router.setCryptoStrategy(strategy.address, element.coin);
        }

        for (let i = 0; i < curveLpRoutes.length; i++) {
        const element = curveLpRoutes[i];

            const strategy = await upgrades.deployProxy(CurveLpStrategy,
                [   constants.AddressZero,
                    await router.cryptoToUsdStrategies(element.referenceFeed),
                    element.poolAddress,
                    element.referenceCoinIndex,
                    element.referenceCoinDecimals,
                    element.oneTokenAmount,
                    element.typeOfTokenIndex],
                { initializer: 'initialize', kind: 'uups' }
            ) as CurveLpReferenceFeedStrategyV2;

            element.strategy = strategy;
            await router.setCryptoStrategy(strategy.address, element.coin);
        }
    });
   describe("Full workflow", function () {

    // it("Should show current prices", async function () {
 
    // })

    // it("Should show current prices of amounts", async function () {
    //     const fiats = ["USD", "EUR", "ETH", "BTC"];
    //     const cryptos = [usdc, usdt, dai, eurt, weth, wbtc, susd, agEur, crv3, mimLp, musdLp, fraxUsdcLp, ceurLp, eur3, stEthLp, alEthLp, cvxLp];

    //     for (let i = 0; i < fiats.length; i++) {
    //         const fiat = fiats[i];
    //         for (let j = 0; j < cryptos.length; j++) {
    //             const crypto = cryptos[j];
    //             let amount = parseUnits("20000", await crypto.decimals())
    //             const price = await router["getPriceOfAmount(address,uint256,string)"](crypto.address, amount, fiat);
                
    //             console.log(`20000 ${await crypto.symbol()} costs ${formatUnits(price.value, price.decimals)} ${fiat}`);
    //         }
    //         console.log();
    //     }
    // })
       it("2 cycles with usd+eur+eth", async function () {

        let ABI = ["function approve(address spender, uint256 amount)"];
        let iface = new ethers.utils.Interface(ABI);
        let calldata = iface.encodeFunctionData("approve", [strategyHandler.address, constants.MaxUint256]);

        await gnosis.executeCall(usdc.address, calldata);

        // console.log(await usdc.allowance(gnosis.address, strategyHandler.address));

        await strategyHandler.changeNumberOfAssets(3)
        let amountUsd = parseUnits("1200000", 6)
        let amountEur = parseUnits("200000", 6)
        let amountEth = parseUnits("30", 18)
        await eurt.connect(whaleEurt).approve(exchange.address, amountEur)
        await exchange.connect(whaleEurt).exchange(eurt.address, agEur.address, amountEur, 0)
        let finalAmountEur = await agEur.balanceOf(whaleEurt.address)
        // console.log(finalAmountEur);
        
        await usdc.connect(whaleUsdc).transfer(strategyUsd.address, amountUsd)
        await agEur.connect(whaleEurt).transfer(strategyEur.address, finalAmountEur)
        await weth.connect(whaleWeth).transfer(strategyEth.address, amountEth)

        let dataUsd = await strategyUsd.encodeEntryParams("0xDcEF968d416a41Cdac0ED8702fAC8128A64241A2", usdc.address, "0x3175Df0976dFA876431C2E9eE6Bc45b65d3473CC",2,1,100)
        
        let dataEur = await strategyEur.encodeEntryParams("0xe7A3b38c39F97E977723bd1239C3470702568e7B", agEur.address, "0xe7A3b38c39F97E977723bd1239C3470702568e7B",3,1,112)

        let dataEth = await strategyEth.encodeEntryParams("0xDC24316b9AE028F1497c275EB9192a3Ea0f67022", nativeETH, "0x06325440D014e39736583c165C2963BA99fAf14E",2,0,25);

        await strategyUsd.invest(dataUsd, amountUsd)
        await strategyEur.invest(dataEur, finalAmountEur)
        await strategyEth.invest(dataEth, amountEth)

        let rewardDataUsd = await strategyUsd.encodeRewardsParams("0x3175Df0976dFA876431C2E9eE6Bc45b65d3473CC",100,0) 
        let rewardDataEur = await strategyEur.encodeRewardsParams("0xe7A3b38c39F97E977723bd1239C3470702568e7B",112,1)
        let rewardDataEth = await strategyEth.encodeRewardsParams("0x06325440D014e39736583c165C2963BA99fAf14E",25,2)

        // console.log(await strategyUsd.getDeployedAmount(rewardDataUsd));
        // console.log(await strategyEur.getDeployedAmount(rewardDataEur));
        // console.log(await strategyEth.getDeployedAmount(rewardDataEth));

        await strategyHandler.addToActiveDirections(0);
        await strategyHandler.addToActiveDirections(3);
        await strategyHandler.addToActiveDirections(5);
        await strategyHandler.updateLastTime();
        await strategyHandler.setAssetAmount(0, parseEther("1200000"));
        await strategyHandler.setAssetAmount(1, parseEther("200000"));
        await strategyHandler.setAssetAmount(2, parseEther("30"));
        await skipDays(1)
        let treasuryChangeCommand = await voteExecutorMaster.encodeTreasuryAllocationChangeCommand(parseEther("-200000"))
        let fraxCommand = await voteExecutorMaster.encodeLiquidityCommand("Curve/Convex Frax+USDC", 3000)
        let musdCommand = await voteExecutorMaster.encodeLiquidityCommand("Curve/Convex Musd+3CRV", 5000)
        let mimCommand = await voteExecutorMaster.encodeLiquidityCommand("Curve/Convex Mim+3CRV", 2000)

        let eur3Command = await voteExecutorMaster.encodeLiquidityCommand("3eur:Convex", 6000)
        let ceurCommand = await voteExecutorMaster.encodeLiquidityCommand("Curve/Convex cEUR+agEUR+EUROC", 4000)

        let stEthCommand = await voteExecutorMaster.encodeLiquidityCommand("Curve/Convex stETH+ETH", 7000)
        let alEthCommand = await voteExecutorMaster.encodeLiquidityCommand("Curve/Convex alETH+ETH", 3000)

        let finalData = await voteExecutorMaster.encodeAllMessages(
            [3,2,2,2,2,2,2,2],
            [treasuryChangeCommand[1],
            fraxCommand[1],
            musdCommand[1],
            mimCommand[1],
            eur3Command[1],
            ceurCommand[1],
            stEthCommand[1],
            alEthCommand[1]
        ])
        
        let hash = finalData[0]
        let inputData = finalData[2]

        await voteExecutorMaster.submitData(inputData)

        let sign = await signers[0].signMessage(ethers.utils.arrayify(hash))
        // console.log(sign);

        await voteExecutorMaster.approveSubmittedData(0, [sign])

        // console.log(await voteExecutorMaster.getSubmittedData(0));
        
        await voteExecutorMaster.executeSpecificData(0)
        await voteExecutorMaster.executeDeposits()

        console.log(Number((await strategyHandler.getCurrentDeployed())[0])/10**18);
        console.log(Number(await usdc.balanceOf(voteExecutorMaster.address))/10**6);
        console.log(Number(await usdc.balanceOf(gnosis.address))/10**6);

        console.log(Number((await strategyHandler.getCurrentDeployed())[1])/10**18);
        console.log(Number(await eurt.balanceOf(voteExecutorMaster.address))/10**6);

        console.log(Number((await strategyHandler.getCurrentDeployed())[2])/10**18);
        console.log(Number(await weth.balanceOf(voteExecutorMaster.address))/10**18);
        console.log("---------");

        await skipDays(2)

        treasuryChangeCommand = await voteExecutorMaster.encodeTreasuryAllocationChangeCommand(parseEther("200000"))
        fraxCommand = await voteExecutorMaster.encodeLiquidityCommand("Curve/Convex Frax+USDC", 8000)
        musdCommand = await voteExecutorMaster.encodeLiquidityCommand("Curve/Convex Musd+3CRV", 1000)
        mimCommand = await voteExecutorMaster.encodeLiquidityCommand("Curve/Convex Mim+3CRV", 1000)

        eur3Command = await voteExecutorMaster.encodeLiquidityCommand("3eur:Convex", 10000)
        ceurCommand = await voteExecutorMaster.encodeLiquidityCommand("Curve/Convex cEUR+agEUR+EUROC", 0)

        stEthCommand = await voteExecutorMaster.encodeLiquidityCommand("Curve/Convex stETH+ETH", 4000)
        alEthCommand = await voteExecutorMaster.encodeLiquidityCommand("Curve/Convex alETH+ETH", 6000)

        finalData = await voteExecutorMaster.encodeAllMessages(
            [3,2,2,2,2,2,2,2],
            [treasuryChangeCommand[1],
            fraxCommand[1],
            musdCommand[1],
            mimCommand[1],
            eur3Command[1],
            ceurCommand[1],
            stEthCommand[1],
            alEthCommand[1]
        ])

        hash = finalData[0]
        inputData = finalData[2]

        await voteExecutorMaster.submitData(inputData)

        sign = await signers[0].signMessage(ethers.utils.arrayify(hash))
        // console.log(sign);

        await voteExecutorMaster.approveSubmittedData(1, [sign])

        await voteExecutorMaster.executeSpecificData(1)
        await voteExecutorMaster.executeDeposits()
        
        console.log(Number((await strategyHandler.getCurrentDeployed())[0])/10**18);
        console.log(Number(await usdc.balanceOf(voteExecutorMaster.address))/10**6);
        console.log(Number(await usdc.balanceOf(gnosis.address))/10**6);

        console.log(Number((await strategyHandler.getCurrentDeployed())[1])/10**18);
        console.log(Number(await eurt.balanceOf(voteExecutorMaster.address))/10**6);

        console.log(Number((await strategyHandler.getCurrentDeployed())[2])/10**18);
        console.log(Number(await weth.balanceOf(voteExecutorMaster.address))/10**18);
    })
   })
 
})
