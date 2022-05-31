import { ethers, upgrades } from "hardhat"

async function main() {

  const usdAdapter = "0x4E01cA43b441fD76c5647e490532e47df7345B1b";
  const eurAdapter = "0x2972a2D537f1d004707C14509a87a39068F21665";
  const ethAdapter = "0x57Ea02C5147b3A79b5Cc27Fd30C0D9501505bE0B";

  let ibAlluoUsd = "0xC2DbaAEA2EfA47EBda3E572aa0e55B742E408BF6";
  let ibAlluoEur = "0xc9d8556645853C465D1D5e7d2c81A0031F0B8a92";
  let ibAlluoEth = "0xc677B0918a96ad258A68785C2a3955428DeA7e50";

  const handler = await ethers.getContractAt("LiquidityHandler", "0x31a3439Ac7E6Ea7e0C0E4b846F45700c6354f8c1");

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

await handler.grantRole(await handler.DEFAULT_ADMIN_ROLE(), ibAlluoUsd)
await handler.grantRole(await handler.DEFAULT_ADMIN_ROLE(), ibAlluoEur)
await handler.grantRole(await handler.DEFAULT_ADMIN_ROLE(), ibAlluoEth)

await handler.setAdapter(
  1, 
  "USD Curve-Aave", 
  500, 
  usdAdapter, 
  true
)

await handler.setAdapter(
  2, 
  "EUR Curve-4eur", 
  500, 
  eurAdapter, 
  true
)

await handler.setAdapter(
  3, 
  "ETH no pool", 
  500, 
  ethAdapter, 
  true
)

}


main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

//npx hardhat run scripts/dev/setAdapters.ts --network polygon