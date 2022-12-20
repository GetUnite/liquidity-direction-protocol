import { BigNumber } from "ethers";
import { ethers, upgrades } from "hardhat"

async function main() {
  const multisig = "0x2580f9954529853Ca5aC5543cE39E9B5B1145135";
  const cfacontract = "0x6EeE6060f715257b970700bc2656De21dEdF074C"
  const ibAlluoUSD = "0xC2DbaAEA2EfA47EBda3E572aa0e55B742E408BF6";
  const ibAlluoEUR = "0xc9d8556645853C465D1D5e7d2c81A0031F0B8a92";
  const ibAlluoETH = "0xc677B0918a96ad258A68785C2a3955428DeA7e50";
  const ibAlluoBTC = "0xf272Ff86c86529504f0d074b210e95fc4cFCDce2";
  const ibAlluos = [ibAlluoUSD, ibAlluoEUR, ibAlluoETH, ibAlluoBTC];

  const SuperfluidResolver = await ethers.getContractFactory("SuperfluidResolver");
  const resolver = await SuperfluidResolver.deploy(ibAlluos, cfacontract, multisig);
  console.log("Resolver deployed to:", resolver.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });