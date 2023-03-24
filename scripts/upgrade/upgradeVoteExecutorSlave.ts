import { ethers, upgrades } from "hardhat"

async function main() {


  const slave = await ethers.getContractFactory("VoteExecutorSlaveFinal");
  await upgrades.validateUpgrade("0x1D147031b6B4998bE7D446DecF7028678aeb732A", slave, { unsafeAllow: ["delegatecall"] });
  const upgraded = await upgrades.prepareUpgrade("0x1D147031b6B4998bE7D446DecF7028678aeb732A", slave, { unsafeAllow: ["delegatecall"] });
  console.log(upgraded)
  console.log('VESlave Upgrade safe.');

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });