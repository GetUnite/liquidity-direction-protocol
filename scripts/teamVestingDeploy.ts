import { ethers } from "hardhat"
import { TeamVesting__factory } from "../typechain/factories/TeamVesting__factory";

async function main() {
    const tokenAddress = "0x9f39be4eb1821ec25b393551cf288cce0ea202af";

    const Token = await ethers.getContractFactory("TeamVesting") as TeamVesting__factory;
    const token = await Token.deploy(tokenAddress);
    await token.deployed();
    console.log("Investors vesting deployed to:", token.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });