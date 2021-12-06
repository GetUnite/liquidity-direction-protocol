import { ethers } from "hardhat"

async function main() {
  const Token = await ethers.getContractFactory("AlluoToken");
  const token = await Token.deploy();
  token.deployed;  
  console.log("Alluo Token deployed to:", token.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });