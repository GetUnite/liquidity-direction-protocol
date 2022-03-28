import { ethers, upgrades } from "hardhat"

async function main() {


  const Buffer = await ethers.getContractFactory("LiquidityBufferVaultForMumbai");

  await upgrades.upgradeProxy('0x385AB598E7DBF09951ba097741d2Fa573bDe94A5', Buffer);
  console.log('Buffer upgraded');

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });