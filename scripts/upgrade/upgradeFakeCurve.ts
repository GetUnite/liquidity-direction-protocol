import { ethers, upgrades } from "hardhat"

async function main() {


    const Buffer = await ethers.getContractFactory("FakeCurve");
    const oldBuffer = await ethers.getContractFactory("FakeCurveOld");

    await upgrades.forceImport("0x13D2Cc840FC599F1c3B260e6F7CcA6D141db8da2", oldBuffer);

    await upgrades.upgradeProxy('0x13D2Cc840FC599F1c3B260e6F7CcA6D141db8da2', Buffer);
    console.log('FakeCurve upgraded');

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });