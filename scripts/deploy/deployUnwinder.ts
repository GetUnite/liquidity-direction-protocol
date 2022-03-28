import { ethers } from "hardhat"

async function main() {
    const strategy = "0xa248Ba96d72005114e6C941f299D315757877c0e";
    const exchange = "0x29c66CF57a03d41Cfe6d9ecB6883aa0E2AbA21Ec";
    const gnosis = "0x1F020A4943EB57cd3b2213A66b355CB662Ea43C3";
    const voteExecutor = "0x85adEF77325af70AC8922195fB6010ce5641d739";

    const Unwinder = await ethers.getContractFactory("Unwinder");
    const unwinder = await Unwinder.deploy(strategy, exchange, gnosis, voteExecutor, false);

    console.log("Unwinder deployed:", unwinder.address);
    console.log("Grant DEFAULT_ADMIN_ROLE to Unwinder on VoteExecutor and Strategy.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });