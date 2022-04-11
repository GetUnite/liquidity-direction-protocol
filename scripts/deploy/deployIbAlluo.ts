import { ethers, upgrades } from "hardhat"

async function main() {

  let gnosisAddress = "gnosis";
  let buffer = "buffer";
  let supprotedTokens = ["usdc","dai", "usdt"];

  const IbAlluoUsd = await ethers.getContractFactory("IbAlluoUSD");

  let ibAlluoUsd = await upgrades.deployProxy(IbAlluoUsd,
        [gnosisAddress,
         buffer,
        supprotedTokens],
        {initializer: 'initialize', kind:'uups'}
  );

  console.log("IbAlluoUsd deployed to:", ibAlluoUsd.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });