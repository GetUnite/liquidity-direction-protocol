import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { AlluoUpgradeableBase, AlluoUpgradeableBaseMock, AlluoUpgradeableBaseMock__factory, AlluoUpgradeableBase__factory } from "../typechain-types";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("AlluoUpgradeableBase Tests", function () {
    let alluoUpgradeableBase: AlluoUpgradeableBaseMock;
    let signers: SignerWithAddress[];
    beforeEach(async () => {
        const alluoUpgradeableBaseFactory = await ethers.getContractFactory(
            "AlluoUpgradeableBaseMock"
        );
        alluoUpgradeableBase = (await upgrades.deployProxy(alluoUpgradeableBaseFactory, [], {
            initializer: "__AlluoUpgradeableBase_init",
        })) as AlluoUpgradeableBaseMock;

        signers = await ethers.getSigners();
        await alluoUpgradeableBase.grantDefaultAdminRole(signers[0].address);
    });

    describe("Access Control", function () {
        it("Should have UPGRADER_ROLE and GELATO_ROLE predefined", async function () {
            expect(await alluoUpgradeableBase.UPGRADER_ROLE()).to.equal(ethers.utils.keccak256(ethers.utils.toUtf8Bytes("UPGRADER_ROLE")));
            expect(await alluoUpgradeableBase.GELATO_ROLE()).to.equal(ethers.utils.keccak256(ethers.utils.toUtf8Bytes("GELATO_ROLE")));
        });

        it("Should allow granting UPGRADER_ROLE and GELATO_ROLE", async function () {

            await alluoUpgradeableBase.grantRole(await alluoUpgradeableBase.UPGRADER_ROLE(), signers[0].address);
            await alluoUpgradeableBase.grantRole(await alluoUpgradeableBase.GELATO_ROLE(), signers[2].address);

            expect(await alluoUpgradeableBase.hasRole(await alluoUpgradeableBase.UPGRADER_ROLE(), signers[0].address)).to.be.true;
            expect(await alluoUpgradeableBase.hasRole(await alluoUpgradeableBase.GELATO_ROLE(), signers[2].address)).to.be.true;
        });

        it("Should revert if trying to grant DEFAULT_ADMIN_ROLE to a non-contract address", async function () {
            await expect(
                alluoUpgradeableBase.grantRole(await alluoUpgradeableBase.DEFAULT_ADMIN_ROLE(), signers[1].address)
            ).to.be.revertedWith("Not contract");
        });
    });

    describe("Upgradeability", function () {
        it("Should have the initial upgradeStatus set to false", async function () {
            expect(await alluoUpgradeableBase.upgradeStatus()).to.be.false;
        });

        it("Should allow changing upgradeStatus only by DEFAULT_ADMIN_ROLE", async function () {
            await alluoUpgradeableBase.changeUpgradeStatus(true);
            expect(await alluoUpgradeableBase.upgradeStatus()).to.be.true;
        });


        it("Should revert if trying to change upgradeStatus without DEFAULT_ADMIN_ROLE", async function () {

            const DEFAULT_ADMIN_ROLE = await alluoUpgradeableBase.DEFAULT_ADMIN_ROLE();
            await expect(alluoUpgradeableBase.connect(signers[1]).changeUpgradeStatus(true)).to.be.revertedWith(
                "AccessControl: account " + signers[1].address.toLowerCase() + " is missing role " + String(DEFAULT_ADMIN_ROLE)
            );
        });
        /* ----------------------- UPGRADES ------------------------- */

        it("Should revert if trying to upgrade without UPGRADER_ROLE", async function () {

            const UPGRADER_ROLE = await alluoUpgradeableBase.UPGRADER_ROLE();

            await expect(alluoUpgradeableBase.connect(signers[0]).upgradeTo(signers[2].address)).to.be.revertedWith(
                "AccessControl: account " + signers[0].address.toLowerCase() + " is missing role " + String(UPGRADER_ROLE)
            );


        });

        it("Should allow upgrade if user has UPGRADER_ROLE", async function () {

            const UPGRADER_ROLE = await alluoUpgradeableBase.UPGRADER_ROLE();
            const alluoUpgradeableBaseFactory = await ethers.getContractFactory(
                "AlluoUpgradeableBaseMock"
            );
            const newImplementation = await alluoUpgradeableBaseFactory.deploy();

            await alluoUpgradeableBase.grantRole(UPGRADER_ROLE, signers[0].address);
            await alluoUpgradeableBase.connect(signers[0]).changeUpgradeStatus(true);
            await alluoUpgradeableBase.connect(signers[0]).upgradeTo(newImplementation.address);
        });

        /* ----------------------- ROLES ------------------------- */

        it("Should grant and revoke GELATO_ROLE correctly", async function () {

            const GELATO_ROLE = await alluoUpgradeableBase.GELATO_ROLE();

            await alluoUpgradeableBase.grantRole(GELATO_ROLE, signers[0].address);
            expect(await alluoUpgradeableBase.hasRole(GELATO_ROLE, signers[0].address)).to.be.true;

            await alluoUpgradeableBase.revokeRole(GELATO_ROLE, signers[0].address);
            expect(await alluoUpgradeableBase.hasRole(GELATO_ROLE, signers[0].address)).to.be.false;
        });

        it("Should revert if trying to grant DEFAULT_ADMIN_ROLE to a non-contract address", async function () {

            const DEFAULT_ADMIN_ROLE = await alluoUpgradeableBase.DEFAULT_ADMIN_ROLE();

            await expect(alluoUpgradeableBase.grantRole(DEFAULT_ADMIN_ROLE, signers[0].address)).to.be.revertedWith("Not contract");
        });

        /* ----------------------- UPGRADE STATUS ------------------------- */

        it("Should change upgrade status correctly", async function () {

            await alluoUpgradeableBase.changeUpgradeStatus(true);
            expect(await alluoUpgradeableBase.upgradeStatus()).to.be.true;

            await alluoUpgradeableBase.changeUpgradeStatus(false);
            expect(await alluoUpgradeableBase.upgradeStatus()).to.be.false;
        });
    });

})