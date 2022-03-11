import { ethers, upgrades } from "hardhat"

async function main() {

  let gnosisAddress = "gnosis";
  let supprotedTokens = ["usdc","dai"];

  const AlluoLP = await ethers.getContractFactory("AlluoLpUpgradable");

  let alluoLp = await upgrades.deployProxy(AlluoLP,
        [gnosisAddress,
        supprotedTokens],
        {initializer: 'initialize', kind:'uups'}
  );

  console.log("AlluoLp upgradable deployed to:", alluoLp.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });