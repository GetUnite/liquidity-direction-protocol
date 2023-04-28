import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { AlluoVoteExecutorUtils, PseudoMultisigWallet, VoteExecutorMasterLog } from "../../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { mine, reset } from "@nomicfoundation/hardhat-network-helpers";

describe("AlluoVoteExecutorUtils Tests", function () {
    let alluoVoteExecutorUtils: AlluoVoteExecutorUtils;
    let signers: SignerWithAddress[];
    let admin: SignerWithAddress;
    beforeEach(async () => {
        const alluoVoteExecutorUtilsFactory = await ethers.getContractFactory("AlluoVoteExecutorUtils");
        signers = await ethers.getSigners();
        admin = signers[0];
        alluoVoteExecutorUtils = (await upgrades.deployProxy(alluoVoteExecutorUtilsFactory, [
            ethers.constants.AddressZero,
            ethers.constants.AddressZero,
            admin.address
        ], {
            initializer: "initialize"
        })) as AlluoVoteExecutorUtils;
    });

    it("Should set storage addresses correctly", async () => {
        expect(await alluoVoteExecutorUtils.strategyHandler()).to.equal(ethers.constants.AddressZero);
        expect(await alluoVoteExecutorUtils.voteExecutor()).to.equal(ethers.constants.AddressZero);

        const strategyHandler = signers[1].address;
        const voteExecutor = signers[2].address;

        await alluoVoteExecutorUtils.connect(admin).setStorageAddresses(strategyHandler, voteExecutor);


    })

    it("Should return true if number is within (ABOVE) slippage tolerance", async () => {
        let slippageTolerance = 100; // This is 1%
        let number = 1005;
        let numberToCompare = 1004
        expect(await alluoVoteExecutorUtils.isWithinSlippageTolerance(number, numberToCompare, slippageTolerance)).to.equal(true);
    })
    it("Should return true if number is within (BELOW) slippage tolerance", async () => {
        let slippageTolerance = 100; // This is 1%
        let number = 1005;
        let numberToCompare = 1006
        expect(await alluoVoteExecutorUtils.isWithinSlippageTolerance(number, numberToCompare, slippageTolerance)).to.equal(true);
    });

    it("Should return false if number is not within (ABOVE) slippage tolerance", async () => {
        let slippageTolerance = 100; // This is 1%
        let number = 1005;
        let numberToCompare = 1300
        expect(await alluoVoteExecutorUtils.isWithinSlippageTolerance(number, numberToCompare, slippageTolerance)).to.equal(false);
    })

    it("Should return false if number is not within (BELOW) slippage tolerance", async () => {
        let slippageTolerance = 100; // This is 1%
        let number = 1005;
        let numberToCompare = 700
        expect(await alluoVoteExecutorUtils.isWithinSlippageTolerance(number, numberToCompare, slippageTolerance)).to.equal(false);
    });

    it("Should return true if the timestamp has been updated within the period", async () => {
        // get ethers block timestamp
        let timestamp = (await ethers.provider.getBlock("latest")).timestamp
        let period = 100;
        expect(await alluoVoteExecutorUtils.timestampLastUpdatedWithinPeriod(timestamp, period)).to.equal(true);
    })
    it("Should return false if the timestamp has not been updated within the period", async () => {
        // get ethers block timestamp
        let timestamp = (await ethers.provider.getBlock("latest")).timestamp
        // fast forward so that blocktimestamp is outside
        await mine(1000);
        let period = 100;
        expect(await alluoVoteExecutorUtils.timestampLastUpdatedWithinPeriod(timestamp, period)).to.equal(false);
    })

    it("Should encode the APY command correctly", async () => {
        let iballuoName = "iballuo";
        let apy = 1000;
        let newInterestPerSecond = 100000;
        let encodedCommand = await alluoVoteExecutorUtils.encodeApyCommand(iballuoName, apy, newInterestPerSecond);
        expect(encodedCommand[0]).to.equal(0);
        // Decode using ethers
        let decodedCommand = ethers.utils.defaultAbiCoder.decode(["string", "uint256", "uint256"], encodedCommand[1]);
        expect(decodedCommand).to.deep.equal([iballuoName, apy, newInterestPerSecond]);
    })
    it("Should encode the mint command correctly", async () => {
        let newMintAmount = 1000;
        let period = 10000
        let encodedCommand = await alluoVoteExecutorUtils.encodeMintCommand(newMintAmount, period);
        expect(encodedCommand[0]).to.equal(1);
        // Decode using ethers
        let decodedCommand = ethers.utils.defaultAbiCoder.decode(["uint256", "uint256"], encodedCommand[1]);
        expect(decodedCommand).to.deep.equal([newMintAmount, period]);
    })

    // it("Should encode the liquidity command correctly", async () => {
    //     // Todo
    // })

    it("Should encode the Treasury Allocation change command (+ve)", async () => {
        let delta = 300;
        let encodedCommand = await alluoVoteExecutorUtils.encodeTreasuryAllocationChangeCommand(delta);
        expect(encodedCommand[0]).to.equal(3);
        // Decode using ethers
        let decodedCommand = ethers.utils.defaultAbiCoder.decode(["uint256"], encodedCommand[1]);
        expect(decodedCommand).to.deep.equal([delta]);
    });
    it("Should encode the Treasury Allocation change command (-ve)", async () => {
        let delta = "-300";
        let encodedCommand = await alluoVoteExecutorUtils.encodeTreasuryAllocationChangeCommand(delta);
        expect(encodedCommand[0]).to.equal(3);
        // Decode using ethers
        let decodedCommand = ethers.utils.defaultAbiCoder.decode(["int128"], encodedCommand[1]);
        expect(decodedCommand).to.deep.equal([delta]);
    });

    it("Should encode TVL command correctly", async () => {
        let executorBalances = [["100", "200", "300"], ["400", "500", "600"], ["700", "800", "900"]];
        let encodedCommand = await alluoVoteExecutorUtils.encodeTvlCommand(executorBalances);
        expect(encodedCommand[0]).to.equal(4);
        // Decode using ethers
        let decodedCommand = ethers.utils.defaultAbiCoder.decode(["uint256[][]"], encodedCommand[1]);
        expect(decodedCommand).to.deep.equal([executorBalances]);
    })

    it("Should return true when we sign a message and check that getSignerAddress returns the correct signer address", async () => {
        // First use signers[0] to sign a message
        let message = "Hello World"
        let messagesHash = ethers.utils.solidityKeccak256(["string"], [message])
        let signature = await signers[0].signMessage(ethers.utils.arrayify(messagesHash));
        // Now check the view functions
        expect(await alluoVoteExecutorUtils.getSignerAddress(messagesHash, signature)).to.equal(signers[0].address);
    })

    it("Should return false when we sign a message and check that getSignerAddress returns the correct signer address", async () => {
        // First use signers[0] to sign a message
        let message = "Hello World"
        let messagesHash = ethers.utils.solidityKeccak256(["string"], [message])

        let signature = await signers[1].signMessage(ethers.utils.arrayify(messagesHash));
        // Now check the view functions
        expect(await alluoVoteExecutorUtils.getSignerAddress(messagesHash, signature)).to.not.equal(signers[0].address);
    })

    it("Should return true when we verify the message and signature", async () => {
        // First use signers[0] to sign a message
        let message = "Hello World"
        let messagesHash = ethers.utils.solidityKeccak256(["string"], [message])

        let signature = await signers[0].signMessage(ethers.utils.arrayify(messagesHash));
        // Now check the view functions
        expect(await alluoVoteExecutorUtils.verify(messagesHash, signature, signers[0].address)).to.equal(true);
    })
    it("Should return false if the data and signature do not reflect each other but the signer is correct", async () => {
        // First use signers[0] to sign a message
        let message = "Hello World"
        let messagesHash = ethers.utils.solidityKeccak256(["string"], [message])
        let signature = await signers[0].signMessage(ethers.utils.arrayify(messagesHash));
        let fakeMessage = "Hello World 2";
        let fakeMessageHash = ethers.utils.solidityKeccak256(["string"], [fakeMessage])

        // Now check the view functions
        expect(await alluoVoteExecutorUtils.verify(fakeMessageHash, signature, signers[0].address)).to.equal(false);
    });
    it("Should return false if the data and signature do  reflect each other but the signer is incorrect", async () => {
        // First use signers[0] to sign a message
        let message = "Hello World"
        let messagesHash = ethers.utils.solidityKeccak256(["string"], [message])
        let signature = await signers[0].signMessage(ethers.utils.arrayify(messagesHash));
        // Now check the view functions
        expect(await alluoVoteExecutorUtils.verify(messagesHash, signature, signers[1].address)).to.equal(false);
    });


    it("Should return false if the data and signature do not reflect each other and the signer is  correct", async () => {
        // First use signers[0] to sign a message
        let message = "Hello World"
        let messagesHash = ethers.utils.solidityKeccak256(["string"], [message])
        let signature = await signers[0].signMessage(ethers.utils.arrayify(messagesHash));
        let fakeMessage = "Hello World 2";
        let fakeMessageHash = ethers.utils.solidityKeccak256(["string"], [fakeMessage])

        // Now check the view functions
        expect(await alluoVoteExecutorUtils.verify(fakeMessageHash, signature, signers[1].address)).to.equal(false);
    });

    it("Check unique signature returns false if it is unqiue", async () => {
        let signersArray = [signers[0].address, signers[1].address, signers[2].address]
        expect(await alluoVoteExecutorUtils.checkUniqueSignature(signersArray, signersArray[0])).to.equal(false);
    })

    it("Check unique signature returns true if it is not unqiue", async () => {
        let signersArray = [signers[0].address, signers[1].address, signers[2].address]
        expect(await alluoVoteExecutorUtils.checkUniqueSignature(signersArray, signers[5].address)).to.equal(true);
    })



})

describe("Tests with forks", async () => {
    let strategyHandler;
    let voteExecutor: VoteExecutorMasterLog;
    let alluoVoteExecutorUtils: AlluoVoteExecutorUtils;
    let signers: SignerWithAddress[];
    let admin: SignerWithAddress;
    let pseudoMultiSig: PseudoMultisigWallet;
    beforeEach(async () => {
        // Fork ethereum mainnet
        await reset(process.env.MAINNET_FORKING_URL, 17121936)
        // Deploy the contract with correct params
        const alluoVoteExecutorUtilsFactory = await ethers.getContractFactory("AlluoVoteExecutorUtils");
        signers = await ethers.getSigners();
        admin = await ethers.getImpersonatedSigner("0x1F020A4943EB57cd3b2213A66b355CB662Ea43C3");
        strategyHandler = await ethers.getContractAt("StrategyHandler", "0x385AB598E7DBF09951ba097741d2Fa573bDe94A5");

        // Deploy the pseudoMultisigWallet
        const pseudoMultiSigFactory = await ethers.getContractFactory("PseudoMultisigWallet");
        pseudoMultiSig = await pseudoMultiSigFactory.deploy(true) as PseudoMultisigWallet;
        voteExecutor = await ethers.getContractAt("VoteExecutorMasterLog", "0x82e568C482dF2C833dab0D38DeB9fb01777A9e89") as VoteExecutorMasterLog;
        alluoVoteExecutorUtils = (await upgrades.deployProxy(alluoVoteExecutorUtilsFactory, [
            strategyHandler.address,
            voteExecutor.address,
            admin.address
        ], {
            initializer: "initialize"
        })) as AlluoVoteExecutorUtils;
    })

    it("Should revert if we try to getDirectionIdByName for a non-existent direction", async () => {
        await expect(alluoVoteExecutorUtils.getDirectionIdByName("Fake Direction")).to.be.reverted;
    })
    it("Should return the correct id for a direction", async () => {
        expect(await alluoVoteExecutorUtils.getDirectionIdByName("Curve/Convex Mim+3CRV")).to.equal(1);
    })

    it("Should correctly encodeLiqudidityCommand", async () => {
        let codeName = "Curve/Convex Mim+3CRV";
        let percent = 10000;
        let commandEncoded = await alluoVoteExecutorUtils.encodeLiquidityCommand(codeName, percent);
        expect(commandEncoded[0]).to.equal(2);
        // Decode with ethers
        let decoded = ethers.utils.defaultAbiCoder.decode(["uint256", "uint256"], commandEncoded[1]);
        expect(decoded[0]).to.equal(1);
        expect(decoded[1]).to.equal(10000);
    })



    it("Should be able to encodeAllMessages", async () => {
        let codeName = "Curve/Convex Mim+3CRV";
        let percent = 10000;
        let encodedCommand1 = await alluoVoteExecutorUtils.encodeLiquidityCommand(codeName, percent);

        let delta = "-300";
        let encodedCommand2 = await alluoVoteExecutorUtils.encodeTreasuryAllocationChangeCommand(delta);


        let newMintAmount = 1000;
        let period = 10000
        let encodedCommand3 = await alluoVoteExecutorUtils.encodeMintCommand(newMintAmount, period);


        let allEncoded = await alluoVoteExecutorUtils.encodeAllMessages([encodedCommand1[0], encodedCommand2[0], encodedCommand3[0]], [encodedCommand1[1], encodedCommand2[1], encodedCommand3[1]]);
        expect(allEncoded[1].length).to.equal(3);
    })

    it("Should be able to submitData from admin", async () => {
        let codeName = "Curve/Convex Mim+3CRV";
        let percent = 10000;
        let encodedCommand1 = await alluoVoteExecutorUtils.encodeLiquidityCommand(codeName, percent);

        let delta = "-300";
        let encodedCommand2 = await alluoVoteExecutorUtils.encodeTreasuryAllocationChangeCommand(delta);


        let newMintAmount = 1000;
        let period = 10000
        let encodedCommand3 = await alluoVoteExecutorUtils.encodeMintCommand(newMintAmount, period);


        let allEncoded = await alluoVoteExecutorUtils.encodeAllMessages([encodedCommand1[0], encodedCommand2[0], encodedCommand3[0]], [encodedCommand1[1], encodedCommand2[1], encodedCommand3[1]]);

        // Grant role from master to this contract
        await voteExecutor.connect(admin).grantRole(await voteExecutor.DEFAULT_ADMIN_ROLE(), alluoVoteExecutorUtils.address);
        expect(await alluoVoteExecutorUtils.connect(admin).submitData(allEncoded[2])).to.not.be.reverted;
    })

    it("Should not revert if the number of signatures is greater than the threshold", async () => {

        // Signer[0] is the only one in the fake gnosis. Encode data first.
        let codeName = "Curve/Convex Mim+3CRV";
        let percent = 10000;
        let encodedCommand1 = await alluoVoteExecutorUtils.encodeLiquidityCommand(codeName, percent);
        let delta = "-300";
        let encodedCommand2 = await alluoVoteExecutorUtils.encodeTreasuryAllocationChangeCommand(delta);
        let newMintAmount = 1000;
        let period = 10000
        let encodedCommand3 = await alluoVoteExecutorUtils.encodeMintCommand(newMintAmount, period);
        let allEncoded = await alluoVoteExecutorUtils.encodeAllMessages([encodedCommand1[0], encodedCommand2[0], encodedCommand3[0]], [encodedCommand1[1], encodedCommand2[1], encodedCommand3[1]]);

        let signature = await signers[0].signMessage(ethers.utils.arrayify(allEncoded[0]));
        expect(await alluoVoteExecutorUtils.checkSignedHashes([signature], allEncoded[0], pseudoMultiSig.address, 1)).to.equal(true);
    })

    it("Should revert if the number of signatures is not greater than the threshold", async () => {

        // Signer[0] is the only one in the fake gnosis. Encode data first.
        let codeName = "Curve/Convex Mim+3CRV";
        let percent = 10000;
        let encodedCommand1 = await alluoVoteExecutorUtils.encodeLiquidityCommand(codeName, percent);
        let delta = "-300";
        let encodedCommand2 = await alluoVoteExecutorUtils.encodeTreasuryAllocationChangeCommand(delta);
        let newMintAmount = 1000;
        let period = 10000
        let encodedCommand3 = await alluoVoteExecutorUtils.encodeMintCommand(newMintAmount, period);
        let allEncoded = await alluoVoteExecutorUtils.encodeAllMessages([encodedCommand1[0], encodedCommand2[0], encodedCommand3[0]], [encodedCommand1[1], encodedCommand2[1], encodedCommand3[1]]);


        let signature = await signers[0].signMessage(ethers.utils.arrayify(allEncoded[0]));
        expect(await alluoVoteExecutorUtils.checkSignedHashes([signature], allEncoded[0], pseudoMultiSig.address, 2)).to.equal(false);
    })

    it("Should revert if the number of signatures is not greater than the threshold (no signature)", async () => {

        // Signer[0] is the only one in the fake gnosis. Encode data first.
        let codeName = "Curve/Convex Mim+3CRV";
        let percent = 10000;
        let encodedCommand1 = await alluoVoteExecutorUtils.encodeLiquidityCommand(codeName, percent);
        let delta = "-300";
        let encodedCommand2 = await alluoVoteExecutorUtils.encodeTreasuryAllocationChangeCommand(delta);
        let newMintAmount = 1000;
        let period = 10000
        let encodedCommand3 = await alluoVoteExecutorUtils.encodeMintCommand(newMintAmount, period);
        let allEncoded = await alluoVoteExecutorUtils.encodeAllMessages([encodedCommand1[0], encodedCommand2[0], encodedCommand3[0]], [encodedCommand1[1], encodedCommand2[1], encodedCommand3[1]]);

        expect(await alluoVoteExecutorUtils.checkSignedHashes([], allEncoded[0], pseudoMultiSig.address, 1)).to.equal(false);
    })

    it("Should revert with 'Hash doesnt Match' if the hash doesnt match", async () => {
        // Signer[0] is the only one in the fake gnosis. Encode data first.
        let codeName = "Curve/Convex Mim+3CRV";
        let percent = 10000;
        let encodedCommand1 = await alluoVoteExecutorUtils.encodeLiquidityCommand(codeName, percent);
        let delta = "-300";
        let encodedCommand2 = await alluoVoteExecutorUtils.encodeTreasuryAllocationChangeCommand(delta);
        let newMintAmount = 1000;
        let period = 10000
        let encodedCommand3 = await alluoVoteExecutorUtils.encodeMintCommand(newMintAmount, period);
        let allEncoded = await alluoVoteExecutorUtils.encodeAllMessages([encodedCommand1[0], encodedCommand2[0], encodedCommand3[0]], [encodedCommand1[1], encodedCommand2[1], encodedCommand3[1]]);

        let signature = await signers[0].signMessage(ethers.utils.arrayify(allEncoded[0]));

        let randomHash = ethers.utils.solidityKeccak256(["string"], ["Hello World"])

        // Encode randomhash, messages, timestamp and the signatures using abi.encode
        let firstPart = ethers.utils.defaultAbiCoder.encode(["bytes32", "tuple(uint256 commandIndex, bytes commandData)[]", "uint256"], [randomHash, allEncoded[1], "10000"]);
        let misconfiguredMessage = ethers.utils.defaultAbiCoder.encode(["bytes", "bytes[]"], [firstPart, [signature]])


        await expect(alluoVoteExecutorUtils.confirmDataIntegrity(misconfiguredMessage, pseudoMultiSig.address, 1)).to.be.revertedWith("Hash doesn't match");
    })

    it("Should revert with 'Hash has not been approved' if there are insufficient signs", async () => {
        // Signer[0] is the only one in the fake gnosis. Encode data first.
        let codeName = "Curve/Convex Mim+3CRV";
        let percent = 10000;
        let encodedCommand1 = await alluoVoteExecutorUtils.encodeLiquidityCommand(codeName, percent);
        let delta = "-300";
        let encodedCommand2 = await alluoVoteExecutorUtils.encodeTreasuryAllocationChangeCommand(delta);
        let newMintAmount = 1000;
        let period = 10000
        let encodedCommand3 = await alluoVoteExecutorUtils.encodeMintCommand(newMintAmount, period);
        let allEncoded = await alluoVoteExecutorUtils.encodeAllMessages([encodedCommand1[0], encodedCommand2[0], encodedCommand3[0]], [encodedCommand1[1], encodedCommand2[1], encodedCommand3[1]]);

        let signature = await signers[0].signMessage(ethers.utils.arrayify(allEncoded[0]));

        // Encode randomhash, messages, timestamp and the signatures using abi.encode
        let misconfiguredMessage = ethers.utils.defaultAbiCoder.encode(["bytes", "bytes[]"], [allEncoded[2], [signature]])


        await expect(alluoVoteExecutorUtils.confirmDataIntegrity(misconfiguredMessage, pseudoMultiSig.address, 2)).to.be.revertedWith("Hash has not been approved");
    })

    it("Should return the message without sign", async () => {
        // Signer[0] is the only one in the fake gnosis. Encode data first.
        let codeName = "Curve/Convex Mim+3CRV";
        let percent = 10000;
        let encodedCommand1 = await alluoVoteExecutorUtils.encodeLiquidityCommand(codeName, percent);
        let delta = "-300";
        let encodedCommand2 = await alluoVoteExecutorUtils.encodeTreasuryAllocationChangeCommand(delta);
        let newMintAmount = 1000;
        let period = 10000
        let encodedCommand3 = await alluoVoteExecutorUtils.encodeMintCommand(newMintAmount, period);
        let allEncoded = await alluoVoteExecutorUtils.encodeAllMessages([encodedCommand1[0], encodedCommand2[0], encodedCommand3[0]], [encodedCommand1[1], encodedCommand2[1], encodedCommand3[1]]);

        let signature = await signers[0].signMessage(ethers.utils.arrayify(allEncoded[0]));

        // Encode randomhash, messages, timestamp and the signatures using abi.encode
        let correctMessage = ethers.utils.defaultAbiCoder.encode(["bytes", "bytes[]"], [allEncoded[2], [signature]])

        expect(await alluoVoteExecutorUtils.confirmDataIntegrity(correctMessage, pseudoMultiSig.address, 1)).to.equal(allEncoded[2])
    })

})