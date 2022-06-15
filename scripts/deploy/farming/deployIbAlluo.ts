import { BigNumber } from "ethers";
import { ethers, upgrades } from "hardhat"

async function main() {

  let gnosisAddress = "0x2580f9954529853Ca5aC5543cE39E9B5B1145135";
  let handler = "0x31a3439Ac7E6Ea7e0C0E4b846F45700c6354f8c1";
  let supprotedTokens = ["0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6", "0xDBf31dF14B66535aF65AaC99C32e9eA844e14501"];

  const IbAlluo = await ethers.getContractFactory("IbAlluo");

  let ibAlluo = await upgrades.deployProxy(IbAlluo,
    [
        "Interest Bearing Alluo BTC",
        "IbAlluoBTC",
        gnosisAddress,
        handler,
        supprotedTokens,
        BigNumber.from("100000000154712500"),
        500,
        "0x86C80a8aa58e0A4fa09A69624c31Ab2a6CAD56b8"],
    { initializer: 'initialize', kind: 'uups' }
);

  console.log("ibAlluo deployed to:", ibAlluo.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });