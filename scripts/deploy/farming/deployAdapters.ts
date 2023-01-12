import { BigNumber } from "ethers";
import { ethers, upgrades } from "hardhat"

async function main() {

  let gnosis = "0x4B948C0354c82f1DC3c510bfa93578540DAb917d";
  let handler = "0xF877605269bB018c96bD1c93F276F834F45Ccc3f";
  let buffer = "0x61791647b8dc56bd481F1CE2c3ce5EE9d5588E9e";
  let exchange = "";

  const UsdAdapter = await ethers.getContractFactory("UsdCurveAdapterUpgradeable")
  const EurAdapter = await ethers.getContractFactory("EurCurveAdapterUpgradeable") 
  const EthAdapter = await ethers.getContractFactory("EthNoPoolAdapterUpgradeable") 
  const BtcAdapter = await ethers.getContractFactory("BtcNoPoolAdapterUpgradeable") 

  let usdAdapter  = await upgrades.deployProxy(UsdAdapter,
    [
        gnosis,
        buffer,
        handler,
        200
    ], {
        initializer: 'initialize',
        kind: 'uups'
    }
  );

  console.log("USDAdapter deployed to:", usdAdapter.address);

  let eurAdapter  = await upgrades.deployProxy(EurAdapter,
    [
        gnosis,
        buffer,
        handler,
        200
    ], {
        initializer: 'initialize',
        kind: 'uups'
    }
  );

  console.log("EURAdapter deployed to:", eurAdapter.address);

  let ethAdapter  = await upgrades.deployProxy(EthAdapter,
    [
        gnosis,
        buffer,
        handler
    ], {
        initializer: 'initialize',
        kind: 'uups'
    }
  );

  console.log("ETHAdapter deployed to:", ethAdapter.address);

  let btcAdapter  = await upgrades.deployProxy(BtcAdapter,
    [
        gnosis,
        buffer,
        handler
    ], {
        initializer: 'initialize',
        kind: 'uups'
    }
  );

  console.log("BTCAdapter deployed to:", btcAdapter.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });