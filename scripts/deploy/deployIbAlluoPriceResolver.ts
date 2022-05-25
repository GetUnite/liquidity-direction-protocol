import { ethers} from "hardhat"

const deploymentArguments = require('../verification/argumentsIbAlluoUSDPriceResolver.ts');

async function main() {
    const IbAlluoUSDPriceResolver = await ethers.getContractFactory("IbAlluoUSDPriceResolver");

    let withdrawawlRequestResolver = await IbAlluoUSDPriceResolver.deploy(deploymentArguments[0],deploymentArguments[1],deploymentArguments[2])

    console.log("WithdrawawlRequestResolver deployed to:", withdrawawlRequestResolver.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
