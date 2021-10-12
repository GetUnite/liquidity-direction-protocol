import { expect } from "chai";
import { parseEther } from "@ethersproject/units";
import { ethers } from "hardhat";
import { AToken, AToken__factory, IERC20, IPool, IStaking, MVPStrategy, MVPStrategy__factory } from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "@ethersproject/bignumber";
import { Test__factory } from "../typechain/factories/Test__factory";

describe("MVPStrategy", function () {
  const mvpContractName = "MVPStrategy";
  const aTokenContractName = "AToken";

  const poolAddress = "0x445FE580eF8d70FF569aB36e80c647af338db351";
  const lpTokenAddress = "0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171";
  const stakingAddress = "0x19793B454D3AfC7b454F206Ffe95aDE26cA6912c";

  const daiAddress = "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063";
  const usdcAddress = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
  const usdtAddress = "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";

  const tokenAmount = 50;
  const daiTokenAmount = BigNumber.from(tokenAmount).mul(BigNumber.from(10).pow(18));
  const usdcTokenAmount = BigNumber.from(tokenAmount).mul(1e6);
  const usdtTokenAmount = BigNumber.from(tokenAmount).mul(1e6);

  let deployer: SignerWithAddress;

  let mvpStrategy: MVPStrategy,
    daiA: AToken,
    usdcA: AToken,
    usdtA: AToken,
    lpA: AToken;

  let dai: IERC20,
    usdc: IERC20,
    usdt: IERC20,
    pool: IPool,
    lpToken: IERC20,
    staking: IStaking;

  beforeEach(async function () {
    const accounts = await ethers.getSigners();

    const Token = await ethers.getContractFactory(aTokenContractName) as AToken__factory;
    daiA = await Token.deploy("Alluo wrapped DAI", "DAIa") as AToken;
    usdcA = await Token.deploy("Alluo wrapped USDC", "USDCa") as AToken;
    usdtA = await Token.deploy("Alluo wrapped USDT", "USDTa") as AToken;
    lpA = await Token.deploy("Alluo wrapped LP", "LPa") as AToken;

    const MVPStrategy = await ethers.getContractFactory(mvpContractName) as MVPStrategy__factory;
    mvpStrategy = await MVPStrategy.deploy(
      poolAddress,
      lpTokenAddress,
      stakingAddress,
      daiA.address,
      usdcA.address,
      usdtA.address,
      lpA.address);

    deployer = accounts[0];

    await daiA.setMVPContract(mvpStrategy.address);
    await usdcA.setMVPContract(mvpStrategy.address);
    await usdtA.setMVPContract(mvpStrategy.address);
    await lpA.setMVPContract(mvpStrategy.address);

    dai = await ethers.getContractAt("IERC20", daiAddress) as IERC20;
    usdc = await ethers.getContractAt("IERC20", usdcAddress) as IERC20;
    usdt = await ethers.getContractAt("IERC20", usdtAddress) as IERC20;
    pool = await ethers.getContractAt("IPool", poolAddress) as IPool;
    lpToken = await ethers.getContractAt("IERC20", lpTokenAddress) as IERC20;
    staking = await ethers.getContractAt("IStaking", stakingAddress) as IStaking;
  });

  it("Should check that deployer have real DAI, USDC adn USDT", async function () {
    const daiBalance = await dai.balanceOf(deployer.address);
    const usdcBalance = await usdc.balanceOf(deployer.address);
    const usdtBalance = await usdt.balanceOf(deployer.address);

    expect(daiBalance >= daiTokenAmount).to.be.true;
    expect(usdcBalance >= usdcTokenAmount).to.be.true;
    expect(usdtBalance >= usdtTokenAmount).to.be.true;

    console.log(`DAI: ${daiBalance.toString()}`);
    console.log(`USDC: ${usdcBalance.toString()}`);
    console.log(`USDT: ${usdtBalance.toString()}`);
  })

  it("Should check that everything is initialized properly", async function () {
    expect(await mvpStrategy.DAI()).to.be.equal(daiAddress);
    expect(await mvpStrategy.USDC()).to.be.equal(usdcAddress);
    expect(await mvpStrategy.USDT()).to.be.equal(usdtAddress);

    expect(await mvpStrategy.pool()).to.be.equal(poolAddress);
    expect(await mvpStrategy.lpToken()).to.be.equal(lpTokenAddress);
    expect(await mvpStrategy.staking()).to.be.equal(stakingAddress);

    expect(await mvpStrategy.daiA()).to.be.equal(daiA.address);
    expect(await mvpStrategy.usdcA()).to.be.equal(usdcA.address);
    expect(await mvpStrategy.usdtA()).to.be.equal(usdtA.address);
    expect(await mvpStrategy.lpA()).to.be.equal(lpA.address);
  });

  it("Should go through whole process", async function () {
    await dai.approve(mvpStrategy.address, daiTokenAmount);
    await mvpStrategy.receiveFunds(daiTokenAmount, daiAddress);

    await usdc.approve(mvpStrategy.address, usdcTokenAmount);
    await mvpStrategy.receiveFunds(usdcTokenAmount, usdcAddress);

    await usdt.approve(mvpStrategy.address, usdtTokenAmount);
    await mvpStrategy.receiveFunds(usdtTokenAmount, usdtAddress);

    await mvpStrategy.getLP([daiTokenAmount, usdcTokenAmount, usdtTokenAmount]);

    const lpAmount = await lpA.balanceOf(deployer.address);
    await mvpStrategy.farmLP(lpAmount);

    console.log(`pAUTO: ${await staking.balanceOf(deployer.address)}`);
  });
});
