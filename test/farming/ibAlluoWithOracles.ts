import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers, network, upgrades } from "hardhat";
import { BtcNoPoolAdapterUpgradeable, EthNoPoolAdapterUpgradeable, EurCurveAdapterUpgradeable, IbAlluo, IERC20Metadata, LiquidityHandler, UsdCurveAdapterUpgradeable } from "../../typechain";

describe("IbAlluo With Price Oracles", async () => {
    let signers: SignerWithAddress[];
    let admin: SignerWithAddress;

    let dai: IERC20Metadata, usdc: IERC20Metadata, usdt: IERC20Metadata;
    let curveLpUSD: IERC20Metadata;

    let ibAlluoUSD: IbAlluo;

    let liquidityHandler: LiquidityHandler;

    let btcAdapter: BtcNoPoolAdapterUpgradeable;
    let ethAdapter: EthNoPoolAdapterUpgradeable;
    let eurAdapter: EurCurveAdapterUpgradeable;
    let usdAdapter: UsdCurveAdapterUpgradeable;

    before(async () => {
        console.log("We are forking Polygon mainnet\n");

        dai = await ethers.getContractAt("IERC20Metadata", "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063");
        usdc = await ethers.getContractAt("IERC20Metadata", "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174");
        usdt = await ethers.getContractAt("IERC20Metadata", "0xc2132D05D31c914a87C6611C10748AEb04B58e8F");
        curveLpUSD = await ethers.getContractAt("IERC20Metadata", "0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171");

        signers = await ethers.getSigners();
    })

    beforeEach(async function () {
        //We are forking Polygon mainnet, please set Alchemy key in .env
        await network.provider.request({
            method: "hardhat_reset",
            params: [{
                forking: {
                    enabled: true,
                    jsonRpcUrl: process.env.POLYGON_FORKING_URL as string,
                    //you can fork from last block by commenting next line
                    blockNumber: 37109246,
                },
            },],
        });

        admin = await ethers.getImpersonatedSigner("0x2580f9954529853Ca5aC5543cE39E9B5B1145135");

        const IbAlluo = await ethers.getContractFactory("IbAlluo");
        const LiquidityHandler = await ethers.getContractFactory("LiquidityHandler");
        const OldIbAlluoFactory = await ethers.getContractFactory("IbAlluoWithoutPriceOracles");
        const OldLiquidityHandler = await ethers.getContractFactory("LiquidityHandlerWithoutPriceOracles");

        const BtcNoPoolAdapter = await ethers.getContractFactory("BtcNoPoolAdapterUpgradeable");
        const EthNoPoolAdapter = await ethers.getContractFactory("EthNoPoolAdapterUpgradeable");
        const EurCurveAdapter = await ethers.getContractFactory("EurCurveAdapterUpgradeable");
        const UsdCurveAdapter = await ethers.getContractFactory("UsdCurveAdapterUpgradeable");

        ibAlluoUSD = await ethers.getContractAt("IbAlluo", "0xC2DbaAEA2EfA47EBda3E572aa0e55B742E408BF6");
        liquidityHandler = await ethers.getContractAt("LiquidityHandler", "0x31a3439Ac7E6Ea7e0C0E4b846F45700c6354f8c1");

        await ibAlluoUSD.connect(admin).grantRole(
            await ibAlluoUSD.UPGRADER_ROLE(),
            signers[0].address
        );
        await ibAlluoUSD.connect(admin).changeUpgradeStatus(true);

        await liquidityHandler.connect(admin).grantRole(
            await liquidityHandler.UPGRADER_ROLE(),
            signers[0].address
        );
        await liquidityHandler.connect(admin).changeUpgradeStatus(true);

        await upgrades.forceImport(ibAlluoUSD.address, OldIbAlluoFactory);
        await upgrades.upgradeProxy(ibAlluoUSD.address, IbAlluo);

        await upgrades.forceImport(liquidityHandler.address, OldLiquidityHandler);
        await upgrades.upgradeProxy(liquidityHandler.address, LiquidityHandler);

        btcAdapter = await upgrades.deployProxy(
            BtcNoPoolAdapter,
            [
                admin.address,
                liquidityHandler.address
            ],
            { initializer: "initialize", kind: "uups" }
        ) as BtcNoPoolAdapterUpgradeable;

        ethAdapter = await upgrades.deployProxy(
            EthNoPoolAdapter,
            [
                admin.address,
                liquidityHandler.address
            ],
            { initializer: "initialize", kind: "uups" }
        ) as EthNoPoolAdapterUpgradeable;

        eurAdapter = await upgrades.deployProxy(
            EurCurveAdapter,
            [
                admin.address,
                liquidityHandler.address,
                200
            ],
            { initializer: "initialize", kind: "uups" }
        ) as EurCurveAdapterUpgradeable;

        usdAdapter = await upgrades.deployProxy(
            UsdCurveAdapter,
            [
                admin.address,
                liquidityHandler.address,
                200
            ],
            { initializer: "initialize", kind: "uups" }
        ) as UsdCurveAdapterUpgradeable;
    });

    it("Should allow beforeEach to pass", async () => {

    })
})