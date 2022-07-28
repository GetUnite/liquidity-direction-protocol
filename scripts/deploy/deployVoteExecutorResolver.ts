import { BigNumber } from "ethers";
import { ethers, upgrades } from "hardhat"
import { VoteExecutorResolver } from "../../typechain";

async function main() {
    const VoteExecutorMaster = "0x6635Ab05a9D36bb3480C3dbA9b8c506C44CC8880"
    const ResolverFactory = await ethers.getContractFactory("VoteExecutorResolver");
    const Resolver = await ResolverFactory.deploy(VoteExecutorMaster);
    console.log("Deployed at:", Resolver.address);
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

//npx hardhat run scripts/deploy/deployVoteExecutorResolver.ts --network mainnet
