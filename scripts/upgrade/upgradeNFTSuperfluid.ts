import { ethers, upgrades } from "hardhat"

async function main() {
    // const PlaceholderNFTSuperfluid = await ethers.getContractFactory("PlaceholderNFTSuperfluid");
    // const placeholderNFTSuperfluid = await PlaceholderNFTSuperfluid.deploy();
    // console.log("Placeholder deployed at:", placeholderNFTSuperfluid.address);

    let StIbAlluoFactory = await ethers.getContractFactory("StIbAlluo");

    await upgrades.upgradeProxy("0x2efc02e2cdcc1ef699f4af7e98b20f8a2a30923d", StIbAlluoFactory, { unsafeAllow: ["delegatecall"] })
    let newStIbAlluo = await ethers.getContractAt("StIbAlluo", "0x2efc02e2cdcc1ef699f4af7e98b20f8a2a30923d");
    await newStIbAlluo.setPlaceholderNFT("0xDDb818F58AC599f77F2a18E9B53Fe7Cf4DCFe5D3")

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
