import { ethers, upgrades } from "hardhat"

async function main() {

  const IbAlluoOld = await ethers.getContractFactory("IbAlluoOld");

  await upgrades.forceImport("0xC2DbaAEA2EfA47EBda3E572aa0e55B742E408BF6", IbAlluoOld);


  const IbAlluoNew = await ethers.getContractFactory("IbAlluo");

  let IbAlluoUsd = await ethers.getContractAt("IbAlluo", "0xC2DbaAEA2EfA47EBda3E572aa0e55B742E408BF6");
  let IbAlluoEur = await ethers.getContractAt("IbAlluo", "0xc9d8556645853C465D1D5e7d2c81A0031F0B8a92");
  let IbAlluoEth = await ethers.getContractAt("IbAlluo", "0xc677B0918a96ad258A68785C2a3955428DeA7e50");
  let IbAlluoBtc = await ethers.getContractAt("IbAlluo", "0xf272Ff86c86529504f0d074b210e95fc4cFCDce2");

  await upgrades.upgradeProxy(IbAlluoUsd.address, IbAlluoNew);
  console.log('IbAlluoUsd upgraded');
  // await upgrades.upgradeProxy(IbAlluoEur.address, IbAlluoNew);
  // console.log('IbAlluoEur upgraded');
  // await upgrades.upgradeProxy(IbAlluoEth.address, IbAlluoNew);
  // console.log('IbAlluoEth upgraded');
  // await upgrades.upgradeProxy(IbAlluoBtc.address, IbAlluoNew);
  // console.log('IbAlluoBtc upgraded');

  const StIbAlluoNew = await ethers.getContractFactory("StIbAlluo");

  let StIbAlluoUsd = await ethers.getContractAt("StIbAlluoNew", "0xE9E759B969B991F2bFae84308385405B9Ab01541");
  let StIbAlluoEur = await ethers.getContractAt("StIbAlluoNew", "0xe199f1B01Dd3e8a1C43B62279FEb20547a2EB3eF");
  let StIbAlluoEth = await ethers.getContractAt("StIbAlluoNew", "0x2D4Dc956FBd0044a4EBA945e8bbaf98a14025C2d");
  let StIbAlluoBtc = await ethers.getContractAt("StIbAlluoNew", "0x3E70E15c189e1FFe8FF44d713605528dC1701b63");

  // await upgrades.upgradeProxy(StIbAlluoUsd.address, StIbAlluoNew);
  // console.log('StIbAlluoUsd upgraded');
  // await upgrades.upgradeProxy(StIbAlluoEur.address, StIbAlluoNew);
  // console.log('StIbAlluoEur upgraded');
  // await upgrades.upgradeProxy(StIbAlluoEth.address, StIbAlluoNew);
  // console.log('StIbAlluoEth upgraded');
  // await upgrades.upgradeProxy(StIbAlluoBtc.address, StIbAlluoNew);
  // console.log('StIbAlluoBtc upgraded');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
