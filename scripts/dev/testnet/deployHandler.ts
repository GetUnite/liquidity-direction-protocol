import { ethers, upgrades } from "hardhat"

async function main() {

  const Handler = await ethers.getContractFactory("LiquidityHandler");

  let handler = await upgrades.deployProxy(Handler,
        [],
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