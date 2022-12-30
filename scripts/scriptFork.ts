import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { parseEther, parseUnits } from "ethers/lib/utils";
import { ethers, network, upgrades } from "hardhat";
import { BigNumber, BigNumberish, BytesLike, Contract } from "ethers";
import {
  BufferManager,
  IERC20MetadataUpgradeable,
  Exchange,
  BufferManager__factory, 
  IERC20, IbAlluo, IbAlluo__factory, LiquidityHandler, UsdCurveAdapter, LiquidityHandler__factory, UsdCurveAdapter__factory, EurCurveAdapter, EthNoPoolAdapter,
  EurCurveAdapter__factory, EthNoPoolAdapter__factory, VoteExecutorSlaveFinal, VoteExecutorSlaveFinal__factory, BtcNoPoolAdapter, BtcNoPoolAdapter__factory,
  UsdCurveAdapterUpgradeable__factory, UsdCurveAdapterUpgradeable, EurCurveAdapterUpgradeable__factory, EurCurveAdapterUpgradeable, EthNoPoolAdapterUpgradeable__factory,
  EthNoPoolAdapterUpgradeable, BtcNoPoolAdapterUpgradeable__factory, BtcNoPoolAdapterUpgradeable
} from "../typechain";

describe("Setup script", async () => {
let gnosis = "0x466b375cE0D1161aEb3e69f92B2B9c365f7877BE"
let spokepool = "0x7e48eB74946404D2db690e2c4E509A75cD60Ba5B"
let handler = await ethers.getContractAt("LiquidityHandler", "0xF877605269bB018c96bD1c93F276F834F45Ccc3f")

const ibAlluoUsdOld = await ethers.getContractAt("IbAlluoTestnetAfter", "0x71402a46d78a10c8eE7E7CdEf2AffeC8d1E312A1");
const ibAlluoEurOld = await ethers.getContractAt("IbAlluoTestnetAfter", "0xb1a6a9693381073168ee9A0dFcb8691F4cbf7f49");
const ibAlluoEthOld = await ethers.getContractAt("IbAlluoTestnetAfter", "0xC7600AEECc60C72b22E28f77A584C40dD169aa2c");
const ibAlluoBtcOld = await ethers.getContractAt("IbAlluoTestnetAfter", "0xE909a2fE36a55036b7E0ffbc17849D10EC0B99f8");
const handlerOld = await ethers.getContractAt("IbAlluoTestnetAfter", "0xF877605269bB018c96bD1c93F276F834F45Ccc3f");

let usdAdapter: UsdCurveAdapterUpgradeable;
let eurAdapter: EurCurveAdapterUpgradeable;
let ethAdapter: EthNoPoolAdapterUpgradeable;
let btcAdapter: BtcNoPoolAdapterUpgradeable;

let buffer: BufferManager;


await network.provider.request({
    method: "hardhat_reset",
    params: [{
      forking: {
        enabled: true,
        jsonRpcUrl: process.env.MUMBAI_URL as string,
        //you can fork from last block by commenting next line
        // blockNumber: 29518660,
      },
    },],
  });

  // Buffer deployment
  const Buffer = await ethers.getContractFactory("BufferManager") as BufferManager__factory;

  buffer = await upgrades.deployProxy(Buffer,
    [604800,
      1000,
      604800,
      gnosis,
      gelatoExecutor.address,
      spokepool,
      anycalladdress,
      ZERO_ADDR,
    ], {
    initializer: 'initialize', unsafeAllow: ["delegatecall"],
    kind: 'uups'
  }
  ) as BufferManager;

  // Adapters deployment

  const UsdAdapter = await ethers.getContractFactory("UsdCurveAdapterUpgradeable") as UsdCurveAdapterUpgradeable__factory;
  const EurAdapter = await ethers.getContractFactory("EurCurveAdapterUpgradeable") as EurCurveAdapterUpgradeable__factory;
  const EthAdapter = await ethers.getContractFactory("EthNoPoolAdapterUpgradeable") as EthNoPoolAdapterUpgradeable__factory;
  const BtcAdapter = await ethers.getContractFactory("BtcNoPoolAdapterUpgradeable") as BtcNoPoolAdapterUpgradeable__factory;

  usdAdapter  = await upgrades.deployProxy(UsdAdapter,
    [
        gnosis,
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
        gnosis,
        buffer.address,
        handler.address,
        200
    ], {
        initializer: 'initialize',
        kind: 'uups'
    }
  ) as EurCurveAdapterUpgradeableMumbai;

  ethAdapter  = await upgrades.deployProxy(EthAdapter,
    [
        gnosis,
        buffer.address,
        handler.address
    ], {
        initializer: 'initialize',
        kind: 'uups'
    }
  ) as EthNoPoolAdapterUpgradeable;

  btcAdapter  = await upgrades.deployProxy(BtcAdapter,
    [
        gnosis,
        buffer.address,
        handler.address
    ], {
        initializer: 'initialize',
        kind: 'uups'
    }
  ) as BtcNoPoolAdapterUpgradeable;

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
})