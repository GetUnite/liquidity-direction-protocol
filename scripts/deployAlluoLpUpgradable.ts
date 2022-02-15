import { ethers, upgrades } from "hardhat"

async function main() {

  let gnosisAddress = "";
  let firstDepositTokenAddress = "";

  const AlluoLP = await ethers.getContractFactory("AlluoLpUpgradable");

  let alluoLp = await upgrades.deployProxy(AlluoLP,
        [gnosisAddress,
        firstDepositTokenAddress],
        {initializer: 'initialize', kind:'uups'}
  );

  console.log("AlluoLp upgradable deployed to:", alluoLp.address);

  // const AlluoLPOld = await ethers.getContractFactory("UrgentAlluoLp");

  // let alluoLpOld = await AlluoLPOld.deploy(gnosisAddress, firstDepositTokenAddress)

  // console.log("AlluoLp old deployed to:", alluoLpOld.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });