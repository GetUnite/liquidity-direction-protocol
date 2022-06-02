import { ethers, upgrades } from "hardhat"

async function main() {

  const FakeCurveUSD = await ethers.getContractFactory("FakeCurveUsd");
  const FakeCurveEur = await ethers.getContractFactory("FakeCurveEur");
  const UsdADapter = await ethers.getContractFactory("UsdCurveAdapterMumbai");
  const EurADapter = await ethers.getContractFactory("EurCurveAdapterMumbai");
//   const usd = await ethers.getContractAt("FakeCurveUsd", "0x754E1c29e1C0109E7a5034Ca6F54aFbE52C3D1bA");
//   const eur = await ethers.getContractAt("FakeCurveEur", "0xB8057748b9A5faCD3F09fBF96Afc50cbb200746a");



await upgrades.upgradeProxy("0xa641941F714E2579c4520D72840FF47278AAA3dF", UsdADapter)
console.log("asd");

await upgrades.upgradeProxy("0x2f43CA8b4dfF1C8e3bED3729C36e3Aa8052D432B", EurADapter)
console.log("asd");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });