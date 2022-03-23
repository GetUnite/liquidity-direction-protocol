// import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
// import { expect } from "chai";
// import { formatUnits, parseEther, parseUnits } from "ethers/lib/utils";
// import { ethers } from "hardhat";
// import { before } from "mocha";
// import { ICvxBaseRewardPool, IERC20, PseudoMultisigWallet, PseudoMultisigWallet__factory, UniversalCurveConvexStrategy, UniversalCurveConvexStrategy__factory, VoteExecutor, VoteExecutorForTest, VoteExecutorForTest__factory, VoteExecutor__factory } from "../../alluo-strategies/typechain";

// const ZERO_ADDR = "0x0000000000000000000000000000000000000000"

// describe("VoteExecutor", function () {
//   let strategy: UniversalCurveConvexStrategy;
//   let multisig: PseudoMultisigWallet;
//   let executor: VoteExecutorForTest;
//   let dai: IERC20, curveFraxLp: IERC20, curveMimUstLp: IERC20, curveUstW3crvLp: IERC20, curveUsdtLp: IERC20, curve3CrvLp: IERC20, crv: IERC20, cvx: IERC20, usdc: IERC20, usdt: IERC20, ust: IERC20, ustW: IERC20, frax: IERC20;
//   let rewardPool: ICvxBaseRewardPool

//   let signers: SignerWithAddress[];
//   let investor: SignerWithAddress;
//   let fraxHolder: SignerWithAddress;
//   let ustHolder: SignerWithAddress;
//   let ustWHolder: SignerWithAddress;
//   let crv3Holder: SignerWithAddress;

//   async function sendApprove(_to: string) {
//     let amount = parseEther("1000000")
//     frax.connect(investor).approve(_to, amount)
//     dai.connect(investor).approve(_to, amount)
//     usdc.connect(investor).approve(_to, amount)
//     usdt.connect(investor).approve(_to, amount)
//     curveFraxLp.connect(investor).approve(_to, amount)
//     curve3CrvLp.connect(investor).approve(_to, amount)
//     crv.connect(investor).approve(_to, amount)
//     cvx.connect(investor).approve(_to, amount)
//     ust.connect(investor).approve(_to, amount)
//     ustW.connect(investor).approve(_to, amount)
//   }

//   before(async () => {
//     signers = await ethers.getSigners();

//     const investorAddress = "0xE78388b4CE79068e89Bf8aA7f218eF6b9AB0e9d0";
//     const fraxHolderAddress = "0x0d07E9D74c83945DCE735ABAAe7931d032A02392";
//     const ustHolderAddress = "0x0F70A91DD4Ae5A17868991180C0d4FcdbA82f6b7";
//     const ustWHolderAddress = "0xCC9557F04633d82Fb6A1741dcec96986cD8689AE";
//     const crv3HolderAddress = "0x701aEcF92edCc1DaA86c5E7EdDbAD5c311aD720C";

//     await ethers.provider.send(
//       'hardhat_impersonateAccount',
//       [investorAddress]
//     );
//     await ethers.provider.send(
//       'hardhat_impersonateAccount',
//       [fraxHolderAddress]
//     );
//     await ethers.provider.send(
//       'hardhat_impersonateAccount',
//       [ustHolderAddress]
//     );
//     await ethers.provider.send(
//       'hardhat_impersonateAccount',
//       [ustWHolderAddress]
//     );
//     await ethers.provider.send(
//       'hardhat_impersonateAccount',
//       [crv3HolderAddress]
//     );
    
//     investor = await ethers.getSigner(investorAddress);
//     fraxHolder = await ethers.getSigner(fraxHolderAddress);
//     ustHolder = await ethers.getSigner(ustHolderAddress);
//     ustWHolder = await ethers.getSigner(ustWHolderAddress);
//     crv3Holder = await ethers.getSigner(crv3HolderAddress);
//     dai = await ethers.getContractAt("IERC20", "0x6b175474e89094c44da98b954eedeac495271d0f");
//     frax = await ethers.getContractAt('IERC20', '0x853d955acef822db058eb8505911ed77f175b99e');
//     usdc = await ethers.getContractAt("IERC20", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48");
//     usdt = await ethers.getContractAt("IERC20", "0xdAC17F958D2ee523a2206206994597C13D831ec7");
//     ust = await ethers.getContractAt("IERC20", "0xa47c8bf37f92abed4a126bda807a7b7498661acd");
//     ustW = await ethers.getContractAt("IERC20", "0xa693B19d2931d498c5B318dF961919BB4aee87a5");
//     curveFraxLp = await ethers.getContractAt("IERC20", "0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B");
//     curve3CrvLp = await ethers.getContractAt("IERC20", "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490");
//     curveUsdtLp = await ethers.getContractAt("IERC20", "0x9fC689CCaDa600B6DF723D9E47D84d76664a1F23");
//     curveMimUstLp = await ethers.getContractAt("IERC20", "0x55A8a39bc9694714E2874c1ce77aa1E599461E18");
//     curveUstW3crvLp = await ethers.getContractAt("IERC20", "0xCEAF7747579696A2F0bb206a14210e3c9e6fB269");
//     crv = await ethers.getContractAt("IERC20", "0xD533a949740bb3306d119CC777fa900bA034cd52");
//     cvx = await ethers.getContractAt("IERC20", "0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B");
//     rewardPool = await ethers.getContractAt("ICvxBaseRewardPool", "0xB900EF131301B307dB5eFcbed9DBb50A3e209B2e");

//     console.log("Checking DAI");
//     expect(await dai.balanceOf(investor.address)).to.be.gt(0, "Investor has no DAI, or you are not forking Ethereum");
//     console.log("Checking FRAX");
//     expect(await frax.balanceOf(fraxHolder.address)).to.be.gt(0, "fraxHolder has no FRAX, or you are not forking Ethereum");
//     console.log("Checking UST");
//     expect(await ust.balanceOf(ustHolder.address)).to.be.gt(0, "ustHolder has no UST, or you are not forking Ethereum");
//     console.log("Checking USTw");
//     expect(await ustW.balanceOf(ustWHolder.address)).to.be.gt(0, "ustWHolder has no USTw, or you are not forking Ethereum");
//     console.log("Checking curve3CrvLp");
//     expect(await curve3CrvLp.balanceOf(crv3Holder.address)).to.be.gt(0, "crv3Holder has no curve3CrvLp, or you are not forking Ethereum");

//     await signers[0].sendTransaction({
//       to: investor.address,
//       value: parseEther("100.0")
//     });
//     await signers[0].sendTransaction({
//       to: fraxHolder.address,
//       value: parseEther("100.0")
//     });
//     await signers[0].sendTransaction({
//       to: ustHolder.address,
//       value: parseEther("100.0")
//     });
//     await signers[0].sendTransaction({
//       to: ustWHolder.address,
//       value: parseEther("100.0")
//     });
//     await signers[0].sendTransaction({
//       to: crv3Holder.address,
//       value: parseEther("100.0")
//     });
//   })

//   beforeEach(async () => {
//     const Multisig = await ethers.getContractFactory("PseudoMultisigWallet") as PseudoMultisigWallet__factory;
//     multisig = await Multisig.deploy();

//     const Strategy = await ethers.getContractFactory("UniversalCurveConvexStrategy") as UniversalCurveConvexStrategy__factory;
//     strategy = await Strategy.deploy(multisig.address);

//     const Executor = await ethers.getContractFactory("VoteExecutorForTest") as VoteExecutorForTest__factory;
//     executor = await Executor.deploy(multisig.address, strategy.address, investor.address,[frax.address, usdt.address]);

//     const ExecutorReal = await ethers.getContractFactory("VoteExecutor") as VoteExecutor__factory;
//     const executorReal = await ExecutorReal.deploy(multisig.address, strategy.address, investor.address,[
//       dai.address, 
//       frax.address, 
//       usdc.address, 
//       usdt.address]);

//     await multisig.executeCall(
//       strategy.address,
//       strategy.interface.encodeFunctionData("grantRole", [
//         "0x0000000000000000000000000000000000000000000000000000000000000000",
//         executor.address
//       ])
//     )

//     await multisig.executeCall(
//       executor.address,
//       executor.interface.encodeFunctionData("grantRole", [
//         "0x0000000000000000000000000000000000000000000000000000000000000000",
//         signers[0].address
//       ])
//     )
//   });

//   describe('Entries', function (){
//     it("Simple entry", async function () {
//       const stringAmount = "300000.0";
//       const fraxAmmount = parseUnits(stringAmount, 18);
//       const usdtAmount = parseUnits(stringAmount, 6);
//       console.log("Will deposit", stringAmount, "FRAX");
//       console.log("Stealing FRAX...");
//       await frax.connect(fraxHolder).transfer(executor.address, fraxAmmount);
//       console.log("Will deposit", stringAmount, "USDT");
//       console.log("Stealing USDT...");
//       await usdt.connect(investor).transfer(executor.address, usdtAmount);
      
//       console.log("\nTokens at the begining:");
      
//       console.log("Strategy's tokens:");
//       console.log("Frax:", formatUnits(await frax.balanceOf(strategy.address), 18));
//       console.log("USDT:", formatUnits(await usdt.balanceOf(strategy.address), 6));
  
//       console.log("\nExecutor's tokens:");
//       console.log("Frax:", formatUnits(await frax.balanceOf(executor.address), 18));
//       console.log("USDT:", formatUnits(await usdt.balanceOf(executor.address), 6));
//       console.log("\n");

//       await sendApprove(executor.address)

  
//       //console.log(await executor.getTotalBalance())
      
//       console.log("Starting execute votes. It will take time... \n")
//       let entries = [{ 
//         weight: 50, 
//         entryToken: frax.address, 
//         curvePool: "0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B",
//         poolToken: frax.address,
//         poolSize: 2,
//         tokenIndexInCurve: 0,
//         //convexPoolAddress:"0xF403C135812408BFbE8713b5A23a04b3D48AAE31",
//         convexPoolAddress:ZERO_ADDR,
//         convexPoold:32
//     },
//       { weight: 50, 
//         entryToken: usdt.address, 
//         curvePool: "0x52EA46506B9CC5Ef470C5bf89f17Dc28bB35D85C",
//         poolToken: usdt.address,
//         poolSize: 3,
//         tokenIndexInCurve: 2,
//         //convexPoolAddress: "0xF403C135812408BFbE8713b5A23a04b3D48AAE31",
//         convexPoolAddress:ZERO_ADDR,
//         convexPoold:1
//     }]
//       await executor.execute(entries)
      
//       console.log("Tokens at the end:");
      
//       console.log("Strategy's tokens:");
//       console.log("Frax:", formatUnits(await frax.balanceOf(strategy.address), 18));
//       console.log("USDT:", formatUnits(await usdt.balanceOf(strategy.address), 6));
//       console.log("Curve FRAX LP:", formatUnits(await curveFraxLp.balanceOf(strategy.address), 18));
//       console.log("Curve USDT LP:", formatUnits(await curveUsdtLp.balanceOf(strategy.address), 18));
  
//       console.log("\nExecutor's tokens:");
//       console.log("Frax:", formatUnits(await frax.balanceOf(executor.address), 18));
//       console.log("USDT:", formatUnits(await usdt.balanceOf(executor.address), 6));
//       console.log("Curve FRAX LP:", formatUnits(await curveFraxLp.balanceOf(executor.address), 18));
//       console.log("Curve USDT LP:", formatUnits(await curveUsdtLp.balanceOf(executor.address), 18));
//       console.log("\n");
//     });

//     it("Entry with simple stable exchanges", async function () {
//       const stringAmount = "500000.0";
//       const fraxAmmount = parseUnits(stringAmount, 18);
//       const usdtAmount = parseUnits(stringAmount, 6);
//       console.log("Will deposit", stringAmount, "FRAX");
//       console.log("Stealing FRAX...");
//       await frax.connect(fraxHolder).transfer(executor.address, fraxAmmount);
//       await frax.connect(fraxHolder).transfer(investor.address, fraxAmmount);
//       console.log("Will deposit", stringAmount, "USDT");
//       console.log("Stealing USDT...");
//       await usdt.connect(investor).transfer(executor.address, usdtAmount);
        
//       console.log("\nTokens at the begining:");
      
//       console.log("Strategy's tokens:");
//       console.log("Frax:", formatUnits(await frax.balanceOf(strategy.address), 18));
//       console.log("USDT:", formatUnits(await usdt.balanceOf(strategy.address), 6));
  
//       console.log("\nExecutor's tokens:");
//       console.log("Frax:", formatUnits(await frax.balanceOf(executor.address), 18));
//       console.log("USDT:", formatUnits(await usdt.balanceOf(executor.address), 6));
//       console.log("\n");

//       await executor.addStrategy(strategy.address)
//       await executor.addExchange(investor.address)
//       await sendApprove(executor.address)

  
//       console.log("Starting execute votes. It will take time... \n")
//       let entries = [{ 
//         weight: 70, 
//         entryToken: frax.address, 
//         curvePool: "0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B",
//         poolToken: frax.address,
//         poolSize: 2,
//         tokenIndexInCurve: 0,
//         convexPoolAddress:"0xF403C135812408BFbE8713b5A23a04b3D48AAE31",
//         // convexPoolAddress:ZERO_ADDR,
//         convexPoold:32
//     },
//       { weight: 30, 
//         entryToken: usdt.address, 
//         curvePool: "0x52EA46506B9CC5Ef470C5bf89f17Dc28bB35D85C",
//         poolToken: usdt.address,
//         poolSize: 3,
//         tokenIndexInCurve: 2,
//         convexPoolAddress: "0xF403C135812408BFbE8713b5A23a04b3D48AAE31",
//         // convexPoolAddress:ZERO_ADDR,
//         convexPoold:1
//     }]
//       await executor.execute(entries)
      
//       console.log("Tokens at the end:");
      
//       console.log("Strategy's tokens:");
//       console.log("Frax:", formatUnits(await frax.balanceOf(strategy.address), 18));
//       console.log("USDT:", formatUnits(await usdt.balanceOf(strategy.address), 6));
//       console.log("Curve FRAX LP:", formatUnits(await curveFraxLp.balanceOf(strategy.address), 18));
//       console.log("Curve USDT LP:", formatUnits(await curveUsdtLp.balanceOf(strategy.address), 18));
  
//       console.log("\nExecutor's tokens:");
//       console.log("Frax:", formatUnits(await frax.balanceOf(executor.address), 18));
//       console.log("USDT:", formatUnits(await usdt.balanceOf(executor.address), 6));
//       console.log("Curve FRAX LP:", formatUnits(await curveFraxLp.balanceOf(executor.address), 18));
//       console.log("Curve USDT LP:", formatUnits(await curveUsdtLp.balanceOf(executor.address), 18));
//       console.log("\n");
//     });

//   //   it("Entry with difficult stable exchanges", async function () {
//   //     const stringAmount = "50000.0";
//   //     const fraxAmmount = parseUnits(stringAmount, 18);
//   //     const fraxExchangeAmmount = parseUnits("200000", 18);
//   //     const usdtAmount = parseUnits(stringAmount, 6);
//   //     const daiAmount = parseUnits(stringAmount, 18);
//   //     console.log("Will deposit", stringAmount, "FRAX");
//   //     console.log("Stealing FRAX...");
//   //     await frax.connect(fraxHolder).transfer(executor.address, fraxAmmount);
//   //     await frax.connect(fraxHolder).transfer(investor.address, fraxExchangeAmmount);
//   //     console.log("Will deposit", stringAmount, "USDT");
//   //     console.log("Stealing USDT...");
//   //     await usdt.connect(investor).transfer(executor.address, usdtAmount);
//   //     console.log("Will deposit", stringAmount, "DAI");
//   //     console.log("Stealing DAI...");
//   //     await dai.connect(investor).transfer(executor.address, daiAmount);


//   //     console.log("\nTokens at the begining:");
      
//   //     console.log("Strategy's tokens:");
//   //     console.log("Frax:", formatUnits(await frax.balanceOf(strategy.address), 18));
//   //     console.log("DAI:", formatUnits(await dai.balanceOf(strategy.address), 18));
//   //     console.log("USDC:", formatUnits(await usdc.balanceOf(strategy.address), 6));
//   //     console.log("USDT:", formatUnits(await usdt.balanceOf(strategy.address), 6));
  
//   //     console.log("\nExecutor's tokens:");
//   //     console.log("Frax:", formatUnits(await frax.balanceOf(executor.address), 18));
//   //     console.log("DAI:", formatUnits(await dai.balanceOf(executor.address), 18));
//   //     console.log("USDC:", formatUnits(await usdc.balanceOf(executor.address), 6));
//   //     console.log("USDT:", formatUnits(await usdt.balanceOf(executor.address), 6));
//   //     console.log("\n");

  
//   //     await executor.addStrategy(strategy.address)
//   //     await executor.addExchange(investor.address)
//   //     await sendApprove(executor.address)
//   //     await executor.changeEntryTokenStatus(dai.address, true);
  
//   //     //console.log(await executor.getTotalBalance())
      
//   //     console.log("Starting execute votes. It will take time... \n")
//   //     let entries = [{ 
//   //       weight: 80, 
//   //       entryToken: frax.address, 
//   //       curvePool: "0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B",
//   //       poolToken: frax.address,
//   //       poolSize: 2,
//   //       tokenIndexInCurve: 0,
//   //       //convexPoolAddress:"0xF403C135812408BFbE8713b5A23a04b3D48AAE31",
//   //       convexPoolAddress:ZERO_ADDR,
//   //       convexPoold:32
//   //   },
//   //     { weight: 20, 
//   //       entryToken: dai.address, 
//   //       curvePool: "0x52EA46506B9CC5Ef470C5bf89f17Dc28bB35D85C",
//   //       poolToken: usdt.address,
//   //       poolSize: 3,
//   //       tokenIndexInCurve: 2,
//   //       //convexPoolAddress: "0xF403C135812408BFbE8713b5A23a04b3D48AAE31",
//   //       convexPoolAddress:ZERO_ADDR,
//   //       convexPoold:1
//   //   }]
//   //     await executor.execute(entries)
      
//   //     console.log("Tokens at the end:");
      
//   //     console.log("Strategy's tokens:");
//   //     console.log("Frax:", formatUnits(await frax.balanceOf(strategy.address), 18));
//   //     console.log("DAI:", formatUnits(await dai.balanceOf(strategy.address), 18));
//   //     console.log("USDC:", formatUnits(await usdc.balanceOf(strategy.address), 6));
//   //     console.log("USDT:", formatUnits(await usdt.balanceOf(strategy.address), 6));
//   //     console.log("Curve FRAX LP:", formatUnits(await curveFraxLp.balanceOf(strategy.address), 18));
//   //     console.log("Curve USDT LP:", formatUnits(await curveUsdtLp.balanceOf(strategy.address), 18));
  
//   //     console.log("\nExecutor's tokens:");
//   //     console.log("Frax:", formatUnits(await frax.balanceOf(executor.address), 18));
//   //     console.log("DAI:", formatUnits(await dai.balanceOf(executor.address), 18));
//   //     console.log("USDC:", formatUnits(await usdc.balanceOf(executor.address), 6));
//   //     console.log("USDT:", formatUnits(await usdt.balanceOf(executor.address), 6));
//   //     console.log("\n");
//   //   });

//   //   it("Entry with ", async function () {
//   //     const stringAmount = "50000.0";
//   //     const usdtAmount = parseUnits(stringAmount, 6);
//   //     const daiAmount = parseUnits(stringAmount, 18);
//   //     const ustExchangeAmmount = parseUnits("200000", 18);
//   //     const ustWExchangeAmmount = parseUnits("200000", 6);
//   //     console.log("Will deposit", stringAmount, "FRAX");
//   //     console.log("Will deposit", stringAmount, "USDC");
//   //     console.log("Stealing USDC...");
//   //     await usdc.connect(investor).transfer(executor.address, usdtAmount);
//   //     console.log("Will deposit", stringAmount, "DAI");
//   //     console.log("Stealing DAI...");
//   //     await dai.connect(investor).transfer(executor.address, daiAmount);
//   //     console.log("Will deposit", stringAmount, "USDT");
//   //     console.log("Stealing USDT...");
//   //     await usdt.connect(investor).transfer(executor.address, usdtAmount);
//   //     console.log("Stealing UST for exchange...");
//   //     await ust.connect(ustHolder).transfer(investor.address, ustExchangeAmmount);
//   //     console.log("Stealing USTw for exchange...");
//   //     await ustW.connect(ustWHolder).transfer(investor.address, ustWExchangeAmmount);

//   //     console.log("\nTokens at the begining:");
      
//   //     console.log("Strategy's tokens:");
//   //     console.log("USDT:", formatUnits(await usdt.balanceOf(strategy.address), 6));
//   //     console.log("DAI:", formatUnits(await dai.balanceOf(strategy.address), 18));
//   //     console.log("USDC:", formatUnits(await usdc.balanceOf(strategy.address), 6));
//   //     console.log("UST:", formatUnits(await ust.balanceOf(strategy.address), 18));
//   //     console.log("USTw:", formatUnits(await ustW.balanceOf(strategy.address), 6));
  
//   //     console.log("\nExecutor's tokens:");
//   //     console.log("USDT:", formatUnits(await usdt.balanceOf(executor.address), 6));
//   //     console.log("DAI:", formatUnits(await dai.balanceOf(executor.address), 18));
//   //     console.log("USDC:", formatUnits(await usdc.balanceOf(executor.address), 6));
//   //     console.log("UST:", formatUnits(await ust.balanceOf(executor.address), 18));
//   //     console.log("USTw:", formatUnits(await ustW.balanceOf(executor.address), 6));
//   //     console.log("\n");

  
//   //     await executor.addStrategy(strategy.address)
//   //     await executor.addExchange(investor.address)
//   //     await sendApprove(executor.address)
//   //     await executor.changeEntryTokenStatus(dai.address, true);
//   //     await executor.changeEntryTokenStatus(usdc.address, true);
  
//   //     //console.log(await executor.getTotalBalance())
      
//   //     console.log("Starting execute votes. It will take time... \n")
//   //     let entries = [{ 
//   //       weight: 25, 
//   //       entryToken: usdc.address, 
//   //       curvePool: "0x55a8a39bc9694714e2874c1ce77aa1e599461e18",
//   //       poolToken: ust.address,
//   //       poolSize: 2,
//   //       tokenIndexInCurve: 1,
//   //       // convexPoolAddress:"0xF403C135812408BFbE8713b5A23a04b3D48AAE31",
//   //       convexPoolAddress:ZERO_ADDR,
//   //       convexPoold:52
//   //   },
//   //   { 
//   //     weight: 25, 
//   //     entryToken: usdc.address, 
//   //     curvePool: "0x55a8a39bc9694714e2874c1ce77aa1e599461e18",
//   //     poolToken: ust.address,
//   //     poolSize: 2,
//   //     tokenIndexInCurve: 1,
//   //     convexPoolAddress:"0xF403C135812408BFbE8713b5A23a04b3D48AAE31",
//   //     // convexPoolAddress:ZERO_ADDR,
//   //     convexPoold:52
//   // },
    
