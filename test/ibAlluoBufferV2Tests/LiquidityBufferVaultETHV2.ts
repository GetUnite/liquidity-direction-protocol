import { TransactionReceipt } from "@ethersproject/abstract-provider";
import { parseEther, parseUnits } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, BigNumberish, BytesLike } from "ethers";
import { Interface } from "ethers/lib/utils";
import { ethers, upgrades, } from "hardhat";
import { before, Test } from "mocha";
import { LiquidityBufferUSDAdaptor, LiquidityBufferUSDAdaptor__factory, TestERC20, TestERC20__factory, PseudoMultisigWallet, PseudoMultisigWallet__factory, LiquidityBufferVault, LiquidityBufferVault__factory, IbAlluoV2, IbAlluoV2__factory, LiquidityBufferVaultV2, LiquidityBufferVaultV2__factory, IbAlluoUSD, LiquidityBufferVaultV3, IbAlluoUSD__factory, LiquidityBufferVaultV3__factory } from "../../typechain";

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

    let ibAlluoCurrent: IbAlluoUSD;
    let multisig: PseudoMultisigWallet;
    let buffer: LiquidityBufferVaultV3;


    let wETH: TestERC20;


    before(async function () {
        signers = await ethers.getSigners();
    });


    beforeEach(async function () {
        const IbAlluo = await ethers.getContractFactory("IbAlluoUSD") as IbAlluoUSD__factory;
        //We are using this contract to simulate Gnosis multisig wallet
        const Multisig = await ethers.getContractFactory("PseudoMultisigWallet") as PseudoMultisigWallet__factory;
        //For tests we are using version of contract with hardhat console.log, to see all Txn
        //you can switch two next lines and turn off logs
        // const Buffer = await ethers.getContractFactory("LiquidityBufferVaultForTests") as LiquidityBufferVaultForTests__factory;
        const Buffer = await ethers.getContractFactory("LiquidityBufferVaultV3") as LiquidityBufferVaultV3__factory;
        const WETH = await ethers.getContractFactory("TestERC20") as TestERC20__factory;

        wETH = await WETH.connect(signers[0]).deploy("WETH", "WETH", 18, true)
        multisig = await Multisig.deploy(true);
        await upgrades.silenceWarnings();
        buffer = await upgrades.deployProxy(Buffer,
            [multisig.address, multisig.address,],
            {initializer: 'initialize', kind:'uups',unsafeAllow: ['delegatecall']},
        ) as LiquidityBufferVaultV3;

        ibAlluoCurrent = await upgrades.deployProxy(IbAlluo,
            [multisig.address,
            buffer.address,
            [wETH.address]],
            {initializer: 'initialize', kind:'uups'}
        ) as IbAlluoUSD;


      
        let ABI = ["function setAlluoLp(address newAlluoLp)"];
        let iface = new ethers.utils.Interface(ABI);
        let calldata = iface.encodeFunctionData("setAlluoLp", [ibAlluoCurrent.address]);
        await multisig.executeCall(buffer.address, calldata);


        expect(await ibAlluoCurrent.liquidityBuffer()).equal(buffer.address);
        await ibAlluoCurrent.migrateStep2();




        let tokenArray = [wETH.address]
        tokenArray.forEach( async token => {

            ABI = ["function setTokenToAdapter (address _token, uint256 _AdapterId)"];
            iface = new ethers.utils.Interface(ABI);
            calldata = iface.encodeFunctionData("setTokenToAdapter", [token, ethers.constants.MaxUint256] );
            await multisig.executeCall(buffer.address, calldata);
        })

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
   
    describe('Buffer Withdraw: Test all if statements', function () {
        it ("If inBuffer >= _amount && lastWithdrawalRequest == lastSatisfiedWithdrawal", async function () {
            // Initially, buffer = 0
            // When wEth comes in, buffer = 100.
            // When withdrawn, directly remove funds from buffer.
            await deposit(signers[1], wETH, parseEther('100'));
            // await ibAlluoCurrent.connect(signers[1]).withdraw(wETH.address, parseEther("50"))
            await expect(await ibAlluoCurrent.connect(signers[1]).withdraw(wETH.address, parseEther("48")))
            .to.emit(buffer, "WithdrawalSatisfied").withArgs(
                signers[1].address, wETH.address, parseEther("48"), 0, (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp
            )
            expect(await wETH.balanceOf(buffer.address)).equal(parseEther("52"))


        })

        it ("If inBuffer < _amount && lastWithdrawalRequest == lastSatisfiedWithdrawal", async function () {
            // Add to queue, then do nothing.
            // Initially, buffer = 0. Then admin removes all ETH.
            // Balance is now 0 ETH.
            // When withdrawn, increment withdrawalRequest and emit addedtoqueue event.
            await deposit(signers[1], wETH, parseEther('100'));
            sendFundsToMultiSig(wETH, parseEther("100"));
            let previousRequestIndex : BigNumber= await buffer.lastWithdrawalRequest();
            let previousWithdrawalSum : BigNumber= await buffer.totalWithdrawalAmount();

            await expect(await ibAlluoCurrent.connect(signers[1]).withdraw(wETH.address, parseEther("48")))
            .to.emit(buffer, "AddedToQueue").withArgs(
                signers[1].address, wETH.address, parseEther("48"), previousRequestIndex.add(1), (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp
            )

            expect(await buffer.lastWithdrawalRequest()).equal(previousRequestIndex.add(1))
            expect(await buffer.totalWithdrawalAmount()).equal(previousWithdrawalSum.add(parseEther("48")))


        })
        it ("If inBuffer < _amount && lastWithdrawalRequest == lastSatisfiedWithdrawal THEN do satisfyWithdrawals after there is sufficient ETH", async function () {
            // Add to queue, then do nothing.
            // Initially, buffer = 0. Then admin removes all ETH.
            // Balance is now 0 ETH.
            // When withdrawn, increment withdrawalRequest and emit addedtoqueue event.
            await deposit(signers[1], wETH, parseEther('100'));
            sendFundsToMultiSig(wETH, parseEther("100"));
            let previousRequestIndex : BigNumber= await buffer.lastWithdrawalRequest();
            let previousWithdrawalSum : BigNumber= await buffer.totalWithdrawalAmount();
            await ibAlluoCurrent.connect(signers[1]).withdraw(wETH.address, parseEther("48"))
       
            expect(await buffer.lastWithdrawalRequest()).equal(previousRequestIndex.add(1))
            expect(await buffer.totalWithdrawalAmount()).equal(previousWithdrawalSum.add(parseEther("48")))

            // Someone deposits and now there are sufficient funds to satisfy the withdrawal.
            await deposit(signers[2], wETH, parseEther('100'));
            previousRequestIndex = await buffer.lastWithdrawalRequest();
            let previousSatisfiedIndex = await buffer.lastSatisfiedWithdrawal();
            previousWithdrawalSum = await buffer.totalWithdrawalAmount();

            // We can't use this snippet here because block.timestamp is off by very small amounts!
            // So work around it.

            // await expect(buffer.satisfyWithdrawals())
            // .to.emit(buffer, "WithdrawalSatisfied").withArgs(
            //     signers[1].address, wETH.address, parseEther("48"), previousSatisfiedIndex.add(1), (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp
            // )
            const tx = await buffer.satisfyWithdrawals();
            // The line above should do nothing as when deposits come in, there are automatic checks.

            expect(await buffer.totalWithdrawalAmount()).equal(0);
            expect(await wETH.balanceOf(signers[1].address)).equal(parseEther("48"));


        })
        it ("If inBuffer >= _amount && lastWithdrawalRequest != lastSatisfiedWithdrawal ", async function () {
            // Add to queue, then start satisfyWithdrawals();
            await deposit(signers[1], wETH, parseEther('100'));
            await deposit(signers[2], wETH, parseEther('50'));

            sendFundsToMultiSig(wETH, parseEther("100"));
            let previousRequestIndex : BigNumber= await buffer.lastWithdrawalRequest();
            let previousWithdrawalSum : BigNumber= await buffer.totalWithdrawalAmount();

            // Now, when signer1 tries to withdraw 60, there is only 50, so he is added to the queue.
            // Then, when signer 2 tries to withdraw 40, there is sufficient funds, but it should reject him and 
            // check if signer 1 can be satisfied. 
            // Signer 1 cannot be satisfied so once funds are added, call satisfyWithdrawals and it should payout signer 1 ONLY
            await ibAlluoCurrent.connect(signers[1]).withdraw(wETH.address, parseEther("60"))
           
            // This should do NOTHING! Insufficient funds to payout signer 1
            await buffer.satisfyWithdrawals();
            await ibAlluoCurrent.connect(signers[2]).withdraw(wETH.address, parseEther("40"))
            
            // This should do NOTHING! Insufficient funds to payout signer 1
            await buffer.satisfyWithdrawals();

            expect(await buffer.lastSatisfiedWithdrawal()).equal(0);

            // Now signer 3 deposits enough for signer1 to withdraw, but not including signer 2
            // Signer 1: 60, Signer 2: 40. 
            // Total balance = 50 + 30 (new SIgner 3)
            await deposit(signers[3], wETH, parseEther('30'));
            // Technically, this line below does nothing because deposit already checks.
            // However, here for visual purposes.
            const tx3 = await buffer.satisfyWithdrawals();
          

            expect(await wETH.balanceOf(signers[1].address)).equal(parseEther("60"));
            expect(await wETH.balanceOf(signers[2].address)).equal(parseEther("0"));
            // When there is another deposit that allows signer 2 to withdraw, then he can.
            await deposit(signers[3], wETH, parseEther('30'));
            // Technically, this line below does nothing because deposit already checks.
            // However, here for visual purposes.
            const tx4 = await buffer.satisfyWithdrawals();

            expect(await wETH.balanceOf(signers[2].address)).equal(parseEther("40"));
            // Expect that there are now ithdrawal requests outstanding.
            expect(await buffer.totalWithdrawalAmount()).equal(0);
            expect(await buffer.lastWithdrawalRequest()).equal(await buffer.lastSatisfiedWithdrawal());
        })
        it ("If inBuffer < _amount && lastWithdrawalRequest != lastSatisfiedWithdrawal ", async function () {
            // Add to queue, then start satisfyWithdrawals();
            await deposit(signers[1], wETH, parseEther('100'));
            await deposit(signers[2], wETH, parseEther('50'));

            sendFundsToMultiSig(wETH, parseEther("150"));
            let previousRequestIndex : BigNumber= await buffer.lastWithdrawalRequest();
            let previousWithdrawalSum : BigNumber= await buffer.totalWithdrawalAmount();

            // Now, when signer1 tries to withdraw 60, there are no funds, so he is added to the queue.
            // Then, when signer 2 tries to withdraw 40, there are no funds, so added to queue.
            // Signer 1 cannot be satisfied so once funds are added, call satisfyWithdrawals and it should payout signer 1 ONLY

            await expect(await ibAlluoCurrent.connect(signers[1]).withdraw(wETH.address, parseEther("60")))
            .to.emit(buffer, "AddedToQueue").withArgs(
                signers[1].address, wETH.address, parseEther("60"), previousRequestIndex.add(1), (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp
            )

            // This should do NOTHING! Insufficient funds to payout signer 1
            await buffer.satisfyWithdrawals();

            await expect(await ibAlluoCurrent.connect(signers[2]).withdraw(wETH.address, parseEther("40")))
            .to.emit(buffer, "AddedToQueue").withArgs(
                signers[2].address, wETH.address, parseEther("40"), previousRequestIndex.add(2), (await ethers.provider.getBlock(await ethers.provider.getBlockNumber())).timestamp
            )

            // This should do NOTHING! Insufficient funds to payout signer 1
            await buffer.satisfyWithdrawals();

            expect(await buffer.lastSatisfiedWithdrawal()).equal(0);

            // Now signer 3 deposits enough for both signers to withdraw.
            // Signer 1: 60, Signer 2: 40. 
            // Total balance = 0 + 100 (new SIgner 3)
            await deposit(signers[3], wETH, parseEther('100'));

            const tx3 = await buffer.satisfyWithdrawals();

            expect(await wETH.balanceOf(signers[1].address)).equal(parseEther("60"));
            expect(await wETH.balanceOf(signers[2].address)).equal(parseEther("40"));
            expect(await wETH.balanceOf(buffer.address)).equal(0);
            expect(await buffer.totalWithdrawalAmount()).equal(0);
            expect(await buffer.lastWithdrawalRequest()).equal(await buffer.lastSatisfiedWithdrawal());
        })
   
    });


    // Get the last event emitted for satisfyWithdrawals() (which is the one we're interested in)
    function fetchLastEmittedEvent(receipt : TransactionReceipt, interface1: Interface, eventName: string) {
        const data = receipt.logs[receipt.logs.length-1].data;
        const topics = receipt.logs[receipt.logs.length-1].topics;
        return interface1.decodeEventLog(eventName, data, topics);
    } 
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
