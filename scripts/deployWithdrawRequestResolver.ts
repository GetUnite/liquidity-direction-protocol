import { ethers} from "hardhat"

const deploymentArguments = require('./argumentsWithdrawalRequestResolver');

async function main() {
    const WithdrawawlRequestResolver = await ethers.getContractFactory("WithdrawawlRequestResolver");

    let withdrawawlRequestResolver = await WithdrawawlRequestResolver.deploy(deploymentArguments[0],deploymentArguments[1],deploymentArguments[2])

    console.log("WithdrawawlRequestResolver deployed to:", withdrawawlRequestResolver.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });