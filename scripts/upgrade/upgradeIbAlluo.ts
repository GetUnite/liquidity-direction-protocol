import { ethers, upgrades } from "hardhat"

async function main() {
  const IbAlluoNew = await ethers.getContractFactory("IbAlluoMainnet");

  await upgrades.upgradeProxy('0x98f49aC358187116462BDEA748daD1Df480865d7', IbAlluoNew);
  console.log('IbAlluo upgraded');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });