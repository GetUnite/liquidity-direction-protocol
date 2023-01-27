import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { parseEther, parseUnits } from "ethers/lib/utils";
import { ethers, network, upgrades } from "hardhat";
import { BigNumber, BigNumberish} from "ethers";
import {
  BufferManager, BufferManager__factory, IERC20, IbAlluo, IbAlluo__factory, LiquidityHandlerPolygon, LiquidityHandlerPolygon__factory, VoteExecutorSlaveFinal, VoteExecutorSlaveFinal__factory, 
  UsdCurveAdapterUpgradeable__factory, UsdCurveAdapterUpgradeable, EurCurveAdapterUpgradeable__factory, EurCurveAdapterUpgradeable, EthNoPoolAdapterUpgradeable__factory,
  EthNoPoolAdapterUpgradeable, BtcNoPoolAdapterUpgradeable__factory, BtcNoPoolAdapterUpgradeable
} from "../../typechain";

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

async function getLastWithdrawalInfo(token: IbAlluo, handler: LiquidityHandlerPolygon) {
  let request = (await handler.ibAlluoToWithdrawalSystems(token.address)).lastWithdrawalRequest
  let satisfied = (await handler.ibAlluoToWithdrawalSystems(token.address)).lastSatisfiedWithdrawal
  let total = (await handler.ibAlluoToWithdrawalSystems(token.address)).totalWithdrawalAmount
  return [request, satisfied, total]
}


describe("BufferManager tests", () => {
  let signers: SignerWithAddress[];
  let gnosis: SignerWithAddress;
  let admin: SignerWithAddress;
  let gelatoExecutor: SignerWithAddress;

  let usdWhale: SignerWithAddress;
  let eurtWhale: SignerWithAddress;
  let jeurWhale: SignerWithAddress;
  let wethWhale: SignerWithAddress;
  let wbtcWhale: SignerWithAddress;

  let ibAlluoUsd: IbAlluo;
  let ibAlluoEur: IbAlluo;
  let ibAlluoEth: IbAlluo;
  let ibAlluoBtc: IbAlluo;

  let handler: LiquidityHandlerPolygon;
  let buffer: BufferManager;
  let slave: VoteExecutorSlaveFinal;

  let usdAdapter: UsdCurveAdapterUpgradeable;
  let eurAdapter: EurCurveAdapterUpgradeable;
  let ethAdapter: EthNoPoolAdapterUpgradeable;
  let btcAdapter: BtcNoPoolAdapterUpgradeable;

  let dai: IERC20, usdc: IERC20, usdt: IERC20; let jeur: IERC20;
  let par: IERC20, eurt: IERC20, eurs: IERC20; let weth: IERC20;
  let wbtc: IERC20;

  const exchangeAddress = "0x6b45B9Ab699eFbb130464AcEFC23D49481a05773";
  const spokepooladdress = "0x69B5c72837769eF1e7C164Abc6515DcFf217F920";
  const anycalladdress = "0xC10Ef9F491C9B59f936957026020C321651ac078";

  const ZERO_ADDR = ethers.constants.AddressZero;


  beforeEach(async function() {
    //We are forking Polygon mainnet, please set Alchemy key in .env
    await network.provider.request({
      method: "hardhat_reset",
      params: [{
        forking: {
          enabled: true,
          jsonRpcUrl: process.env.POLYGON_FORKING_URL as string,
          //you can fork from last block by commenting next line
          blockNumber: 29518660,
        },
      },],
    });

    admin = await getImpersonatedSigner("0x2580f9954529853Ca5aC5543cE39E9B5B1145135");
    gnosis = await getImpersonatedSigner("0x2580f9954529853Ca5aC5543cE39E9B5B1145135");
    gelatoExecutor = await getImpersonatedSigner("0x7A34b2f0DA5ea35b5117CaC735e99Ba0e2aCEECD");
    signers = await ethers.getSigners();

    usdWhale = await getImpersonatedSigner("0x075e72a5eDf65F0A5f44699c7654C1a76941Ddc8");
    jeurWhale = await getImpersonatedSigner("0x00d7c133b923548f29cc2cc01ecb1ea2acdf2d4c");
    eurtWhale = await getImpersonatedSigner("0x1a4b038c31a8e5f98b00016b1005751296adc9a4");
    wbtcWhale = await getImpersonatedSigner("0xF9930a9d65cc57d024CF9149AE67e66c7a77E167");
    wethWhale = await getImpersonatedSigner("0x72a53cdbbcc1b9efa39c834a540550e23463aacb");

    usdc = await ethers.getContractAt("IERC20", "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174");
    usdt = await ethers.getContractAt("IERC20", "0xc2132D05D31c914a87C6611C10748AEb04B58e8F");
    jeur = await ethers.getContractAt("IERC20", "0x4e3Decbb3645551B8A19f0eA1678079FCB33fB4c");
    dai = await ethers.getContractAt("IERC20", "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063");

    jeur = await ethers.getContractAt("IERC20", "0x4e3Decbb3645551B8A19f0eA1678079FCB33fB4c");
    par = await ethers.getContractAt("IERC20", "0xE2Aa7db6dA1dAE97C5f5C6914d285fBfCC32A128");
    eurt = await ethers.getContractAt("IERC20", "0x7BDF330f423Ea880FF95fC41A280fD5eCFD3D09f");
    eurs = await ethers.getContractAt("IERC20", "0xE111178A87A3BFf0c8d18DECBa5798827539Ae99");

    weth = await ethers.getContractAt("IERC20", "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619");
    wbtc = await ethers.getContractAt("IERC20", "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6");

    await (await (await ethers.getContractFactory("ForceSender")).deploy({
      value: parseEther("10.0")
    })).forceSend(gnosis.address);

    await (await (await ethers.getContractFactory("ForceSender")).deploy({
      value: parseEther("10.0")
    })).forceSend(gelatoExecutor.address);

    await sendEth([usdWhale, jeurWhale, eurtWhale, wethWhale, wbtcWhale])

    upgrades.silenceWarnings()
  

  
    const UsdAdapter = await ethers.getContractFactory("UsdCurveAdapterUpgradeable") as UsdCurveAdapterUpgradeable__factory;
    const EurAdapter = await ethers.getContractFactory("EurCurveAdapterUpgradeable") as EurCurveAdapterUpgradeable__factory;
    const EthAdapter = await ethers.getContractFactory("EthNoPoolAdapterUpgradeable") as EthNoPoolAdapterUpgradeable__factory;
    const BtcAdapter = await ethers.getContractFactory("BtcNoPoolAdapterUpgradeable") as BtcNoPoolAdapterUpgradeable__factory;
    
    const Handler = await ethers.getContractFactory("LiquidityHandler") as LiquidityHandlerPolygon__factory;
    const IbAlluo = await ethers.getContractFactory("IbAlluo") as IbAlluo__factory;
    const Buffer = await ethers.getContractFactory("BufferManager") as BufferManager__factory;
    const Slave = await ethers.getContractFactory("VoteExecutorSlaveFinal") as VoteExecutorSlaveFinal__factory;

    buffer = await upgrades.deployProxy(Buffer,
      [604800,
        1000,
        604800,
        gnosis.address,
        spokepooladdress,
        anycalladdress,
        ZERO_ADDR,
      ], {
      initializer: 'initialize', unsafeAllow: ["delegatecall"],
      kind: 'uups'
    }
    ) as BufferManager;

    handler = await upgrades.deployProxy(Handler,
      [gnosis.address, exchangeAddress], {
      initializer: 'initialize', unsafeAllow: ["delegatecall"],
      kind: 'uups'
    }
    ) as LiquidityHandlerPolygon;

    slave = await upgrades.deployProxy(Slave,
      [gnosis.address, handler.address], {
          initializer: 'initialize', unsafeAllow: ["delegatecall"],
          kind: 'uups'
      }
    ) as VoteExecutorSlaveFinal;

    usdAdapter  = await upgrades.deployProxy(UsdAdapter,
      [
          gnosis.address,
          buffer.address,
          handler.address,
          200
      ], {
          initializer: 'initialize',
          kind: 'uups'
      }
    ) as UsdCurveAdapterUpgradeable;

    eurAdapter  = await upgrades.deployProxy(EurAdapter,
      [
          gnosis.address,
          buffer.address,
          handler.address,
          200
      ], {
          initializer: 'initialize',
          kind: 'uups'
      }
    ) as EurCurveAdapterUpgradeable;

    ethAdapter  = await upgrades.deployProxy(EthAdapter,
      [
          gnosis.address,
          buffer.address,
          handler.address
      ], {
          initializer: 'initialize',
          kind: 'uups'
      }
    ) as EthNoPoolAdapterUpgradeable;

    btcAdapter  = await upgrades.deployProxy(BtcAdapter,
      [
          gnosis.address,
          buffer.address,
          handler.address
      ], {
          initializer: 'initialize',
          kind: 'uups'
      }
    ) as BtcNoPoolAdapterUpgradeable;

    await usdAdapter.connect(gnosis).grantRole(await usdAdapter.DEFAULT_ADMIN_ROLE(), buffer.address)
    await eurAdapter.connect(gnosis).grantRole(await eurAdapter.DEFAULT_ADMIN_ROLE(), buffer.address)
    await ethAdapter.connect(gnosis).grantRole(await ethAdapter.DEFAULT_ADMIN_ROLE(), buffer.address)
    await btcAdapter.connect(gnosis).grantRole(await ethAdapter.DEFAULT_ADMIN_ROLE(), buffer.address)

    await usdAdapter.connect(gnosis).grantRole(await usdAdapter.DEFAULT_ADMIN_ROLE(), handler.address)
    await eurAdapter.connect(gnosis).grantRole(await eurAdapter.DEFAULT_ADMIN_ROLE(), handler.address)
    await ethAdapter.connect(gnosis).grantRole(await ethAdapter.DEFAULT_ADMIN_ROLE(), handler.address)
    await btcAdapter.connect(gnosis).grantRole(await ethAdapter.DEFAULT_ADMIN_ROLE(), handler.address)

    ibAlluoUsd = await upgrades.deployProxy(IbAlluo,
      [
        "Interest Bearing Alluo USD",
        "ibAlluoUsd",
        admin.address,
        handler.address,
        [
          dai.address,
          usdc.address,
          usdt.address
        ],
        BigNumber.from("100000000470636740"),
        1600,
        "0x86C80a8aa58e0A4fa09A69624c31Ab2a6CAD56b8",
        exchangeAddress
      ], {
      initializer: 'initialize',
      kind: 'uups'
    }
    ) as IbAlluo;

    ibAlluoEur = await upgrades.deployProxy(IbAlluo,
      [
        "Interest Bearing Alluo EUR",
        "ibAlluoEur",
        admin.address,
        handler.address,
        [
          jeur.address,
          par.address,
          eurt.address,
          eurs.address
        ],
        BigNumber.from("100000000470636740"),
        1600,
        "0x86C80a8aa58e0A4fa09A69624c31Ab2a6CAD56b8",
        exchangeAddress
      ], {
      initializer: 'initialize',
      kind: 'uups'
    }
    ) as IbAlluo;

    ibAlluoEth = await upgrades.deployProxy(IbAlluo,
      [
        "Interest Bearing Alluo ETH",
        "ibAlluoEth",
        admin.address,
        handler.address,
        [weth.address],
        BigNumber.from("100000000470636740"),
        1600,
        "0x86C80a8aa58e0A4fa09A69624c31Ab2a6CAD56b8",
        exchangeAddress
      ], {
      initializer: 'initialize',
      kind: 'uups',
      unsafeAllow: ["delegatecall"]

    }
    ) as IbAlluo;

    ibAlluoBtc = await upgrades.deployProxy(IbAlluo,
      [
        "Interest Bearing Alluo BTC",
        "ibAlluoBtc",
        admin.address,
        handler.address,
        [wbtc.address],
        BigNumber.from("100000000470636740"),
        1600,
        "0x86C80a8aa58e0A4fa09A69624c31Ab2a6CAD56b8",
        exchangeAddress
      ], {
      initializer: 'initialize',
      kind: 'uups',
      unsafeAllow: ["delegatecall"]

    }
    ) as IbAlluo;

    await handler.connect(admin).grantRole(await handler.DEFAULT_ADMIN_ROLE(), ibAlluoUsd.address)
    await handler.connect(admin).grantRole(await handler.DEFAULT_ADMIN_ROLE(), ibAlluoEur.address)
    await handler.connect(admin).grantRole(await handler.DEFAULT_ADMIN_ROLE(), ibAlluoEth.address)
    await handler.connect(admin).grantRole(await handler.DEFAULT_ADMIN_ROLE(), ibAlluoBtc.address)
    // await handler.connect(admin).setIbAlluoToAdapterId(ibAlluoUsd.address, 1)
    // await handler.connect(admin).setIbAlluoToAdapterId(ibAlluoEur.address, 2)

    await ibAlluoUsd.connect(gnosis).grantRole(await ibAlluoUsd.DEFAULT_ADMIN_ROLE(), handler.address)
    await ibAlluoEur.connect(gnosis).grantRole(await ibAlluoEur.DEFAULT_ADMIN_ROLE(), handler.address)
    await ibAlluoEth.connect(gnosis).grantRole(await ibAlluoEth.DEFAULT_ADMIN_ROLE(), handler.address)
    await ibAlluoBtc.connect(gnosis).grantRole(await ibAlluoBtc.DEFAULT_ADMIN_ROLE(), handler.address)
    // Params for BufferManager deployment
    const iballuos = [ibAlluoUsd.address, ibAlluoEur.address, ibAlluoEth.address, ibAlluoBtc.address]
    const adapters = [usdAdapter.address, eurAdapter.address, ethAdapter.address, btcAdapter.address]
    const tokensEth = [ "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", ZERO_ADDR, ZERO_ADDR, ZERO_ADDR ]
    const minBridge = [0, 0, 0, 0]
    const maxEpoch = [parseUnits("30000", 18), parseUnits("30000", 18), parseUnits("30000", 18), parseUnits("30000", 18)];
    const epoch = 86400

    await handler.connect(gnosis).grantRole(await handler.DEFAULT_ADMIN_ROLE(), gnosis.address)
    await handler.connect(gnosis).grantRole(await handler.DEFAULT_ADMIN_ROLE(), ibAlluoUsd.address)
    await buffer.connect(gnosis).grantRole(await buffer.DEFAULT_ADMIN_ROLE(), handler.address)
    await buffer.connect(gnosis).grantRole(await buffer.GELATO(), gelatoExecutor.address)
    await buffer.connect(gnosis).grantRole(await buffer.SWAPPER(), gelatoExecutor.address)

    await buffer.connect(gnosis).initializeValues(handler.address, iballuos, adapters, tokensEth, minBridge, maxEpoch, epoch)

    // 0.1 percent so it's easier to test some cases
    await handler.connect(gnosis).setAdapter(
      1,
      "USD Curve-Aave",
      500,
      usdAdapter.address,
      true
    )

    await handler.connect(gnosis).setAdapter(
      2,
      "EUR Curve-Aave",
      500,
      eurAdapter.address,
      true
    )

    await handler.connect(gnosis).setAdapter(
      3,
      "ETH No-Pool",
      500,
      ethAdapter.address,
      true
    )

    await handler.connect(gnosis).setAdapter(
      4,
      "BTC No-pool",
      500,
      btcAdapter.address,
      true
    )

    await usdAdapter.connect(gnosis).adapterApproveAll()
    await eurAdapter.connect(gnosis).adapterApproveAll()

    await handler.connect(admin).setIbAlluoToAdapterId(ibAlluoUsd.address, 1)
    await handler.connect(admin).setIbAlluoToAdapterId(ibAlluoEur.address, 2)
    await handler.connect(admin).setIbAlluoToAdapterId(ibAlluoEth.address, 3)
    await handler.connect(admin).setIbAlluoToAdapterId(ibAlluoBtc.address, 4)

    await usdAdapter.connect(admin).grantRole(await usdAdapter.DEFAULT_ADMIN_ROLE(), handler.address)
    await eurAdapter.connect(admin).grantRole(await eurAdapter.DEFAULT_ADMIN_ROLE(), handler.address)
    await ethAdapter.connect(admin).grantRole(await ethAdapter.DEFAULT_ADMIN_ROLE(), handler.address)
    await btcAdapter.connect(admin).grantRole(await btcAdapter.DEFAULT_ADMIN_ROLE(), handler.address)

    await buffer.connect(gnosis).setMinBridgeAmount(usdc.address, parseUnits("1000", 18))
    await buffer.connect(gnosis).setMinBridgeAmount(eurt.address, parseUnits("1000", 18))
    await buffer.connect(gnosis).setMinBridgeAmount(weth.address, parseUnits("1000", 18))
    await buffer.connect(gnosis).setMinBridgeAmount(wbtc.address, parseUnits("1000", 18))

    await buffer.connect(gnosis).setVoteExecutorSlave(slave.address)
    await buffer.connect(gnosis).setBridgeCap(usdc.address, parseUnits("1000000", 18))

    let entry = {
      directionId: 420,
      percent: 99
    }

    await slave.connect(gnosis).setEntries([entry])
    await slave.connect(gnosis).grantRole(await slave.DEFAULT_ADMIN_ROLE(), buffer.address)
    await buffer.connect(gnosis).setRefillThresholdPct(500)

    await buffer.connect(gnosis).setBridgeCap(usdc.address, parseUnits("10000000", 18))
    await buffer.connect(gnosis).setBridgeCap(eurt.address, parseUnits("10000000", 18))
    await buffer.connect(gnosis).setBridgeCap(weth.address, parseUnits("10000000", 18))
    await buffer.connect(gnosis).setBridgeCap(wbtc.address, parseUnits("10000000", 18))

    await buffer.connect(gnosis).setSlippageControl(ibAlluoUsd.address, 200)
    await buffer.connect(gnosis).setSlippageControl(ibAlluoEur.address, 200)
    await buffer.connect(gnosis).setSlippageControl(ibAlluoEth.address, 200)
    await buffer.connect(gnosis).setSlippageControl(ibAlluoBtc.address, 200)
    await buffer.connect(gnosis).grantRole(await buffer.DEFAULT_ADMIN_ROLE(), gelatoExecutor.address)
  });

  describe("Initial setup", async() => {
    it("Should initialize correct values", async () => {
      expect(await buffer.ibAlluoToMaxRefillPerEpoch(ibAlluoUsd.address)).to.eq(parseUnits("30000", 18))
      expect(await buffer.ibAlluoToMaxRefillPerEpoch(ibAlluoEur.address)).to.eq(parseUnits("30000", 18))
      expect(await buffer.ibAlluoToMaxRefillPerEpoch(ibAlluoEth.address)).to.eq(parseUnits("30000", 18))
      expect(await buffer.ibAlluoToMaxRefillPerEpoch(ibAlluoBtc.address)).to.eq(parseUnits("30000", 18))

      expect(await buffer.ibAlluoToAdapter(ibAlluoUsd.address)).to.eq(usdAdapter.address)
      expect(await buffer.ibAlluoToAdapter(ibAlluoEur.address)).to.eq(eurAdapter.address)
      expect(await buffer.ibAlluoToAdapter(ibAlluoEth.address)).to.eq(ethAdapter.address)
      expect(await buffer.ibAlluoToAdapter(ibAlluoBtc.address)).to.eq(btcAdapter.address)
    })
  })

  describe("Gelato Checkers", async () => {
    it("checkerRefill: Adapter needs a refill, returns true and refillBuffer call", async () => {
      await deposit(signers[1], usdc, parseUnits("100000", 6))
      await ibAlluoUsd.connect(signers[1]).withdraw(usdc.address, parseUnits("10000", 18))

      await usdc.connect(usdWhale).transfer(buffer.address, parseUnits("50000", 6))

      console.log("canRefill", await buffer.canRefill(ibAlluoUsd.address, usdc.address))
      console.log("canBridge", await buffer.canBridge(usdc.address, await usdc.balanceOf(buffer.address)))

      const [canExec, execPayload] = await buffer.checkerRefill()
      expect(canExec).to.eq(true)

      console.log("refill", execPayload)
    })

    it("checkerBridge: Adapters don't need a refill, balance exceeds minBridgeAmount, returns true, and swap call", async () => {
      await deposit(signers[1], usdc, parseUnits("40000", 6))
      await buffer.connect(gnosis).setBridgeCap(usdc.address, parseUnits("1000000", 18))
      await buffer.connect(gnosis).setMinBridgeAmount(usdc.address, 1)
      await buffer.connect(gnosis).changeBridgeInterval(0)

      const [canExec, execPayload] = await buffer.checkerBridge()
      expect(canExec).to.eq(true)
      console.log("swap", execPayload)
    })

    it("checkerBridge: Adapters don't need a refill, true when minBridge 0, false when minBridge more than buffer balance", async () => {
      await usdc.connect(usdWhale).transfer(buffer.address, parseUnits("990", 6))
      let [canExec, execPayload] = await buffer.checkerBridge()
      expect(canExec).to.eq(false)

      await buffer.connect(gnosis).setMinBridgeAmount(usdc.address, parseUnits("900", 6))

      let [canExec1, execPayload1] = await buffer.checkerBridge()
      expect(canExec1).to.eq(true)
    })

    it("checkerRefill: Adapter needs a refill, buffer balance < refill, gnosis has enough funds, returns true", async () => {
      await deposit(signers[1], usdc, parseUnits("50000", 6))
      await ibAlluoUsd.connect(signers[1]).withdraw(usdc.address, parseUnits("40000", 18))

      await buffer.connect(gnosis).swap(42000000000, usdc.address)
      let [canExec, execPayload] = await buffer.checkerRefill()
      expect(canExec).to.eq(false)

      await usdc.connect(usdWhale).transfer(gnosis.address, parseUnits("35000", 6))
      await buffer.connect(gnosis).setMaxRefillPerEpoch(ibAlluoUsd.address, parseUnits("1000000", 18))
      let [canExec1, execPayload1] = await buffer.checkerRefill()
      expect(canExec1).to.eq(true)
    })

    it("checkerRefill: Adapter needs a refill, buffer balance is 0, gnosis has enough, returns true", async () => {
      await deposit(signers[1], usdc, parseUnits("40000", 6))
      await ibAlluoUsd.connect(signers[1]).withdraw(usdc.address, parseUnits("20000", 18))

      await buffer.connect(gnosis).swap(await usdc.balanceOf(buffer.address), usdc.address);
      await usdc.connect(gnosis).transfer(usdWhale.address, await usdc.balanceOf(gnosis.address));

      let [canExec, execPayload] = await buffer.checkerRefill()
      expect(canExec).to.eq(false)

      await usdc.connect(usdWhale).transfer(gnosis.address, parseUnits("45000", 6))

      let [canExec1, execPayload1] = await buffer.checkerRefill()
      expect(canExec1).to.eq(true)
    })
  })

  describe("refillBuffer", async () => {
    it("Should refill adapters", async () => {
      await deposit(signers[1], usdc, parseUnits("20000", 6))
      await ibAlluoUsd.connect(signers[1]).withdraw(usdc.address, parseUnits("20000", 18))
      await usdc.connect(usdWhale).transfer(buffer.address, parseUnits("5000", 6))
      expect(Number(await buffer.adapterRequiredRefill(ibAlluoUsd.address))).to.be.greaterThan(Number(parseUnits("10000", 18)))
      let result = await buffer.connect(gelatoExecutor).refillBuffer(ibAlluoUsd.address)
      expect(await buffer.adapterRequiredRefill(ibAlluoUsd.address)).to.eq(0);
    })

    it("Should refill adapter using gnosis funds", async () => {
      await deposit(signers[1], usdc, parseUnits("20000", 6))
      await ibAlluoUsd.connect(signers[1]).withdraw(usdc.address, parseUnits("20000", 18))
      await buffer.connect(gnosis).swap(await usdc.balanceOf(buffer.address), usdc.address)
      console.log("Gnosis balance before", await usdc.balanceOf(gnosis.address))
      await usdc.connect(gnosis).approve(buffer.address, await usdc.balanceOf(gnosis.address))
      await buffer.connect(gnosis).setMaxRefillPerEpoch(ibAlluoUsd.address, parseUnits("50000", 18))
      await buffer.connect(gelatoExecutor).refillBuffer(ibAlluoUsd.address)
      console.log("Gnosis balance after", await usdc.balanceOf(gnosis.address))

      expect(await buffer.adapterRequiredRefill(ibAlluoUsd.address)).to.eq(0)
    })

    it("Should refill using both buffer and gnosis", async () => {
      // Depositing
      await deposit(signers[1], usdc, parseUnits("20000", 6))
      await ibAlluoUsd.connect(signers[1]).withdraw(usdc.address, parseUnits("20000", 18))
      console.log("Balance before refilling", await usdc.balanceOf(signers[1].address))

      // Executing swap to make buffer call gnosis for funds
      await buffer.connect(gnosis).swap(parseUnits("10000", 6), usdc.address)
      await buffer.connect(gnosis).setMaxRefillPerEpoch(ibAlluoUsd.address, parseUnits("50000", 18))
      await usdc.connect(gnosis).approve(buffer.address, await usdc.balanceOf(gnosis.address))
      console.log("Required refill", await buffer.adapterRequiredRefill(ibAlluoUsd.address))
      console.log("Is adapter pending withdrawal before:", await buffer.isAdapterPendingWithdrawal(ibAlluoUsd.address))
      await buffer.connect(gelatoExecutor).refillBuffer(ibAlluoUsd.address)
      console.log("Is adapter pending withdrawal after:",await buffer.isAdapterPendingWithdrawal(ibAlluoUsd.address))
      let balanceAfter = await usdc.balanceOf(signers[1].address)
      console.log("Balance after refilling", balanceAfter)
    })

    it("Should not refill: Cumulative refill exceeds limit", async () => {
      await deposit(signers[1], usdc, parseUnits("20000", 6))
      await ibAlluoUsd.connect(signers[1]).withdraw(usdc.address, parseUnits("20000", 18))
      await buffer.connect(gnosis).swap(parseUnits("10000", 6), usdc.address)
      expect(buffer.connect(gelatoExecutor).refillBuffer(ibAlluoUsd.address)).to.be.revertedWith("Cumulative refills exceeds limit")
    })

    it("Should not refill, refill not needed", async () => {
      await buffer.connect(gnosis).setMaxRefillPerEpoch(ibAlluoUsd.address, parseUnits("50000", 18))
      await usdc.connect(gnosis).approve(buffer.address, await usdc.balanceOf(gnosis.address))
      expect(buffer.connect(gelatoExecutor).refillBuffer(ibAlluoUsd.address)).to.be.revertedWith("No refill required");
    })

    it("Should not refill, both gnosis and buffer can't cover", async () => {
      await deposit(signers[1], usdc, parseUnits("10000", 6))
      await ibAlluoUsd.connect(signers[1]).withdraw(usdc.address, parseUnits("8000", 18))
      await usdc.connect(gnosis).transfer(usdWhale.address, await usdc.balanceOf(gnosis.address))
      await buffer.connect(gelatoExecutor).refillBuffer(ibAlluoUsd.address)
    })

    it("Should not refill if adapter exceeded it's cumulative refill limit", async () => {
      // Initializing needed settings
      await buffer.connect(gnosis).setMaxRefillPerEpoch(ibAlluoUsd.address, parseUnits("3000", 18))
      await buffer.connect(gnosis).setMinBridgeAmount(usdc.address, 1)
      await buffer.connect(gnosis).changeBridgeInterval(0)
      
      // Approving buffer from gnosis and refilling gnosis to allow refills using gnosis safe
      await usdc.connect(usdWhale).transfer(gnosis.address, parseUnits("30000", 6))
      await usdc.connect(gnosis).approve(buffer.address, await usdc.balanceOf(gnosis.address))

      await deposit(signers[2], usdc, parseUnits("1000", 6))
      // Creating a scenario of buffer having no funds
      await buffer.connect(gnosis).swap(await usdc.balanceOf(buffer.address), usdc.address)
      await ibAlluoUsd.connect(signers[2]).withdraw(usdc.address, parseUnits("1000", 18));
     
      const [canExec] = await buffer.checkerRefill()
      expect(canExec).to.be.equal(true);

      await buffer.connect(gelatoExecutor).refillBuffer(ibAlluoUsd.address)

      await deposit(signers[2], usdc, parseUnits("2400", 6))
      await ibAlluoUsd.connect(signers[2]).withdraw(usdc.address, parseUnits("2400", 18));

      await buffer.connect(gnosis).swap(await usdc.balanceOf(buffer.address), usdc.address)

      await expect(buffer.connect(gelatoExecutor).refillBuffer(ibAlluoUsd.address)).to.be.revertedWith('Cumulative refills exceeds limit')
      await skipDays(2.5)
      await buffer.connect(gelatoExecutor).refillBuffer(ibAlluoUsd.address)
      
      expect(Number(await usdc.balanceOf(signers[2].address))).to.be.greaterThan(Number(parseUnits("3300", 6)))
    })
  })

  describe("Swapping", async () => {
    it("Should only allow Gelato to execute the swap", async () => {
      await expect(buffer.swap(800, usdc.address)).to.be.reverted
    })

    it("Should not allow swapping below minimum amount", async () => {
      await buffer.connect(gnosis).setMinBridgeAmount(usdc.address, parseUnits("1000", 18))
      await expect(buffer.connect(gelatoExecutor).swap(800, usdc.address)).to.be.revertedWith("Buffer: <minAmount or <bridgeInterval")
    })

    it("Should execute swap", async () => {
      await (await (await ethers.getContractFactory("ForceSender")).deploy({
        value: parseEther("10.0")
      })).forceSend(gelatoExecutor.address);

      await usdc.connect(usdWhale).transfer(buffer.address, parseUnits("2000", 6))

      await buffer.connect(gelatoExecutor).swap(parseUnits("1800", 6), usdc.address);
    })

    it("Should not allow to swap twice immediately", async () => {
      await (await (await ethers.getContractFactory("ForceSender")).deploy({
        value: parseEther("10.0")
      })).forceSend(gelatoExecutor.address);

      await usdc.connect(usdWhale).transfer(buffer.address, parseUnits("2000", 6))

      await buffer.connect(gelatoExecutor).swap(parseUnits("1800", 6), usdc.address);
      expect(buffer.connect(gelatoExecutor).swap(parseUnits("2300", 6), usdc.address)).to.be.revertedWith("Swap: <minInterval!")
    })
  })

  describe("isAdapterPendingWithdrawal", async () => {
    it("Should return false when no withdrawals, true after requested one", async () => {
      expect(await buffer.isAdapterPendingWithdrawal(ibAlluoUsd.address)).to.eq(false)

      await deposit(signers[2], usdc, parseUnits("500", 6))
      await ibAlluoUsd.connect(signers[2]).withdraw(usdc.address, parseUnits("300", 18))

      expect(await buffer.isAdapterPendingWithdrawal(ibAlluoUsd.address)).to.eq(true)
    })

    it.only("Should return true after one of two withdrawals was satisfied", async() => {
      expect(await buffer.isAdapterPendingWithdrawal(ibAlluoUsd.address)).to.eq(false)
      await deposit(signers[2], usdc, parseUnits("500", 6))
      await ibAlluoUsd.connect(signers[2]).withdraw(usdc.address, parseUnits("300", 18))
      
      await eurt.connect(eurtWhale).transfer(signers[2].address, parseUnits("1000", 6))
      await eurt.connect(signers[2]).approve(ibAlluoEur.address, parseUnits("1000", 6))

      await ibAlluoEur.connect(signers[2]).deposit(eurt.address, parseUnits("1000", 6))
      await ibAlluoEur.connect(signers[2]).withdraw(eurt.address, parseUnits("700", 18))
      // Transferring extra funds to buffer because adapter leaves TVL pct in pool
      await usdc.connect(usdWhale).transfer(buffer.address, parseUnits("2000", 6))

      await buffer.connect(gelatoExecutor).refillBuffer(ibAlluoUsd.address)

      expect(await buffer.isAdapterPendingWithdrawal(ibAlluoUsd.address)).to.eq(false)
      expect(await buffer.isAdapterPendingWithdrawal(ibAlluoEur.address)).to.eq(true)
    })
  })

  describe("canBridge", async () => {
    it("Should be false by default", async() => {
      expect(await buffer.canBridge(usdc.address, await usdc.balanceOf(buffer.address))).to.eq(false)
    })
    
    it("Should return true, enough balance to swap", async () => {
      await usdc.connect(usdWhale).transfer(buffer.address, parseUnits("2000", 6))
      expect(await buffer.canBridge(usdc.address, await usdc.balanceOf(buffer.address))).to.eq(true)
    })
  })

  describe("canRefill", async () => {
    it("Should be false by default", async() => {
      expect(await buffer.canRefill(ibAlluoUsd.address, usdc.address)).to.eq(false)
    })

    it("Should be true after withdrawal is requested and buffer + gnosis have enough funds to cover it", async () => {
      await deposit(signers[1], usdc, parseUnits("2000", 6))
      await ibAlluoUsd.connect(signers[1]).withdraw(usdc.address, parseUnits("550", 18))

      expect(await buffer.canRefill(ibAlluoUsd.address, usdc.address)).to.eq(true)
    })

    it("Should be true if withdrawal is requested, buffer is at 0, but gnosis has enough to cover", async() => {
      await deposit(signers[1], usdc, parseUnits("2000", 6))
      await ibAlluoUsd.connect(signers[1]).withdraw(usdc.address, parseUnits("550", 18))

      await buffer.connect(gnosis).setMinBridgeAmount(usdc.address, await usdc.balanceOf(buffer.address))
      await buffer.connect(gelatoExecutor).swap(await usdc.balanceOf(buffer.address),usdc.address)

      expect(await buffer.canRefill(ibAlluoUsd.address, usdc.address)).to.eq(true)
    })
  })

  describe("confirmEpoch", async() => {
    it("Should set values", async () => {
      await buffer.connect(gnosis).setEpochDuration(1);
      await buffer.connect(gnosis).setMaxRefillPerEpoch(ibAlluoUsd.address, parseUnits("3000", 18))

      expect(await buffer.ibAlluoToMaxRefillPerEpoch(ibAlluoUsd.address)).to.eq(parseUnits("3000", 18))
    })

    it("Should store correct values after confirming the Epoch", async() => {
      await deposit(signers[1], usdc, parseUnits("1000", 6))

      await buffer.connect(gnosis).setMinBridgeAmount(usdc.address, await usdc.balanceOf(buffer.address))
      await buffer.connect(gelatoExecutor).swap(await usdc.balanceOf(buffer.address), usdc.address)
      await usdc.connect(gnosis).approve(buffer.address, await usdc.balanceOf(gnosis.address))

      await ibAlluoUsd.connect(signers[1]).withdraw(usdc.address, parseUnits("1000", 18))

      await buffer.connect(gnosis).refillBuffer(ibAlluoUsd.address)

      let epoch :{
        startTime: BigNumber;
        refilledPerEpoch: BigNumber;
      }  = await buffer.ibAlluoToEpoch(ibAlluoUsd.address, 0)

      expect(Number(epoch.refilledPerEpoch)).to.be.greaterThan(Number(parseUnits("900", 18)))
      expect(Number(epoch.refilledPerEpoch)).to.be.lessThan(Number(parseUnits("1100", 18)))
    })

    it("Should reset values after cycle is over", async () => {
      await deposit(signers[1], usdc, parseUnits("1000", 6))

      await buffer.connect(gnosis).setMinBridgeAmount(usdc.address, await usdc.balanceOf(buffer.address))
      await buffer.connect(gelatoExecutor).swap(await usdc.balanceOf(buffer.address), usdc.address)
      await usdc.connect(gnosis).approve(buffer.address, await usdc.balanceOf(gnosis.address))

      await ibAlluoUsd.connect(signers[1]).withdraw(usdc.address, parseUnits("1000", 18))

      await buffer.connect(gnosis).refillBuffer(ibAlluoUsd.address)

      await skipDays(2)

      await deposit(signers[1], usdc, parseUnits("3000", 6))

      await buffer.connect(gnosis).setMinBridgeAmount(usdc.address, await usdc.balanceOf(buffer.address))
      await buffer.connect(gnosis).changeBridgeInterval(0)
      await buffer.connect(gelatoExecutor).swap(await usdc.balanceOf(buffer.address), usdc.address)
      await usdc.connect(gnosis).approve(buffer.address, await usdc.balanceOf(gnosis.address))

      await ibAlluoUsd.connect(signers[1]).withdraw(usdc.address, parseUnits("2700", 18))

      await buffer.connect(gnosis).refillBuffer(ibAlluoUsd.address)

      let epoch :{
        startTime: BigNumber;
        refilledPerEpoch: BigNumber;
      }  = await buffer.ibAlluoToEpoch(ibAlluoUsd.address, 1)

      // expect(before.refilledPerEpoch).to.eq()
      expect(Number(epoch.refilledPerEpoch)).to.be.lessThan(Number(parseUnits("2800",18)))
      expect(Number(epoch.refilledPerEpoch)).to.be.greaterThan(Number(parseUnits("2600",18)))

    })

    it("Should not refill, time passed < epoch duration", async () => {
      await buffer.connect(gnosis).setEpochDuration(90000)
      await deposit(signers[1], usdc, parseUnits("1000", 6))

      await buffer.connect(gnosis).setMinBridgeAmount(usdc.address, await usdc.balanceOf(buffer.address))
      await buffer.connect(gelatoExecutor).swap(await usdc.balanceOf(buffer.address), usdc.address)
      await usdc.connect(usdWhale).transfer(gnosis.address, parseUnits("100000", 6))
      await usdc.connect(gnosis).approve(buffer.address, await usdc.balanceOf(gnosis.address))

      await ibAlluoUsd.connect(signers[1]).withdraw(usdc.address, parseUnits("1000", 18))

      await buffer.connect(gnosis).refillBuffer(ibAlluoUsd.address)

      await skipDays(2)

      await deposit(signers[1], usdc, parseUnits("35000", 6))

      await buffer.connect(gnosis).setMinBridgeAmount(usdc.address, await usdc.balanceOf(buffer.address))
      await buffer.connect(gnosis).changeBridgeInterval(0)
      await buffer.connect(gelatoExecutor).swap(await usdc.balanceOf(buffer.address), usdc.address)
      await usdc.connect(gnosis).approve(buffer.address, await usdc.balanceOf(gnosis.address))

      await ibAlluoUsd.connect(signers[1]).withdraw(usdc.address, parseUnits("32000", 18))

      await expect(buffer.connect(gnosis).refillBuffer(ibAlluoUsd.address)).to.be.reverted
    })
  })

  describe("getEntries", async () => {
    it("Should output correct value", async() => {
      let[direction, prct] = await slave.connect(gnosis.address).getEntries()
      expect(direction[0]).to.eq(420)
      expect(prct[0]).to.eq(99)
    })
  })  
    
  describe("setEntries", async () => {
    it("Should set correct entries", async () => {
      let entrs = [{
        directionId: 12,
        percent: 42,
      },
      {
        directionId: 14,
        percent: 58
      }]

      await slave.connect(gnosis).setEntries(entrs)

      let[[direction, direction1], [pct, pct1]] = await slave.connect(gnosis).getEntries()

      expect(direction).to.eq(12)
      expect(direction1).to.eq(14)
      expect(pct).to.eq(42)
      expect(pct1).to.eq(58)
    })
  })

  describe("Case Testing", async () => {
    it("USDC deposit, attempted withdrawal immediately, success after another deposit", async () => {
      await deposit(signers[5], usdc, parseUnits("1000", 6))
      await ibAlluoUsd.connect(signers[5]).withdraw(usdc.address, parseUnits("1000", 18))
      let withdrawalArray = await getLastWithdrawalInfo(ibAlluoUsd, handler)
      expect(withdrawalArray[0]).not.equal(withdrawalArray[1])
      expect(await usdc.balanceOf(signers[5].address)).to.be.equal(0)

      await deposit(signers[4], usdc, parseUnits("10000", 6));
      await handler.satisfyAdapterWithdrawals(ibAlluoUsd.address)
      expect(Number(await usdc.balanceOf(signers[5].address))).lessThan(Number(parseUnits("1100", 6)))
      expect(Number(await usdc.balanceOf(signers[5].address))).greaterThanOrEqual(Number(parseUnits("900", 6)))
    })

    it("EURT deposit, attempted withdrawal, success after buffer is refilled", async () => {
      // Deposit
      await eurt.connect(eurtWhale).transfer(signers[2].address, parseUnits("700", 6))
      await eurt.connect(signers[2]).approve(ibAlluoEur.address, parseUnits("700", 6))
      await ibAlluoEur.connect(signers[2]).deposit(eurt.address, parseUnits("700", 6))

      // Withdrawal request
      await ibAlluoEur.connect(signers[2]).withdraw(eurt.address, parseUnits("500", 18))
      expect(await eurt.balanceOf(signers[2].address)).to.eq(0);

      // Executing refill after gelato is flagged
      await buffer.connect(gelatoExecutor).refillBuffer(ibAlluoEur.address)
      expect(Number(await eurt.balanceOf(signers[2].address))).to.be.greaterThan(Number(parseUnits("495", 6)))

    })

    it("WETH deposit, attempted withdrawal, success after buffer is refilled", async () => {
      // Deposit
      await weth.connect(wethWhale).transfer(signers[2].address, parseUnits("2", 18))
      await weth.connect(signers[2]).approve(ibAlluoEth.address, parseUnits("2", 18))
      await ibAlluoEth.connect(signers[2]).deposit(weth.address, parseUnits("2", 18))

      // Withdrawal request
      await ibAlluoEth.connect(signers[2]).withdraw(weth.address, parseUnits("0.7", 18))
      expect(await weth.balanceOf(signers[2].address)).to.eq(0);

      // Gelato checker is now true
      await buffer.connect(gnosis).setMaxRefillPerEpoch(weth.address, parseUnits("10000000000000", 18))
      const [canExec, execPayload] = await buffer.checkerRefill()
      expect(canExec).to.eq(true)

      // Executing refill after gelato is flagged
      await buffer.connect(gelatoExecutor).refillBuffer(ibAlluoEth.address)
      expect(Number(await weth.balanceOf(signers[2].address))).to.eq(Number(parseUnits("0.7", 18)))
    })

    it("WBTC deposit, attempted withdrawal, success after buffer is refilled", async () => {
      // Deposit
      await wbtc.connect(wbtcWhale).transfer(signers[2].address, parseUnits("2", 8))
      await wbtc.connect(signers[2]).approve(ibAlluoBtc.address, parseUnits("2", 8))
      await ibAlluoBtc.connect(signers[2]).deposit(wbtc.address, parseUnits("2", 8))

      // Making sure checker is false before the withdrawal request
      const [canExecBefore, execPayloadBefore] = await buffer.checkerRefill()
      expect(canExecBefore).to.eq(false)

      // Withdrawal request
      await ibAlluoBtc.connect(signers[2]).withdraw(wbtc.address, parseUnits("1", 18));
      expect(await wbtc.balanceOf(signers[2].address)).to.eq(0)

      // Gelato checker is now true
      const [canExec, execPayload] = await buffer.checkerRefill()
      expect(canExec).to.eq(true)

      // Executing refill after gelato is flagged
      await buffer.connect(gelatoExecutor).refillBuffer(ibAlluoBtc.address)
      expect(Number(await wbtc.balanceOf(signers[2].address))).to.eq(Number(parseUnits("1", 8)))
    })

    it("WETH refill from buffer and gnosis", async() => {
      // Depositing WETH
      await weth.connect(wethWhale).transfer(signers[2].address, parseUnits("2", 18))
      await weth.connect(signers[2]).approve(ibAlluoEth.address, parseUnits("2", 18))
      await ibAlluoEth.connect(signers[2]).deposit(weth.address, parseUnits("2", 18))
      
      // Swapping funds so that buffer only has part of the sum needed to refill, so that he uses gnosis
      await weth.connect(wethWhale).transfer(gnosis.address, parseUnits("1", 18))
      await buffer.connect(gnosis).setMinBridgeAmount(weth.address, parseUnits("1", 17))
      await buffer.connect(gelatoExecutor).swap(parseUnits("1", 18), weth.address)

      // Withdrawal request
      await ibAlluoEth.connect(signers[2]).withdraw(weth.address, parseUnits("1", 18))

      // Gelato checker is now true
      const [canExec, execPayload] = await buffer.checkerRefill()
      expect(canExec).to.eq(true)
      
      // Increasing MaxRefillPerEpoch and Granting allowance to buffer
      await buffer.connect(gnosis).setMaxRefillPerEpoch(ibAlluoEth.address, parseUnits("10", 18))
      await weth.connect(gnosis).approve(buffer.address, parseUnits("1", 18))

      // Refilling the buffer, executing the queued withdrawal
      await buffer.connect(gelatoExecutor).refillBuffer(ibAlluoEth.address)
      expect(Number(await weth.balanceOf(signers[2].address))).to.eq(Number(parseUnits("1", 18)))
    })
  })

  describe("Admin functions", async () => {
    it("Should not allow users without admin role to call functions", async () => {
      expect(buffer.connect(signers[1]).changeBridgeInterval(100)).to.be.reverted
      expect(buffer.connect(signers[1]).addIBAlluoPool(handler.address, gnosis.address)).to.be.reverted
      expect(buffer.connect(signers[1]).removeIBAlluoPool(ibAlluoUsd.address)).to.be.reverted
      expect(buffer.connect(signers[1]).setEthToken(ibAlluoUsd.address, dai.address)).to.be.reverted
      expect(buffer.connect(signers[1]).setAnycall(gnosis.address)).to.be.reverted
      expect(buffer.connect(signers[1]).setDistributor(gnosis.address)).to.be.reverted
      expect(buffer.connect(signers[1]).setVoteExecutorSlave(gnosis.address)).to.be.reverted
      expect(buffer.connect(signers[1]).setRelayerFeePct(42)).to.be.reverted
    })

    it("Should add IBAlluo", async () => {
      await buffer.connect(gnosis).addIBAlluoPool(gnosis.address, handler.address)
      expect(await buffer.ibAlluoToAdapter(gnosis.address)).to.equal(handler.address)
    })

    it("Should remove IBAlluo", async () => {
      await buffer.connect(gnosis).addIBAlluoPool(gnosis.address, handler.address)
      expect(await buffer.ibAlluoToAdapter(gnosis.address)).to.equal(handler.address)

      await buffer.connect(gnosis).removeIBAlluoPool(gnosis.address)
      expect(await buffer.ibAlluoToAdapter(gnosis.address)).to.equal(ZERO_ADDR)
    })

    it("Should change the bridge interval", async() => {
      await buffer.connect(gnosis).changeBridgeInterval(420000)
      expect(await buffer.bridgeInterval()).to.be.equal(420000)
    })

    it("Should set minBrigeAmount", async () => {
      await buffer.connect(gnosis).setMinBridgeAmount(usdc.address, parseUnits("5000", 6))
      expect(await buffer.tokenToMinBridge(usdc.address)).to.eq(parseUnits("5000", 6))
    })

    it("Should set relayersFeePct", async() => {
      await buffer.connect(gnosis).setRelayerFeePct(parseUnits("5",16))
      expect(await buffer.relayerFeePct()).to.eq(parseUnits("5",16))
    })

    it("Should set VoteExecutorSlave contract", async() => {
      await buffer.connect(gnosis).setVoteExecutorSlave(gnosis.address)
      expect(await buffer.slave()).to.eq(gnosis.address)
    })

    it("Should set anycall contract address", async() => {
      await buffer.connect(gnosis).setAnycall(gnosis.address)
      expect(await buffer.anycall()).to.eq(gnosis.address)
    })

    it("Should set distributor contract address", async () => {
      await buffer.connect(gnosis).setDistributor(gnosis.address)
      expect(await buffer.distributor()).to.eq(gnosis.address)
    })

    it("Should set Mainnet corresponding token", async() => {
      await buffer.connect(gnosis).setEthToken(ibAlluoUsd.address, dai.address)
      expect(await buffer.tokenToEth(ibAlluoUsd.address)).to.eq(dai.address)
    })

    it("Should set maxRefillPerEpoch", async () => {
      await buffer.connect(gnosis).setMaxRefillPerEpoch(ibAlluoUsd.address, 420)
      expect(await buffer.ibAlluoToMaxRefillPerEpoch(ibAlluoUsd.address)).to.eq(420)
    })

    it("Should set Epoch duration", async () => {
      await buffer.connect(gnosis).setEpochDuration(420)
      expect(await buffer.epochDuration()).to.eq(420)
    })
  })


  async function deposit(recipient: SignerWithAddress, token: IERC20, amount: BigNumberish) {
    await token.connect(usdWhale).transfer(recipient.address, amount);

    await token.connect(recipient).approve(ibAlluoUsd.address, amount);

    await ibAlluoUsd.connect(recipient).deposit(token.address, amount);
  }
});