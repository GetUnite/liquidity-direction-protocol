import { formatUnits, parseEther, parseUnits } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, BigNumberish, BytesLike, constants, Wallet } from "ethers";
import { defaultAbiCoder } from "ethers/lib/utils";
import { ethers, network, upgrades } from "hardhat";
import { before } from "mocha";
import { ChainlinkFeedStrategyV2, CurveConvexStrategyTest, CurveConvexStrategyV2, CurveConvexStrategyV2Native, CurveLpReferenceFeedStrategyV2, CurvePoolReferenceFeedStrategyV2, ERC20, IbAlluo, IbAlluo__factory, IERC20, IERC20Metadata, IExchange, PriceFeedRouterV2, PriceFeedRouterV2__factory, PseudoMultisigWallet, StrategyHandler, UsdCurveAdapter, VoteExecutorMaster, VoteExecutorMasterFinal, VoteExecutorSlave, VoteExecutorSlave__factory,} from "../typechain";
import { IExchangeInterface } from "../typechain/IExchange";
let signers: SignerWithAddress[]
let artem: SignerWithAddress

let uint256 = ethers.utils.toUtf8Bytes("uint256");
let int128 = ethers.utils.toUtf8Bytes("int128");

async function getImpersonatedSigner(address: string): Promise<SignerWithAddress> {
    await ethers.provider.send(
        'hardhat_impersonateAccount',
        [address]
    );

    await signers[0].sendTransaction({
        to: address,
        value: parseEther("1.0")

    });

    return await ethers.getSigner(address);
}

async function skipDays(d: number) {
    ethers.provider.send('evm_increaseTime', [d * 86400]);
    ethers.provider.send('evm_mine', []);
}

describe("Test L1 Contract", function() {
    let voteExecutorMaster : VoteExecutorMasterFinal;
    let router: PriceFeedRouterV2;
    let strategyHandler: StrategyHandler;
    let strategyUsd: CurveConvexStrategyV2;
    let strategyEur: CurveConvexStrategyV2;
    let strategyEth: CurveConvexStrategyV2Native;
    let strategyBtc: CurveConvexStrategyV2;
    let gnosis: PseudoMultisigWallet;

    let exchange: IExchange;

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
        // await network.provider.request({
        //     method: "hardhat_reset",
        //     params: [{
        //         chainId: 1,
        //         forking: {
        //             chainId: 1,
        //             enabled: true,
        //             jsonRpcUrl: process.env.MAINNET_FORKING_URL as string,
        //             //you can fork from last block by commenting next line
        //             blockNumber: 15931256
        //         },
        //     },],
        // });

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

    })

    beforeEach(async () => {
        signers = await ethers.getSigners();

        artem = await getImpersonatedSigner("0x4B948C0354c82f1DC3c510bfa93578540DAb917d")

        gnosis = await (await ethers.getContractFactory("PseudoMultisigWallet")).deploy(true)
        await gnosis.addOwners(signers[0].address);

        let voteExecutorMasterOld = await ethers.getContractAt("VoteExecutorMaster", "0x82e568C482dF2C833dab0D38DeB9fb01777A9e89");
        await voteExecutorMasterOld.connect(artem).setGnosis(gnosis.address)

        router = await ethers.getContractAt("PriceFeedRouterV2","0x24733D6EBdF1DA157d2A491149e316830443FC00")

        strategyHandler = await ethers.getContractAt("StrategyHandler", "0x385AB598E7DBF09951ba097741d2Fa573bDe94A5");
        await strategyHandler.connect(artem).setGnosis(gnosis.address)

        await strategyHandler.connect(artem).changeUpgradeStatus(true)
        await strategyHandler.connect(artem).grantRole(await strategyHandler.UPGRADER_ROLE(), signers[0].address)
        await voteExecutorMasterOld.connect(artem).changeUpgradeStatus(true)
        await voteExecutorMasterOld.connect(artem).grantRole(await strategyHandler.UPGRADER_ROLE(), signers[0].address)

        const ExecutorNew = await ethers.getContractFactory("VoteExecutorMasterFinal");
        const HandlerNew = await ethers.getContractFactory("StrategyHandlerFinal");

        await upgrades.upgradeProxy(voteExecutorMasterOld.address, ExecutorNew);
        await upgrades.upgradeProxy(strategyHandler.address, HandlerNew);

        await strategyHandler.connect(artem).setBoosterAddress("0x470e486acA0e215C925ddcc3A9D446735AabB714")

        voteExecutorMaster = await ethers.getContractAt("VoteExecutorMasterFinal", "0x82e568C482dF2C833dab0D38DeB9fb01777A9e89");
        await voteExecutorMaster.connect(artem).setSlippage(200)
        
        strategyUsd = await ethers.getContractAt("CurveConvexStrategyV2", "0x723f499e8749ADD6dCdf02385Ad35B5B2FB9df98")
        strategyEur = await ethers.getContractAt("CurveConvexStrategyV2", "0x5b46811550ecB07F9F5B75262515554468D3C5FD")
        strategyEth = await ethers.getContractAt("CurveConvexStrategyV2Native", "0x01C9B838BE2c60181cef4Be3160d6F44daEe0a99")
        strategyBtc = await ethers.getContractAt("CurveConvexStrategyV2", "0x99D86d86B6ecBFC517278db335bCf172eF572854")

        whaleUsdc = await getImpersonatedSigner("0xf584f8728b874a6a5c7a8d4d387c9aae9172d621")
        // usdc.connect(whale).transfer(VoteExecutorSlave.address, parseUnits("1000000", "6"));

        whaleEurt = await getImpersonatedSigner("0x5754284f345afc66a98fbb0a0afe71e0f007b949")
        // eurt.connect(whale2).transfer(VoteExecutorSlave.address, parseUnits("1000000", "6"));

        whaleWeth = await getImpersonatedSigner("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2")
        // weth.connect(whale3).transfer(VoteExecutorSlave.address, parseEther("100"));
        
        whaleWbtc = await getImpersonatedSigner("0x218b95be3ed99141b0144dba6ce88807c4ad7c09")
        // wbtc.connect(whale4).transfer(VoteExecutorSlave.address, parseUnits("10", "8"));

    });
   describe("Full workflow", function () {
    it("2 cycles with usd+eur+eth+btc", async function () {
        
        let ABI = ["function approve(address spender, uint256 amount)"];
        let iface = new ethers.utils.Interface(ABI);
        let calldata = iface.encodeFunctionData("approve", [strategyHandler.address, constants.MaxUint256]);

        await gnosis.executeCall(usdc.address, calldata);

        let rewardDataUsd = await strategyUsd.encodeRewardsParams("0x3175Df0976dFA876431C2E9eE6Bc45b65d3473CC",100,0) 
        let rewardDataEur = await strategyEur.encodeRewardsParams("0xe7A3b38c39F97E977723bd1239C3470702568e7B",112,1)
        let rewardDataEth = await strategyEth.encodeRewardsParams("0x06325440D014e39736583c165C2963BA99fAf14E",25,2)
        let rewardDataBtc = await strategyUsd.encodeRewardsParams("0xb19059ebb43466c323583928285a49f558e572fd",8,3)

        console.log(await strategyUsd.getDeployedAmount(rewardDataUsd));
        console.log(await strategyEur.getDeployedAmount(rewardDataEur));
        console.log(await strategyEth.getDeployedAmount(rewardDataEth));
        console.log(await strategyBtc.getDeployedAmount(rewardDataBtc));

        await skipDays(1)
        let treasuryChangeCommand = await voteExecutorMaster.encodeTreasuryAllocationChangeCommand(parseEther("-100"))
        let fraxCommand = await voteExecutorMaster.encodeLiquidityCommand("Curve/Convex Frax+USDC", 3000)
        let musdCommand = await voteExecutorMaster.encodeLiquidityCommand("Curve/Convex Musd+3CRV", 5000)
        let mimCommand = await voteExecutorMaster.encodeLiquidityCommand("Curve/Convex Mim+3CRV", 2000)

        let ceurCommand = await voteExecutorMaster.encodeLiquidityCommand("Curve/Convex cEUR+agEUR+EUROC", 10000)

        let stEthCommand = await voteExecutorMaster.encodeLiquidityCommand("Curve/Convex stETH+ETH", 7000)
        let alEthCommand = await voteExecutorMaster.encodeLiquidityCommand("Curve/Convex alETH+ETH", 3000)

        let hBtcComand = await voteExecutorMaster.encodeLiquidityCommand("Curve/Convex hBTC+WBTC", 0)
        let renBtcComand = await voteExecutorMaster.encodeLiquidityCommand("Curve/Convex renBTC+WBTC+sBTC", 10000)

        let finalData = await voteExecutorMaster.encodeAllMessages(
            [3,2,2,2,2,2,2,2,2],
            [treasuryChangeCommand[1],
            fraxCommand[1],
            musdCommand[1],
            mimCommand[1],
            ceurCommand[1],
            stEthCommand[1],
            alEthCommand[1],
            renBtcComand[1],
            hBtcComand[1]
        ])
        
        let hash = finalData[0]
        let inputData = finalData[2]

        await voteExecutorMaster.submitData(inputData)

        let sign = await signers[0].signMessage(ethers.utils.arrayify(hash))
        // console.log(sign);

        await voteExecutorMaster.approveSubmittedData(0, [sign])

        // console.log(await voteExecutorMaster.getSubmittedData(0));
        
        await voteExecutorMaster.connect(artem).executeSpecificData(0)
        await voteExecutorMaster.connect(artem).executeDeposits()

        console.log("USD");
        console.log("in strategy:",Number((await strategyHandler.getCurrentDeployed())[0])/10**18);
        console.log("in executor:",Number(await usdc.balanceOf(voteExecutorMaster.address))/10**6);
        console.log("in gnosis:",Number(await usdc.balanceOf(gnosis.address))/10**6);

        console.log("EUR");
        console.log("in strategy:",Number((await strategyHandler.getCurrentDeployed())[1])/10**18);
        console.log("in executor:",Number(await eurt.balanceOf(voteExecutorMaster.address))/10**6);

        console.log("ETH");
        console.log("in strategy:",Number((await strategyHandler.getCurrentDeployed())[2])/10**18);
        console.log("in executor:",Number(await weth.balanceOf(voteExecutorMaster.address))/10**18);
        console.log("in executor:",Number(await weth.balanceOf(voteExecutorMaster.address)));

        console.log("BTC");
        console.log("in strategy:",Number((await strategyHandler.getCurrentDeployed())[3])/10**18);
        console.log("in executor:",Number(await wbtc.balanceOf(voteExecutorMaster.address))/10**8);
        console.log("in executor:",Number(await wbtc.balanceOf(voteExecutorMaster.address)));
        console.log("---------");

        await skipDays(2)

        treasuryChangeCommand = await voteExecutorMaster.encodeTreasuryAllocationChangeCommand(parseEther("100"))
        fraxCommand = await voteExecutorMaster.encodeLiquidityCommand("Curve/Convex Frax+USDC", 8000)
        musdCommand = await voteExecutorMaster.encodeLiquidityCommand("Curve/Convex Musd+3CRV", 1000)
        mimCommand = await voteExecutorMaster.encodeLiquidityCommand("Curve/Convex Mim+3CRV", 1000)

        ceurCommand = await voteExecutorMaster.encodeLiquidityCommand("Curve/Convex cEUR+agEUR+EUROC", 10000)

        stEthCommand = await voteExecutorMaster.encodeLiquidityCommand("Curve/Convex stETH+ETH", 4000)
        alEthCommand = await voteExecutorMaster.encodeLiquidityCommand("Curve/Convex alETH+ETH", 6000)

        hBtcComand = await voteExecutorMaster.encodeLiquidityCommand("Curve/Convex hBTC+WBTC", 5000)

        renBtcComand = await voteExecutorMaster.encodeLiquidityCommand("Curve/Convex renBTC+WBTC+sBTC", 5000)


        finalData = await voteExecutorMaster.encodeAllMessages(
            [3,2,2,2,2,2,2,2,2],
            [treasuryChangeCommand[1],
            fraxCommand[1],
            musdCommand[1],
            mimCommand[1],
            ceurCommand[1],
            stEthCommand[1],
            alEthCommand[1],
            hBtcComand[1],
            renBtcComand[1]
        ])

        hash = finalData[0]
        inputData = finalData[2]

        await voteExecutorMaster.submitData(inputData)

        sign = await signers[0].signMessage(ethers.utils.arrayify(hash))
        // console.log(sign);

        await voteExecutorMaster.approveSubmittedData(1, [sign])

        await voteExecutorMaster.connect(artem).executeSpecificData(1)
        await voteExecutorMaster.connect(artem).executeDeposits()
        
        console.log("USD");
        console.log("in strategy:",Number((await strategyHandler.getCurrentDeployed())[0])/10**18);
        console.log("in executor:",Number(await usdc.balanceOf(voteExecutorMaster.address))/10**6);
        console.log("in gnosis:",Number(await usdc.balanceOf(gnosis.address))/10**6);

        console.log("EUR");
        console.log("in strategy:",Number((await strategyHandler.getCurrentDeployed())[1])/10**18);
        console.log("in executor:",Number(await eurt.balanceOf(voteExecutorMaster.address))/10**6);

        console.log("ETH");
        console.log("in strategy:",Number((await strategyHandler.getCurrentDeployed())[2])/10**18);
        console.log("in executor:",Number(await weth.balanceOf(voteExecutorMaster.address))/10**18);
        console.log("in executor:",Number(await weth.balanceOf(voteExecutorMaster.address)));

        console.log("BTC");
        console.log("in strategy:",Number((await strategyHandler.getCurrentDeployed())[3])/10**18);
        console.log("in executor:",Number(await wbtc.balanceOf(voteExecutorMaster.address))/10**8);
        console.log("in executor:",Number(await wbtc.balanceOf(voteExecutorMaster.address)));
        console.log("---------");
    })
 

    })
       
})
