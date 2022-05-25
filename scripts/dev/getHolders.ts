import { BigNumber } from "ethers";
import { ethers, upgrades } from "hardhat"
import { HardhatRuntimeEnvironment } from "hardhat/types";

async function getHolders(hre: HardhatRuntimeEnvironment) : Promise<string[]>{

    console.log("Getting holders...");

    const tokenAddress = "0x29c66CF57a03d41Cfe6d9ecB6883aa0E2AbA21Ec"
    const deploymentBlock = 25009106
    // console.log(Number("0x1a2874d"));
    

    let balances: { [address: string] : BigNumber } = {};

    const events1 = await hre.ethers.provider.getLogs({
        fromBlock: deploymentBlock,
        toBlock: 27428685,
        address: tokenAddress,
        topics: ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"]  
                    //keccak256("Transfer(address,address,uint256)")
    })        

    const events2 = await hre.ethers.provider.getLogs({
        fromBlock: 27428686,
        toBlock: "latest",
        address: tokenAddress,
        topics: ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"]  
                    //keccak256("Transfer(address,address,uint256)")
    })    

    let allEvents = events1.concat(events2)
    const decoder = new hre.ethers.utils.AbiCoder;

    let fullList: string[] = [];

    for(let i = 0; i < allEvents.length; i++){
        
        let addressFrom = (decoder.decode(["address"], allEvents[i].topics[1])).toString();
        let addressTo = (decoder.decode(["address"], allEvents[i].topics[2])).toString();
        let amount = BigNumber.from(allEvents[i].data);

        balances[addressFrom] = balances[addressFrom] == undefined ? BigNumber.from(0) : balances[addressFrom]
        balances[addressTo] = balances[addressTo] == undefined ? BigNumber.from(0) : balances[addressTo]

        if(addressFrom != hre.ethers.constants.AddressZero){
            balances[addressFrom] = balances[addressFrom].sub(amount)
        }
        if(addressTo != hre.ethers.constants.AddressZero){
            balances[addressTo] = balances[addressTo].add(amount)
        }
    }

    for (let address in balances) {
        if(balances[address].gt(BigNumber.from(0)) && address != hre.ethers.constants.AddressZero){

            fullList.push(address)

        }
    }

    // console.log(fullList);

    console.log("Number of holders: ", fullList.length);

    return fullList;
}

export {getHolders}
