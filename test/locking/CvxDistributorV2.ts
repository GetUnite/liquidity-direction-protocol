import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { constants } from "ethers";
import { formatEther, formatUnits, parseEther, parseUnits } from "ethers/lib/utils";
import { ethers, network, upgrades } from "hardhat";
import { AlluoLockedV4, CvxDistributorV2, IAlluoToken, IAlluoVault, ICurveCVXETH, IERC20Metadata, IWrappedEther, VoteExecutor, VoteExecutorV2 } from "../../typechain-types";

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

describe("CvxDistributorV2", async () => {
    let accounts: SignerWithAddress[];
    let admin: SignerWithAddress, cvxWhale: SignerWithAddress;

    let alluoToken: IAlluoToken, usdc: IERC20Metadata, cvxEthToken: IERC20Metadata;

    let locker: AlluoLockedV4, cvxDistributorV2: CvxDistributorV2, weth: IWrappedEther, vault: IAlluoVault;


    before(async function () {
        //We are forking Ethereum mainnet, please set Alchemy key in .env
        await network.provider.request({
            method: "hardhat_reset",
            params: [{
                forking: {
                    enabled: true,
                    jsonRpcUrl: process.env.MAINNET_FORKING_URL as string,
                    //you can fork from the last block by commenting next line
                    blockNumber: 16038043,
                },
            },],
        });

        accounts = await ethers.getSigners();
        alluoToken = await ethers.getContractAt("IAlluoToken", "0x1E5193ccC53f25638Aa22a940af899B692e10B09");
        admin = await getImpersonatedSigner("0x1F020A4943EB57cd3b2213A66b355CB662Ea43C3");
        cvxWhale = await getImpersonatedSigner("0x28c6c06298d514db089934071355e5743bf21d60");
        cvxEthToken = await ethers.getContractAt("IERC20Metadata", "0x3A283D9c08E8b55966afb64C515f5143cf907611");
        usdc = await ethers.getContractAt("IERC20Metadata", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
        weth = await ethers.getContractAt("contracts/interfaces/IWrappedEther.sol:IWrappedEther", "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2") as IWrappedEther;
        vault = await ethers.getContractAt("IAlluoVault", "0x2D182Fc86Cd4C38D9FE94566251A6aF1A85F784b");
    });

    beforeEach(async () => {
        const Locker = await ethers.getContractFactory("AlluoLockedV4");
        const exchangeAddress = "0x29c66CF57a03d41Cfe6d9ecB6883aa0E2AbA21Ec";

        locker = await upgrades.deployProxy(Locker,
            [
                admin.address,
                0,
            ],
            { initializer: 'initialize', kind: 'uups' }
        ) as AlluoLockedV4;

        const CvxDistributorV2 = await ethers.getContractFactory("CvxDistributorV2");

        cvxDistributorV2 = await upgrades.deployProxy(CvxDistributorV2,
            [
                admin.address,
                locker.address,
                cvxEthToken.address,
                exchangeAddress
            ],
            { initializer: 'initialize', kind: 'uups' }
        ) as CvxDistributorV2;

        await locker.setCvxDistributor(cvxDistributorV2.address);

        await alluoToken.connect(admin).mint(accounts[0].address, parseEther("2000000"))

        await alluoToken.transfer(accounts[1].address, parseEther("2500"));
        await alluoToken.transfer(accounts[2].address, parseEther("7000"));
        await alluoToken.transfer(accounts[3].address, parseEther("3500"));
        await alluoToken.transfer(accounts[4].address, parseEther("35000"));

        await alluoToken.approve(locker.address, parseEther("1000000"));
        await locker.addReward(parseEther("1000000"))

        await cvxDistributorV2.connect(admin).grantRole(await cvxDistributorV2.PROTOCOL_ROLE(), accounts[0].address);

        await cvxDistributorV2.connect(admin).addStrategyHandler("0x385AB598E7DBF09951ba097741d2Fa573bDe94A5");
        await cvxDistributorV2.connect(admin).addCvxVault(vault.address);

        await alluoToken.connect(accounts[1]).approve(locker.address, parseEther("2500"));
        await alluoToken.connect(accounts[2]).approve(locker.address, parseEther("7000"));
        await alluoToken.connect(accounts[3]).approve(locker.address, parseEther("3500"));
        await alluoToken.connect(accounts[4]).approve(locker.address, parseEther("35000"));

        await cvxDistributorV2.connect(admin).multicall(
            [cvxEthToken.address],
            [
                cvxEthToken.interface.encodeFunctionData(
                    'approve',
                    [
                        vault.address,
                        constants.MaxUint256
                    ]
                )
            ]
        )
    })

    afterEach(async () => {
        await alluoToken.connect(admin).burn(accounts[1].address, await alluoToken.balanceOf(accounts[1].address))
        await alluoToken.connect(admin).burn(accounts[2].address, await alluoToken.balanceOf(accounts[2].address))
        await alluoToken.connect(admin).burn(accounts[3].address, await alluoToken.balanceOf(accounts[3].address))
        await alluoToken.connect(admin).burn(accounts[4].address, await alluoToken.balanceOf(accounts[4].address))
    })

    it("Should upgrade correctly", async () => {
        const OldCvxDistributor = await ethers.getContractFactory("CvxDistributor");
        const oldCvxDistributor = await upgrades.deployProxy(OldCvxDistributor,
            [
                accounts[0].address,
                locker.address,
                cvxEthToken.address,
                constants.AddressZero
            ],
            { initializer: 'initialize', kind: 'uups' }
        ) as CvxDistributorV2;

        await oldCvxDistributor.grantRole(
            await oldCvxDistributor.UPGRADER_ROLE(),
            accounts[0].address
        )
        await oldCvxDistributor.changeUpgradeStatus(true);

        const NewCvxDistributor = await ethers.getContractFactory("CvxDistributor");

        await upgrades.upgradeProxy(
            oldCvxDistributor,
            NewCvxDistributor
        );
    })

    it("Should allow lock/unlock + withdraw", async () => {
        await locker.connect(accounts[1]).lock(parseEther("1000"));
        await locker.connect(accounts[2]).lock(parseEther("1000"));
        await skipDays(7);

        await locker.connect(accounts[1]).unlockAll();
        await locker.connect(accounts[2]).unlockAll();
        await skipDays(5);

        await locker.connect(accounts[1]).withdraw();
        await locker.connect(accounts[2]).withdraw();
    })

    it("Should allow unlock specified amount", async function () {
        await locker.connect(accounts[1]).lock(parseEther("1000"));
        await skipDays(7);

        let lp = parseEther("500")
        await locker.connect(accounts[1]).unlock(lp);

        await skipDays(6);
        await locker.connect(accounts[1]).withdraw();

        let balance = await alluoToken.balanceOf(accounts[1].address);
        expect(balance).to.be.lte(parseEther("2000"));
        expect(balance).to.be.gt(parseEther("1999"));
    });

    it("Should update reward (WETH + USDC) + check exchangePrimaryTokens after update", async () => {
        await weth.deposit({ value: parseEther("1.0") });
        console.log("Admin owns", formatUnits(await usdc.balanceOf(admin.address), 6), "USDC");

        await weth.transfer(cvxDistributorV2.address, parseEther("1.0"));
        await usdc.connect(admin).transfer(cvxDistributorV2.address, parseUnits("100.0", 6));

        const balanceBefore = await vault.balanceOf(cvxDistributorV2.address);
        await cvxDistributorV2.updateReward(true, true);
        console.log("Deposited")
        const balanceAfter = await vault.balanceOf(cvxDistributorV2.address);
        expect(balanceAfter).to.be.gt(balanceBefore);

        const tx = await (await cvxDistributorV2.exchangePrimaryTokens()).wait();
        console.log("Events in exchangePrimaryTokens", tx.events?.length);
    })

    it("Should update reward (WETH + USDC) + check exchangePrimaryTokens before update", async () => {
        await weth.deposit({ value: parseEther("1.0") });
        console.log("Admin owns", formatUnits(await usdc.balanceOf(admin.address), 6), "USDC");

        await weth.transfer(cvxDistributorV2.address, parseEther("1.0"));
        await usdc.connect(admin).transfer(cvxDistributorV2.address, parseUnits("100.0", 6));

        const tx = await (await cvxDistributorV2.exchangePrimaryTokens()).wait();
        console.log("Events in exchangePrimaryTokens", tx.events?.length);

        const balanceBefore = await vault.balanceOf(cvxDistributorV2.address);
        await cvxDistributorV2.updateReward(true, true);
        const balanceAfter = await vault.balanceOf(cvxDistributorV2.address);
        expect(balanceAfter).to.be.gt(balanceBefore);

        console.log("Deposited")
    })

    it("Should not fail when making empty updateReward", async () => {
        await cvxDistributorV2.updateReward(true, true);
        await cvxDistributorV2.updateReward(true, false);
        await cvxDistributorV2.updateReward(false, true);
        await cvxDistributorV2.updateReward(false, false);
    })

    it("If there only one locker all rewards will go to him", async function () {
        await locker.connect(admin).setReward(parseEther("86400"));

        expect(await vault.balanceOf(cvxDistributorV2.address)).to.be.equal(0);
        await weth.deposit({ value: parseEther("1.0") });
        await weth.transfer(cvxDistributorV2.address, parseEther("1.0"));
        await cvxDistributorV2.updateReward(true, true);

        const cvxEthBalance = await vault.balanceOf(cvxDistributorV2.address);
        const cvxLpPerDay = cvxEthBalance.div(14);

        await locker.connect(accounts[1]).lock(parseEther("2500"));
        await skipDays(1);

        let claim = await locker.getClaim(accounts[1].address);
        let claimCvx = await cvxDistributorV2.getClaim(accounts[1].address);

        expect(claim).to.be.gte(parseEther("86400"));
        expect(claim).to.be.lte(parseEther("86406"));

        // check claimCvx to be in +-5% of calculated amount
        expect(claimCvx).to.be.gte(cvxLpPerDay.div(100).mul(95));
        expect(claimCvx).to.be.lte(cvxLpPerDay.div(100).mul(105));

        await skipDays(1);

        await locker.connect(accounts[1]).claim();
        claim = await alluoToken.balanceOf(accounts[1].address);
        claimCvx = await cvxEthToken.balanceOf(accounts[1].address);

        expect(claim).to.be.gt(parseEther("172800"));
        expect(claim).to.be.lt(parseEther("172808"));

        // check claimCvx to be in +-5% calculated amount
        expect(claimCvx).to.be.gte(cvxLpPerDay.mul(2).div(100).mul(95));
        expect(claimCvx).to.be.lte(cvxLpPerDay.mul(2).div(100).mul(105));
    });

    it("If there are two lockers lock at the same time rewards are distributed between them equally", async () => {
        await locker.connect(admin).setReward(parseEther("86400"))

        expect(await vault.balanceOf(cvxDistributorV2.address)).to.be.equal(0);
        await weth.deposit({ value: parseEther("1.0") });
        await weth.transfer(cvxDistributorV2.address, parseEther("1.0"));
        await cvxDistributorV2.updateReward(true, true);

        const cvxEthBalance = await vault.balanceOf(cvxDistributorV2.address);
        const cvxLpPerDay = cvxEthBalance.div(14);

        await locker.connect(accounts[1]).lock(parseEther("2500"));
        await locker.connect(accounts[2]).lock(parseEther("2500"));
        await skipDays(1);

        let claim = await locker.getClaim(accounts[1].address);
        let claimCvx = await cvxDistributorV2.getClaim(accounts[1].address);

        expect(claim).to.be.gt(parseEther("43200"));
        expect(claim).to.be.lt(parseEther("43207"));
        // check claimCvx to be in +-5% of calculated amount
        expect(claimCvx).to.be.gte(cvxLpPerDay.div(2).div(100).mul(95));
        expect(claimCvx).to.be.lte(cvxLpPerDay.div(2).div(100).mul(105));


        await skipDays(1);

        const cvxBalanceBefore = await cvxEthToken.balanceOf(accounts[1].address);
        await locker.connect(accounts[1]).claim();
        await locker.connect(accounts[2]).claim();
        let endBalance = await alluoToken.balanceOf(accounts[1].address);
        let endBalanceCvx = await cvxEthToken.balanceOf(accounts[1].address);
        expect(endBalance).to.be.gt(parseEther("86400"));
        expect(endBalance).to.be.lt(parseEther("86410"));

        // check claimCvx to be in +-5% of calculated amount
        expect(endBalanceCvx.sub(cvxBalanceBefore)).to.be.gte(cvxLpPerDay.div(100).mul(95));
        expect(endBalanceCvx.sub(cvxBalanceBefore)).to.be.lte(cvxLpPerDay.div(100).mul(105));
    })

    it("Should check migration", async () => {
        let cvxDistributorLive = await ethers.getContractAt("CvxDistributor", "0xc22DB2874725B84e99EC0a644fdD042EA3F6F899");
        const admin = await getImpersonatedSigner("0x1F020A4943EB57cd3b2213A66b355CB662Ea43C3");
        const vault = await ethers.getContractAt("IAlluoVault", "0x2D182Fc86Cd4C38D9FE94566251A6aF1A85F784b");
        const crv = await ethers.getContractAt("IERC20Metadata", "0xD533a949740bb3306d119CC777fa900bA034cd52");
        const cvx = await ethers.getContractAt("IERC20Metadata", "0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B");
        const weth = await ethers.getContractAt("IERC20Metadata", "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2");
        const cvxEthToken = await ethers.getContractAt("IERC20Metadata", "0x3A283D9c08E8b55966afb64C515f5143cf907611");

        await upgrades.forceImport(
            cvxDistributorLive.address,
            await ethers.getContractFactory("CvxDistributor")
        )

        await cvxDistributorLive.connect(admin).changeUpgradeStatus(true);
        await cvxDistributorLive.connect(admin).grantRole(
            await cvxDistributorLive.UPGRADER_ROLE(),
            accounts[0].address
        );

        const cvxDistributorV2 = await upgrades.upgradeProxy(
            cvxDistributorLive.address,
            await ethers.getContractFactory("CvxDistributorV2")
        ) as CvxDistributorV2;

        const booster = await ethers.getContractAt(
            "contracts/interfaces/curve/mainnet/ICvxBaseRewardPool.sol:ICvxBaseRewardPool",
            "0xb1Fb0BA0676A1fFA83882c7F4805408bA232C1fA"
        );

        let stakedInConvex = await booster.callStatic.balanceOf(cvxDistributorLive.address);

        console.log("Current balance of CvxDistributor in Convex:", formatUnits(stakedInConvex, 18), "LP");
        console.log("Current balance of CvxDistributor in Alluo Booster:", formatUnits(await vault.balanceOf(cvxDistributorLive.address), 18), "LP");

        console.log();
        console.log();
        await cvxDistributorV2.connect(admin).addCvxVault(vault.address);
        await (await cvxDistributorV2.connect(admin).migrate()).wait();

        stakedInConvex = await booster.callStatic.balanceOf(cvxDistributorLive.address);
        console.log("Balance of CvxDistributor in Convex after migration:", formatUnits(stakedInConvex, 18), "LP");
        console.log("Balance of CvxDistributor in Alluo Booster after migration (includes self-looped LPs):", formatUnits(await vault.balanceOf(cvxDistributorLive.address), 18), "LP");
        console.log("Balance of CVX after migration:", formatUnits(await cvx.balanceOf(cvxDistributorLive.address), 18), "CVX");
        console.log("Balance of CRV after migration:", formatUnits(await crv.balanceOf(cvxDistributorLive.address), 18), "CRV");
        console.log("Balance of WETH after migration:", formatUnits(await weth.balanceOf(cvxDistributorLive.address), 18), "WETH");
        console.log("Balance of ETH after migration:", formatUnits(await ethers.provider.getBalance(cvxDistributorLive.address), 18), "ETH");
        console.log("Balance of CRV-CVX after migration:", formatUnits(await cvxEthToken.balanceOf(cvxDistributorLive.address), 18), "ETH");

    })
})