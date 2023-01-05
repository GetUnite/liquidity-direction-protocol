import { ethers, upgrades } from "hardhat"

async function main() {

  let buffer = "0xeDc37a63d74d2AB5C66067f979Cef378b4E3E591"
  let gnosis = "0x466b375cE0D1161aEb3e69f92B2B9c365f7877BE"
  let handler = "0xF877605269bB018c96bD1c93F276F834F45Ccc3f"

  const Adapter = await ethers.getContractFactory("UsdCurveAdapterUpgradeableMumbai");

  let adapter = await upgrades.deployProxy(Adapter,
        [
            gnosis,
            buffer,
            handler,
            200
        ],
        {initializer: 'initialize', kind:'uups'}
  );

  console.log("UsdCurve Adapter upgradable Mock deployed to:", adapter.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });