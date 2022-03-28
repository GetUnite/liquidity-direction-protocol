import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { formatUnits, parseEther, parseUnits } from "ethers/lib/utils";
import { ethers, network } from "hardhat";
import { before } from "mocha";
import { IERC20, IUniversalCurveConvexStrategy, PseudoMultisigWallet, PseudoMultisigWallet__factory, VoteExecutor, VoteExecutorForTest, VoteExecutorForTest__factory, VoteExecutor__factory } from "../typechain";

const ZERO_ADDR = "0x0000000000000000000000000000000000000000"

describe("VoteExecutor", function () {
  let strategy: IUniversalCurveConvexStrategy;
  let multisig: PseudoMultisigWallet;
  let executor: VoteExecutor;
  let dai: IERC20,  curve3CrvLp: IERC20, crv: IERC20, cvx: IERC20, usdc: IERC20, usdt: IERC20, ust: IERC20, ustW: IERC20, frax: IERC20;

  let signers: SignerWithAddress[];
  let investor: SignerWithAddress;
  let fraxHolder: SignerWithAddress;
  let admin: SignerWithAddress;

  const exchange = "0x29c66CF57a03d41Cfe6d9ecB6883aa0E2AbA21Ec";
  const adminRole = "0x0000000000000000000000000000000000000000000000000000000000000000";

  before(async () => {

    await network.provider.request({
        method: "hardhat_reset",
        params: [{
            forking: {
                enabled: true,
                jsonRpcUrl: process.env.MAINNET_FORKING_URL as string,
                //you can fork from latest block by commenting next line
                blockNumber: 14450115, 
            },
        },],
    });

    signers = await ethers.getSigners();

    strategy = await ethers.getContractAt("IUniversalCurveConvexStrategy", "0xa248Ba96d72005114e6C941f299D315757877c0e");
    const investorAddress = "0xE78388b4CE79068e89Bf8aA7f218eF6b9AB0e9d0";
    const fraxHolderAddress = "0x0d07E9D74c83945DCE735ABAAe7931d032A02392";

    const adminAddress = "0x1F020A4943EB57cd3b2213A66b355CB662Ea43C3";

    await ethers.provider.send(
      'hardhat_impersonateAccount',
      [investorAddress]
    );
    await ethers.provider.send(
      'hardhat_impersonateAccount',
      [fraxHolderAddress]
    );

    await ethers.provider.send(
        'hardhat_impersonateAccount',
        [adminAddress]
    );
    admin = await ethers.getSigner(adminAddress);
    
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
    await signers[0].sendTransaction({
      to: admin.address,
      value: parseEther("100.0")
    });
  })

  beforeEach(async () => {
    const Multisig = await ethers.getContractFactory("PseudoMultisigWallet") as PseudoMultisigWallet__factory;
    multisig = await Multisig.deploy(true);

    // const Executor = await ethers.getContractFactory("VoteExecutorForTest") as VoteExecutorForTest__factory;
    const Executor = await ethers.getContractFactory("VoteExecutor") as VoteExecutor__factory;
    executor = await Executor.deploy(multisig.address, strategy.address, exchange,[frax.address, usdt.address]);

    await strategy.connect(admin).grantRole(adminRole, executor.address);
    

  
    await multisig.executeCall(
      executor.address,
      executor.interface.encodeFunctionData("grantRole", [
        adminRole,
        signers[0].address
      ])
    )
  });

  describe('Entries', function (){
    it("Simple entry", async function () {
      const stringAmount = "300000.0";
      const fraxAmmount = parseUnits(stringAmount, 18);
      const usdtAmount = parseUnits(stringAmount, 6);
      console.log("Will deposit", stringAmount, "FRAX");
      console.log("Stealing FRAX...");
      await frax.connect(fraxHolder).transfer(executor.address, fraxAmmount);
      console.log("Will deposit", stringAmount, "USDT");
      console.log("Stealing USDT...");
      await usdt.connect(investor).transfer(executor.address, usdtAmount);
      
      console.log("Starting execute votes. It will take time... \n")
      let entries = [{ 
        weight: 50, 
        entryToken: frax.address, 
        curvePool: "0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B",
        poolToken: frax.address,
        poolSize: 2,
        tokenIndexInCurve: 0,
        convexPoolAddress:"0xF403C135812408BFbE8713b5A23a04b3D48AAE31",
        convexPoold:32
    },
      { weight: 50, 
        entryToken: usdt.address, 
        curvePool: "0x52EA46506B9CC5Ef470C5bf89f17Dc28bB35D85C",
        poolToken: usdt.address,
        poolSize: 3,
        tokenIndexInCurve: 2,
        convexPoolAddress: "0xF403C135812408BFbE8713b5A23a04b3D48AAE31",
        convexPoold:1
    }]
      await executor.execute(entries)
      
    });

    it("Entry with simple stable exchanges", async function () {
      const stringAmount = "500000.0";
      const fraxAmmount = parseUnits(stringAmount, 18);
      const usdtAmount = parseUnits(stringAmount, 6);
      console.log("Will deposit", stringAmount, "FRAX");
      console.log("Stealing FRAX...");
      await frax.connect(fraxHolder).transfer(executor.address, fraxAmmount);
      console.log("Will deposit", stringAmount, "USDT");
      console.log("Stealing USDT...");
      await usdt.connect(investor).transfer(executor.address, usdtAmount);

      console.log("Starting execute votes. It will take time... \n")
      let entries = [{ 
        weight: 70, 
        entryToken: frax.address, 
        curvePool: "0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B",
        poolToken: frax.address,
        poolSize: 2,
        tokenIndexInCurve: 0,
        convexPoolAddress:"0xF403C135812408BFbE8713b5A23a04b3D48AAE31",
        convexPoold:32
    },
      { weight: 30, 
        entryToken: usdt.address, 
        curvePool: "0x52EA46506B9CC5Ef470C5bf89f17Dc28bB35D85C",
        poolToken: usdt.address,
        poolSize: 3,
        tokenIndexInCurve: 2,
        convexPoolAddress: "0xF403C135812408BFbE8713b5A23a04b3D48AAE31",
        convexPoold:1
    }]
      await executor.execute(entries)

    });

    it("Entry with difficult stable exchanges", async function () {
      const stringAmount = "50000.0";
      const fraxAmmount = parseUnits(stringAmount, 18);
      const usdtAmount = parseUnits(stringAmount, 6);
      const daiAmount = parseUnits(stringAmount, 18);
      console.log("Will deposit", stringAmount, "FRAX");
      console.log("Stealing FRAX...");
      await frax.connect(fraxHolder).transfer(executor.address, fraxAmmount);
      console.log("Will deposit", stringAmount, "USDT");
      console.log("Stealing USDT...");
      await usdt.connect(investor).transfer(executor.address, usdtAmount);
      console.log("Will deposit", stringAmount, "DAI");
      console.log("Stealing DAI...");
      await dai.connect(investor).transfer(executor.address, daiAmount);
  
      await executor.changeEntryTokenStatus(dai.address, true);
  
      
      console.log("Starting execute votes. It will take time... \n")
      let entries = [{ 
        weight: 80, 
        entryToken: frax.address, 
        curvePool: "0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B",
        poolToken: frax.address,
        poolSize: 2,
        tokenIndexInCurve: 0,
        convexPoolAddress:"0xF403C135812408BFbE8713b5A23a04b3D48AAE31",
        convexPoold:32
    },
      { weight: 20, 
        entryToken: dai.address, 
        curvePool: "0x52EA46506B9CC5Ef470C5bf89f17Dc28bB35D85C",
        poolToken: usdt.address,
        poolSize: 3,
        tokenIndexInCurve: 2,
        convexPoolAddress: "0xF403C135812408BFbE8713b5A23a04b3D48AAE31",
        convexPoold:1
    }]
      await executor.execute(entries)
      
    });


  it("Entry with 3crv exchange", async function () {
    const stringAmount = "50000.0";
    const fraxAmmount = parseUnits(stringAmount, 18);
    const usdtAmount = parseUnits(stringAmount, 6);
    const daiAmount = parseUnits(stringAmount, 18);
    console.log("Will deposit", stringAmount, "FRAX");
    console.log("Stealing FRAX...");
    await frax.connect(fraxHolder).transfer(executor.address, fraxAmmount);
    console.log("Will deposit", stringAmount, "USDT");
    console.log("Stealing USDT...");
    await usdt.connect(investor).transfer(executor.address, usdtAmount);
    console.log("Will deposit", stringAmount, "DAI");
    console.log("Stealing DAI...");
    await dai.connect(investor).transfer(executor.address, daiAmount);

    await executor.changeEntryTokenStatus(dai.address, true);

    
    console.log("Starting execute votes. It will take time... \n")
    let entries = [
      { 
      weight: 50, 
      entryToken: frax.address, 
      curvePool: "0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B",
      poolToken: curve3CrvLp.address,
      poolSize: 2,
      tokenIndexInCurve: 1,
      convexPoolAddress:"0xF403C135812408BFbE8713b5A23a04b3D48AAE31",
      convexPoold:32
  },
    { weight: 50, 
      entryToken: dai.address, 
      curvePool: "0xCEAF7747579696A2F0bb206a14210e3c9e6fB269",
      poolToken: curve3CrvLp.address,
      poolSize: 2,
      tokenIndexInCurve: 1,
      convexPoolAddress: ZERO_ADDR,
      convexPoold:1
  }]
    await executor.execute(entries)
    
  });
  
});
});
