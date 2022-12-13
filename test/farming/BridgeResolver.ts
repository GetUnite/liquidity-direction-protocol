import { MockProvider } from "@ethereum-waffle/provider";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { parseEther, parseUnits } from "ethers/lib/utils";
import { ethers, network } from "hardhat";
import { before } from "mocha";
import {
  BridgeResolver,
  IERC20MetadataUpgradeable,
  Exchange,
} from "../typechain";

describe("AlluoBridgeResolver tests", () => {
  let bridgeResolver: BridgeResolver;
  let provider: MockProvider;
  let gnosis: SignerWithAddress;
  let signers: SignerWithAddress[];
  let resolver: BridgeResolver;
  let exchange: Exchange;
  let usdc: IERC20MetadataUpgradeable;
  const ZERO_ADDR = ethers.constants.AddressZero;

  async function getTxFromExecPayload(txCheckerPayload: string) {
    const data = txCheckerPayload;
    const tx = {
      from: signers[0].address,
      to: resolver.address,
      data: data,
    };
    return tx;
  }

  beforeEach(async () => {
    provider = new MockProvider();
    const [sender] = provider.getWallets();
    bridgeResolver = await BridgeResolver.deploy(sender, {}, provider);
  });

  it("should add a new IBAlluo pool", async () => {
    const poolAddress = "0x0000000000000000000000000000000000000001";
    const tx = await bridgeResolver.addIBAlluoPool(poolAddress);
    expect(await bridgeResolver.IbAlluoToBridge()).to.deep.equal([poolAddress]);
  });

  it("should remove an IBAlluo pool", async () => {
    const poolAddress = "0x0000000000000000000000000000000000000001";
    await bridgeResolver.addIBAlluoPool(poolAddress);
    const tx = await bridgeResolver.removeIBAlluoPool(poolAddress);
    expect(await bridgeResolver.IbAlluoToBridge()).to.deep.equal([]);
  });
});