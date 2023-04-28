import { BigNumber, Wallet } from "ethers";
import { ethers, upgrades } from "hardhat"
import { VoteExecutorMaster } from "../../typechain-types";
function getInterestPerSecond(apyDecimal: number): BigNumber {
  return BigNumber.from(String(Math.round(Math.pow(apyDecimal, 1 / 31536000) * 10 ** 17)))
}

async function main() {

  let VoteExecutorMasterAddress = "0x3AD74BAce624451D8eD6499c6eAfC660757b3DD5"
  const VoteExecutorMaster = await ethers.getContractAt("VoteExecutorMaster", VoteExecutorMasterAddress);

  let encodedAPYETH = await VoteExecutorMaster.callStatic.encodeApyCommand("IbAlluoETH", 3000, getInterestPerSecond(1.30));
  let encodedAPYUSD = await VoteExecutorMaster.callStatic.encodeApyCommand("IbAlluoUSD", 2000, getInterestPerSecond(1.20));
  let encodedAPYEUR = await VoteExecutorMaster.callStatic.encodeApyCommand("IbAlluoEUR", 1000, getInterestPerSecond(1.1));

  let commandIndexes = [encodedAPYETH[0], encodedAPYUSD[0], encodedAPYEUR[0]];
  let commandDatas = [encodedAPYETH[1], encodedAPYUSD[1], encodedAPYEUR[1]];

  let messages = await VoteExecutorMaster.callStatic.encodeAllMessages(commandIndexes, commandDatas);
  await VoteExecutorMaster.submitData(messages[2])
  console.log("Messages submitted")

  let mneumonic = process.env.MNEMONIC
  if (typeof mneumonic !== "string") {
    return
  }
  let wallet: Wallet;
  wallet = Wallet.fromMnemonic(mneumonic)
  console.log(messages[0])
  let signedData = await wallet.signMessage(ethers.utils.arrayify(messages[0]))
  console.log(signedData);
  // await VoteExecutorMaster.approveSubmitedData(0, [signedData])

  // await VoteExecutorMaster.execute();
  console.log("All complete!")
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

//npx hardhat run scripts/deploy/deployVoteExecutorMaster.ts --network Rinkeby/mainnet