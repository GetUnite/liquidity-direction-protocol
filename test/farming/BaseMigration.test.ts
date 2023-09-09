import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, network, upgrades } from "hardhat";
import { BaseMigration, USDC } from "../../typechain-types";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import * as fs from "fs";
import * as path from "path";
// mobileAppUsersBalances
describe("BaseMigration Tests", function () {
    let signers: SignerWithAddress[];
    let admin: SignerWithAddress;
    let baseMigration: BaseMigration;
    let fakeERC20: USDC;
    let claimAddresses: string[];
    let claimBalances: string[];
    beforeEach(async function () {
        await loadFixture(setupContract)

    });

    async function setupContract() {
        signers = await ethers.getSigners();
        let baseMigrationFactory = await ethers.getContractFactory("BaseMigration");
        let fakeERC20Factory = await ethers.getContractFactory("USDC");
        fakeERC20 = await fakeERC20Factory.deploy();

        // Import json here tec.
        // Get addresses and balances from the JSON
        const { addresses, balances } = getBalancesFromJSON(await fakeERC20.decimals());
        claimAddresses = addresses;
        claimBalances = balances;

        baseMigration = (await upgrades.deployProxy(baseMigrationFactory, [fakeERC20.address, claimAddresses, claimBalances, signers[0].address])) as BaseMigration;
        // Mint 650000 USDC to the contract 
        await fakeERC20.mint(baseMigration.address, ethers.utils.parseUnits("650000", 18));
    }

    function getBalancesFromJSON(tokenDecimals: number): { addresses: string[], balances: string[] } {
        // Read the JSON file
        const filePath = path.join(__dirname, './mobileAppUsersBalances.json');
        const rawData = fs.readFileSync(filePath, 'utf8');

        // Parse the JSON
        const data: { [address: string]: number } = JSON.parse(rawData);

        // Create arrays for addresses and their corresponding balances
        const addresses: string[] = [];
        const balances: string[] = [];

        for (const [address, balance] of Object.entries(data)) {
            addresses.push(address);
            // Convert balance to its proper format and multiply by 10**tokenDecimals
            balances.push(ethers.utils.parseUnits(balance.toFixed(18), tokenDecimals).toString());
        }

        return { addresses, balances };
    }

    describe("Test BaseMigration contract", function () {

        it("Should return true when we verify the message and signature", async () => {
            // First use signers[0] to sign a message
            let message = "Hello World"
            let messagesHash = ethers.utils.solidityKeccak256(["string"], [message])

            let signature = await signers[0].signMessage(ethers.utils.arrayify(messagesHash));
            // Now check the view functions
            expect(await baseMigration.verify(messagesHash, signature, signers[0].address)).to.equal(true);
        })
        it("Should return false if the data and signature do not reflect each other but the signer is correct", async () => {
            // First use signers[0] to sign a message
            let message = "Hello World"
            let messagesHash = ethers.utils.solidityKeccak256(["string"], [message])
            let signature = await signers[0].signMessage(ethers.utils.arrayify(messagesHash));
            let fakeMessage = "Hello World 2";
            let fakeMessageHash = ethers.utils.solidityKeccak256(["string"], [fakeMessage])

            // Now check the view functions
            expect(await baseMigration.verify(fakeMessageHash, signature, signers[0].address)).to.equal(false);
        });
        it("Should return false if the data and signature do  reflect each other but the signer is incorrect", async () => {
            // First use signers[0] to sign a message
            let message = "Hello World"
            let messagesHash = ethers.utils.solidityKeccak256(["string"], [message])
            let signature = await signers[0].signMessage(ethers.utils.arrayify(messagesHash));
            // Now check the view functions
            expect(await baseMigration.verify(messagesHash, signature, signers[1].address)).to.equal(false);
        });


        it("Should return false if the data and signature do not reflect each other and the signer is  correct", async () => {
            // First use signers[0] to sign a message
            let message = "Hello World"
            let messagesHash = ethers.utils.solidityKeccak256(["string"], [message])
            let signature = await signers[0].signMessage(ethers.utils.arrayify(messagesHash));
            let fakeMessage = "Hello World 2";
            let fakeMessageHash = ethers.utils.solidityKeccak256(["string"], [fakeMessage])

            // Now check the view functions
            expect(await baseMigration.verify(fakeMessageHash, signature, signers[1].address)).to.equal(false);
        });

        it("Should allow a user to claim their funds", async () => {
            // Assuming signers[1] has some balance to claim
            let simulatedAddress0 = await ethers.getImpersonatedSigner(claimAddresses[0])

            let initialBalance = await baseMigration.balances(claimAddresses[0]);
            expect(initialBalance).to.be.above(0);

            await baseMigration.connect(simulatedAddress0).claim();

            let newBalance = await baseMigration.balances(simulatedAddress0.address);
            expect(newBalance).to.equal(0);
        });

        // it("Should allow a user to claim on behalf of another user", async () => {
        //     // Assuming signers[2] has some balance to claim
        //     let simulatedAddress0 = await ethers.getImpersonatedSigner(claimAddresses[0])
        //     let simulatedAddress1 = await ethers.getImpersonatedSigner(claimAddresses[1])

        //     let amountToClaim = await baseMigration.balances(simulatedAddress1.address);
        //     expect(amountToClaim).to.be.above(0);

        //     let messageHash = ethers.utils.solidityKeccak256(["address", "uint256"], [simulatedAddress1.address, amountToClaim]);
        //     let signature = await simulatedAddress1.signMessage(ethers.utils.arrayify(messageHash));

        //     await baseMigration.connect(signers[1]).claimOnBehalf(signers[2].address, signature);

        //     let newBalance = await baseMigration.balances(signers[2].address);
        //     expect(newBalance).to.equal(0);
        // });

        it("Should allow the admin to rescue funds", async () => {
            let simulatedAddress0 = await ethers.getImpersonatedSigner(claimAddresses[0])

            let amountToRescue = await baseMigration.balances(simulatedAddress0.address);
            expect(amountToRescue).to.be.above(0);

            await baseMigration.connect(signers[0]).multisigRescue(simulatedAddress0.address);

            let newBalance = await baseMigration.balances(simulatedAddress0.address);
            expect(newBalance).to.equal(0);
        });

        it("Shouldn't allow non-admin to rescue funds", async () => {
            // Trying to rescue using signers[1] which isn't an admin
            let simulatedAddress0 = await ethers.getImpersonatedSigner(claimAddresses[0])

            expect(await baseMigration.connect(signers[1]).multisigRescue(simulatedAddress0.address)).to.be.reverted;
        });
    })

});