import { BigNumber } from "ethers";
import { ethers, upgrades } from "hardhat"

async function main() {

  let gnosis = "0x2580f9954529853Ca5aC5543cE39E9B5B1145135";
  let handler = "handlerAddress";
  let trustedForwarder = "0x86C80a8aa58e0A4fa09A69624c31Ab2a6CAD56b8"

  const IbAlluo = await ethers.getContractFactory("IbAlluo");

  let ethSupprotedTokens = ["0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619"];

  let ibAlluoEth = await upgrades.deployProxy(IbAlluo,
    [
        "Interest Bearing Alluo ETH",
        "IbAlluoETH",
        gnosis,
        handler,
        ethSupprotedTokens,
        BigNumber.from("100000000154712590"),
        500,
        trustedForwarder],
    { initializer: 'initialize', kind: 'uups' }
  );

  console.log("ibAlluoEth deployed to:", ibAlluoEth.address);

  let eurSupprotedTokens = ["0x4e3decbb3645551b8a19f0ea1678079fcb33fb4c", "0xE111178A87A3BFf0c8d18DECBa5798827539Ae99", "0x7BDF330f423Ea880FF95fC41A280fD5eCFD3D09f"];

  let ibAlluoEur = await upgrades.deployProxy(IbAlluo,
    [
        "Interest Bearing Alluo EUR",
        "IbAlluoEUR",
        gnosis,
        handler,
        eurSupprotedTokens,
        BigNumber.from("100000000214544160"),
        700,
        trustedForwarder],
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