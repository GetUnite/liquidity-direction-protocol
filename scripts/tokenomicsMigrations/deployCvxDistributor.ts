import { ethers, upgrades } from "hardhat"

async function main() {

  const contractFactory = await ethers.getContractFactory("CvxDistributor");

  const gnosis = "0x1F020A4943EB57cd3b2213A66b355CB662Ea43C3";
  const vlAlluo = "0xdEBbFE665359B96523d364A19FceC66B0E43860D";
  const rewardTokenAddress = "0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B";
  const exchangeAddress = "0x29c66CF57a03d41Cfe6d9ecB6883aa0E2AbA21Ec";

  let contract = await upgrades.deployProxy(contractFactory,
    [gnosis, vlAlluo, rewardTokenAddress, exchangeAddress],
    { initializer: 'initialize', kind: 'uups' }
  );

  console.log("CVX distributor upgradable deployed to:", contract.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });