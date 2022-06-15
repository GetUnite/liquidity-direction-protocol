import { ethers} from "hardhat"

const deploymentArguments = require('../verification/argumentsIbAlluoPriceResolver.ts');

async function main() {
    const IbAlluoPriceResolver = await ethers.getContractFactory("IbAlluoPriceResolver");

    let withdrawawlRequestResolver = await IbAlluoPriceResolver.deploy(deploymentArguments[0],deploymentArguments[1])

    console.log("IbAlluoPriceResolver deployed to:", withdrawawlRequestResolver.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
