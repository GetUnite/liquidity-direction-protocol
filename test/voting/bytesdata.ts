import { ethers, network, upgrades } from "hardhat";

async function main() {
    let int128 = ethers.utils.toUtf8Bytes("int128");

    const curvePool = "0xBa3436Fd341F2C8A928452Db3C5A3670d1d5Cc73";
    const poolToken = "0x1aBaEA1f7C830bD89Acc67eC4af516284b1bC33c";
    const poolSize = 2
    const tokenIndexInCurve = 1;
    const convexPoolId = 113;
    const lpToken = "0xBa3436Fd341F2C8A928452Db3C5A3670d1d5Cc73"

    const entry = ethers.utils.defaultAbiCoder.encode(
        ["address", "address ", "address", "uint8", "uint8", "uint256"],
        [curvePool, lpToken, poolToken, poolSize, tokenIndexInCurve, convexPoolId]
    )
    const exit = ethers.utils.defaultAbiCoder.encode(
        ["address", "address", "address", "bytes", "uint8", "uint256"],
        [curvePool, poolToken, lpToken, int128, tokenIndexInCurve, convexPoolId]
    );
    console.log(exit);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });