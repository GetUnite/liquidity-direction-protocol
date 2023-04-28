import { task } from "hardhat/config";

import { parseEther } from "@ethersproject/units"

task("entry", "burns tokens from account")
    .setAction(async function (taskArgs, hre) {
        const ZERO_ADDR = "0x0000000000000000000000000000000000000000"

        const network = hre.network.name;

        console.log(network);
        let usdc = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
        let dai = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
        let frax = "0x853d955aCEf822Db058eb8505911ED77F175b99e"
        let usdt = "0xdAC17F958D2ee523a2206206994597C13D831ec7"
        let crv3 = "0x6c3F90f043a72FA612cbac8115EE7e52BDe6E490"

        const [...addr] = await hre.ethers.getSigners();

        const exec = await hre.ethers.getContractAt("VoteExecutor", "0x9EB0a0751cf514262AAF45F4d856f36df56017ae");

        // let entries = [{ 
        //     weight: 50, 
        //     entryToken: dai, 
        //     curvePool: "0xBaaa1F5DbA42C3389bDbc2c9D2dE134F5cD0Dc89",
        //     poolToken: frax,
        //     poolSize: 3,
        //     tokenIndexInCurve: 0,
        //     // convexPoolAddress:ZERO_ADDR,
        //     convexPoolAddress:"0xF403C135812408BFbE8713b5A23a04b3D48AAE31",
        //     convexPoold:58
        // },
        // { 
        //     weight: 50, 
        //     entryToken: dai, 
        //     curvePool: "0xBaaa1F5DbA42C3389bDbc2c9D2dE134F5cD0Dc89",
        //     poolToken: frax,
        //     poolSize: 3,
        //     tokenIndexInCurve: 0,
        //     convexPoolAddress:ZERO_ADDR,
        //     // convexPoolAddress:"0xF403C135812408BFbE8713b5A23a04b3D48AAE31",
        //     convexPoold:58
        // }]

        // let entries = [{ 
        //     weight: 50, 
        //     entryToken: frax, 
        //     curvePool: "0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B",
        //     poolToken: crv3,
        //     poolSize: 2,
        //     tokenIndexInCurve: 1,
        //     convexPoolAddress:"0xF403C135812408BFbE8713b5A23a04b3D48AAE31",
        //     convexPoold:32
        // },
        // { 
        //     weight: 50, 
        //     entryToken: frax, 
        //     curvePool: "0xd632f22692FaC7611d2AA1C0D552930D43CAEd3B",
        //     poolToken: crv3,
        //     poolSize: 2,
        //     tokenIndexInCurve: 1,
        //     convexPoolAddress:ZERO_ADDR,
        //     //convexPoolAddress:"0xF403C135812408BFbE8713b5A23a04b3D48AAE31",
        //     convexPoold:32
        // }]

        // let entries = [{ 
        //     weight: 50, 
        //     entryToken: frax, 
        //     curvePool: "0xCEAF7747579696A2F0bb206a14210e3c9e6fB269",
        //     poolToken: crv3,
        //     poolSize: 2,
        //     tokenIndexInCurve: 1,
        //     convexPoolAddress:"0xF403C135812408BFbE8713b5A23a04b3D48AAE31",
        //     convexPoold:59
        // },
        // { 
        //     weight: 50, 
        //     entryToken: frax, 
        //     curvePool: "0xCEAF7747579696A2F0bb206a14210e3c9e6fB269",
        //     poolToken: crv3,
        //     poolSize: 2,
        //     tokenIndexInCurve: 1,
        //     convexPoolAddress:ZERO_ADDR,
        //     //convexPoolAddress:"0xF403C135812408BFbE8713b5A23a04b3D48AAE31",
        //     convexPoold:59
        // }]

        // let entries = [{ 
        //     weight: 50, 
        //     entryToken: frax, 
        //     curvePool: "0x5a6A4D54456819380173272A5E8E9B9904BdF41B",
        //     poolToken: crv3,
        //     poolSize: 2,
        //     tokenIndexInCurve: 1,
        //     convexPoolAddress:"0xF403C135812408BFbE8713b5A23a04b3D48AAE31",
        //     convexPoold:40
        // },
        // { 
        //     weight: 50, 
        //     entryToken: frax, 
        //     curvePool: "0x5a6A4D54456819380173272A5E8E9B9904BdF41B",
        //     poolToken: crv3,
        //     poolSize: 2,
        //     tokenIndexInCurve: 1,
        //     convexPoolAddress:ZERO_ADDR,
        //     //convexPoolAddress:"0xF403C135812408BFbE8713b5A23a04b3D48AAE31",
        //     convexPoold:40
        // }]

        // let entries = [{ 
        //     weight: 50, 
        //     entryToken: frax, 
        //     curvePool: "0x0f9cb53Ebe405d49A0bbdBD291A65Ff571bC83e1",
        //     poolToken: crv3,
        //     poolSize: 2,
        //     tokenIndexInCurve: 1,
        //     convexPoolAddress:"0xF403C135812408BFbE8713b5A23a04b3D48AAE31",
        //     convexPoold:13
        // },
        // { 
        //     weight: 50, 
        //     entryToken: frax, 
        //     curvePool: "0x0f9cb53Ebe405d49A0bbdBD291A65Ff571bC83e1",
        //     poolToken: crv3,
        //     poolSize: 2,
        //     tokenIndexInCurve: 1,
        //     convexPoolAddress:ZERO_ADDR,
        //     //convexPoolAddress:"0xF403C135812408BFbE8713b5A23a04b3D48AAE31",
        //     convexPoold:13
        // }]

        let entries = [{
            weight: 50,
            entryToken: frax,
            curvePool: "0x43b4FdFD4Ff969587185cDB6f0BD875c5Fc83f8c",
            poolToken: crv3,
            poolSize: 2,
            tokenIndexInCurve: 1,
            convexPoolAddress: "0xF403C135812408BFbE8713b5A23a04b3D48AAE31",
            convexPoold: 36
        },
        {
            weight: 50,
            entryToken: frax,
            curvePool: "0x43b4FdFD4Ff969587185cDB6f0BD875c5Fc83f8c",
            poolToken: crv3,
            poolSize: 2,
            tokenIndexInCurve: 1,
            convexPoolAddress: ZERO_ADDR,
            //convexPoolAddress:"0xF403C135812408BFbE8713b5A23a04b3D48AAE31",
            convexPoold: 36
        }]

        await exec.connect(addr[0]).execute(entries)


        console.log('entry task Done!');
    });
