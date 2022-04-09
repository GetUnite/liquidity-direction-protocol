import { parseEther, parseUnits } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumberish, BytesLike } from "ethers";
import { ethers, upgrades, } from "hardhat";
import { before, Test } from "mocha";
import { IERC20, TestERC20, TestERC20__factory, PseudoMultisigWallet, PseudoMultisigWallet__factory, LiquidityBufferVault, LiquidityBufferVault__factory, IbAlluo, IbAlluo__factory, LiquidityBufferVaultV2, LiquidityBufferVaultV2__factory } from "../typechain";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

async function skipDays(d: number) {
    ethers.provider.send('evm_increaseTime', [d * 86400]);
    ethers.provider.send('evm_mine', []);
}

function getRandomArbitrary(min: number, max: number) {
    return Math.floor(Math.random() * (max - min) + min);
  }

async function  prepareCallData(type: string, parameters: any[]) : Promise<BytesLike>{
    if(type == "status"){
        let ABI = ["function changeUpgradeStatus(bool _status)"];
        let iface = new ethers.utils.Interface(ABI);
        let calldata = iface.encodeFunctionData("changeUpgradeStatus", [parameters[0]]);
        return calldata;
    }
    else if(type == "role"){
        let ABI = ["function grantRole(bytes32 role, address account)"];
        let iface = new ethers.utils.Interface(ABI);
        let calldata = iface.encodeFunctionData("grantRole", [parameters[0], parameters[1]]);
        return calldata;
    }
    else{
        return ethers.utils.randomBytes(0);
    }
}


describe("IbAlluo and Buffer for WETH", function () {
    let signers: SignerWithAddress[];
    let whale: SignerWithAddress;
    let curveLpHolder: SignerWithAddress;

    let ibAlluoCurrent: IbAlluo;
    let multisig: PseudoMultisigWallet;
    let buffer: LiquidityBufferVaultV2;

    let wETH: TestERC20;


    before(async function () {
        signers = await ethers.getSigners();
    });


    beforeEach(async function () {
        const IbAlluo = await ethers.getContractFactory("IbAlluo") as IbAlluo__factory;
        const Multisig = await ethers.getContractFactory("PseudoMultisigWallet") as PseudoMultisigWallet__factory;
   
        const Buffer = await ethers.getContractFactory("LiquidityBufferVaultV2") as LiquidityBufferVaultV2__factory;
        const WETH = await ethers.getContractFactory("TestERC20") as TestERC20__factory;

        wETH = await WETH.connect(signers[0]).deploy("WETH", "WETH", 18)
        multisig = await Multisig.deploy(true);
        await upgrades.silenceWarnings();
        buffer = await upgrades.deployProxy(Buffer,
            [multisig.address, multisig.address,],
            {initializer: 'initialize', kind:'uups',unsafeAllow: ['delegatecall']},
        ) as LiquidityBufferVaultV2;

        ibAlluoCurrent = await upgrades.deployProxy(IbAlluo,
            [multisig.address,
            buffer.address,
            [wETH.address]],
            {initializer: 'initialize', kind:'uups'}
        ) as IbAlluo;


        let ABI = ["function setAlluoLp(address newAlluoLp)"];
        let iface = new ethers.utils.Interface(ABI);
        let calldata = iface.encodeFunctionData("setAlluoLp", [ibAlluoCurrent.address]);
        await multisig.executeCall(buffer.address, calldata);

        ABI = ["function setPrimaryToken(address newPrimaryToken)"];
        iface = new ethers.utils.Interface(ABI);
        calldata = iface.encodeFunctionData("setPrimaryToken", [wETH.address]);
        await multisig.executeCall(buffer.address, calldata);

        ABI = ["function setPrimaryToken(address newPrimaryToken)"];
        iface = new ethers.utils.Interface(ABI);
        calldata = iface.encodeFunctionData("setPrimaryToken", [wETH.address]);
        await multisig.executeCall(buffer.address, calldata);

        expect(await ibAlluoCurrent.liquidityBuffer()).equal(buffer.address);
        await ibAlluoCurrent.migrateStep2();
    });

    describe('Buffer integration with IbAlluo', function () {
        it ("Depositing wETH should increase balance of liquidity buffer exactly", async function () {
            await deposit(signers[1], wETH, parseEther('1'));
            expect(await wETH.balanceOf(buffer.address)).equal(parseEther("1"))
        })

        it ("Depositing then withdrawing wETH should leave liquidity buffer with 0", async function () {
            await deposit(signers[1], wETH, parseEther('1'));
            await ibAlluoCurrent.connect(signers[1]).withdraw(wETH.address, parseEther("1"));
            expect(await wETH.balanceOf(buffer.address)).equal(0)
        })
        it ("Multiple deposits should increase the balance of liquidity buffer exactly", async function () {
            await deposit(signers[1], wETH, parseEther('1'));
            await deposit(signers[2], wETH, parseEther('5'));
            await deposit(signers[3], wETH, parseEther('10'));
            expect(await wETH.balanceOf(buffer.address)).equal(parseEther("16"))
        })

        it ("Multiple deposits and withdraws exactly should leave buffer with 0", async function () {
            await deposit(signers[1], wETH, parseEther('1'));
            await deposit(signers[2], wETH, parseEther('5'));
            await deposit(signers[3], wETH, parseEther('10'));
            await ibAlluoCurrent.connect(signers[1]).withdraw(wETH.address, parseEther("1"));
            await ibAlluoCurrent.connect(signers[2]).withdraw(wETH.address, parseEther("5"));
            await ibAlluoCurrent.connect(signers[3]).withdraw(wETH.address, parseEther("10"));

            expect(await wETH.balanceOf(buffer.address)).equal(0)
        })
   
    });

    describe('Buffer Deposit: Test all if statements', function () {
        it ("If inBuffer<expectedBufferAmount && expectedBufferAmount < inBuffer + _amount", async function () {
            // Initially, buffer = 0
            // When wEth comes in, goes into double if statements
            // Then funds are removed.
            // New deposit is added (exceeding 5% of 107).
            await deposit(signers[2], wETH, parseEther('100'));
            expect(await wETH.balanceOf(buffer.address)).equal(parseEther("100"))

            sendFundsToMultiSig(wETH, parseEther("100"));
            await deposit(signers[1], wETH, parseEther('7'));
            expect(await wETH.balanceOf(buffer.address)).equal(parseEther("7"))


        })

        it ("If inBuffer<expectedBufferAmount && expectedBufferAmount > inBuffer + _amount", async function () {
            // Initially, buffer = 0
            // When wEth comes in, goes into double if statements
            // Then funds are removed. Only 3 left.
            // New deposit is added of 1. Total eth in contract is 4.
            // This is below the expectedBuffer amount, so it just is held (enterAdaptorDelegateCall not carried out);
            await deposit(signers[2], wETH, parseEther('100'));
            sendFundsToMultiSig(wETH, parseEther("97"));
            await deposit(signers[1], wETH, parseEther('1'));
            expect(await wETH.balanceOf(buffer.address)).equal(parseEther("4"))

        })
        it ("If inBuffer>expectedBufferAmount ", async function () {
            // Initially, buffer = 0
            // When wEth comes in, goes into double if statements
            // 5% withheld for buffer. 95 is sent to adaptor (but adaptor just holds) ==> total eth is 100
            // New deposit is added of 100. TOtal eth = 200. Only 10 eth is expected in buffer.
            // Therefore, sends all 100 eth to adaptor. But here it just  holds.
            await deposit(signers[2], wETH, parseEther('100'));
            expect(await wETH.balanceOf(buffer.address)).equal(parseEther("100"))
            await deposit(signers[2], wETH, parseEther('100'));
            expect(await wETH.balanceOf(buffer.address)).equal(parseEther("200"))
        })
       
   
    });
   
    async function deposit(recipient: SignerWithAddress, token: TestERC20, amount: BigNumberish) {
        await token.mint(recipient.address, amount);
        await token.connect(recipient).approve(ibAlluoCurrent.address, amount);
        await token.connect(recipient).approve(buffer.address, amount);
        await ibAlluoCurrent.connect(recipient).deposit(token.address, amount)
    }

    async function sendFundsToMultiSig(token: TestERC20, amount:BigNumberish) {
        let ABI = ["function sendFundsToMultiSig(address _token, uint256 _amount)"];
        let iface = new ethers.utils.Interface(ABI);
        let calldata = iface.encodeFunctionData("sendFundsToMultiSig", [token.address, amount]);
        await multisig.executeCall(buffer.address, calldata);
    }
    
});
