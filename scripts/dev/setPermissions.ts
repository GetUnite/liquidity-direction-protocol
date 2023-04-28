import { ethers, upgrades } from "hardhat"
import { IbAlluo } from "../../typechain-types";

async function main() {
  const ibAlluoCurrent = await ethers.getContractAt("IbAlluo", "0xf272Ff86c86529504f0d074b210e95fc4cFCDce2") as IbAlluo;
  let encodeData = await ibAlluoCurrent.formatPermissions();
  let superhost = await ethers.getContractAt("Superfluid", "0x3E14dC1b13c488a8d5D310918780c983bD5982E7");
  await superhost.callAgreement(
    "0x6EeE6060f715257b970700bc2656De21dEdF074C",
    encodeData,
    "0x"
  )

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
