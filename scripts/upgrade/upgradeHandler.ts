import { ethers, upgrades } from "hardhat"

async function main() {


  const Handler = await ethers.getContractFactory("LiquidityHandler");

  await upgrades.upgradeProxy('0x31a3439ac7e6ea7e0c0e4b846f45700c6354f8c1', Handler);
  console.log('Handler upgraded');

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });