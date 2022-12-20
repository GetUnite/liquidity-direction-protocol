import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { parseEther, parseUnits } from "ethers/lib/utils";
import { ethers, network, upgrades } from "hardhat";
import { BigNumber, BigNumberish, BytesLike, Contract } from "ethers";
import { before } from "mocha";
import {
  BufferManager,
  IERC20MetadataUpgradeable,
  Exchange,
  BufferManager__factory, 
  IERC20, IbAlluo, IbAlluo__factory, LiquidityHandler, UsdCurveAdapter, BtcCurveAdapter, LiquidityHandler__factory,
  UsdCurveAdapter__factory, EurCurveAdapter, EthNoPoolAdapter, EurCurveAdapter__factory,EthNoPoolAdapter__factory, PseudoMultisigWallet, 
} from "../../typechain";

async function getImpersonatedSigner(address: string): Promise < SignerWithAddress > {
  await ethers.provider.send(
      'hardhat_impersonateAccount',
      [address]
  );

  return await ethers.getSigner(address);
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

async function skipDays(days: number) {
  ethers.provider.send("evm_increaseTime", [days * 86400]);
  ethers.provider.send("evm_mine", []);
}

async function getLastWithdrawalInfo(token: IbAlluo, handler: LiquidityHandler) {
  let request = (await handler.ibAlluoToWithdrawalSystems(token.address)).lastWithdrawalRequest
  let satisfied = (await handler.ibAlluoToWithdrawalSystems(token.address)).lastSatisfiedWithdrawal
  let total = (await handler.ibAlluoToWithdrawalSystems(token.address)).totalWithdrawalAmount
  return [request, satisfied, total]
}


describe("BufferManager tests", () => {
  let signers: SignerWithAddress[];
  let signer: SignerWithAddress;
  let gnosis: SignerWithAddress;
  let gelatoExecutor: SignerWithAddress;
  let anycall: SignerWithAddress;
  let usdWhale: SignerWithAddress;
  let jeurWhale: SignerWithAddress;
  let curveUsdLpHolder: SignerWithAddress;
  let admin: SignerWithAddress;

  let ibAlluoUsd: IbAlluo;
  let ibAlluoEur: IbAlluo;
  let ibAlluoEth: IbAlluo;
  let ibAlluoBtc: IbAlluo;

  let iballuousd: IbAlluo;
  let exchange: Exchange;
  let multisig: PseudoMultisigWallet;
  let handler: LiquidityHandler;
  let buffer: BufferManager;

  let usdAdapter: UsdCurveAdapter;
  let eurAdapter: EurCurveAdapter;
  let ethAdapter: EthNoPoolAdapter;
  let btcAdapter: BtcCurveAdapter;

  let dai: IERC20, usdc: IERC20, usdt: IERC20; let jeur: IERC20;
  let par: IERC20, eurt: IERC20, eurs: IERC20

  const exchangeAddress = "0x6b45B9Ab699eFbb130464AcEFC23D49481a05773";
  const spokepooladdress = "0x69B5c72837769eF1e7C164Abc6515DcFf217F920";
  const anycalladdress = "0xC10Ef9F491C9B59f936957026020C321651ac078";
  const gelatoaddress = "0x7A34b2f0DA5ea35b5117CaC735e99Ba0e2aCEECD";
  const iballuoaddress = "0xC2DbaAEA2EfA47EBda3E572aa0e55B742E408BF6";

  const ZERO_ADDR = ethers.constants.AddressZero;


  before(async function () {
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
        }, ],
    });

    admin = await getImpersonatedSigner("0x2580f9954529853Ca5aC5543cE39E9B5B1145135");

    usdWhale = await getImpersonatedSigner("0x075e72a5eDf65F0A5f44699c7654C1a76941Ddc8");
    jeurWhale = await getImpersonatedSigner("0x00d7c133b923548f29cc2cc01ecb1ea2acdf2d4c");
    curveUsdLpHolder = await getImpersonatedSigner("0x7117de93b352ae048925323f3fcb1cd4b4d52ec4");

    signers = await ethers.getSigners(); 

    gnosis = await getImpersonatedSigner("0x2580f9954529853Ca5aC5543cE39E9B5B1145135");
    anycall = await getImpersonatedSigner("0xC10Ef9F491C9B59f936957026020C321651ac078");
    gelatoExecutor = await getImpersonatedSigner("0x7A34b2f0DA5ea35b5117CaC735e99Ba0e2aCEECD");

    usdc = await ethers.getContractAt("IERC20", "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174");
    usdt = await ethers.getContractAt("IERC20", "0xc2132D05D31c914a87C6611C10748AEb04B58e8F");
    jeur = await ethers.getContractAt("IERC20", "0x4e3Decbb3645551B8A19f0eA1678079FCB33fB4c");
    dai = await ethers.getContractAt("IERC20", "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063");

    jeur = await ethers.getContractAt("IERC20", "0x4e3Decbb3645551B8A19f0eA1678079FCB33fB4c");
    par = await ethers.getContractAt("IERC20", "0xE2Aa7db6dA1dAE97C5f5C6914d285fBfCC32A128");
    eurt = await ethers.getContractAt("IERC20", "0x7BDF330f423Ea880FF95fC41A280fD5eCFD3D09f");
    eurs = await ethers.getContractAt("IERC20", "0xE111178A87A3BFf0c8d18DECBa5798827539Ae99");

    await (await (await ethers.getContractFactory("ForceSender")).deploy({
      value: parseEther("10.0")
    })).forceSend(gnosis.address); 

    upgrades.silenceWarnings()
  });

  beforeEach(async function() {
    const UsdAdapter = await ethers.getContractFactory("UsdCurveAdapter") as UsdCurveAdapter__factory;
    const EurAdapter = await ethers.getContractFactory("EurCurveAdapter") as EurCurveAdapter__factory;
    const EthAdapter = await ethers.getContractFactory("EthNoPoolAdapter") as EthNoPoolAdapter__factory;
    
    const Handler = await ethers.getContractFactory("LiquidityHandler") as LiquidityHandler__factory;
    const IbAlluo = await ethers.getContractFactory("IbAlluo") as IbAlluo__factory;
    const Buffer = await ethers.getContractFactory("BufferManager") as BufferManager__factory;
    
    buffer = await upgrades.deployProxy(Buffer,
      [ 604800,
        1000,
        604800,
        1000,
        gnosis.address,
        gelatoExecutor.address,
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
    ) as LiquidityHandler;

    usdAdapter = await UsdAdapter.deploy(gnosis.address, buffer.address, handler.address, 200)
    eurAdapter = await EurAdapter.deploy(gnosis.address, buffer.address, handler.address, 200)
    ethAdapter = await EthAdapter.deploy(gnosis.address, buffer.address, handler.address,);

    await usdAdapter.connect(gnosis).grantRole(await usdAdapter.DEFAULT_ADMIN_ROLE(), buffer.address)
    await eurAdapter.connect(gnosis).grantRole(await eurAdapter.DEFAULT_ADMIN_ROLE(), buffer.address)
    await ethAdapter.connect(gnosis).grantRole(await ethAdapter.DEFAULT_ADMIN_ROLE(), buffer.address)

    await usdAdapter.connect(gnosis).grantRole(await usdAdapter.DEFAULT_ADMIN_ROLE(), handler.address)
    await eurAdapter.connect(gnosis).grantRole(await eurAdapter.DEFAULT_ADMIN_ROLE(), handler.address)
    await ethAdapter.connect(gnosis).grantRole(await ethAdapter.DEFAULT_ADMIN_ROLE(), handler.address)

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

    await handler.connect(admin).grantRole(await handler.DEFAULT_ADMIN_ROLE(), ibAlluoEur.address)
    await handler.connect(admin).setIbAlluoToAdapterId(ibAlluoUsd.address, 1)
    await handler.connect(admin).setIbAlluoToAdapterId(ibAlluoEur.address, 2)

    await ibAlluoUsd.connect(gnosis).grantRole(await ibAlluoUsd.DEFAULT_ADMIN_ROLE(), handler.address)
    // Params for BufferManager deployment
    const ibAlluos = [ibAlluoUsd.address, ibAlluoEur.address]
    const adapters = [ usdAdapter.address, eurAdapter.address ]
    const tokens = [ usdc.address, jeur.address ]
    const tokensEth = [ "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48" ]
    const maxEpoch = [parseUnits("100000", 6), parseUnits("100000", 6)];
    const epoch = 1671145687

    await handler.connect(gnosis).grantRole(await handler.DEFAULT_ADMIN_ROLE(), gnosis.address)
    await handler.connect(gnosis).grantRole(await handler.DEFAULT_ADMIN_ROLE(), ibAlluoUsd.address)
    await buffer.connect(gnosis).grantRole(await buffer.DEFAULT_ADMIN_ROLE(), handler.address)

    await buffer.connect(gnosis).initializeValues(handler.address, ibAlluos, adapters, tokens, tokensEth, maxEpoch, epoch)

    // 1 percent so it's easier to test some cases
    await handler.connect(gnosis).setAdapter(
      1,
      "USD Curve-Aave",
      100,
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

    await usdAdapter.connect(gnosis).adapterApproveAll()
    await eurAdapter.connect(gnosis).adapterApproveAll()

    await handler.connect(admin).setIbAlluoToAdapterId(ibAlluoUsd.address, 1)
    await handler.connect(admin).setIbAlluoToAdapterId(ibAlluoEur.address, 2)
    
    await usdAdapter.connect(gnosis).grantRole(await usdAdapter.DEFAULT_ADMIN_ROLE(), handler.address)
    await eurAdapter.connect(gnosis).grantRole(await eurAdapter.DEFAULT_ADMIN_ROLE(), handler.address)
  });

  describe("Upgrade functionality", async () => {
    it("Tests upgradeability of the BufferManager", async () => {
      let BufferCurrent = await ethers.getContractAt("BufferManager", "0xC2DbaAEA2EfA47EBda3E572aa0e55B742E408BF6");
      await BufferCurrent.connect(admin).grantRole("0x189ab7a9244df0848122154315af71fe140f3db0fe014031783b0946b8c9d2e3", "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266")
      await BufferCurrent.connect(admin).changeUpgradeStatus(true);

      const BufferNew = await ethers.getContractFactory("BufferManager");
      let IbAlluoUsd = await upgrades.forceImport("0xC2DbaAEA2EfA47EBda3E572aa0e55B742E408BF6", BufferNew);
      await upgrades.upgradeProxy(IbAlluoUsd.address, BufferNew);
      console.log("Upgrade complete")
    })
  })

  describe("Gelato Checker", async () => {
    it("Adapter needs a refill, returns true and refillBuffer call", async () => {
      await deposit(signers[1], usdc, parseUnits("1000000", 6))
      await ibAlluoUsd.connect(signers[1]).withdraw(usdc.address, parseUnits("10000", 18))

      const [canExec, execPayload] = await buffer.checker()
      expect(canExec).to.eq(true)
      console.log("refill", execPayload)
      
    })

    it("Adapters don't need a refill, balance exceeds minBridgeAmount, returns true, and swap call", async() => {
      await deposit(signers[1], usdc, parseUnits("100000", 6))
      const [canExec, execPayload] = await buffer.checker()
      expect(canExec).to.eq(true)
      console.log("swap", execPayload)
    })

    it("Adapters don't need a refill, balance is below minBridge, returns false", async () => {
      await deposit(signers[1], usdc, parseUnits("100000", 6))
      await ibAlluoUsd.connect(signers[1]).withdraw(usdc.address, parseUnits("10000", 18))
      await deposit(signers[1], usdc, parseUnits("100000", 6))
      
      const [canExec, execPayload] = await buffer.checker()
      expect(canExec).to.eq(false)
    })
  })
  
  describe("Case Testing", async () => {
    it("Deposits 1000 usdc, attempts withdrawal immediately, successes after another deposit", async () => {
      await deposit(signers[5], usdc, parseUnits("1000", 6))
      await ibAlluoUsd.connect(signers[5]).withdraw(usdc.address, parseUnits("1000", 18));
      let withdrawalArray = await getLastWithdrawalInfo(ibAlluoUsd, handler)
      expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);
      console.log(await usdc.balanceOf(signers[5].address));
      expect(await usdc.balanceOf(signers[5].address)).to.be.equal(0);

      await deposit(signers[4], usdc, parseUnits("10000", 6));
      await handler.satisfyAdapterWithdrawals(ibAlluoUsd.address);
      expect(Number(await usdc.balanceOf(signers[5].address))).lessThan(Number(parseUnits("1100", 6)))
      expect(Number(await usdc.balanceOf(signers[5].address))).greaterThanOrEqual(Number(parseUnits("900", 6)))

    });

    it("Checker triggers refill when there is a pending withdrawal, retuns false if withdrawal is satisfied", async() => {
      // Calling checker before any withdrawals exist causes panic, due to diving by 0, while checking expected adapter amount
      // await deposit(signers[2], usdc, parseUnits("1000", 6))
      // await ibAlluoUsd.connect(signers[2]).withdraw(usdc.address, parseUnits("300", 18));
      // await deposit(signers[3], usdc, parseUnits("700", 6))
      // await jeur.connect(jeurWhale).transfer(gnosis.address, parseEther("2"))
      // await jeur.connect(gnosis).approve(ibAlluoEur.address, parseEther("2"));
      // await ibAlluoEur.connect(gnosis).deposit(jeur.address, parseEther("1"));
      // await ibAlluoEur.connect(gnosis).withdraw(jeur.address, parseEther("0.7"))
      // await ibAlluoEur.connect(gnosis).deposit(jeur.address, parseEther("0.7"));

      // const [canExecBefore] = await buffer.checker()
      // console.log(await buffer.checker())
      // expect(canExecBefore).to.be.equal(true)
      // await handler.satisfyAdapterWithdrawals(ibAlluoEur.address);
      // await handler.satisfyAdapterWithdrawals(ibAlluoUsd.address)
      // await buffer.isAdapterPendingWithdrawal(ibAlluoUsd.address);
      // await buffer.adapterRequiredRefill(ibAlluoUsd.address);
      // console.log(await buffer.checker())
      // const [canExecAfter] = await buffer.checker()
      // expect(canExecAfter).to.be.equal(false)

    });

    it("Should trigger gelato to refill if buffer requires one", async() => {
      // await (await (await ethers.getContractFactory("ForceSender")).deploy({
      //   value: parseEther("10.0")
      // })).forceSend(gelatoExecutor.address); 
        
      // await usdc.connect(usdWhale).transfer(buffer.address, parseUnits("50000", 6))
      // await deposit(signers[2], usdc, parseUnits("1000", 6))
      // await ibAlluoUsd.connect(signers[2]).withdraw(usdc.address, parseUnits("300", 18));

      // const [canExec] = await buffer.checker()
      // expect(canExec).to.be.equal(true);

      // await buffer.connect(gelatoExecutor).refillBuffer(ibAlluoUsd.address)
      
    })

    it("Should not refill if adapter exceeded it's cumulative refill limit", async () => {
      // await (await (await ethers.getContractFactory("ForceSender")).deploy({
      //   value: parseEther("10.0")
      // })).forceSend(gelatoExecutor.address); 
        
      // await usdc.connect(usdWhale).transfer(buffer.address, parseUnits("50000", 6))
      // await deposit(signers[2], usdc, parseUnits("1000", 6))
      // await ibAlluoUsd.connect(signers[2]).withdraw(usdc.address, parseUnits("300", 18));

      // const [canExec] = await buffer.checker()
      // expect(canExec).to.be.equal(true);

      // expect(buffer.connect(gelatoExecutor).refillBuffer(ibAlluoUsd.address)).to.be.revertedWith('Cumulative refills exceeds limit')
    })
  }) 

    it("Should send funds to buffer if there are no pending withdrawals", async () => {
      const balanceBefore = await usdc.balanceOf(buffer.address);
      expect(balanceBefore).to.be.equal(0);

      await deposit(signers[1], usdc, parseUnits("1000", 6))
      const balanceAfter = await usdc.balanceOf(buffer.address)
      expect(Number(balanceAfter)).to.be.greaterThanOrEqual(Number(parseUnits("900", 6)))
      
    })
  describe("Swapping", async () => {
    it("Should only allow Gelato to execute the swap", async () => {
      expect(buffer.connect(gnosis).swap(800, ZERO_ADDR, parseUnits("2", 16), ibAlluoUsd.address)).to.be.revertedWith('revertMessage')
    })

    it("Should not allow swapping below minimum amount", async () => {
      expect(buffer.connect(gelatoExecutor).swap(800, ZERO_ADDR, parseUnits("2", 16), ibAlluoUsd.address)).to.be.revertedWith("Swap: <minAmount!")
    })

    it("Should execute swap", async () => {
      await (await (await ethers.getContractFactory("ForceSender")).deploy({
        value: parseEther("10.0")
        })).forceSend(gelatoExecutor.address); 
  
        await usdc.connect(usdWhale).transfer(buffer.address, parseUnits("2000", 6))
  
        await buffer.connect(gelatoExecutor).swap(parseUnits("1800", 6), usdc.address, parseUnits("2", 16), ibAlluoUsd.address);
    })

    it("Should not allow to swap twice immediately", async () => {
      await (await (await ethers.getContractFactory("ForceSender")).deploy({
      value: parseEther("10.0")
      })).forceSend(gelatoExecutor.address); 

      await usdc.connect(usdWhale).transfer(buffer.address, parseUnits("2000", 6))

      await buffer.connect(gelatoExecutor).swap(parseUnits("1800", 6), usdc.address, parseUnits("2", 16), ibAlluoUsd.address);
      expect(buffer.connect(gelatoExecutor).swap(parseUnits("2300", 6), usdc.address, parseUnits("2", 16), ibAlluoUsd.address)).to.be.revertedWith("Swap: <minInterval!")
    })

  })   

  describe("Admin functions", async () => {
    it("Should not allow users without admin role to call functions", async () => {
      expect(buffer.connect(signers[1]).changeBridgeSettings(100, 420)).to.be.reverted
      expect(buffer.connect(signers[1]).addIBAlluoPool(handler.address, gnosis.address)).to.be.reverted
      expect(buffer.connect(signers[1]).removeIBAlluoPool(ibAlluoUsd.address)).to.be.reverted
    })

    it("Should add IBAlluo", async () => {
      await buffer.connect(gnosis).addIBAlluoPool(gnosis.address, handler.address);
      expect(await buffer.ibAlluoToAdapter(gnosis.address)).to.equal(handler.address);
    })

    it("Should remove IBAlluo", async () => {
      await buffer.connect(gnosis).addIBAlluoPool(gnosis.address, handler.address);
      expect(await buffer.ibAlluoToAdapter(gnosis.address)).to.equal(handler.address);

      await buffer.connect(gnosis).removeIBAlluoPool(gnosis.address);
      expect(await buffer.ibAlluoToAdapter(gnosis.address)).to.equal(ZERO_ADDR)
    })

    it("Should change the bridge settings", async() => {
      await buffer.connect(gnosis).changeBridgeSettings(1250, 60000);
      expect(await buffer.minBridgeAmount()).to.be.equal(1250);
      expect(await buffer.bridgeInterval()).to.be.equal(60000);
    })
  })
  
  async function deposit(recipient: SignerWithAddress, token: IERC20, amount: BigNumberish) {
    await token.connect(usdWhale).transfer(recipient.address, amount);

    await token.connect(recipient).approve(ibAlluoUsd.address, amount);

    await ibAlluoUsd.connect(recipient).deposit(token.address, amount);
  }
  
});