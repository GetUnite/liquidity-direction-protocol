import { task } from "hardhat/config";
import "@typechain/hardhat";
import readline from 'readline';
import { ActionType, HardhatRuntimeEnvironment } from "hardhat/types";
import { UrgentAlluoLp, UrgentAlluoLp__factory } from "../typechain";

function ask(query: string) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }))
}

async function template(hre: HardhatRuntimeEnvironment, action: () => Promise<void>) {
    console.log("================= START =================");
    const accounts = await hre.ethers.getSigners();
    const sender = accounts[0];
    const balance = await sender.getBalance();
    const networkName = hre.network.name;
    console.log("Sender address: ", sender.address);
    console.log("Sender balance: ", hre.ethers.utils.formatEther(balance));
    console.log("Network:", networkName);
    if (networkName == "maticmainnet" || networkName == "mainnet") {
        console.log();
        console.log("WARNING - Mainnet selected!!!");
        console.log("WARNING - Mainnet selected!!!");
        console.log("WARNING - Mainnet selected!!!");
        console.log();
        await ask(`Confirm working in mainnet. Ctrl + C to abort.`);
        console.log("Good luck.");
    }
    else {
        await ask("Is sender and network ok?");
    }

    await action();

    console.log("================== END ==================");
}

task("deploy-lp", "Deploy UrgentAlluoLp contract to the blockchain")
    .addParam("multisig", "Address of multisignature wallet that will become admin of contract")
    .addParam("token", "Token that is going to be accepted and transfered to multisig wallet")
    .setAction(async (taskArgs, hre) => {
        await template(hre, async () => {
            const AlluoLP = await hre.ethers.getContractFactory("UrgentAlluoLp") as UrgentAlluoLp__factory;
            const alluoLp = await AlluoLP.deploy(taskArgs.multisig, taskArgs.token) as UrgentAlluoLp;

            if (hre.network.name != "matictestnet") {
                console.log("AlluoLP address", alluoLp.address);
            }
            else {
                console.log(`Deployed. Check your account on https://mumbai.polygonscan.com/address/${(await hre.ethers.getSigners())[0].address}`);
            }
        })
    });