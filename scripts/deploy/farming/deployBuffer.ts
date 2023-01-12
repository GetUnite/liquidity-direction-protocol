import { ethers, upgrades } from "hardhat"

async function main() {

  const Buffer = await ethers.getContractFactory("BufferManager");

  const gnosis = "0x466b375cE0D1161aEb3e69f92B2B9c365f7877BE";

  const spokepool = "0x7e48eB74946404D2db690e2c4E509A75cD60Ba5B";

  let buffer = await upgrades.deployProxy(Buffer,
    [604800,
      1000,
      604800,
      gnosis,
      gnosis,
      spokepool,
      gnosis,
      gnosis,
    ], {
    initializer: 'initialize', unsafeAllow: ["delegatecall"],
    kind: 'uups'
  }
  )
  console.log("Buffer upgradable deployed to:", buffer.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

//npx hardhat run scripts/deploy/deployHandler.ts --network polygon
//npx hardhat verify 0xb647c6fe9d2a6e7013c7e0924b71fa7926b2a0a3 --network polygon

// Buffer upgradable deployed to: 0xeDc37a63d74d2AB5C66067f979Cef378b4E3E591