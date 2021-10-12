// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { BigNumber } from "@ethersproject/bignumber";
import { ethers } from "hardhat";
import { IERC20 } from "../typechain";
import { Test__factory } from "../typechain/factories/Test__factory";
import { Test } from "../typechain/Test";

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const daiAddress = "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063";
  const usdcAddress = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
  const usdtAddress = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";

  const tokenAmount = 10;
  const daiTokenAmount = BigNumber.from(tokenAmount).mul(BigNumber.from(10).pow(18));
  const usdcTokenAmount = BigNumber.from(tokenAmount).mul(1e6);
  const usdtTokenAmount = BigNumber.from(tokenAmount).mul(1e6);

  const dai = await ethers.getContractAt("IERC20", daiAddress) as IERC20;
  const usdc = await ethers.getContractAt("IERC20", usdcAddress) as IERC20;
  const usdt = await ethers.getContractAt("IERC20", usdtAddress) as IERC20;

  await dai.approve("0x0f487826E362145335770d2Ba82D9777E19BDB66", daiTokenAmount);
  await usdc.approve("0x0f487826E362145335770d2Ba82D9777E19BDB66", usdcTokenAmount);
  await usdt.approve("0x0f487826E362145335770d2Ba82D9777E19BDB66", usdtTokenAmount);

  console.log(daiTokenAmount.toString());
  console.log(usdcTokenAmount.toString());
  console.log(usdtTokenAmount.toString());
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
