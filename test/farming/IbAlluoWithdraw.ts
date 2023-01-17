import { parseEther, parseUnits } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, BigNumberish } from "ethers";
import { hexValue } from "ethers/lib/utils";
import { ethers, network, upgrades } from "hardhat";
import {
  IERC20,
  PseudoMultisigWallet,
  PseudoMultisigWallet__factory,
  IbAlluo,
  IbAlluo__factory,
  LiquidityHandler,
  UsdCurveAdapter,
  UsdCurveAdapter__factory,
  PriceFeedRouter,
  BufferManager__factory,
  BufferManager
} from "./../../typechain";

async function getImpersonatedSigner(
  address: string
): Promise<SignerWithAddress> {
  await ethers.provider.send("hardhat_impersonateAccount", [address]);

  return await ethers.getSigner(address);
}

async function sendEth(users: SignerWithAddress[]) {
  let signers = await ethers.getSigners();

  for (let i = 0; i < users.length; i++) {
    await signers[0].sendTransaction({
      to: users[i].address,
      value: parseEther("1.0"),
    });
  }
}

async function getLastWithdrawalInfo(
  token: IbAlluo,
  handler: LiquidityHandler
) {
  let request = (await handler.ibAlluoToWithdrawalSystems(token.address))
    .lastWithdrawalRequest;
  let satisfied = (await handler.ibAlluoToWithdrawalSystems(token.address))
    .lastSatisfiedWithdrawal;
  let total = (await handler.ibAlluoToWithdrawalSystems(token.address))
    .totalWithdrawalAmount;
  return [request, satisfied, total];
}

describe("ibAlluoCurrent and Handler", function () {
  let signers: SignerWithAddress[];
  let admin: SignerWithAddress;
  let ibAlluoCurrent: IbAlluo;
  let usdAdapter: UsdCurveAdapter;
  let multisig: PseudoMultisigWallet;
  let handler: LiquidityHandler;
  let dai: IERC20, usdc: IERC20, usdt: IERC20;
  let usdWhale: SignerWithAddress;
  let exchangeAddress: string;
  let priceFeedRouter: PriceFeedRouter;
  let buffer: BufferManager

  before(async function () {
    //We are forking Polygon mainnet, please set Alchemy key in .env
    await network.provider.request({
      method: "hardhat_reset",
      params: [
        {
          forking: {
            enabled: true,
            jsonRpcUrl: process.env.POLYGON_FORKING_URL as string,
            //you can fork from last block by commenting next line
            blockNumber: 36251556,
          },
        },
      ],
    });

    signers = await ethers.getSigners();

    admin = await getImpersonatedSigner(
      "0x2580f9954529853Ca5aC5543cE39E9B5B1145135"
    );

    await (
      await (
        await ethers.getContractFactory("ForceSender")
      ).deploy({
        value: parseEther("10.0"),
      })
    ).forceSend(admin.address);

    usdWhale = await getImpersonatedSigner(
      "0x075e72a5eDf65F0A5f44699c7654C1a76941Ddc8"
    );
    dai = await ethers.getContractAt(
      "IERC20",
      "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063"
    );
    usdc = await ethers.getContractAt(
      "IERC20",
      "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174"
    );
    usdt = await ethers.getContractAt(
      "IERC20",
      "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"
    );

    console.log("We are forking Polygon mainnet\n");
    expect(await dai.balanceOf(usdWhale.address)).to.be.gt(
      0,
      "Whale has no DAI, or you are not forking Polygon"
    );
    expect(await usdc.balanceOf(usdWhale.address)).to.be.gt(
      0,
      "Whale has no USDC, or you are not forking Polygon"
    );
    expect(await usdt.balanceOf(usdWhale.address)).to.be.gt(
      0,
      "Whale has no USDT, or you are not forking Polygon"
    );

    await sendEth([usdWhale]);
  });

  beforeEach(async function () {
    const IbAlluo = (await ethers.getContractFactory(
      "IbAlluo"
    )) as IbAlluo__factory;

    //We are using this contract to simulate Gnosis multisig wallet
    const Multisig = (await ethers.getContractFactory(
      "PseudoMultisigWallet"
    )) as PseudoMultisigWallet__factory;
    multisig = await Multisig.deploy(true);

    const Buffer = await ethers.getContractFactory("BufferManager") as BufferManager__factory;

    exchangeAddress = "0x6b45B9Ab699eFbb130464AcEFC23D49481a05773";

    handler = await ethers.getContractAt(
      "LiquidityHandler",
      "0x31a3439Ac7E6Ea7e0C0E4b846F45700c6354f8c1"
    );

    await handler
      .connect(admin)
      .grantRole(await handler.DEFAULT_ADMIN_ROLE(), multisig.address);

    const UsdAdapter = (await ethers.getContractFactory(
      "UsdCurveAdapter"
    )) as UsdCurveAdapter__factory;

    buffer = await upgrades.deployProxy(Buffer,
      [ 604800,
        1000,
        604800,
        admin.address,
        admin.address,
        admin.address,
        admin.address,
        ], {
          initializer: 'initialize', unsafeAllow: ["delegatecall"],
          kind: 'uups'
      }
    ) as BufferManager;

    usdAdapter = await UsdAdapter.deploy(admin.address, buffer.address, handler.address, 200, 100);

    await usdAdapter.connect(admin).adapterApproveAll();

    let lastAdapterId = (await handler.getLastAdapterIndex()).add(1);

    await handler
      .connect(admin)
      .setAdapter(
        lastAdapterId,
        "USD Curve-Aave",
        500,
        usdAdapter.address,
        true
      );

    ibAlluoCurrent = (await upgrades.deployProxy(
      IbAlluo,
      [
        "Interest Bearing Alluo USD",
        "ibAlluoCurrent",
        multisig.address,
        handler.address,
        [dai.address, usdc.address, usdt.address],
        BigNumber.from("100000000470636740"),
        1600,
        "0x86C80a8aa58e0A4fa09A69624c31Ab2a6CAD56b8",
        exchangeAddress,
      ],
      {
        initializer: "initialize",
        kind: "uups",
      }
    )) as IbAlluo;

    const call = ibAlluoCurrent.interface.encodeFunctionData(
      "setPriceRouterInfo",
      ["0x54a6c19C7a7304A99489D547ce71DC990BF141a9", 1]
    )
    await multisig.executeCall(ibAlluoCurrent.address, call);

    await handler
      .connect(admin)
      .setIbAlluoToAdapterId(ibAlluoCurrent.address, lastAdapterId);
    await handler
      .connect(admin)
      .grantRole(await handler.DEFAULT_ADMIN_ROLE(), ibAlluoCurrent.address);

    priceFeedRouter = (await ethers.getContractAt(
      "PriceFeedRouter",
      "0x54a6c19C7a7304A99489D547ce71DC990BF141a9"
    )) as PriceFeedRouter;
  });

  describe("IbAlluo tests", function () {
    async function deposit(
      recipient: SignerWithAddress,
      token: IERC20,
      amount: BigNumberish
    ) {
      await token.connect(usdWhale).transfer(recipient.address, amount);

      await token.connect(recipient).approve(ibAlluoCurrent.address, amount);

      await ibAlluoCurrent.connect(recipient).deposit(token.address, amount);
    }

    describe("Test Deposit event", function () {
      it("Should mint the correct amount of USDC", async function () {
        const recipient = signers[0];
        const token = usdc;
        const amount = parseUnits("100", 6);
        await token.connect(usdWhale).transfer(recipient.address, amount);
        await token.connect(recipient).approve(ibAlluoCurrent.address, amount);

        const tx = ibAlluoCurrent
          .connect(recipient)
          .deposit(token.address, amount);

        let { value, decimals } = await priceFeedRouter[
          "getPrice(address,uint256)"
        ](token.address, 1);

        const amountIn18 = amount.mul(10 ** (18 - 6));
        let mintAmount = amountIn18.mul(value);
        mintAmount = mintAmount.div(10 ** decimals);
        const growingRatio = 10 ** 18;

        await expect(tx)
          .to.emit(ibAlluoCurrent, "TransferAssetValue")
          .withArgs(
            ethers.constants.AddressZero,
            recipient.address,
            String(mintAmount),
            String(amountIn18),
            String(growingRatio)
          );
      });

      it("Should mint the correct amount of USDT", async function () {
        const recipient = signers[0];
        const token = usdt;
        const amount = parseUnits("100", 6);
        await token.connect(usdWhale).transfer(recipient.address, amount);
        await token.connect(recipient).approve(ibAlluoCurrent.address, amount);

        const tx = ibAlluoCurrent
          .connect(recipient)
          .deposit(token.address, amount);

        let { value, decimals } = await priceFeedRouter[
          "getPrice(address,uint256)"
        ](token.address, 1);

        const amountIn18 = amount.mul(10 ** (18 - 6));
        let mintAmount = amountIn18.mul(value);
        mintAmount = mintAmount.div(10 ** decimals);
        const growingRatio = 10 ** 18;

        await expect(tx)
          .to.emit(ibAlluoCurrent, "TransferAssetValue")
          .withArgs(
            ethers.constants.AddressZero,
            recipient.address,
            String(mintAmount),
            String(amountIn18),
            String(growingRatio)
          );
      });

      it("Should mint the correct amount of DAI", async function () {
        const recipient = signers[0];
        const token = dai;
        const amount = parseUnits("100", 18);
        await token
          .connect(usdWhale)
          .transfer(recipient.address, parseUnits("100", 18));
        await token
          .connect(recipient)
          .approve(ibAlluoCurrent.address, parseUnits("100", 18));

        const tx = ibAlluoCurrent
          .connect(recipient)
          .deposit(token.address, amount);

        let { value, decimals } = await priceFeedRouter[
          "getPrice(address,uint256)"
        ](token.address, 1);

        const amountIn18 = amount.mul(10 ** (18 - 18));
        let mintAmount = amountIn18.mul(value);
        mintAmount = mintAmount.div(10 ** decimals);
        const growingRatio = 10 ** 18;

        await expect(tx)
          .to.emit(ibAlluoCurrent, "TransferAssetValue")
          .withArgs(
            ethers.constants.AddressZero,
            recipient.address,
            String(mintAmount),
            String(amountIn18),
            String(growingRatio)
          );
      });
    });

    describe("Test Withdraw balance", function () {
      it("Should get the expected balance of USDC", async function () {
        const recipient = signers[0];
        const token = usdc;
        const amount = parseUnits("50", 18);

        await deposit(recipient, token, parseUnits("10000", 6));
        await ibAlluoCurrent.connect(recipient).withdraw(token.address, amount);

        let withdrawalArray = await getLastWithdrawalInfo(
          ibAlluoCurrent,
          handler
        );
        // expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);

        await deposit(signers[1], token, parseUnits("10000", 6));
        await handler.satisfyAdapterWithdrawals(ibAlluoCurrent.address);

        let { value, decimals } = await priceFeedRouter[
          "getPrice(address,uint256)"
        ](token.address, 1);

        const denominator = parseUnits("100", 18);
        const withdrawAmount = amount.mul(10 ** (decimals)).div(value).div(10 ** 12);

        expect(Number(await token.balanceOf(recipient.address))).equal(
          Number(withdrawAmount)
        );
      });

      it("Should get the expected balance of USDT", async function () {
        const recipient = signers[0];
        const token = usdt;
        const amount = parseUnits("50", 18);

        await deposit(recipient, token, parseUnits("10000", 6));
        await ibAlluoCurrent.connect(recipient).withdraw(token.address, amount);

        let withdrawalArray = await getLastWithdrawalInfo(
          ibAlluoCurrent,
          handler
        );
        // expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);

        await deposit(signers[1], token, parseUnits("10000", 6));
        await handler.satisfyAdapterWithdrawals(ibAlluoCurrent.address);

        let { value, decimals } = await priceFeedRouter[
          "getPrice(address,uint256)"
        ](token.address, 1);

        const withdrawAmount = amount.mul(10 ** (decimals)).div(value).div(10 ** 12);

        expect(Number(await token.balanceOf(recipient.address))).equal(
          Number(withdrawAmount)
        );
      });

      it("Should get the expected balance of DAI", async function () {
        const recipient = signers[0];
        const token = dai;
        const amount = parseUnits("50", 18);

        await deposit(recipient, token, parseUnits("10000", 18));
        await ibAlluoCurrent.connect(recipient).withdraw(token.address, amount);

        let withdrawalArray = await getLastWithdrawalInfo(
          ibAlluoCurrent,
          handler
        );
        // expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);

        await deposit(signers[1], token, parseUnits("10000", 18));
        await handler.satisfyAdapterWithdrawals(ibAlluoCurrent.address);

        let { value, decimals } = await priceFeedRouter[
          "getPrice(address,uint256)"
        ](token.address, 1);

        const withdrawAmount = amount.mul(10 ** (decimals)).div(value);

        expect(Number(await token.balanceOf(recipient.address))).equal(
          Number(withdrawAmount)
        );
      });
    });

    describe("Test Withdraw event", function () {
      it("Should withdraw the correct amount of USDC", async function () {
        const recipient = signers[0];
        const token = usdc;
        const amount = parseUnits("100", 18);

        await deposit(recipient, token, parseUnits("10000", 6));
        const tx = ibAlluoCurrent
          .connect(signers[0])
          .withdraw(token.address, amount);

        let { value, decimals } = await priceFeedRouter[
          "getPrice(address,uint256)"
        ](token.address, 1);

        const growingRatio = 10 ** 18;
        const withdrawAmount = amount.mul(10 ** decimals).div(value);

        await expect(tx)
          .to.emit(ibAlluoCurrent, "TransferAssetValue")
          .withArgs(
            signers[0].address,
            ethers.constants.AddressZero,
            String(amount),
            String(withdrawAmount),
            String(growingRatio)
          );
      });

      it("Should withdraw the correct amount of USDT", async function () {
        const recipient = signers[0];
        const token = usdt;
        const amount = parseUnits("100", 18);

        await deposit(recipient, token, parseUnits("10000", 6));
        const tx = ibAlluoCurrent
          .connect(signers[0])
          .withdraw(token.address, amount);

        let { value, decimals } = await priceFeedRouter[
          "getPrice(address,uint256)"
        ](token.address, 1);

        const growingRatio = 10 ** 18;
        const withdrawAmount = amount.mul(10 ** decimals).div(value);

        await expect(tx)
          .to.emit(ibAlluoCurrent, "TransferAssetValue")
          .withArgs(
            signers[0].address,
            ethers.constants.AddressZero,
            String(amount),
            String(withdrawAmount),
            String(growingRatio)
          );
      });

      it("Should withdraw the correct amount of DAI", async function () {
        const recipient = signers[0];
        const token = dai;
        const amount = parseUnits("100", 18);

        await deposit(recipient, token, parseUnits("10000", 18));
        const tx = ibAlluoCurrent
          .connect(signers[0])
          .withdraw(token.address, amount);

        let { value, decimals } = await priceFeedRouter[
          "getPrice(address,uint256)"
        ](token.address, 1);

        const growingRatio = 10 ** 18;
        const withdrawAmount = amount.mul(10 ** decimals).div(value);

        await expect(tx)
          .to.emit(ibAlluoCurrent, "TransferAssetValue")
          .withArgs(
            signers[0].address,
            ethers.constants.AddressZero,
            String(amount),
            String(withdrawAmount),
            String(growingRatio)
          );
      });
    });
  });
});
