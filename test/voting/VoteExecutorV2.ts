import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { formatUnits, parseEther, parseUnits } from "ethers/lib/utils";
import { ethers, network, upgrades } from "hardhat";
import { CurveConvexStrategy, CurveConvexStrategy__factory, IERC20, PseudoMultisigWallet, PseudoMultisigWallet__factory, VoteExecutorV2, VoteExecutorV2__factory } from "../../typechain";

describe("VoteExecutor", function () {
  let strategy: CurveConvexStrategy;
  let multisig: PseudoMultisigWallet;
  let executor: VoteExecutorV2
  let dai: IERC20,  curve3CrvLp: IERC20, crv: IERC20, cvx: IERC20, usdc: IERC20, usdt: IERC20, ust: IERC20, ustW: IERC20, frax: IERC20;

  let signers: SignerWithAddress[];
  let investor: SignerWithAddress;
  let fraxHolder: SignerWithAddress;

  const exchange = "0x29c66CF57a03d41Cfe6d9ecB6883aa0E2AbA21Ec";

  async function skipDays(d: number) {
    ethers.provider.send('evm_increaseTime', [d * 86400]);
    ethers.provider.send('evm_mine', []);
}

        before(async () => {

            await network.provider.request({
              method: "hardhat_reset",
              params: [{
                  forking: {
                      enabled: true,
                      jsonRpcUrl: process.env.MAINNET_FORKING_URL as string,
                      //you can fork from last block by commenting next line
                      blockNumber: 14577320, 
                  },
              },],
          });
        signers = await ethers.getSigners();

        const investorAddress = "0xE78388b4CE79068e89Bf8aA7f218eF6b9AB0e9d0";
        const fraxHolderAddress = "0x183D0dC5867c01bFB1dbBc41d6a9d3dE6e044626";

        await ethers.provider.send(
            'hardhat_impersonateAccount',
            [investorAddress]
        );
        await ethers.provider.send(
            'hardhat_impersonateAccount',
            [fraxHolderAddress]
        );

        investor = await ethers.getSigner(investorAddress);
        fraxHolder = await ethers.getSigner(fraxHolderAddress);

        dai = await ethers.getContractAt("IERC20", "0x6b175474e89094c44da98b954eedeac495271d0f");
        frax = await ethers.getContractAt('IERC20', '0x853d955acef822db058eb8505911ed77f175b99e');
        usdc = await ethers.getContractAt("IERC20", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
        usdt = await ethers.getContractAt("IERC20", "0xdAC17F958D2ee523a2206206994597C13D831ec7");
        ust = await ethers.getContractAt("IERC20", "0xa47c8bf37f92abed4a126bda807a7b7498661acd");
        ustW = await ethers.getContractAt("IERC20", "0xa693B19d2931d498c5B318dF961919BB4aee87a5");
        curve3CrvLp = await ethers.getContractAt("IERC20", "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490");
        crv = await ethers.getContractAt("IERC20", "0xD533a949740bb3306d119CC777fa900bA034cd52");
        cvx = await ethers.getContractAt("IERC20", "0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B");

        console.log("Checking DAI");
        expect(await dai.balanceOf(investor.address)).to.be.gt(0, "Investor has no DAI, or you are not forking Ethereum");
        console.log("Checking FRAX");
        expect(await frax.balanceOf(fraxHolder.address)).to.be.gt(0, "fraxHolder has no FRAX, or you are not forking Ethereum");

        await signers[0].sendTransaction({
            to: investor.address,
            value: parseEther("100.0")
        });
        await signers[0].sendTransaction({
            to: fraxHolder.address,
            value: parseEther("100.0")
        });

    })

    async function exitFully(id: number, percent: number, token: IERC20, rewards: boolean) {
        await multisig.connect(signers[1]).executeCall(
            executor.address,
            executor.interface.encodeFunctionData('exitStrategyFully', [      
                id, 
                percent, 
                token.address, 
                multisig.address, 
                rewards]
            )
        );  
    }
    async function exitRewards(id: number, token: IERC20, rewards: boolean) {
        await multisig.connect(signers[1]).executeCall(
            executor.address,
            executor.interface.encodeFunctionData('exitStrategyRewards', [      
                id, 
                token.address, 
                multisig.address, 
                rewards]
            )
        );  
    }
    
    

    beforeEach(async () => {
        const Multisig = await ethers.getContractFactory("PseudoMultisigWallet") as PseudoMultisigWallet__factory;
        multisig = await Multisig.deploy(true);

        const Executor = await ethers.getContractFactory("VoteExecutorV2") as VoteExecutorV2__factory;

        executor = await upgrades.deployProxy(Executor,
            [
                multisig.address,
                exchange,
                [frax.address, usdt.address]
            ], 
            {initializer: 'initialize', kind: 'uups'}
        ) as VoteExecutorV2;

        const Strategy = await ethers.getContractFactory("CurveConvexStrategy") as CurveConvexStrategy__factory;
        strategy = await Strategy.deploy(executor.address, multisig.address, false);

        let ABI = ["function grantRole(bytes32 role, address account)"];
        let iface = new ethers.utils.Interface(ABI);
        let calldata = iface.encodeFunctionData("grantRole", [await executor.DEFAULT_ADMIN_ROLE(), signers[0].address]);
        await multisig.executeCall(executor.address, calldata);

        executor.changeStrategyStatus(strategy.address, true)
    });


    describe('Entries', function () {
        it("Simple entries with one exchange", async function () {
            const stringAmount = "300000.0";
            const fraxAmmount = parseUnits(stringAmount, 18);
            const usdtAmount = parseUnits(stringAmount, 6);
            await frax.connect(fraxHolder).transfer(executor.address, fraxAmmount);
            await usdt.connect(investor).transfer(executor.address, usdtAmount);



            let entryData1 = await strategy.encodeEntryParams(
                "0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B",
                "0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B",
                frax.address,
                2,
                0,
                32
            )

            let entryData2 = await strategy.encodeEntryParams(
                "0xBaaa1F5DbA42C3389bDbc2c9D2dE134F5cD0Dc89",
                "0xBaaa1F5DbA42C3389bDbc2c9D2dE134F5cD0Dc89",
                frax.address,
                3,
                0,
                58
            )

            let entries = [{
                weight: 5000,
                strategyAddress: strategy.address,
                entryToken: frax.address,
                poolToken: frax.address,
                data: entryData1
            }, {
                weight: 5000,
                strategyAddress: strategy.address,
                entryToken: frax.address,
                poolToken: frax.address,
                data: entryData2
            }, ]

            await multisig.connect(signers[1]).executeCall(
                executor.address,
                executor.interface.encodeFunctionData('execute', [entries])
            );

            await skipDays(10)

            await exitFully(0, 10000, usdt, false)

            await exitRewards(1, usdt, false)

        });
        it("Entry with difficult stable exchanges", async function () {
            const stringAmount = "50000.0";
            const fraxAmmount = parseUnits(stringAmount, 18);
            const usdtAmount = parseUnits(stringAmount, 6);
            const daiAmount = parseUnits(stringAmount, 18);
            await frax.connect(fraxHolder).transfer(executor.address, fraxAmmount);
            await usdt.connect(investor).transfer(executor.address, usdtAmount);
            await dai.connect(investor).transfer(executor.address, daiAmount);
        
            await executor.changeEntryTokenStatus(dai.address, true);
        

            let entryData1 = await strategy.encodeEntryParams(
                "0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B",
                "0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B",
                frax.address,
                2,
                0,
                32
            )

            let entryData2 = await strategy.encodeEntryParams(
                "0xBaaa1F5DbA42C3389bDbc2c9D2dE134F5cD0Dc89",
                "0xBaaa1F5DbA42C3389bDbc2c9D2dE134F5cD0Dc89",
                frax.address,
                3,
                0,
                58
            )

            let entries = [{
                weight: 8000,
                strategyAddress: strategy.address,
                entryToken: frax.address,
                poolToken: frax.address,
                data: entryData1
            }, {
                weight: 2000,
                strategyAddress: strategy.address,
                entryToken: dai.address,
                poolToken: frax.address,
                data: entryData2
            }, ]

            await multisig.connect(signers[1]).executeCall(
                executor.address,
                executor.interface.encodeFunctionData('execute', [entries])
            );

            await skipDays(10)

            await exitFully(0, 10000, usdt, false)
            await exitFully(1, 10000, usdt, false)

        });
        it("Entry with 3crv exchange", async function () {
            const stringAmount = "50000.0";
            const fraxAmmount = parseUnits(stringAmount, 18);
            const usdtAmount = parseUnits(stringAmount, 6);
            const daiAmount = parseUnits(stringAmount, 18);
            await frax.connect(fraxHolder).transfer(executor.address, fraxAmmount);
            await usdt.connect(investor).transfer(executor.address, usdtAmount);
            await dai.connect(investor).transfer(executor.address, daiAmount);
        
            await executor.changeEntryTokenStatus(dai.address, true);
        
            let entryData1 = await strategy.encodeEntryParams(
                "0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B",
                "0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B",
                curve3CrvLp.address,
                2,
                1,
                32
            )

            let entry1 = {
                weight: 50,
                strategyAddress: strategy.address,
                entryToken: frax.address,
                poolToken: curve3CrvLp.address,
                data: entryData1
            }

            let entryData2 = await strategy.encodeEntryParams(
                "0xCEAF7747579696A2F0bb206a14210e3c9e6fB269",
                "0xCEAF7747579696A2F0bb206a14210e3c9e6fB269",
                curve3CrvLp.address,
                2,
                1,
                ethers.constants.MaxUint256
            )
            let entry2 = {
                weight: 2000,
                strategyAddress: strategy.address,
                entryToken: dai.address,
                poolToken: curve3CrvLp.address,
                data: entryData2
            }

            let entries = [entry1 , entry2]

            await multisig.connect(signers[1]).executeCall(
                executor.address,
                executor.interface.encodeFunctionData('execute', [entries])
            );

            await skipDays(10)

            await exitFully(0, 10000, usdt, false)
            await exitFully(1, 10000, usdt, false)

        });
    });

});