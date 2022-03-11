import {task} from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import {parseEther} from "@ethersproject/units"
import { BigNumber } from 'ethers';
import { config as dotenvConfig } from 'dotenv';
import { formatBytes32String, parseBytes32String } from "@ethersproject/strings";
import { Bytes } from "@ethersproject/bytes";

task("addToken", "add deposit token")
    .setAction(async function (taskArgs, hre) {

        const network = hre.network.name;

        console.log(network);

        const multisig = await hre.ethers.getContractAt("PseudoMultisigWallet", "0x18B25e52Ac6B70BacAB3478D3AB872cAe0Ffb40F");
        
        
        let ABI = ["function changeTokenStatus(address _token, bool _status)"];
        let iface = new hre.ethers.utils.Interface(ABI);
        const calldata = iface.encodeFunctionData("changeTokenStatus", ["0xf40aaa8ed0addb9140115d88579d06081d2ec41a", true]);

        await multisig.executeCall("0x8BB0660284eE22A11e9e511744d21A9e1E1b669E", calldata);


        console.log('addToken task Done!');
    });
