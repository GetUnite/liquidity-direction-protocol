
  import { ethers, upgrades } from "hardhat"

async function main() {

  const AlluoLPMintable = await ethers.getContractFactory("AlluoLpUpgradableMintable");

  let alluoLpMintable = await AlluoLPMintable.deploy()

  console.log("AlluoLp upgradable deployed to:", alluoLpMintable.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });