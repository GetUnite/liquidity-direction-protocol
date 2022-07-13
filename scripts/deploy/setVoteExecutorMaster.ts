import { BigNumber } from "ethers";
import { ethers, upgrades } from "hardhat"

async function main() {

    // Set the addresses of the voteexecutors
    let VoteExecutorMasterAddress = ""
    let VoteExecutorSlaveAddress = ""
    const VoteExecutorMasterFactory = await ethers.getContractFactory("VoteExecutorMaster");
    const VoteExecutorMaster = await ethers.getContractAt("VoteExecutorMaster", VoteExecutorMasterAddress);
    await VoteExecutorMaster.setVoteExecutorSlave(VoteExecutorSlaveAddress, 4002 );

    console.log("All set");
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

//npx hardhat run scripts/deploy/setVoteExecutorMaster.ts --network mainnet