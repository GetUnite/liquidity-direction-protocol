import { BigNumber } from "ethers";
import { ethers, upgrades } from "hardhat"
import { VoteExecutorSlave } from "../../typechain";

async function main() {
    // Please add the address of VoteExecutorMaster on mainnet and doublecheck the addresses below.
    let VoteExecutorMasterAddress = "";
    let gnosis = "0x2580f9954529853Ca5aC5543cE39E9B5B1145135";
    let handler = "0x31a3439Ac7E6Ea7e0C0E4b846F45700c6354f8c1"
    let anyCallProxy = "0xC10Ef9F491C9B59f936957026020C321651ac078"
    let anyCallExecutor = "0x0C9f0ea6317038c9D7180Cf4A0aEeB58478D13A4"


    const VoteExecutorSlaveFactory = await ethers.getContractFactory("VoteExecutorSlave");
    const VoteExecutorSlave = await upgrades.deployProxy(VoteExecutorSlaveFactory, 
        [gnosis, handler],
        { initializer: 'initialize', kind: 'uups' }
    ) as VoteExecutorSlave

    await VoteExecutorSlave.updateAllIbAlluoAddresses();
    await VoteExecutorSlave.setAnyCallAddresses(anyCallProxy, anyCallExecutor);
    await VoteExecutorSlave.setVoteExecutorMaster(VoteExecutorMasterAddress);

    // Make sure this is run by the multisig later on!!!
    // Please double check ibAlluo addresses
    // const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000"
    // let ibAlluoUSD = await ethers.getContractAt("IbAlluo","0xC2DbaAEA2EfA47EBda3E572aa0e55B742E408BF6")
    // await ibAlluoUSD.grantRole(DEFAULT_ADMIN_ROLE, VoteExecutorSlave.address)

    // let ibAlluoEUR = await ethers.getContractAt("IbAlluo","0xc9d8556645853C465D1D5e7d2c81A0031F0B8a92")
    // await ibAlluoEUR.grantRole(DEFAULT_ADMIN_ROLE, VoteExecutorSlave.address)

    // let ibAlluoETH = await ethers.getContractAt("IbAlluo","0xc677B0918a96ad258A68785C2a3955428DeA7e50")
    // await ibAlluoETH.grantRole(DEFAULT_ADMIN_ROLE, VoteExecutorSlave.address)

    
    // let ibAlluoBTC = await ethers.getContractAt("IbAlluo","0xf272Ff86c86529504f0d074b210e95fc4cFCDce2")
    // await ibAlluoBTC.grantRole(DEFAULT_ADMIN_ROLE, VoteExecutorSlave.address)



    console.log("Address:", VoteExecutorSlave.address);
    console.log("Step 3: Completed deployment of VoteExecutorSlave , please run setVoteExecutorSlave using", VoteExecutorSlave.address)
    console.log("Please grantRole to VoteExecutorSlave for ibAlluo : EUR, USD, ETH, BTC so it can call admin functions");
}
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

//npx hardhat run scripts/deploy/deployVoteExecutorSlave.ts --network polygon