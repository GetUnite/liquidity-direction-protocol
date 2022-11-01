import { BigNumber } from "ethers";
import { ethers, upgrades } from "hardhat"

async function main() {
    const gelato = "0x527a819db1eb0e34426297b03bae11F2f8B3A19E";
    const ibAlluoUSD ="0xC2DbaAEA2EfA47EBda3E572aa0e55B742E408BF6";
    const ibAlluoEUR = "0xc9d8556645853C465D1D5e7d2c81A0031F0B8a92";
    const ibAlluoETH ="0xc677B0918a96ad258A68785C2a3955428DeA7e50";
    const ibAlluoBTC ="0xf272Ff86c86529504f0d074b210e95fc4cFCDce2";
    const SuperfluidResolver = await ethers.getContractFactory("SuperfluidEndResolver");
    const resolver = await SuperfluidResolver.deploy([ibAlluoBTC, ibAlluoETH, ibAlluoEUR, ibAlluoUSD], gelato);
    console.log("Resolver deployed to:", resolver.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });