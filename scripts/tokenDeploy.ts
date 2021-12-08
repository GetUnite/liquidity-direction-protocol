import { ethers } from "hardhat"

async function main() {
  const adminAddress = "ADMIN_ADDRESS";

  const Token = await ethers.getContractFactory("AlluoToken");
  const token = await Token.deploy(adminAddress);
  await token.deployed();
  console.log("Alluo Token deployed to:", token.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });