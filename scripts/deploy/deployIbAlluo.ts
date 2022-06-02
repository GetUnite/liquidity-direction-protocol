import { BigNumber } from "ethers";
import { ethers, upgrades } from "hardhat"

async function main() {

  let gnosisAddress = "0x4B948C0354c82f1DC3c510bfa93578540DAb917d";
  let handler = "0xF877605269bB018c96bD1c93F276F834F45Ccc3f";
  let supprotedTokens = ["0x910c98B3EAc2B4c3f6FdB81882bfd0161e507567"];

  const IbAlluo = await ethers.getContractFactory("IbAlluo");

  let ibAlluoEur = await upgrades.deployProxy(IbAlluo,
    [
        "Interest Bearing Alluo ETH",
        "IbAlluoETH",
        gnosisAddress,
        handler,
        supprotedTokens,
        BigNumber.from("100000000470636740"),
        1600,
        "0x9399BB24DBB5C4b782C70c2969F58716Ebbd6a3b"],
    { initializer: 'initialize', kind: 'uups' }
);

  console.log("ibAlluoEur deployed to:", ibAlluoEur.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });