import { ethers, upgrades } from "hardhat"

async function main() {

  const VoteExecutorMaster = await ethers.getContractFactory("VoteExecutorMaster");

  const gnosis = "0x4B948C0354c82f1DC3c510bfa93578540DAb917d";

  let voteExecutorMaster = await upgrades.deployProxy(VoteExecutorMaster,
        [gnosis, gnosis, gnosis],
        {initializer: 'initialize', kind:'uups'}
  );

  console.log("Handler upgradable deployed to:", voteExecutorMaster.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

//npx hardhat run scripts/deploy/deployHandler.ts --network polygon
//npx hardhat verify 0xb647c6fe9d2a6e7013c7e0924b71fa7926b2a0a3 --network polygon