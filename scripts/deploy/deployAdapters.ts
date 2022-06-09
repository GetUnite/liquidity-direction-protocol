import { ethers, upgrades } from "hardhat"

async function main() {

  const UsdAdapter = await ethers.getContractFactory("UsdCurveAdapter");
  const EurAdapter = await ethers.getContractFactory("EurCurveAdapter");

  const gnosis = "0x2580f9954529853Ca5aC5543cE39E9B5B1145135";
  const handler = "0x31a3439Ac7E6Ea7e0C0E4b846F45700c6354f8c1";
  const slippage = 200;

  const usdAdapter = await UsdAdapter.deploy(gnosis, handler, slippage)
  console.log("UsdAdapter deployed to:", usdAdapter.address);

  const eurAdapter = await EurAdapter.deploy(gnosis, handler, slippage)
  console.log("EurAdapter deployed to:", eurAdapter.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

//npx hardhat run scripts/deploy/deployAdapters.ts --network polygon
//npx hardhat verify 0x6074007EC98EbeB99dF494D0855c7885A4810586 "0x2580f9954529853Ca5aC5543cE39E9B5B1145135" "0x31a3439Ac7E6Ea7e0C0E4b846F45700c6354f8c1" 200 --network polygon
//npx hardhat verify 0xccA0f9d479f02E44a32cd2263997dD0192c5eEAc "0x2580f9954529853Ca5aC5543cE39E9B5B1145135" "0x31a3439Ac7E6Ea7e0C0E4b846F45700c6354f8c1" 200 --network polygon