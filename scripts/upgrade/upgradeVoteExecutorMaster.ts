import { ethers, upgrades } from "hardhat"

async function main() {


  const VEMaster = await ethers.getContractFactory("VoteExecutorMaster");
 const forced = await upgrades.forceImport('0x2D182Fc86Cd4C38D9FE94566251A6aF1A85F784b', VEMaster)
  await upgrades.upgradeProxy('0x2D182Fc86Cd4C38D9FE94566251A6aF1A85F784b', VEMaster);
  console.log('VEMaster upgraded');

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });