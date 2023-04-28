import { ethers, upgrades } from "hardhat"
import { BtcNoPoolAdapterMainnet, BtcNoPoolAdapterMainnet__factory, EthNoPoolAdapterMainnet, EthNoPoolAdapterMainnet__factory, EurCurveAdapterMainnet, EurCurveAdapterMainnet__factory, UsdCurveAdapterMainnet, UsdCurveAdapterMainnet__factory } from "../../typechain-types";

async function main() {

  let handler = await ethers.getContractAt("LiquidityHandler", "");

  let usdAdapter = await ethers.getContractAt("UsdCurveAdapterMainnet", "");
  let eurAdapter = await ethers.getContractAt("EurCurveAdapterMainnet", "");
  let ethAdapter = await ethers.getContractAt("EthNoPoolAdapterMainnet", "");
  let btcAdapter = await ethers.getContractAt("BtcNoPoolAdapterMainnet", "");


  let adminRole = await handler.DEFAULT_ADMIN_ROLE();

  await handler.revokeRole(adminRole, "0xFc57eBe6d333980E620A923B6edb78fc7FB5cC3f")
  await usdAdapter.revokeRole(adminRole, "0xFc57eBe6d333980E620A923B6edb78fc7FB5cC3f")
  await eurAdapter.revokeRole(adminRole, "0xFc57eBe6d333980E620A923B6edb78fc7FB5cC3f")
  await ethAdapter.revokeRole(adminRole, "0xFc57eBe6d333980E620A923B6edb78fc7FB5cC3f")
  await btcAdapter.revokeRole(adminRole, "0xFc57eBe6d333980E620A923B6edb78fc7FB5cC3f")
  console.log("done");


}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

