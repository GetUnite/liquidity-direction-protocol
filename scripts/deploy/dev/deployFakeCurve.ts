import { ethers, upgrades } from "hardhat"

async function main() {

  const FakeCurve = await ethers.getContractFactory("FakeCurveUsd");

  let fakeCurve = await upgrades.deployProxy(FakeCurve,
        [],
        {initializer: 'initialize', kind:'uups'}
  );

  console.log("FakeCurve upgradable deployed to:", fakeCurve.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });