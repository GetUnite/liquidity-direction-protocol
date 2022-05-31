import { ethers, upgrades } from "hardhat"

async function main() {


  const Handler = await ethers.getContractFactory("LiquidityHandler");

  await upgrades.upgradeProxy('0xF877605269bB018c96bD1c93F276F834F45Ccc3f', Handler);
  console.log('Handler upgraded');

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });