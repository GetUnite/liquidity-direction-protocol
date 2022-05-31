import { ethers, upgrades } from "hardhat"

async function main() {

  const Handler = await ethers.getContractFactory("LiquidityHandler");

  const gnosis = "0x2580f9954529853Ca5aC5543cE39E9B5B1145135";

  let handler = await upgrades.deployProxy(Handler,
        [gnosis],
        {initializer: 'initialize', kind:'uups'}
  );

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