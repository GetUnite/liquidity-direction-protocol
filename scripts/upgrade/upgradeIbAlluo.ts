import { ethers, upgrades } from "hardhat"

async function main() {
  const IbAlluoNew = await ethers.getContractFactory("IbAlluo");

  await upgrades.upgradeProxy('0xC2DbaAEA2EfA47EBda3E572aa0e55B742E408BF6', IbAlluoNew);
  console.log('IbAlluo upgraded');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });