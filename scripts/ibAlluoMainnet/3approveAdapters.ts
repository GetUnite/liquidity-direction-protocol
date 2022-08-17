import { ethers, upgrades } from "hardhat"
import { BtcNoPoolAdapterMainnet, BtcNoPoolAdapterMainnet__factory, EthNoPoolAdapterMainnet, EthNoPoolAdapterMainnet__factory, EurCurveAdapterMainnet, EurCurveAdapterMainnet__factory, UsdCurveAdapterMainnet, UsdCurveAdapterMainnet__factory } from "../../typechain";

async function main() {

    let usdAdapter = await ethers.getContractAt("UsdCurveAdapterMainnet", "");
    let eurAdapter = await ethers.getContractAt("EurCurveAdapterMainnet", "");

    await usdAdapter.adapterApproveAll()
    await eurAdapter.adapterApproveAll()
    console.log("done");

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
