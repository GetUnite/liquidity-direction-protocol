import { ethers, upgrades } from "hardhat"

async function main() {

  let gnosisAddress = "gnosis";
  let buffer = "buffer";
  let supprotedTokens = ["usdc","dai", "usdt"];

  const IbAlluo = await ethers.getContractFactory("IbAlluo");

  let ibAlluo = await upgrades.deployProxy(IbAlluo,
        [gnosisAddress,
         buffer,
        supprotedTokens],
        {initializer: 'initialize', kind:'uups'}
  );

  console.log("IbAlluo deployed to:", ibAlluo.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });