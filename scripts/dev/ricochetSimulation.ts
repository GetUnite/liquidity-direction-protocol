import { BigNumber } from "ethers";
import { ethers, upgrades } from "hardhat"
import { IbAlluo } from "../../typechain-types";
import { reset } from "@nomicfoundation/hardhat-network-helpers";
import fs from "fs";
import path from "path";
import axios from "axios";
import allSettled from "promise.allsettled";
import Bottleneck from 'bottleneck';
import fetch from "node-fetch";

async function main() {
    await reset(process.env.POLYGON_FORKING_URL)

    const provider = new ethers.providers.JsonRpcProvider(process.env.POLYGON_FORKING_URL)
    let signers = await ethers.getSigners();

    let daiContract = await ethers.getContractAt("IERC20Metadata", "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063")
    let wBTCContract = await ethers.getContractAt("IERC20Metadata", "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6")



    // Read the file
    // let allTxs = fs.readFileSync('results.json');

    // const results = JSON.parse(allTxs);

    // // Filter the array
    // const filteredResults = results.filter(result => parseFloat(result.daiAmount) > 1);

    // // Write the filtered array to a new JSON file
    // const json = JSON.stringify(filteredResults, null, 2);
    // fs.writeFileSync('results2.json', json)

    // const response = await axios.get('https://api.polygonscan.com/api', {
    //     params: {
    //         module: 'logs',
    //         action: 'getLogs',
    //         fromBlock:
    //             35706316,
    //         toBlock: 43560585,
    //         address: '0xbB5C64B929b1E60c085dcDf88dfe41c6b9dcf65B',
    //         topic0: '0xed4b43d1c43fa6de2432cc50d2bbc8db51d9ce0d2095d0a5cfac618764e9fe58',
    //         apikey: process.env.POLYGONSCAN_API_KEY
    //     }
    // });

    // // Extract the transaction hashes
    // const txHashes = response.data.result.map(log => log.transactionHash);

    // // Write the array to a JSON file
    // const json = JSON.stringify(txHashes, null, 2);
    // fs.writeFileSync('txHashes2.json', json)
    // await getTransactionHashes();

    // let data = fs.readFileSync("txHashes10.json");
    // const txHashes = JSON.parse(data);
    // // Use a Set to remove duplicates
    // const uniqueTxHashes = [...new Set(txHashes)];

    // // Save the array back to the JSON file
    // const json = JSON.stringify(uniqueTxHashes, null, 2);
    // fs.writeFileSync('txHashesFinal.json', json)
    // @ts-ignore

    // let txHashes = JSON.parse(fs.readFileSync("scripts/dev/txHashesFinal.json"));
    // console.log(txHashes[txHashes.length - 1])
    // // txHashes = txHashes.slice(txHashes.length - 6, txHashes.length - 1)
    // let promises = [];

    // for (const txHash of txHashes) {
    //     promises.push(retry(async function () {
    //         console.log("on tx hash", txHash);
    //         const receipt = await provider.getTransactionReceipt(txHash.toString());
    //         const block = await provider.getBlock(receipt.blockNumber);
    //         const timestamp = block.timestamp;

    //         let daiTransfer;
    //         let wbtcTransfer;

    //         for (const log of receipt.logs) {
    //             try {
    //                 let parsedLog = daiContract.interface.parseLog(log);
    //                 if (parsedLog.name === 'Transfer' && parsedLog.args.from.toLowerCase() === '0xbb5c64b929b1e60c085dcdf88dfe41c6b9dcf65b' && parsedLog.args.to.toLowerCase() === '0x7a1d5e67c3a273274766e241363e3e98e721e456') {
    //                     daiTransfer = parsedLog;
    //                 }
    //                 parsedLog = wBTCContract.interface.parseLog(log);
    //                 if (parsedLog.name === 'Transfer' && parsedLog.args.from.toLowerCase() === '0x7a1d5e67c3a273274766e241363e3e98e721e456' && parsedLog.args.to.toLowerCase() === '0xbb5c64b929b1e60c085dcdf88dfe41c6b9dcf65b') {
    //                     wbtcTransfer = parsedLog;
    //                 }
    //                 if (daiTransfer && wbtcTransfer) {
    //                     if (Number(ethers.utils.formatUnits(daiTransfer.args.value, 18)) > 1) {
    //                         return {
    //                             txHash: txHash,
    //                             daiAmount: ethers.utils.formatUnits(daiTransfer.args.value, 18),
    //                             wbtcAmount: ethers.utils.formatUnits(wbtcTransfer.args.value, 8),
    //                             timestamp: timestamp
    //                         };
    //                     }
    //                     break;
    //                 }
    //             } catch (err) {
    //             }
    //         }
    //         return null;
    //     }, 500));
    // }
    // await Promise.all(promises).then((values) => {
    //     console.log(values)
    //     const result = values.filter(x => x !== null);
    //     console.log(result);
    //     const json = JSON.stringify(result, null, 2);
    //     fs.writeFileSync('results.json', json)
    // }).catch((err) => {
    //     console.log(err)
    // });

    // const data = fs.readFileSync("scripts/dev/results.json");
    // // @ts-ignore
    // let transactionsArray = JSON.parse(data)



    let transactionsArray;
    try {
        const data = fs.readFileSync("failedTransactions.json");
        // @ts-ignore

        transactionsArray = JSON.parse(data);
    } catch (err) {
        console.error(`Failed to read failedTransactions.json:`, err);
        return;
    }



    // transactionsArray = transactionsArray.slice(0, 5)
    const limiter = new Bottleneck({
        minTime: 200, // Execute 1 request per 100ms => 600 requests per minute
        maxConcurrent: 1, // Set maximum concurrent requests to 1
    });
    const getWbtcPrice = async (timestamp: number, retries = 5): Promise<number> => {
        if (retries === 0) {
            throw new Error('Max retries reached');
        }

        const response = await limiter.schedule(() => fetch(`https://coins.llama.fi/prices/historical/${timestamp}/polygon:0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6?searchWidth=4h`));

        if (response.status === 429) { // rate limited
            console.log('Rate limited.');
            throw new Error('Max retries reached');
        }

        const data = await response.json();
        return data.coins['polygon:0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6'].price;
    };
    const throttledFetch = async (tx: any) => {
        const timestamp = tx.timestamp;
        let wbtcPrice;

        try {
            wbtcPrice = await getWbtcPrice(timestamp);
        } catch (err) {
            console.error(`Failed to fetch WBTC price for timestamp ${timestamp}:`, err);
            return { success: false, tx };  // return failed transaction
        }

        const expectedBtcAmount = parseFloat(tx.daiAmount) / wbtcPrice;
        const actualBtcAmount = parseFloat(tx.wbtcAmount);
        const slippage = expectedBtcAmount - actualBtcAmount;
        const slippageInUsd = slippage * wbtcPrice;
        console.log("Got slippage", slippageInUsd)

        return { success: true, slippage: slippageInUsd }; // return successful transaction
    };



    let totalSlippage = 0;
    let successfulTransactions: any = [];
    let failedTransactions: any = [];

    const promises = transactionsArray.map((tx: any) => throttledFetch(tx));


    await Promise.all(promises)
        .then(values => {
            const newFailedTransactions = values.filter(value => !value.success).map(value => value.tx);
            const newSuccessfulTransactions = values.filter(value => value.success).map(value => value.slippage);

            // Append to successfulTransactions.json
            const successfulStream = fs.createWriteStream('successfulTransactions.json', { flags: 'a' });
            successfulStream.write(",\n"); // Write a comma and a newline to separate from previous content
            successfulStream.write(JSON.stringify(newSuccessfulTransactions));
            successfulStream.end(); // Don't forget to end the stream

            // Overwrite failedTransactions.json with new failed transactions
            fs.writeFileSync('failedTransactions.json', JSON.stringify(newFailedTransactions));

            totalSlippage = newSuccessfulTransactions.reduce((sum, slippage) => sum + slippage, 0);
            console.log("Total Slippage in USD: " + totalSlippage);
        })
        .catch(console.error);

}
const delay = (ms: any) => new Promise(resolve => setTimeout(resolve, ms));

// Retry function
const retry = async (fn: any, ms = 500, maxRetries = 5) => {
    let retries = 0;
    while (retries < maxRetries) {
        try {
            return await fn();
        } catch (err) {
            console.log(`Retry #${retries} failed, retrying in ${ms}ms...`);
            await delay(ms);
            retries += 1;
            ms *= 2;  // exponential backoff
        }
    }
    throw new Error('Max retries reached.');
}
async function getTransactionHashes() {
    let fromBlock = 33761411;
    let toBlock = 43560585;
    let txHashes: any[] = [];
    let i = 0;

    while (fromBlock <= toBlock) {
        console.log(`Fetching logs from block ${fromBlock} to ${toBlock}...`);
        try {
            const response = await axios.get('https://api.polygonscan.com/api', {
                params: {
                    module: 'logs',
                    action: 'getLogs',
                    fromBlock: fromBlock,
                    toBlock: toBlock,
                    address: '0xbB5C64B929b1E60c085dcDf88dfe41c6b9dcf65B',
                    topic0: '0xed4b43d1c43fa6de2432cc50d2bbc8db51d9ce0d2095d0a5cfac618764e9fe58',
                    apikey: process.env.POLYGONSCAN_API_KEY
                }
            });

            // Extract the transaction hashes
            console.log(response.data.message)
            // @ts-ignore
            const newTxHashes = response.data.result.map(log => log.transactionHash);
            txHashes = [...txHashes, ...newTxHashes];

            // Write the array to a JSON file
            const json = JSON.stringify(txHashes, null, 2);
            fs.writeFile(`txHashes${i}.json`, json, 'utf8', err => {
                if (err) {
                    console.error(`An error occurred while writing the JSON file: ${err}`);
                } else {
                    console.log(`Transaction hashes saved to txHashes${i}.json`);
                }
            });

            if (newTxHashes.length > 0) {
                // Get the block number of the last transaction
                const lastTxHash = newTxHashes[newTxHashes.length - 1];
                const lastTxReceipt = await ethers.provider.getTransactionReceipt(lastTxHash);
                fromBlock = lastTxReceipt.blockNumber + 1;
            } else {
                // No more transactions to fetch
                break;
            }

            i++;

        } catch (err) {
            console.error('An error occurred:', err);
        }
    }
}



main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
