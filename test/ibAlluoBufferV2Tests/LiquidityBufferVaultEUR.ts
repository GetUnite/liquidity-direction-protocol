import { parseEther, parseUnits } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, BigNumberish, BytesLike } from "ethers";
import { ethers, network, upgrades } from "hardhat";
import { before } from "mocha";
import { TestERC20, TestERC20__factory, LiquidityBufferUSDAdaptor, LiquidityBufferUSDAdaptor__factory, IERC20, PseudoMultisigWallet, PseudoMultisigWallet__factory , AlluoLpV3, AlluoLpV3__factory, LiquidityBufferVault, LiquidityBufferVault__factory, LiquidityBufferVaultForTests__factory, LiquidityBufferVaultForTests,  IbAlluo, IbAlluo__factory, IbAlluoV2, LiquidityBufferVaultV2, IbAlluoV2__factory, LiquidityBufferVaultV2__factory, IbAlluoUSD, LiquidityBufferVaultV3, USDAdaptor, IbAlluoUSD__factory, LiquidityBufferVaultV3__factory, USDAdaptor__factory, EURAdaptor__factory, EURAdaptor} from "../../typechain";

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
    let jeurwhale: SignerWithAddress;
    let eurswhale : SignerWithAddress;
    let eurtwhale: SignerWithAddress;
    let curveLpHolder: SignerWithAddress;

    let alluoLpV3: AlluoLpV3;
    let ibAlluoCurrent: IbAlluoUSD;
    let multisig: PseudoMultisigWallet;
    let buffer: LiquidityBufferVaultV3;

    let jeur: IERC20, eurt: IERC20, eurs: IERC20;
    let curveLp: IERC20;

    let adaptor: EURAdaptor;
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

        const jeurWhale = "0x2c1cb163a00733cf773b828a77ea347cb0fc91b4"
        const eursWhale = "0x1bee4f735062cd00841d6997964f187f5f5f5ac9"
        const eurtWhale = "0xecded8b1c603cf21299835f1dfbe37f10f2a29af"

        const curveLpHolderAddress = "0xa0f2e2f7b3ab58e3e52b74f08d94ae52778d46df";

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
        await ethers.provider.send(
            'hardhat_impersonateAccount',
            [curveLpHolderAddress]
        );
        
        jeurwhale = await ethers.getSigner(jeurWhale);
        eurswhale = await ethers.getSigner(eursWhale);
        eurtwhale = await ethers.getSigner(eurtWhale);
        curveLpHolder = await ethers.getSigner(curveLpHolderAddress);
        jeur = await ethers.getContractAt("IERC20", "0x4e3Decbb3645551B8A19f0eA1678079FCB33fB4c");
        eurt = await ethers.getContractAt("IERC20", "0x7BDF330f423Ea880FF95fC41A280fD5eCFD3D09f");
        eurs = await ethers.getContractAt("IERC20", "0xE111178A87A3BFf0c8d18DECBa5798827539Ae99");
        curveLp = await ethers.getContractAt("IERC20", "0xE7a24EF0C5e95Ffb0f6684b813A78F2a3AD7D171");
        
        console.log("We are forking Polygon mainnet\n");
        expect(await jeur.balanceOf(jeurwhale.address)).to.be.gt(0, "Whale has no jeur, or you are not forking Polygon");
        expect(await eurs.balanceOf(eurswhale.address)).to.be.gt(0, "Whale has no jeur, or you are not forking Polygon");
        expect(await eurt.balanceOf(eurtwhale.address)).to.be.gt(0, "Whale has no jeur, or you are not forking Polygon");
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
    });


    beforeEach(async function () {
        const IbAlluo = await ethers.getContractFactory("IbAlluoUSD") as IbAlluoUSD__factory;
        //We are using this contract to simulate Gnosis multisig wallet
        const Multisig = await ethers.getContractFactory("PseudoMultisigWallet") as PseudoMultisigWallet__factory;
        //For tests we are using version of contract with hardhat console.log, to see all Txn
        //you can switch two next lines and turn off logs
        // const Buffer = await ethers.getContractFactory("LiquidityBufferVaultForTests") as LiquidityBufferVaultForTests__factory;
        const Buffer = await ethers.getContractFactory("LiquidityBufferVaultV3") as LiquidityBufferVaultV3__factory;
        const Adaptor = await ethers.getContractFactory("EURAdaptor") as EURAdaptor__factory;

        let curvePool = "0xAd326c253A84e9805559b73A08724e11E49ca651"

        multisig = await Multisig.deploy(true);

        await upgrades.silenceWarnings();
        buffer = await upgrades.deployProxy(Buffer,
            [multisig.address, multisig.address,],
            {initializer: 'initialize', kind:'uups',unsafeAllow: ['delegatecall']},
        ) as LiquidityBufferVaultV3;

        ibAlluoCurrent = await upgrades.deployProxy(IbAlluo,
            [multisig.address,
            buffer.address,
            [jeur.address,
            eurt.address,
            eurs.address]],
            {initializer: 'initialize', kind:'uups'}
        ) as IbAlluoUSD;


        
        adaptor = await Adaptor.deploy(multisig.address, buffer.address);
        // Necessary info for adaptor:
        // multisig.address, curvePool, jeur.address, eurt.address, eurs.address
        let ABI = ["function setAlluoLp(address newAlluoLp)"];
        let iface = new ethers.utils.Interface(ABI);
        let calldata = iface.encodeFunctionData("setAlluoLp", [ibAlluoCurrent.address]);
        await multisig.executeCall(buffer.address, calldata);


        expect(await ibAlluoCurrent.liquidityBuffer()).equal(buffer.address);
        await ibAlluoCurrent.migrateStep2();



        ABI = ["function registerAdapter(string calldata _name, address _AdapterAddress, uint256 _percentage, bool _status, address _ibAlluo, uint256 _AdapterId)"];
        iface = new ethers.utils.Interface(ABI);
        calldata = iface.encodeFunctionData("registerAdapter", ["CurvePool", adaptor.address, 0, true, ibAlluoCurrent.address, 1]);
        await multisig.executeCall(buffer.address, calldata);


        ABI = ["function setSlippage ( uint32 _newSlippage )"];
        iface = new ethers.utils.Interface(ABI);
        calldata = iface.encodeFunctionData("setSlippage", [300] );
        await multisig.executeCall(adaptor.address, calldata);


        let tokenArray = [jeur.address, eurt.address, eurs.address];
        tokenArray.forEach( async token => {

            ABI = ["function setTokenToAdapter (address _token, uint256 _AdapterId)"];
            iface = new ethers.utils.Interface(ABI);
            calldata = iface.encodeFunctionData("setTokenToAdapter", [token, 1] );
            await multisig.executeCall(buffer.address, calldata);
        })
        await adaptor.AdaptorApproveAll();

    });
    describe('USD Adaptor with IbAlluoV2: Test cases', function () {

        it("Depositing 100 jeur and immediately attempting to withdraw 50 should put you in the waiting list", async function () {
            await deposit(signers[0], jeur, parseEther("100"));
            await ibAlluoCurrent.connect(signers[0]).withdraw(jeur.address, parseEther("50"));
            expect(await buffer.lastWithdrawalRequest()).not.equal(await buffer.lastSatisfiedWithdrawal());

        })
        it("Depositing 100 jeur, attempt to withdraw 50 and then only get paid after there is a deposit", async function () {
            await deposit(signers[0], jeur, parseEther("100"));
            await ibAlluoCurrent.connect(signers[0]).withdraw(jeur.address, parseEther("50"));
            expect(await buffer.lastWithdrawalRequest()).not.equal(await buffer.lastSatisfiedWithdrawal());
            
            await deposit(signers[1], jeur, parseEther("100"));
            await buffer.satisfyWithdrawals();
            expect(await jeur.balanceOf(signers[0].address)).equal(parseEther("50"))
        })

        it("Depositing 100 eurt and immediately attempting to withdraw 50 should put you in the waiting list", async function () {
            await deposit(signers[0], eurt, parseUnits("100", 6));
            await ibAlluoCurrent.connect(signers[0]).withdraw(eurt.address, parseUnits("100", 18));
            expect(await buffer.lastWithdrawalRequest()).not.equal(await buffer.lastSatisfiedWithdrawal());
        })
        it("Depositing 100 eurt, attempt to withdraw 50 and then only get paid after there is a deposit", async function () {
            await deposit(signers[0], eurt, parseUnits("100", 6));
            await ibAlluoCurrent.connect(signers[0]).withdraw(eurt.address, parseUnits("50", 18));
            expect(await buffer.lastWithdrawalRequest()).not.equal(await buffer.lastSatisfiedWithdrawal());
            
            await deposit(signers[1], eurt, parseUnits("100", 6));
            await buffer.satisfyWithdrawals();
            expect(Number(await eurt.balanceOf(signers[0].address))).greaterThanOrEqual(Number(parseUnits("49", 6)))
        })

        it("Depositing 100 eurs and immediately attempting to withdraw 50 should put you in the waiting list", async function () {
            await deposit(signers[0], eurs, parseUnits("100", 2));
            await ibAlluoCurrent.connect(signers[0]).withdraw(eurs.address, parseUnits("50", 18));
            expect(await buffer.lastWithdrawalRequest()).not.equal(await buffer.lastSatisfiedWithdrawal());
        })
        it("Depositing 100 eurs, attempt to withdraw 50 and then only get paid after there is a deposit", async function () {
            await deposit(signers[0], eurs, parseUnits("100", 2));
            await ibAlluoCurrent.connect(signers[0]).withdraw(eurs.address, parseUnits("50", 18));
            expect(await buffer.lastWithdrawalRequest()).not.equal(await buffer.lastSatisfiedWithdrawal());
            
            await deposit(signers[1], eurs, parseUnits("100", 2));
            await buffer.satisfyWithdrawals();
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
            await expect(ibAlluoCurrent.connect(signers[1]).withdraw(eurt.address, parseUnits("500", 18))).to.be.revertedWith('ERC20: burn amount exceeds balance')
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

            await ibAlluoCurrent.connect(signers[0]).withdraw(jeur.address, parseEther("50"));
            expect(await buffer.lastWithdrawalRequest()).not.equal(await buffer.lastSatisfiedWithdrawal());
            await ibAlluoCurrent.connect(signers[1]).withdraw(eurt.address, parseUnits("50", 18));
            expect(await buffer.lastWithdrawalRequest()).not.equal(await buffer.lastSatisfiedWithdrawal());
            await ibAlluoCurrent.connect(signers[2]).withdraw(eurs.address,parseUnits("50", 18));
            expect(await buffer.lastWithdrawalRequest()).not.equal(await buffer.lastSatisfiedWithdrawal());
    
            expect(await buffer.totalWithdrawalAmount()).equal(parseEther("150"))
            // When there are deposits, should pay everyone back.
            await deposit(signers[2], eurs, parseUnits("1000", 2));
            await buffer.satisfyWithdrawals();
            expect(Number(await eurt.balanceOf(multisig.address))).greaterThan(Number(walletBalance))

            expect(Number(await jeur.balanceOf(signers[0].address))).greaterThanOrEqual(Number(parseUnits("49", 18)))
            expect(Number(await eurt.balanceOf(signers[1].address))).greaterThanOrEqual(Number(parseUnits("49", 6)))
            expect(Number(await eurs.balanceOf(signers[2].address))).greaterThanOrEqual(Number(parseUnits("49", 2)))



            })

            
    })

    async function deposit(recipient: SignerWithAddress, token: IERC20, amount: BigNumberish) {
        if (token == eurs) {
            await token.connect(eurswhale).transfer(recipient.address, amount);
            await token.connect(recipient).approve(ibAlluoCurrent.address, amount);        
            await ibAlluoCurrent.connect(recipient).deposit(token.address, amount);
        }
        else if (token == eurt) {
            await token.connect(eurtwhale).transfer(recipient.address, amount);
            await token.connect(recipient).approve(ibAlluoCurrent.address, amount);        
            await ibAlluoCurrent.connect(recipient).deposit(token.address, amount);
        }

        else if (token == jeur) {
            await token.connect(jeurwhale).transfer(recipient.address, amount);
            await token.connect(recipient).approve(ibAlluoCurrent.address, amount);        
            await ibAlluoCurrent.connect(recipient).deposit(token.address, amount);
        }
    
    }
    
});
