import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { parseEther, parseUnits } from "ethers/lib/utils";
import { ethers, network, upgrades } from "hardhat";
import { BigNumber, BigNumberish} from "ethers";
import { IbAlluo, PriceFeedRouterV2, VoteExecutorSlaveFinal, VoteExecutorSlaveFinal__factory, IERC20 } from "../typechain";


let signers: SignerWithAddress[];
let gnosis: SignerWithAddress;
let iballuousd: IERC20;
let admin: SignerWithAddress;
let gelatoExecutor: SignerWithAddress;
let priceFeedRouterV2: PriceFeedRouterV2
let slave: VoteExecutorSlaveFinal
let Slave: VoteExecutorSlaveFinal__factory
let iballuoC: IbAlluo



describe("Test VoteExecutor tracking IbAlluo sync", () => {

    beforeEach(async function() {
        //We are forking Polygon mainnet, please set Alchemy key in .env
        await network.provider.request({
        method: "hardhat_reset",
        params: [{
            forking: {
            enabled: true,
            jsonRpcUrl: process.env.POLYGON_FORKING_URL as string,
            //you can fork from last block by commenting next line
            blockNumber: 39338273,
            },
        },],
      });

      signers = await ethers.getSigners();
      
      gnosis = await getImpersonatedSigner("0x2580f9954529853Ca5aC5543cE39E9B5B1145135")

      Slave = await ethers.getContractFactory("VoteExecutorSlaveFinal")
      slave = await upgrades.deployProxy(Slave,
        [gnosis.address,
         gnosis.address
        ], {
        initializer: 'initialize', unsafeAllow: ["delegatecall"],
        kind: 'uups'
      }
      ) as VoteExecutorSlaveFinal;

      iballuousd = await ethers.getContractAt("IbAlluo","0xC2DbaAEA2EfA47EBda3E572aa0e55B742E408BF6")

      priceFeedRouterV2 = await ethers.getContractAt("PriceFeedRouterV2", "0x82220c7Be3a00ba0C6ed38572400A97445bdAEF2");
      await slave.connect(gnosis).setPriceRouterInfo(priceFeedRouterV2.address, 0)

      upgrades.silenceWarnings();
    })
      
      it("Should mint iballuo", async () => {
        const delta10k = ethers.utils.parseUnits("10000", 18);
        const deltaMinus = ethers.utils.parseUnits("-1000", 18);
      
        let balanceBefore = await iballuousd.balanceOf(gnosis.address);
        iballuoC = await ethers.getContractAt("IbAlluo", "0xC2DbaAEA2EfA47EBda3E572aa0e55B742E408BF6");
        await iballuoC.connect(gnosis).grantRole(await iballuoC.DEFAULT_ADMIN_ROLE(), slave.address);
        const messages = [
          {
            commandIndex: 3,
            commandData: ethers.utils.defaultAbiCoder.encode(["int256"], [delta10k]),
          },
        ];
        await slave.connect(gnosis).messageExecute(messages);
        let balanceAfter = await iballuousd.balanceOf(gnosis.address);
      
        expect(Number(balanceAfter)).to.be.gt(Number(balanceBefore));
      
        console.log("Balance before", balanceBefore);
        console.log("Balance after", balanceAfter);
      });
      
      it("Should burn iballuo", async () => {
        const deltaMinus = ethers.utils.parseUnits("-1000", 18);
      
        let balanceBefore = await iballuousd.balanceOf(gnosis.address);
        iballuoC = await ethers.getContractAt("IbAlluo", "0xC2DbaAEA2EfA47EBda3E572aa0e55B742E408BF6");
        await iballuoC.connect(gnosis).grantRole(await iballuoC.DEFAULT_ADMIN_ROLE(), slave.address);
        const messages = [
          {
            commandIndex: 3,
            commandData: ethers.utils.defaultAbiCoder.encode(["int256"], [deltaMinus]),
          },
        ];
        await slave.connect(gnosis).messageExecute(messages);
        let balanceAfter = await iballuousd.balanceOf(gnosis.address);
      
        expect(Number(balanceAfter)).to.be.lt(Number(balanceBefore));
      
        console.log("Balance before", balanceBefore);
        console.log("Balance after", balanceAfter);
      });

it("should execute two messages with positive and negative delta", async () => {      
        const commandIndex = 3;
        const commandData1 = ethers.utils.defaultAbiCoder.encode(
            ["int256"],
            [100000]
        );
        const messages = [
            {
            commandIndex: commandIndex,
            commandData: commandData1,
            },
        ];
      
        await iballuoC
          .connect(gnosis)
          .grantRole(await iballuoC.DEFAULT_ADMIN_ROLE(), slave.address);

        const balanceBefore = await iballuousd.balanceOf(gnosis.address); 
        await slave.connect(gnosis).messageExecute(messages);
      
        const balanceAfter = await iballuousd.balanceOf(gnosis.address);

        console.log("Balance before", balanceBefore)
        console.log("Balance after", balanceAfter)
      });
      
      it("should execute two messages with positive and negative delta", async () => {
        const deltaPositive = ethers.utils.parseUnits("10000", 18);
        const deltaNegative = ethers.utils.parseUnits("-10000", 18);
      
        const commandIndex = 3;
        const commandData1 = ethers.utils.defaultAbiCoder.encode(
            ["int256"],
            [deltaPositive]
        );
        const commandData2 = ethers.utils.defaultAbiCoder.encode(
            ["int256"],
            [deltaNegative]
        );
        const messages = [
            {
            commandIndex: commandIndex,
            commandData: commandData1,
            },
            {
            commandIndex: commandIndex,
            commandData: commandData2,
            }
        ];
      
        await iballuoC
          .connect(gnosis)
          .grantRole(await iballuoC.DEFAULT_ADMIN_ROLE(), slave.address);

        const balanceBefore = await iballuousd.balanceOf(gnosis.address); 
        await slave.connect(gnosis).messageExecute(messages);
      
        const balanceAfter = await iballuousd.balanceOf(gnosis.address);
        // There is a little difference due to priceFeed
        console.log("Balance before", balanceBefore)
        console.log("Balance after", balanceAfter)
      });
    
})

    async function getImpersonatedSigner(address: string): Promise<SignerWithAddress> {
    await ethers.provider.send(
        'hardhat_impersonateAccount',
        [address]
    );

    await signers[0].sendTransaction({
        to: address,
        value: parseEther("29")

    });

    return await ethers.getSigner(address);
}

async function skipDays(d: number) {
    ethers.provider.send('evm_increaseTime', [d * 86400]);
    ethers.provider.send('evm_mine', []);
}