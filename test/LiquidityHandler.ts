import { parseEther, parseUnits } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, BigNumberish, BytesLike } from "ethers";
import { ethers, network, upgrades } from "hardhat";
import { before } from "mocha";
import { IERC20, PseudoMultisigWallet, PseudoMultisigWallet__factory, IbAlluo, IbAlluo__factory, LiquidityHandler, UsdCurveAdapter, LiquidityHandler__factory, UsdCurveAdapter__factory, EurCurveAdapter, EthNoPoolAdapter, EurCurveAdapter__factory, EthNoPoolAdapter__factory } from "../typechain";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
async function skipDays(d: number) {
    ethers.provider.send('evm_increaseTime', [d * 86400]);
    ethers.provider.send('evm_mine', []);
}

function getRandomArbitrary(min: number, max: number) {
    return Math.floor(Math.random() * (max - min) + min);
}

async function prepareCallData(type: string, parameters: any[]): Promise<BytesLike> {
    if (type == "status") {
        let ABI = ["function changeUpgradeStatus(bool _status)"];
        let iface = new ethers.utils.Interface(ABI);
        let calldata = iface.encodeFunctionData("changeUpgradeStatus", [parameters[0]]);
        return calldata;
    }
    else if (type == "role") {
        let ABI = ["function grantRole(bytes32 role, address account)"];
        let iface = new ethers.utils.Interface(ABI);
        let calldata = iface.encodeFunctionData("grantRole", [parameters[0], parameters[1]]);
        return calldata;
    }
    else {
        return ethers.utils.randomBytes(0);
    }
}


async function getImpersonatedSigner(address: string): Promise<SignerWithAddress> {
    await ethers.provider.send(
        'hardhat_impersonateAccount',
        [address]
    );

    return await ethers.getSigner(address);
}

async function sendEth(addresses: string[]) {
    let signers = await ethers.getSigners();

    for (let i = 0; i < addresses.length; i++) {
        await signers[0].sendTransaction({
            to: addresses[i],
            value: parseEther("3.0")
        });
    }
}

describe("IbAlluo and handler", function () {
    let signers: SignerWithAddress[];
    let admin: SignerWithAddress;

    let ibAlluoUsd: IbAlluo;
    let ibAlluoEur: IbAlluo;
    let ibAlluoEth: IbAlluo;

    let usdAdapter: UsdCurveAdapter;
    let eurAdapter: EurCurveAdapter;
    let ethAdapter: EthNoPoolAdapter;

    let multisig: PseudoMultisigWallet;
    let handler: LiquidityHandler;

    let dai: IERC20, usdc: IERC20, usdt: IERC20;
    let curveLpUSD: IERC20;

    let usdWhale: SignerWithAddress;
    let curveUsdLpHolder: SignerWithAddress;

    let jeur: IERC20, eurt: IERC20, eurs: IERC20;
    let curveLpEUR: IERC20;

    let jeurWhale: SignerWithAddress;
    let eurtWhale: SignerWithAddress;
    let eursWhale: SignerWithAddress;

    let weth: IERC20;

    let wethWhale: SignerWithAddress;
    before(async function () {
        //We are forking Polygon mainnet, please set Alchemy key in .env
        await network.provider.request({
            method: "hardhat_reset",
            params: [{
                forking: {
                    enabled: true,
                    jsonRpcUrl: process.env.POLYGON_FORKING_URL as string,
                    //you can fork from last block by commenting next line
                    blockNumber: 28729129,
                },
            },],
        });

        signers = await ethers.getSigners();

        admin = await getImpersonatedSigner("0x2580f9954529853Ca5aC5543cE39E9B5B1145135");
        await (await (await ethers.getContractFactory("ForceSender")).deploy({ value: parseEther("10.0") })).forceSend(admin.address);

        usdWhale = await getImpersonatedSigner("0x075e72a5eDf65F0A5f44699c7654C1a76941Ddc8");
        curveUsdLpHolder = await getImpersonatedSigner("0x7117de93b352ae048925323f3fcb1cd4b4d52ec4");

        jeurWhale = await getImpersonatedSigner("0x00d7c133b923548f29cc2cc01ecb1ea2acdf2d4c");
        eurtWhale = await getImpersonatedSigner("0x1a4b038c31a8e5f98b00016b1005751296adc9a4");
        eursWhale = await getImpersonatedSigner("0x6de2865067b65d4571c17f6b9eeb8dbdd5e36584");

        wethWhale = await getImpersonatedSigner("0x72a53cdbbcc1b9efa39c834a540550e23463aacb");

        dai = await ethers.getContractAt("IERC20", "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063");
        usdc = await ethers.getContractAt("IERC20", "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174");
        usdt = await ethers.getContractAt("IERC20", "0xc2132D05D31c914a87C6611C10748AEb04B58e8F");
        curveLpUSD = await ethers.getContractAt("IERC20", "0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171");

        jeur = await ethers.getContractAt("IERC20", "0x4e3Decbb3645551B8A19f0eA1678079FCB33fB4c");
        eurt = await ethers.getContractAt("IERC20", "0x7BDF330f423Ea880FF95fC41A280fD5eCFD3D09f");
        eurs = await ethers.getContractAt("IERC20", "0xE111178A87A3BFf0c8d18DECBa5798827539Ae99");

        weth = await ethers.getContractAt("IERC20", "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619");

        console.log("We are forking Polygon mainnet\n");
        expect(await dai.balanceOf(usdWhale.address)).to.be.gt(0, "Whale has no DAI, or you are not forking Polygon");
        expect(await usdc.balanceOf(usdWhale.address)).to.be.gt(0, "Whale has no USDC, or you are not forking Polygon");
        expect(await usdt.balanceOf(usdWhale.address)).to.be.gt(0, "Whale has no USDT, or you are not forking Polygon");
        expect(await jeur.balanceOf(jeurWhale.address)).to.be.gt(0, "Whale has no jeur, or you are not forking Polygon");
        expect(await eurt.balanceOf(eurtWhale.address)).to.be.gt(0, "Whale has no eurt, or you are not forking Polygon");
        expect(await eurs.balanceOf(eursWhale.address)).to.be.gt(0, "Whale has no eurs, or you are not forking Polygon");
        expect(await weth.balanceOf(wethWhale.address)).to.be.gt(0, "Whale has no weth, or you are not forking Polygon");

        await sendEth([usdWhale.address, jeurWhale.address, eurtWhale.address, eursWhale.address, wethWhale.address])
    });


    beforeEach(async function () {
        const exchangeAddress = ZERO_ADDRESS; // Temp for polygon
        const IbAlluo = await ethers.getContractFactory("IbAlluo") as IbAlluo__factory;
        //We are using this contract to simulate Gnosis multisig wallet
        const Multisig = await ethers.getContractFactory("PseudoMultisigWallet") as PseudoMultisigWallet__factory;
        multisig = await Multisig.deploy(true);

        const Handler = await ethers.getContractFactory("LiquidityHandler") as LiquidityHandler__factory;
        // Temp values for exchange stuff.
        handler = await upgrades.deployProxy(Handler,
            [admin.address, exchangeAddress, 0],
            { initializer: 'initialize', kind: 'uups' }
        ) as LiquidityHandler;

        await handler.connect(admin).grantRole(await handler.DEFAULT_ADMIN_ROLE(), admin.address)

        const UsdAdapter = await ethers.getContractFactory("UsdCurveAdapter") as UsdCurveAdapter__factory;
        const EurAdapter = await ethers.getContractFactory("EurCurveAdapter") as EurCurveAdapter__factory;
        const EthAdapter = await ethers.getContractFactory("EthNoPoolAdapter") as EthNoPoolAdapter__factory;

        eurAdapter = await EurAdapter.deploy(admin.address, handler.address, 200);
        usdAdapter = await UsdAdapter.deploy(admin.address, handler.address, 200);
        ethAdapter = await EthAdapter.deploy(admin.address, handler.address);

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


        ibAlluoUsd = await upgrades.deployProxy(IbAlluo,
            [
                "Interest Bearing Alluo USD",
                "ibAlluoUsd",
                admin.address,
                handler.address,
                [dai.address,
                usdc.address,
                usdt.address],
                BigNumber.from("100000000470636740"),
                1600,
                "0x86C80a8aa58e0A4fa09A69624c31Ab2a6CAD56b8",
                exchangeAddress
            ],
            { initializer: 'initialize', kind: 'uups' }
        ) as IbAlluo;

        await handler.connect(admin).grantIbAlluoPermissions(ibAlluoUsd.address)
        await handler.connect(admin).setIbAlluoToAdapterId(ibAlluoUsd.address, 1)



        ibAlluoEur = await upgrades.deployProxy(IbAlluo,
            [
                "Interest Bearing Alluo EUR",
                "ibAlluoEur",
                admin.address,
                handler.address,
                [jeur.address,
                eurt.address,
                eurs.address],
                BigNumber.from("100000000470636740"),
                1600,
                "0x86C80a8aa58e0A4fa09A69624c31Ab2a6CAD56b8",
                exchangeAddress],
            { initializer: 'initialize', kind: 'uups' }
        ) as IbAlluo;

        await handler.connect(admin).grantIbAlluoPermissions(ibAlluoEur.address)
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
                "0x86C80a8aa58e0A4fa09A69624c31Ab2a6CAD56b8",
                exchangeAddress
            ],
            { initializer: 'initialize', kind: 'uups' }
        ) as IbAlluo;


        await handler.connect(admin).grantIbAlluoPermissions(ibAlluoEth.address)
        await handler.connect(admin).setIbAlluoToAdapterId(ibAlluoEth.address, 3)

    });

    describe("EThAdapter no pool: Test cases", function () {
        it("Depositing 100 weth and immediately attempting to withdraw 50 should put you in the waiting list", async function () {
            await deposit(signers[0], weth, parseEther("100"));
            await ibAlluoEth.connect(signers[0]).withdraw(weth.address, parseEther("50"));
            let withdrawalArray = await handler.ibAlluoLastWithdrawalCheck(ibAlluoEth.address)
            expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);
        })
        it("Depositing 100 weth, attempt to withdraw 50 and then only get paid after there is a deposit", async function () {
            await deposit(signers[0], weth, parseEther("100"));
            await ibAlluoEth.connect(signers[0]).withdraw(weth.address, parseEther("50"));
            let withdrawalArray = await handler.ibAlluoLastWithdrawalCheck(ibAlluoEth.address)
            expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);

            await deposit(signers[1], weth, parseEther("100"));
            await handler.satisfyAdapterWithdrawals(ibAlluoEth.address);
            expect(Number(await weth.balanceOf(signers[0].address))).greaterThanOrEqual(Number(parseUnits("49", 18)))
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

            console.log("Final multisig balance:", walletBalance);

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
            let withdrawalArray = await handler.ibAlluoLastWithdrawalCheck(ibAlluoEth.address)
            expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);

            await ibAlluoEth.connect(signers[1]).withdraw(weth.address, parseEther("35"));
            withdrawalArray = await handler.ibAlluoLastWithdrawalCheck(ibAlluoEth.address)
            expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);

            await ibAlluoEth.connect(signers[2]).withdraw(weth.address, parseEther("180"));
            withdrawalArray = await handler.ibAlluoLastWithdrawalCheck(ibAlluoEth.address)
            expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);

            // When there are deposits, should pay everyone back.
            await deposit(signers[2], weth, parseUnits("1000", 18));
            await handler.satisfyAdapterWithdrawals(ibAlluoEth.address);
            expect(Number(await weth.balanceOf(admin.address))).greaterThan(Number(walletBalance))

            expect(Number(await weth.balanceOf(signers[0].address))).greaterThanOrEqual(Number(parseUnits("49", 18)))
            expect(Number(await weth.balanceOf(signers[1].address))).greaterThanOrEqual(Number(parseUnits("34", 18)))
            expect(Number(await weth.balanceOf(signers[2].address))).greaterThanOrEqual(Number(parseUnits("179", 18)))



        })



    })


    describe('EUR Adaptor with IbAlluoV2: Test cases', function () {
        it("Depositing 100 jeur and immediately attempting to withdraw 50 should put you in the waiting list", async function () {
            await deposit(signers[0], jeur, parseEther("100"));
            await ibAlluoEur.connect(signers[0]).withdraw(jeur.address, parseEther("50"));
            let withdrawalArray = await handler.ibAlluoLastWithdrawalCheck(ibAlluoEur.address)
            expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);
        })
        it("Depositing 100 jeur, attempt to withdraw 50 and then only get paid after there is a deposit", async function () {
            await deposit(signers[0], jeur, parseEther("100"));
            await ibAlluoEur.connect(signers[0]).withdraw(jeur.address, parseEther("50"));
            let withdrawalArray = await handler.ibAlluoLastWithdrawalCheck(ibAlluoEur.address)
            expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);

            await deposit(signers[1], jeur, parseEther("100"));
            await handler.satisfyAdapterWithdrawals(ibAlluoEur.address);
            // Loss from slippage makes tests awkward.

            expect(Number(await jeur.balanceOf(signers[0].address))).greaterThanOrEqual(Number(parseUnits("49", 18)))
        })

        it("Depositing 100 eurt and immediately attempting to withdraw 50 should put you in the waiting list", async function () {
            await deposit(signers[0], eurt, parseUnits("100", 6));
            await ibAlluoEur.connect(signers[0]).withdraw(eurt.address, parseUnits("100", 18));
            let withdrawalArray = await handler.ibAlluoLastWithdrawalCheck(ibAlluoEur.address)
            expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);
        })
        it("Depositing 100 eurt, attempt to withdraw 50 and then only get paid after there is a deposit", async function () {
            await deposit(signers[0], eurt, parseUnits("100", 6));
            await ibAlluoEur.connect(signers[0]).withdraw(eurt.address, parseUnits("50", 18));
            let withdrawalArray = await handler.ibAlluoLastWithdrawalCheck(ibAlluoEur.address)
            expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);

            await deposit(signers[1], eurt, parseUnits("100", 6));
            await handler.satisfyAdapterWithdrawals(ibAlluoEur.address);
            expect(Number(await eurt.balanceOf(signers[0].address))).greaterThanOrEqual(Number(parseUnits("49", 6)))
        })

        it("Depositing 100 eurs and immediately attempting to withdraw 50 should put you in the waiting list", async function () {
            await deposit(signers[0], eurs, parseUnits("100", 2));
            await ibAlluoEur.connect(signers[0]).withdraw(eurs.address, parseUnits("50", 18));
            let withdrawalArray = await handler.ibAlluoLastWithdrawalCheck(ibAlluoEur.address)
            expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);
        })
        it("Depositing 100 eurs, attempt to withdraw 50 and then only get paid after there is a deposit", async function () {
            await deposit(signers[0], eurs, parseUnits("100", 2));
            await ibAlluoEur.connect(signers[0]).withdraw(eurs.address, parseUnits("50", 18));
            let withdrawalArray = await handler.ibAlluoLastWithdrawalCheck(ibAlluoEur.address)
            expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);

            await deposit(signers[1], eurs, parseUnits("100", 2));
            await handler.satisfyAdapterWithdrawals(ibAlluoEur.address);
            expect(Number(await eurs.balanceOf(signers[0].address))).greaterThanOrEqual(Number(parseUnits("49", 2)))
        })

        it("The balance of the multisig wallet should increase with deposits.", async function () {
            let walletBalance = await eurt.balanceOf(admin.address);

            await deposit(signers[0], jeur, parseEther("100"));
            expect(Number(await eurt.balanceOf(admin.address))).greaterThan(Number(walletBalance))
            walletBalance = await eurt.balanceOf(admin.address);


            await deposit(signers[0], eurt, parseUnits("100", 6));
            expect(Number(await eurt.balanceOf(admin.address))).greaterThan(Number(walletBalance))
            walletBalance = await eurt.balanceOf(admin.address);

            await deposit(signers[0], eurs, parseUnits("100", 2));
            expect(Number(await eurt.balanceOf(admin.address))).greaterThan(Number(walletBalance))
            walletBalance = await eurt.balanceOf(admin.address);

            await deposit(signers[0], jeur, parseEther("100"));
            expect(Number(await eurt.balanceOf(admin.address))).greaterThan(Number(walletBalance))
            walletBalance = await eurt.balanceOf(admin.address);


            await deposit(signers[0], eurt, parseUnits("100", 6));
            expect(Number(await eurt.balanceOf(admin.address))).greaterThan(Number(walletBalance))
            walletBalance = await eurt.balanceOf(admin.address);

            await deposit(signers[0], eurs, parseUnits("100", 2));
            expect(Number(await eurt.balanceOf(admin.address))).greaterThan(Number(walletBalance))
            walletBalance = await eurt.balanceOf(admin.address);

            await deposit(signers[0], jeur, parseEther("100"));
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

                await deposit(signers[0], jeur, parseEther("100"));
                expect(Number(await eurt.balanceOf(admin.address))).greaterThan(Number(walletBalance))
                walletBalance = await eurt.balanceOf(admin.address);


                await deposit(signers[1], eurt, parseUnits("100", 6));
                expect(Number(await eurt.balanceOf(admin.address))).greaterThan(Number(walletBalance))
                walletBalance = await eurt.balanceOf(admin.address);

                await deposit(signers[2], eurs, parseUnits("100", 2));
                expect(Number(await eurt.balanceOf(admin.address))).greaterThan(Number(walletBalance))
                walletBalance = await eurt.balanceOf(admin.address);

                await ibAlluoEur.connect(signers[0]).withdraw(jeur.address, parseEther("50"));
                let withdrawalArray = await handler.ibAlluoLastWithdrawalCheck(ibAlluoEur.address)
                expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);
                await ibAlluoEur.connect(signers[1]).withdraw(eurt.address, parseUnits("50", 18));
                withdrawalArray = await handler.ibAlluoLastWithdrawalCheck(ibAlluoEur.address)
                expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);
                await ibAlluoEur.connect(signers[2]).withdraw(eurs.address, parseUnits("50", 18));
                withdrawalArray = await handler.ibAlluoLastWithdrawalCheck(ibAlluoEur.address)
                expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);

                // When there are deposits, should pay everyone back.
                await deposit(signers[2], eurs, parseUnits("1000", 2));
                await handler.satisfyAdapterWithdrawals(ibAlluoEur.address);
                expect(Number(await eurt.balanceOf(admin.address))).greaterThan(Number(walletBalance))

                expect(Number(await jeur.balanceOf(signers[0].address))).greaterThanOrEqual(Number(parseUnits("49", 18)))
                expect(Number(await eurt.balanceOf(signers[1].address))).greaterThanOrEqual(Number(parseUnits("49", 6)))
                expect(Number(await eurs.balanceOf(signers[2].address))).greaterThanOrEqual(Number(parseUnits("49", 2)))



            })

        })


        describe("USD Tests", function () {
            it("Depositing 100 DAI and immediately attempting to withdraw 50 should put you in the waiting list", async function () {
                await deposit(signers[0], dai, parseEther("100"));
                await ibAlluoUsd.connect(signers[0]).withdraw(dai.address, parseEther("50"));
                let withdrawalArray = await handler.ibAlluoLastWithdrawalCheck(ibAlluoUsd.address)
                expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);
            })
            it("Depositing 100 DAI, attempt to withdraw 50 and then only get paid after there is a deposit", async function () {
                await deposit(signers[0], dai, parseEther("100"));
                await ibAlluoUsd.connect(signers[0]).withdraw(dai.address, parseEther("50"));
                let withdrawalArray = await handler.ibAlluoLastWithdrawalCheck(ibAlluoUsd.address)
                expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);

                await deposit(signers[1], dai, parseEther("100"));
                await handler.satisfyAdapterWithdrawals(ibAlluoUsd.address);
                expect(await dai.balanceOf(signers[0].address)).equal(parseEther("50"))
            })

            it("Depositing 100 USDC and immediately attempting to withdraw 50 should put you in the waiting list", async function () {
                await deposit(signers[0], usdc, parseUnits("100", 6));
                await ibAlluoUsd.connect(signers[0]).withdraw(usdc.address, parseUnits("100", 18));
                let withdrawalArray = await handler.ibAlluoLastWithdrawalCheck(ibAlluoUsd.address)
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
                let withdrawalArray = await handler.ibAlluoLastWithdrawalCheck(ibAlluoUsd.address)
                expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);

                await deposit(signers[1], usdc, parseUnits("100", 6));
                await handler.satisfyAdapterWithdrawals(ibAlluoUsd.address);
                expect(Number(await usdc.balanceOf(signers[0].address))).greaterThanOrEqual(Number(parseUnits("49", 6)))
            })

            it("Depositing 100 USDT and immediately attempting to withdraw 50 should put you in the waiting list", async function () {
                await deposit(signers[0], usdt, parseUnits("100", 6));
                await ibAlluoUsd.connect(signers[0]).withdraw(usdt.address, parseUnits("50", 18));
                let withdrawalArray = await handler.ibAlluoLastWithdrawalCheck(ibAlluoUsd.address)
                expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);
            })
            it("Depositing 100 USDT, attempt to withdraw 50 and then only get paid after there is a deposit", async function () {
                await deposit(signers[0], usdt, parseUnits("100", 6));
                await ibAlluoUsd.connect(signers[0]).withdraw(usdt.address, parseUnits("50", 18));
                let withdrawalArray = await handler.ibAlluoLastWithdrawalCheck(ibAlluoUsd.address)
                expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);

                await deposit(signers[1], usdt, parseUnits("100", 6));
                await handler.satisfyAdapterWithdrawals(ibAlluoUsd.address);

                expect(Number(await usdt.balanceOf(signers[0].address))).greaterThanOrEqual(Number(parseUnits("49", 6)))
            })

            it("The balance of the multisig wallet should increase with deposits.", async function () {
                let walletBalance = await usdc.balanceOf(admin.address);

                await deposit(signers[0], dai, parseEther("100"));
                expect(Number(await usdc.balanceOf(admin.address))).greaterThan(Number(walletBalance))
                walletBalance = await usdc.balanceOf(admin.address);


                await deposit(signers[0], usdc, parseUnits("100", 6));
                expect(Number(await usdc.balanceOf(admin.address))).greaterThan(Number(walletBalance))
                walletBalance = await usdc.balanceOf(admin.address);

                await deposit(signers[0], usdt, parseUnits("100", 6));
                expect(Number(await usdc.balanceOf(admin.address))).greaterThan(Number(walletBalance))
                walletBalance = await usdc.balanceOf(admin.address);

                await deposit(signers[0], dai, parseEther("100"));
                expect(Number(await usdc.balanceOf(admin.address))).greaterThan(Number(walletBalance))
                walletBalance = await usdc.balanceOf(admin.address);


                await deposit(signers[0], usdc, parseUnits("100", 6));
                expect(Number(await usdc.balanceOf(admin.address))).greaterThan(Number(walletBalance))
                walletBalance = await usdc.balanceOf(admin.address);

                await deposit(signers[0], usdt, parseUnits("100", 6));
                expect(Number(await usdc.balanceOf(admin.address))).greaterThan(Number(walletBalance))
                walletBalance = await usdc.balanceOf(admin.address);

                await deposit(signers[0], dai, parseEther("100"));
                expect(Number(await usdc.balanceOf(admin.address))).greaterThan(Number(walletBalance))
                walletBalance = await usdc.balanceOf(admin.address);


                await deposit(signers[0], usdc, parseUnits("100", 6));
                expect(Number(await usdc.balanceOf(admin.address))).greaterThan(Number(walletBalance))
                walletBalance = await usdc.balanceOf(admin.address);

                await deposit(signers[0], usdt, parseUnits("100", 6));
                expect(Number(await usdc.balanceOf(admin.address))).greaterThan(Number(walletBalance))
                walletBalance = await usdc.balanceOf(admin.address);

                console.log("Final multisig balance:", walletBalance);

            })
            it("Attemping to withdraw more than allowed causes revert.", async function () {
                let walletBalance = await usdc.balanceOf(admin.address);
                await deposit(signers[1], usdc, parseUnits("100", 6));
                expect(Number(await usdc.balanceOf(admin.address))).greaterThan(Number(walletBalance))
                await expect(ibAlluoUsd.connect(signers[1]).withdraw(usdc.address, parseUnits("500", 18))).to.be.revertedWith('ERC20: burn amount exceeds balance')
            })


        })


        describe('Mass deposits and withdrawal test cases', function () {
            it("Multiple deposits and withdrawals: Eventually, all withdrawers should be paid", async function () {
                let walletBalance = await usdc.balanceOf(admin.address);

                await deposit(signers[0], dai, parseEther("100"));
                expect(Number(await usdc.balanceOf(admin.address))).greaterThan(Number(walletBalance))
                walletBalance = await usdc.balanceOf(admin.address);


                await deposit(signers[1], usdc, parseUnits("100", 6));
                expect(Number(await usdc.balanceOf(admin.address))).greaterThan(Number(walletBalance))
                walletBalance = await usdc.balanceOf(admin.address);


                await deposit(signers[2], usdt, parseUnits("100", 6));
                expect(Number(await usdc.balanceOf(admin.address))).greaterThan(Number(walletBalance))
                walletBalance = await usdc.balanceOf(admin.address);


                await ibAlluoUsd.connect(signers[0]).withdraw(dai.address, parseEther("50"));
                let withdrawalArray = await handler.ibAlluoLastWithdrawalCheck(ibAlluoUsd.address)
                expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);

                await ibAlluoUsd.connect(signers[1]).withdraw(usdc.address, parseUnits("50", 18));
                withdrawalArray = await handler.ibAlluoLastWithdrawalCheck(ibAlluoUsd.address)
                expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);



                await ibAlluoUsd.connect(signers[2]).withdraw(usdt.address, parseUnits("50", 18));
                withdrawalArray = await handler.ibAlluoLastWithdrawalCheck(ibAlluoUsd.address)
                expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);


                // When there are deposits, should pay everyone back.
                await deposit(signers[2], usdt, parseUnits("1000", 6));
                await handler.satisfyAdapterWithdrawals(ibAlluoUsd.address);


                expect(Number(await dai.balanceOf(signers[0].address))).greaterThanOrEqual(Number(parseUnits("49", 18)))
                expect(Number(await usdc.balanceOf(signers[1].address))).greaterThanOrEqual(Number(parseUnits("49", 6)))
                expect(Number(await usdt.balanceOf(signers[2].address))).greaterThanOrEqual(Number(parseUnits("49", 6)))



            })
        })

    })
    // async function sendFundsToMultiSig(token: TestERC20, amount:BigNumberish) {
    //     let ABI = ["function sendFundsToMultiSig(address _token, uint256 _amount)"];
    //     let iface = new ethers.utils.Interface(ABI);
    //     let calldata = iface.encodeFunctionData("sendFundsToMultiSig", [token.address, amount]);
    //     await multisig.executeCall(handler.address, calldata);
    // }

    async function deposit(recipient: SignerWithAddress, token: IERC20, amount: BigNumberish) {

        if (token == eurs) {
            await token.connect(eursWhale).transfer(recipient.address, amount);
            await token.connect(recipient).approve(ibAlluoEur.address, amount);
            await ibAlluoEur.connect(recipient).deposit(token.address, amount);
        }
        else if (token == eurt) {
            await token.connect(eurtWhale).transfer(recipient.address, amount);
            await token.connect(recipient).approve(ibAlluoEur.address, amount);
            await ibAlluoEur.connect(recipient).deposit(token.address, amount);
        }

        else if (token == jeur) {
            await token.connect(jeurWhale).transfer(recipient.address, amount);
            await token.connect(recipient).approve(ibAlluoEur.address, amount);
            await ibAlluoEur.connect(recipient).deposit(token.address, amount);
        }

        else if (token == weth) {
            await weth.connect(wethWhale).transfer(recipient.address, amount);
            await token.connect(recipient).approve(ibAlluoEth.address, amount);
            await ibAlluoEth.connect(recipient).deposit(token.address, amount)
        }

        else {
            await token.connect(usdWhale).transfer(recipient.address, amount);
            await token.connect(recipient).approve(ibAlluoUsd.address, amount);
            await ibAlluoUsd.connect(recipient).deposit(token.address, amount);
        }
    }

});