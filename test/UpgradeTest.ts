// import { parseEther, parseUnits } from "@ethersproject/units";
// import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
// import { expect } from "chai";
// import { Address } from "cluster";
// import { BigNumber, BigNumberish, BytesLike } from "ethers";
// import { ethers, network, upgrades } from "hardhat";
// import { IERC20, PseudoMultisigWallet, PseudoMultisigWallet__factory, IbAlluo, IbAlluo__factory, LiquidityHandler, UsdCurveAdapter, LiquidityHandler__factory, UsdCurveAdapter__factory, EurCurveAdapter, EthNoPoolAdapter, EurCurveAdapter__factory, EthNoPoolAdapter__factory, BtcCurveAdapter } from "../typechain";


// async function getImpersonatedSigner(address: string): Promise<SignerWithAddress> {
//     await ethers.provider.send(
//         'hardhat_impersonateAccount',
//         [address]
//     );
//     return await ethers.getSigner(address);
// }

// async function sendEth(users: SignerWithAddress[]) {
//     let signers = await ethers.getSigners();

//     for (let i = 0; i < users.length; i++) {
//         await signers[0].sendTransaction({
//             to: users[i].address,
//             value: parseEther("1.0")

//         });
//     }
// }

// describe("Upgradability test of all mainnet contracts ", function () {

//     let signers: SignerWithAddress[];
//     let admin: SignerWithAddress;

//     before(async function () {

//         //put this to config
//         // hardhat: {
//         //     chainId: 1,
//         //     forking: {
//         //       enabled: true,
//         //       url: process.env.MAINNET_FORKING_URL as string,
//         //       blockNumber: 15361830
//         //     }
//         //   },

//         signers = await ethers.getSigners();

//         admin = await getImpersonatedSigner("0x1F020A4943EB57cd3b2213A66b355CB662Ea43C3");

//         await (await (await ethers.getContractFactory("ForceSender")).deploy({
//             value: parseEther("10.0")
//         })).forceSend(admin.address);

//     });

//     beforeEach(async function () {

//     });

//     describe('Should upgrade all contracts', function () {

//         it("", async function () {
//             const ExecutorV3 = await ethers.getContractFactory("VoteExecutorMaster");
//             let executorV3 = await ethers.getContractAt("VoteExecutorMaster", "0x4Fd58328C2e0dDa1Ea8f4C70321C91B366582eA2")
//             const upgradernRole = await executorV3.UPGRADER_ROLE()
//             await executorV3.connect(admin).grantRole(upgradernRole, signers[0].address)
//             await executorV3.connect(admin).changeUpgradeStatus(true)
//             await upgrades.upgradeProxy('0x4Fd58328C2e0dDa1Ea8f4C70321C91B366582eA2', ExecutorV3);

//             // const ExecutorV2 = await ethers.getContractFactory("VoteExecutorV2");
//             // let executorV2 = await ethers.getContractAt("VoteExecutorV2", "0xF5FF6A941516AF0D8311b98B77D011910f2559C4")
//             // await executorV2.connect(admin).grantRole(upgradernRole, signers[0].address)
//             // await executorV2.connect(admin).changeUpgradeStatus(true)
//             // await upgrades.upgradeProxy('0xF5FF6A941516AF0D8311b98B77D011910f2559C4', ExecutorV2);

//             const Locker = await ethers.getContractFactory("AlluoLockedV3");
//             let locker = await ethers.getContractAt("AlluoLockedV3", "0xF295EE9F1FA3Df84493Ae21e08eC2e1Ca9DebbAf")
//             await locker.connect(admin).grantRole(upgradernRole, signers[0].address)
//             await locker.connect(admin).changeUpgradeStatus(true)
//             await upgrades.upgradeProxy('0xF295EE9F1FA3Df84493Ae21e08eC2e1Ca9DebbAf', Locker);

//             const Handler = await ethers.getContractFactory("LiquidityHandler");
//             let handler = await ethers.getContractAt("LiquidityHandler", "0xc92b9C37a1BF006B8e854b2fa03FF957B2681502")
//             await handler.connect(admin).grantRole(upgradernRole, signers[0].address)
//             await handler.connect(admin).changeUpgradeStatus(true)
//             await upgrades.upgradeProxy('0xc92b9C37a1BF006B8e854b2fa03FF957B2681502', Handler);

//             const IbAlluoMainnet = await ethers.getContractFactory("IbAlluoMainnet");
//             let ibAlluoMainnet = await ethers.getContractAt("IbAlluoMainnet", "0xF555B595D04ee62f0EA9D0e72001D926a736A0f6")
//             await ibAlluoMainnet.connect(admin).grantRole(upgradernRole, signers[0].address)
//             await ibAlluoMainnet.connect(admin).changeUpgradeStatus(true)
//             await upgrades.upgradeProxy('0xF555B595D04ee62f0EA9D0e72001D926a736A0f6', IbAlluoMainnet);

//             ibAlluoMainnet = await ethers.getContractAt("IbAlluoMainnet", "0xeb38D2f6a745Bd3f466F3F20A617D2C615b316eE")
//             await ibAlluoMainnet.connect(admin).grantRole(upgradernRole, signers[0].address)
//             await ibAlluoMainnet.connect(admin).changeUpgradeStatus(true)
//             await upgrades.upgradeProxy('0xeb38D2f6a745Bd3f466F3F20A617D2C615b316eE', IbAlluoMainnet);

//             ibAlluoMainnet = await ethers.getContractAt("IbAlluoMainnet", "0x98f49aC358187116462BDEA748daD1Df480865d7")
//             await ibAlluoMainnet.connect(admin).grantRole(upgradernRole, signers[0].address)
//             await ibAlluoMainnet.connect(admin).changeUpgradeStatus(true)
//             await upgrades.upgradeProxy('0x98f49aC358187116462BDEA748daD1Df480865d7', IbAlluoMainnet);

//             ibAlluoMainnet = await ethers.getContractAt("IbAlluoMainnet", "0xb4FFDec68c297B278D757C49c5094dde53f2F878")
//             await ibAlluoMainnet.connect(admin).grantRole(upgradernRole, signers[0].address)
//             await ibAlluoMainnet.connect(admin).changeUpgradeStatus(true)
//             await upgrades.upgradeProxy('0xb4FFDec68c297B278D757C49c5094dde53f2F878', IbAlluoMainnet);
//         });
//     });


// });