import {ethers} from "hardhat"

async function main() {
    const buffer = await ethers.getContractAt("BufferManager", "0xeDc37a63d74d2AB5C66067f979Cef378b4E3E591")
    const gnosis = await ethers.getContractAt("GnosisMock", "0x466b375cE0D1161aEb3e69f92B2B9c365f7877BE");
    
    const calldata = buffer.interface.encodeFunctionData(
        "grantRole",
        [
            await buffer.GELATO(),
            "0x7186d592355f6b7f88b7feba9c88296690d75a73"
        ]
       
    )

    await gnosis.execute(buffer.address, 0, calldata);

}
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
})