import { ethers, upgrades } from "hardhat"

async function main() {

  const Executor = await ethers.getContractFactory("VoteExecutorMaster");

  await upgrades.upgradeProxy('0x4Fd58328C2e0dDa1Ea8f4C70321C91B366582eA2', Executor);
  console.log('Executor upgraded');

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });