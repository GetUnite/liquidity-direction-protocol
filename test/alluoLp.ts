import { parseEther } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, BigNumberish } from "ethers";
import { ethers } from "hardhat";
import { before } from "mocha";
import { PseudoMultisigWallet, PseudoMultisigWallet__factory, UrgentAlluoLp, UrgentAlluoLp__factory } from "../typechain";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

async function incrementNextBlockTimestamp(amount: number): Promise<void> {
    return ethers.provider.send("evm_increaseTime", [amount]);
}

async function getLatestBlockTimestamp(): Promise<BigNumber> {
    let bl_num = await ethers.provider.send("eth_blockNumber", []);
    let cur_block = await ethers.provider.send("eth_getBlockByNumber", [bl_num, false]);
    return BigNumber.from(cur_block.timestamp);
}

async function skipDays(d: number){
    ethers.provider.send('evm_increaseTime', [d * 86400]);
    ethers.provider.send('evm_mine', []);
}

describe("AlluoLP", function () {
    let signers: SignerWithAddress[];

    let alluoLp: UrgentAlluoLp;
    let multisig: PseudoMultisigWallet;

    let backendExecutor: SignerWithAddress;
    let backendSigners: SignerWithAddress[];

    before(async function () {
        signers = await ethers.getSigners();

        backendExecutor = signers[5];
        backendSigners = [
            signers[6],
            signers[7],
            signers[8]
        ];
    });

    beforeEach(async function () {
        const backendSignersAddresses = backendSigners.map(
            (signer) => signer.address
        ) as [string, string, string];

        const AlluoLP = await ethers.getContractFactory("UrgentAlluoLp") as UrgentAlluoLp__factory;
        const Multisig = await ethers.getContractFactory("PseudoMultisigWallet") as PseudoMultisigWallet__factory;

        multisig = await Multisig.deploy();

        alluoLp = await AlluoLP.deploy(multisig.address, backendExecutor.address, backendSignersAddresses);
    });

    it("Should create bridged tokens", async function () {
        // address that will get minted tokens
        const recipient = signers[1].address;
        // amount of tokens to be minted, including decimals value of token
        const amount = ethers.utils.parseUnits("10.0", await alluoLp.decimals());

        expect(await alluoLp.balanceOf(recipient)).to.be.equal(0);

        await mint(recipient, amount);

        expect(await alluoLp.balanceOf(recipient)).to.be.equal(amount);
    });

    it("Should not deploy contract (attempt to put EOA as multisig wallet)", async function () {
        const eoa = signers[1];

        const backendSignersAddresses = backendSigners.map(
            (signer) => signer.address
        ) as [string, string, string];

        const AlluoLP = await ethers.getContractFactory("UrgentAlluoLp");
        const deployPromise = AlluoLP.deploy(eoa.address, backendExecutor.address, backendSignersAddresses);
        await expect(deployPromise).to.be.revertedWith("UrgentAlluoLp: not contract");
    });

    it("Should set signature timeout", async function () {
        const newValue = 3600;

        expect(await alluoLp.signatureTimeout()).to.not.be.equal(newValue);

        let ABI = ["function setSignatureTimeout(uint256 value)"];
        let iface = new ethers.utils.Interface(ABI);
        const calldata = iface.encodeFunctionData("setSignatureTimeout", [newValue]);

        await multisig.executeCall(alluoLp.address, calldata);

        expect(await alluoLp.signatureTimeout()).to.be.equal(newValue);
    });

    it("Should not set signature timeout (missing DEFAULT_ADMIN_ROLE)", async function () {
        const newValue = 3600;
        const notAdmin = signers[1];

        const role = await alluoLp.DEFAULT_ADMIN_ROLE();
        const tx = alluoLp.connect(notAdmin).setSignatureTimeout(newValue);

        await expect(tx).to.be.revertedWith(`AccessControl: account ${notAdmin.address.toLowerCase()} is missing role ${role}`);
    });

    it("Should allow user to burn tokens for withdrawal", async () => {
        const recipient = signers[1];
        const amount = ethers.utils.parseUnits("10.0", await alluoLp.decimals());

        await mint(recipient.address, amount);

        await expect(alluoLp.connect(recipient).withdraw(amount))
            .to.emit(alluoLp, "BurnedForWithdraw")
            .withArgs(recipient.address, amount);
    });

    it("Should grant role that can be granted to anyone", async () => {
        const role = await alluoLp.BACKEND_ROLE();
        const target = signers[1];

        expect(await alluoLp.hasRole(role, target.address)).to.be.false;

        let ABI = ["function grantRole(bytes32 role, address account)"];
        let iface = new ethers.utils.Interface(ABI);
        const calldata = iface.encodeFunctionData("grantRole", [role, target.address]);

        await multisig.executeCall(alluoLp.address, calldata);

        expect(await alluoLp.hasRole(role, target.address)).to.be.true;
    });

    it("Should grant role that can be granted only to contract", async () => {
        const role = await alluoLp.DEFAULT_ADMIN_ROLE();
        const NewContract = await ethers.getContractFactory('PseudoMultisigWallet') as PseudoMultisigWallet__factory;
        const newContract = await NewContract.deploy();

        expect(await alluoLp.hasRole(role, newContract.address)).to.be.false;

        let ABI = ["function grantRole(bytes32 role, address account)"];
        let iface = new ethers.utils.Interface(ABI);
        const calldata = iface.encodeFunctionData("grantRole", [role, newContract.address]);

        await multisig.executeCall(alluoLp.address, calldata);

        expect(await alluoLp.hasRole(role, newContract.address)).to.be.true;
    });

    it("Should not grant role that can be granted only to contract", async () => {
        const role = await alluoLp.DEFAULT_ADMIN_ROLE();
        const target = signers[1];

        expect(await alluoLp.hasRole(role, target.address)).to.be.false;

        let ABI = ["function grantRole(bytes32 role, address account)"];
        let iface = new ethers.utils.Interface(ABI);
        const calldata = iface.encodeFunctionData("grantRole", [role, target.address]);

        const tx = multisig.executeCall(alluoLp.address, calldata);

        expect(tx).to.be.revertedWith("UrgentAlluoLp: not contract");
    });

    it("Should not allow to mint tokens (expired signature)", async () => {
        const recipient = signers[1].address;
        const amount = ethers.utils.parseUnits("10.0", await alluoLp.decimals());
        const timeout = await alluoLp.signatureTimeout()

        const timestamp = await getLatestBlockTimestamp();
        const nonce = await alluoLp.nonce();
        const dataHash = ethers.utils.solidityKeccak256(
            ["address", "uint256"],
            [recipient, amount]
        );

        const signedDataHash = ethers.utils.solidityKeccak256(
            ["bytes32", "uint256", "uint256"],
            [dataHash, timestamp, nonce]
        );

        const bytesArray = ethers.utils.arrayify(signedDataHash);

        const flatSignature1 = await backendSigners[0].signMessage(bytesArray);
        const flatSignature2 = await backendSigners[1].signMessage(bytesArray);
        const flatSignature3 = await backendSigners[2].signMessage(bytesArray);

        const signature1 = ethers.utils.splitSignature(flatSignature1);
        const signature2 = ethers.utils.splitSignature(flatSignature2);
        const signature3 = ethers.utils.splitSignature(flatSignature3);

        await incrementNextBlockTimestamp(timeout.toNumber() + 1);

        const tx = alluoLp.connect(backendExecutor).createBridgedTokens(
            recipient,
            amount,
            [signature1.v, signature2.v, signature3.v],
            [signature1.r, signature2.r, signature3.r],
            [signature1.s, signature2.s, signature3.s],
            timestamp
        );

        await expect(tx).to.be.revertedWith("UrgentAlluoLp: sig expiried");
    });

    it("Should not allow to mint tokens (invalid signature)", async () => {
        const recipient = signers[1].address;
        const wrongSigner = signers[2];
        const amount = ethers.utils.parseUnits("10.0", await alluoLp.decimals());

        const timestamp = await getLatestBlockTimestamp();
        const nonce = await alluoLp.nonce();
        const dataHash = ethers.utils.solidityKeccak256(
            ["address", "uint256"],
            [recipient, amount]
        );

        const signedDataHash = ethers.utils.solidityKeccak256(
            ["bytes32", "uint256", "uint256"],
            [dataHash, timestamp, nonce]
        );

        const bytesArray = ethers.utils.arrayify(signedDataHash);

        const flatSignature1 = await backendSigners[0].signMessage(bytesArray);
        const flatSignature2 = await wrongSigner.signMessage(bytesArray);
        const flatSignature3 = await backendSigners[2].signMessage(bytesArray);

        const signature1 = ethers.utils.splitSignature(flatSignature1);
        const signature2 = ethers.utils.splitSignature(flatSignature2);
        const signature3 = ethers.utils.splitSignature(flatSignature3);

        const tx = alluoLp.connect(backendExecutor).createBridgedTokens(
            recipient,
            amount,
            [signature1.v, signature2.v, signature3.v],
            [signature1.r, signature2.r, signature3.r],
            [signature1.s, signature2.s, signature3.s],
            timestamp
        );

        await expect(tx).to.be.revertedWith("UrgentAlluoLp: invalid sig");
    });

    it("Should not allow to mint tokens (repeated signature)", async () => {
        const recipient = signers[1].address;
        const amount = ethers.utils.parseUnits("10.0", await alluoLp.decimals());

        const timestamp = await getLatestBlockTimestamp();
        const nonce = await alluoLp.nonce();
        const dataHash = ethers.utils.solidityKeccak256(
            ["address", "uint256"],
            [recipient, amount]
        );

        const signedDataHash = ethers.utils.solidityKeccak256(
            ["bytes32", "uint256", "uint256"],
            [dataHash, timestamp, nonce]
        );

        const bytesArray = ethers.utils.arrayify(signedDataHash);

        const flatSignature1 = await backendSigners[0].signMessage(bytesArray);
        const flatSignature2 = await backendSigners[0].signMessage(bytesArray);
        const flatSignature3 = await backendSigners[2].signMessage(bytesArray);

        const signature1 = ethers.utils.splitSignature(flatSignature1);
        const signature2 = ethers.utils.splitSignature(flatSignature2);
        const signature3 = ethers.utils.splitSignature(flatSignature3);

        const tx = alluoLp.connect(backendExecutor).createBridgedTokens(
            recipient,
            amount,
            [signature1.v, signature2.v, signature3.v],
            [signature1.r, signature2.r, signature3.r],
            [signature1.s, signature2.s, signature3.s],
            timestamp
        );

        await expect(tx).to.be.revertedWith("UrgentAlluoLp: repeated sig");
    });

    it("Should not allow to mint tokens (retranslation attack)", async () => {
        const recipient = signers[1].address;
        const amount = ethers.utils.parseUnits("10.0", await alluoLp.decimals());

        const timestamp = await getLatestBlockTimestamp();
        const nonce = await alluoLp.nonce();
        const dataHash = ethers.utils.solidityKeccak256(
            ["address", "uint256"],
            [recipient, amount]
        );

        const signedDataHash = ethers.utils.solidityKeccak256(
            ["bytes32", "uint256", "uint256"],
            [dataHash, timestamp, nonce]
        );

        const bytesArray = ethers.utils.arrayify(signedDataHash);

        const flatSignature1 = await backendSigners[0].signMessage(bytesArray);
        const flatSignature2 = await backendSigners[1].signMessage(bytesArray);
        const flatSignature3 = await backendSigners[2].signMessage(bytesArray);

        const signature1 = ethers.utils.splitSignature(flatSignature1);
        const signature2 = ethers.utils.splitSignature(flatSignature2);
        const signature3 = ethers.utils.splitSignature(flatSignature3);

        await alluoLp.connect(backendExecutor).createBridgedTokens(
            recipient,
            amount,
            [signature1.v, signature2.v, signature3.v],
            [signature1.r, signature2.r, signature3.r],
            [signature1.s, signature2.s, signature3.s],
            timestamp
        );

        const retranslatedTx = alluoLp.connect(backendExecutor).createBridgedTokens(
            recipient,
            amount,
            [signature1.v, signature2.v, signature3.v],
            [signature1.r, signature2.r, signature3.r],
            [signature1.s, signature2.s, signature3.s],
            timestamp
        );

        await expect(retranslatedTx).to.be.revertedWith("UrgentAlluoLp: invalid sig");
    });

    it("Should not allow to mint tokens (missing backend role)", async () => {
        const recipient = signers[1].address;
        const notBackend = signers[2];
        const amount = ethers.utils.parseUnits("10.0", await alluoLp.decimals());

        const timestamp = await getLatestBlockTimestamp();
        const nonce = await alluoLp.nonce();
        const dataHash = ethers.utils.solidityKeccak256(
            ["address", "uint256"],
            [recipient, amount]
        );

        const signedDataHash = ethers.utils.solidityKeccak256(
            ["bytes32", "uint256", "uint256"],
            [dataHash, timestamp, nonce]
        );

        const bytesArray = ethers.utils.arrayify(signedDataHash);

        const flatSignature1 = await backendSigners[0].signMessage(bytesArray);
        const flatSignature2 = await backendSigners[1].signMessage(bytesArray);
        const flatSignature3 = await backendSigners[2].signMessage(bytesArray);

        const signature1 = ethers.utils.splitSignature(flatSignature1);
        const signature2 = ethers.utils.splitSignature(flatSignature2);
        const signature3 = ethers.utils.splitSignature(flatSignature3);

        const tx = alluoLp.connect(notBackend).createBridgedTokens(
            recipient,
            amount,
            [signature1.v, signature2.v, signature3.v],
            [signature1.r, signature2.r, signature3.r],
            [signature1.s, signature2.s, signature3.s],
            timestamp
        );

        await expect(tx).to.be.revertedWith(`AccessControl: account ${notBackend.address.toLowerCase()} is missing role ${await alluoLp.BACKEND_ROLE()}`);
    });

    describe('Token transfers and apy calculation', function () { 
        it('Should return right user balance after one year even without claim', async function () {

            // address that will get minted tokens
            const recepient = signers[3].address;
            // amount of tokens to be minted, including decimals value of alluoLp
            const amount = ethers.utils.parseUnits("100.0", await alluoLp.decimals());

            await mint(recepient, amount);
    
            await skipDays(365);
            await alluoLp.update()

            //view function that returns balance with APY
            let balance = await alluoLp.getBalance(signers[3].address);
            expect(balance).to.be.gt(parseEther("107.9"));
            expect(balance).to.be.lt(parseEther("108.1"));
        });

        it('Should correctly calculate balances over time and various transfers', async function () {

            const amount = ethers.utils.parseUnits("100.0", await alluoLp.decimals());

            //big holder to simulate transfers between users
            const largeAmount = ethers.utils.parseUnits("1000.0", await alluoLp.decimals());
            await mint(signers[9].address, largeAmount);

            //start
            await mint(signers[1].address, amount);
            await skipDays(73);
            
            //after first period
            await alluoLp.connect(signers[9]).transfer(signers[1].address, amount);
            await mint(signers[2].address, amount);
            await skipDays(73);

            //after second period
            await mint(signers[4].address, amount);
            await alluoLp.connect(signers[9]).transfer(signers[3].address, amount);
            await skipDays(73);

            //after third period
            await mint(signers[4].address, amount);
            await skipDays(73);

            //after fourth period
            await alluoLp.connect(signers[3]).claim(signers[3].address);
            await alluoLp.update();
            let balance = await alluoLp.balanceOf(signers[3].address);
            expect(balance).to.be.gt(parseEther("103.22"));
            expect(balance).to.be.lt(parseEther("103.23"));
            await alluoLp.connect(signers[3]).withdraw(balance);

            //changing interest
            const newInterest = 5;
            let ABI = ["function setInterest(uint8 _newInterest)"];
            let iface = new ethers.utils.Interface(ABI);
            const calldata = iface.encodeFunctionData("setInterest", [newInterest]);
            await multisig.executeCall(alluoLp.address, calldata);

            await alluoLp.connect(signers[9]).transfer(signers[4].address, amount);
            await skipDays(73);

            //after fifth period
            await alluoLp.connect(signers[1]).claim(signers[1].address);
            balance = await alluoLp.balanceOf(signers[1].address);
            expect(balance).to.be.gt(parseEther("213.54"));
            expect(balance).to.be.lt(parseEther("213.55"));
            await alluoLp.connect(signers[1]).withdraw(balance);

            await alluoLp.connect(signers[2]).claim(signers[2].address);
            balance = await alluoLp.balanceOf(signers[2].address);
            expect(balance).to.be.gt(parseEther("105.92"));
            expect(balance).to.be.lt(parseEther("105.93"));
            await alluoLp.connect(signers[2]).withdraw(balance);

            await alluoLp.connect(signers[4]).claim(signers[4].address);
            balance = await alluoLp.balanceOf(signers[4].address);
            expect(balance).to.be.gt(parseEther("307.87"));
            expect(balance).to.be.lt(parseEther("307.88"));
            await alluoLp.connect(signers[4]).withdraw(balance);
        });
        it('Should not give rewards if the interest is zero', async function () {

            // address that will get minted tokens
            const recepient = signers[3].address;
            // amount of tokens to be minted, including decimals value of alluoLp
            const amount = ethers.utils.parseUnits("100.0", await alluoLp.decimals());
    
            await mint(recepient, amount);
    
            await skipDays(365);
    
            await alluoLp.connect(signers[3]).claim(signers[3].address);
            let balance = await alluoLp.balanceOf(signers[3].address);
            expect(balance).to.be.gt(parseEther("107.9"));
            expect(balance).to.be.lt(parseEther("108.1"));
    
            //changing interest
            const newInterest = 0;
            let ABI = ["function setInterest(uint8 _newInterest)"];
            let iface = new ethers.utils.Interface(ABI);
            const calldata = iface.encodeFunctionData("setInterest", [newInterest]);
            await multisig.executeCall(alluoLp.address, calldata);
    
            await skipDays(365);
    
            //balance is the same
            await alluoLp.connect(signers[3]).claim(signers[3].address);
            let newBalance = await alluoLp.balanceOf(signers[3].address);
            expect(balance).to.equal(newBalance);
        });
    });
    
    describe('Token basic functionality', function () {
        describe("Tokenomics and Info", function () {
            it("Should return basic information", async function () {
                expect(await alluoLp.name()).to.equal("ALLUO LP"),
                expect(await alluoLp.symbol()).to.equal("LPALL"),
                expect(await alluoLp.decimals()).to.equal(18);
            });
            it("Should return the total supply equal to 0", async function () {
                expect(await alluoLp.totalSupply()).to.equal(0);
            });
        });
        describe("Balances", function () {
            it('When the requested account has no tokens it returns zero', async function () {
                expect(await alluoLp.balanceOf(signers[1].address)).to.equal("0");
            });
            
            it('When the requested account has some tokens it returns the amount', async function () {
                await mint(signers[1].address, parseEther('50'));
                expect(await alluoLp.balanceOf(signers[1].address)).to.equal(parseEther('50'));
            });
    
        });
        describe("Transactions", function () {
            describe("Should fail when", function (){
    
                it('transfer to zero address', async function () {
                    await expect(alluoLp.transfer(ZERO_ADDRESS, parseEther('100'))
                    ).to.be.revertedWith("ERC20: transfer to the zero address");
                });
                
                it('transfer from zero address', async function () {
                    await expect(alluoLp.transferFrom(ZERO_ADDRESS, signers[1].address, parseEther('100'))
                    ).to.be.revertedWith("ERC20: transfer from the zero address");
                });
    
                it('sender doesn’t have enough tokens', async function () {
                    await expect(alluoLp.connect(signers[1]).transfer(signers[2].address, parseEther('100'))
                    ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
                });
    
                it('transfer amount exceeds balance', async function () {
                    await expect(alluoLp.transferFrom(signers[1].address, signers[2].address, parseEther('100'))
                    ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
                });
            });
            describe("Should transfer when everything is correct", function () {  
                it('from signer1 to signer2 with correct balances at the end', async function () {
                    await mint(signers[1].address, parseEther('50'));
                    await alluoLp.connect(signers[1]).transfer(signers[2].address, parseEther('25'));
                    const addr1Balance = await alluoLp.balanceOf(signers[1].address);
                    const addr2Balance = await alluoLp.balanceOf(signers[2].address);
                    expect(addr1Balance).to.equal(parseEther('25'));
                    expect(addr2Balance).to.equal(parseEther('25'));
                });
            });
    
        });
    
        describe('Approve', function () {
            it("Approving and TransferFrom", async function () {
                await mint(signers[1].address, parseEther('100'));
                await alluoLp.connect(signers[1]).approve(signers[2].address, parseEther('50'));
                expect(await alluoLp.allowance(signers[1].address, signers[2].address)).to.equal(parseEther('50'));
    
                await alluoLp.connect(signers[2]).transferFrom(signers[1].address, signers[2].address, parseEther("50") )
                let balance = await alluoLp.balanceOf(signers[1].address);
                expect(balance).to.equal(parseEther('50'));
            });
            it("Not approving becouse of zero address", async function () {
                await expect(alluoLp.approve(ZERO_ADDRESS, parseEther('100'))
                    ).to.be.revertedWith("ERC20: approve to the zero address");
            });

            it("increasing and decreasing allowance", async function () {
                await mint(signers[1].address, parseEther('100'));
                await alluoLp.connect(signers[1]).increaseAllowance(signers[2].address, parseEther('50'));
                expect(await alluoLp.allowance(signers[1].address, signers[2].address)).to.equal(parseEther('50'));
    
                await expect(
                    alluoLp.connect(signers[2]).transferFrom(signers[1].address, signers[2].address, parseEther("60") ))
                    .to.be.revertedWith("ERC20: transfer amount exceeds allowance");
                await alluoLp.connect(signers[1]).increaseAllowance(signers[2].address, parseEther('20'));
                await alluoLp.connect(signers[1]).decreaseAllowance(signers[2].address, parseEther('10'));
                await alluoLp.connect(signers[2]).transferFrom(signers[1].address, signers[2].address, parseEther("60") )
                await expect(
                    alluoLp.connect(signers[1]).decreaseAllowance(signers[2].address, parseEther("50") ))
                    .to.be.revertedWith("ERC20: decreased allowance below zero");

                let balance = await alluoLp.balanceOf(signers[1].address);
                expect(balance).to.equal(parseEther('40'));
            });
        });
        describe('Mint / Burn', function () {
            it("the mint fails because the the zero address ", async function () {
                await expect(mint(ZERO_ADDRESS, parseEther('100'))
                    ).to.be.revertedWith("ERC20: mint to the zero address");
            });

            it("burn fails because the amount exceeds the balance", async function () {
                await mint(signers[1].address, parseEther('100'));
                await expect(alluoLp.connect(signers[1]).withdraw(parseEther('200'))
                ).to.be.revertedWith("ERC20: burn amount exceeds balance");
            });
        });
     });


    async function mint(recipient: string, amount: BigNumberish) {
        // Get current UTC timestamp in seconds
        const timestamp = await getLatestBlockTimestamp();
        // Get current nonce from contract for digital signature - it will
        // be incremented with every successful call of `createBridgedTokens()`
        const nonce = await alluoLp.nonce();

        // get a hash of address and amount - we're providing type names (as 
        // from Solidity) and values to be hashed
        const dataHash = ethers.utils.solidityKeccak256(
            ["address", "uint256"],
            [recipient, amount]
        );

        // now second layer hashing, but including security values
        const signedDataHash = ethers.utils.solidityKeccak256(
            ["bytes32", "uint256", "uint256"],
            [dataHash, timestamp, nonce]
        );

        // At this step we are making ethers to treat data as bytes array,
        // not string
        const bytesArray = ethers.utils.arrayify(signedDataHash);

        // 3 different private keys has to sign same message.
        const flatSignature1 = await backendSigners[0].signMessage(bytesArray);
        const flatSignature2 = await backendSigners[1].signMessage(bytesArray);
        const flatSignature3 = await backendSigners[2].signMessage(bytesArray);

        // We signed everything, but before knocking contract, we have to
        // split signature into 3 different components - v, r, s.
        const signature1 = ethers.utils.splitSignature(flatSignature1);
        const signature2 = ethers.utils.splitSignature(flatSignature2);
        const signature3 = ethers.utils.splitSignature(flatSignature3);

        // Now you're all set up to fire up tokens to that dude! Sender address
        // should be approved to do so - any of signature creators will not work
        await alluoLp.connect(backendExecutor).createBridgedTokens(
            recipient,
            amount,
            [signature1.v, signature2.v, signature3.v],
            [signature1.r, signature2.r, signature3.r],
            [signature1.s, signature2.s, signature3.s],
            timestamp
        );
    }
});