import { ethers, upgrades } from "hardhat"
import { EthNoPoolAdapter, EthNoPoolAdapter__factory } from "../../typechain";

async function main() {

  
  const Adapter = await ethers.getContractFactory("EthNoPoolAdapter") as EthNoPoolAdapter__factory
  const handler = "0xF877605269bB018c96bD1c93F276F834F45Ccc3f";
  
  const deployer = (await ethers.getSigners())[0];

  let adapter = await Adapter.deploy(deployer.address, handler)

  console.log("Adapter upgradable deployed to:", adapter.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });