import { defaultAbiCoder } from "ethers/lib/utils";
import { ethers, network } from "hardhat";

async function main() {
    await network.provider.request({
        method: "hardhat_reset",
        params: [{
            //chainId: 1,
            forking: {
                enabled: true,
                jsonRpcUrl: process.env.MAINNET_FORKING_URL as string,
                //you can fork from the last block by commenting next line
                blockNumber: 15181536,
            },
        },],
    });

    const oldVlAlluo = await ethers.getContractAt("AlluoLockedV3", "0xF295EE9F1FA3Df84493Ae21e08eC2e1Ca9DebbAf");

    const to = "0xFc57eBe6d333980E620A923B6edb78fc7FB5cC3f";
    let info;
    try {
        info = await oldVlAlluo.callStatic.getInfoByAddress(to);
    } catch (error: any) {
        const result: string = error.data;
        info = defaultAbiCoder.decode(
            ["uint256", "uint256", "uint256", "uint256", "uint256"],
            result
        )
    }

    console.log(info);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
