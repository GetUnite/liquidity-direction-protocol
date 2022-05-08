import { parseEther, parseUnits } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, BigNumberish, BytesLike } from "ethers";
import { ethers, network, upgrades } from "hardhat";
import { before } from "mocha";
import { TestERC20, TestERC20__factory, LiquidityBufferUSDAdaptor, LiquidityBufferUSDAdaptor__factory, IERC20, PseudoMultisigWallet, PseudoMultisigWallet__factory , AlluoLpV3, AlluoLpV3__factory, LiquidityBufferVault, LiquidityBufferVault__factory, LiquidityBufferVaultForTests__factory, LiquidityBufferVaultForTests,  IbAlluo, IbAlluo__factory, IbAlluoV2, LiquidityBufferVaultV2, IbAlluoV2__factory, LiquidityBufferVaultV2__factory, IbAlluoUSD, LiquidityBufferVaultV3, USDAdaptor, IbAlluoUSD__factory, LiquidityBufferVaultV3__factory, USDAdaptor__factory, EURAdaptor, EURAdaptor__factory} from "../../typechain";

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


describe("IbAlluo and Buffer", function () {
    let signers: SignerWithAddress[];
    let whale: SignerWithAddress;
    let curveLpHolder: SignerWithAddress;

    let alluoLpV3: AlluoLpV3;
    let ibAlluoUSD: IbAlluoUSD;
    let ibAlluoEUR: IbAlluoUSD;

    let multisig: PseudoMultisigWallet;
    let buffer: LiquidityBufferVaultV3;

    let dai: IERC20, usdc: IERC20, usdt: IERC20;
    let curveLpUSD: IERC20;

    let jeur: IERC20,  eurt: IERC20, eurs: IERC20;
    let curveLpEUR: IERC20;

    let jeurwhale: SignerWithAddress;
    let eurswhale : SignerWithAddress;
    let eurtwhale: SignerWithAddress;

    let adaptorEUR: EURAdaptor;


    let adaptorUSD: USDAdaptor;

    before(async function () {

        //We are forking Polygon mainnet, please set Alchemy key in .env
        await network.provider.request({
            method: "hardhat_reset",
            params: [{
                forking: {
                    enabled: true,
                    jsonRpcUrl: process.env.POLYGON_FORKING_URL as string,
                    //you can fork from last block by commenting next line
                    // blockNumber: 26313740, 
                },
            },],
        });

        signers = await ethers.getSigners();
        const whaleAddress = "0x075e72a5eDf65F0A5f44699c7654C1a76941Ddc8";
        const curveLpHolderAddress = "0xa0f2e2f7b3ab58e3e52b74f08d94ae52778d46df";

        const jeurWhale = "0x2c1cb163a00733cf773b828a77ea347cb0fc91b4"
        const eursWhale = "0x1bee4f735062cd00841d6997964f187f5f5f5ac9"
        const eurtWhale = "0x0e57f58cc5eb3674c4738074362a3d9d82ca7648"
        await ethers.provider.send(
            'hardhat_impersonateAccount',
            [whaleAddress]
        );

        await ethers.provider.send(
            'hardhat_impersonateAccount',
            [curveLpHolderAddress]
        );


        await ethers.provider.send(
            'hardhat_impersonateAccount',
            [jeurWhale]
        );

        await ethers.provider.send(
            'hardhat_impersonateAccount',
            [eursWhale]
        );
        await ethers.provider.send(
            'hardhat_impersonateAccount',
            [eurtWhale]
        );

        
        whale = await ethers.getSigner(whaleAddress);
        curveLpHolder = await ethers.getSigner(curveLpHolderAddress);
        dai = await ethers.getContractAt("IERC20", "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063");
        usdc = await ethers.getContractAt("IERC20", "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174");
        usdt = await ethers.getContractAt("IERC20", "0xc2132D05D31c914a87C6611C10748AEb04B58e8F");
        curveLpUSD = await ethers.getContractAt("IERC20", "0x445FE580eF8d70FF569aB36e80c647af338db351");

        jeurwhale = await ethers.getSigner(jeurWhale);
        eurswhale = await ethers.getSigner(eursWhale);
        eurtwhale = await ethers.getSigner(eurtWhale);
        jeur = await ethers.getContractAt("IERC20", "0x4e3Decbb3645551B8A19f0eA1678079FCB33fB4c");
        eurt = await ethers.getContractAt("IERC20", "0x7BDF330f423Ea880FF95fC41A280fD5eCFD3D09f");
        eurs = await ethers.getContractAt("IERC20", "0xE111178A87A3BFf0c8d18DECBa5798827539Ae99");

        console.log("We are forking Polygon mainnet\n");
        expect(await dai.balanceOf(whale.address)).to.be.gt(0, "Whale has no DAI, or you are not forking Polygon");

        expect(await jeur.balanceOf(jeurwhale.address)).to.be.gt(0, "Whale has no jeur, or you are not forking Polygon");
        expect(await eurs.balanceOf(eurswhale.address)).to.be.gt(0, "Whale has no eurs, or you are not forking Polygon");
        expect(await eurt.balanceOf(eurtwhale.address)).to.be.gt(0, "Whale has no eurt, or you are not forking Polygon");
        await signers[0].sendTransaction({
            to: eurswhale.address,
            value: parseEther("100.0")
        });
        await signers[0].sendTransaction({
            to: jeurwhale.address,
            value: parseEther("100.0")
        });
        await signers[0].sendTransaction({
            to: eurtwhale.address,
            value: parseEther("100.0")
        });

        await signers[0].sendTransaction({
            to: whale.address,
            value: parseEther("100.0")
        });
    });


    beforeEach(async function () {
        const IbAlluo = await ethers.getContractFactory("IbAlluoUSD") as IbAlluoUSD__factory;
        //We are using this contract to simulate Gnosis multisig wallet
        const Multisig = await ethers.getContractFactory("PseudoMultisigWallet") as PseudoMultisigWallet__factory;
        //For tests we are using version of contract with hardhat console.log, to see all Txn
        //you can switch two next lines and turn off logs
        // const Buffer = await ethers.getContractFactory("LiquidityBufferVaultForTests") as LiquidityBufferVaultForTests__factory;
        const Buffer = await ethers.getContractFactory("LiquidityBufferVaultV3") as LiquidityBufferVaultV3__factory;
        const AdaptorUSD = await ethers.getContractFactory("USDAdaptor") as USDAdaptor__factory;
        const AdaptorEUR = await ethers.getContractFactory("EURAdaptor") as EURAdaptor__factory;


        multisig = await Multisig.deploy(true);

        await upgrades.silenceWarnings();
        buffer = await upgrades.deployProxy(Buffer,
            [multisig.address, multisig.address,],
            {initializer: 'initialize', kind:'uups',unsafeAllow: ['delegatecall']},
        ) as LiquidityBufferVaultV3;

        ibAlluoUSD = await upgrades.deployProxy(IbAlluo,
            [multisig.address,
            buffer.address,
            [dai.address,
            usdc.address,
            usdt.address]],
            {initializer: 'initialize', kind:'uups'}
        ) as IbAlluoUSD;

        ibAlluoEUR = await upgrades.deployProxy(IbAlluo,
            [multisig.address,
            buffer.address,
            [jeur.address,
            eurt.address,
            eurs.address]],
            {initializer: 'initialize', kind:'uups'}
        ) as IbAlluoUSD;
        
        adaptorUSD = await AdaptorUSD.deploy(multisig.address, buffer.address);
        adaptorEUR = await AdaptorEUR.deploy(multisig.address, buffer.address);

        // Necessary info for adaptor:
        // multisig.address, curvePool, dai.address, usdc.address, usdt.address
        let ABI;
        let iface;
        let calldata;

        expect(await ibAlluoUSD.liquidityBuffer()).equal(buffer.address);
        await ibAlluoUSD.migrateStep2();


        expect(await ibAlluoEUR.liquidityBuffer()).equal(buffer.address);
        await ibAlluoEUR.migrateStep2();


        // 
        ABI = ["function registerAdapter(string calldata _name, address _AdapterAddress, uint256 _percentage, bool _status, address _ibAlluo, uint256 _AdapterId)"];
        iface = new ethers.utils.Interface(ABI);
        calldata = iface.encodeFunctionData("registerAdapter", ["CurvePool", adaptorUSD.address, 0, true, ibAlluoUSD.address, 1]);
        await multisig.executeCall(buffer.address, calldata);


        ABI = ["function setSlippage ( uint32 _newSlippage )"];
        iface = new ethers.utils.Interface(ABI);
        calldata = iface.encodeFunctionData("setSlippage", [300] );
        await multisig.executeCall(adaptorUSD.address, calldata);

        ABI = ["function registerAdapter(string calldata _name, address _AdapterAddress, uint256 _percentage, bool _status, address _ibAlluo, uint256 _AdapterId)"];
        iface = new ethers.utils.Interface(ABI);
        calldata = iface.encodeFunctionData("registerAdapter", ["CurvePool", adaptorEUR.address, 0, true, ibAlluoEUR.address, 2]);
        await multisig.executeCall(buffer.address, calldata);


        ABI = ["function setSlippage ( uint32 _newSlippage )"];
        iface = new ethers.utils.Interface(ABI);
        calldata = iface.encodeFunctionData("setSlippage", [300] );
        await multisig.executeCall(adaptorEUR.address, calldata);

        // 

        ABI = [" function setIbAlluoArray(address[] calldata _ibAlluoArray)"];
        iface = new ethers.utils.Interface(ABI);
        calldata = iface.encodeFunctionData("setIbAlluoArray", [[ibAlluoUSD.address, ibAlluoEUR.address]] );
        await multisig.executeCall(buffer.address, calldata);

        let tokenArrayUSD = [dai.address, usdc.address, usdt.address];
        let tokenArrayEUR = [jeur.address, eurt.address, eurs.address];

        ABI = ["function setIbAlluoMappings(address _ibAlluo, address[] calldata _inputTokens, uint256 _AdaptorId )"];
        iface = new ethers.utils.Interface(ABI);
        calldata = iface.encodeFunctionData("setIbAlluoMappings", [ibAlluoUSD.address, tokenArrayUSD, 1] );
        await multisig.executeCall(buffer.address, calldata);
        calldata = iface.encodeFunctionData("setIbAlluoMappings", [ibAlluoEUR.address, tokenArrayEUR, 2] );
        await multisig.executeCall(buffer.address, calldata);

        

        ABI = ["function grantIbAlluoPermissions(address _ibAlluo)"];
        iface = new ethers.utils.Interface(ABI);
        calldata = iface.encodeFunctionData("grantIbAlluoPermissions", [ibAlluoUSD.address] );
        await multisig.executeCall(buffer.address, calldata);
        calldata = iface.encodeFunctionData("grantIbAlluoPermissions", [ibAlluoEUR.address] );
        await multisig.executeCall(buffer.address, calldata);


        tokenArrayUSD.forEach( async token => {
            ABI = ["function setTokenToAdapter (address _token, uint256 _AdapterId)"];
            iface = new ethers.utils.Interface(ABI);
            calldata = iface.encodeFunctionData("setTokenToAdapter", [token, 1] );
            await multisig.executeCall(buffer.address, calldata);
        })

        await adaptorUSD.AdaptorApproveAll();

        tokenArrayEUR.forEach( async token => {
            ABI = ["function setTokenToAdapter (address _token, uint256 _AdapterId)"];
            iface = new ethers.utils.Interface(ABI);
            calldata = iface.encodeFunctionData("setTokenToAdapter", [token, 2] );
            await multisig.executeCall(buffer.address, calldata);
        })

        await adaptorEUR.AdaptorApproveAll();

    });

    
    describe('USD and EUR Adaptor with IbAlluoV2: Test cases', function () {
        it("Depositing 100 jeur and immediately attempting to withdraw 50 should put you in the waiting list", async function () {
            await deposit(signers[0], jeur, parseEther("100"));
            await ibAlluoEUR.connect(signers[0]).withdraw(jeur.address, parseEther("50"));
            let withdrawalArray = await buffer.ibAlluoLastWithdrawalCheck(ibAlluoEUR.address)
            expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);
        })
        it("Depositing 100 jeur, attempt to withdraw 50 and then only get paid after there is a deposit", async function () {
            await deposit(signers[0], jeur, parseEther("100"));
            await ibAlluoEUR.connect(signers[0]).withdraw(jeur.address, parseEther("50"));
            let withdrawalArray = await buffer.ibAlluoLastWithdrawalCheck(ibAlluoEUR.address)
            expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);
            
            await deposit(signers[1], jeur, parseEther("100"));
            await buffer.satisfyWithdrawals(ibAlluoEUR.address);
            // Loss from slippage makes tests awkward.

            expect(Number(await jeur.balanceOf(signers[0].address))).greaterThanOrEqual(Number(parseUnits("49", 18)))
        })

        it("Depositing 100 eurt and immediately attempting to withdraw 50 should put you in the waiting list", async function () {
            await deposit(signers[0], eurt, parseUnits("100", 6));
            await ibAlluoEUR.connect(signers[0]).withdraw(eurt.address, parseUnits("100", 18));
            let withdrawalArray = await buffer.ibAlluoLastWithdrawalCheck(ibAlluoEUR.address)
            expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);
        })
        it("Depositing 100 eurt, attempt to withdraw 50 and then only get paid after there is a deposit", async function () {
            await deposit(signers[0], eurt, parseUnits("100", 6));
            await ibAlluoEUR.connect(signers[0]).withdraw(eurt.address, parseUnits("50", 18));
            let withdrawalArray = await buffer.ibAlluoLastWithdrawalCheck(ibAlluoEUR.address)
            expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);
            
            await deposit(signers[1], eurt, parseUnits("100", 6));
            await buffer.satisfyWithdrawals(ibAlluoEUR.address);
            expect(Number(await eurt.balanceOf(signers[0].address))).greaterThanOrEqual(Number(parseUnits("49", 6)))
        })

        it("Depositing 100 eurs and immediately attempting to withdraw 50 should put you in the waiting list", async function () {
            await deposit(signers[0], eurs, parseUnits("100", 2));
            await ibAlluoEUR.connect(signers[0]).withdraw(eurs.address, parseUnits("50", 18));
            let withdrawalArray = await buffer.ibAlluoLastWithdrawalCheck(ibAlluoEUR.address)
            expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);
        })
        it("Depositing 100 eurs, attempt to withdraw 50 and then only get paid after there is a deposit", async function () {
            await deposit(signers[0], eurs, parseUnits("100", 2));
            await ibAlluoEUR.connect(signers[0]).withdraw(eurs.address, parseUnits("50", 18));
            let withdrawalArray = await buffer.ibAlluoLastWithdrawalCheck(ibAlluoEUR.address)
            expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);
            
            await deposit(signers[1], eurs, parseUnits("100", 2));
            await buffer.satisfyWithdrawals(ibAlluoEUR.address);
            expect(Number(await eurs.balanceOf(signers[0].address))).greaterThanOrEqual(Number(parseUnits("49", 2)))
        })

        it("The balance of the multisig wallet should increase with deposits.", async function () {
                let walletBalance = await eurt.balanceOf(multisig.address);

                await deposit(signers[0], jeur, parseEther("100"));
                expect(Number(await eurt.balanceOf(multisig.address))).greaterThan(Number(walletBalance))
                walletBalance = await eurt.balanceOf(multisig.address);


                await deposit(signers[0], eurt, parseUnits("100", 6));
                expect(Number(await eurt.balanceOf(multisig.address))).greaterThan(Number(walletBalance))
                walletBalance = await eurt.balanceOf(multisig.address);

                await deposit(signers[0], eurs, parseUnits("100", 2));
                expect(Number(await eurt.balanceOf(multisig.address))).greaterThan(Number(walletBalance))
                walletBalance = await eurt.balanceOf(multisig.address);

                await deposit(signers[0], jeur, parseEther("100"));
                expect(Number(await eurt.balanceOf(multisig.address))).greaterThan(Number(walletBalance))
                walletBalance = await eurt.balanceOf(multisig.address);


                await deposit(signers[0], eurt, parseUnits("100", 6));
                expect(Number(await eurt.balanceOf(multisig.address))).greaterThan(Number(walletBalance))
                walletBalance = await eurt.balanceOf(multisig.address);

                await deposit(signers[0], eurs, parseUnits("100", 2));
                expect(Number(await eurt.balanceOf(multisig.address))).greaterThan(Number(walletBalance))
                walletBalance = await eurt.balanceOf(multisig.address);

                await deposit(signers[0], jeur, parseEther("100"));
                expect(Number(await eurt.balanceOf(multisig.address))).greaterThan(Number(walletBalance))
                walletBalance = await eurt.balanceOf(multisig.address);


                await deposit(signers[0], eurt, parseUnits("100", 6));
                expect(Number(await eurt.balanceOf(multisig.address))).greaterThan(Number(walletBalance))
                walletBalance = await eurt.balanceOf(multisig.address);

                await deposit(signers[0], eurs, parseUnits("100", 2));
                expect(Number(await eurt.balanceOf(multisig.address))).greaterThan(Number(walletBalance))
                walletBalance = await eurt.balanceOf(multisig.address);

                console.log("Final multisig balance:", walletBalance);
    
            })
        it("Attemping to withdraw more than allowed causes revert.", async function () {
            let walletBalance = await eurt.balanceOf(multisig.address);
            await deposit(signers[1], eurt, parseUnits("100", 6));
            expect(Number(await eurt.balanceOf(multisig.address))).greaterThan(Number(walletBalance))
            await expect(ibAlluoEUR.connect(signers[1]).withdraw(eurt.address, parseUnits("500", 18))).to.be.revertedWith('ERC20: burn amount exceeds balance')
            })

            
    })
    describe('Mass deposits and withdrawal test cases', function () {
        it("Multiple deposits and withdrawals: Eventually, all withdrawers should be paid", async function () {
            let walletBalance = await eurt.balanceOf(multisig.address);

            await deposit(signers[0], jeur, parseEther("100"));
            expect(Number(await eurt.balanceOf(multisig.address))).greaterThan(Number(walletBalance))
            walletBalance = await eurt.balanceOf(multisig.address);


            await deposit(signers[1], eurt, parseUnits("100", 6));
            expect(Number(await eurt.balanceOf(multisig.address))).greaterThan(Number(walletBalance))
            walletBalance = await eurt.balanceOf(multisig.address);

            await deposit(signers[2], eurs, parseUnits("100", 2));
            expect(Number(await eurt.balanceOf(multisig.address))).greaterThan(Number(walletBalance))
            walletBalance = await eurt.balanceOf(multisig.address);

            await ibAlluoEUR.connect(signers[0]).withdraw(jeur.address, parseEther("50"));
            let withdrawalArray = await buffer.ibAlluoLastWithdrawalCheck(ibAlluoEUR.address)
            expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);
            await ibAlluoEUR.connect(signers[1]).withdraw(eurt.address, parseUnits("50", 18));
            withdrawalArray = await buffer.ibAlluoLastWithdrawalCheck(ibAlluoEUR.address)
            expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);
            await ibAlluoEUR.connect(signers[2]).withdraw(eurs.address,parseUnits("50", 18));
            withdrawalArray = await buffer.ibAlluoLastWithdrawalCheck(ibAlluoEUR.address)
            expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);

            // When there are deposits, should pay everyone back.
            await deposit(signers[2], eurs, parseUnits("1000", 2));
            await buffer.satisfyWithdrawals(ibAlluoEUR.address);
            expect(Number(await eurt.balanceOf(multisig.address))).greaterThan(Number(walletBalance))

            expect(Number(await jeur.balanceOf(signers[0].address))).greaterThanOrEqual(Number(parseUnits("49", 18)))
            expect(Number(await eurt.balanceOf(signers[1].address))).greaterThanOrEqual(Number(parseUnits("49", 6)))
            expect(Number(await eurs.balanceOf(signers[2].address))).greaterThanOrEqual(Number(parseUnits("49", 2)))



            })


        it("Depositing 100 DAI and immediately attempting to withdraw 50 should put you in the waiting list", async function () {
            await deposit(signers[0], dai, parseEther("100"));
            await ibAlluoUSD.connect(signers[0]).withdraw(dai.address, parseEther("50"));
            let withdrawalArray = await buffer.ibAlluoLastWithdrawalCheck(ibAlluoUSD.address)
            expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);
        })
        it("Depositing 100 DAI, attempt to withdraw 50 and then only get paid after there is a deposit", async function () {
            await deposit(signers[0], dai, parseEther("100"));
            await ibAlluoUSD.connect(signers[0]).withdraw(dai.address, parseEther("50"));
            let withdrawalArray = await buffer.ibAlluoLastWithdrawalCheck(ibAlluoUSD.address)
            expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);

            await deposit(signers[1], dai, parseEther("100"));
            await buffer.satisfyWithdrawals(ibAlluoUSD.address);
            expect(await dai.balanceOf(signers[0].address)).equal(parseEther("50"))
        })

        it("Depositing 100 USDC and immediately attempting to withdraw 50 should put you in the waiting list", async function () {
            await deposit(signers[0], usdc, parseUnits("100", 6));
            await ibAlluoUSD.connect(signers[0]).withdraw(usdc.address, parseUnits("100", 18));
            let withdrawalArray = await buffer.ibAlluoLastWithdrawalCheck(ibAlluoUSD.address)
            expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);
        })

        
        it("Depositing surplus USDC should not revert (Checking USD Adaptor Deposit function: Check toSend", async function () {
            await deposit(signers[0], usdc, parseUnits("100", 6));
            await deposit(signers[0], usdc, parseUnits("100", 6));
            await deposit(signers[0], usdc, parseUnits("100", 6));
            await deposit(signers[0], usdc, parseUnits("100", 6))
        })

        it("Depositing USDC when there is outstanding withdrawals (leaveInPool>0, toSend =0) should not revert (Checking USD Adaptor Deposit function: Check leaveInPool", async function () {
            await deposit(signers[0], usdc, parseUnits("10000", 6));
            await ibAlluoUSD.connect(signers[0]).withdraw(usdc.address, parseUnits("10000", 18));

            await deposit(signers[0], usdc, parseUnits("100", 6));

        })


        it("Depositing 100 USDC, attempt to withdraw 50 and then only get paid after there is a deposit", async function () {
            await deposit(signers[0], usdc, parseUnits("100", 6));
            await ibAlluoUSD.connect(signers[0]).withdraw(usdc.address, parseUnits("50", 18));
            let withdrawalArray = await buffer.ibAlluoLastWithdrawalCheck(ibAlluoUSD.address)
            expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);
            
            await deposit(signers[1], usdc, parseUnits("100", 6));
            await buffer.satisfyWithdrawals(ibAlluoUSD.address);
            expect(Number(await usdc.balanceOf(signers[0].address))).greaterThanOrEqual(Number(parseUnits("49", 6)))
        })

        it("Depositing 100 USDT and immediately attempting to withdraw 50 should put you in the waiting list", async function () {
            await deposit(signers[0], usdt, parseUnits("100", 6));
            await ibAlluoUSD.connect(signers[0]).withdraw(usdt.address, parseUnits("50", 18));
            let withdrawalArray = await buffer.ibAlluoLastWithdrawalCheck(ibAlluoUSD.address)
            expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);
        })
        it("Depositing 100 USDT, attempt to withdraw 50 and then only get paid after there is a deposit", async function () {
            await deposit(signers[0], usdt, parseUnits("100", 6));
            await ibAlluoUSD.connect(signers[0]).withdraw(usdt.address, parseUnits("50", 18));
            let withdrawalArray = await buffer.ibAlluoLastWithdrawalCheck(ibAlluoUSD.address)
            expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);
            
            await deposit(signers[1], usdt, parseUnits("100", 6));
            await buffer.satisfyWithdrawals(ibAlluoUSD.address);

            expect(Number(await usdt.balanceOf(signers[0].address))).greaterThanOrEqual(Number(parseUnits("49", 6)))
        })

        it("The balance of the multisig wallet should increase with deposits.", async function () {
                let walletBalance = await usdc.balanceOf(multisig.address);

                await deposit(signers[0], dai, parseEther("100"));
                expect(Number(await usdc.balanceOf(multisig.address))).greaterThan(Number(walletBalance))
                walletBalance = await usdc.balanceOf(multisig.address);


                await deposit(signers[0], usdc, parseUnits("100", 6));
                expect(Number(await usdc.balanceOf(multisig.address))).greaterThan(Number(walletBalance))
                walletBalance = await usdc.balanceOf(multisig.address);

                await deposit(signers[0], usdt, parseUnits("100", 6));
                expect(Number(await usdc.balanceOf(multisig.address))).greaterThan(Number(walletBalance))
                walletBalance = await usdc.balanceOf(multisig.address);

                await deposit(signers[0], dai, parseEther("100"));
                expect(Number(await usdc.balanceOf(multisig.address))).greaterThan(Number(walletBalance))
                walletBalance = await usdc.balanceOf(multisig.address);


                await deposit(signers[0], usdc, parseUnits("100", 6));
                expect(Number(await usdc.balanceOf(multisig.address))).greaterThan(Number(walletBalance))
                walletBalance = await usdc.balanceOf(multisig.address);

                await deposit(signers[0], usdt, parseUnits("100", 6));
                expect(Number(await usdc.balanceOf(multisig.address))).greaterThan(Number(walletBalance))
                walletBalance = await usdc.balanceOf(multisig.address);

                await deposit(signers[0], dai, parseEther("100"));
                expect(Number(await usdc.balanceOf(multisig.address))).greaterThan(Number(walletBalance))
                walletBalance = await usdc.balanceOf(multisig.address);


                await deposit(signers[0], usdc, parseUnits("100", 6));
                expect(Number(await usdc.balanceOf(multisig.address))).greaterThan(Number(walletBalance))
                walletBalance = await usdc.balanceOf(multisig.address);

                await deposit(signers[0], usdt, parseUnits("100", 6));
                expect(Number(await usdc.balanceOf(multisig.address))).greaterThan(Number(walletBalance))
                walletBalance = await usdc.balanceOf(multisig.address);

                console.log("Final multisig balance:", walletBalance);
    
            })
        it("Attemping to withdraw more than allowed causes revert.", async function () {
            let walletBalance = await usdc.balanceOf(multisig.address);
            await deposit(signers[1], usdc, parseUnits("100", 6));
            expect(Number(await usdc.balanceOf(multisig.address))).greaterThan(Number(walletBalance))
            await expect(ibAlluoUSD.connect(signers[1]).withdraw(usdc.address, parseUnits("500", 18))).to.be.revertedWith('ERC20: burn amount exceeds balance')
            })

            
    })

    
    describe('Mass deposits and withdrawal test cases', function () {
        it("Multiple deposits and withdrawals: Eventually, all withdrawers should be paid", async function () {
            let walletBalance = await usdc.balanceOf(multisig.address);

            await deposit(signers[0], dai, parseEther("100"));
            expect(Number(await usdc.balanceOf(multisig.address))).greaterThan(Number(walletBalance))
            walletBalance = await usdc.balanceOf(multisig.address);


            await deposit(signers[1], usdc, parseUnits("100", 6));
            expect(Number(await usdc.balanceOf(multisig.address))).greaterThan(Number(walletBalance))
            walletBalance = await usdc.balanceOf(multisig.address);


            await deposit(signers[2], usdt, parseUnits("100", 6));
            expect(Number(await usdc.balanceOf(multisig.address))).greaterThan(Number(walletBalance))
            walletBalance = await usdc.balanceOf(multisig.address);


            await ibAlluoUSD.connect(signers[0]).withdraw(dai.address, parseEther("50"));
            let withdrawalArray = await buffer.ibAlluoLastWithdrawalCheck(ibAlluoUSD.address)
            expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);

            await ibAlluoUSD.connect(signers[1]).withdraw(usdc.address, parseUnits("50", 18));
            withdrawalArray = await buffer.ibAlluoLastWithdrawalCheck(ibAlluoUSD.address)
            expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);



            await ibAlluoUSD.connect(signers[2]).withdraw(usdt.address,parseUnits("50", 18));
            withdrawalArray = await buffer.ibAlluoLastWithdrawalCheck(ibAlluoUSD.address)
            expect(withdrawalArray[0]).not.equal(withdrawalArray[1]);    


            // When there are deposits, should pay everyone back.
            await deposit(signers[2], usdt, parseUnits("1000", 6));
            await buffer.satisfyWithdrawals(ibAlluoUSD.address);
 

            expect(Number(await dai.balanceOf(signers[0].address))).greaterThanOrEqual(Number(parseUnits("49", 18)))
            expect(Number(await usdc.balanceOf(signers[1].address))).greaterThanOrEqual(Number(parseUnits("49", 6)))
            expect(Number(await usdt.balanceOf(signers[2].address))).greaterThanOrEqual(Number(parseUnits("49", 6)))



            })
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
                        await ibAlluoUSD.connect(signers[1]).withdraw(usdt.address, parseUnits((getRandomArbitrary(100, 500)).toString(), 18))
                        await ibAlluoUSD.connect(signers[2]).withdraw(dai.address,  parseUnits((getRandomArbitrary(100, 500)).toString(), 18))
                        await ibAlluoUSD.connect(signers[3]).withdraw(usdc.address,  parseUnits((getRandomArbitrary(100, 500)).toString(), 18))
                        i++;
                    }
                    
                    await deposit(signers[0], dai, parseUnits("4000", 18))
        
                    await ibAlluoUSD.connect(signers[0]).withdraw(usdc.address, parseUnits("4000", 18))
            
                    while (i <= numberOfWithdrawals) {
                        await ibAlluoUSD.connect(signers[1]).withdraw(usdc.address, parseUnits((getRandomArbitrary(100, 500)).toString(), 18))
                        await ibAlluoUSD.connect(signers[2]).withdraw(usdt.address, parseUnits((getRandomArbitrary(100, 500)).toString(), 18))
                        await ibAlluoUSD.connect(signers[3]).withdraw(dai.address,  parseUnits((getRandomArbitrary(100, 500)).toString(), 18))
                        i++;
                    }
            
                    while (i <= numberOfDeposits) {
                        await deposit(signers[1], dai, parseUnits((getRandomArbitrary(500, 10000)).toString(), 18))
                        await deposit(signers[2], usdc, parseUnits((getRandomArbitrary(500, 10000)).toString(), 6))
                        await deposit(signers[3], usdt, parseUnits((getRandomArbitrary(500, 10000)).toString(), 6))
                        i++;
                    }
            
                    await buffer.satisfyWithdrawals(ibAlluoUSD.address);
            
                    i = 0;
                    while (i <= 2) {
                        await deposit(signers[1], dai, parseUnits((getRandomArbitrary(500, 10000)).toString(), 18))
                        await deposit(signers[2], usdc, parseUnits((getRandomArbitrary(500, 10000)).toString(), 6))
                        await deposit(signers[3], usdt, parseUnits((getRandomArbitrary(500, 10000)).toString(), 6))
                        i++;
                    }
            
            
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
        
                    await ibAlluoUSD.connect(signers[1]).withdraw(usdt.address,  parseUnits("150", 18))
                    await ibAlluoUSD.connect(signers[2]).withdraw(usdc.address, parseUnits("150", 18))
                    await ibAlluoUSD.connect(signers[3]).withdraw(dai.address, parseEther("150"))
        
        
                    await deposit(signers[1], dai, parseUnits("100", 18));
                    await deposit(signers[2], usdc, parseUnits("100", 6));
                    await deposit(signers[3], usdt, parseUnits("100", 6));
        
        
                    await deposit(signers[1], dai, parseUnits("1000", 18));
                    await deposit(signers[2], usdc, parseUnits("1000", 6));
                    await deposit(signers[3], usdt, parseUnits("1000", 6));
        
                    await ibAlluoUSD.connect(signers[1]).withdraw(usdt.address, parseUnits("900", 18))
                    await deposit(signers[2], usdc, parseUnits("100", 6));
                    await deposit(signers[2], usdt, parseUnits("900", 6));
                    await buffer.satisfyWithdrawals(ibAlluoUSD.address);
                    await buffer.satisfyWithdrawals(ibAlluoUSD.address);
                    await ibAlluoUSD.connect(signers[1]).withdraw(usdt.address, parseUnits("600", 18))
            
                    await ibAlluoUSD.connect(signers[1]).withdraw(dai.address, parseEther("100"))
                    await ibAlluoUSD.connect(signers[2]).withdraw(usdc.address, parseUnits("100", 18))
                    await ibAlluoUSD.connect(signers[3]).withdraw(usdt.address, parseUnits("100", 18))
                    await buffer.satisfyWithdrawals(ibAlluoUSD.address);
                    await deposit(signers[2], usdt, parseUnits("300", 6));
                    await buffer.satisfyWithdrawals(ibAlluoUSD.address);
                    
                });
            });
        
            describe('Token transfers and apy calculation', function () {
                it('Should return right user balance after one year even without claim', async function () {
        
                    // address that will get minted tokens
                    const recipient = signers[3];
                    // amount of tokens to be minted, including decimals value of ibAlluoUSD
                    const amount = ethers.utils.parseUnits("100.0", await ibAlluoUSD.decimals());
        
                    await deposit(recipient, dai, amount);
        
                    await skipDays(365);
        
                    //view function that returns balance with APY
                    let balance = await ibAlluoUSD.getBalance(signers[3].address);
                    //console.log(balance.toString());
                    expect(balance).to.be.gt(parseUnits("107.9", await ibAlluoUSD.decimals()));
                    expect(balance).to.be.lt(parseUnits("108.1", await ibAlluoUSD.decimals()));
                });
                
                it('Should not change growingRatio more than once a minute', async function () {
        
                    // address that will get minted tokens
                    const recipient = signers[3];
                    // amount of tokens to be minted, including decimals value of ibAlluoUSD
                    const amount = ethers.utils.parseUnits("100.0", await ibAlluoUSD.decimals());
        
                    await deposit(recipient, dai, amount);
        
                    await skipDays(365);
        
                    let balance = await ibAlluoUSD.getBalance(signers[3].address);
        
                    ibAlluoUSD.updateRatio();
                    let oldDF = ibAlluoUSD.growingRatio().toString;
                    //Does not change DF again
                    ibAlluoUSD.updateRatio();
                    let newDF = ibAlluoUSD.growingRatio().toString;
                    expect(oldDF).to.equal(newDF)
                    balance = await ibAlluoUSD.getBalance(signers[3].address);
                    expect(balance).to.be.gt(parseUnits("107.9", await ibAlluoUSD.decimals()));
                    expect(balance).to.be.lt(parseUnits("108.1", await ibAlluoUSD.decimals()));
                });
        
                it('getBalance should return zero if user dont have tokens', async function () {
        
                    let balance = await ibAlluoUSD.getBalance(signers[3].address);
                    //console.log(balance.toString());
                    expect(balance).to.equal(0);
                });
        
                it("Should check all transferAssetValue functions ", async function () {
                    await deposit(signers[1], dai, parseUnits("1000", 18));
                    await ibAlluoUSD.connect(signers[1]).transfer(signers[2].address, parseEther("100"))
                    await ibAlluoUSD.connect(signers[1]).transfer(signers[3].address, parseEther("100"))
                    await skipDays(365);
                    await ibAlluoUSD.connect(signers[2]).transferAssetValue(signers[1].address, parseEther("107.9"))
        
                    await ibAlluoUSD.connect(signers[3]).approveAssetValue(signers[2].address, parseEther("108"))
                    await ibAlluoUSD.connect(signers[2]).transferFromAssetValue(signers[3].address, signers[1].address, parseEther("107.9"))
        
                    let tokenBalance = await ibAlluoUSD.balanceOf(signers[1].address);
                    expect(tokenBalance).to.be.gt(parseUnits("999", await ibAlluoUSD.decimals()));
                    expect(tokenBalance).to.be.lt(parseUnits("1000", await ibAlluoUSD.decimals()));
        
                    let valueBalance = await ibAlluoUSD.getBalance(signers[1].address)
                    expect(valueBalance).to.be.gt(parseUnits("1079", await ibAlluoUSD.decimals()));
                    expect(valueBalance).to.be.lt(parseUnits("1080", await ibAlluoUSD.decimals()));
                });
                
                it('Should correctly calculate balances over time and various transfers', async function () {
        
                    const amount = ethers.utils.parseUnits("100.0", await ibAlluoUSD.decimals());
        
                    //big deposit to full buffer
                    const largeAmount = ethers.utils.parseUnits("10000.0", await ibAlluoUSD.decimals());
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
                    await ibAlluoUSD.updateRatio();
                    let balance = await ibAlluoUSD.getBalance(signers[3].address);
                    //console.log(balance.toString());
                    
                    expect(balance).to.be.gt(parseUnits("103.12", await ibAlluoUSD.decimals()));
                    expect(balance).to.be.lt(parseUnits("103.13", await ibAlluoUSD.decimals()));
                    await ibAlluoUSD.connect(signers[3]).withdraw(dai.address, balance);
        
                    //changing interest
                    const newAnnualInterest = 500;
                    const newInterestPerSecond = parseUnits("100000000154712595", 0);
                                                              
                    let ABI = ["function setInterest(uint256 _newAnnualInterest, uint256 _newInterestPerSecond)"];
                    let iface = new ethers.utils.Interface(ABI);
                    const calldata = iface.encodeFunctionData("setInterest", [newAnnualInterest, newInterestPerSecond]);
        
                    await multisig.executeCall(ibAlluoUSD.address, calldata);
        
                    await deposit(signers[4], dai, amount);
                    await skipDays(73);
        
                    //after fifth period
                    balance = await ibAlluoUSD.getBalance(signers[1].address);
                    //console.log(balance.toString());
                    expect(balance).to.be.gt(parseUnits("213.14", await ibAlluoUSD.decimals()));
                    expect(balance).to.be.lt(parseUnits("213.15", await ibAlluoUSD.decimals()));
                    await ibAlluoUSD.connect(signers[1]).withdraw(dai.address,balance);
        
                    balance = await ibAlluoUSD.getBalance(signers[2].address);
                    //console.log(balance.toString());
                    expect(balance).to.be.gt(parseUnits("105.75", await ibAlluoUSD.decimals()));
                    expect(balance).to.be.lt(parseUnits("105.76", await ibAlluoUSD.decimals()));
                    await ibAlluoUSD.connect(signers[2]).withdraw(dai.address,balance);
        
                    balance = await ibAlluoUSD.getBalanceForTransfer(signers[4].address);
                    expect(balance).to.be.gt(parseUnits("307.66", await ibAlluoUSD.decimals()));
                    expect(balance).to.be.lt(parseUnits("307.67", await ibAlluoUSD.decimals()));
                    await ibAlluoUSD.connect(signers[4]).withdraw(dai.address,balance);
                });
                it('Should not give rewards if the interest is zero', async function () {
        
                    // address that will get minted tokens
                    const recipient = signers[3];
                    // amount of tokens to be minted, including decimals value of ibAlluoUSD
                    const amount = ethers.utils.parseUnits("100.0", await ibAlluoUSD.decimals());
        
                    await deposit(recipient, dai, amount);
        
                    await skipDays(365);
        
                    let balance = await ibAlluoUSD.getBalance(signers[3].address);
                    expect(balance).to.be.gt(parseUnits("107.9", await ibAlluoUSD.decimals()));
                    expect(balance).to.be.lt(parseUnits("108.1", await ibAlluoUSD.decimals()));
        
                    //changing interest
                    const newAnnualInterest = 0;
                    const newInterestPerSecond = parseUnits("100000000000000000", 0);
                                                              
                    let ABI = ["function setInterest(uint256 _newAnnualInterest, uint256 _newInterestPerSecond)"];
                    let iface = new ethers.utils.Interface(ABI);
                    const calldata = iface.encodeFunctionData("setInterest", [newAnnualInterest, newInterestPerSecond]);
        
                    await multisig.executeCall(ibAlluoUSD.address, calldata);
        
                    await skipDays(365);
        
                    //balance is the same
                    let newBalance = await ibAlluoUSD.getBalance(signers[3].address);
                    expect(newBalance).to.be.lt(parseUnits("108", await ibAlluoUSD.decimals()));
                });
            });
        
            describe('Token basic functionality', function () {
                describe("Tokenomics and Info", function () {
                    it("Should return basic information", async function () {
                        expect(await ibAlluoUSD.name()).to.equal("Interest Bearing Alluo USD"),
                            expect(await ibAlluoUSD.symbol()).to.equal("IbAlluoUSD"),
                            expect(await ibAlluoUSD.decimals()).to.equal(18);
                    });
                    it("Should return the total supply equal to 0", async function () {
                        expect(await ibAlluoUSD.totalSupply()).to.equal(0);
                    });
                });
                describe("Balances", function () {
                    it('When the requested account has no tokens it returns zero', async function () {
                        expect(await ibAlluoUSD.balanceOf(signers[1].address)).to.equal("0");
                    });
        
                    it('When the requested account has some tokens it returns the amount', async function () {
                        await deposit(signers[1], dai, parseEther('50'));
                        expect(await ibAlluoUSD.balanceOf(signers[1].address)).to.equal(parseEther('50'));
                    });
        
                });
                describe("Transactions", function () {
                    describe("Should fail when", function () {
        
                        it('transfer to zero address', async function () {
                            await expect(ibAlluoUSD.transfer(ZERO_ADDRESS, parseEther('100'))
                            ).to.be.revertedWith("ERC20: transfer to the zero address");
                        });
        
                        it('sender doesn\'t have enough tokens', async function () {
                            await expect(ibAlluoUSD.connect(signers[1]).transfer(signers[2].address, parseEther('100'))
                            ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
                        });
        
                        it('transfer amount exceeds allowance', async function () {
                            await expect(ibAlluoUSD.transferFrom(signers[1].address, signers[2].address, parseEther('100'))
                            ).to.be.revertedWith("ERC20: insufficient allowance");
                        });
                    });
                    describe("Should transfer when everything is correct", function () {
                        it('from signer1 to signer2 with correct balances at the end', async function () {
                            await deposit(signers[1], dai, parseEther('50'));
                            await ibAlluoUSD.connect(signers[1]).transfer(signers[2].address, parseEther('25'));
                            const addr1Balance = await ibAlluoUSD.balanceOf(signers[1].address);
                            const addr2Balance = await ibAlluoUSD.balanceOf(signers[2].address);
                            expect(addr1Balance).to.equal(parseEther('25'));
                            expect(addr2Balance).to.equal(parseEther('25'));
                        });
                    });
        
                });
        
                describe('Approve', function () {
                    it("Approving and TransferFrom", async function () {
                        await deposit(signers[1], dai, parseEther('100'));
                        await ibAlluoUSD.connect(signers[1]).approve(signers[2].address, parseEther('50'));
                        expect(await ibAlluoUSD.allowance(signers[1].address, signers[2].address)).to.equal(parseEther('50'));
        
                        await ibAlluoUSD.connect(signers[2]).transferFrom(signers[1].address, signers[2].address, parseEther("50"))
                        let balance = await ibAlluoUSD.balanceOf(signers[1].address);
                        expect(balance).to.equal(parseEther('50'));
                    });
                    it("Not approving becouse of zero address", async function () {
                        await expect(ibAlluoUSD.approve(ZERO_ADDRESS, parseEther('100'))
                        ).to.be.revertedWith("ERC20: approve to the zero address");
                    });
        
                    it("increasing and decreasing allowance", async function () {
                        await deposit(signers[1], dai, parseEther('100'));
                        await ibAlluoUSD.connect(signers[1]).increaseAllowance(signers[2].address, parseEther('50'));
                        expect(await ibAlluoUSD.allowance(signers[1].address, signers[2].address)).to.equal(parseEther('50'));
        
                        await expect(
                            ibAlluoUSD.connect(signers[2]).transferFrom(signers[1].address, signers[2].address, parseEther("60")))
                            .to.be.revertedWith("ERC20: insufficient allowance");
                        await ibAlluoUSD.connect(signers[1]).increaseAllowance(signers[2].address, parseEther('20'));
                        await ibAlluoUSD.connect(signers[1]).decreaseAllowance(signers[2].address, parseEther('10'));
                        await ibAlluoUSD.connect(signers[2]).transferFrom(signers[1].address, signers[2].address, parseEther("60"))
                        await expect(
                            ibAlluoUSD.connect(signers[1]).decreaseAllowance(signers[2].address, parseEther("50")))
                            .to.be.revertedWith("ERC20: decreased allowance below zero");
        
                        let balance = await ibAlluoUSD.balanceOf(signers[1].address);
                        expect(balance).to.equal(parseEther('40'));
                    });
                });
                describe('Mint / Burn', function () {
                    it("burn fails because the amount exceeds the balance", async function () {
                        await deposit(signers[1], dai, parseEther('100'));
                        await expect(ibAlluoUSD.connect(signers[1]).withdraw(dai.address,parseEther('200'))
                        ).to.be.revertedWith("ERC20: burn amount exceeds balance");
                    });
                });
            });
        
            describe('Admin and core functionality', function () {
        
            it("Should allow deposit", async function () {
                // address that will get minted tokens
                const recipient = signers[1];
                // amount of tokens to be minted, including decimals value of token
                const amount = ethers.utils.parseUnits("10.0", await ibAlluoUSD.decimals());
        
                expect(await ibAlluoUSD.balanceOf(recipient.address)).to.be.equal(0);
        
                await deposit(recipient, dai, amount);
        
                expect(await ibAlluoUSD.balanceOf(recipient.address)).to.be.equal(amount);
            });
        
            it("Should allow user to burn tokens for withdrawal", async () => {
                const recipient = signers[1];
                const amount = ethers.utils.parseUnits("10.0", await ibAlluoUSD.decimals());
        
                await deposit(recipient, dai, amount);
        
                await expect(ibAlluoUSD.connect(recipient).withdraw(dai.address, amount))
                    .to.emit(ibAlluoUSD, "BurnedForWithdraw")
                    .withArgs(recipient.address, amount);
            });
        
            it("Should grant role that can be granted only to contract", async () => {
                const role = await ibAlluoUSD.DEFAULT_ADMIN_ROLE();
                const NewContract = await ethers.getContractFactory('PseudoMultisigWallet') as PseudoMultisigWallet__factory;
                const newContract = await NewContract.deploy(true);
        
                expect(await ibAlluoUSD.hasRole(role, newContract.address)).to.be.false;
        
                let calldata = await prepareCallData("role", [role, newContract.address])
        
                await multisig.executeCall(ibAlluoUSD.address, calldata);
        
                expect(await ibAlluoUSD.hasRole(role, newContract.address)).to.be.true;
            });
        
            it("Should not grant role that can be granted only to contract", async () => {
                const role = await ibAlluoUSD.DEFAULT_ADMIN_ROLE();
                const target = signers[1];
        
                expect(await ibAlluoUSD.hasRole(role, target.address)).to.be.false;
        
                let calldata = await prepareCallData("role", [role, target.address])
        
                const tx = multisig.executeCall(ibAlluoUSD.address, calldata);
        
                expect(tx).to.be.revertedWith("IbAlluo: Not contract");
            });
        
            it("Should grant role that can be granted to anyone", async () => {
                const role = await ibAlluoUSD.UPGRADER_ROLE();
                const target = signers[1];
        
                expect(await ibAlluoUSD.hasRole(role, target.address)).to.be.false;
        
         
                let calldata = await prepareCallData("role", [role, target.address])
        
                const tx = multisig.executeCall(ibAlluoUSD.address, calldata);
            });
        
            it("Should set new interest", async () => {
                const newAnnualInterest = 1600;
                const newInterestPerSecond = parseUnits("100000000470636749", 0);
                const realNewInterestPerSecond = parseUnits("1000000004706367490000000000", 0);
                
                const oldAnnualInterest = await ibAlluoUSD.annualInterest();
                const oldInterestPerSecond = await ibAlluoUSD.interestPerSecond();
        
                expect(newAnnualInterest).to.be.not.equal(oldAnnualInterest);
                expect(newInterestPerSecond).to.be.not.equal(oldInterestPerSecond);
        
                let ABI = ["function setInterest(uint256 _newAnnualInterest, uint256 _newInterestPerSecond)"];
                let iface = new ethers.utils.Interface(ABI);
                const calldata = iface.encodeFunctionData("setInterest", [newAnnualInterest, newInterestPerSecond]);
        
                await expect(multisig.executeCall(ibAlluoUSD.address, calldata))
                    .to.emit(ibAlluoUSD, "InterestChanged")
                    .withArgs(
                        oldAnnualInterest, 
                        newAnnualInterest, 
                        oldInterestPerSecond, 
                        realNewInterestPerSecond
                    );
            });
        
            it("Should not set new interest (caller without DEFAULT_ADMIN_ROLE)", async () => {
                const newAnnualInterest = 1600;
                const newInterestPerSecond = parseUnits("100000000470636749", 0);
                const role = await ibAlluoUSD.DEFAULT_ADMIN_ROLE();
                const notAdmin = signers[1];
        
                await expect(ibAlluoUSD.connect(notAdmin).setInterest(newAnnualInterest, newInterestPerSecond)).to.be
                    .revertedWith(`AccessControl: account ${notAdmin.address.toLowerCase()} is missing role ${role}`);
            });
        
            it("Should pause all public/external user functions", async () => {
                const address1 = signers[1];
                const address2 = signers[2];
                const amount = ethers.utils.parseUnits("5.0", await ibAlluoUSD.decimals());
        
                await deposit(address1, usdc, parseUnits("15.0", 6))
        
                expect(await ibAlluoUSD.paused()).to.be.false;
        
                let ABI = ["function pause()"];
                let iface = new ethers.utils.Interface(ABI);
                const calldata = iface.encodeFunctionData("pause", []);
        
                await multisig.executeCall(ibAlluoUSD.address, calldata);
        
                expect(await ibAlluoUSD.paused()).to.be.true;
                
                await expect(ibAlluoUSD.connect(address1).transfer(address1.address, amount)).to.be.revertedWith("Pausable: paused");
                await expect(ibAlluoUSD.approve(address1.address, amount)).to.be.revertedWith("Pausable: paused");
                await expect(ibAlluoUSD.transferFrom(address1.address, address2.address, amount)).to.be.revertedWith("Pausable: paused");
                await expect(ibAlluoUSD.increaseAllowance(address1.address, amount)).to.be.revertedWith("Pausable: paused");
                await expect(ibAlluoUSD.decreaseAllowance(address1.address, amount)).to.be.revertedWith("Pausable: paused");
        
                await expect(ibAlluoUSD.updateRatio()).to.be.revertedWith("Pausable: paused");
                await expect(ibAlluoUSD.connect(address1).withdraw(dai.address, amount)).to.be.revertedWith("Pausable: paused");
                await expect(deposit(address1, usdc, parseUnits("15.0", 6))).to.be.revertedWith("Pausable: paused");
            });
        
            it("Should unpause all public/external user functions", async () => {
                let ABI1 = ["function pause()"];
                let iface1 = new ethers.utils.Interface(ABI1);
                const calldata1 = iface1.encodeFunctionData("pause", []);
        
                await multisig.executeCall(ibAlluoUSD.address, calldata1);
        
                let ABI2 = ["function unpause()"];
                let iface2 = new ethers.utils.Interface(ABI2);
                const calldata2 = iface2.encodeFunctionData("unpause", []);
        
                await multisig.executeCall(ibAlluoUSD.address, calldata2);
        
                expect(await ibAlluoUSD.paused()).to.be.false;
            });
        
            it("Should set new updateRatio time limit", async () => {
                const newLimit = 120;
                const oldLimit = await ibAlluoUSD.updateTimeLimit();
        
                expect(newLimit).to.not.be.equal(oldLimit);
        
                let ABI = ["function setUpdateTimeLimit(uint256 _newLimit)"];
                let iface = new ethers.utils.Interface(ABI);
                const calldata = iface.encodeFunctionData("setUpdateTimeLimit", [newLimit]);
        
                await expect(multisig.executeCall(ibAlluoUSD.address, calldata)).to.emit(ibAlluoUSD, "UpdateTimeLimitSet").withArgs(oldLimit, newLimit);
            });
        
            it("Should not set new updateRatio time limit (caller without DEFAULT_ADMIN_ROLE)", async () => {
                const newLimit = 7200;
                const notAdmin = signers[1];
                const role = await ibAlluoUSD.DEFAULT_ADMIN_ROLE();
        
                await expect(ibAlluoUSD.connect(notAdmin).setUpdateTimeLimit(newLimit)).to.be
                    .revertedWith(`AccessControl: account ${notAdmin.address.toLowerCase()} is missing role ${role}`);
            });
        
            it("Should set new wallet", async () => {
                const NewWallet = await ethers.getContractFactory('PseudoMultisigWallet') as PseudoMultisigWallet__factory;
                const newWallet = await NewWallet.deploy(true);
                const oldWallet = await ibAlluoUSD.wallet();
        
                expect(newWallet.address).to.not.be.equal(oldWallet);
        
                let ABI = ["function setWallet(address newWallet)"];
                let iface = new ethers.utils.Interface(ABI);
                const calldata = iface.encodeFunctionData("setWallet", [newWallet.address]);
        
                await expect(multisig.executeCall(ibAlluoUSD.address, calldata)).to.emit(ibAlluoUSD, "NewWalletSet").withArgs(oldWallet, newWallet.address);
            });
        
            it("Should not set new wallet (attempt to make wallet an EOA)", async () => {
                const newWallet = signers[2]
        
                let ABI = ["function setWallet(address newWallet)"];
                let iface = new ethers.utils.Interface(ABI);
                const calldata = iface.encodeFunctionData("setWallet", [newWallet.address]);
        
                const tx = multisig.executeCall(ibAlluoUSD.address, calldata);
        
                await expect(tx).to.be.revertedWith("IbAlluo: Not contract")
            })
        
            it("Should add new deposit token and allow to deposit with it", async () => {
        
        
                let ABI = ["function changeTokenStatus(address _token, bool _status)"];
                let iface = new ethers.utils.Interface(ABI);
                const calldata = iface.encodeFunctionData("changeTokenStatus", [usdt.address, true]);
        
                await multisig.executeCall(ibAlluoUSD.address, calldata);
        
                const recipient = signers[1];
        
                const amount =  "135.3";
                let amountIn6 =  ethers.utils.parseUnits(amount, 6)
        
                await deposit(recipient, usdt, amountIn6 );
        
                expect(await ibAlluoUSD.balanceOf(recipient.address)).to.equal(parseUnits(amount, await ibAlluoUSD.decimals()));
        
            })
        
            });
            
    })

    async function deposit(recipient: SignerWithAddress, token: IERC20, amount: BigNumberish) {

        if (token == eurs) {
            await token.connect(eurswhale).transfer(recipient.address, amount);
            await token.connect(recipient).approve(ibAlluoEUR.address, amount);        
            await ibAlluoEUR.connect(recipient).deposit(token.address, amount);
        }
        else if (token == eurt) {
            await token.connect(eurtwhale).transfer(recipient.address, amount);
            await token.connect(recipient).approve(ibAlluoEUR.address, amount);        
            await ibAlluoEUR.connect(recipient).deposit(token.address, amount);
        }

        else if (token == jeur) {
            await token.connect(jeurwhale).transfer(recipient.address, amount);
            await token.connect(recipient).approve(ibAlluoEUR.address, amount);        
            await ibAlluoEUR.connect(recipient).deposit(token.address, amount);
        }
    
        else {
            await token.connect(whale).transfer(recipient.address, amount);
            await token.connect(recipient).approve(ibAlluoUSD.address, amount);        
            await ibAlluoUSD.connect(recipient).deposit(token.address, amount);
        }
    }

});
