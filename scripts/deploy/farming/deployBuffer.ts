import { ethers, upgrades } from "hardhat"

async function main() {

  // const Buffer = await ethers.getContractFactory("BufferManager");

  // const epochDuration = 86400;
  // const bridgeGenesis = 16750750;
  // const bridgeInterval = 864000;
  // const gnosis = "0x2580f9954529853Ca5aC5543cE39E9B5B1145135";
  // const spokePool = "0x69B5c72837769eF1e7C164Abc6515DcFf217F920";
  

  // let buffer = await upgrades.deployProxy(Buffer,
  //       [epochDuration, bridgeGenesis, bridgeInterval, gnosis, spokePool],
  //       {initializer: 'initialize', kind:'uups'}
  // );

  // console.log("Buffer upgradeable deployed to:", buffer.address);
  let buffer = await ethers.getContractAt("BufferManager", "0x466b375cE0D1161aEb3e69f92B2B9c365f7877BE")
  
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

//npx hardhat run scripts/deploy/deployHandler.ts --network polygon
//npx hardhat verify 0xb647c6fe9d2a6e7013c7e0924b71fa7926b2a0a3 --network polygon