import { ethers, upgrades } from "hardhat"

async function main() {
    const PlaceholderNFTSuperfluid = await ethers.getContractFactory("PlaceholderNFTSuperfluid");
    const placeholderNFTSuperfluid = await PlaceholderNFTSuperfluid.deploy();
    console.log("Placeholder deployed at:", placeholderNFTSuperfluid.address);

    let StIbAlluoFactory = await ethers.getContractFactory("StIbAlluo");

    // This is for polygon!
    let stIbAlluoAddresses = ["0x3E70E15c189e1FFe8FF44d713605528dC1701b63", "0x2D4Dc956FBd0044a4EBA945e8bbaf98a14025C2d", "0xe199f1B01Dd3e8a1C43B62279FEb20547a2EB3eF", "0xE9E759B969B991F2bFae84308385405B9Ab01541"]

    // This is for optimism! (no EUR for optimism)
    // let stIbAlluoAddresses = ["0xf61440f37A30a9624BD0e69ABfcb57A1A5Cf9Fc7", "0x2ad6965Bc5D2b80163B37893d1fe8518aFe196A2", "0xd28900Bfa76ec16D47FCd7b4437C27bd7E888db5"]

    for (let address of stIbAlluoAddresses) {
        await upgrades.prepareUpgrade(address, StIbAlluoFactory, { unsafeAllow: ["delegatecall"] })
    }

    // Now that all the implementations have been deployed, here are the steps to follow:

    // 1. changeUpgradeStatus on all the stIbAlluos to true
    // 2. UpgradeTo the new implementation that we have deployed.
    // 3. setPlaceholderNFT on all the stIbAlluos through gnosis

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
