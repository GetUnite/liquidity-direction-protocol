import { task } from "hardhat/config";
import "@typechain/hardhat";
import readline from 'readline';
import { HardhatRuntimeEnvironment } from "hardhat/types";

import * as ethers from "ethers";

function ask(query: string) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }))
}

async function template(hre: HardhatRuntimeEnvironment, action: () => Promise<void>) {
    console.log("================= START =================");
    const accounts = await hre.ethers.getSigners();
    const sender = accounts[0];
    const balance = await sender.getBalance();
    const networkName = hre.network.name;
    console.log("Sender address: ", sender.address);
    console.log("Sender balance: ", hre.ethers.utils.formatEther(balance));
    console.log("Network:", networkName);
    if (networkName == "maticmainnet" || networkName == "mainnet") {
        console.log();
        console.log("WARNING - Mainnet selected!!!");
        console.log("WARNING - Mainnet selected!!!");
        console.log("WARNING - Mainnet selected!!!");
        console.log();
        await ask(`Confirm working in mainnet. Ctrl + C to abort.`);
        console.log("Good luck.");
    }
    else {
        await ask("Is sender and network ok?");
    }

    await action();

    console.log("================== END ==================");
}
/**
 * @description Fetching all required data and calculates signature for metatransanction execution
 * @param {string}  txData - Encoded meta transaction function call data.
 * @param {string} metaTxContractAddress - Destination address of `txData`.
 * @param {ethers.providers.JsonRpcProvider} provider - JSON-RPC provider for making few view function calls on blockchain.
 * @param {string} privateKey - Meta transaction issuer private key, user for signing meta transaction itself.
 * @returns {Promise<ethers.Signature>} Object containing `sigV`, `sigR` and `sigS` components of digital signature.
 */
async function getStablecoinMetatxSignature(
    txData: string,
    metaTxContractAddress: string,
    provider: ethers.providers.JsonRpcProvider,
    privateKey: string): Promise<ethers.Signature> {
    // for deriving address from private key
    const pk = new ethers.Wallet(privateKey);
    // required header by EIP-712
    const eip191Header = '0x1901';
    // result of keccak256("MetaTransaction(uint256 nonce,address from,bytes functionSignature)");
    // represents type of action user allows to execute, action args and types
    const metaTxTypehash = "0x23d10def3caacba2e4042e0c75d44a42d2558aabcf5ce951d0642a8032e1e653";

    // this is merged combination of abi of different contracts - nonces and
    // domain separators are fetched differently on some contracts.
    const abi = [
        // get nonce of specific address for signing message
        // (increments on every successful tx)
        "function nonces(address owner) public view returns (uint256)", // USDC and all testnets
        "function getNonce(address user) public view returns (uint256)", // USDT, DAI

        // get domain separator, which is constant for only individual contract
        // on specific network, maybe it would be reasonable cache it
        "function DOMAIN_SEPARATOR() public view returns (bytes32)",
        "function getDomainSeperator() public view returns (bytes32)",
    ];

    const metaTxContract = new ethers.Contract(metaTxContractAddress, abi, provider);

    // get domain separator
    let domainSeparator;
    try {
        domainSeparator = await metaTxContract.callStatic.DOMAIN_SEPARATOR();
    } catch (error) {
        domainSeparator = await metaTxContract.callStatic.getDomainSeperator();
    }

    // get user nonce
    let nonce;
    try {
        nonce = (await metaTxContract.callStatic.nonces(pk.address));
    } catch (error) {
        nonce = (await metaTxContract.callStatic.getNonce(pk.address));
    }

    // making all cryptography calculations 
    const dataHash = ethers.utils.keccak256(txData);
    const l1Digest = ethers.utils.keccak256(
        ethers.utils.defaultAbiCoder.encode(
            ["bytes32", "uint256", "address", "bytes32"],
            [metaTxTypehash, nonce, pk.address, dataHash]
        )
    );
    const l2Digest = ethers.utils.solidityKeccak256(
        ["bytes", "bytes32", "bytes32"],
        [eip191Header, domainSeparator, l1Digest]
    );

    // here is a trick - using `signMessage` method in `SignerWithAddress` won't
    // work here, because of salt "Ethereum Signed Message" that destroys this
    // signature for our purpose. We are calling signDigest method on private key
    // to sign that message without that salt. We already have domain separator
    // hash as individual salt for every contract.
    const sk = new ethers.utils.SigningKey(pk.privateKey);
    const sig = sk.signDigest(l2Digest);

    return sig;
}

task("encodeStableMetatx", "Prints signature for calldata and destination")
    .addParam("contract", "Destination stablecoin contract for metatransaction")
    .addParam("data", "Calldata to execute in metatransaction")
    .setAction(async function (taskArgs, hre) {
        await template(hre, async () => {
            // contract from my framework, grab yours with ABI
            const contract = await hre.ethers.getContractAt("UChildAdministrableERC20", taskArgs.contract);

            // this is real issuer of transaction - this address can have no MATIC
            // at all, but as he properly signs needed data, anyone can execute
            // his signed action
            const signer = ethers.Wallet.createRandom();
            const approveTo = ethers.Wallet.createRandom();
            const amount = ethers.utils.parseUnits("420.0", await contract.decimals());

            // sample tx - instead of approve you can put here `transfer`,
            // `decreaseAllowance`, `increaseAllowance`, other methods of `contract`
            const data = taskArgs.data

            // grab contract domain separator, nonce and calculate signature
            const signature = await getStablecoinMetatxSignature(data, contract.address, hre.ethers.provider, signer.privateKey);

            // execute transaction from behalf of `signer`, but sent by no matter who.
            // Be aware of signature components order: R, S, V.
            const tx = await contract.executeMetaTransaction(
                signer.address,
                data,
                signature.r,
                signature.s,
                signature.v
            );

            console.log("Approve from", signer.address, "to", approveTo.address, "amount:", amount.toHexString())
            console.log(tx.hash);

            // Above is execution of meta transaction, but to send it to Biconomy,
            // you will need only encoded function call data. You can get this
            // very easily:
            const metaTxData = contract.interface.encodeFunctionData(
                'executeMetaTransaction',
                [
                    signer.address,
                    data,
                    signature.r,
                    signature.s,
                    signature.v
                ]
            );
        })
    });
