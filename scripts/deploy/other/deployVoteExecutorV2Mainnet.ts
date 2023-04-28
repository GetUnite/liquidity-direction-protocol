import { formatEther, formatUnits } from "ethers/lib/utils";
import { ethers, upgrades } from "hardhat";
import * as readline from 'readline';
import { VoteExecutorV2, VoteExecutorV2__factory } from "../../typechain-types";

function ask(query: string): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }))
}

let executor: VoteExecutorV2

async function main() {
    const deployer = (await ethers.getSigners())[0];
    console.log("Network:", (await ethers.provider.getNetwork()).name);
    const gasPrice = await ethers.provider.getGasPrice();
    console.log("Network gas price:", formatUnits(gasPrice, 9), "gwei");
    console.log("Deployer:", deployer.address);
    const balance = await deployer.getBalance();
    console.log("Deployer balance:", formatEther(balance));
    console.log("    that is enough for", balance.div(gasPrice).toString(), "gas");

    const gnosis = "0x1F020A4943EB57cd3b2213A66b355CB662Ea43C3";
    const exchange = "0x29c66CF57a03d41Cfe6d9ecB6883aa0E2AbA21Ec";

    const dai = "0x6b175474e89094c44da98b954eedeac495271d0f";
    const frax = '0x853d955acef822db058eb8505911ed77f175b99e';
    const usdc = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
    const usdt = "0xdAC17F958D2ee523a2206206994597C13D831ec7";

    await ask("\n Are you sure?");

    console.log("Deploying...")
    const VoteExecutor = await ethers.getContractFactory("VoteExecutorV2") as VoteExecutorV2__factory;


    executor = await upgrades.deployProxy(VoteExecutor,
        [
            gnosis,
            exchange,
            [usdc, dai, frax, usdt]
        ],
        { initializer: 'initialize', kind: 'uups' }
    ) as VoteExecutorV2;

    console.log("Deployed at", executor.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });