import { ethers, upgrades } from "hardhat"
import { BtcNoPoolAdapterMainnet, BtcNoPoolAdapterMainnet__factory, EthNoPoolAdapterMainnet, EthNoPoolAdapterMainnet__factory, EurCurveAdapterMainnet, EurCurveAdapterMainnet__factory, UsdCurveAdapterMainnet, UsdCurveAdapterMainnet__factory } from "../../typechain-types";

async function main() {

    const gnosis = "0x1F020A4943EB57cd3b2213A66b355CB662Ea43C3"
    const handler = ""

    const UsdAdapter = await ethers.getContractFactory("UsdCurveAdapterMainnet") as UsdCurveAdapterMainnet__factory;
    const EurAdapter = await ethers.getContractFactory("EurCurveAdapterMainnet") as EurCurveAdapterMainnet__factory;
    const EthAdapter = await ethers.getContractFactory("EthNoPoolAdapterMainnet") as EthNoPoolAdapterMainnet__factory;
    const BtcAdapter = await ethers.getContractFactory("BtcNoPoolAdapterMainnet") as BtcNoPoolAdapterMainnet__factory;

    let usdAdapter = await upgrades.deployProxy(UsdAdapter,
        [
            gnosis,
            handler,
            200
        ], {
        initializer: 'initialize',
        kind: 'uups'
    }
    ) as UsdCurveAdapterMainnet;
    console.log("Usd adapter deployed to:", usdAdapter.address);


    let eurAdapter = await upgrades.deployProxy(EurAdapter,
        [
            gnosis,
            handler,
            200
        ], {
        initializer: 'initialize',
        kind: 'uups'
    }
    ) as EurCurveAdapterMainnet;
    console.log("Eur adapter deployed to:", eurAdapter.address);


    let ethAdapter = await upgrades.deployProxy(EthAdapter,
        [
            gnosis,
            handler
        ], {
        initializer: 'initialize',
        kind: 'uups'
    }
    ) as EthNoPoolAdapterMainnet;
    console.log("Eth adapter deployed to:", ethAdapter.address);


    let btcAdapter = await upgrades.deployProxy(BtcAdapter,
        [
            gnosis,
            handler
        ], {
        initializer: 'initialize',
        kind: 'uups'
    }
    ) as BtcNoPoolAdapterMainnet;
    console.log("Btc adapter deployed to:", btcAdapter.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
