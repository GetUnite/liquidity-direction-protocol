import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { formatEther, parseEther } from "ethers/lib/utils";
import { ethers, network, upgrades } from "hardhat";
import { AlluoLockedV4, CvxDistributor, IAlluoToken, ICurveCVXETH, IERC20Metadata, TestERC20, VoteExecutor, VoteExecutorV2 } from "../../typechain";

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

describe("Locking contract with CVX", async () => {
    let accounts: SignerWithAddress[];
    let admin: SignerWithAddress, cvxWhale: SignerWithAddress;

    let alluoToken: IAlluoToken, cvx: IERC20Metadata, cvxEthPool: ICurveCVXETH, cvxEthToken: IERC20Metadata;

    let locker: AlluoLockedV4, cvxDistributor: CvxDistributor, voteExecutor: VoteExecutorV2;

    before(async function () {
        //We are forking Ethereum mainnet, please set Alchemy key in .env
        await network.provider.request({
            method: "hardhat_reset",
            params: [{
                forking: {
                    enabled: true,
                    jsonRpcUrl: process.env.MAINNET_FORKING_URL as string,
                    //you can fork from the last block by commenting next line
                    blockNumber: 15811782,
                },
            },],
        });

        accounts = await ethers.getSigners();
        alluoToken = await ethers.getContractAt("IAlluoToken", "0x1E5193ccC53f25638Aa22a940af899B692e10B09");
        admin = await getImpersonatedSigner("0x1F020A4943EB57cd3b2213A66b355CB662Ea43C3");
        cvxWhale = await getImpersonatedSigner("0x28c6c06298d514db089934071355e5743bf21d60");
        cvxEthPool = await ethers.getContractAt("ICurveCVXETH", "0xB576491F1E6e5E62f1d8F26062Ee822B40B0E0d4");
        cvxEthToken = await ethers.getContractAt("IERC20Metadata", "0x3A283D9c08E8b55966afb64C515f5143cf907611");
    });

    beforeEach(async () => {
        const Locker = await ethers.getContractFactory("AlluoLockedV4");

        locker = await upgrades.deployProxy(Locker,
            [
                admin.address,
                0,
            ],
            { initializer: 'initialize', kind: 'uups' }
        ) as AlluoLockedV4;

        const exchangeAddress = "0x29c66CF57a03d41Cfe6d9ecB6883aa0E2AbA21Ec";
        const VoteExecutorV2 = await ethers.getContractFactory("VoteExecutorV2");
        voteExecutor = await upgrades.deployProxy(VoteExecutorV2,
            [
                admin.address,
                exchangeAddress,
                []
            ],
            { initializer: 'initialize', kind: 'uups' }
        ) as VoteExecutorV2;

        locker = await upgrades.deployProxy(Locker,
            [
                admin.address,
                0,
            ],
            { initializer: 'initialize', kind: 'uups' }
        ) as AlluoLockedV4;

        cvx = await ethers.getContractAt("IERC20Metadata", "0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B");

        const CvxDistributor = await ethers.getContractFactory("CvxDistributor");

        cvxDistributor = await upgrades.deployProxy(CvxDistributor,
            [
                admin.address,
                locker.address,
                cvx.address,
                exchangeAddress
            ],
            { initializer: 'initialize', kind: 'uups' }
        ) as CvxDistributor;

        await locker.setCvxDistributor(cvxDistributor.address);

        await alluoToken.connect(admin).mint(accounts[0].address, parseEther("2000000"))

        await alluoToken.transfer(accounts[1].address, parseEther("2500"));
        await alluoToken.transfer(accounts[2].address, parseEther("7000"));
        await alluoToken.transfer(accounts[3].address, parseEther("3500"));
        await alluoToken.transfer(accounts[4].address, parseEther("35000"));

        await alluoToken.approve(locker.address, parseEther("1000000"));
        await locker.addReward(parseEther("1000000"))

        // scope - delivery of CVX LP tokens to distribute to lockers
        // Note - in this scope, CVX tokens are manually deposited in CVX-ETH pool, LP token is transferred to
        //        cvxDistributor and then cvxDistributor is notified about incoming LPs. Real case scenario
        //        requires all this process to be done by VoteExecutorV2.deliverRewards
        await cvxDistributor.connect(admin).grantRole(await cvxDistributor.PROTOCOL_ROLE(), accounts[0].address);

        await cvx.connect(cvxWhale).approve(cvxEthPool.address, parseEther("100000"));
        await cvxEthPool.connect(cvxWhale)["add_liquidity(uint256[2],uint256)"]([0, parseEther("100000")], 0);

        const cvxEthBalance = await cvxEthToken.balanceOf(cvxWhale.address);
        await cvxEthToken.connect(cvxWhale).transfer(cvxDistributor.address, cvxEthBalance);
        // end scope

        await alluoToken.connect(accounts[1]).approve(locker.address, parseEther("2500"));
        await alluoToken.connect(accounts[2]).approve(locker.address, parseEther("7000"));
        await alluoToken.connect(accounts[3]).approve(locker.address, parseEther("3500"));
        await alluoToken.connect(accounts[4]).approve(locker.address, parseEther("35000"));
    })

    afterEach(async () => {
        await alluoToken.connect(admin).burn(accounts[1].address, await alluoToken.balanceOf(accounts[1].address))
        await alluoToken.connect(admin).burn(accounts[2].address, await alluoToken.balanceOf(accounts[2].address))
        await alluoToken.connect(admin).burn(accounts[3].address, await alluoToken.balanceOf(accounts[3].address))
        await alluoToken.connect(admin).burn(accounts[4].address, await alluoToken.balanceOf(accounts[4].address))
    })

    it("Should allow lock/unlock + withdraw", async () => {
        await locker.connect(accounts[1]).lock(parseEther("1000"));
        await skipDays(7);

        await locker.connect(accounts[1]).unlockAll();
        await skipDays(5);

        await locker.connect(accounts[1]).withdraw();
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

    it("If there only one locker all rewards will go to him", async function () {
        await locker.connect(admin).setReward(parseEther("86400"));
        const cvxEthBalance = await cvxEthToken.balanceOf(cvxDistributor.address);
        await cvxDistributor.receiveReward(cvxEthBalance)
        const cvxLpPerDay = cvxEthBalance.div(14);
        const cvxPerDay = await cvxEthPool.calc_withdraw_one_coin(
            cvxLpPerDay,
            1
        );

        await locker.connect(accounts[1]).lock(parseEther("2500"));
        await skipDays(1);

        let claim = await locker.getClaim(accounts[1].address);
        let claimCvx = await cvxDistributor.getClaim(accounts[1].address);

        expect(claim).to.be.gte(parseEther("86400"));
        expect(claim).to.be.lte(parseEther("86544"));

        // check claimCvx to be in +-5% of calculated amount
        expect(claimCvx).to.be.gte(cvxPerDay.div(100).mul(95));
        expect(claimCvx).to.be.lte(cvxPerDay.div(100).mul(105));

        await skipDays(1);

        await locker.connect(accounts[1]).claim();
        claim = await alluoToken.balanceOf(accounts[1].address);
        claimCvx = await cvx.balanceOf(accounts[1].address);

        expect(claim).to.be.gt(parseEther("172800"));
        expect(claim).to.be.lt(parseEther("172900"));

        // check claimCvx to be in +-5% calculated amount
        expect(claimCvx).to.be.gte(cvxPerDay.mul(2).div(100).mul(95));
        expect(claimCvx).to.be.lte(cvxPerDay.mul(2).div(100).mul(105));
    });

    it("If there are two lockers lock at the same time rewards are distributed between them equally", async () => {
        await locker.connect(admin).setReward(parseEther("86400"))
        const cvxEthBalance = await cvxEthToken.balanceOf(cvxDistributor.address);
        await cvxDistributor.receiveReward(cvxEthBalance)
        const cvxLpPerDay = cvxEthBalance.div(14);
        const cvxPerDay = await cvxEthPool.calc_withdraw_one_coin(
            cvxLpPerDay,
            1
        );

        await locker.connect(accounts[1]).lock(parseEther("2500"));
        await locker.connect(accounts[2]).lock(parseEther("2500"));
        await skipDays(1);

        let claim = await locker.getClaim(accounts[1].address);
        let claimCvx = await cvxDistributor.getClaim(accounts[1].address);

        expect(claim).to.be.gt(parseEther("43200"));
        expect(claim).to.be.lt(parseEther("43207"));
        // check claimCvx to be in +-5% of calculated amount
        expect(claimCvx).to.be.gte(cvxPerDay.div(2).div(100).mul(95));
        expect(claimCvx).to.be.lte(cvxPerDay.div(2).div(100).mul(105));


        await skipDays(1);

        const cvxBalanceBefore = await cvx.balanceOf(accounts[1].address);
        await locker.connect(accounts[1]).claim();
        await locker.connect(accounts[2]).claim();
        let endBalance = await alluoToken.balanceOf(accounts[1].address);
        let endBalanceCvx = await cvx.balanceOf(accounts[1].address);
        expect(endBalance).to.be.gt(parseEther("86400"));
        expect(endBalance).to.be.lt(parseEther("86410"));

        // check claimCvx to be in +-5% of calculated amount
        expect(endBalanceCvx.sub(cvxBalanceBefore)).to.be.gte(cvxPerDay.div(100).mul(95));
        expect(endBalanceCvx.sub(cvxBalanceBefore)).to.be.lte(cvxPerDay.div(100).mul(105));
    })

    it("Check rewards management cycle works properly", async () => {
        const cvxEthBalance = await cvxEthToken.balanceOf(cvxDistributor.address);
        await cvxDistributor.receiveReward(cvxEthBalance.div(3))
        skipDays(14);
        await cvxDistributor.receiveReward(cvxEthBalance.div(3))
        skipDays(100);
        await cvxDistributor.receiveReward(cvxEthBalance.div(3))
    });
});