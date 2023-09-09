import { ethers, upgrades } from "hardhat";
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

function getAddressesFromCSV(filePath: any): string[] {
    const csvContent = fs.readFileSync(filePath, 'utf-8');
    const result = Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true
    });

    const records = result.data;
    // console.log(records)
    const addresses = (records as Array<{ address: string; }>).map(record => {
        const correctedJson = record.address.replace(/'/g, '"');
        let parsedAddress = JSON.parse(correctedJson);

        return parsedAddress.S;
    });

    return addresses;
}

function getAddressesFromPolygonCSV(filePath: any): string[] {
    const csvContent = fs.readFileSync(filePath, 'utf-8');
    const result = Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true
    });

    const records = result.data;

    return (records as Array<{ HolderAddress: string; }>).map(record => record.HolderAddress);
}

function saveToJSON(data: any, filePath: any) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 4)); // 4 spaces indentation for better readability
}
function countUsersByThreshold(balances: Record<string, string>, threshold: number, above: boolean = true): number {
    if (above) {
        return Object.values(balances).filter(balance => parseFloat(balance) > threshold).length;
    } else {
        return Object.values(balances).filter(balance => parseFloat(balance) <= threshold).length;
    }
}

function getTotalBalance(balances: Record<string, string>): number {
    return Object.values(balances).reduce((acc, balance) => acc + parseFloat(balance), 0);
}

async function main() {

    const mobileAppUsersAddresses = getAddressesFromCSV(path.join(__dirname, 'output.csv'));
    console.log("Mobile app user number:", mobileAppUsersAddresses.length)
    const iballuoUSDHolderAddresses = getAddressesFromPolygonCSV(path.join(__dirname, 'export-tokenholders-for-contract-0xc2dbaaea2efa47ebda3e572aa0e55b742e408bf6.csv'));
    const stIbAlluoHoldersAddresses = getAddressesFromPolygonCSV(path.join(__dirname, 'export-tokenholders-for-contract-0xe9e759b969b991f2bfae84308385405b9ab01541.csv'));
    const allHoldersAddresses = [...new Set([...iballuoUSDHolderAddresses, ...stIbAlluoHoldersAddresses])];
    console.log("allHoldersAddresses number", allHoldersAddresses.length)

    const mobileAppUsersBalances: any = {};
    const webAppUsersBalances: any = {};

    let allBalances: any = {};
    const BATCH_SIZE = 10;


    let iballuoUSD = await ethers.getContractAt("IbAlluo", "0xC2DbaAEA2EfA47EBda3E572aa0e55B742E408BF6");



    // for (let i = 0; i < allHoldersAddresses.length; i += BATCH_SIZE) {
    //     // Create a batch of promises for each slice of addresses
    //     console.log("At index", i, "of", allHoldersAddresses.length)
    //     const batchPromises = allHoldersAddresses.slice(i, i + BATCH_SIZE).map(address => {
    //         return iballuoUSD.getBalance(address).then(balance => {
    //             return { address, balance };
    //         });
    //     });

    //     // Execute the batch and wait for all to complete
    //     const batchResults = await Promise.all(batchPromises);
    //     for (const result of batchResults) {
    //         allBalances[result.address] = result.balance.toString();
    //     }
    // }


    // // Save the allBalances json
    // saveToJSON(allBalances, './allBalances.json');

    // Load the json
    allBalances = JSON.parse(fs.readFileSync('./allBalances.json', 'utf-8'));
    const mobileAppUsersAddressesSet = new Set(mobileAppUsersAddresses.map(a => a.toLowerCase()));
    console.log("Mobile app users length", mobileAppUsersAddressesSet.size)
    console.log("All balances length", Object.keys(allBalances).length);


    for (const [address, balance] of Object.entries(allBalances)) {
        const lowercasedAddress = address.toLowerCase();
        if (mobileAppUsersAddressesSet.has(lowercasedAddress)) {
            // console.log("Found mobile app user", lowercasedAddress)
            mobileAppUsersBalances[lowercasedAddress] = Number(balance) / 10 ** 18;
        }
        else {
            // console.log("Found web app user", lowercasedAddress)
            webAppUsersBalances[lowercasedAddress] = Number(balance) / 10 ** 18;
        }
    }

    const addressesInAllBalances = Array.from(mobileAppUsersAddressesSet).filter(addr => addr in allBalances);
    console.log("Number of mobile app user addresses found in allBalances:", addressesInAllBalances.length);
    const excludedAddresses = [
        "0x2580f9954529853Ca5aC5543cE39E9B5B1145135",
        "0xE9E759B969B991F2bFae84308385405B9Ab01541"
    ];

    // Convert to lowercase for consistent matching
    const lowercaseExcludedAddresses = excludedAddresses.map(addr => addr.toLowerCase());

    for (const address of lowercaseExcludedAddresses) {
        delete webAppUsersBalances[address];
    }

    // Save the mobile app users balances to a JSON file
    saveToJSON(mobileAppUsersBalances, './mobileAppUsersBalances.json');

    // Save the web app users balances to a JSON file
    saveToJSON(webAppUsersBalances, './webAppUsersBalances.json');

    const totalMobileAppUsersBalance = getTotalBalance(mobileAppUsersBalances);
    const totalWebAppUsersBalance = getTotalBalance(webAppUsersBalances);
    // For mobileAppUsersBalances
    console.log("Mobile App Users:");
    console.log("Users with 0.5 balance or less:", countUsersByThreshold(mobileAppUsersBalances, 0.5, false));
    console.log("Users with more than 0.5 balance:", countUsersByThreshold(mobileAppUsersBalances, 0.5));
    console.log("Users with more than 1 balance:", countUsersByThreshold(mobileAppUsersBalances, 1));
    console.log("Users with more than 10 balance:", countUsersByThreshold(mobileAppUsersBalances, 10));
    console.log("Users with more than 50 balance:", countUsersByThreshold(mobileAppUsersBalances, 50));
    console.log("Users with more than 100 balance:", countUsersByThreshold(mobileAppUsersBalances, 100));
    console.log("Users with more than 1000 balance:", countUsersByThreshold(mobileAppUsersBalances, 1000));
    console.log("Total user number", Object.keys(mobileAppUsersBalances).length);
    console.log("Total balance for Mobile App Users:", totalMobileAppUsersBalance);

    // For webAppUsersBalances
    console.log("Web App Users:");
    console.log("Users with 0.5 balance or less:", countUsersByThreshold(webAppUsersBalances, 0.5, false));
    console.log("Users with more than 0.5 balance:", countUsersByThreshold(webAppUsersBalances, 0.5));
    console.log("Users with more than 1 balance:", countUsersByThreshold(webAppUsersBalances, 1));
    console.log("Users with more than 10 balance:", countUsersByThreshold(webAppUsersBalances, 10));
    console.log("Users with more than 50 balance:", countUsersByThreshold(webAppUsersBalances, 50));
    console.log("Users with more than 100 balance:", countUsersByThreshold(webAppUsersBalances, 100));
    console.log("Users with more than 1000 balance:", countUsersByThreshold(webAppUsersBalances, 1000));
    console.log("Total user number ", Object.keys(webAppUsersBalances).length);
    console.log("Total balance for Web App Users:", totalWebAppUsersBalance);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

