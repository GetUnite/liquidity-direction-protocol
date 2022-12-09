import { ethers, upgrades } from "hardhat";

async function main() {
    const vlAlluoFactory = await ethers.getContractFactory("AlluoLockedV4");
    const cvxDistributorFactory = await ethers.getContractFactory("CvxDistributor");

    const vlAlluoAddress = "0xdEBbFE665359B96523d364A19FceC66B0E43860D";
    const cvxDistributorAddress = "0xc22DB2874725B84e99EC0a644fdD042EA3F6F899";

    await upgrades.upgradeProxy(
        vlAlluoAddress,
        vlAlluoFactory
    );

    await upgrades.upgradeProxy(
        cvxDistributorAddress,
        cvxDistributorFactory
    );
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
})