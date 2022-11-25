import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers, network, upgrades } from "hardhat";
import { AlluoLockedV4, CvxDistributorV2 } from "../../typechain";

async function getImpersonatedSigner(address: string): Promise<SignerWithAddress> {
    await ethers.provider.send(
        'hardhat_impersonateAccount',
        [address]
    );

    return await ethers.getSigner(address);
}

async function skipDays(days: number) {
    ethers.provider.send("evm_increaseTime", [days * 86400]);
    ethers.provider.send("evm_mine", []);
}


describe("CvxDistributorV2 Extra tests", async () => {
    it("Testing migration and making sure users can claim correctly AND see accrued rewards", async() => {
            //We are forking Ethereum mainnet, please set Alchemy key in .env
        await network.provider.request({
            method: "hardhat_reset",
            params: [{
                forking: {
                    enabled: true,
                    jsonRpcUrl: process.env.MAINNET_FORKING_URL as string,
                    //you can fork from the last block by commenting next line
                    blockNumber: 16045107,
                },
            },],
        })
        const vlAlluoFactory = await ethers.getContractFactory("AlluoLockedV4");
        const cvxDistributorFactory = await ethers.getContractFactory("CvxDistributorV2");
        const admin = await getImpersonatedSigner("0x1F020A4943EB57cd3b2213A66b355CB662Ea43C3");
        const signers = await ethers.getSigners();

        const vlAlluo = await ethers.getContractAt("AlluoLockedV3", "0xdEBbFE665359B96523d364A19FceC66B0E43860D");
        const cvxDistributor = await ethers.getContractAt("CvxDistributor", "0xc22DB2874725B84e99EC0a644fdD042EA3F6F899");
        const cvxEth =  await ethers.getContractAt("IERC20Metadata", "0x3A283D9c08E8b55966afb64C515f5143cf907611");

        let user1 = await getImpersonatedSigner("0xfb7A51c6f6A5116Ac748C1aDF4D4682c3D50889E")
        let user2 = await getImpersonatedSigner("0x4F7C41c019561f5cD0377d4B721B032b5366aC35")
        await signers[0].sendTransaction({value:ethers.utils.parseEther("1"), to:user1.address})
        await signers[0].sendTransaction({value:ethers.utils.parseEther("1"), to: user2.address})


        await vlAlluo.connect(admin).changeUpgradeStatus(true);
        await cvxDistributor.connect(admin).changeUpgradeStatus(true);
        await vlAlluo.connect(admin).grantRole(await vlAlluo.UPGRADER_ROLE(), signers[0].address);
        await cvxDistributor.connect(admin).grantRole(await vlAlluo.UPGRADER_ROLE(), signers[0].address);

        const vlAlluoNew = await upgrades.upgradeProxy(
            vlAlluo.address,
            vlAlluoFactory
        ) as AlluoLockedV4;

        const cvxDistributorNew = await upgrades.upgradeProxy(
            cvxDistributor.address,
            cvxDistributorFactory
        ) as CvxDistributorV2;

        let upgradedCvxDistributor = await ethers.getContractAt("CvxDistributorV2", "0xc22DB2874725B84e99EC0a644fdD042EA3F6F899")
        await upgradedCvxDistributor.connect(admin).addStrategyHandler("0x385AB598E7DBF09951ba097741d2Fa573bDe94A5");

        await upgradedCvxDistributor.connect(admin).addCvxVault("0x2D182Fc86Cd4C38D9FE94566251A6aF1A85F784b");
        
        await upgradedCvxDistributor.connect(admin).migrate();

        await skipDays(1)
        let user1AccruedRewards = await upgradedCvxDistributor.connect(user1).stakerAccruedRewards(user1.address)
        let user2AccruedRewards = await upgradedCvxDistributor.connect(user2).stakerAccruedRewards(user2.address)
        console.log("User1 AccruedRewards", user1AccruedRewards)
        console.log("User2 AccruedRewards", user2AccruedRewards)

        let user1CvxEthBefore = await cvxEth.balanceOf(user1.address);
        let user2CvxEthBefore = await cvxEth.balanceOf(user2.address);

    
        await vlAlluoNew.connect(user1).claim();
        await vlAlluoNew.connect(user2).claim();


        let user1CvxEthAfter = await cvxEth.balanceOf(user1.address);
        let user2CvxEthAfter= await cvxEth.balanceOf(user2.address);

        console.log("User1 CvxEth Before and After", user1CvxEthBefore, user1CvxEthAfter)
        console.log("User2 CvxEth Before and After", user2CvxEthBefore, user2CvxEthAfter)

    })

})

