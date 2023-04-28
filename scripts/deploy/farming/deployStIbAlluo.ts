import { BigNumber } from "ethers";
import { ethers, upgrades } from "hardhat"
import { StIbAlluo, StIbAlluo__factory } from "../../../typechain-types";

async function main() {


  const StIbAlluoFactory = await ethers.getContractFactory("StIbAlluo") as StIbAlluo__factory;
  const deployedImplementation = await StIbAlluoFactory.deploy();
  console.log("Donzo", deployedImplementation.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });