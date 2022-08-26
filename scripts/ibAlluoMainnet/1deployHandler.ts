import { ethers, upgrades } from "hardhat"

async function main() {

  const Handler = await ethers.getContractFactory("LiquidityHandler");

  const gnosis = "0x1F020A4943EB57cd3b2213A66b355CB662Ea43C3";
  const exchangeAddress = "0x29c66CF57a03d41Cfe6d9ecB6883aa0E2AbA21Ec";

  let handler = await upgrades.deployProxy(Handler,
        [gnosis, exchangeAddress],
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

//npx hardhat run scripts/deploy/ibAlluoMainnet/deployHandler.ts --network mainnet
//npx hardhat verify 0xb647c6fe9d2a6e7013c7e0924b71fa7926b2a0a3 --network mainnet