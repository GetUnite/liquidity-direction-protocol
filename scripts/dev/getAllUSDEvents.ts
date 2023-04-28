import { BigNumber } from "ethers";
import { ethers, upgrades } from "hardhat"
import { IbAlluo } from "../../typechain-types";

async function main() {
    const ibAlluoCurrent = await ethers.getContractAt("IbAlluo", "0xc2dbaaea2efa47ebda3e572aa0e55b742e408bf6") as IbAlluo;
    const cfaContract = await ethers.getContractAt("IConstantFlowAgreementV1", "0x6EeE6060f715257b970700bc2656De21dEdF074C");

    let usdTimestamps = await ibAlluoCurrent.queryFilter(ibAlluoCurrent.filters.CreateFlowWithTimestamp(null, null, null, null))
    for (let i = 0; i < usdTimestamps.length; i++) {
        let flow = await cfaContract.getFlow("0xE9E759B969B991F2bFae84308385405B9Ab01541", usdTimestamps[i].args.from, usdTimestamps[i].args.to);
        if (Number(flow.flowRate) > 0) {
            console.log(usdTimestamps[i].args)
        }
    }

    let usdNormalTimestamps = await ibAlluoCurrent.queryFilter(ibAlluoCurrent.filters["CreateFlow(address,address,int96)"](null, null, null))
    let counter = 0;
    let duplicates: any = {};

    for (let i = 0; i < usdNormalTimestamps.length; i++) {
        let flow = await cfaContract.getFlow("0xE9E759B969B991F2bFae84308385405B9Ab01541", usdNormalTimestamps[i].args.from, usdNormalTimestamps[i].args.to);
        if (Number(flow.flowRate) > 0) {
            if (duplicates[usdNormalTimestamps[i].args.from] == undefined) {
                duplicates[usdNormalTimestamps[i].args.from] = usdNormalTimestamps[i].args.to;
                console.log(counter)
                console.log(flow.flowRate)
                counter++
            }
        }
    }
    console.log("Final", duplicates);
    for (var key in duplicates) {
        console.log("From:", key, "  To:", duplicates[key]);
    }
    // console.log(await ibAlluoCurrent.queryFilter(ibAlluoCurrent.filters.CreateFlowWithTimestamp(null, null, null, null)))
    // console.log(await ibAlluoCurrent.queryFilter(ibAlluoCurrent.filters["CreateFlow(address,address,int96)"]
    // 


}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
