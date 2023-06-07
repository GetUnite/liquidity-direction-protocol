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
    let contractAddresses = ["0xb26D2B27f75844E5ca8Bf605190a1D8796B38a25", "0x4eaCDBFE57Bd641266Cab20D40174dc76802F955", "0x62cB09739920d071809dFD9B66D2b2cB27141410", "0xA9081414C281De5d0B8c67a1b7a631332e259850"];
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


