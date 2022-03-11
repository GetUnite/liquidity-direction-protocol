import { ethers } from "hardhat"

async function main() {

  const [...addr] = await ethers.getSigners();

  const Executor = await ethers.getContractFactory("VoteExecutor");

  const executor = await Executor.deploy(
    "gnosis",   //admin
    "strategy", //strategy
    "exchange", //exchange
    [
    "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",// USDC
    "0x6B175474E89094C44Da98b954EedeAC495271d0F",// DAI
    "0xdAC17F958D2ee523a2206206994597C13D831ec7", //USDT
    "0x853d955aCEf822Db058eb8505911ED77F175b99e" //FRAX
  ]);

  await executor.deployed();

  console.log("Executor deployed to:", executor.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });