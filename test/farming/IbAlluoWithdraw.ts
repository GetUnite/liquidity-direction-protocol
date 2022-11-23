import { parseEther, parseUnits } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, BigNumberish } from "ethers";
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
            blockNumber: 29518660,
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

    usdAdapter = await UsdAdapter.deploy(admin.address, handler.address, 200);

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
        [
          "0x0A6513e40db6EB1b165753AD52E80663aeA50545", // USDT / USD price feed
          "0xfe4a8cc5b5b2366c1b58bea3858e81843581b2f7", // USDC / USD price feed
          "0x4746dec9e833a82ec7c2c1356372ccf2cfcd2f3d", // DAI / USD price feed
        ],
      ],
      {
        initializer: "initialize",
        kind: "uups",
      }
    )) as IbAlluo;

    await handler
      .connect(admin)
      .setIbAlluoToAdapterId(ibAlluoCurrent.address, lastAdapterId);
    await handler
      .connect(admin)
      .grantRole(await handler.DEFAULT_ADMIN_ROLE(), ibAlluoCurrent.address);
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

    describe("Chainlink price feeds tests", function () {
      it("Should return price feeds", async function () {
        const usdtPriceFeed = "0x0A6513e40db6EB1b165753AD52E80663aeA50545";
        const usdcPriceFeed = "0xfE4A8cc5b5B2366C1B58Bea3858e81843581b2F7";
        const daiPriceFeed = "0x4746DeC9e833A82EC7C2C1356372CcF2cfcD2F3D";

        expect(await ibAlluoCurrent.getPriceFeed("USDT / USD")).equals(
          usdtPriceFeed
        );
        expect(await ibAlluoCurrent.getPriceFeed("USDC / USD")).equals(
          usdcPriceFeed
        );
        expect(await ibAlluoCurrent.getPriceFeed("DAI / USD")).equals(
          daiPriceFeed
        );
      });

      it("Should add price feed", async function () {
        const ethPriceFeed = "0xF9680D99D6C9589e2a93a78A04A279e509205945";

        expect(await ibAlluoCurrent.getPriceFeed("ETH / USD")).equals(
          ethers.constants.AddressZero
        );

        let ABI = [
          "function changePriceFeedStatus(address _priceFeedAddress, bool _status)",
        ];
        let iface = new ethers.utils.Interface(ABI);
        const calldata = iface.encodeFunctionData("changePriceFeedStatus", [
          ethPriceFeed,
          true,
        ]);

        await multisig.executeCall(ibAlluoCurrent.address, calldata);

        expect(await ibAlluoCurrent.getPriceFeed("ETH / USD")).equals(
          ethPriceFeed
        );
      });

      it("Should remove price feed", async function () {
        const usdtPriceFeed = "0x0A6513e40db6EB1b165753AD52E80663aeA50545";

        expect(await ibAlluoCurrent.getPriceFeed("USDT / USD")).equals(
          usdtPriceFeed
        );

        let ABI = [
          "function changePriceFeedStatus(address _priceFeedAddress, bool _status)",
        ];
        let iface = new ethers.utils.Interface(ABI);
        const calldata = iface.encodeFunctionData("changePriceFeedStatus", [
          usdtPriceFeed,
          false,
        ]);

        await multisig.executeCall(ibAlluoCurrent.address, calldata);

        expect(await ibAlluoCurrent.getPriceFeed("USDT / USD")).equals(
          ethers.constants.AddressZero
        );
      });

      it("Should add and emit PriceFeedStatusChanged", async function () {
        const ethPriceFeed = "0xF9680D99D6C9589e2a93a78A04A279e509205945";

        let ABI = [
          "function changePriceFeedStatus(address _priceFeedAddress, bool _status)",
        ];
        let iface = new ethers.utils.Interface(ABI);
        const calldata = iface.encodeFunctionData("changePriceFeedStatus", [
          ethPriceFeed,
          true,
        ]);

        const tx = await multisig.executeCall(ibAlluoCurrent.address, calldata);

        expect(tx)
          .to.emit("IbAlluo", "PriceFeedStatusChanged")
          .withArgs("ETH / USD", true);
      });

      it("Should remove and emit PriceFeedStatusChanged", async function () {
        const usdtPriceFeed = "0x0A6513e40db6EB1b165753AD52E80663aeA50545";

        let ABI = [
          "function changePriceFeedStatus(address _priceFeedAddress, bool _status)",
        ];
        let iface = new ethers.utils.Interface(ABI);
        const calldata = iface.encodeFunctionData("changePriceFeedStatus", [
          usdtPriceFeed,
          false,
        ]);

        const tx = await multisig.executeCall(ibAlluoCurrent.address, calldata);

        expect(tx)
          .to.emit("IbAlluo", "PriceFeedStatusChanged")
          .withArgs("USDT / USD", false);
      });
    });

    describe("Withdraw tests", function () {
      it("Should withdraw 50 USD in DAI", async function () {
        await deposit(signers[0], dai, parseEther("100"));

        await ibAlluoCurrent
          .connect(signers[0])
          .withdraw(dai.address, parseEther("50"));

        let withdrawalArray = await getLastWithdrawalInfo(
          ibAlluoCurrent,
          handler
        );
        expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);

        await deposit(signers[1], dai, parseEther("100"));
        await handler.satisfyAdapterWithdrawals(ibAlluoCurrent.address);

        console.log("Balance DAI = ", await dai.balanceOf(signers[0].address));

        expect(Number(await dai.balanceOf(signers[0].address))).lessThan(
          Number(parseUnits("51", 18))
        );
        expect(Number(await dai.balanceOf(signers[0].address))).greaterThan(
          Number(parseUnits("50", 18))
        );
      });

      it("Should withdraw 50 USD in USDC", async function () {
        await deposit(signers[0], usdc, parseUnits("100", 6));
        await ibAlluoCurrent
          .connect(signers[0])
          .withdraw(usdc.address, parseUnits("50", 18));
        let withdrawalArray = await getLastWithdrawalInfo(
          ibAlluoCurrent,
          handler
        );
        expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);

        await deposit(signers[1], usdc, parseUnits("100", 6));
        await handler.satisfyAdapterWithdrawals(ibAlluoCurrent.address);

        console.log(
          "Balance USDC = ",
          await usdc.balanceOf(signers[0].address)
        );

        expect(Number(await usdc.balanceOf(signers[0].address))).lessThan(
          Number(parseUnits("51", 6))
        );
        expect(
          Number(await usdc.balanceOf(signers[0].address))
        ).greaterThanOrEqual(Number(parseUnits("50", 6)));
      });

      it("Should withdraw 50 USD in USDT", async function () {
        await deposit(signers[0], usdt, parseUnits("100", 6));
        await ibAlluoCurrent
          .connect(signers[0])
          .withdraw(usdt.address, parseUnits("50", 18));
        let withdrawalArray = await getLastWithdrawalInfo(
          ibAlluoCurrent,
          handler
        );
        expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);

        await deposit(signers[1], usdt, parseUnits("100", 6));
        await handler.satisfyAdapterWithdrawals(ibAlluoCurrent.address);

        console.log(
          "Balance USDT = ",
          await usdt.balanceOf(signers[0].address)
        );

        expect(Number(await usdt.balanceOf(signers[0].address))).lessThan(
          Number(parseUnits("50", 6))
        );
        expect(
          Number(await usdt.balanceOf(signers[0].address))
        ).greaterThanOrEqual(Number(parseUnits("49", 6)));
      });

      it("Should withdraw and emit Withdraw", async function () {
        await deposit(signers[0], dai, parseEther("100"));

        const tx = await ibAlluoCurrent
          .connect(signers[0])
          .withdraw(dai.address, parseEther("50"));

        expect(tx).to.emit("IbAlluo", "Withdraw");
      });
    });
  });
});

// USDT / USD Plygon : 0x0A6513e40db6EB1b165753AD52E80663aeA50545
// USDC / USD Plygon : 0xfe4a8cc5b5b2366c1b58bea3858e81843581b2f7
// DAI / USD Plygon : 0x4746dec9e833a82ec7c2c1356372ccf2cfcd2f3d
