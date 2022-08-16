import { parseEther, parseUnits } from "@ethersproject/units";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { BigNumber, BigNumberish, BytesLike, Wallet } from "ethers";
import { defaultAbiCoder } from "ethers/lib/utils";
import { ethers, network, upgrades } from "hardhat";
import { before } from "mocha";
import { CurveConvexStrategyTest } from "../typechain";
import { CurveConvexStrategy, ERC20, IbAlluo, IbAlluo__factory, IERC20, PseudoMultisigWallet, UsdCurveAdapter, VoteExecutorSlave, VoteExecutorSlave__factory,} from "../typechain";
const ZERO_ADDR = ethers.constants.AddressZero;

function getInterestPerSecond(apyDecimal: number): BigNumber {
    return BigNumber.from(String(Math.round(Math.pow(apyDecimal, 1/31536000)*10**17)))
}


  

async function getImpersonatedSigner(address: string): Promise<SignerWithAddress> {
    await ethers.provider.send(
        'hardhat_impersonateAccount',
        [address]
    );

    return await ethers.getSigner(address);
}


describe("Test L2 Contracts", function() {
    let VoteExecutorSlave : VoteExecutorSlave;
    let VoteExecutorSlaveFactory : VoteExecutorSlave__factory;
    let PseudoMultisigWallet: PseudoMultisigWallet;
    let mneumonic  = process.env.MNEMONIC
    const interestPerSecond = BigNumber.from("10000002438562803");
    let wallet : Wallet;
    let admin: SignerWithAddress;

    let ibAlluoUSD : IbAlluo;
    let ibAlluoBTC : IbAlluo;
    let ibAlluoETH : IbAlluo;
    let ibAlluoEUR : IbAlluo;

    let ibAlluoFactory : IbAlluo__factory;
    // let mockERC20 : MetaTxERC20Token;
    let signers: SignerWithAddress[]
    let owners: string[];
    let usdc: IERC20;
    let usdt: IERC20;
    let eurt: IERC20;
    let weth: IERC20;
    let wbtc: IERC20;
    let frax:IERC20;
    let strategy: CurveConvexStrategy;
    before(async function () {
        //We are forking Polygon mainnet, please set Alchemy key in .env
        await network.provider.request({
            method: "hardhat_reset",
            params: [{
                forking: {
                    enabled: true,
                    jsonRpcUrl: process.env.MAINNET_FORKING_URL as string,
                    //you can fork from last block by commenting next line
                    // blockNumber: 28729129,
                    // Ethereum tests
                    blockNumber: 15344027
                },
            },],
        });
    })

    beforeEach(async () => {
        if (typeof mneumonic !== "string") {
            return
        }
        signers = await ethers.getSigners();

        admin = signers[9];
        let handler = "0x31a3439Ac7E6Ea7e0C0E4b846F45700c6354f8c1"

        VoteExecutorSlaveFactory = await ethers.getContractFactory("VoteExecutorSlave") as VoteExecutorSlave__factory;

        VoteExecutorSlave = await upgrades.deployProxy(VoteExecutorSlaveFactory,
            [admin.address, handler],
            { initializer: 'initialize', kind: 'uups' }
        ) as VoteExecutorSlave;

        wallet = Wallet.fromMnemonic(mneumonic)        

    
        owners = [signers[3].address, signers[4].address, signers[5].address]
        const PseudoMultisigWalletFactory  = await ethers.getContractFactory("PseudoMultisigWallet");
        PseudoMultisigWallet = await PseudoMultisigWalletFactory.deploy(true) as PseudoMultisigWallet
        await PseudoMultisigWallet.addOwners(signers[3].address);
        await PseudoMultisigWallet.addOwners(signers[4].address);
        await PseudoMultisigWallet.addOwners(signers[5].address);
        await VoteExecutorSlave.setGnosis(PseudoMultisigWallet.address);

        const Strategy = await ethers.getContractFactory("CurveConvexStrategyTest");
        strategy = await Strategy.deploy(VoteExecutorSlave.address, PseudoMultisigWallet.address, false) as CurveConvexStrategyTest;

        // Give some funds to the executor
        let whale = await getImpersonatedSigner("0xf584f8728b874a6a5c7a8d4d387c9aae9172d621")
        usdc = await ethers.getContractAt("IERC20", "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48") as IERC20;
        usdc.connect(whale).transfer(VoteExecutorSlave.address, parseUnits("1000000", "6"));

        let whale2 = await getImpersonatedSigner("0x5754284f345afc66a98fbb0a0afe71e0f007b949")
        eurt = await ethers.getContractAt("IERC20", "0xC581b735A1688071A1746c968e0798D642EDE491") as IERC20;
        eurt.connect(whale2).transfer(VoteExecutorSlave.address, parseUnits("1000000", "6"));

        let whale3 = await getImpersonatedSigner("0x1c11ba15939e1c16ec7ca1678df6160ea2063bc5")
        weth = await ethers.getContractAt("IERC20", "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2") as IERC20;
        weth.connect(whale3).transfer(VoteExecutorSlave.address, parseEther("100"));

        
        let whale4 = await getImpersonatedSigner("0x218b95be3ed99141b0144dba6ce88807c4ad7c09")
        wbtc = await ethers.getContractAt("IERC20", "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599") as IERC20;
        wbtc.connect(whale4).transfer(VoteExecutorSlave.address, parseUnits("10", "8"));
        frax = await ethers.getContractAt("IERC20", "0x853d955aCEf822Db058eb8505911ED77F175b99e");
        usdt = await ethers.getContractAt("IERC20", "0xdAC17F958D2ee523a2206206994597C13D831ec7")



        // Add data for USD pools
        let entryCall = await strategy.callStatic.encodeEntryParams("0xD51a44d3FaE010294C616388b506AcdA1bfAAE46", "0xc4AD29ba4B3c580e6D59105FFf484999997675Ff", usdt.address,3,0,38 )
        let exitCall = await strategy.callStatic.encodeExitParams("0xD51a44d3FaE010294C616388b506AcdA1bfAAE46",usdt.address,  "0xc4AD29ba4B3c580e6D59105FFf484999997675Ff",0,38 )
        await VoteExecutorSlave.setLiquidityDirection("CurveFrax3CRV", strategy.address, 0, "0x000000000000000000000000d632f22692fac7611d2aa1c0d552930d43caed3b000000000000000000000000d632f22692fac7611d2aa1c0d552930d43caed3b000000000000000000000000853d955acef822db058eb8505911ed77f175b99e000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000020", "0x000000000000000000000000d632f22692fac7611d2aa1c0d552930d43caed3b000000000000000000000000853d955acef822db058eb8505911ed77f175b99e000000000000000000000000d632f22692fac7611d2aa1c0d552930d43caed3b00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000020")
        await VoteExecutorSlave.setLiquidityDirection("CurveCRVCrypto", strategy.address, 0,entryCall, exitCall)
        await VoteExecutorSlave.addPrimaryToken(usdc.address)
        // 


        // Add data for EUR pools
        entryCall = await strategy.callStatic.encodeEntryParams("0x9838eCcC42659FA8AA7daF2aD134b53984c9427b", "0x3b6831c0077a1e44ED0a21841C3bC4dC11bCE833", "0xC581b735A1688071A1746c968e0798D642EDE491",2,0,55 )
        exitCall = await strategy.callStatic.encodeExitParams("0x9838eCcC42659FA8AA7daF2aD134b53984c9427b", "0xC581b735A1688071A1746c968e0798D642EDE491", "0x3b6831c0077a1e44ED0a21841C3bC4dC11bCE833",0,55)
        await VoteExecutorSlave.setLiquidityDirection("CurveEurtUSD", strategy.address, 0, entryCall, exitCall)

        entryCall = await strategy.callStatic.encodeEntryParams("0xFD5dB7463a3aB53fD211b4af195c5BCCC1A03890", "0xFD5dB7463a3aB53fD211b4af195c5BCCC1A03890", "0xC581b735A1688071A1746c968e0798D642EDE491",2,0,39 )
        exitCall = await strategy.callStatic.encodeExitParams("0xFD5dB7463a3aB53fD211b4af195c5BCCC1A03890", "0xC581b735A1688071A1746c968e0798D642EDE491", "0xFD5dB7463a3aB53fD211b4af195c5BCCC1A03890",0,39)
        await VoteExecutorSlave.setLiquidityDirection("CurveEurt", strategy.address, 0,entryCall, exitCall)
        await VoteExecutorSlave.addPrimaryToken("0xC581b735A1688071A1746c968e0798D642EDE491")
        // 


        // Add data for WETH pools
        entryCall = await strategy.callStatic.encodeEntryParams("0xD51a44d3FaE010294C616388b506AcdA1bfAAE46", "0xc4AD29ba4B3c580e6D59105FFf484999997675Ff", "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",3,2,38 )
        exitCall = await strategy.callStatic.encodeExitParams("0xD51a44d3FaE010294C616388b506AcdA1bfAAE46","0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",  "0xc4AD29ba4B3c580e6D59105FFf484999997675Ff",2,38 )
        await VoteExecutorSlave.setLiquidityDirection("CurveCRVCryptoETH", strategy.address, 0, entryCall, exitCall)

        // entryCall = await strategy.callStatic.encodeEntryParams()
        // exitCall = await strategy.callStatic.encodeExitParams()
        // await VoteExecutorSlave.setLiquidityDirection("CurveEurt", strategy.address, 0,entryCall, exitCall)
        await VoteExecutorSlave.addPrimaryToken("0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2")
        // 


        // Add data for BTC pools
        entryCall = await strategy.callStatic.encodeEntryParams("0xD51a44d3FaE010294C616388b506AcdA1bfAAE46", "0xc4AD29ba4B3c580e6D59105FFf484999997675Ff", "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",3,1,38 )
        exitCall = await strategy.callStatic.encodeExitParams("0xD51a44d3FaE010294C616388b506AcdA1bfAAE46","0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",  "0xc4AD29ba4B3c580e6D59105FFf484999997675Ff",1,38 )
        await VoteExecutorSlave.setLiquidityDirection("CurveCRVCryptoBTC", strategy.address, 0, entryCall, exitCall)

        entryCall = await strategy.callStatic.encodeEntryParams("0x93054188d876f558f4a66B2EF1d97d16eDf0895B", "0x49849C98ae39Fff122806C06791Fa73784FB3675", "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",2,1,6 )
        exitCall = await strategy.callStatic.encodeExitParams("0x93054188d876f558f4a66B2EF1d97d16eDf0895B", "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", "0x49849C98ae39Fff122806C06791Fa73784FB3675",1,6)
        await VoteExecutorSlave.setLiquidityDirection("CurveRen", strategy.address, 0,entryCall, exitCall)
        await VoteExecutorSlave.addPrimaryToken("0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599")
        // 

    });

    describe("Tests for USD,EUR,WETH,WBTC allocations in isolation", function() {
        it("Deposit into CurveEurtUSD and CurveEurt", async function() {
             
             if (typeof mneumonic !== "string") {
                 return
             }
             let encodedDeposit1 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveEurtUSD", eurt.address , eurt.address, parseEther("700000"), true)
             let encodedDeposit2 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveEurt", eurt.address ,eurt.address , parseEther("300000"), true)
             await executeVote([encodedDeposit1, encodedDeposit2])
             await VoteExecutorSlave.executeDeposits();
         })
         it("Then withdraw some after an initial deposited state", async function() {
 
             if (typeof mneumonic !== "string") {
                 return
             }
             // Do an intiial deposit
             let encodedDeposit1 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveEurtUSD", eurt.address , eurt.address, parseEther("700000"), true)
             let encodedDeposit2 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveEurt", eurt.address ,eurt.address , parseEther("300000"), true)
             await executeVote([encodedDeposit1, encodedDeposit2])
             await VoteExecutorSlave.executeDeposits();
 
             // Do withdrawals
 
             let encodedWithdraw1 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveEurtUSD", eurt.address , eurt.address, 7000, false);
             let encodedWithdraw2 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveEurt", eurt.address , eurt.address, 5000, false);
             await executeVote([encodedWithdraw1, encodedWithdraw2])
             await VoteExecutorSlave.executeDeposits();
             console.log(await eurt.balanceOf(VoteExecutorSlave.address), "THis is the current balance")
             expect(Number(await eurt.balanceOf(VoteExecutorSlave.address))).greaterThan(0);
         })
         it("Deposit initial capital. Withdraw and reallocate to different pool.", async function() {
 
             if (typeof mneumonic !== "string") {
                 return
             }
             // Deposit into Frax 3CRV first
             let encodedDeposit1 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveEurtUSD", eurt.address , eurt.address, parseEther("1000000"), true)
             await executeVote([encodedDeposit1]);
             await VoteExecutorSlave.executeDeposits();
 
 
             // Withdraw 100% of the tokens in CurveFrax3CRV and deposit all of it back into CurveCRVCrypto.
 
             let encodedWithdraw1 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveEurtUSD", eurt.address , eurt.address, 10000, false);
             let encodedDeposit2 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveEurt", eurt.address ,eurt.address , parseUnits("996249062265", 12), true)
             await executeVote([encodedWithdraw1, encodedDeposit2])
             await VoteExecutorSlave.executeDeposits();
             console.log(await eurt.balanceOf(VoteExecutorSlave.address), "THis is the current balance")
         })

         it("Deposit into Frax3CRV and CRV3Crypto", async function() {
            
            if (typeof mneumonic !== "string") {
                return
            }
            let encodedDeposit1 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveFrax3CRV", usdc.address, frax.address, parseEther("700000"), true)
            let encodedDeposit2 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveCRVCrypto", usdc.address, usdt.address, parseEther("300000"), true)
            await executeVote([encodedDeposit1, encodedDeposit2])
            await VoteExecutorSlave.executeDeposits();
        })

        it("Then withdraw some USDC after an initial deposited state", async function() {

            if (typeof mneumonic !== "string") {
                return
            }
            // Do an intiial deposit
            let encodedDeposit1 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveFrax3CRV", usdc.address, frax.address, parseEther("700000"), true)
            let encodedDeposit2 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveCRVCrypto", usdc.address, usdt.address, parseEther("300000"), true)

            await executeVote([encodedDeposit1, encodedDeposit2])
            await VoteExecutorSlave.executeDeposits();

            // Do withdrawals

            let encodedWithdraw1 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveFrax3CRV", usdc.address, frax.address, 7000, false);
            let encodedWithdraw2 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveCRVCrypto", usdc.address, usdt.address, 5000, false);
            await executeVote([encodedWithdraw1, encodedWithdraw2])
            await VoteExecutorSlave.executeDeposits();
            console.log(await usdc.balanceOf(VoteExecutorSlave.address), "THis is the current balance")
            expect(Number(await usdc.balanceOf(VoteExecutorSlave.address))).greaterThan(0);
        })
        it("Deposit initial capital in USDC. Withdraw and reallocate to different pool.", async function() {

            if (typeof mneumonic !== "string") {
                return
            }
            // Deposit into Frax 3CRV first
            let encodedDeposit1 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveFrax3CRV", usdc.address, frax.address, parseEther("1000000"), true)
            await executeVote([encodedDeposit1]);
            await VoteExecutorSlave.executeDeposits();


            // Withdraw 100% of the tokens in CurveFrax3CRV and deposit all of it back into CurveCRVCrypto.
            let encodedWithdraw1 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveFrax3CRV", usdc.address, frax.address, 10000, false);
            let encodedDeposit2 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveCRVCrypto", usdc.address, usdt.address, parseUnits("998780981925", 12), true)
            await executeVote([encodedWithdraw1, encodedDeposit2])
            await VoteExecutorSlave.executeDeposits();
            console.log(await usdc.balanceOf(VoteExecutorSlave.address), "THis is the current balance")
        })

        it("Deposit into CurveCRVCryptoETH", async function() {
            
            if (typeof mneumonic !== "string") {
                return
            }
            let encodedDeposit1 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveCRVCryptoETH", weth.address , weth.address, parseEther("100"), true)
            await executeVote([encodedDeposit1])
            await VoteExecutorSlave.executeDeposits();
        })
        it("Then withdraw some WETH after an initial deposited state", async function() {

            if (typeof mneumonic !== "string") {
                return
            }
            // Do an intiial deposit
            let encodedDeposit1 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveCRVCryptoETH", weth.address , weth.address, parseEther("100"), true)

            await executeVote([encodedDeposit1])
            await VoteExecutorSlave.executeDeposits();

            // Do withdrawals

            let encodedWithdraw2 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveCRVCryptoETH", weth.address , weth.address, 7000, false)
            await executeVote([encodedWithdraw2])
            await VoteExecutorSlave.executeDeposits();
            console.log(await weth.balanceOf(VoteExecutorSlave.address), "THis is the current balance")
            expect(Number(await weth.balanceOf(VoteExecutorSlave.address))).greaterThan(0);
        })
        it("Deposit initial capital WETH. Withdraw and redeposit into the same pool", async function() {

            if (typeof mneumonic !== "string") {
                return
            }
            // Deposit into Frax 3CRV first
            let encodedDeposit1 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveCRVCryptoETH", weth.address , weth.address, parseEther("100"), true)
            await executeVote([encodedDeposit1])
            await VoteExecutorSlave.executeDeposits();


            // Withdraw 100% of the tokens in CurveFrax3CRV and deposit all of it back into CurveCRVCrypto.

            let encodedWithdraw1 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveCRVCryptoETH", weth.address , weth.address, 10000, false)
            let encodedDeposit2 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveCRVCryptoETH", weth.address , weth.address, "99877162419466985437", true)
            await executeVote([encodedWithdraw1, encodedDeposit2])
            await VoteExecutorSlave.executeDeposits();
            console.log(await weth.balanceOf(VoteExecutorSlave.address), "THis is the current balance")
        })

        it("Deposit into CurveRen and CurveCRVCryptoBTC", async function() {
            
            if (typeof mneumonic !== "string") {
                return
            }
            let encodedDeposit1 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveCRVCryptoBTC", wbtc.address , wbtc.address, parseEther("7"), true)
            let encodedDeposit2 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveRen", wbtc.address ,wbtc.address , parseEther("3"), true)
            await executeVote([encodedDeposit1, encodedDeposit2])
            await VoteExecutorSlave.executeDeposits();
        })
        it("Then withdraw some WBTC after an initial deposited state", async function() {

            if (typeof mneumonic !== "string") {
                return
            }
            // Do an intiial deposit
            let encodedDeposit1 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveCRVCryptoBTC", wbtc.address , wbtc.address, parseEther("7"), true)
            let encodedDeposit2 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveRen", wbtc.address ,wbtc.address , parseEther("3"), true)
            await executeVote([encodedDeposit1, encodedDeposit2])
            await VoteExecutorSlave.executeDeposits();
            // Do withdrawals
            let encodedWithdraw1 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveCRVCryptoBTC", wbtc.address , wbtc.address, 7000, false);
            let encodedWithdraw2 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveRen", wbtc.address , wbtc.address, 5000, false);
           
            await executeVote([encodedWithdraw1, encodedWithdraw2])
            await VoteExecutorSlave.executeDeposits();
            console.log(await wbtc.balanceOf(VoteExecutorSlave.address), "THis is the current balance")
            expect(Number(await wbtc.balanceOf(VoteExecutorSlave.address))).greaterThan(0);
        })
        it("Deposit initial capital in wbtc. Withdraw and reallocate to different pool.", async function() {

            if (typeof mneumonic !== "string") {
                return
            }
            // Deposit into Frax 3CRV first
            let encodedDeposit1 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveCRVCryptoBTC", wbtc.address , wbtc.address, parseEther("10"), true)
            await executeVote([encodedDeposit1]);
            await VoteExecutorSlave.executeDeposits();


            // Withdraw 100% of the tokens in CurveCRVCryptoBTC and deposit all of it back into CurveRen.

            let encodedWithdraw1 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveCRVCryptoBTC", wbtc.address , wbtc.address, 10000, false);
            let encodedDeposit2 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveRen", wbtc.address ,wbtc.address , parseUnits("998989153", 10), true)
            await executeVote([encodedWithdraw1, encodedDeposit2])
            await VoteExecutorSlave.executeDeposits();
            console.log(await wbtc.balanceOf(VoteExecutorSlave.address), "THis is the current balance")
        })
        
     })


    describe("Tests for combination of token deposits and withdrawals", function() {
        it("Deposit into every single pool for USDC, EURT, WETH, WBTC", async function() {
             
            if (typeof mneumonic !== "string") {
                return
            }
            let encodedDeposit1 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveEurtUSD", eurt.address , eurt.address, parseEther("700000"), true)
            let encodedDeposit2 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveEurt", eurt.address ,eurt.address , parseEther("300000"), true)
            let encodedDeposit3 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveFrax3CRV", usdc.address, frax.address, parseEther("700000"), true)
            let encodedDeposit4 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveCRVCrypto", usdc.address, usdt.address, parseEther("300000"), true)
            let encodedDeposit5 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveCRVCryptoETH", weth.address , weth.address, parseEther("100"), true)
            let encodedDeposit6 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveCRVCryptoBTC", wbtc.address , wbtc.address, parseEther("7"), true)
            let encodedDeposit7 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveRen", wbtc.address ,wbtc.address , parseEther("3"), true)
            await executeVote([encodedDeposit1, encodedDeposit2, encodedDeposit3, encodedDeposit4, encodedDeposit5, encodedDeposit6, encodedDeposit7])
            await VoteExecutorSlave.executeDeposits();
        })
        it("Then withdraw some after an initial deposited state", async function() {

            if (typeof mneumonic !== "string") {
                return
            }
            // Do an intiial deposit
            let encodedDeposit1 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveEurtUSD", eurt.address , eurt.address, parseEther("700000"), true)
            let encodedDeposit2 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveEurt", eurt.address ,eurt.address , parseEther("300000"), true)
            let encodedDeposit3 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveFrax3CRV", usdc.address, frax.address, parseEther("700000"), true)
            let encodedDeposit4 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveCRVCrypto", usdc.address, usdt.address, parseEther("300000"), true)
            let encodedDeposit5 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveCRVCryptoETH", weth.address , weth.address, parseEther("100"), true)
            let encodedDeposit6 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveCRVCryptoBTC", wbtc.address , wbtc.address, parseEther("7"), true)
            let encodedDeposit7 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveRen", wbtc.address ,wbtc.address , parseEther("3"), true)
            await executeVote([encodedDeposit1, encodedDeposit2, encodedDeposit3, encodedDeposit4, encodedDeposit5, encodedDeposit6, encodedDeposit7])
            await VoteExecutorSlave.executeDeposits();

            // Do withdrawals

            let encodedWithdraw1 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveEurtUSD", eurt.address , eurt.address, 7000, false);
            let encodedWithdraw2 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveEurt", eurt.address , eurt.address, 5000, false);
            let encodedWithdraw3 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveFrax3CRV", usdc.address, frax.address, 7000, false);
            let encodedWithdraw4 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveCRVCrypto", usdc.address, usdt.address, 5000, false);
            let encodedWithdraw5 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveCRVCryptoETH", weth.address , weth.address, 7000, false)
            let encodedWithdraw6 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveCRVCryptoBTC", wbtc.address , wbtc.address, 7000, false);
            let encodedWithdraw7 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveRen", wbtc.address , wbtc.address, 5000, false);
            
            await executeVote([encodedWithdraw1, encodedWithdraw2, encodedWithdraw3, encodedWithdraw4, encodedWithdraw5, encodedWithdraw6, encodedWithdraw7])
            await VoteExecutorSlave.executeDeposits();
            expect(Number(await usdc.balanceOf(VoteExecutorSlave.address))).greaterThan(0);
            expect(Number(await weth.balanceOf(VoteExecutorSlave.address))).greaterThan(0);
            expect(Number(await wbtc.balanceOf(VoteExecutorSlave.address))).greaterThan(0);
            expect(Number(await eurt.balanceOf(VoteExecutorSlave.address))).greaterThan(0);
        })
        it("Deposit initial capital. Withdraw and reallocate to different pool.", async function() {

            if (typeof mneumonic !== "string") {
                return
            }
            // Do an intiial deposit
            let encodedDeposit1 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveEurtUSD", eurt.address , eurt.address, parseEther("1000000"), true)
            let encodedDeposit3 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveFrax3CRV", usdc.address, frax.address, parseEther("1000000"), true)
            let encodedDeposit5 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveCRVCryptoETH", weth.address , weth.address, parseEther("100"), true)
            let encodedDeposit7 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveRen", wbtc.address ,wbtc.address , parseEther("10"), true)
            await executeVote([encodedDeposit1, encodedDeposit3,  encodedDeposit5, encodedDeposit7])
            await VoteExecutorSlave.executeDeposits();

            // Do withdrawals

            let encodedWithdraw1 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveEurtUSD", eurt.address , eurt.address, 10000, false);
            let encodedWithdraw3 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveFrax3CRV", usdc.address, frax.address, 10000, false);
            // Here the issue might be that you have deposited into the same pool.
            // For example, CurveCRVCRyptoETH and CurveCRVCryptoBTC. They are teh same pool. When you withdraw, you must get the proportions correct.
            // However, it is unlikely we deposit different currencies into a single pool.
            // Just to keep it in mind.
            let encodedWithdraw5 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveCRVCryptoETH", weth.address , weth.address, 10000, false)
            let encodedWithdraw6 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveRen", wbtc.address , wbtc.address, 10000, false);
            
            await executeVote([encodedWithdraw1, encodedWithdraw3, encodedWithdraw5, encodedWithdraw6])
            await VoteExecutorSlave.executeDeposits();

            let encodedDeposit2 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveEurt", eurt.address ,eurt.address , parseUnits("996062272781",12), true)
            let encodedDeposit4 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveCRVCrypto", usdc.address, usdt.address, parseUnits("998780852889",12), true)
            encodedDeposit5 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveCRVCryptoETH", weth.address , weth.address, "99898409278027785950", true)
            let encodedDeposit6 = await VoteExecutorSlave.callStatic.encodeLiquidityCommand("CurveCRVCryptoBTC", wbtc.address , wbtc.address,  parseUnits("999797306",10), true)

            // 40 eur loss
            // 12 usd loss
            // 0.10159072197 eth loss --> 200 usd
            // 0.00202694 btc loss  ---> 48.56 usd
            await executeVote([encodedDeposit2, encodedDeposit4,  encodedDeposit5, encodedDeposit6])
            await VoteExecutorSlave.executeDeposits();


        })
    })

 

    async function executeVote(commands: any[]) {
        let commandIndexes = []
        let commandDatas = []
        for (let i=0; i< commands.length; i++) {
            commandIndexes.push(commands[i][0])
            commandDatas.push(commands[i][1])
        }
        let messages = await VoteExecutorSlave.callStatic.encodeAllMessages(commandIndexes, commandDatas);
        let encodedMessages = await VoteExecutorSlave.callStatic.encodeData( messages.messagesHash, messages.messages)
        let sigsArray = [];
        for (let i=0; i<owners.length; i++) {
            let currentOwner = await getImpersonatedSigner(owners[i]);
            let currentSig = await currentOwner.signMessage(ethers.utils.arrayify(messages.messagesHash))
            sigsArray.push(currentSig);
        }
        let entryData = ethers.utils.defaultAbiCoder.encode(["bytes", "bytes[]"], [encodedMessages, sigsArray])
        await expect(VoteExecutorSlave.anyExecute(entryData)).to.emit(VoteExecutorSlave, "MessageReceived").withArgs(messages.messagesHash);
    }

})
