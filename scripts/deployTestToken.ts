import { ethers, upgrades } from "hardhat"

async function main() {

    const USDC = await ethers.getContractFactory("USDC");
    const USDT = await ethers.getContractFactory("USDT");
    const DAI = await ethers.getContractFactory("DAI");

    const usdc = await USDC.deploy();
    const usdt = await USDT.deploy();
    const dai = await DAI.deploy();

    await usdc.deployed();
    await usdt.deployed();
    await dai.deployed();

    console.log("USDC:", usdc.address);
    console.log("USDT:", usdt.address);
    console.log("DAI:", dai.address);

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

//npx hardhat run scripts/deployTestToken.ts --network optimisticEthereum
//npx hardhat verify ... --network optimisticEthereum