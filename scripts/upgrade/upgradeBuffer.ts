import { ethers, upgrades } from "hardhat"

async function main() {


  const Buffer = await ethers.getContractFactory("LiquidityBufferVaultForMumbai");

  await upgrades.upgradeProxy('0x20bb70c55387Bc0F9073D27d09Ab0ce9D26c4Eaa', Buffer);
  console.log('Buffer upgraded');

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });