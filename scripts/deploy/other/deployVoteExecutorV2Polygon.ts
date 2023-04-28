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

    const gnosis = "0x2580f9954529853Ca5aC5543cE39E9B5B1145135";
    const exchange = ethers.constants.AddressZero;

    await ask("\n Are you sure?");

    console.log("Deploying...")
    const VoteExecutor = await ethers.getContractFactory("VoteExecutorV2") as VoteExecutorV2__factory;

    executor = await upgrades.deployProxy(VoteExecutor,
        [
            gnosis,
            exchange,
            []
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