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


        let list: string[] = ['0x4b948c0354c82f1dc3c510bfa93578540dab917d', 
        '0x05639f2c210b196ed4d628795ed6abae37d5835c'];

        let ABI = ["function migrate(address _oldContract, address[] memory _users)"];
        let iface = new hre.ethers.utils.Interface(ABI);
        const calldata = iface.encodeFunctionData("migrate", ["0xbe274A761baC428AF067B36CCaDDFEf209A22dc9", list]);

        await multisig.executeCall("0x8BB0660284eE22A11e9e511744d21A9e1E1b669E", calldata);


        console.log('migrate task Done!');
    });
