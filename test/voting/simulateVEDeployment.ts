// import { parseEther, parseUnits } from "@ethersproject/units";
// import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
// import { expect } from "chai";
// import { BigNumber, BigNumberish, BytesLike, Wallet } from "ethers";
// import { defaultAbiCoder } from "ethers/lib/utils";
// import { ethers, network, upgrades } from "hardhat";
// import { before } from "mocha";
// import { ERC20, IbAlluo, IbAlluo__factory, PseudoMultisigWallet, VoteExecutorSlave, VoteExecutorSlave__factory, VoteExecutorMaster} from "../typechain";

// function getInterestPerSecond(apyDecimal: number): BigNumber {
//     return BigNumber.from(String(Math.round(Math.pow(apyDecimal, 1/31536000)*10**17)))
// }

// async function getImpersonatedSigner(address: string): Promise<SignerWithAddress> {
//     await ethers.provider.send(
//         'hardhat_impersonateAccount',
//         [address]
//     );

//     return await ethers.getSigner(address);
// }


// describe("Test L2 Contracts", function() {
   
//     before(async function () {
//         //We are forking Polygon mainnet, please set Alchemy key in .env
//         await network.provider.request({
//             method: "hardhat_reset",
//             params: [{
//                 forking: {
//                     enabled: true,
//                     jsonRpcUrl: process.env.MAINNET_FORKING_URL as string,
//                     //you can fork from last block by commenting next line
//                     // blockNumber: 28729129,
//                 },
//             },],
//         });


    

//         console.log("Now forking mainnet")
//     })

//     it("check deploy", async function() {
//         // Please double check the addresses below and MinSigns
//         let gnosis = "0x1F020A4943EB57cd3b2213A66b355CB662Ea43C3";
//         let admin = await getImpersonatedSigner(gnosis)

//         await network.provider.send("hardhat_setBalance", [
//             gnosis, parseEther("10000000000")._hex
//           ]);

//         let locker = "0xF295EE9F1FA3Df84493Ae21e08eC2e1Ca9DebbAf";
//         let anyCall = "0xC10Ef9F491C9B59f936957026020C321651ac078";
//         let timelock = 0;
//         let MinSigns = 2;

//         let VoteExecutorMasterFactory = await ethers.getContractFactory("VoteExecutorMaster");
//         let VoteExecutorMaster = await upgrades.deployProxy(VoteExecutorMasterFactory, 
//             [gnosis, locker, anyCall, timelock],
//             { initializer: 'initialize', kind: 'uups' }
//         ) as VoteExecutorMaster

//         await VoteExecutorMaster.connect(admin).setMinSigns(MinSigns);

//         console.log("Address:", VoteExecutorMaster.address);
//         console.log("Completed deployment of VoteExecutorMaster , please now deployVoteExecutorSlave by putting",VoteExecutorMaster.address )

//     let encodedAPYETH = await VoteExecutorMaster.callStatic.encodeApyCommand("IbAlluoETH",1500, getInterestPerSecond(1.15));
//     let encodedAPYUSD = await VoteExecutorMaster.callStatic.encodeApyCommand("IbAlluoUSD",2000, getInterestPerSecond(1.20));
//     let encodedAPYEUR = await VoteExecutorMaster.callStatic.encodeApyCommand("IbAlluoEUR",3000, getInterestPerSecond(1.30));

//     let commandIndexes = [encodedAPYETH[0], encodedAPYUSD[0], encodedAPYEUR[0]];
//     let commandDatas = [encodedAPYETH[1], encodedAPYUSD[1], encodedAPYEUR[1]];

//     let messages = await VoteExecutorMaster.callStatic.encodeAllMessages(commandIndexes, commandDatas);
//         await network.provider.request({
//             method: "hardhat_reset",
//             params: [{
//                 forking: {
//                     enabled: true,
//                     jsonRpcUrl: process.env.POLYGON_FORKING_URL as string,
//                     //you can fork from last block by commenting next line
//                     // blockNumber: 28729129,
//                 },
//             },],
//         });

        
//         console.log("Now forking polygon")
//     //         // Please add the address of VoteExecutorMaster on mainnet and doublecheck the addresses below.
//     let VoteExecutorMasterAddress = VoteExecutorMaster.address;
//     gnosis = "0x2580f9954529853Ca5aC5543cE39E9B5B1145135";
//     await network.provider.send("hardhat_setBalance", [
//         gnosis, parseEther("10000000000")._hex
//       ]);

//     admin = await getImpersonatedSigner(gnosis)

//     let handler = "0x31a3439Ac7E6Ea7e0C0E4b846F45700c6354f8c1"
//     let anyCallProxy = "0xC10Ef9F491C9B59f936957026020C321651ac078"
//     let anyCallExecutor = "0x0C9f0ea6317038c9D7180Cf4A0aEeB58478D13A4"


//     const VoteExecutorSlaveFactory = await ethers.getContractFactory("VoteExecutorSlave");
//     let VoteExecutorSlave = await upgrades.deployProxy(VoteExecutorSlaveFactory, 
//         [gnosis, handler],
//         { initializer: 'initialize', kind: 'uups' }
//     ) as VoteExecutorSlave

//     await VoteExecutorSlave.connect(admin).updateAllIbAlluoAddresses();
//     await VoteExecutorSlave.connect(admin).setAnyCallAddresses(anyCallProxy, anyCallExecutor);
//     await VoteExecutorSlave.connect(admin).setVoteExecutorMaster(VoteExecutorMasterAddress);

//     // Make sure this is run by the multisig later on.
//     // Please double check ibAlluo addresses
//     const DEFAULT_ADMIN_ROLE = "0x0000000000000000000000000000000000000000000000000000000000000000"
//     let ibAlluoUSD = await ethers.getContractAt("IbAlluo","0xC2DbaAEA2EfA47EBda3E572aa0e55B742E408BF6")
//     await ibAlluoUSD.connect(admin).grantRole(DEFAULT_ADMIN_ROLE, VoteExecutorSlave.address)

//     let ibAlluoEUR = await ethers.getContractAt("IbAlluo","0xc9d8556645853C465D1D5e7d2c81A0031F0B8a92")
//     await ibAlluoEUR.connect(admin).grantRole(DEFAULT_ADMIN_ROLE, VoteExecutorSlave.address)

//     let ibAlluoETH = await ethers.getContractAt("IbAlluo","0xc677B0918a96ad258A68785C2a3955428DeA7e50")
//     await ibAlluoETH.connect(admin).grantRole(DEFAULT_ADMIN_ROLE, VoteExecutorSlave.address)

    
//     let ibAlluoBTC = await ethers.getContractAt("IbAlluo","0xf272Ff86c86529504f0d074b210e95fc4cFCDce2")
//     await ibAlluoBTC.connect(admin).grantRole(DEFAULT_ADMIN_ROLE, VoteExecutorSlave.address)



//     console.log("Address:", VoteExecutorSlave.address);
//     console.log("Completed deployment of VoteExecutorSlave , please run setVoteExecutorSlave using", VoteExecutorSlave.address)
//     await network.provider.request({
//         method: "hardhat_reset",
//         params: [{

//         }]
//     })
//     await network.provider.request({
//         method: "hardhat_reset",
//         params: [{
//             forking: {
//                 enabled: true,
//                 jsonRpcUrl: process.env.MAINNET_FORKING_URL as string,
//                 //you can fork from last block by commenting next line
//                 // blockNumber: 28729129,
//             },
//         },],
//     });
//     console.log("Now forking mainnet")
//         // Set the addresses of the voteexecutors
//     gnosis = "0x1F020A4943EB57cd3b2213A66b355CB662Ea43C3";
//     admin = await getImpersonatedSigner(gnosis)
//     await network.provider.send("hardhat_setBalance", [
//         gnosis, parseEther("10000000000")._hex
//       ]);
//     VoteExecutorMasterAddress = VoteExecutorMaster.address
//     let VoteExecutorSlaveAddress = VoteExecutorSlave.address;
//     VoteExecutorMaster = await ethers.getContractAt("VoteExecutorMaster", VoteExecutorMasterAddress) as VoteExecutorMaster;
//     await VoteExecutorMaster.connect(admin).setVoteExecutorSlave(VoteExecutorSlaveAddress, 4002 );
    
//     console.log("All set, now check if we can add and execute data correctly");

//     await(await VoteExecutorMaster.submitData(messages[2])).wait()
//     console.log("Messages submitted")
    
//     let mneumonic  = process.env.MNEMONIC
//     if (typeof mneumonic !== "string") {
//         return
//     }
//     let wallet : Wallet;
//     wallet = Wallet.fromMnemonic(mneumonic)        
//     console.log(messages[0])
//     let signedData = await wallet.signMessage(ethers.utils.arrayify(messages[0]))
//     console.log(signedData);
//     await(await VoteExecutorMaster.approveSubmitedData(0, [signedData])).wait();
//     const tx = await VoteExecutorMaster.execute();
//     console.log(await VoteExecutorMaster.firstInQueueData());
//     expect(await VoteExecutorMaster.firstInQueueData()).equal(1)
//     console.log("All complete fully!")
    
//     }
//     )
// })