//   //     { weight: 50, 
//   //       entryToken: dai.address, 
//   //       curvePool: "0xCEAF7747579696A2F0bb206a14210e3c9e6fB269",
//   //       poolToken: ustW.address,
//   //       poolSize: 2,
//   //       tokenIndexInCurve: 0,
//   //       convexPoolAddress: "0xF403C135812408BFbE8713b5A23a04b3D48AAE31",
//   //       //convexPoolAddress:ZERO_ADDR,
//   //       convexPoold:59
//   //   }]
//   //     await executor.execute(entries)
      
      
//   //     console.log("Tokens at the end:");
      
//   //     console.log("Strategy's tokens:");
//   //     console.log("Frax:", formatUnits(await frax.balanceOf(strategy.address), 18));
//   //     console.log("DAI:", formatUnits(await dai.balanceOf(strategy.address), 18));
//   //     console.log("USDC:", formatUnits(await usdc.balanceOf(strategy.address), 6));
//   //     console.log("UST:", formatUnits(await ust.balanceOf(strategy.address), 18));
//   //     console.log("USTw:", formatUnits(await ustW.balanceOf(strategy.address), 6));
//   //     console.log("CurveMimUst:", formatUnits(await curveMimUstLp.balanceOf(strategy.address), 18));
//   //     console.log("CurveUstW3crvLp:", formatUnits(await curveUstW3crvLp.balanceOf(strategy.address), 18));

//   //     console.log("\nExecutor's tokens:");
//   //     console.log("Frax:", formatUnits(await frax.balanceOf(executor.address), 18));
//   //     console.log("DAI:", formatUnits(await dai.balanceOf(executor.address), 18));
//   //     console.log("USDC:", formatUnits(await usdc.balanceOf(executor.address), 6));
//   //     console.log("UST:", formatUnits(await ust.balanceOf(executor.address), 18));
//   //     console.log("USTw:", formatUnits(await ustW.balanceOf(executor.address), 6));
//   //     console.log("CurveMimUst:", formatUnits(await curveMimUstLp.balanceOf(executor.address), 18));
//   //     console.log("CurveUstW3crvLp:", formatUnits(await curveUstW3crvLp.balanceOf(executor.address), 18));
//   //     console.log("\n");
//   //   });
//   // });

//   // it("Entry with 3crv exchange", async function () {
//   //   const stringAmount = "50000.0";
//   //   const fraxAmmount = parseUnits(stringAmount, 18);
//   //   const fraxExchangeAmmount = parseUnits("200000", 18);
//   //   const crvExchangeAmmount = parseUnits("200000", 18);
//   //   const usdtAmount = parseUnits(stringAmount, 6);
//   //   const daiAmount = parseUnits(stringAmount, 18);
//   //   console.log("Will deposit", stringAmount, "FRAX");
//   //   console.log("Stealing FRAX...");
//   //   await frax.connect(fraxHolder).transfer(executor.address, fraxAmmount);
//   //   await frax.connect(fraxHolder).transfer(investor.address, fraxExchangeAmmount);
//   //   console.log("Will deposit", stringAmount, "USDT");
//   //   console.log("Stealing USDT...");
//   //   await usdt.connect(investor).transfer(executor.address, usdtAmount);
//   //   console.log("Will deposit", stringAmount, "DAI");
//   //   console.log("Stealing DAI...");
//   //   await dai.connect(investor).transfer(executor.address, daiAmount);
//   //   console.log("Stealing 3CRV...");
//   //   await curve3CrvLp.connect(crv3Holder).transfer(investor.address, crvExchangeAmmount);


