import { BigNumber } from "ethers";
import { ethers, upgrades } from "hardhat"

async function main() {

    // Please double check the addresses below and MinSigns
    let Gnosis = "0x1F020A4943EB57cd3b2213A66b355CB662Ea43C3";
    let VoteExecutor = "0x82e568C482dF2C833dab0D38DeB9fb01777A9e89";
    let StrategyHandler = "0x385AB598E7DBF09951ba097741d2Fa573bDe94A5";
    let maxGasPrice = 20 * 10 ** 9
    let fundManagerFactory = await ethers.getContractFactory("FundManager");

    let FundManager = await upgrades.deployProxy(fundManagerFactory, [Gnosis, VoteExecutor, StrategyHandler, maxGasPrice]);
    console.log("FundManager deployed to:", FundManager.address);

}
main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

//npx hardhat run scripts/deploy/deployVoteExecutorMaster.ts --network mainnet