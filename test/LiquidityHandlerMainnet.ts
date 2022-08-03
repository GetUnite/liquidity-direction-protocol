import { parseEther, parseUnits } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, BigNumberish, BytesLike } from "ethers";
import { ethers, network, upgrades } from "hardhat";
import { before } from "mocha";
import { IERC20, PseudoMultisigWallet, PseudoMultisigWallet__factory, IbAlluo, IbAlluo__factory, LiquidityHandler, UsdCurveAdapter, BtcCurveAdapter, LiquidityHandler__factory, UsdCurveAdapter__factory, EurCurveAdapter, EthNoPoolAdapter, EurCurveAdapter__factory, EthNoPoolAdapter__factory, BtcCurveAdapter__factory, IbAlluoMainnet, UsdCurveAdapterMainnet, EurCurveAdapterMainnet, EthNoPoolAdapterMainnet, BtcNoPoolAdapterMainnet, IbAlluoMainnet__factory, UsdCurveAdapterMainnet__factory, BtcNoPoolAdapterMainnet__factory, EurCurveAdapterMainnet__factory, EthNoPoolAdapterMainnet__factory } from "../typechain";

async function getLastWithdrawalInfo(token: IbAlluoMainnet, handler: LiquidityHandler) {
    let request = (await handler.ibAlluoToWithdrawalSystems(token.address)).lastWithdrawalRequest
    let satisfied = (await handler.ibAlluoToWithdrawalSystems(token.address)).lastSatisfiedWithdrawal
    let total = (await handler.ibAlluoToWithdrawalSystems(token.address)).totalWithdrawalAmount
    return [request, satisfied, total]
}

