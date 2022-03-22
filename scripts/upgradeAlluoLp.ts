import { ethers, upgrades } from "hardhat"

async function main() {


  const AlluoOld = await ethers.getContractFactory("AlluoLpUpgradableMintable");
  const AlluoNew = await ethers.getContractFactory("AlluoLpV3");

  await upgrades.forceImport("0x29c66CF57a03d41Cfe6d9ecB6883aa0E2AbA21Ec", AlluoOld)

  await upgrades.upgradeProxy('0x29c66CF57a03d41Cfe6d9ecB6883aa0E2AbA21Ec', AlluoNew);
  console.log('AlluoLp upgraded');

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });