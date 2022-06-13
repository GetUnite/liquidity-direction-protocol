import { ethers, upgrades } from "hardhat"

async function main() {
  const IbAlluoNew = await ethers.getContractFactory("IbAlluo");

  let IbAlluoUsd = await ethers.getContractAt("IbAlluo", "0xC2DbaAEA2EfA47EBda3E572aa0e55B742E408BF6");
  let IbAlluoEur = await ethers.getContractAt("IbAlluo", "0xc9d8556645853C465D1D5e7d2c81A0031F0B8a92");
  let IbAlluoEth = await ethers.getContractAt("IbAlluo", "0xc677B0918a96ad258A68785C2a3955428DeA7e50");
  let IbAlluoBtc = await ethers.getContractAt("IbAlluo", "0xf272Ff86c86529504f0d074b210e95fc4cFCDce2");

  await upgrades.upgradeProxy(IbAlluoUsd.address, IbAlluoNew);
  console.log('IbAlluoUsd upgraded');
  await upgrades.upgradeProxy(IbAlluoEur.address, IbAlluoNew);
  console.log('IbAlluoEur upgraded');
  await upgrades.upgradeProxy(IbAlluoEth.address, IbAlluoNew);
  console.log('IbAlluoEth upgraded');
  await upgrades.upgradeProxy(IbAlluoBtc.address, IbAlluoNew);
  console.log('IbAlluoBtc upgraded');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });