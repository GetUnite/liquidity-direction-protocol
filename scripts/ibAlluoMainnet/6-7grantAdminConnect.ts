import { ethers, upgrades } from "hardhat"
import { BtcNoPoolAdapterMainnet, BtcNoPoolAdapterMainnet__factory, EthNoPoolAdapterMainnet, EthNoPoolAdapterMainnet__factory, EurCurveAdapterMainnet, EurCurveAdapterMainnet__factory, UsdCurveAdapterMainnet, UsdCurveAdapterMainnet__factory } from "../../typechain-types";

async function main() {

  let handler = await ethers.getContractAt("LiquidityHandler", "");

  let ibAlluoUsd = ""
  let ibAlluoEur = ""
  let ibAlluoEth = ""
  let ibAlluoBtc = ""

  let adminRole = await handler.DEFAULT_ADMIN_ROLE();

  await handler.grantRole(adminRole, ibAlluoUsd)
  await handler.grantRole(adminRole, ibAlluoEur)
  await handler.grantRole(adminRole, ibAlluoEth)
  await handler.grantRole(adminRole, ibAlluoBtc)

  console.log("granted");

  await handler.setIbAlluoToAdapterId(ibAlluoUsd, 1)
  await handler.setIbAlluoToAdapterId(ibAlluoEur, 2)
  await handler.setIbAlluoToAdapterId(ibAlluoEth, 3)
  await handler.setIbAlluoToAdapterId(ibAlluoBtc, 4)

  console.log("done");

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

