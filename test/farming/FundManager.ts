import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers, network, upgrades } from "hardhat";
import { parseEther, parseUnits } from "ethers/lib/utils";

import { FundManager, VoteExecutorMasterLog, StrategyHandler } from "../../typechain";
import { expect } from "chai";

async function getImpersonatedSigner(address: string): Promise<SignerWithAddress> {
    await ethers.provider.send(
        'hardhat_impersonateAccount',
        [address]
    );

    return await ethers.getSigner(address);
}

async function skipDays(days: number) {
    ethers.provider.send("evm_increaseTime", [days * 86400]);
    ethers.provider.send("evm_mine", []);
}

async function sendEth(users: SignerWithAddress[]) {
    let signers = await ethers.getSigners();

    for (let i = 0; i < users.length; i++) {
        await signers[0].sendTransaction({
            to: users[i].address,
            value: parseEther("1.0")

        });
    }
}

async function getTxFromExecPayload(from: string, to: string, txCheckerPayload: string) {
    const data = txCheckerPayload;
    const tx = {
        from: from,
        to: to,
        data: data,
    };
    return tx;
}


describe("FundManager Tests", () => {
    let FundManager: FundManager;
    let Gnosis: SignerWithAddress;
    let Signers: SignerWithAddress[];
    let VoteExecutorMaster: VoteExecutorMasterLog
    let StrategyHandler: StrategyHandler;
    let gelato;
    let maxGasPrice = 1000000000000000;
    let usdcWhale: SignerWithAddress;
    let wethWhale: SignerWithAddress;
    let eurtWhale: SignerWithAddress;
    let btcWhale: SignerWithAddress;

    beforeEach(async function () {
        await network.provider.request({
            method: "hardhat_reset",
            params: [{
                forking: {
                    enabled: true,
                    jsonRpcUrl: process.env.MAINNET_FORKING_URL as string,
                    blockNumber: 16570200
                },
            },],
        });
        let fundManagerFactory = await ethers.getContractFactory("FundManager");
        Gnosis = await getImpersonatedSigner("0x1F020A4943EB57cd3b2213A66b355CB662Ea43C3")
        Signers = await ethers.getSigners();
        usdcWhale = await getImpersonatedSigner("0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503")
        wethWhale = await getImpersonatedSigner("0x8EB8a3b98659Cce290402893d0123abb75E3ab28")
        eurtWhale = await getImpersonatedSigner("0x5754284f345afc66a98fbB0a0Afe71e0F007B949")
        btcWhale = await getImpersonatedSigner("0x218B95BE3ed99141b0144Dba6cE88807c4AD7C09")
        await sendEth([Gnosis, btcWhale])
        VoteExecutorMaster = await ethers.getContractAt("VoteExecutorMasterLog", "0x82e568C482dF2C833dab0D38DeB9fb01777A9e89")
        StrategyHandler = await ethers.getContractAt("StrategyHandler", "0x385AB598E7DBF09951ba097741d2Fa573bDe94A5")
        let newVoteExecutorMaster = await ethers.getContractFactory("VoteExecutorMasterLog")
        let newContract = await newVoteExecutorMaster.deploy()
        await VoteExecutorMaster.connect(Gnosis).changeUpgradeStatus(true);
        await VoteExecutorMaster.connect(Gnosis).upgradeTo(newContract.address);
        await VoteExecutorMaster.connect(Gnosis).setCvxDistributor("0xc22DB2874725B84e99EC0a644fdD042EA3F6F899")
        let cvxDistributor = await ethers.getContractAt("ICvxDistributor", "0xc22DB2874725B84e99EC0a644fdD042EA3F6F899")
        await cvxDistributor.connect(Gnosis).grantRole(await cvxDistributor.PROTOCOL_ROLE(), "0x82e568C482dF2C833dab0D38DeB9fb01777A9e89")
        let ZERO_ADDRESS = Signers[0].address
        FundManager = await upgrades.deployProxy(fundManagerFactory, [Gnosis.address, ZERO_ADDRESS, ZERO_ADDRESS, maxGasPrice]) as FundManager;
        await FundManager.setGnosis(Gnosis.address);
        await FundManager.setStrategyHandler(StrategyHandler.address);
        await FundManager.setVoteExecutorMaster(VoteExecutorMaster.address);
        await FundManager.setExchangeAddress("0x29c66CF57a03d41Cfe6d9ecB6883aa0E2AbA21Ec")

        // Now new contract is deployed, we need to grant all roles from existing strategy contracts and the StrategyHandler to this new manager contract
        // This is done by the Gnosis multisig
        let BTCStrategy = await ethers.getContractAt("CurveConvexStrategyV2", "0x99D86d86B6ecBFC517278db335bCf172eF572854")
        let WETHStrategy = await ethers.getContractAt("CurveConvexStrategyV2", "0x01C9B838BE2c60181cef4Be3160d6F44daEe0a99")
        let USDStrategy = await ethers.getContractAt("CurveConvexStrategyV2", "0x723f499e8749ADD6dCdf02385Ad35B5B2FB9df98")
        let EURStrategy = await ethers.getContractAt("CurveConvexStrategyV2", "0x5b46811550ecB07F9F5B75262515554468D3C5FD")
        let FraxETHStrategy = await ethers.getContractAt("CurveConvexStrategyV2", "0x4d8dE98F908748b91801d74d3F784389107F51d7")
        let FraxUSDStrategy = await ethers.getContractAt("CurveConvexStrategyV2", "0x7f609E0b083d9E1Edf0f3EfD1C6bdd2b16080EEd")

        await StrategyHandler.connect(Gnosis).grantRole(await StrategyHandler.DEFAULT_ADMIN_ROLE(), FundManager.address)
        await BTCStrategy.connect(Gnosis).grantRole(await BTCStrategy.DEFAULT_ADMIN_ROLE(), FundManager.address)
        await WETHStrategy.connect(Gnosis).grantRole(await WETHStrategy.DEFAULT_ADMIN_ROLE(), FundManager.address)
        await USDStrategy.connect(Gnosis).grantRole(await USDStrategy.DEFAULT_ADMIN_ROLE(), FundManager.address)
        await EURStrategy.connect(Gnosis).grantRole(await EURStrategy.DEFAULT_ADMIN_ROLE(), FundManager.address)
        await FraxETHStrategy.connect(Gnosis).grantRole(await FraxETHStrategy.DEFAULT_ADMIN_ROLE(), FundManager.address)
        await FraxUSDStrategy.connect(Gnosis).grantRole(await FraxUSDStrategy.DEFAULT_ADMIN_ROLE(), FundManager.address)

        await VoteExecutorMaster.connect(Gnosis).executeSpecificData(6)
        await VoteExecutorMaster.connect(Gnosis).executeDeposits()

        // Send some CVX and CRV to the EURStrategy contract
        let CVX = await ethers.getContractAt("IERC20", "0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B")
        let CRV = await ethers.getContractAt("IERC20", "0xD533a949740bb3306d119CC777fa900bA034cd52")
        let CVXWhale = await getImpersonatedSigner("0xbEC5E1AD5422e52821735b59b39Dc03810aAe682")
        let CRVWhale = await getImpersonatedSigner("0x32D03DB62e464c9168e41028FFa6E9a05D8C6451")
        await CVX.connect(CVXWhale).transfer(EURStrategy.address, ethers.utils.parseUnits("10", 18))
        await CRV.connect(CRVWhale).transfer(EURStrategy.address, ethers.utils.parseUnits("10", 18))
    });


    describe("FundManager execution of mid cycle deposits", () => {
        it("Should take existing USDC and deposit them into USD strategies", async () => {
            // 1. Send some USDC to the FundManager;
            let USDC = await ethers.getContractAt("IERC20", "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48")
            await USDC.connect(usdcWhale).transfer(FundManager.address, ethers.utils.parseUnits("10000", 6))
            let beforeStrategyHandlerUSDCAmount = await StrategyHandler.getAssetAmount(0)
            // Now execute specificMidcycle deposits
            await skipDays(1)
            await FundManager.executeSpecificMidCycleDeposits(0);
            let afterStrategyHandlerUSDCAmount = await StrategyHandler.getAssetAmount(0)
            expect(afterStrategyHandlerUSDCAmount).to.be.gt(beforeStrategyHandlerUSDCAmount)
        })

        it("Should take existing WETH and deposit them into WETH strategies", async () => {
            // 1. Send some USDC to the FundManager;
            let WETH = await ethers.getContractAt("IERC20", "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2")
            await WETH.connect(wethWhale).transfer(FundManager.address, ethers.utils.parseUnits("10000", 6))
            let beforeStrategyHandlerUSDCAmount = await StrategyHandler.getAssetAmount(2)
            // Now execute specificMidcycle deposits
            await skipDays(1)

            await FundManager.executeSpecificMidCycleDeposits(2);
            let afterStrategyHandlerUSDCAmount = await StrategyHandler.getAssetAmount(2)
            expect(afterStrategyHandlerUSDCAmount).to.be.gt(beforeStrategyHandlerUSDCAmount)
        })
        it("Should take existing EURT and deposit them into EURT strategies", async () => {
            // 1. Send some EURT to the FundManager;
            let EURT = await ethers.getContractAt("IERC20", "0xC581b735A1688071A1746c968e0798D642EDE491")
            await EURT.connect(eurtWhale).transfer(FundManager.address, ethers.utils.parseUnits("10000", 6))
            let beforeStrategyHandlerEURTAmount = await StrategyHandler.getAssetAmount(1)
            // Now execute specificMidcycle deposits
            await skipDays(1)

            await FundManager.executeSpecificMidCycleDeposits(1);
            let afterStrategyHandlerEURTAmount = await StrategyHandler.getAssetAmount(1)
            console.log("Before", beforeStrategyHandlerEURTAmount.toString())
            console.log("After", afterStrategyHandlerEURTAmount.toString())
            expect(afterStrategyHandlerEURTAmount).to.be.gt(beforeStrategyHandlerEURTAmount)
        })
        it("Should take existing WBTC and deposit them into WBTC strategies", async () => {
            // 1. Send some WBTC to the FundManager;
            let WBTC = await ethers.getContractAt("IERC20", "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599")
            await WBTC.connect(btcWhale).transfer(FundManager.address, ethers.utils.parseUnits("0.3", 8))
            let beforeStrategyHandlerWBTCAmount = await StrategyHandler.getAssetAmount(3)
            // Now execute specificMidcycle deposits
            await skipDays(1)

            await FundManager.executeSpecificMidCycleDeposits(3);
            let afterStrategyHandlerWBTCAmount = await StrategyHandler.getAssetAmount(3)
            expect(afterStrategyHandlerWBTCAmount).to.be.gt(beforeStrategyHandlerWBTCAmount)
        })

        it("Should simultaenously deploy all 4 assets and deposit them", async () => {
            // 1. Send some USDC to the FundManager;
            let USDC = await ethers.getContractAt("IERC20", "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48")
            await USDC.connect(usdcWhale).transfer(FundManager.address, ethers.utils.parseUnits("10000", 6))
            let WETH = await ethers.getContractAt("IERC20", "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2")
            await WETH.connect(wethWhale).transfer(FundManager.address, ethers.utils.parseUnits("10000", 6))
            let EURT = await ethers.getContractAt("IERC20", "0xC581b735A1688071A1746c968e0798D642EDE491")
            await EURT.connect(eurtWhale).transfer(FundManager.address, ethers.utils.parseUnits("10000", 6))
            let WBTC = await ethers.getContractAt("IERC20", "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599")
            await WBTC.connect(btcWhale).transfer(FundManager.address, ethers.utils.parseUnits("0.3", 8))
            let beforeStrategyHandlerUSDCAmount = await StrategyHandler.getAssetAmount(0)
            let beforeStrategyHandlerEURTAmount = await StrategyHandler.getAssetAmount(1)
            let beforeStrategyHandlerWBTCAmount = await StrategyHandler.getAssetAmount(3)
            let beforeStrategyHandlerWETHAmount = await StrategyHandler.getAssetAmount(2)
            // Now execute specificMidcycle deposits
            await skipDays(1)

            await FundManager.executeAllMidCycleDeposits();
            let afterStrategyHandlerUSDCAmount = await StrategyHandler.getAssetAmount(0)
            let afterStrategyHandlerEURTAmount = await StrategyHandler.getAssetAmount(1)
            let afterStrategyHandlerWBTCAmount = await StrategyHandler.getAssetAmount(3)
            let afterStrategyHandlerWETHAmount = await StrategyHandler.getAssetAmount(2)
            expect(afterStrategyHandlerUSDCAmount).to.be.gt(beforeStrategyHandlerUSDCAmount)
            expect(afterStrategyHandlerEURTAmount).to.be.gt(beforeStrategyHandlerEURTAmount)
            expect(afterStrategyHandlerWBTCAmount).to.be.gt(beforeStrategyHandlerWBTCAmount)
            expect(afterStrategyHandlerWETHAmount).to.be.gt(beforeStrategyHandlerWETHAmount)
        })
    })
    describe("Tests for the gelato resolver", () => {
        it("Checker should return false when there are insufficient funds", async () => {
            // 1. Send some USDC to the FundManager;
            let returnValue = await FundManager.checker()
            expect(returnValue.canExec).equal(false)
        })
        it("Checker should return true when there are sufficient funds", async () => {
            let USDC = await ethers.getContractAt("IERC20", "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48")
            await USDC.connect(usdcWhale).transfer(FundManager.address, ethers.utils.parseUnits("10000", 6))
            let returnValue = await FundManager.checker()
            expect(returnValue.canExec).equal(true)
        })

        it("Checker should return the correct payload and execute USD deposits", async () => {
            let USDC = await ethers.getContractAt("IERC20", "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48")
            await USDC.connect(usdcWhale).transfer(FundManager.address, ethers.utils.parseUnits("10000", 6))
            let returnValue = await FundManager.checker()
            expect(returnValue.canExec).equal(true)
            let tx = await getTxFromExecPayload(Signers[0].address, FundManager.address, returnValue.execPayload)

            let beforeStrategyHandlerUSDCAmount = await StrategyHandler.getAssetAmount(0)
            // Now execute specificMidcycle deposits
            await skipDays(1)
            await Signers[0].sendTransaction(tx);
            let afterStrategyHandlerUSDCAmount = await StrategyHandler.getAssetAmount(0)
            expect(afterStrategyHandlerUSDCAmount).to.be.gt(beforeStrategyHandlerUSDCAmount)
        })


    })

});









