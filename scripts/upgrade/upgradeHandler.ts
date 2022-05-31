import { ethers, upgrades } from "hardhat"

async function main() {


  const Handler = await ethers.getContractFactory("LiquidityHandler");

  await upgrades.upgradeProxy('address', Handler);
  console.log('Handler upgraded');

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });