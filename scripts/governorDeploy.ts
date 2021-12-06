import { ethers } from "hardhat"

async function main() {

  const Governor = await ethers.getContractFactory("AlluoGovernor");
  
  const token = await ethers.getContractAt("AlluoToken", process.env.TOKEN_ADDR as string);

  const governor = await Governor.deploy(token.address);
  governor.deployed;
  console.log("Governor deployed to:", governor.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });