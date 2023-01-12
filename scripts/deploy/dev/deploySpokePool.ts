import { ethers, upgrades } from "hardhat"
import { SpokePoolMock } from "../../../typechain";

async function main() {

  const SpokePool = await ethers.getContractFactory("SpokePoolMock");

  let spokepool = await SpokePool.deploy();

  console.log("Spokepool deployed to:", spokepool.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

  // Spokepool deployed to: 0x7e48eB74946404D2db690e2c4E509A75cD60Ba5B
  // https://mumbai.polygonscan.com/address/0x7e48eB74946404D2db690e2c4E509A75cD60Ba5B#code