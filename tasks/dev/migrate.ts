import {task} from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import {parseEther} from "@ethersproject/units"
import { BigNumber } from 'ethers';
import { config as dotenvConfig } from 'dotenv';
import { formatBytes32String, parseBytes32String } from "@ethersproject/strings";
import { Bytes } from "@ethersproject/bytes";

task("migrate", "migrates tokens from old contract")
    .setAction(async function (taskArgs, hre) {

        const network = hre.network.name;

        console.log(network);
        
        const multisig = await hre.ethers.getContractAt("PseudoMultisigWallet", "0x18B25e52Ac6B70BacAB3478D3AB872cAe0Ffb40F");


        let list: string[] = ['0x9c205edd78bd7ea0a940847f1f98d5822f126e67', 
        '0x4b948c0354c82f1dc3c510bfa93578540dab917d', '0xc24444c91a370151bdb06a0c11da8b1006fe1bbe'];

        let ABI = ["function migrate(address _oldContract, address[] memory _users)"];
        let iface = new hre.ethers.utils.Interface(ABI);
        const calldata = iface.encodeFunctionData("migrate", ["0x8BB0660284eE22A11e9e511744d21A9e1E1b669E", list]);

        await multisig.executeCall("0x0e62Cfa467627DbccB47bb747b46f6631EF12d9D", calldata);


        console.log('migrate task Done!');
    });
