import { BigNumber } from "ethers";
import { ethers, upgrades } from "hardhat"
import { VoteExecutorMaster } from "../../typechain";

async function main() {

  // Please double check the addresses below and MinSigns
    let gnosis = "0x1F020A4943EB57cd3b2213A66b355CB662Ea43C3";
    let locker = "0xF295EE9F1FA3Df84493Ae21e08eC2e1Ca9DebbAf";
    let anyCall = "0xC10Ef9F491C9B59f936957026020C321651ac078";
    let timelock = 0;
    let MinSigns = 2;

    const VoteExecutorMasterFactory = await ethers.getContractFactory("VoteExecutorMaster");
    const VoteExecutorMaster = await upgrades.deployProxy(VoteExecutorMasterFactory, 
        [gnosis, locker, anyCall, timelock],
        { initializer: 'initialize', kind: 'uups' }
    ) as VoteExecutorMaster

    await VoteExecutorMaster.setMinSigns(MinSigns);

    console.log("Address:", VoteExecutorMaster.address);
    console.log("Completed deployment of VoteExecutorMaster , please now deployVoteExecutorSlave by putting",VoteExecutorMaster.address )
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

//npx hardhat run scripts/deploy/deployVoteExecutorMaster.ts --network mainnet