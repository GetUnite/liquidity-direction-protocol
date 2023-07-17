import { run } from "hardhat";
const verify = async (contractAddress: any) => {
    console.log("Verifying contract...");
    try {
        await run("verify:verify", {
            address: contractAddress,
        });
    } catch (e: any) {
        if (e.message.toLowerCase().includes("already verified")) {
            console.log("Already verified!");
        } else {
            console.log(e);
        }
    }
};

async function main() {
    // Deployed proxies:
    // AlluoVoteExecutorUtils: 0xDD9FC096606Ca0a3D8Be9178959f492c9C23966F
    // AlluoStrategyHandler: 0xca3708D709f1324D21ad2C0fb551CC4a0882FD29
    // AlluoVoteExecutor: 0x3DC877A5a211a082E7c2D64aa816dd079b50AddB
    // BeefyStrategy: 0x525b00E7a3c26948fD9FEA341D9488Cd6aE3C935
    // NullStrategy: 0xc98c8E8fb3Bd0BB029547495DC2AA4185FB807c2
    // OmnivaultStrategy: 0xdA32d82e3b5275424F130612797aDc6EFaB06515
    let contractAddresses = ["0xDD9FC096606Ca0a3D8Be9178959f492c9C23966F", "0xca3708D709f1324D21ad2C0fb551CC4a0882FD29", "0x3DC877A5a211a082E7c2D64aa816dd079b50AddB", "0x525b00E7a3c26948fD9FEA341D9488Cd6aE3C935", "0xc98c8E8fb3Bd0BB029547495DC2AA4185FB807c2", "0xdA32d82e3b5275424F130612797aDc6EFaB06515"];
    for (let i = 0; i < contractAddresses.length; i++) {
        await verify(contractAddresses[i]);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
