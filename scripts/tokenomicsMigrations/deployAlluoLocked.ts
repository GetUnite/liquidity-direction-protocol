import { ethers, upgrades } from "hardhat"

async function main() {

  const contractFactory = await ethers.getContractFactory("AlluoLockedV3");

  const gnosis = "0x1F020A4943EB57cd3b2213A66b355CB662Ea43C3";

  let contract = await upgrades.deployProxy(contractFactory,
        [gnosis, 0],
        {initializer: 'initialize', kind:'uups'}
  );

  console.log("Locker (with CVX rewards) upgradable deployed to:", contract.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });