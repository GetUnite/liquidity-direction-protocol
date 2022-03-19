import { ethers, upgrades } from "hardhat"

async function main() {

  const gnosisAddress = "gnosis";
  let supprotedTokens = [
    "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",// USDC
    "0x6B175474E89094C44Da98b954EedeAC495271d0F",// DAI
    "0xdAC17F958D2ee523a2206206994597C13D831ec7", //USDT
  ];
  const targetToken = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"// USDC
  const exchangeAddress = "0x29c66CF57a03d41Cfe6d9ecB6883aa0E2AbA21Ec"// exchange eth
  const slippageBPS = 10;

  const AlluoLPV2 = await ethers.getContractFactory("AlluoLpV2Upgradable");

  const alluoLPV2 = await upgrades.deployProxy(AlluoLPV2,
    [gnosisAddress,
      supprotedTokens, targetToken, exchangeAddress, slippageBPS],
    { initializer: 'initialize', kind: 'uups' }
  );

  console.log("AlluoLp upgradable deployed to:", alluoLPV2.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });