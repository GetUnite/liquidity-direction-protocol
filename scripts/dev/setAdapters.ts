import { ethers, upgrades } from "hardhat"

async function main() {

  const usdAdapter = "";
  const eurAdapter = "";
  const ethAdapter = "";

  let ibAlluoUsd = "0xC2DbaAEA2EfA47EBda3E572aa0e55B742E408BF6";
  let ibAlluoEur = "";
  let ibAlluoEth = "";

  const handler = await ethers.getContractAt("LiquidityHandler", "");

  await handler.setAdapter(
    1, 
    "USD Curve-Aave", 
    200, 
    usdAdapter, 
    true
)

await handler.setIbAlluoToAdapterId(ibAlluoUsd, 1)

await handler.setAdapter(
    2, 
    "EUR Curve-4eur", 
    200, 
    eurAdapter, 
    true
)

await handler.setIbAlluoToAdapterId(ibAlluoEur, 2)

await handler.setAdapter(
    3, 
    "ETH no pool", 
    200, 
    ethAdapter, 
    true
)

await handler.setIbAlluoToAdapterId(ibAlluoEth, 3)

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });