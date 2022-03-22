import { ethers, upgrades } from "hardhat"

async function main() {

  let gnosisAddress = "gnosis";
  let alluolp = "alluo";
  let pool = "pool";

  const Buffer = await ethers.getContractFactory("LiquidityBufferVault");

  let buffer = await upgrades.deployProxy(Buffer,
        [gnosisAddress,
        alluolp,
        pool],
        {initializer: 'initialize', kind:'uups'}
  );

  console.log("Buffer upgradable deployed to:", buffer.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });