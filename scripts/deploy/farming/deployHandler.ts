import { ethers, upgrades } from "hardhat"

async function main() {

  const Handler = await ethers.getContractFactory("LiquidityHandler");

  const gnosis = "0x7A34b2f0DA5ea35b5117CaC735e99Ba0e2aCEECD";
  const exchangeAddress = "0x6b45B9Ab699eFbb130464AcEFC23D49481a05773";

  let handler = await upgrades.deployProxy(Handler,
    [gnosis, exchangeAddress], {
    initializer: 'initialize', unsafeAllow: ["delegatecall"],
    kind: 'uups'
  }
  )

  console.log("Handler upgradable deployed to:", handler.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

//npx hardhat run scripts/deploy/deployHandler.ts --network polygon
//npx hardhat verify 0xb647c6fe9d2a6e7013c7e0924b71fa7926b2a0a3 --network polygon