//   //   console.log("\nTokens at the begining:");
    
//   //   console.log("Strategy's tokens:");
//   //   console.log("Frax:", formatUnits(await frax.balanceOf(strategy.address), 18));
//   //   console.log("DAI:", formatUnits(await dai.balanceOf(strategy.address), 18));
//   //   console.log("USDC:", formatUnits(await usdc.balanceOf(strategy.address), 6));
//   //   console.log("USDT:", formatUnits(await usdt.balanceOf(strategy.address), 6));
//   //   console.log("3CRV:", formatUnits(await curve3CrvLp.balanceOf(strategy.address), 18));

//   //   console.log("\nExecutor's tokens:");
//   //   console.log("Frax:", formatUnits(await frax.balanceOf(executor.address), 18));
//   //   console.log("DAI:", formatUnits(await dai.balanceOf(executor.address), 18));
//   //   console.log("USDC:", formatUnits(await usdc.balanceOf(executor.address), 6));
//   //   console.log("USDT:", formatUnits(await usdt.balanceOf(executor.address), 6));
//   //   console.log("3CRV:", formatUnits(await curve3CrvLp.balanceOf(executor.address), 18));
//   //   console.log("\n");


//   //   await executor.addStrategy(strategy.address)
//   //   await executor.addExchange(investor.address)
//   //   await sendApprove(executor.address)

//   //   await executor.changeEntryTokenStatus(dai.address, true);

//   //   //console.log(await executor.getTotalBalance())
    
//   //   console.log("Starting execute votes. It will take time... \n")
//   //   let entries = [{ 
//   //     weight: 50, 
//   //     entryToken: frax.address, 
//   //     curvePool: "0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B",
//   //     poolToken: curve3CrvLp.address,
//   //     poolSize: 2,
//   //     tokenIndexInCurve: 1,
//   //     //convexPoolAddress:"0xF403C135812408BFbE8713b5A23a04b3D48AAE31",
//   //     convexPoolAddress:ZERO_ADDR,
//   //     convexPoold:32
//   // },
//   //   { weight: 50, 
//   //     entryToken: dai.address, 
//   //     curvePool: "0xCEAF7747579696A2F0bb206a14210e3c9e6fB269",
//   //     poolToken: curve3CrvLp.address,
//   //     poolSize: 2,
//   //     tokenIndexInCurve: 1,
//   //     //convexPoolAddress: "0xF403C135812408BFbE8713b5A23a04b3D48AAE31",
//   //     convexPoolAddress:ZERO_ADDR,
//   //     convexPoold:1
//   // }]
//   //   await executor.execute(entries)
    
//   //   console.log("Tokens at the end:");
    
//   //   console.log("Strategy's tokens:");
//   //   console.log("Frax:", formatUnits(await frax.balanceOf(strategy.address), 18));
//   //   console.log("DAI:", formatUnits(await dai.balanceOf(strategy.address), 18));
//   //   console.log("USDC:", formatUnits(await usdc.balanceOf(strategy.address), 6));
//   //   console.log("USDT:", formatUnits(await usdt.balanceOf(strategy.address), 6));
//   //   console.log("Curve FRAX LP:", formatUnits(await curveFraxLp.balanceOf(strategy.address), 18));
//   //   console.log("Curve USDT LP:", formatUnits(await curveUsdtLp.balanceOf(strategy.address), 18));

//   //   console.log("\nExecutor's tokens:");
//   //   console.log("Frax:", formatUnits(await frax.balanceOf(executor.address), 18));
//   //   console.log("DAI:", formatUnits(await dai.balanceOf(executor.address), 18));
//   //   console.log("USDC:", formatUnits(await usdc.balanceOf(executor.address), 6));
//   //   console.log("USDT:", formatUnits(await usdt.balanceOf(executor.address), 6));
//   //   console.log("\n");
//   // });
  
// });
// });
