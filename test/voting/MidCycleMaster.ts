import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ethers, network, upgrades } from "hardhat";
import { parseEther, parseUnits } from "ethers/lib/utils";

import { FundManager, VoteExecutorMasterLog, StrategyHandler } from "../../typechain-types";
import { expect } from "chai";

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

async function sendEth(users: SignerWithAddress[]) {
    let signers = await ethers.getSigners();

    for (let i = 0; i < users.length; i++) {
        await signers[0].sendTransaction({
            to: users[i].address,
            value: parseEther("1.0")

        });
    }
}

async function getTxFromExecPayload(from: string, to: string, txCheckerPayload: string) {
    const data = txCheckerPayload;
    const tx = {
        from: from,
        to: to,
        data: data,
    };
    return tx;
}


describe("FundManager Tests", () => {
    let FundManager: FundManager;
    let Gnosis: SignerWithAddress;
    let Signers: SignerWithAddress[];
    let VoteExecutorMaster: VoteExecutorMasterLog

    let usdcWhale: SignerWithAddress;
    let wethWhale: SignerWithAddress;
    let eurtWhale: SignerWithAddress;
    let btcWhale: SignerWithAddress;

    beforeEach(async function () {
        await network.provider.request({
            method: "hardhat_reset",
            params: [{
                forking: {
                    enabled: true,
                    jsonRpcUrl: process.env.MAINNET_FORKING_URL as string,
                    blockNumber: 16718949
                },
            },],
        });
        Gnosis = await getImpersonatedSigner("0x1F020A4943EB57cd3b2213A66b355CB662Ea43C3")
        Signers = await ethers.getSigners();
        usdcWhale = await getImpersonatedSigner("0x47ac0Fb4F2D84898e4D9E7b4DaB3C24507a6D503")
        wethWhale = await getImpersonatedSigner("0x8EB8a3b98659Cce290402893d0123abb75E3ab28")
        eurtWhale = await getImpersonatedSigner("0x5754284f345afc66a98fbB0a0Afe71e0F007B949")
        btcWhale = await getImpersonatedSigner("0x218B95BE3ed99141b0144Dba6cE88807c4AD7C09")
        await sendEth([Gnosis, btcWhale])
        VoteExecutorMaster = await ethers.getContractAt("VoteExecutorMasterLog", "0x82e568C482dF2C833dab0D38DeB9fb01777A9e89")
        FundManager = await ethers.getContractAt("FundManager", "0xBac731029f8F92D147Acc701aB1B4B099C31A3c4")

        let newVoteExecutorMaster = await ethers.getContractFactory("VoteExecutorMasterLog")
        let newContract = await newVoteExecutorMaster.deploy()
        await VoteExecutorMaster.connect(Gnosis).changeUpgradeStatus(true);
        await VoteExecutorMaster.connect(Gnosis).upgradeTo(newContract.address);

        // Get tx payload for infinite approval to the VoteExecutorMaster contract
        let abi = [
            "function approve(address spender, uint256 amount) public returns (bool)",
        ]
        let approveMax = new ethers.utils.Interface(abi).encodeFunctionData("approve", [VoteExecutorMaster.address, ethers.constants.MaxUint256])
        let USDC = await ethers.getContractAt("IERC20", "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48")
        let WETH = await ethers.getContractAt("IERC20", "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2")
        let EURT = await ethers.getContractAt("IERC20", "0xC581b735A1688071A1746c968e0798D642EDE491")
        let WBTC = await ethers.getContractAt("IERC20", "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599")
        await FundManager.connect(Gnosis).multicall([USDC.address, WETH.address, EURT.address, WBTC.address], [approveMax, approveMax, approveMax, approveMax])
        expect(await USDC.allowance(FundManager.address, VoteExecutorMaster.address)).to.equal(ethers.constants.MaxUint256)
        expect(await WETH.allowance(FundManager.address, VoteExecutorMaster.address)).to.equal(ethers.constants.MaxUint256)
        expect(await EURT.allowance(FundManager.address, VoteExecutorMaster.address)).to.equal(ethers.constants.MaxUint256)
        expect(await WBTC.allowance(FundManager.address, VoteExecutorMaster.address)).to.equal(ethers.constants.MaxUint256)
    });


    describe("New VoteExecutorMaster synergies with MidCycle deployer", () => {
        it("If the mid cycle deployer has funds, the executor should pull all of it into the main contract to be deployed.", async () => {
            // Send some usdc, weth, eurt and wbtc to the fundManager to simulate accumulated deposits
            let USDC = await ethers.getContractAt("IERC20", "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48")
            await USDC.connect(usdcWhale).transfer(FundManager.address, ethers.utils.parseUnits("10000", 6))
            let WETH = await ethers.getContractAt("IERC20", "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2")
            await WETH.connect(wethWhale).transfer(FundManager.address, ethers.utils.parseUnits("10", 18))
            let EURT = await ethers.getContractAt("IERC20", "0xC581b735A1688071A1746c968e0798D642EDE491")
            await EURT.connect(eurtWhale).transfer(FundManager.address, ethers.utils.parseUnits("10000", 6))
            let WBTC = await ethers.getContractAt("IERC20", "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599")
            await WBTC.connect(btcWhale).transfer(FundManager.address, ethers.utils.parseUnits("0.3", 8))


            // Expect that the FundManager balance of USDC, WETH, EURT and WBTC is 10000, 10, 10000 and 0.3 respectively
            expect(await USDC.balanceOf(FundManager.address)).to.equal(ethers.utils.parseUnits("10000", 6))
            expect(await WETH.balanceOf(FundManager.address)).to.equal(ethers.utils.parseUnits("10", 18))
            expect(await EURT.balanceOf(FundManager.address)).to.equal(ethers.utils.parseUnits("10000", 6))
            expect(await WBTC.balanceOf(FundManager.address)).to.equal(ethers.utils.parseUnits("0.3", 8))

            // Execute some vote through the VoteExecutorMaster
            // First set min signs to 0 through gnosis
            await VoteExecutorMaster.connect(Gnosis).setMinSigns(0);

            let APYVote = await VoteExecutorMaster.encodeApyCommand("IbAlluoUSD", 700, "100000000154712595")
            let encodedVote = await VoteExecutorMaster.encodeAllMessages([APYVote[0]], [APYVote[1]])

            // Submit the vote
            await VoteExecutorMaster.submitData(encodedVote[2])
            await VoteExecutorMaster.connect(Gnosis).executeSpecificData(8)

            // Now expect that the FundManager balances are zero
            expect(await USDC.balanceOf(FundManager.address)).to.equal(0)
            expect(await WETH.balanceOf(FundManager.address)).to.equal(0)
            expect(await EURT.balanceOf(FundManager.address)).to.equal(0)
            expect(await WBTC.balanceOf(FundManager.address)).to.equal(0)

        })


    })

});









