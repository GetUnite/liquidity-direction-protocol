import { ethers, upgrades } from "hardhat"

async function main() {

  const Executor = await ethers.getContractFactory("VoteExecutorMaster");

  await upgrades.upgradeProxy('0xf9734B32E10178f0fa89f2CEb947B1a0b2d6c0E4', Executor);
  console.log('Executor upgraded');

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });