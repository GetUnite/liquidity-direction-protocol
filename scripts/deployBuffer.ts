import { ethers, upgrades } from "hardhat"

async function main() {

  let gnosisAddress = "0x2580f9954529853Ca5aC5543cE39E9B5B1145135";
  let alluolp = "0x29c66CF57a03d41Cfe6d9ecB6883aa0E2AbA21Ec";
  let pool = "0x445FE580eF8d70FF569aB36e80c647af338db351";

  const Buffer = await ethers.getContractFactory("LiquidityBufferVault");

  let buffer = await upgrades.deployProxy(Buffer,
        [gnosisAddress,
        alluolp,
        pool],
        {initializer: 'initialize', kind:'uups'}
  );

  console.log("Buffer upgradable deployed to:", buffer.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });