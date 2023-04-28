import { ethers, upgrades } from "hardhat"
import { BtcNoPoolAdapterMainnet, BtcNoPoolAdapterMainnet__factory, EthNoPoolAdapterMainnet, EthNoPoolAdapterMainnet__factory, EurCurveAdapterMainnet, EurCurveAdapterMainnet__factory, UsdCurveAdapterMainnet, UsdCurveAdapterMainnet__factory } from "../../typechain-types";

async function main() {

  let handler = await ethers.getContractAt("LiquidityHandler", "");

  let usdAdapter = ""
  let eurAdapter = ""
  let ethAdapter = ""
  let btcAdapter = ""

  await handler.setAdapter(
    1,
    "USD Curve-3pool",
    500,
    usdAdapter,
    true
  )

  await handler.setAdapter(
    2,
    "EUR Curve-3eur",
    500,
    eurAdapter,
    true
  )

  await handler.setAdapter(
    3,
    "ETH No Pool Adapter",
    500,
    ethAdapter,
    true
  )

  await handler.setAdapter(
    4,
    "BTC No Pool Adapter",
    500,
    btcAdapter,
    true
  )
  console.log("done");

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
