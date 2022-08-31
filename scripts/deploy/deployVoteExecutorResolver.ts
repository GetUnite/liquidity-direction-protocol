import { BigNumber } from "ethers";
import { ethers, upgrades } from "hardhat"
import { VoteExecutorResolver } from "../../typechain";

async function main() {
    const VoteExecutorMaster = "0x4Fd58328C2e0dDa1Ea8f4C70321C91B366582eA2"
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
