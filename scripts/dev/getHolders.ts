import { BigNumber } from "ethers";
import { ethers, upgrades } from "hardhat"
import { HardhatRuntimeEnvironment } from "hardhat/types";

async function getHolders(hre: HardhatRuntimeEnvironment) : Promise<string[]>{

    console.log("inside getHolders script");

    let tokenAddress = "0x29c66CF57a03d41Cfe6d9ecB6883aa0E2AbA21Ec"
    let deploymentBlock = 25009106

    const token = await hre.ethers.getContractAt("IERC20", tokenAddress);
    
    const events = await hre.ethers.provider.getLogs({
        fromBlock: deploymentBlock,
        toBlock: "latest",
        address: tokenAddress,
        topics: ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"]  
                    //keccak256("Transfer(address,address,uint256)")
    })        

    const decoder = new hre.ethers.utils.AbiCoder;

    let fullList: string[] = [];
    let onlyCurrentHoldersList: string[] = [];

    for(let i = 0; i < events.length; i++){
        let addressTo = (decoder.decode(["address"], events[i].topics[2])).toString();

        if(!fullList.includes(addressTo) && addressTo != hre.ethers.constants.AddressZero){
            fullList.push(addressTo)
        }
    }

    for(let i = 0; i < fullList.length; i++){
        let balance = await token.balanceOf(fullList[i]);

        if(balance > BigNumber.from(0)){
            onlyCurrentHoldersList.push(fullList[i])
        }
    }

    // console.log(onlyCurrentHoldersList);
    console.log("Amount of holders: ", onlyCurrentHoldersList.length);

    return onlyCurrentHoldersList;
}

export {getHolders}
