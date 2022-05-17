import {task} from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import { BigNumber } from 'ethers';
import { ethers } from "hardhat";
import { parseEther } from "ethers/lib/utils";
import * as readline from 'readline';
import * as fs from 'fs';

import { writeFileSync } from 'fs';
import { join } from "path";


type User = {
    address: string;
    staked: BigNumber;
    unlockAmount: BigNumber;
    claim: BigNumber,
}

task("lockers", "return list of LockedToken holdrers")
    .setAction(async function (taskArgs, hre) {

        const network = hre.network.name;

        console.log(network);

  
        console.log("\nGetting lockers list...");

        const decoder = new hre.ethers.utils.AbiCoder;
    
        let userList: User[] = [];
        let addressesList: string[] = [];
    
        let locker = "0x34618270647971a3203579380b61De79ecC474D1"
        let lockerDeploymentBlock = 14224104
        const LockedToken = await hre.ethers.getContractAt("AlluoLockedNew", locker);
    
        const lockEvents = await hre.ethers.provider.getLogs({
            fromBlock: lockerDeploymentBlock,
            toBlock: "latest",
            address: locker,
            topics: ["0x74ab4d62f7439ac9599414cea8261f0ea735ce362df50b525c954d1c637cc253"]  
                        //keccak256("TokensLocked(uint256,uint256,address)")
        })    
    
        let fullLockersList: string[] = [];
    
        for(let i = 0; i < lockEvents.length; i++){
            let addressTo = (decoder.decode(["address"], lockEvents[i].topics[1])).toString();
    
            if(!fullLockersList.includes(addressTo)){
                fullLockersList.push(addressTo)
            }
        }
    
        for(let i = 0; i < fullLockersList.length; i++){
            if(!addressesList.includes(fullLockersList[i])){
                let info = await LockedToken.getInfoByAddress(fullLockersList[i]);
    
                if(info[0].gt(BigNumber.from(0)) || info[1].gt(BigNumber.from(0)) || info[2].gt(BigNumber.from(0))){
                    addressesList.push(fullLockersList[i])
    
                    let user: User = { 
                        address: fullLockersList[i],
                        staked: info[0],
                        unlockAmount: info[1],
                        claim: info[2],
                    }
                    userList.push(user)
    
                    writeFileSync(join(__dirname, "./lockersList.txt"), `${fullLockersList[i]} \n${info[0]} \n${info[1]} \n${info[2]} \n--------\n`,{
                        flag: "a+",
                    });
                }
            }
        }
    
        console.log("Number of lockers:", userList.length);
        

        console.log("lockers task done!")

    });