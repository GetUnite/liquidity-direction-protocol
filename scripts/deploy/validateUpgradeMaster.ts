import { BigNumber } from "ethers";
import { ethers, upgrades } from "hardhat"

async function main() {
    let master = await ethers.getContractFactory("VoteExecutorMasterLog");
    await upgrades.prepareUpgrade("0x82e568C482dF2C833dab0D38DeB9fb01777A9e89", master)

}
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

//npx hardhat run scripts/deploy/validateUpgradeMaster.ts --network mainnet