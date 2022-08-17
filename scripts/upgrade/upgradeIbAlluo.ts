import { ethers, upgrades } from "hardhat"

async function main() {
  const IbAlluoNew = await ethers.getContractFactory("IbAlluoMainnet");

  await upgrades.upgradeProxy('0xF555B595D04ee62f0EA9D0e72001D926a736A0f6', IbAlluoNew);
  console.log('IbAlluo upgraded');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });