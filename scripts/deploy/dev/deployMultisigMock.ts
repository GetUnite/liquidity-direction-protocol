import { ethers, upgrades } from "hardhat"

async function main() {
  const GnosisMock = await ethers.getContractFactory("GnosisMock");

  let gnosisMock = await GnosisMock.deploy();

  console.log("GnosisMock deployed to:", gnosisMock.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

// GnosisMock deployed to: 0x466b375cE0D1161aEb3e69f92B2B9c365f7877BE
// https://mumbai.polygonscan.com/address/0x466b375cE0D1161aEb3e69f92B2B9c365f7877BE#code