async function getImpersonatedSigner(address: string): Promise < SignerWithAddress > {
    await ethers.provider.send(
        'hardhat_impersonateAccount',
        [address]
    );

    return await ethers.getSigner(address);
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

describe("Handler and different adapters", function () {
    let signers: SignerWithAddress[];
    let admin: SignerWithAddress;

    let ibAlluoUsd: IbAlluoMainnet;
    let ibAlluoEur: IbAlluoMainnet;
    let ibAlluoEth: IbAlluoMainnet;
    let ibAlluoBtc: IbAlluoMainnet;

    let usdAdapter: UsdCurveAdapterMainnet;
    let eurAdapter: EurCurveAdapterMainnet;
    let ethAdapter: EthNoPoolAdapterMainnet;
    let btcAdapter: BtcNoPoolAdapterMainnet;

    let handler: LiquidityHandler;

    let dai: IERC20, usdc: IERC20, usdt: IERC20;
    let curveLpUSD: IERC20;

    let usdWhale: SignerWithAddress;
    let curveUsdLpHolder: SignerWithAddress;

    let ageur: IERC20, eurt: IERC20, eurs: IERC20;
    let curveLpEUR: IERC20;

    let ageurWhale: SignerWithAddress;
    let eurtWhale: SignerWithAddress;
    let eursWhale: SignerWithAddress;

    let weth: IERC20;

    let wethWhale: SignerWithAddress;

    let wbtc: IERC20;

    let wbtcWhale: SignerWithAddress;

    before(async function () {

        //We are forking Polygon mainnet, please set Alchemy key in .env
        await network.provider.request({
            method: "hardhat_reset",
            params: [{
                forking: {
                    enabled: true,
                    jsonRpcUrl: process.env.MAINNET_FORKING_URL as string,
                    //you can fork from last block by commenting next line
                    blockNumber: 15266430,
                },
            }, ],
        });

        signers = await ethers.getSigners();

        admin = await getImpersonatedSigner("0x1F020A4943EB57cd3b2213A66b355CB662Ea43C3");
        await (await (await ethers.getContractFactory("ForceSender")).deploy({
            value: parseEther("10.0")
        })).forceSend(admin.address);

        usdWhale = await getImpersonatedSigner("0x8EB8a3b98659Cce290402893d0123abb75E3ab28");
        curveUsdLpHolder = await getImpersonatedSigner("0x701aecf92edcc1daa86c5e7eddbad5c311ad720c");

        ageurWhale = await getImpersonatedSigner("0x12d3D411d010891a88BFf2401bD73FA41fb1316e");
        eurtWhale = await getImpersonatedSigner("0x103090A6141ae2F3cB1734F2D0D2D8f8924b3A5d");
        eursWhale = await getImpersonatedSigner("0x171c53d55B1BCb725F660677d9e8BAd7fD084282");

        wethWhale = await getImpersonatedSigner("0x06920C9fC643De77B99cB7670A944AD31eaAA260");

        wbtcWhale = await getImpersonatedSigner("0x845cbCb8230197F733b59cFE1795F282786f212C");

        dai = await ethers.getContractAt("IERC20", "0x6B175474E89094C44Da98b954EedeAC495271d0F");
        usdc = await ethers.getContractAt("IERC20", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
        usdt = await ethers.getContractAt("IERC20", "0xdAC17F958D2ee523a2206206994597C13D831ec7");
        curveLpUSD = await ethers.getContractAt("IERC20", "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490");

        ageur = await ethers.getContractAt("IERC20", "0x1a7e4e63778B4f12a199C062f3eFdD288afCBce8");
        eurt = await ethers.getContractAt("IERC20", "0xC581b735A1688071A1746c968e0798D642EDE491");
        eurs = await ethers.getContractAt("IERC20", "0xdB25f211AB05b1c97D595516F45794528a807ad8");

        weth = await ethers.getContractAt("IERC20", "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");

        wbtc = await ethers.getContractAt("IERC20", "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599");

        console.log("We are forking ETH mainnet\n");
        expect(await dai.balanceOf(usdWhale.address)).to.be.gt(0, "Whale has no DAI, or you are not forking Polygon");
        expect(await usdc.balanceOf(usdWhale.address)).to.be.gt(0, "Whale has no USDC, or you are not forking Polygon");
        expect(await usdt.balanceOf(usdWhale.address)).to.be.gt(0, "Whale has no USDT, or you are not forking Polygon");
        expect(await ageur.balanceOf(ageurWhale.address)).to.be.gt(0, "Whale has no ageur, or you are not forking Polygon");
        expect(await eurt.balanceOf(eurtWhale.address)).to.be.gt(0, "Whale has no eurt, or you are not forking Polygon");
        expect(await eurs.balanceOf(eursWhale.address)).to.be.gt(0, "Whale has no eurs, or you are not forking Polygon");
        expect(await weth.balanceOf(wethWhale.address)).to.be.gt(0, "Whale has no weth, or you are not forking Polygon");
        expect(await wbtc.balanceOf(wbtcWhale.address)).to.be.gt(0, "Whale has no wbtc, or you are not forking Polygon");

        await sendEth([usdWhale, ageurWhale, eurtWhale, eursWhale, wethWhale, wbtcWhale])
    });


    beforeEach(async function () {
        const exchangeAddress = "0x29c66CF57a03d41Cfe6d9ecB6883aa0E2AbA21Ec"; 
        const IbAlluo = await ethers.getContractFactory("IbAlluoMainnet") as IbAlluoMainnet__factory;

        const Handler = await ethers.getContractFactory("LiquidityHandler") as LiquidityHandler__factory;

        handler = await upgrades.deployProxy(Handler,
            [admin.address, exchangeAddress], {
                initializer: 'initialize',
                kind: 'uups'
            }
        ) as LiquidityHandler;

        const UsdAdapter = await ethers.getContractFactory("UsdCurveAdapterMainnet") as UsdCurveAdapterMainnet__factory;
        const EurAdapter = await ethers.getContractFactory("EurCurveAdapterMainnet") as EurCurveAdapterMainnet__factory;
        const EthAdapter = await ethers.getContractFactory("EthNoPoolAdapterMainnet") as EthNoPoolAdapterMainnet__factory;
        const BtcAdapter = await ethers.getContractFactory("BtcNoPoolAdapterMainnet") as BtcNoPoolAdapterMainnet__factory;

        usdAdapter = await upgrades.deployProxy(UsdAdapter,
            [
                admin.address,
                handler.address,
                200
            ], {
                initializer: 'initialize',
                kind: 'uups'
            }
        ) as UsdCurveAdapterMainnet;

        eurAdapter = await upgrades.deployProxy(EurAdapter,
            [
                admin.address,
                handler.address,
                200
            ], {
                initializer: 'initialize',
                kind: 'uups'
            }
        ) as EurCurveAdapterMainnet;

        ethAdapter = await upgrades.deployProxy(EthAdapter,
            [
                admin.address,
                handler.address
            ], {
                initializer: 'initialize',
                kind: 'uups'
            }
        ) as EthNoPoolAdapterMainnet;

        btcAdapter = await upgrades.deployProxy(BtcAdapter,
            [
                admin.address,
                handler.address
            ], {
                initializer: 'initialize',
                kind: 'uups'
            }
        ) as BtcNoPoolAdapterMainnet;


        await usdAdapter.connect(admin).adapterApproveAll()
        await handler.connect(admin).setAdapter(
            1,
            "USD Curve-Aave",
            500,
            usdAdapter.address,
            true
        )

        await eurAdapter.connect(admin).adapterApproveAll()
        await handler.connect(admin).setAdapter(
            2,
            "EUR Curve-Aave",
            500,
            eurAdapter.address,
            true
        )

        await handler.connect(admin).setAdapter(
            3,
            "ETH No Pool Adapter",
            500,
            ethAdapter.address,
            true
        )

        await handler.connect(admin).setAdapter(
            4,
            "BTC No Pool Adapter",
            500,
            btcAdapter.address,
            true
        )

        ibAlluoUsd = await upgrades.deployProxy(IbAlluo,
            [
                "Interest Bearing Alluo USD",
                "ibAlluoUsd",
                admin.address,
                handler.address,
                [dai.address,
                    usdc.address,
                    usdt.address
                ],
                BigNumber.from("100000000470636740"),
                1600,
                exchangeAddress
            ], {
                initializer: 'initialize',
                kind: 'uups'
            }
        ) as IbAlluoMainnet;

        await handler.connect(admin).grantRole(await handler.DEFAULT_ADMIN_ROLE(), ibAlluoUsd.address)
        await handler.connect(admin).setIbAlluoToAdapterId(ibAlluoUsd.address, 1)

        ibAlluoEur = await upgrades.deployProxy(IbAlluo,
            [
                "Interest Bearing Alluo EUR",
                "ibAlluoEur",
                admin.address,
                handler.address,
                [ageur.address,
                    eurt.address,
                    eurs.address
                ],
                BigNumber.from("100000000470636740"),
                1600,
                exchangeAddress
            ], {
                initializer: 'initialize',
                kind: 'uups'
            }
        ) as IbAlluoMainnet;

        await handler.connect(admin).grantRole(await handler.DEFAULT_ADMIN_ROLE(), ibAlluoEur.address)
        await handler.connect(admin).setIbAlluoToAdapterId(ibAlluoEur.address, 2)

        ibAlluoEth = await upgrades.deployProxy(IbAlluo,
            [
                "Interest Bearing Alluo ETH",
                "ibAlluoEth",
                admin.address,
                handler.address,
                [weth.address],
                BigNumber.from("100000000470636740"),
                1600,
                exchangeAddress
            ], {
                initializer: 'initialize',
                kind: 'uups'
            }
        ) as IbAlluoMainnet;


        await handler.connect(admin).grantRole(await handler.DEFAULT_ADMIN_ROLE(), ibAlluoEth.address)
        await handler.connect(admin).setIbAlluoToAdapterId(ibAlluoEth.address, 3)

        ibAlluoBtc = await upgrades.deployProxy(IbAlluo,
            [
                "Interest Bearing Alluo BTC",
                "ibAlluoBtc",
                admin.address,
                handler.address,
                [wbtc.address],
                BigNumber.from("100000000470636740"),
                1600,
                exchangeAddress
            ], {
                initializer: 'initialize',
                kind: 'uups'
            }
        ) as IbAlluoMainnet;

        await handler.connect(admin).grantRole(await handler.DEFAULT_ADMIN_ROLE(), ibAlluoBtc.address)
        await handler.connect(admin).setIbAlluoToAdapterId(ibAlluoBtc.address, 4)

    });


    // describe('BTC Adaptor with IbAlluo: Test cases', function () {
    //     it("Depositing 1 wbtc and immediately attempting to withdraw 0.5 should put you in the waiting list", async function () {
    //         await deposit(signers[0], wbtc, parseUnits("1", 8));
    //         await ibAlluoBtc.connect(signers[0]).withdraw(wbtc.address, parseUnits("0.5", 18));
    //         let withdrawalArray = await getLastWithdrawalInfo(ibAlluoBtc, handler)
    //         expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);
    //     })
    //     it("Depositing 1 wbtc, attempt to withdraw 0.5 and then only get paid after there is a deposit", async function () {
    //         await deposit(signers[0], wbtc, parseUnits("1", 8));
    //         await ibAlluoBtc.connect(signers[0]).withdraw(wbtc.address, parseUnits("0.5", 18));
    //         let withdrawalArray = await getLastWithdrawalInfo(ibAlluoBtc, handler)
    //         expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);

    //         await deposit(signers[1], wbtc, parseUnits("1", 8));
    //         await handler.satisfyAdapterWithdrawals(ibAlluoBtc.address);
    //         // Loss from slippage makes tests awkward.

    //         expect(Number(await wbtc.balanceOf(signers[0].address))).lessThan(Number(parseUnits("0.51", 8)))
    //         expect(Number(await wbtc.balanceOf(signers[0].address))).greaterThanOrEqual(Number(parseUnits("0.49", 8)))
    //     })

    //     it("Depositing 0.1 renBtc and immediately attempting to withdraw 0.05 should put you in the waiting list", async function () {
    //         await deposit(signers[0], renBtc, parseUnits("0.1", 8));
    //         await ibAlluoBtc.connect(signers[0]).withdraw(renBtc.address, parseUnits("0.05", 18));
    //         let withdrawalArray = await getLastWithdrawalInfo(ibAlluoBtc, handler)
    //         expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);
    //     })
    //     it("Depositing 0.1 renBtc, attempt to withdraw 0.05 and then only get paid after there is a deposit", async function () {
    //         await deposit(signers[0], renBtc, parseUnits("0.1", 8));
    //         await ibAlluoBtc.connect(signers[0]).withdraw(renBtc.address, parseUnits("0.05", 18));
    //         let withdrawalArray = await getLastWithdrawalInfo(ibAlluoBtc, handler)
    //         expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);

    //         await deposit(signers[1], renBtc, parseUnits("0.1", 8));
    //         await handler.satisfyAdapterWithdrawals(ibAlluoBtc.address);
    //         // Loss from slippage makes tests awkward.

    //         expect(Number(await renBtc.balanceOf(signers[0].address))).lessThan(Number(parseUnits("0.051", 8)))
    //         expect(Number(await renBtc.balanceOf(signers[0].address))).greaterThanOrEqual(Number(parseUnits("0.049", 8)))
    //     })

    //     it("The balance of the multisig wallet should increase with deposits.", async function () {
    //         let walletBalance = await wbtc.balanceOf(admin.address);

    //         await deposit(signers[0], wbtc, parseUnits("1", 8));
    //         expect(Number(await wbtc.balanceOf(admin.address))).greaterThan(Number(walletBalance))
    //         walletBalance = await wbtc.balanceOf(admin.address);

    //         await deposit(signers[0], renBtc, parseUnits("0.1", 8));
    //         expect(Number(await wbtc.balanceOf(admin.address))).greaterThan(Number(walletBalance))
    //         walletBalance = await wbtc.balanceOf(admin.address);

    //         await deposit(signers[0], wbtc, parseUnits("1", 8));
    //         expect(Number(await wbtc.balanceOf(admin.address))).greaterThan(Number(walletBalance))
    //         walletBalance = await wbtc.balanceOf(admin.address);

    //         await deposit(signers[0], renBtc, parseUnits("0.1", 8));
    //         expect(Number(await wbtc.balanceOf(admin.address))).greaterThan(Number(walletBalance))
    //         walletBalance = await wbtc.balanceOf(admin.address);

    //         await deposit(signers[0], wbtc, parseUnits("1", 8));
    //         expect(Number(await wbtc.balanceOf(admin.address))).greaterThan(Number(walletBalance))
    //         walletBalance = await wbtc.balanceOf(admin.address);

    //         await deposit(signers[0], renBtc, parseUnits("0.1", 8));
    //         expect(Number(await wbtc.balanceOf(admin.address))).greaterThan(Number(walletBalance))
    //         walletBalance = await wbtc.balanceOf(admin.address);
    //         console.log("Final multisig balance:", walletBalance);

    //     })
    //     it("Attemping to withdraw more than allowed causes revert.", async function () {
    //         let walletBalance = await wbtc.balanceOf(admin.address);
    //         await deposit(signers[1], wbtc, parseUnits("1", 8));
    //         expect(Number(await wbtc.balanceOf(admin.address))).greaterThan(Number(walletBalance))
    //         await expect(ibAlluoBtc.connect(signers[1]).withdraw(wbtc.address, parseUnits("2", 18))).to.be.revertedWith('ERC20: burn amount exceeds balance')
    //     })
    //     describe('BTC Mass deposits and withdrawal test cases', function () {
    //         it("Multiple deposits and withdrawals: Eventually, all withdrawers should be paid", async function () {
    //             let walletBalance = await wbtc.balanceOf(admin.address);
    //             let userBalanceAtStart = await wbtc.balanceOf(signers[0].address);

    //             await deposit(signers[0], wbtc, parseUnits("1", 8));
    //             expect(Number(await wbtc.balanceOf(admin.address))).greaterThan(Number(walletBalance))
    //             walletBalance = await wbtc.balanceOf(admin.address);

    //             await deposit(signers[2], renBtc, parseUnits("0.1", 8));
    //             expect(Number(await wbtc.balanceOf(admin.address))).greaterThan(Number(walletBalance))
    //             walletBalance = await wbtc.balanceOf(admin.address);

    //             await ibAlluoBtc.connect(signers[0]).withdraw(wbtc.address, parseUnits("0.5", 18));
    //             let withdrawalArray = await getLastWithdrawalInfo(ibAlluoBtc, handler)
    //             expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);

    //             await ibAlluoBtc.connect(signers[2]).withdraw(renBtc.address, parseUnits("0.05", 18));
    //             withdrawalArray = await getLastWithdrawalInfo(ibAlluoBtc, handler)
    //             expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);

    //             // When there are deposits, should pay everyone back.
    //             await deposit(signers[2], renBtc, parseUnits("2", 8));
    //             await handler.satisfyAdapterWithdrawals(ibAlluoBtc.address);
    //             expect(Number(await wbtc.balanceOf(admin.address))).greaterThan(Number(walletBalance))

    //             let delta = (await wbtc.balanceOf(signers[0].address)).sub(userBalanceAtStart)

    //             expect(Number(delta)).lessThan(Number(parseUnits("0.51", 8)))
    //             expect(Number(delta)).greaterThanOrEqual(Number(parseUnits("0.49", 8)))
    //             expect(Number(await renBtc.balanceOf(signers[2].address))).lessThan(Number(parseUnits("0.051", 8)))
    //             expect(Number(await renBtc.balanceOf(signers[2].address))).greaterThanOrEqual(Number(parseUnits("0.049", 8)))
    //         })
    //     })
    // })


    describe("EThAdapter no pool: Test cases", function () {
        it("Depositing 100 weth and immediately attempting to withdraw 50 should put you in the waiting list", async function () {
            await deposit(signers[0], weth, parseEther("100"));
            await ibAlluoEth.connect(signers[0]).withdraw(weth.address, parseEther("50"));
            let withdrawalArray = await getLastWithdrawalInfo(ibAlluoEth, handler)

            expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);
        })
        it("Depositing 100 weth, attempt to withdraw 50 and then only get paid after there is a deposit", async function () {
            await deposit(signers[0], weth, parseEther("100"));
            await ibAlluoEth.connect(signers[0]).withdraw(weth.address, parseEther("50"));
            let withdrawalArray = await getLastWithdrawalInfo(ibAlluoEth, handler)
            expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);

            await deposit(signers[1], weth, parseEther("100"));
            await handler.satisfyAdapterWithdrawals(ibAlluoEth.address);

            expect(await weth.balanceOf(signers[0].address)).equal(parseEther("50"))
        })

        it("The balance of the multisig wallet should increase with weth deposits.", async function () {
            let walletBalance = await weth.balanceOf(admin.address);

            await deposit(signers[0], weth, parseEther("100"));
            expect(Number(await weth.balanceOf(admin.address))).greaterThan(Number(walletBalance))
            walletBalance = await weth.balanceOf(admin.address);

            await deposit(signers[0], weth, parseEther("100"));
            expect(Number(await weth.balanceOf(admin.address))).greaterThan(Number(walletBalance))
            walletBalance = await weth.balanceOf(admin.address);

            await deposit(signers[0], weth, parseEther("100"));
            expect(Number(await weth.balanceOf(admin.address))).greaterThan(Number(walletBalance))
            walletBalance = await weth.balanceOf(admin.address);

            await deposit(signers[0], weth, parseEther("100"));
            expect(Number(await weth.balanceOf(admin.address))).greaterThan(Number(walletBalance))
            walletBalance = await weth.balanceOf(admin.address);

            await deposit(signers[0], weth, parseEther("100"));
            expect(Number(await weth.balanceOf(admin.address))).greaterThan(Number(walletBalance))
            walletBalance = await weth.balanceOf(admin.address);

            await deposit(signers[0], weth, parseEther("100"));
            expect(Number(await weth.balanceOf(admin.address))).greaterThan(Number(walletBalance))
            walletBalance = await weth.balanceOf(admin.address);

            await deposit(signers[0], weth, parseEther("100"));
            expect(Number(await weth.balanceOf(admin.address))).greaterThan(Number(walletBalance))
            walletBalance = await weth.balanceOf(admin.address);

            //console.log("Final multisig balance:", walletBalance);

        })
        it("Attemping to withdraw more weth than allowed causes revert.", async function () {
            let walletBalance = await weth.balanceOf(admin.address);
            await deposit(signers[0], weth, parseEther("100"));
            expect(Number(await weth.balanceOf(admin.address))).greaterThan(Number(walletBalance))
            walletBalance = await weth.balanceOf(admin.address);

            await expect(ibAlluoEth.connect(signers[1]).withdraw(weth.address, parseUnits("500", 18))).to.be.revertedWith('ERC20: burn amount exceeds balance')
        })


    })
    describe('weth Mass deposits and withdrawal test cases', function () {
        it("Multiple deposits and withdrawals: Eventually, all withdrawers should be paid", async function () {
            let walletBalance = await weth.balanceOf(admin.address);
            let userBalanceAtStart = await weth.balanceOf(signers[0].address);

            await deposit(signers[0], weth, parseEther("100"));
            expect(Number(await weth.balanceOf(admin.address))).greaterThan(Number(walletBalance))
            walletBalance = await weth.balanceOf(admin.address);

            await deposit(signers[1], weth, parseEther("50"));
            expect(Number(await weth.balanceOf(admin.address))).greaterThan(Number(walletBalance))
            walletBalance = await weth.balanceOf(admin.address);

            await deposit(signers[2], weth, parseEther("180"));
            expect(Number(await weth.balanceOf(admin.address))).greaterThan(Number(walletBalance))
            walletBalance = await weth.balanceOf(admin.address);

            await ibAlluoEth.connect(signers[0]).withdraw(weth.address, parseEther("50"));
            let withdrawalArray = await getLastWithdrawalInfo(ibAlluoEth, handler)
            expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);

            await ibAlluoEth.connect(signers[1]).withdraw(weth.address, parseEther("35"));
            withdrawalArray = await getLastWithdrawalInfo(ibAlluoEth, handler)
            expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);

            await ibAlluoEth.connect(signers[2]).withdraw(weth.address, parseEther("180"));
            withdrawalArray = await getLastWithdrawalInfo(ibAlluoEth, handler)
            expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);

            // When there are deposits, should pay everyone back.
            await deposit(signers[2], weth, parseUnits("1000", 18));
            await handler.satisfyAdapterWithdrawals(ibAlluoEth.address);
            expect(Number(await weth.balanceOf(admin.address))).greaterThan(Number(walletBalance))

            let delta = (await weth.balanceOf(signers[0].address)).sub(userBalanceAtStart)

            expect(Number(delta)).lessThan(Number(parseUnits("51", 18)))
            expect(Number(delta)).greaterThanOrEqual(Number(parseUnits("49", 18)))
            expect(Number(await weth.balanceOf(signers[1].address))).lessThan(Number(parseUnits("36", 18)))
            expect(Number(await weth.balanceOf(signers[1].address))).greaterThanOrEqual(Number(parseUnits("34", 18)))
            expect(Number(await weth.balanceOf(signers[2].address))).lessThan(Number(parseUnits("181", 18)))
            expect(Number(await weth.balanceOf(signers[2].address))).greaterThanOrEqual(Number(parseUnits("179", 18)))

        })
    })


    describe('EUR Adaptor with IbAlluo: Test cases', function () {
        it("Depositing 100 ageur and immediately attempting to withdraw 50 should put you in the waiting list", async function () {
            await deposit(signers[0], ageur, parseEther("100"));
            await ibAlluoEur.connect(signers[0]).withdraw(ageur.address, parseEther("50"));
            let withdrawalArray = await getLastWithdrawalInfo(ibAlluoEur, handler)
            expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);
        })
        it("Depositing 100 ageur, attempt to withdraw 50 and then only get paid after there is a deposit", async function () {
            await deposit(signers[0], ageur, parseEther("100"));
            await ibAlluoEur.connect(signers[0]).withdraw(ageur.address, parseEther("50"));
            let withdrawalArray = await getLastWithdrawalInfo(ibAlluoEur, handler)
            expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);

            await deposit(signers[1], ageur, parseEther("100"));
            await handler.satisfyAdapterWithdrawals(ibAlluoEur.address);
            // Loss from slippage makes tests awkward.

            expect(Number(await ageur.balanceOf(signers[0].address))).lessThan(Number(parseUnits("51", 18)))
            expect(Number(await ageur.balanceOf(signers[0].address))).greaterThanOrEqual(Number(parseUnits("49", 18)))
        })


        it("Depositing 100 eurt and immediately attempting to withdraw 50 should put you in the waiting list", async function () {
            await deposit(signers[0], eurt, parseUnits("100", 6));
            await ibAlluoEur.connect(signers[0]).withdraw(eurt.address, parseUnits("100", 18));
            let withdrawalArray = await getLastWithdrawalInfo(ibAlluoEur, handler)
            expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);
        })
        it("Depositing 100 eurt, attempt to withdraw 50 and then only get paid after there is a deposit", async function () {
            await deposit(signers[0], eurt, parseUnits("100", 6));
            await ibAlluoEur.connect(signers[0]).withdraw(eurt.address, parseUnits("50", 18));
            let withdrawalArray = await getLastWithdrawalInfo(ibAlluoEur, handler)
            expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);

            await deposit(signers[1], eurt, parseUnits("100", 6));
            await handler.satisfyAdapterWithdrawals(ibAlluoEur.address);
            expect(Number(await eurt.balanceOf(signers[0].address))).lessThan(Number(parseUnits("51", 6)))
            expect(Number(await eurt.balanceOf(signers[0].address))).greaterThanOrEqual(Number(parseUnits("49", 6)))
        })

        it("Depositing 100 eurs and immediately attempting to withdraw 50 should put you in the waiting list", async function () {
            await deposit(signers[0], eurs, parseUnits("100", 2));
            await ibAlluoEur.connect(signers[0]).withdraw(eurs.address, parseUnits("50", 18));
            let withdrawalArray = await getLastWithdrawalInfo(ibAlluoEur, handler)
            expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);
        })
        it("Depositing 100 eurs, attempt to withdraw 50 and then only get paid after there is a deposit", async function () {
            await deposit(signers[0], eurs, parseUnits("100", 2));
            await ibAlluoEur.connect(signers[0]).withdraw(eurs.address, parseUnits("50", 18));
            let withdrawalArray = await getLastWithdrawalInfo(ibAlluoEur, handler)
            expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);

            await deposit(signers[1], eurs, parseUnits("100", 2));
            await handler.satisfyAdapterWithdrawals(ibAlluoEur.address);
            expect(Number(await eurs.balanceOf(signers[0].address))).lessThan(Number(parseUnits("51", 2)))
            expect(Number(await eurs.balanceOf(signers[0].address))).greaterThanOrEqual(Number(parseUnits("49", 2)))
        })

        it("The balance of the multisig wallet should increase with deposits.", async function () {
            let walletBalance = await eurt.balanceOf(admin.address);

            await deposit(signers[0], ageur, parseEther("100"));
            expect(Number(await eurt.balanceOf(admin.address))).greaterThan(Number(walletBalance))
            walletBalance = await eurt.balanceOf(admin.address);


            await deposit(signers[0], eurt, parseUnits("100", 6));
            expect(Number(await eurt.balanceOf(admin.address))).greaterThan(Number(walletBalance))
            walletBalance = await eurt.balanceOf(admin.address);

            await deposit(signers[0], eurs, parseUnits("100", 2));
            expect(Number(await eurt.balanceOf(admin.address))).greaterThan(Number(walletBalance))
            walletBalance = await eurt.balanceOf(admin.address);

            await deposit(signers[0], ageur, parseEther("100"));
            expect(Number(await eurt.balanceOf(admin.address))).greaterThan(Number(walletBalance))
            walletBalance = await eurt.balanceOf(admin.address);


            await deposit(signers[0], eurt, parseUnits("100", 6));
            expect(Number(await eurt.balanceOf(admin.address))).greaterThan(Number(walletBalance))
            walletBalance = await eurt.balanceOf(admin.address);

            await deposit(signers[0], eurs, parseUnits("100", 2));
            expect(Number(await eurt.balanceOf(admin.address))).greaterThan(Number(walletBalance))
            walletBalance = await eurt.balanceOf(admin.address);

            await deposit(signers[0], ageur, parseEther("100"));
            expect(Number(await eurt.balanceOf(admin.address))).greaterThan(Number(walletBalance))
            walletBalance = await eurt.balanceOf(admin.address);


            await deposit(signers[0], eurt, parseUnits("100", 6));
            expect(Number(await eurt.balanceOf(admin.address))).greaterThan(Number(walletBalance))
            walletBalance = await eurt.balanceOf(admin.address);

            await deposit(signers[0], eurs, parseUnits("100", 2));
            expect(Number(await eurt.balanceOf(admin.address))).greaterThan(Number(walletBalance))
            walletBalance = await eurt.balanceOf(admin.address);

            console.log("Final multisig balance:", walletBalance);

        })
        it("Attemping to withdraw more than allowed causes revert.", async function () {
            let walletBalance = await eurt.balanceOf(admin.address);
            await deposit(signers[1], eurt, parseUnits("100", 6));
            expect(Number(await eurt.balanceOf(admin.address))).greaterThan(Number(walletBalance))
            await expect(ibAlluoEur.connect(signers[1]).withdraw(eurt.address, parseUnits("500", 18))).to.be.revertedWith('ERC20: burn amount exceeds balance')
        })
        describe('EUR Mass deposits and withdrawal test cases', function () {
            it("Multiple deposits and withdrawals: Eventually, all withdrawers should be paid", async function () {
                let walletBalance = await eurt.balanceOf(admin.address);
                let withdrawalArray = await getLastWithdrawalInfo(ibAlluoEur, handler)

                await deposit(signers[0], ageur, parseEther("100"));
                expect(Number(await eurt.balanceOf(admin.address))).greaterThan(Number(walletBalance))
                walletBalance = await eurt.balanceOf(admin.address);

                // await deposit(signers[0], par, parseEther("100"));
                // expect(Number(await eurt.balanceOf(admin.address))).greaterThan(Number(walletBalance))
                // walletBalance = await eurt.balanceOf(admin.address);

                await deposit(signers[1], eurt, parseUnits("100", 6));
                expect(Number(await eurt.balanceOf(admin.address))).greaterThan(Number(walletBalance))
                walletBalance = await eurt.balanceOf(admin.address);

                await deposit(signers[2], eurs, parseUnits("100", 2));
                expect(Number(await eurt.balanceOf(admin.address))).greaterThan(Number(walletBalance))
                walletBalance = await eurt.balanceOf(admin.address);

                await ibAlluoEur.connect(signers[0]).withdraw(ageur.address, parseEther("50"));
                withdrawalArray = await getLastWithdrawalInfo(ibAlluoEur, handler)

                expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);
                await ibAlluoEur.connect(signers[1]).withdraw(eurt.address, parseUnits("50", 18));
                withdrawalArray = await getLastWithdrawalInfo(ibAlluoEur, handler)

                expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);
                await ibAlluoEur.connect(signers[2]).withdraw(eurs.address, parseUnits("50", 18));
                withdrawalArray = await getLastWithdrawalInfo(ibAlluoEur, handler)

                expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);

                // When there are deposits, should pay everyone back.
                await deposit(signers[2], eurs, parseUnits("1000", 2));
                await handler.satisfyAdapterWithdrawals(ibAlluoEur.address);
                expect(Number(await eurt.balanceOf(admin.address))).greaterThan(Number(walletBalance))

                expect(Number(await ageur.balanceOf(signers[0].address))).greaterThanOrEqual(Number(parseUnits("49", 18)))
                expect(Number(await eurt.balanceOf(signers[1].address))).greaterThanOrEqual(Number(parseUnits("49", 6)))
                expect(Number(await eurs.balanceOf(signers[2].address))).greaterThanOrEqual(Number(parseUnits("49", 2)))

                // await deposit(signers[0], par, parseEther("100"));
                // expect(Number(await eurt.balanceOf(admin.address))).greaterThan(Number(walletBalance))
                // walletBalance = await eurt.balanceOf(admin.address);


                await deposit(signers[0], eurs, parseUnits("100", 2));
                expect(Number(await eurt.balanceOf(admin.address))).greaterThan(Number(walletBalance))
                walletBalance = await eurt.balanceOf(admin.address);

                await deposit(signers[0], ageur, parseEther("100"));
                expect(Number(await eurt.balanceOf(admin.address))).greaterThan(Number(walletBalance))
                walletBalance = await eurt.balanceOf(admin.address);

                // await deposit(signers[0], par, parseEther("100"));
                // expect(Number(await eurt.balanceOf(admin.address))).greaterThan(Number(walletBalance))
                // walletBalance = await eurt.balanceOf(admin.address);

                await deposit(signers[0], eurt, parseUnits("100", 6));
                expect(Number(await eurt.balanceOf(admin.address))).greaterThan(Number(walletBalance))
                walletBalance = await eurt.balanceOf(admin.address);

                await deposit(signers[0], eurs, parseUnits("100", 2));
                expect(Number(await eurt.balanceOf(admin.address))).greaterThan(Number(walletBalance))
                walletBalance = await eurt.balanceOf(admin.address);

                console.log("Final multisig balance:", walletBalance);

            })
            it("Attemping to withdraw more than allowed causes revert.", async function () {
                let walletBalance = await eurt.balanceOf(admin.address);
                await deposit(signers[1], eurt, parseUnits("100", 6));
                expect(Number(await eurt.balanceOf(admin.address))).greaterThan(Number(walletBalance))
                await expect(ibAlluoEur.connect(signers[1]).withdraw(eurt.address, parseUnits("500", 18))).to.be.revertedWith('ERC20: burn amount exceeds balance')
            })
            describe('EUR Mass deposits and withdrawal test cases', function () {
                it("Multiple deposits and withdrawals: Eventually, all withdrawers should be paid", async function () {
                    let walletBalance = await eurt.balanceOf(admin.address);
                    let userBalanceAtStart = await ageur.balanceOf(signers[0].address);

                    await deposit(signers[0], ageur, parseEther("100"));
                    expect(Number(await eurt.balanceOf(admin.address))).greaterThan(Number(walletBalance))
                    walletBalance = await eurt.balanceOf(admin.address);

                    await deposit(signers[11], eurt, parseUnits("100", 6));
                    expect(Number(await eurt.balanceOf(admin.address))).greaterThan(Number(walletBalance))
                    walletBalance = await eurt.balanceOf(admin.address);

                    await deposit(signers[12], eurs, parseUnits("100", 2));
                    expect(Number(await eurt.balanceOf(admin.address))).greaterThan(Number(walletBalance))
                    walletBalance = await eurt.balanceOf(admin.address);

                    await ibAlluoEur.connect(signers[0]).withdraw(ageur.address, parseEther("50"));
                    let withdrawalArray = await getLastWithdrawalInfo(ibAlluoEur, handler)
                    expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);
                    await ibAlluoEur.connect(signers[11]).withdraw(eurt.address, parseUnits("50", 18));
                    withdrawalArray = await getLastWithdrawalInfo(ibAlluoEur, handler)
                    expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);
                    await ibAlluoEur.connect(signers[12]).withdraw(eurs.address, parseUnits("50", 18));
                    withdrawalArray = await getLastWithdrawalInfo(ibAlluoEur, handler)
                    expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);

                    // When there are deposits, should pay everyone back.
                    await deposit(signers[2], eurs, parseUnits("1000", 2));
                    await handler.satisfyAdapterWithdrawals(ibAlluoEur.address);
                    expect(Number(await eurt.balanceOf(admin.address))).greaterThan(Number(walletBalance))

                    let delta = (await ageur.balanceOf(signers[0].address)).sub(userBalanceAtStart)

                    expect(Number(delta)).lessThan(Number(parseUnits("51", 18)))
                    expect(Number(delta)).greaterThanOrEqual(Number(parseUnits("49", 18)))
                    expect(Number(await eurt.balanceOf(signers[1].address))).lessThan(Number(parseUnits("51", 6)))
                    expect(Number(await eurt.balanceOf(signers[1].address))).greaterThanOrEqual(Number(parseUnits("49", 6)))
                    expect(Number(await eurs.balanceOf(signers[2].address))).lessThan(Number(parseUnits("51", 2)))
                    expect(Number(await eurs.balanceOf(signers[2].address))).greaterThanOrEqual(Number(parseUnits("49", 2)))
                })
            })
        })

        describe("USD Tests", function () {
            it("Depositing 100 DAI and immediately attempting to withdraw 50 should put you in the waiting list", async function () {
                await deposit(signers[0], dai, parseEther("100"));
                await ibAlluoUsd.connect(signers[0]).withdraw(dai.address, parseEther("50"));
                let withdrawalArray = await getLastWithdrawalInfo(ibAlluoUsd, handler)
                expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);
            })
            it("Depositing 100 DAI, attempt to withdraw 50 and then only get paid after there is a deposit", async function () {
                await deposit(signers[0], dai, parseEther("100"));
                await ibAlluoUsd.connect(signers[0]).withdraw(dai.address, parseEther("50"));
                let withdrawalArray = await getLastWithdrawalInfo(ibAlluoUsd, handler)
                expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);

                await deposit(signers[1], dai, parseEther("100"));
                await handler.satisfyAdapterWithdrawals(ibAlluoUsd.address);
                expect(Number(await dai.balanceOf(signers[0].address))).lessThan(Number(parseUnits("51", 18)))
                expect(Number(await dai.balanceOf(signers[0].address))).greaterThan(Number(parseUnits("49", 18)))

            })

            it("Depositing 100 USDC and immediately attempting to withdraw 50 should put you in the waiting list", async function () {
                await deposit(signers[0], usdc, parseUnits("100", 6));
                await ibAlluoUsd.connect(signers[0]).withdraw(usdc.address, parseUnits("100", 18));
                let withdrawalArray = await getLastWithdrawalInfo(ibAlluoUsd, handler)
                expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);
            })

            it("Depositing surplus USDC should not revert (Checking USD Adaptor Deposit function: Check toSend", async function () {
                await deposit(signers[0], usdc, parseUnits("100", 6));
                await deposit(signers[0], usdc, parseUnits("100", 6));
                await deposit(signers[0], usdc, parseUnits("100", 6));
                await deposit(signers[0], usdc, parseUnits("100", 6))
            })

            it("Depositing USDC when there is outstanding withdrawals (leaveInPool>0, toSend =0) should not revert (Checking USD Adaptor Deposit function: Check leaveInPool", async function () {
                await deposit(signers[0], usdc, parseUnits("10000", 6));
                await ibAlluoUsd.connect(signers[0]).withdraw(usdc.address, parseUnits("10000", 18));

                await deposit(signers[0], usdc, parseUnits("100", 6));

            })

            it("Depositing 100 USDC, attempt to withdraw 50 and then only get paid after there is a deposit", async function () {
                await deposit(signers[0], usdc, parseUnits("100", 6));
                await ibAlluoUsd.connect(signers[0]).withdraw(usdc.address, parseUnits("50", 18));
                let withdrawalArray = await getLastWithdrawalInfo(ibAlluoUsd, handler)
                expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);

                await deposit(signers[1], usdc, parseUnits("100", 6));
                await handler.satisfyAdapterWithdrawals(ibAlluoUsd.address);
                expect(Number(await usdc.balanceOf(signers[0].address))).lessThan(Number(parseUnits("51", 6)))
                expect(Number(await usdc.balanceOf(signers[0].address))).greaterThanOrEqual(Number(parseUnits("49", 6)))
            })

            it("Depositing 100 USDT and immediately attempting to withdraw 50 should put you in the waiting list", async function () {
                await deposit(signers[0], usdt, parseUnits("100", 6));
                await ibAlluoUsd.connect(signers[0]).withdraw(usdt.address, parseUnits("50", 18));
                let withdrawalArray = await getLastWithdrawalInfo(ibAlluoUsd, handler)
                expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);
            })
        })
    })

    async function deposit(recipient: SignerWithAddress, token: IERC20, amount: BigNumberish) {

        if (token == eurs) {
            await token.connect(eursWhale).transfer(recipient.address, amount);
            await token.connect(recipient).approve(ibAlluoEur.address, amount);
            await ibAlluoEur.connect(recipient).deposit(token.address, amount);
        } else if (token == eurt) {
            await token.connect(eurtWhale).transfer(recipient.address, amount);
            await token.connect(recipient).approve(ibAlluoEur.address, amount);
            await ibAlluoEur.connect(recipient).deposit(token.address, amount);
        } else if (token == ageur) {
            await token.connect(ageurWhale).transfer(recipient.address, amount);
            await token.connect(recipient).approve(ibAlluoEur.address, amount);
            await ibAlluoEur.connect(recipient).deposit(token.address, amount);
        } else if (token == weth) {
            await weth.connect(wethWhale).transfer(recipient.address, amount);
            await token.connect(recipient).approve(ibAlluoEth.address, amount);
            await ibAlluoEth.connect(recipient).deposit(token.address, amount)
        } else if (token == wbtc) {
            await wbtc.connect(wbtcWhale).transfer(recipient.address, amount);
            await token.connect(recipient).approve(ibAlluoBtc.address, amount);
            await ibAlluoBtc.connect(recipient).deposit(token.address, amount)
        } else {
            await token.connect(usdWhale).transfer(recipient.address, amount);
            await token.connect(recipient).approve(ibAlluoUsd.address, amount);
            await ibAlluoUsd.connect(recipient).deposit(token.address, amount);
        }
    }
})