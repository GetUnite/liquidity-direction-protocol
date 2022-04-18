import { parseEther, parseUnits } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, BigNumberish, BytesLike } from "ethers";
import { ethers, network, upgrades } from "hardhat";
import { IERC20, PseudoMultisigWallet, PseudoMultisigWallet__factory , AlluoLpV3, AlluoLpV3__factory, LiquidityBufferVault, LiquidityBufferVault__factory, LiquidityBufferVaultForTests__factory, LiquidityBufferVaultForTests,  IbAlluoUSD, IbAlluoUSD__factory} from "../typechain";

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

async function getHolders() : Promise<string[]>{

    let tokenAddress = "0x29c66CF57a03d41Cfe6d9ecB6883aa0E2AbA21Ec"
    let deploymentBlock = 25009106

    const token = await ethers.getContractAt("IERC20", tokenAddress);
    
    const events = await ethers.provider.getLogs({
        fromBlock: deploymentBlock,
        toBlock: "latest",
        address: tokenAddress,
        topics: ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"]  
                    //keccak256("Transfer(address,address,uint256)")
    })        

    const decoder = new ethers.utils.AbiCoder;

    let fullList: string[] = [];
    let onlyCurrentHoldersList: string[] = [];

    for(let i = 0; i < events.length; i++){
        let addressTo = (decoder.decode(["address"], events[i].topics[2])).toString();

        if(!fullList.includes(addressTo) && addressTo != ethers.constants.AddressZero){
            fullList.push(addressTo)
        }
    }

    for(let i = 0; i < fullList.length; i++){
        let balance = await token.balanceOf(fullList[i]);

        if(balance > BigNumber.from(0)){
            onlyCurrentHoldersList.push(fullList[i])
        }
    }

    //console.log(onlyCurrentHoldersList);
    return onlyCurrentHoldersList
}


describe("IbAlluoUSD and Buffer", function () {
    let signers: SignerWithAddress[];
    let whale: SignerWithAddress;
    let curveLpHolder: SignerWithAddress;

    let ibAlluoCurrent: IbAlluoUSD;
    let multisig: PseudoMultisigWallet;
    let buffer: LiquidityBufferVault;

    let dai: IERC20, usdc: IERC20, usdt: IERC20;
    let curveLp: IERC20;

    before(async function () {

        //We are forking Polygon mainnet, please set Alchemy key in .env
        await network.provider.request({
            method: "hardhat_reset",
            params: [{
                forking: {
                    enabled: true,
                    jsonRpcUrl: process.env.POLYGON_FORKING_URL as string,
                    //you can fork from last block by commenting next line
                    blockNumber: 27279634, 
                },
            },],
        });

        signers = await ethers.getSigners();
        const whaleAddress = "0x075e72a5eDf65F0A5f44699c7654C1a76941Ddc8";
        const curveLpHolderAddress = "0xba0c565110f65d181b9ff1d8a9f787b52857bb0c";

        await ethers.provider.send(
            'hardhat_impersonateAccount',
            [whaleAddress]
        );

        await ethers.provider.send(
            'hardhat_impersonateAccount',
            [curveLpHolderAddress]
        );
        
        whale = await ethers.getSigner(whaleAddress);
        curveLpHolder = await ethers.getSigner(curveLpHolderAddress);
        dai = await ethers.getContractAt("IERC20", "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063");
        usdc = await ethers.getContractAt("IERC20", "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174");
        usdt = await ethers.getContractAt("IERC20", "0xc2132D05D31c914a87C6611C10748AEb04B58e8F");
        curveLp = await ethers.getContractAt("IERC20", "0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171");
        
        console.log("We are forking Polygon mainnet\n");
        expect(await dai.balanceOf(whale.address)).to.be.gt(0, "Whale has no DAI, or you are not forking Polygon");

        await signers[0].sendTransaction({
            to: whale.address,
            value: parseEther("100.0")
        });
    });

    // AlluoLP v0 - not upgradable
    // AlluoLP v1 - upgradable with migration function
    // AlluoLP v2 - upgradable with mint function and grantRole fix
    // AlluoLP v3 - automated deposit and withdrawal with liquidity buffer 

    // IbAlluo v1 - reward system changed, now ratio between alluoLp and USD grow, not amount of lp tokens

    beforeEach(async function () {

        const IbAlluo = await ethers.getContractFactory("IbAlluoUSD") as IbAlluoUSD__factory;
        //We are using this contract to simulate Gnosis multisig wallet
        const Multisig = await ethers.getContractFactory("PseudoMultisigWallet") as PseudoMultisigWallet__factory;
        //For tests we are using version of contract with hardhat console.log, to see all Txn
        //you can switch two next lines and turn off logs
        // const Buffer = await ethers.getContractFactory("LiquidityBufferVaultForTests") as LiquidityBufferVaultForTests__factory;
        const Buffer = await ethers.getContractFactory("LiquidityBufferVault") as LiquidityBufferVault__factory;
        
        let curvePool = "0x445FE580eF8d70FF569aB36e80c647af338db351"

        multisig = await Multisig.deploy(true);

        buffer = await upgrades.deployProxy(Buffer,
            [multisig.address, multisig.address, curvePool],
            {initializer: 'initialize', kind:'uups'}
        ) as LiquidityBufferVault;

        let ABI = ["function approveAll()"];
        let iface = new ethers.utils.Interface(ABI);
        let calldata = iface.encodeFunctionData("approveAll", []);

        await multisig.executeCall(buffer.address, calldata);

        ibAlluoCurrent = await upgrades.deployProxy(IbAlluo,
            [multisig.address,
            buffer.address,
            [dai.address,
            usdc.address,
            usdt.address]],
            {initializer: 'initialize', kind:'uups'}
        ) as IbAlluoUSD;

        ABI = ["function setAlluoLp(address newAlluoLp)"];
        iface = new ethers.utils.Interface(ABI);
        calldata = iface.encodeFunctionData("setAlluoLp", [ibAlluoCurrent.address]);

        await multisig.executeCall(buffer.address, calldata);

        // const alluolp = await ethers.getContractAt("AlluoLpV3", "0x29c66CF57a03d41Cfe6d9ecB6883aa0E2AbA21Ec");
        // let holders = await getHolders();

        // const middleIndex = Math.ceil(holders.length / 2);

        // const firstHalf = holders.splice(0, middleIndex);   
        // const secondHalf = holders.splice(-middleIndex);

        // console.log(firstHalf);  
        // console.log(secondHalf); 
        // console.log(holders);       
        
        // let txn1 = await ibAlluoCurrent.migrateStep1(alluolp.address, firstHalf)
        // let txn2 = await ibAlluoCurrent.migrateStep1(alluolp.address, secondHalf)


        await ibAlluoCurrent.migrateStep2();
    });

    describe('Buffer integration with IbAlluo', function () {

        it("Simulation with random deposits and withdrawals", async function () {
            let numberOfDeposits = getRandomArbitrary(4, 5);
            let i = 0;
    
            while (i <= numberOfDeposits) {
                await deposit(signers[1], dai, parseUnits((getRandomArbitrary(500, 10000)).toString(), 18))
                await deposit(signers[2], usdc, parseUnits((getRandomArbitrary(500, 10000)).toString(), 6))
                await deposit(signers[3], usdt, parseUnits((getRandomArbitrary(500, 10000)).toString(), 6))
                i++;
            }
            i = 0;
            let numberOfWithdrawals = getRandomArbitrary(3, 4);

            while (i <= numberOfWithdrawals / 3) {
                await ibAlluoCurrent.connect(signers[1]).withdraw(usdt.address, parseEther((getRandomArbitrary(100, 500)).toString()))
                await ibAlluoCurrent.connect(signers[2]).withdraw(dai.address, parseEther((getRandomArbitrary(100, 500)).toString()))
                await ibAlluoCurrent.connect(signers[3]).withdraw(usdc.address, parseEther((getRandomArbitrary(100, 500)).toString()))
                i++;
            }
            //console.log("BIG deposit and withdrawal");
            await deposit(signers[0], dai, parseUnits("4000", 18))
            await ibAlluoCurrent.connect(signers[0]).withdraw(usdc.address, parseEther("4000"))
    
            while (i <= numberOfWithdrawals) {
                await ibAlluoCurrent.connect(signers[1]).withdraw(usdc.address, parseEther((getRandomArbitrary(100, 500)).toString()))
                await ibAlluoCurrent.connect(signers[2]).withdraw(usdt.address, parseEther((getRandomArbitrary(100, 500)).toString()))
                await ibAlluoCurrent.connect(signers[3]).withdraw(dai.address, parseEther((getRandomArbitrary(100, 500)).toString()))
                i++;
            }
    
            while (i <= numberOfDeposits) {
                await deposit(signers[1], dai, parseUnits((getRandomArbitrary(500, 10000)).toString(), 18))
                await deposit(signers[2], usdc, parseUnits((getRandomArbitrary(500, 10000)).toString(), 6))
                await deposit(signers[3], usdt, parseUnits((getRandomArbitrary(500, 10000)).toString(), 6))
                i++;
            }
    
            await buffer.satisfyWithdrawals();
    
            i = 0;
            while (i <= 2) {
                await deposit(signers[1], dai, parseUnits((getRandomArbitrary(500, 10000)).toString(), 18))
                await deposit(signers[2], usdc, parseUnits((getRandomArbitrary(500, 10000)).toString(), 6))
                await deposit(signers[3], usdt, parseUnits((getRandomArbitrary(500, 10000)).toString(), 6))
                i++;
            }
    
            await curveLp.connect(curveLpHolder).transfer(buffer.address, parseEther("5000"));
    
            i = 0;
            while (i <= 2) {
                await deposit(signers[1], dai, parseUnits((getRandomArbitrary(500, 10000)).toString(), 18))
                await deposit(signers[2], usdc, parseUnits((getRandomArbitrary(500, 10000)).toString(), 6))
                await deposit(signers[3], usdt, parseUnits((getRandomArbitrary(500, 10000)).toString(), 6))
                i++;
            }
        });
    
        it("Should check all core functions of buffer", async function () {
            
            await deposit(signers[1], dai, parseUnits("2000", 18));
            await deposit(signers[2], usdc, parseUnits("3000", 6));
            await deposit(signers[3], usdt, parseUnits("5000", 6));
    
            await ibAlluoCurrent.connect(signers[1]).withdraw(usdt.address, parseEther("150"))
            await ibAlluoCurrent.connect(signers[2]).withdraw(usdc.address, parseEther("150"))
            await ibAlluoCurrent.connect(signers[3]).withdraw(dai.address, parseEther("150"))
    
            await deposit(signers[1], dai, parseUnits("100", 18));
            await deposit(signers[2], usdc, parseUnits("100", 6));
            await deposit(signers[3], usdt, parseUnits("100", 6));
            
            await curveLp.connect(curveLpHolder).transfer(buffer.address, parseEther("300"));
    
            await deposit(signers[1], dai, parseUnits("1000", 18));
            await deposit(signers[2], usdc, parseUnits("1000", 6));
            await deposit(signers[3], usdt, parseUnits("1000", 6));
    
            await ibAlluoCurrent.connect(signers[1]).withdraw(usdt.address, parseEther("900"))
            await deposit(signers[2], usdc, parseUnits("100", 6));
            await deposit(signers[2], usdt, parseUnits("900", 6));
            await buffer.satisfyWithdrawals();
            await buffer.satisfyWithdrawals();
            await ibAlluoCurrent.connect(signers[1]).withdraw(usdt.address, parseEther("600"))
    
            await ibAlluoCurrent.connect(signers[1]).withdraw(dai.address, parseEther("100"))
            await ibAlluoCurrent.connect(signers[2]).withdraw(usdc.address, parseEther("100"))
            await ibAlluoCurrent.connect(signers[3]).withdraw(usdt.address, parseEther("100"))
            await buffer.satisfyWithdrawals();
            await deposit(signers[2], usdt, parseUnits("300", 6));
            await buffer.satisfyWithdrawals();
            
        });
    });

    describe('Token transfers and apy calculation', function () {
        it('Should return right user balance after one year even without claim', async function () {

            // address that will get minted tokens
            const recipient = signers[3];
            // amount of tokens to be minted, including decimals value of ibAlluoCurrent
            const amount = ethers.utils.parseUnits("100.0", await ibAlluoCurrent.decimals());

            await deposit(recipient, dai, amount);

            await skipDays(365);

            //view function that returns balance with APY
            let balance = await ibAlluoCurrent.getBalance(signers[3].address);
            //console.log(balance.toString());
            expect(balance).to.be.gt(parseUnits("115.9", await ibAlluoCurrent.decimals()));
            expect(balance).to.be.lt(parseUnits("116.1", await ibAlluoCurrent.decimals()));
        });
        
        it('Should not change growingRatio more than once a minute', async function () {

            // address that will get minted tokens
            const recipient = signers[3];
            // amount of tokens to be minted, including decimals value of ibAlluoCurrent
            const amount = ethers.utils.parseUnits("100.0", await ibAlluoCurrent.decimals());

            await deposit(recipient, dai, amount);

            await skipDays(365);

            let balance = await ibAlluoCurrent.getBalance(signers[3].address);

            ibAlluoCurrent.updateRatio();
            let oldDF = ibAlluoCurrent.growingRatio().toString;
            //Does not change DF again
            ibAlluoCurrent.updateRatio();
            let newDF = ibAlluoCurrent.growingRatio().toString;
            expect(oldDF).to.equal(newDF)
            balance = await ibAlluoCurrent.getBalance(signers[3].address);
            expect(balance).to.be.gt(parseUnits("115.9", await ibAlluoCurrent.decimals()));
            expect(balance).to.be.lt(parseUnits("116.1", await ibAlluoCurrent.decimals()));
        });

        it('getBalance should return zero if user dont have tokens', async function () {

            let balance = await ibAlluoCurrent.getBalance(signers[3].address);
            //console.log(balance.toString());
            expect(balance).to.equal(0);
        });

        it("Should check all transferAssetValue functions ", async function () {
            await deposit(signers[1], dai, parseUnits("1000", 18));
            await ibAlluoCurrent.connect(signers[1]).transfer(signers[2].address, parseEther("100"))
            await ibAlluoCurrent.connect(signers[1]).transfer(signers[3].address, parseEther("100"))
            await skipDays(365);
            await ibAlluoCurrent.connect(signers[2]).transferAssetValue(signers[1].address, parseEther("115.9"))

            await ibAlluoCurrent.connect(signers[3]).approveAssetValue(signers[2].address, parseEther("116"))
            await ibAlluoCurrent.connect(signers[2]).transferFromAssetValue(signers[3].address, signers[1].address, parseEther("115.9"))

            let tokenBalance = await ibAlluoCurrent.balanceOf(signers[1].address);
            expect(tokenBalance).to.be.gt(parseUnits("999", await ibAlluoCurrent.decimals()));
            expect(tokenBalance).to.be.lt(parseUnits("1000", await ibAlluoCurrent.decimals()));

            let valueBalance = await ibAlluoCurrent.getBalance(signers[1].address)
            expect(valueBalance).to.be.gt(parseUnits("1159", await ibAlluoCurrent.decimals()));
            expect(valueBalance).to.be.lt(parseUnits("1160", await ibAlluoCurrent.decimals()));
        });
        
        it('Should correctly calculate balances over time and various transfers', async function () {

            //changing interest
            let newAnnualInterest = 800;
            let newInterestPerSecond = BigNumber.from("100000000244041000");
                                                    
            let ABI = ["function setInterest(uint256 _newAnnualInterest, uint256 _newInterestPerSecond)"];
            let iface = new ethers.utils.Interface(ABI);
            let calldata = iface.encodeFunctionData("setInterest", [newAnnualInterest, newInterestPerSecond]);

            await multisig.executeCall(ibAlluoCurrent.address, calldata);

            const amount = ethers.utils.parseUnits("100.0", await ibAlluoCurrent.decimals());

            //big deposit to full buffer
            const largeAmount = ethers.utils.parseUnits("10000.0", await ibAlluoCurrent.decimals());
            await deposit(signers[9], dai, largeAmount);

            //start
            await deposit(signers[1], dai, amount);
            await skipDays(73);

            //after first period
            await deposit(signers[1], dai, amount);
            await deposit(signers[2], dai, amount);
            await skipDays(73);

            //after second period
            await deposit(signers[4], dai, amount);
            await deposit(signers[3], dai, amount);
            await skipDays(73);
          
            //after third period
            await deposit(signers[4], dai, amount);
            await skipDays(73);

            //after fourth period
            await ibAlluoCurrent.updateRatio();
            let balance = await ibAlluoCurrent.getBalance(signers[3].address);
            //console.log(balance.toString());
            
            expect(balance).to.be.gt(parseUnits("103.12", await ibAlluoCurrent.decimals()));
            expect(balance).to.be.lt(parseUnits("103.13", await ibAlluoCurrent.decimals()));
            await ibAlluoCurrent.connect(signers[3]).withdraw(dai.address, balance);

            //changing interest
            newAnnualInterest = 500;
            newInterestPerSecond = BigNumber.from("100000000154712595");
                                                      
            ABI = ["function setInterest(uint256 _newAnnualInterest, uint256 _newInterestPerSecond)"];
            iface = new ethers.utils.Interface(ABI);
            calldata = iface.encodeFunctionData("setInterest", [newAnnualInterest, newInterestPerSecond]);

            await multisig.executeCall(ibAlluoCurrent.address, calldata);

            await deposit(signers[4], dai, amount);
            await skipDays(73);

            //after fifth period
            balance = await ibAlluoCurrent.getBalance(signers[1].address);
            //console.log(balance.toString());
            expect(balance).to.be.gt(parseUnits("213.14", await ibAlluoCurrent.decimals()));
            expect(balance).to.be.lt(parseUnits("213.15", await ibAlluoCurrent.decimals()));
            await ibAlluoCurrent.connect(signers[1]).withdraw(dai.address,balance);

            balance = await ibAlluoCurrent.getBalance(signers[2].address);
            //console.log(balance.toString());
            expect(balance).to.be.gt(parseUnits("105.75", await ibAlluoCurrent.decimals()));
            expect(balance).to.be.lt(parseUnits("105.76", await ibAlluoCurrent.decimals()));
            await ibAlluoCurrent.connect(signers[2]).withdraw(dai.address,balance);

            balance = await ibAlluoCurrent.getBalanceForTransfer(signers[4].address);
            expect(balance).to.be.gt(parseUnits("307.66", await ibAlluoCurrent.decimals()));
            expect(balance).to.be.lt(parseUnits("307.67", await ibAlluoCurrent.decimals()));
            await ibAlluoCurrent.connect(signers[4]).withdraw(dai.address,balance);
        });
        it('Should not give rewards if the interest is zero', async function () {

            // address that will get minted tokens
            const recipient = signers[3];
            // amount of tokens to be minted, including decimals value of ibAlluoCurrent
            const amount = ethers.utils.parseUnits("100.0", await ibAlluoCurrent.decimals());

            await deposit(recipient, dai, amount);

            await skipDays(365);

            let balance = await ibAlluoCurrent.getBalance(signers[3].address);
            expect(balance).to.be.gt(parseUnits("115.9", await ibAlluoCurrent.decimals()));
            expect(balance).to.be.lt(parseUnits("116.1", await ibAlluoCurrent.decimals()));

            //changing interest
            const newAnnualInterest = 0;
            const newInterestPerSecond = BigNumber.from("100000000000000000");
                                                      
            let ABI = ["function setInterest(uint256 _newAnnualInterest, uint256 _newInterestPerSecond)"];
            let iface = new ethers.utils.Interface(ABI);
            const calldata = iface.encodeFunctionData("setInterest", [newAnnualInterest, newInterestPerSecond]);

            await multisig.executeCall(ibAlluoCurrent.address, calldata);

            await skipDays(365);

            //balance is the same
            let newBalance = await ibAlluoCurrent.getBalance(signers[3].address);
            expect(newBalance).to.be.lt(parseUnits("116.1", await ibAlluoCurrent.decimals()));
        });
    });

    describe('Token basic functionality', function () {
        describe("Tokenomics and Info", function () {
            it("Should return basic information", async function () {
                expect(await ibAlluoCurrent.name()).to.equal("Interest Bearing Alluo USD"),
                    expect(await ibAlluoCurrent.symbol()).to.equal("IbAlluoUSD"),
                    expect(await ibAlluoCurrent.decimals()).to.equal(18);
            });
            it("Should return the total supply equal to 0", async function () {
                expect(await ibAlluoCurrent.totalSupply()).to.equal(0);
            });
        });
        describe("Balances", function () {
            it('When the requested account has no tokens it returns zero', async function () {
                expect(await ibAlluoCurrent.balanceOf(signers[1].address)).to.equal("0");
            });

            it('When the requested account has some tokens it returns the amount', async function () {
                await deposit(signers[1], dai, parseEther('50'));
                expect(await ibAlluoCurrent.balanceOf(signers[1].address)).to.equal(parseEther('50'));
            });

        });
        describe("Transactions", function () {
            describe("Should fail when", function () {

                it('transfer to zero address', async function () {
                    await expect(ibAlluoCurrent.transfer(ethers.constants.AddressZero, parseEther('100'))
                    ).to.be.revertedWith("ERC20: transfer to the zero address");
                });

                it('sender doesn\'t have enough tokens', async function () {
                    await expect(ibAlluoCurrent.connect(signers[1]).transfer(signers[2].address, parseEther('100'))
                    ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
                });

                it('transfer amount exceeds allowance', async function () {
                    await expect(ibAlluoCurrent.transferFrom(signers[1].address, signers[2].address, parseEther('100'))
                    ).to.be.revertedWith("ERC20: insufficient allowance");
                });
            });
            describe("Should transfer when everything is correct", function () {
                it('from signer1 to signer2 with correct balances at the end', async function () {
                    await deposit(signers[1], dai, parseEther('50'));
                    await ibAlluoCurrent.connect(signers[1]).transfer(signers[2].address, parseEther('25'));
                    const addr1Balance = await ibAlluoCurrent.balanceOf(signers[1].address);
                    const addr2Balance = await ibAlluoCurrent.balanceOf(signers[2].address);
                    expect(addr1Balance).to.equal(parseEther('25'));
                    expect(addr2Balance).to.equal(parseEther('25'));
                });
            });

        });

        describe('Approve', function () {
            it("Approving and TransferFrom", async function () {
                await deposit(signers[1], dai, parseEther('100'));
                await ibAlluoCurrent.connect(signers[1]).approve(signers[2].address, parseEther('50'));
                expect(await ibAlluoCurrent.allowance(signers[1].address, signers[2].address)).to.equal(parseEther('50'));

                await ibAlluoCurrent.connect(signers[2]).transferFrom(signers[1].address, signers[2].address, parseEther("50"))
                let balance = await ibAlluoCurrent.balanceOf(signers[1].address);
                expect(balance).to.equal(parseEther('50'));
            });
            it("Not approving becouse of zero address", async function () {
                await expect(ibAlluoCurrent.approve(ethers.constants.AddressZero, parseEther('100'))
                ).to.be.revertedWith("ERC20: approve to the zero address");
            });

            it("increasing and decreasing allowance", async function () {
                await deposit(signers[1], dai, parseEther('100'));
                await ibAlluoCurrent.connect(signers[1]).increaseAllowance(signers[2].address, parseEther('50'));
                expect(await ibAlluoCurrent.allowance(signers[1].address, signers[2].address)).to.equal(parseEther('50'));

                await expect(
                    ibAlluoCurrent.connect(signers[2]).transferFrom(signers[1].address, signers[2].address, parseEther("60")))
                    .to.be.revertedWith("ERC20: insufficient allowance");
                await ibAlluoCurrent.connect(signers[1]).increaseAllowance(signers[2].address, parseEther('20'));
                await ibAlluoCurrent.connect(signers[1]).decreaseAllowance(signers[2].address, parseEther('10'));
                await ibAlluoCurrent.connect(signers[2]).transferFrom(signers[1].address, signers[2].address, parseEther("60"))
                await expect(
                    ibAlluoCurrent.connect(signers[1]).decreaseAllowance(signers[2].address, parseEther("50")))
                    .to.be.revertedWith("ERC20: decreased allowance below zero");

                let balance = await ibAlluoCurrent.balanceOf(signers[1].address);
                expect(balance).to.equal(parseEther('40'));
            });
        });
        describe('Mint / Burn', function () {
            it("burn fails because the amount exceeds the balance", async function () {
                await deposit(signers[1], dai, parseEther('100'));
                await expect(ibAlluoCurrent.connect(signers[1]).withdraw(dai.address,parseEther('200'))
                ).to.be.revertedWith("ERC20: burn amount exceeds balance");
            });
        });
    });

    describe('Admin and core functionality', function () {

    it("Should allow deposit", async function () {
        // address that will get minted tokens
        const recipient = signers[1];
        // amount of tokens to be minted, including decimals value of token
        const amount = ethers.utils.parseUnits("10.0", await ibAlluoCurrent.decimals());

        expect(await ibAlluoCurrent.balanceOf(recipient.address)).to.be.equal(0);

        await deposit(recipient, dai, amount);

        expect(await ibAlluoCurrent.balanceOf(recipient.address)).to.be.equal(amount);
    });

    it("Should allow user to burn tokens for withdrawal", async () => {
        const recipient = signers[1];
        const amount = ethers.utils.parseUnits("10.0", await ibAlluoCurrent.decimals());

        await deposit(recipient, dai, amount);

        await expect(ibAlluoCurrent.connect(recipient).withdraw(dai.address, amount))
            .to.emit(ibAlluoCurrent, "BurnedForWithdraw")
            .withArgs(recipient.address, amount);
    });

    it("Should grant role that can be granted only to contract", async () => {
        const role = await ibAlluoCurrent.DEFAULT_ADMIN_ROLE();
        const NewContract = await ethers.getContractFactory('PseudoMultisigWallet') as PseudoMultisigWallet__factory;
        const newContract = await NewContract.deploy(true);

        expect(await ibAlluoCurrent.hasRole(role, newContract.address)).to.be.false;

        let calldata = await prepareCallData("role", [role, newContract.address])

        await multisig.executeCall(ibAlluoCurrent.address, calldata);

        expect(await ibAlluoCurrent.hasRole(role, newContract.address)).to.be.true;
    });

    it("Should not grant role that can be granted only to contract", async () => {
        const role = await ibAlluoCurrent.DEFAULT_ADMIN_ROLE();
        const target = signers[1];

        expect(await ibAlluoCurrent.hasRole(role, target.address)).to.be.false;

        let calldata = await prepareCallData("role", [role, target.address])

        const tx = multisig.executeCall(ibAlluoCurrent.address, calldata);

        expect(tx).to.be.revertedWith("IbAlluo: Not contract");
    });

    it("Should grant role that can be granted to anyone", async () => {
        const role = await ibAlluoCurrent.UPGRADER_ROLE();
        const target = signers[1];

        expect(await ibAlluoCurrent.hasRole(role, target.address)).to.be.false;

 
        let calldata = await prepareCallData("role", [role, target.address])

        const tx = multisig.executeCall(ibAlluoCurrent.address, calldata);
    });

    it("Should set new interest", async () => {
        const newAnnualInterest = 800;
        const newInterestPerSecond = BigNumber.from("100000000154712595");
        const realNewInterestPerSecond = BigNumber.from("1000000001547125950000000000");
        
        const oldAnnualInterest = await ibAlluoCurrent.annualInterest();
        const oldInterestPerSecond = await ibAlluoCurrent.interestPerSecond();

        expect(newAnnualInterest).to.be.not.equal(oldAnnualInterest);
        expect(newInterestPerSecond).to.be.not.equal(oldInterestPerSecond);

        let ABI = ["function setInterest(uint256 _newAnnualInterest, uint256 _newInterestPerSecond)"];
        let iface = new ethers.utils.Interface(ABI);
        const calldata = iface.encodeFunctionData("setInterest", [newAnnualInterest, newInterestPerSecond]);

        await expect(multisig.executeCall(ibAlluoCurrent.address, calldata))
            .to.emit(ibAlluoCurrent, "InterestChanged")
            .withArgs(
                oldAnnualInterest, 
                newAnnualInterest, 
                oldInterestPerSecond, 
                realNewInterestPerSecond
            );
    });

    it("Should not set new interest (caller without DEFAULT_ADMIN_ROLE)", async () => {
        const newAnnualInterest = 1600;
        const newInterestPerSecond = BigNumber.from("100000000470636749");
        const role = await ibAlluoCurrent.DEFAULT_ADMIN_ROLE();
        const notAdmin = signers[1];

        await expect(ibAlluoCurrent.connect(notAdmin).setInterest(newAnnualInterest, newInterestPerSecond)).to.be
            .revertedWith(`AccessControl: account ${notAdmin.address.toLowerCase()} is missing role ${role}`);
    });

    it("Should pause all public/external user functions", async () => {
        const address1 = signers[1];
        const address2 = signers[2];
        const amount = ethers.utils.parseUnits("5.0", await ibAlluoCurrent.decimals());

        await deposit(address1, usdc, parseUnits("15.0", 6))

        expect(await ibAlluoCurrent.paused()).to.be.false;

        let ABI = ["function pause()"];
        let iface = new ethers.utils.Interface(ABI);
        const calldata = iface.encodeFunctionData("pause", []);

        await multisig.executeCall(ibAlluoCurrent.address, calldata);

        expect(await ibAlluoCurrent.paused()).to.be.true;
        
        await expect(ibAlluoCurrent.connect(address1).transfer(address1.address, amount)).to.be.revertedWith("Pausable: paused");
        await expect(ibAlluoCurrent.approve(address1.address, amount)).to.be.revertedWith("Pausable: paused");
        await expect(ibAlluoCurrent.transferFrom(address1.address, address2.address, amount)).to.be.revertedWith("Pausable: paused");
        await expect(ibAlluoCurrent.increaseAllowance(address1.address, amount)).to.be.revertedWith("Pausable: paused");
        await expect(ibAlluoCurrent.decreaseAllowance(address1.address, amount)).to.be.revertedWith("Pausable: paused");

        await expect(ibAlluoCurrent.updateRatio()).to.be.revertedWith("Pausable: paused");
        await expect(ibAlluoCurrent.connect(address1).withdraw(dai.address, amount)).to.be.revertedWith("Pausable: paused");
        await expect(deposit(address1, usdc, parseUnits("15.0", 6))).to.be.revertedWith("Pausable: paused");
    });

    it("Should unpause all public/external user functions", async () => {
        let ABI1 = ["function pause()"];
        let iface1 = new ethers.utils.Interface(ABI1);
        const calldata1 = iface1.encodeFunctionData("pause", []);

        await multisig.executeCall(ibAlluoCurrent.address, calldata1);

        let ABI2 = ["function unpause()"];
        let iface2 = new ethers.utils.Interface(ABI2);
        const calldata2 = iface2.encodeFunctionData("unpause", []);

        await multisig.executeCall(ibAlluoCurrent.address, calldata2);

        expect(await ibAlluoCurrent.paused()).to.be.false;
    });

    it("Should set new updateRatio time limit", async () => {
        const newLimit = 120;
        const oldLimit = await ibAlluoCurrent.updateTimeLimit();

        expect(newLimit).to.not.be.equal(oldLimit);

        let ABI = ["function setUpdateTimeLimit(uint256 _newLimit)"];
        let iface = new ethers.utils.Interface(ABI);
        const calldata = iface.encodeFunctionData("setUpdateTimeLimit", [newLimit]);

        await expect(multisig.executeCall(ibAlluoCurrent.address, calldata)).to.emit(ibAlluoCurrent, "UpdateTimeLimitSet").withArgs(oldLimit, newLimit);
    });

    it("Should not set new updateRatio time limit (caller without DEFAULT_ADMIN_ROLE)", async () => {
        const newLimit = 7200;
        const notAdmin = signers[1];
        const role = await ibAlluoCurrent.DEFAULT_ADMIN_ROLE();

        await expect(ibAlluoCurrent.connect(notAdmin).setUpdateTimeLimit(newLimit)).to.be
            .revertedWith(`AccessControl: account ${notAdmin.address.toLowerCase()} is missing role ${role}`);
    });

    it("Should set new wallet", async () => {
        const NewWallet = await ethers.getContractFactory('PseudoMultisigWallet') as PseudoMultisigWallet__factory;
        const newWallet = await NewWallet.deploy(true);
        const oldWallet = await ibAlluoCurrent.wallet();

        expect(newWallet.address).to.not.be.equal(oldWallet);

        let ABI = ["function setWallet(address newWallet)"];
        let iface = new ethers.utils.Interface(ABI);
        const calldata = iface.encodeFunctionData("setWallet", [newWallet.address]);

        await expect(multisig.executeCall(ibAlluoCurrent.address, calldata)).to.emit(ibAlluoCurrent, "NewWalletSet").withArgs(oldWallet, newWallet.address);
    });

    it("Should not set new wallet (attempt to make wallet an EOA)", async () => {
        const newWallet = signers[2]

        let ABI = ["function setWallet(address newWallet)"];
        let iface = new ethers.utils.Interface(ABI);
        const calldata = iface.encodeFunctionData("setWallet", [newWallet.address]);

        const tx = multisig.executeCall(ibAlluoCurrent.address, calldata);

        await expect(tx).to.be.revertedWith("IbAlluo: Not contract")
    })

    it("Should add new deposit token and allow to deposit with it", async () => {


        let ABI = ["function changeTokenStatus(address _token, bool _status)"];
        let iface = new ethers.utils.Interface(ABI);
        const calldata = iface.encodeFunctionData("changeTokenStatus", [usdt.address, true]);

        await multisig.executeCall(ibAlluoCurrent.address, calldata);

        const recipient = signers[1];

        const amount =  "135.3";
        let amountIn6 =  ethers.utils.parseUnits(amount, 6)

        await deposit(recipient, usdt, amountIn6 );

        expect(await ibAlluoCurrent.balanceOf(recipient.address)).to.equal(parseUnits(amount, await ibAlluoCurrent.decimals()));

    })

    });


    async function deposit(recipient: SignerWithAddress, token: IERC20, amount: BigNumberish) {
        await token.connect(whale).transfer(recipient.address, amount);

        await token.connect(recipient).approve(ibAlluoCurrent.address, amount);
        
        await ibAlluoCurrent.connect(recipient).deposit(token.address, amount);
    }
    
});
