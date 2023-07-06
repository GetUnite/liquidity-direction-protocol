import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

import { expect } from "chai";
import { ExchangePriceOracle } from "../../typechain-types";

describe("Exchange Price Oracle Test", async () => {
    let signers: SignerWithAddress[];
    let oracle: ExchangePriceOracle;

    before(async () => {
        signers = await ethers.getSigners();
    })

    beforeEach(async () => {
        const factory = await ethers.getContractFactory("ExchangePriceOracle");
        oracle = await factory.deploy();
    })

    it("Should grant roles to the deployer of the contract", async () => {
        // Manager of the roles
        expect(
            await oracle.hasRole(
                await oracle.DEFAULT_ADMIN_ROLE(),
                signers[0].address
            )
        ).to.be.true;

        // Addresses who can request prices
        expect(
            await oracle.hasRole(
                await oracle.PRICE_REQUESTER_ROLE(),
                signers[0].address
            )
        ).to.be.true;

        // Addresses who can submit prices
        expect(
            await oracle.hasRole(
                await oracle.ORACLE_ROLE(),
                signers[0].address
            )
        ).to.be.true;
    })

    it("Should request original price", async () => {
        const fromToken = "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063";
        const toToken = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";

        const tx = await oracle.requestPrice(fromToken, toToken);

        await expect(tx).to.emit(oracle, "PriceRequested").withArgs(fromToken, toToken);
    })

    it("Should request reversed price", async () => {
        const fromToken = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
        const toToken = "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063";

        const tx = await oracle.requestPrice(fromToken, toToken);

        await expect(tx).to.emit(oracle, "PriceRequested").withArgs(toToken, fromToken);
    })

    it("Should not emit a request event if fromToken == toToken", async () => {
        const fromToken = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";

        const tx = await oracle.requestPrice(fromToken, fromToken);

        await expect(tx).to.not.emit(oracle, "PriceRequested")
    });

    it("Should revert price request if requester doesn't have PRICE_REQUESTER_ROLE", async () => {
        const fromToken = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
        const toToken = "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063";
        const signer = signers[1];

        const tx = oracle.connect(signer).requestPrice(fromToken, toToken);

        await expect(tx).to.be.revertedWith(
            `AccessControl: account ${signer.address.toLowerCase()} is missing role ${await oracle.PRICE_REQUESTER_ROLE()}`
        );
    })

    it("Should submit price", async () => {
        const fromToken = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
        const toToken = "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063";
        const result = ethers.utils.parseEther("1.0");
        const decimals = 18;

        const tx = await oracle.submitPrice(
            fromToken,
            toToken,
            result,
            decimals
        );
        const txReceipt = await tx.wait();
        const block = await ethers.provider.getBlock(txReceipt.blockNumber);

        const submittedPrices = await oracle.submittedPrices(fromToken, toToken);

        expect(submittedPrices.result).to.be.equal(result);
        expect(submittedPrices.decimals).to.be.equal(decimals);
        expect(submittedPrices.timestamp).to.be.equal(block.timestamp);
    })

    it("Should revert price submission if submitter doesn't have ORACLE_ROLE", async () => {
        const fromToken = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
        const toToken = "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063";
        const result = ethers.utils.parseEther("1.0");
        const decimals = 18;
        const signer = signers[1];

        const tx = oracle.connect(signer).submitPrice(
            fromToken,
            toToken,
            result,
            decimals
        );

        await expect(tx).to.be.revertedWith(
            `AccessControl: account ${signer.address.toLowerCase()} is missing role ${await oracle.ORACLE_ROLE()}`
        );
    })

    it("Should return original price", async () => {
        const fromToken = "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063";
        const toToken = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
        const result = ethers.utils.parseEther("1.0");
        const decimals = 18;

        const tx = await oracle.submitPrice(
            fromToken,
            toToken,
            result,
            decimals
        );
        const txReceipt = await tx.wait();
        const block = await ethers.provider.getBlock(txReceipt.blockNumber);

        const price = await oracle.priceRequests(fromToken, toToken);
        
        expect(price.result).to.be.equal(result);
        expect(price.decimals).to.be.equal(decimals);
        expect(price.timestamp).to.be.equal(block.timestamp);
    })

    it("Should return reversed price", async () => {
        const fromToken = "0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063";
        const toToken = "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174";
        const result = ethers.utils.parseEther("1.25");
        const reversedResult = ethers.utils.parseEther("0.8");
        const decimals = 18;

        const tx = await oracle.submitPrice(
            fromToken,
            toToken,
            result,
            decimals
        );
        const txReceipt = await tx.wait();
        const block = await ethers.provider.getBlock(txReceipt.blockNumber);

        const price = await oracle.priceRequests(toToken, fromToken);

        expect(price.result).to.be.equal(reversedResult);
        expect(price.decimals).to.be.equal(decimals);
        expect(price.timestamp).to.be.equal(block.timestamp);
    })
})