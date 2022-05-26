import { ethers, upgrades } from "hardhat"

async function main() {

  const Adapter = await ethers.getContractFactory("UsdCurveAdapterMumbai");
  const handler = "0xF877605269bB018c96bD1c93F276F834F45Ccc3f";
  const pool = "0x754E1c29e1C0109E7a5034Ca6F54aFbE52C3D1bA";

  let adapter = await upgrades.deployProxy(Adapter,
        [handler, pool],
        {initializer: 'initialize', kind:'uups'}
  );

  console.log("Adapter upgradable deployed to:", adapter.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });