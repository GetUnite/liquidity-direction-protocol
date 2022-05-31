import { ethers, upgrades } from "hardhat"

async function main() {

  const UsdAdapter = await ethers.getContractFactory("UsdCurveAdapter");
  const EurAdapter = await ethers.getContractFactory("EurCurveAdapter");
  const EthAdapter = await ethers.getContractFactory("EthNoPoolAdapter");

  const gnosis = "0x2580f9954529853Ca5aC5543cE39E9B5B1145135";
  const handler = "handlerAddress";
  const slippage = 200;

  const usdAdapter = await UsdAdapter.deploy(gnosis, handler, slippage)
  console.log("UsdAdapter deployed to:", usdAdapter.address);

  const eurAdapter = await EurAdapter.deploy(gnosis, handler, slippage)
  console.log("EurAdapter deployed to:", eurAdapter.address);

  const ethAdapter = await EthAdapter.deploy(gnosis, handler)
  console.log("EthAdapter deployed to:", ethAdapter.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });