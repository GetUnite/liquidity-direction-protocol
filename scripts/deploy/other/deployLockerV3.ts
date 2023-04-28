import { formatEther, formatUnits } from "ethers/lib/utils";
import { ethers, upgrades } from "hardhat";
import * as readline from 'readline';
import { AlluoLockedV3, AlluoLockedV3__factory } from "../../typechain-types";

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

let locker: AlluoLockedV3

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
    let rewardAtStart = 0;
    await ask("\n Are you sure?");

    console.log("Deploying...")
    const Locker = await ethers.getContractFactory("AlluoLockedV3") as AlluoLockedV3__factory;

    locker = await upgrades.deployProxy(Locker,
        [
            gnosis,
            rewardAtStart
        ],
        { initializer: 'initialize', kind: 'uups' }
    ) as AlluoLockedV3;

    console.log("Deployed at", locker.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });