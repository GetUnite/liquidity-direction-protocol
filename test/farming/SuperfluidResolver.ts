import { parseEther, parseUnits } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { Address } from "cluster";
import { BigNumber, BigNumberish, BytesLike } from "ethers";
import { ethers, network, upgrades } from "hardhat";
import { IERC20, PseudoMultisigWallet, PseudoMultisigWallet__factory, IbAlluo, IbAlluo__factory, LiquidityHandler, UsdCurveAdapter, LiquidityHandler__factory, UsdCurveAdapter__factory, EurCurveAdapter, EthNoPoolAdapter, EurCurveAdapter__factory, EthNoPoolAdapter__factory, BtcCurveAdapter, ISuperTokenFactory, StIbAlluo, StIbAlluo__factory, SuperfluidResolver } from "../../typechain";

async function skipDays(d: number) {
    ethers.provider.send('evm_increaseTime', [d * 86400]);
    ethers.provider.send('evm_mine', []);
}

function getRandomArbitrary(min: number, max: number) {
    return Math.floor(Math.random() * (max - min) + min);
}

async function getImpersonatedSigner(address: string): Promise<SignerWithAddress> {
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

async function setSuperfluidPermissions(signer: SignerWithAddress, ibAlluoCurrent: IbAlluo) {
    let encodeData = await ibAlluoCurrent.connect(signer).formatPermissions();
    let superhost = await ethers.getContractAt("Superfluid", "0x3E14dC1b13c488a8d5D310918780c983bD5982E7");
    await superhost.connect(signer).callAgreement(
        "0x6EeE6060f715257b970700bc2656De21dEdF074C",
        encodeData,
        "0x"
    )
}
describe("Superfluid resolver with StIbAlluo/IbAlluo", function () {
    let signers: SignerWithAddress[];
    let admin: SignerWithAddress;

    let ibAlluoCurrent: IbAlluo;
    let StIbAlluo: StIbAlluo;
    let ibAlluoCurrent2: IbAlluo;
    let StIbAlluo2: StIbAlluo;

    let usdAdapter: UsdCurveAdapter;

    let multisig: PseudoMultisigWallet;
    let handler: LiquidityHandler;

    let dai: IERC20, usdc: IERC20, usdt: IERC20;
    let curveLpUSD: IERC20;
    let superToken: IERC20;

    let usdWhale: SignerWithAddress;
    let curveUsdLpHolder: SignerWithAddress;

    let exchangeAddress: string;
    let superFactory: ISuperTokenFactory;
    let resolver: SuperfluidResolver;

    before(async function () {
        upgrades.silenceWarnings()

        //We are forking Polygon mainnet, please set Alchemy key in .env
        await network.provider.request({
            method: "hardhat_reset",
            params: [{
                forking: {
                    enabled: true,
                    jsonRpcUrl: process.env.POLYGON_FORKING_URL as string,
                    //you can fork from last block by commenting next line
                    blockNumber: 29518660,
                },
            },],
        });

        signers = await ethers.getSigners();

        admin = await getImpersonatedSigner("0x2580f9954529853Ca5aC5543cE39E9B5B1145135");
        await (await (await ethers.getContractFactory("ForceSender")).deploy({
            value: parseEther("10.0")
        })).forceSend(admin.address);

        usdWhale = await getImpersonatedSigner("0x075e72a5eDf65F0A5f44699c7654C1a76941Ddc8");
        curveUsdLpHolder = await getImpersonatedSigner("0x7117de93b352ae048925323f3fcb1cd4b4d52ec4");

        dai = await ethers.getContractAt("IERC20", "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063");
        usdc = await ethers.getContractAt("IERC20", "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174");
        usdt = await ethers.getContractAt("IERC20", "0xc2132D05D31c914a87C6611C10748AEb04B58e8F");
        curveLpUSD = await ethers.getContractAt("IERC20", "0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171");

        console.log("We are forking Polygon mainnet\n");
        expect(await dai.balanceOf(usdWhale.address)).to.be.gt(0, "Whale has no DAI, or you are not forking Polygon");
        expect(await usdc.balanceOf(usdWhale.address)).to.be.gt(0, "Whale has no USDC, or you are not forking Polygon");
        expect(await usdt.balanceOf(usdWhale.address)).to.be.gt(0, "Whale has no USDT, or you are not forking Polygon");

        await sendEth([usdWhale])
    });

    beforeEach(async function () {

        const IbAlluo = await ethers.getContractFactory("IbAlluo") as IbAlluo__factory;
        //We are using this contract to simulate Gnosis multisig wallet
        const Multisig = await ethers.getContractFactory("PseudoMultisigWallet") as PseudoMultisigWallet__factory;
        multisig = await Multisig.deploy(true);

        exchangeAddress = "0x6b45B9Ab699eFbb130464AcEFC23D49481a05773";

        handler = await ethers.getContractAt("LiquidityHandler", "0x31a3439Ac7E6Ea7e0C0E4b846F45700c6354f8c1");

        await handler.connect(admin).grantRole(await handler.DEFAULT_ADMIN_ROLE(), multisig.address)

        const UsdAdapter = await ethers.getContractFactory("UsdCurveAdapter") as UsdCurveAdapter__factory;

        usdAdapter = await UsdAdapter.deploy(admin.address, handler.address, 200, 100)

        await usdAdapter.connect(admin).adapterApproveAll()

        let lastAdapterId = (await handler.getLastAdapterIndex()).add(1)

        await handler.connect(admin).setAdapter(
            lastAdapterId,
            "USD Curve-Aave",
            500,
            usdAdapter.address,
            true
        )

        ibAlluoCurrent = await upgrades.deployProxy(IbAlluo,
            [
                "Interest Bearing Alluo USD",
                "IbAlluoUSD",
                multisig.address,
                handler.address,
                [dai.address,
                usdc.address,
                usdt.address
                ],
                BigNumber.from("100000000470636740"),
                1600,
                "0x86C80a8aa58e0A4fa09A69624c31Ab2a6CAD56b8",
                exchangeAddress
            ], {
            initializer: 'initialize',
            kind: 'uups',
            unsafeAllow: ["delegatecall"]

        }
        ) as IbAlluo;

        await handler.connect(admin).setIbAlluoToAdapterId(ibAlluoCurrent.address, lastAdapterId)
        await handler.connect(admin).grantRole(await handler.DEFAULT_ADMIN_ROLE(), ibAlluoCurrent.address)


        const StIbAlluoFactory = await ethers.getContractFactory("StIbAlluo") as StIbAlluo__factory;

        StIbAlluo = await upgrades.deployProxy(StIbAlluoFactory,
            [ibAlluoCurrent.address, 18, "Streaming IbAlluo USD", "StIbAlluoUSD", "0x3E14dC1b13c488a8d5D310918780c983bD5982E7", multisig.address, [ibAlluoCurrent.address]
            ], {
            initializer: 'alluoInitialize',
            kind: 'uups',
            unsafeAllow: ["delegatecall"]

        }
        ) as StIbAlluo;

        let ABI = ["function setSuperToken(address _superToken)"];
        let iface = new ethers.utils.Interface(ABI);
        let calldata = iface.encodeFunctionData("setSuperToken", [StIbAlluo.address]);

        await multisig.executeCall(ibAlluoCurrent.address, calldata);


        ibAlluoCurrent2 = await upgrades.deployProxy(IbAlluo,
            [
                "Interest Bearing Alluo USD",
                "IbAlluoUSD",
                multisig.address,
                handler.address,
                [dai.address,
                usdc.address,
                usdt.address
                ],
                BigNumber.from("100000000470636740"),
                1600,
                "0x86C80a8aa58e0A4fa09A69624c31Ab2a6CAD56b8",
                exchangeAddress
            ], {
            initializer: 'initialize',
            kind: 'uups',
            unsafeAllow: ["delegatecall"]

        }
        ) as IbAlluo;

        await handler.connect(admin).setIbAlluoToAdapterId(ibAlluoCurrent2.address, lastAdapterId)
        await handler.connect(admin).grantRole(await handler.DEFAULT_ADMIN_ROLE(), ibAlluoCurrent2.address)

        StIbAlluo2 = await upgrades.deployProxy(StIbAlluoFactory,
            [ibAlluoCurrent2.address, 18, "Streaming IbAlluo USD", "StIbAlluoUSD", "0x3E14dC1b13c488a8d5D310918780c983bD5982E7", multisig.address, [ibAlluoCurrent2.address]
            ], {
            initializer: 'alluoInitialize',
            kind: 'uups',
            unsafeAllow: ["delegatecall"]

        }
        ) as StIbAlluo;

        const SuperfluidResolver = await ethers.getContractFactory("SuperfluidResolver");
        resolver = await SuperfluidResolver.deploy([ibAlluoCurrent.address, ibAlluoCurrent2.address], "0x6EeE6060f715257b970700bc2656De21dEdF074C", signers[0].address);

        ABI = ["function setSuperToken(address _superToken)"];
        iface = new ethers.utils.Interface(ABI);
        calldata = iface.encodeFunctionData("setSuperToken", [StIbAlluo2.address]);
        await multisig.executeCall(ibAlluoCurrent2.address, calldata);


        ABI = ["function setSuperfluidResolver(address _superfluidResolver)"];
        iface = new ethers.utils.Interface(ABI);
        calldata = iface.encodeFunctionData("setSuperfluidResolver", [resolver.address]);
        await multisig.executeCall(ibAlluoCurrent.address, calldata);

        ABI = ["function grantRole(bytes32 role, address account)"];
        iface = new ethers.utils.Interface(ABI);
        calldata = iface.encodeFunctionData("grantRole", ["0x8e81cee32eed7d8f4f15cd1d324edf5fe36cbe57fae18180879d4bdc265ceb30", resolver.address]);
        await multisig.executeCall(ibAlluoCurrent.address, calldata);

        ABI = ["function setSuperfluidResolver(address _superfluidResolver)"];
        iface = new ethers.utils.Interface(ABI);
        calldata = iface.encodeFunctionData("setSuperfluidResolver", [resolver.address]);
        await multisig.executeCall(ibAlluoCurrent2.address, calldata);

        ABI = ["function grantRole(bytes32 role, address account)"];
        iface = new ethers.utils.Interface(ABI);
        calldata = iface.encodeFunctionData("grantRole", ["0x8e81cee32eed7d8f4f15cd1d324edf5fe36cbe57fae18180879d4bdc265ceb30", resolver.address]);
        await multisig.executeCall(ibAlluoCurrent2.address, calldata);
    });

    describe('Test superfluid resolver', function () {

        it("When critical (8 hr or less buffer), checker should return true and liquidateSender should wrap ibAlluos to prevent liquidation.", async function () {
            await deposit(signers[1], dai, parseUnits("10000", 18));
            await setSuperfluidPermissions(signers[1], ibAlluoCurrent);

            console.log(await (await StIbAlluo.realtimeBalanceOfNow(signers[1].address)).availableBalance)
            console.log(await ibAlluoCurrent.balanceOf(signers[1].address))

            await ibAlluoCurrent.connect(signers[1])["createFlow(address,int96,uint256)"](signers[2].address, parseEther("0.1"), parseEther("2000"))
            // await skipDays(0.0625)
            console.log(await (await StIbAlluo.realtimeBalanceOfNow(signers[1].address)).availableBalance)
            console.log(await ibAlluoCurrent.balanceOf(signers[1].address))

            expect((await resolver.checker()).canExec).equal(true);
            await resolver.connect(signers[0]).liquidateSender(signers[1].address, [signers[2].address], ibAlluoCurrent.address)
            console.log((await StIbAlluo.realtimeBalanceOfNow(signers[1].address)).availableBalance)
            console.log(await ibAlluoCurrent.balanceOf(signers[1].address))

        })

        it("When critical (8 hr or less buffer), checker should return true and liquidateSender should pause the stream to prevent liquidation", async function () {
            await deposit(signers[1], dai, parseUnits("2000", 18));
            await setSuperfluidPermissions(signers[1], ibAlluoCurrent);

            console.log(await (await StIbAlluo.realtimeBalanceOfNow(signers[1].address)).availableBalance)
            console.log(await ibAlluoCurrent.balanceOf(signers[1].address))

            await ibAlluoCurrent.connect(signers[1])["createFlow(address,int96,uint256)"](signers[2].address, parseEther("0.1"), parseEther("2000"))
            // await skipDays(0.0625)
            console.log(await (await StIbAlluo.realtimeBalanceOfNow(signers[1].address)).availableBalance)
            console.log(await ibAlluoCurrent.balanceOf(signers[1].address))

            expect((await resolver.checker()).canExec).equal(true);
            await resolver.connect(signers[0]).liquidateSender(signers[1].address, [signers[2].address], ibAlluoCurrent.address)
            console.log((await StIbAlluo.realtimeBalanceOfNow(signers[1].address)).availableBalance)
            console.log(await ibAlluoCurrent.balanceOf(signers[1].address))


        })

        it("Should allow multiple wrapping for a single ibAlluo", async function () {
            for (let i = 3; i < 10; i++) {
                await deposit(signers[i], dai, parseUnits("10000", 18));
                await setSuperfluidPermissions(signers[i], ibAlluoCurrent);
                await ibAlluoCurrent.connect(signers[i])["createFlow(address,int96,uint256)"](signers[2].address, parseEther("0.1"), parseEther("2000"))

            }

            expect((await resolver.checker()).canExec).equal(true);
            for (let i = 3; i < 10; i++) {
                await expect(resolver.connect(signers[0]).liquidateSender(signers[i].address, [signers[2].address], ibAlluoCurrent.address)).to.emit(resolver, "WrappedTokenToPreventLiquidation").withArgs(signers[i].address, signers[2].address)
            }
        })

        it("Should allow multiple liquidations by closing streams for a single ibAlluo", async function () {
            for (let i = 3; i < 10; i++) {
                await deposit(signers[i], dai, parseUnits("5000", 18));
                await setSuperfluidPermissions(signers[i], ibAlluoCurrent);
                await ibAlluoCurrent.connect(signers[i])["createFlow(address,int96,uint256)"](signers[2].address, parseEther("0.1"), parseEther("2000"))
            }
            await skipDays(2)
            expect((await resolver.checker()).canExec).equal(true);
            for (let i = 3; i < 10; i++) {
                await expect(resolver.connect(signers[0]).liquidateSender(signers[i].address, [signers[2].address], ibAlluoCurrent.address)).to.emit(resolver, "ClosedStreamToPreventLiquidation").withArgs(signers[i].address, signers[2].address)
            }
        })

        it("Should allow multiple wrapping for multiple ibAlluos", async function () {
            for (let i = 3; i < 10; i++) {
                await deposit(signers[i], dai, parseUnits("10000", 18));
                await setSuperfluidPermissions(signers[i], ibAlluoCurrent);
                await ibAlluoCurrent.connect(signers[i])["createFlow(address,int96,uint256)"](signers[2].address, parseEther("0.1"), parseEther("2000"))
            }

            for (let i = 3; i < 10; i++) {
                await deposit(signers[i], dai, parseUnits("10000", 18), ibAlluoCurrent2);
                await setSuperfluidPermissions(signers[i], ibAlluoCurrent2);
                await ibAlluoCurrent2.connect(signers[i])["createFlow(address,int96,uint256)"](signers[2].address, parseEther("0.1"), parseEther("2000"))
            }
            expect((await resolver.checker()).canExec).equal(true);
            for (let i = 3; i < 10; i++) {
                await expect(resolver.connect(signers[0]).liquidateSender(signers[i].address, [signers[2].address], ibAlluoCurrent.address)).to.emit(resolver, "WrappedTokenToPreventLiquidation").withArgs(signers[i].address, signers[2].address)
                await expect(resolver.connect(signers[0]).liquidateSender(signers[i].address, [signers[2].address], ibAlluoCurrent2.address)).to.emit(resolver, "WrappedTokenToPreventLiquidation").withArgs(signers[i].address, signers[2].address)
            }
        })

        it("Should allow multiple liquidations by closing streams for multiple ibAlluos", async function () {
            for (let i = 3; i < 10; i++) {
                await deposit(signers[i], dai, parseUnits("5000", 18));
                await setSuperfluidPermissions(signers[i], ibAlluoCurrent);
                await ibAlluoCurrent.connect(signers[i])["createFlow(address,int96,uint256)"](signers[2].address, parseEther("0.1"), parseEther("2000"))
            }
            for (let i = 3; i < 10; i++) {
                await deposit(signers[i], dai, parseUnits("10000", 18), ibAlluoCurrent2);
                await setSuperfluidPermissions(signers[i], ibAlluoCurrent2);
                await ibAlluoCurrent2.connect(signers[i])["createFlow(address,int96,uint256)"](signers[2].address, parseEther("0.1"), parseEther("2000"))
            }

            await skipDays(2)
            expect((await resolver.checker()).canExec).equal(true);
            for (let i = 3; i < 10; i++) {
                await expect(resolver.connect(signers[0]).liquidateSender(signers[i].address, [signers[2].address], ibAlluoCurrent.address)).to.emit(resolver, "ClosedStreamToPreventLiquidation").withArgs(signers[i].address, signers[2].address)
                await expect(resolver.connect(signers[0]).liquidateSender(signers[i].address, [signers[2].address], ibAlluoCurrent2.address)).to.emit(resolver, "ClosedStreamToPreventLiquidation").withArgs(signers[i].address, signers[2].address)
            }
        })

        it("Should allow multiple liquidations by closing streams as well as wrapping tokens for multiple ibAlluos ", async function () {
            for (let i = 3; i < 10; i++) {
                await deposit(signers[i], dai, parseUnits("2000", 18));
                await setSuperfluidPermissions(signers[i], ibAlluoCurrent);
                await ibAlluoCurrent.connect(signers[i])["createFlow(address,int96,uint256)"](signers[2].address, parseEther("0.1"), parseEther("2000"))
            }
            for (let i = 3; i < 10; i++) {
                await deposit(signers[i], dai, parseUnits("10000", 18), ibAlluoCurrent2);
                await setSuperfluidPermissions(signers[i], ibAlluoCurrent2);
                await ibAlluoCurrent2.connect(signers[i])["createFlow(address,int96,uint256)"](signers[2].address, parseEther("0.1"), parseEther("2000"))
            }
            for (let i = 3; i < 10; i++) {
                await expect(resolver.connect(signers[0]).liquidateSender(signers[i].address, [signers[2].address], ibAlluoCurrent2.address)).to.emit(resolver, "WrappedTokenToPreventLiquidation").withArgs(signers[i].address, signers[2].address)
            }
            await skipDays(2)
            expect((await resolver.checker()).canExec).equal(true);
            for (let i = 3; i < 10; i++) {
                await expect(resolver.connect(signers[0]).liquidateSender(signers[i].address, [signers[2].address], ibAlluoCurrent.address)).to.emit(resolver, "ClosedStreamToPreventLiquidation").withArgs(signers[i].address, signers[2].address)
                await expect(resolver.connect(signers[0]).liquidateSender(signers[i].address, [signers[2].address], ibAlluoCurrent2.address)).to.emit(resolver, "ClosedStreamToPreventLiquidation").withArgs(signers[i].address, signers[2].address)
            }
        })
    })

    async function deposit(recipient: SignerWithAddress, token: IERC20, amount: BigNumberish, ibAlluo: IbAlluo = ibAlluoCurrent) {
        await token.connect(usdWhale).transfer(recipient.address, amount);

        await token.connect(recipient).approve(ibAlluo.address, amount);

        await ibAlluo.connect(recipient).deposit(token.address, amount);
    }

});