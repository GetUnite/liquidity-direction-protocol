import { ethers, upgrades } from "hardhat"

async function main() {


  const Buffer = await ethers.getContractFactory("LiquidityBufferVaultForMumbai");

  await upgrades.upgradeProxy('0xF9F9381Fbc5225180015b1f0eab6c33DbF0b37Ab', Buffer);
  console.log('Buffer upgraded');

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });