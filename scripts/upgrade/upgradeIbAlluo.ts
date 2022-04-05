import { ethers, upgrades } from "hardhat"

async function main() {

  const IbAlluoNew = await ethers.getContractFactory("IbAlluoForMumbai");

  await upgrades.upgradeProxy('0x71402a46d78a10c8eE7E7CdEf2AffeC8d1E312A1', IbAlluoNew);
  console.log('IbAlluo upgraded');

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });