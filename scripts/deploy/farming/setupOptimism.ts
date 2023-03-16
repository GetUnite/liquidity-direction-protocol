import console from "console";
import { constants } from "ethers";
import { parseEther } from "ethers/lib/utils";
import { ethers } from "hardhat";
import { AccessControl, IbAlluoPriceResolver, ICurvePoolBTC, ICurvePoolETH, ICurvePoolUSD, IERC20, IExchange, IWrappedEther, WithdrawalRequestResolver } from "../../../typechain";

type Transaction = {
    "to": string,
    "value": string,
    "data": string
}

type GnosisTxContainer = {
    "version": string;
    "chainId": string;
    "createdAt": number;
    "meta": {
        "name": string;
        "description": string;
        "txBuilderVersion": string;
        "createdFromSafeAddress": string;
        "createdFromOwnerAddress": string;
    };
    "transactions": Transaction[];
};

export class TxBuilder {
    private readonly chainId: number;
    private readonly safeAddress: string;
    private transactions: Transaction[];

    constructor(chainId: number, safeAddress: string) {
        this.chainId = chainId;
        this.safeAddress = safeAddress;
        this.transactions = [];
    }

    addTx(destination: string, data: string, value: string) {
        this.transactions.push({
            to: destination,
            data: data,
            value: value
        })
    }

    getObject(): GnosisTxContainer {
        return {
            "version": "1.0",
            "chainId": this.chainId.toString(),
            "createdAt": Math.floor(Date.now() / 1000),
            "meta": {
                "name": "Transactions Batch",
                "description": "",
                "txBuilderVersion": "1.6.0",
                "createdFromSafeAddress": this.safeAddress,
                "createdFromOwnerAddress": "",
            },
            "transactions": this.transactions
        }
    }

    getString(): string {
        return JSON.stringify(this.getObject());
    }
}

async function main() {
    const signers = await ethers.getSigners();
    const gnosis = await ethers.getImpersonatedSigner("0xc7061dD515B602F86733Fa0a0dBb6d6E6B34aED4")
    await signers[0].sendTransaction({
        to: gnosis.address,
        value: parseEther("1000.0"),
    })

    const usdc = await ethers.getContractAt("IERC20Metadata", "0x7f5c764cbc14f9669b88837ca1490cca17c31607");
    const usdt = await ethers.getContractAt("IERC20Metadata", "0x94b008aa00579c1307b0ef2c499ad98a8ce58e58");
    const dai = await ethers.getContractAt("IERC20Metadata", "0xda10009cbd5d07dd0cecc66161fc93d7c9000da1");
    const weth = await ethers.getContractAt(
        "contracts/interfaces/IWrappedEther.sol:IWrappedEther",
        "0x4200000000000000000000000000000000000006"
    ) as IWrappedEther;
    const wbtc = await ethers.getContractAt("IERC20Metadata", "0x68f180fcCe6836688e9084f035309E29Bf0A2095");
    const usdLpToken = await ethers.getContractAt(
        "contracts/interfaces/curve/optimism/ICurvePoolUSD.sol:ICurvePoolUSD",
        "0x1337BedC9D22ecbe766dF105c9623922A27963EC"
    ) as ICurvePoolUSD & IERC20;
    const ethLpToken = await ethers.getContractAt(
        "contracts/interfaces/curve/optimism/ICurvePoolETH.sol:ICurvePoolETH",
        "0x7Bc5728BC2b59B45a58d9A576E2Ffc5f0505B35E"
    ) as ICurvePoolETH;
    const btcLpToken = await ethers.getContractAt(
        "contracts/interfaces/curve/optimism/ICurvePoolBTC.sol:ICurvePoolBTC",
        "0x9F2fE3500B1a7E285FDc337acacE94c480e00130"
    ) as ICurvePoolBTC & IERC20;

    const exchange = await ethers.getContractAt(
        "contracts/interfaces/IExchange.sol:IExchange",
        "0x66Ac11c106C3670988DEFDd24BC75dE786b91095"
    ) as IExchange & AccessControl;
    const priceRouter = await ethers.getContractAt("PriceFeedRouterV2", "0x7E6FD319A856A210b9957Cd6490306995830aD25");
    const handler = await ethers.getContractAt("LiquidityHandlerPolygon", "0x937F7125994a91d5E2Ce31846b97578131056Bb4");
    const buffer = await ethers.getContractAt("BufferManager", "0xf98977e8146386613448668050eFd9D4b880f73F");
    const usdAdapter = await ethers.getContractAt("Usd3PoolOptimismAdapter", "0xbe9461E39a0653D4Dd608807FA095226cF8c08c3");
    const ethAdapter = await ethers.getContractAt("EthOptimismAdapter", "0xDC344a6ed75e810600f7E03352a9620BCf49bAC6");
    const btcAdapter = await ethers.getContractAt("BtcOptimismAdapter", "0xA6B683C01141c467599B41EfEef7eb8215F4Cdb8");
    const ibAlluoUSD = await ethers.getContractAt("IbAlluo", "0x6b55495947F3793597C0777562C37C14cb958097");
    const ibAlluoETH = await ethers.getContractAt("IbAlluo", "0x8BF24fea0Cae18DAB02A5b23c409E8E1f04Ff0ba");
    const ibAlluoBTC = await ethers.getContractAt("IbAlluo", "0x253eB6077db17a43Fd7b4f4E6e5a2D8b2F9A244d");
    const stIbAlluoUSD = await ethers.getContractAt("StIbAlluo", "0xd28900Bfa76ec16D47FCd7b4437C27bd7E888db5");
    const stIbAlluoETH = await ethers.getContractAt("StIbAlluo", "0x2ad6965Bc5D2b80163B37893d1fe8518aFe196A2");
    const stIbAlluoBTC = await ethers.getContractAt("StIbAlluo", "0xf61440f37A30a9624BD0e69ABfcb57A1A5Cf9Fc7");
    const superfluidResolver = await ethers.getContractAt("SuperfluidResolver", "0x5921B818cE098F457C217226FBf5c55E47DA7159");
    const superfluidEndResolver = await ethers.getContractAt("SuperfluidEndResolver", "0x81503b459fec412fBc884D18171F0B592708C7Aa");
    const handlerResolver = await ethers.getContractAt(
        "contracts/Farming/Polygon/resolvers/WithdrawalRequestResolver.sol:WithdrawalRequestResolver",
        "0x2f0FBFB9a0A98D92b62dC35859d1d8C6AdDd57eB"
    ) as WithdrawalRequestResolver;
    const priceResolver = await ethers.getContractAt(
        "contracts/Farming/Polygon/resolvers/IbAlluoPriceResolver.sol:IbAlluoPriceResolver",
        "0x91FBc6c7a98342eeb934C2aB1683ef12B6b120f8"
    ) as IbAlluoPriceResolver;

    const gelatoRole = await superfluidResolver.GELATO();
    const swapperRole = await buffer.SWAPPER();
    const polygonGelatoExecutor = "0x0391ceD60d22Bc2FadEf543619858b12155b7030";
    const optimismGelatoExecutor = "0x6dad1cb747a95ae1fcd364af9adb5b4615f157a4";

    const txs = [
        // Step 3: Deploy and set USD, ETH, BTC adapters
        await usdAdapter.connect(gnosis).adapterApproveAll(),
        await usdAdapter.connect(gnosis).setPriceRouterInfo(priceRouter.address, 0),
        await handler.connect(gnosis).setAdapter(
            1,
            "USD 3pool Curve",
            50,
            usdAdapter.address,
            true
        ),
        await ethAdapter.connect(gnosis).adapterApproveAll(),
        await handler.connect(gnosis).setAdapter(
            3,
            "sETH/ETH Curve",
            100,
            ethAdapter.address,
            true
        ),
        await btcAdapter.connect(gnosis).adapterApproveAll(),
        await handler.connect(gnosis).setAdapter(
            4,
            "sBTC/wbtc Curve",
            100,
            btcAdapter.address,
            true
        ),

        // Step 4: ibAlluoUSD, ETH, BTC deploy and setup
        await handler.connect(gnosis).grantRole(constants.HashZero, ibAlluoUSD.address),
        await handler.connect(gnosis).grantRole(constants.HashZero, ibAlluoETH.address),
        await handler.connect(gnosis).grantRole(constants.HashZero, ibAlluoBTC.address),
        await handler.connect(gnosis).setIbAlluoToAdapterId(ibAlluoUSD.address, 1),
        await handler.connect(gnosis).setIbAlluoToAdapterId(ibAlluoETH.address, 3),
        await handler.connect(gnosis).setIbAlluoToAdapterId(ibAlluoBTC.address, 4),
        await ibAlluoUSD.connect(gnosis).setPriceRouterInfo(priceRouter.address, 0),

        // Step 5: Setup Superfluid contracts
        await ibAlluoUSD.connect(gnosis).setSuperToken(stIbAlluoUSD.address),
        await ibAlluoETH.connect(gnosis).setSuperToken(stIbAlluoETH.address),
        await ibAlluoBTC.connect(gnosis).setSuperToken(stIbAlluoBTC.address),
        await ibAlluoUSD.connect(gnosis).setSuperfluidResolver(superfluidResolver.address),
        await ibAlluoETH.connect(gnosis).setSuperfluidResolver(superfluidResolver.address),
        await ibAlluoBTC.connect(gnosis).setSuperfluidResolver(superfluidResolver.address),
        await ibAlluoUSD.connect(gnosis).setSuperfluidEndResolver(superfluidEndResolver.address),
        await ibAlluoETH.connect(gnosis).setSuperfluidEndResolver(superfluidEndResolver.address),
        await ibAlluoBTC.connect(gnosis).setSuperfluidEndResolver(superfluidEndResolver.address),
        await superfluidResolver.connect(gnosis).revokeRole(gelatoRole, polygonGelatoExecutor),
        await superfluidEndResolver.connect(gnosis).revokeRole(gelatoRole, polygonGelatoExecutor),

        await superfluidResolver.connect(gnosis).grantRole(gelatoRole, optimismGelatoExecutor),
        await superfluidEndResolver.connect(gnosis).grantRole(gelatoRole, optimismGelatoExecutor),

        await ibAlluoUSD.connect(gnosis).grantRole(constants.HashZero, stIbAlluoETH.address),
        await ibAlluoUSD.connect(gnosis).grantRole(constants.HashZero, stIbAlluoBTC.address),
        await ibAlluoUSD.connect(gnosis).grantRole(gelatoRole, superfluidResolver.address),
        await ibAlluoUSD.connect(gnosis).grantRole(gelatoRole, superfluidEndResolver.address),

        await ibAlluoETH.connect(gnosis).grantRole(gelatoRole, superfluidResolver.address),
        await ibAlluoETH.connect(gnosis).grantRole(gelatoRole, superfluidEndResolver.address),

        await stIbAlluoETH.connect(gnosis).grantRole(constants.HashZero, ibAlluoUSD.address),
        await stIbAlluoBTC.connect(gnosis).grantRole(constants.HashZero, ibAlluoUSD.address),

        await ibAlluoBTC.connect(gnosis).grantRole(gelatoRole, superfluidResolver.address),
        await ibAlluoBTC.connect(gnosis).grantRole(gelatoRole, superfluidEndResolver.address),

        // Step 6: Setup BufferManager
        await buffer.connect(gnosis).grantRole(gelatoRole, optimismGelatoExecutor),
        await buffer.connect(gnosis).grantRole(swapperRole, optimismGelatoExecutor),
        await handler.connect(gnosis).grantRole(constants.HashZero, buffer.address),

        await buffer.connect(gnosis).setRelayerFeePct("3000000000000000"),
        await buffer.connect(gnosis).setDistributor("0x82e568c482df2c833dab0d38deb9fb01777a9e89"),
        await buffer.connect(gnosis).initializeValues(
            handler.address,
            [ibAlluoUSD.address, ibAlluoETH.address, ibAlluoBTC.address],
            [usdAdapter.address, ethAdapter.address, btcAdapter.address],
            ["0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2", "0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6"],
            ["1000000000000000000000", "597670000000000000", "43200000000000000"],
            ["30000000000000000000000", "18000000000000000000", "1270000000000000000"],
            86400
        ),

        await buffer.connect(gnosis).setBridgeCap(usdc.address, "10000000000000000000000"),
        await buffer.connect(gnosis).setBridgeCap(weth.address, "18000000000000000000"),
        await buffer.connect(gnosis).setBridgeCap(wbtc.address, "1270000000000000000"),

        await usdc.connect(gnosis).approve(buffer.address, constants.MaxUint256),
        await weth.connect(gnosis).approve(buffer.address, constants.MaxUint256),
        await wbtc.connect(gnosis).approve(buffer.address, constants.MaxUint256),

        await buffer.connect(gnosis).setSlippageControl(ibAlluoUSD.address, 100),
        await buffer.connect(gnosis).setSlippageControl(ibAlluoETH.address, 100),
        await buffer.connect(gnosis).setSlippageControl(ibAlluoBTC.address, 100),

        await buffer.connect(gnosis).setRefillThresholdPct(500)
    ];

    const txsAwaited = await Promise.all(txs.map(x => x.wait()));

    console.log("Tx count:", txs.length);
    console.log("Tx total gas:", txsAwaited.map((x) => x.cumulativeGasUsed.toNumber()).reduce((a, b) => a + b, 0));

    const nameToContract = (name: string): string | undefined => {
        let contractFrom: string | undefined = undefined;
        if (name == "ibAlluoUSD Polygon") contractFrom = ibAlluoUSD.address;
        if (name == "StibAlluoUSD Polygon") contractFrom = stIbAlluoUSD.address;
        if (name == "ibAlluoETH Polygon") contractFrom = ibAlluoETH.address;
        if (name == "StibAlluoETH Polygon") contractFrom = stIbAlluoETH.address;
        if (name == "ibAlluoBTC Polygon") contractFrom = ibAlluoBTC.address;
        if (name == "StibAlluoBTC Polygon") contractFrom = stIbAlluoBTC.address;
        if (name == "Superfluid Resolver") contractFrom = superfluidResolver.address;
        if (name == "Superfluid End Resolver") contractFrom = superfluidEndResolver.address;
        if (name == "Vote Executor Slave") contractFrom = undefined;
        if (name == "msg.sender from Gelato") contractFrom = "0x6dad1cb747a95ae1fcd364af9adb5b4615f157a4";
        if (name == "Polygon Gnosis") contractFrom = gnosis.address;
        if (name == "BTC Adapter") contractFrom = btcAdapter.address;
        if (name == "ETH Adapter") contractFrom = ethAdapter.address;
        if (name == "USD Adapter") contractFrom = usdAdapter.address;
        if (name == "Liquidity Handler") contractFrom = handler.address;
        if (name == "Buffer Manager") contractFrom = buffer.address;
        if (name == "Exchange") contractFrom = exchange.address;
        if (name == "Price Router") contractFrom = priceRouter.address;

        return contractFrom;
    }

    for (let i = 0; i < rolesInfo.length; i++) {
        const element = rolesInfo[i];
        const from = nameToContract(element.contractName);
        const to = nameToContract(element.roleOwnerName);
        const role = element.role;

        if (
            element.contractName.includes("ibAlluoEUR") || element.roleOwnerName.includes("ibAlluoEUR") ||
            element.contractName.includes("EUR Adapter") || element.roleOwnerName.includes("EUR Adapter")
        ) {
            continue;
        }
        if (from == undefined || to == undefined) {
            console.log("    ! To be set up: from", element.contractName, "to", element.roleOwnerName, "role", element.roleDecoded);
            continue;
        }

        const contract = await ethers.getContractAt("@openzeppelin/contracts/access/AccessControl.sol:AccessControl", from);

        if (!await contract.hasRole(role, to)) {
            console.log(`    Not given '${element.roleDecoded}' role from '${element.contractName}' to '${element.roleOwnerName}'`)
        }

        // console.log(`Ok ${element.roleDecoded} role from ${element.contractName} to ${element.roleOwnerName}`)
    }

    const gnosisBuilder = new TxBuilder(10, gnosis.address);

    for (let i = 0; i < txs.length; i++) {
        const tx = txs[i];
        gnosisBuilder.addTx(tx.to as string, tx.data, "0");
    }

    console.log(gnosisBuilder.getString());
}

// Exported all available roles on ibAlluos, stIbAlluos, Adapters, Buffer Manager, 
// Exchange, Liquidity Handler, Price Router, Superfluid Resolvers, Vote Executor Slave,
const rolesInfo = [
    {
        "contract": "0xC2DbaAEA2EfA47EBda3E572aa0e55B742E408BF6",
        "contractName": "ibAlluoUSD Polygon",
        "roleOwner": "0x2580f9954529853Ca5aC5543cE39E9B5B1145135",
        "role": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "roleDecoded": "DEFAULT_ADMIN_ROLE",
        "roleOwnerName": "Polygon Gnosis"
    },
    {
        "contract": "0xC2DbaAEA2EfA47EBda3E572aa0e55B742E408BF6",
        "contractName": "ibAlluoUSD Polygon",
        "roleOwner": "0x2580f9954529853Ca5aC5543cE39E9B5B1145135",
        "role": "0x189ab7a9244df0848122154315af71fe140f3db0fe014031783b0946b8c9d2e3",
        "roleDecoded": "UPGRADER_ROLE",
        "roleOwnerName": "Polygon Gnosis"
    },
    {
        "contract": "0xC2DbaAEA2EfA47EBda3E572aa0e55B742E408BF6",
        "contractName": "ibAlluoUSD Polygon",
        "roleOwner": "0x1D147031b6B4998bE7D446DecF7028678aeb732A",
        "role": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "roleDecoded": "DEFAULT_ADMIN_ROLE",
        "roleOwnerName": "Vote Executor Slave"
    },
    {
        "contract": "0xC2DbaAEA2EfA47EBda3E572aa0e55B742E408BF6",
        "contractName": "ibAlluoUSD Polygon",
        "roleOwner": "0x2D4Dc956FBd0044a4EBA945e8bbaf98a14025C2d",
        "role": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "roleDecoded": "DEFAULT_ADMIN_ROLE",
        "roleOwnerName": "StibAlluoETH Polygon"
    },
    {
        "contract": "0xC2DbaAEA2EfA47EBda3E572aa0e55B742E408BF6",
        "contractName": "ibAlluoUSD Polygon",
        "roleOwner": "0x3E70E15c189e1FFe8FF44d713605528dC1701b63",
        "role": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "roleDecoded": "DEFAULT_ADMIN_ROLE",
        "roleOwnerName": "StibAlluoBTC Polygon"
    },
    {
        "contract": "0xC2DbaAEA2EfA47EBda3E572aa0e55B742E408BF6",
        "contractName": "ibAlluoUSD Polygon",
        "roleOwner": "0x49a659FF55b6eBE9F5f8F2495Cfad0B02bfFa91c",
        "role": "0x8e81cee32eed7d8f4f15cd1d324edf5fe36cbe57fae18180879d4bdc265ceb30",
        "roleDecoded": "GELATO",
        "roleOwnerName": "Superfluid Resolver"
    },
    {
        "contract": "0xC2DbaAEA2EfA47EBda3E572aa0e55B742E408BF6",
        "contractName": "ibAlluoUSD Polygon",
        "roleOwner": "0xac9024554aA823C7d0A2e73Fc3fea9639e7c6f9A",
        "role": "0x8e81cee32eed7d8f4f15cd1d324edf5fe36cbe57fae18180879d4bdc265ceb30",
        "roleDecoded": "GELATO",
        "roleOwnerName": "Superfluid End Resolver"
    },
    {
        "contract": "0xE9E759B969B991F2bFae84308385405B9Ab01541",
        "contractName": "StibAlluoUSD Polygon",
        "roleOwner": "0xC2DbaAEA2EfA47EBda3E572aa0e55B742E408BF6",
        "role": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "roleDecoded": "DEFAULT_ADMIN_ROLE",
        "roleOwnerName": "ibAlluoUSD Polygon"
    },
    {
        "contract": "0xE9E759B969B991F2bFae84308385405B9Ab01541",
        "contractName": "StibAlluoUSD Polygon",
        "roleOwner": "0x2580f9954529853Ca5aC5543cE39E9B5B1145135",
        "role": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "roleDecoded": "DEFAULT_ADMIN_ROLE",
        "roleOwnerName": "Polygon Gnosis"
    },
    {
        "contract": "0xc9d8556645853C465D1D5e7d2c81A0031F0B8a92",
        "contractName": "ibAlluoEUR Polygon",
        "roleOwner": "0x2580f9954529853Ca5aC5543cE39E9B5B1145135",
        "role": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "roleDecoded": "DEFAULT_ADMIN_ROLE",
        "roleOwnerName": "Polygon Gnosis"
    },
    {
        "contract": "0xc9d8556645853C465D1D5e7d2c81A0031F0B8a92",
        "contractName": "ibAlluoEUR Polygon",
        "roleOwner": "0x2580f9954529853Ca5aC5543cE39E9B5B1145135",
        "role": "0x189ab7a9244df0848122154315af71fe140f3db0fe014031783b0946b8c9d2e3",
        "roleDecoded": "UPGRADER_ROLE",
        "roleOwnerName": "Polygon Gnosis"
    },
    {
        "contract": "0xc9d8556645853C465D1D5e7d2c81A0031F0B8a92",
        "contractName": "ibAlluoEUR Polygon",
        "roleOwner": "0x1D147031b6B4998bE7D446DecF7028678aeb732A",
        "role": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "roleDecoded": "DEFAULT_ADMIN_ROLE",
        "roleOwnerName": "Vote Executor Slave"
    },
    {
        "contract": "0xc9d8556645853C465D1D5e7d2c81A0031F0B8a92",
        "contractName": "ibAlluoEUR Polygon",
        "roleOwner": "0x49a659FF55b6eBE9F5f8F2495Cfad0B02bfFa91c",
        "role": "0x8e81cee32eed7d8f4f15cd1d324edf5fe36cbe57fae18180879d4bdc265ceb30",
        "roleDecoded": "GELATO",
        "roleOwnerName": "Superfluid Resolver"
    },
    {
        "contract": "0xc9d8556645853C465D1D5e7d2c81A0031F0B8a92",
        "contractName": "ibAlluoEUR Polygon",
        "roleOwner": "0xac9024554aA823C7d0A2e73Fc3fea9639e7c6f9A",
        "role": "0x8e81cee32eed7d8f4f15cd1d324edf5fe36cbe57fae18180879d4bdc265ceb30",
        "roleDecoded": "GELATO",
        "roleOwnerName": "Superfluid End Resolver"
    },
    {
        "contract": "0xe199f1B01Dd3e8a1C43B62279FEb20547a2EB3eF",
        "contractName": "StibAlluoEUR Polygon",
        "roleOwner": "0xc9d8556645853C465D1D5e7d2c81A0031F0B8a92",
        "role": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "roleDecoded": "DEFAULT_ADMIN_ROLE",
        "roleOwnerName": "ibAlluoEUR Polygon"
    },
    {
        "contract": "0xe199f1B01Dd3e8a1C43B62279FEb20547a2EB3eF",
        "contractName": "StibAlluoEUR Polygon",
        "roleOwner": "0x2580f9954529853Ca5aC5543cE39E9B5B1145135",
        "role": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "roleDecoded": "DEFAULT_ADMIN_ROLE",
        "roleOwnerName": "Polygon Gnosis"
    },
    {
        "contract": "0xc677B0918a96ad258A68785C2a3955428DeA7e50",
        "contractName": "ibAlluoETH Polygon",
        "roleOwner": "0x2580f9954529853Ca5aC5543cE39E9B5B1145135",
        "role": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "roleDecoded": "DEFAULT_ADMIN_ROLE",
        "roleOwnerName": "Polygon Gnosis"
    },
    {
        "contract": "0xc677B0918a96ad258A68785C2a3955428DeA7e50",
        "contractName": "ibAlluoETH Polygon",
        "roleOwner": "0x2580f9954529853Ca5aC5543cE39E9B5B1145135",
        "role": "0x189ab7a9244df0848122154315af71fe140f3db0fe014031783b0946b8c9d2e3",
        "roleDecoded": "UPGRADER_ROLE",
        "roleOwnerName": "Polygon Gnosis"
    },
    {
        "contract": "0xc677B0918a96ad258A68785C2a3955428DeA7e50",
        "contractName": "ibAlluoETH Polygon",
        "roleOwner": "0x1D147031b6B4998bE7D446DecF7028678aeb732A",
        "role": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "roleDecoded": "DEFAULT_ADMIN_ROLE",
        "roleOwnerName": "Vote Executor Slave"
    },
    {
        "contract": "0xc677B0918a96ad258A68785C2a3955428DeA7e50",
        "contractName": "ibAlluoETH Polygon",
        "roleOwner": "0x49a659FF55b6eBE9F5f8F2495Cfad0B02bfFa91c",
        "role": "0x8e81cee32eed7d8f4f15cd1d324edf5fe36cbe57fae18180879d4bdc265ceb30",
        "roleDecoded": "GELATO",
        "roleOwnerName": "Superfluid Resolver"
    },
    {
        "contract": "0xc677B0918a96ad258A68785C2a3955428DeA7e50",
        "contractName": "ibAlluoETH Polygon",
        "roleOwner": "0xac9024554aA823C7d0A2e73Fc3fea9639e7c6f9A",
        "role": "0x8e81cee32eed7d8f4f15cd1d324edf5fe36cbe57fae18180879d4bdc265ceb30",
        "roleDecoded": "GELATO",
        "roleOwnerName": "Superfluid End Resolver"
    },
    {
        "contract": "0x2D4Dc956FBd0044a4EBA945e8bbaf98a14025C2d",
        "contractName": "StibAlluoETH Polygon",
        "roleOwner": "0xc677B0918a96ad258A68785C2a3955428DeA7e50",
        "role": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "roleDecoded": "DEFAULT_ADMIN_ROLE",
        "roleOwnerName": "ibAlluoETH Polygon"
    },
    {
        "contract": "0x2D4Dc956FBd0044a4EBA945e8bbaf98a14025C2d",
        "contractName": "StibAlluoETH Polygon",
        "roleOwner": "0x2580f9954529853Ca5aC5543cE39E9B5B1145135",
        "role": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "roleDecoded": "DEFAULT_ADMIN_ROLE",
        "roleOwnerName": "Polygon Gnosis"
    },
    {
        "contract": "0x2D4Dc956FBd0044a4EBA945e8bbaf98a14025C2d",
        "contractName": "StibAlluoETH Polygon",
        "roleOwner": "0xC2DbaAEA2EfA47EBda3E572aa0e55B742E408BF6",
        "role": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "roleDecoded": "DEFAULT_ADMIN_ROLE",
        "roleOwnerName": "ibAlluoUSD Polygon"
    },
    {
        "contract": "0xf272Ff86c86529504f0d074b210e95fc4cFCDce2",
        "contractName": "ibAlluoBTC Polygon",
        "roleOwner": "0x2580f9954529853Ca5aC5543cE39E9B5B1145135",
        "role": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "roleDecoded": "DEFAULT_ADMIN_ROLE",
        "roleOwnerName": "Polygon Gnosis"
    },
    {
        "contract": "0xf272Ff86c86529504f0d074b210e95fc4cFCDce2",
        "contractName": "ibAlluoBTC Polygon",
        "roleOwner": "0x2580f9954529853Ca5aC5543cE39E9B5B1145135",
        "role": "0x189ab7a9244df0848122154315af71fe140f3db0fe014031783b0946b8c9d2e3",
        "roleDecoded": "UPGRADER_ROLE",
        "roleOwnerName": "Polygon Gnosis"
    },
    {
        "contract": "0xf272Ff86c86529504f0d074b210e95fc4cFCDce2",
        "contractName": "ibAlluoBTC Polygon",
        "roleOwner": "0x1D147031b6B4998bE7D446DecF7028678aeb732A",
        "role": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "roleDecoded": "DEFAULT_ADMIN_ROLE",
        "roleOwnerName": "Vote Executor Slave"
    },
    {
        "contract": "0xf272Ff86c86529504f0d074b210e95fc4cFCDce2",
        "contractName": "ibAlluoBTC Polygon",
        "roleOwner": "0x49a659FF55b6eBE9F5f8F2495Cfad0B02bfFa91c",
        "role": "0x8e81cee32eed7d8f4f15cd1d324edf5fe36cbe57fae18180879d4bdc265ceb30",
        "roleDecoded": "GELATO",
        "roleOwnerName": "Superfluid Resolver"
    },
    {
        "contract": "0xf272Ff86c86529504f0d074b210e95fc4cFCDce2",
        "contractName": "ibAlluoBTC Polygon",
        "roleOwner": "0xac9024554aA823C7d0A2e73Fc3fea9639e7c6f9A",
        "role": "0x8e81cee32eed7d8f4f15cd1d324edf5fe36cbe57fae18180879d4bdc265ceb30",
        "roleDecoded": "GELATO",
        "roleOwnerName": "Superfluid End Resolver"
    },
    {
        "contract": "0x3E70E15c189e1FFe8FF44d713605528dC1701b63",
        "contractName": "StibAlluoBTC Polygon",
        "roleOwner": "0xf272Ff86c86529504f0d074b210e95fc4cFCDce2",
        "role": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "roleDecoded": "DEFAULT_ADMIN_ROLE",
        "roleOwnerName": "ibAlluoBTC Polygon"
    },
    {
        "contract": "0x3E70E15c189e1FFe8FF44d713605528dC1701b63",
        "contractName": "StibAlluoBTC Polygon",
        "roleOwner": "0x2580f9954529853Ca5aC5543cE39E9B5B1145135",
        "role": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "roleDecoded": "DEFAULT_ADMIN_ROLE",
        "roleOwnerName": "Polygon Gnosis"
    },
    {
        "contract": "0x3E70E15c189e1FFe8FF44d713605528dC1701b63",
        "contractName": "StibAlluoBTC Polygon",
        "roleOwner": "0xC2DbaAEA2EfA47EBda3E572aa0e55B742E408BF6",
        "role": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "roleDecoded": "DEFAULT_ADMIN_ROLE",
        "roleOwnerName": "ibAlluoUSD Polygon"
    },
    {
        "contract": "0x49a659FF55b6eBE9F5f8F2495Cfad0B02bfFa91c",
        "contractName": "Superfluid Resolver",
        "roleOwner": "0xC2DbaAEA2EfA47EBda3E572aa0e55B742E408BF6",
        "role": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "roleDecoded": "DEFAULT_ADMIN_ROLE",
        "roleOwnerName": "ibAlluoUSD Polygon"
    },
    {
        "contract": "0x49a659FF55b6eBE9F5f8F2495Cfad0B02bfFa91c",
        "contractName": "Superfluid Resolver",
        "roleOwner": "0xc9d8556645853C465D1D5e7d2c81A0031F0B8a92",
        "role": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "roleDecoded": "DEFAULT_ADMIN_ROLE",
        "roleOwnerName": "ibAlluoEUR Polygon"
    },
    {
        "contract": "0x49a659FF55b6eBE9F5f8F2495Cfad0B02bfFa91c",
        "contractName": "Superfluid Resolver",
        "roleOwner": "0xc677B0918a96ad258A68785C2a3955428DeA7e50",
        "role": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "roleDecoded": "DEFAULT_ADMIN_ROLE",
        "roleOwnerName": "ibAlluoETH Polygon"
    },
    {
        "contract": "0x49a659FF55b6eBE9F5f8F2495Cfad0B02bfFa91c",
        "contractName": "Superfluid Resolver",
        "roleOwner": "0xf272Ff86c86529504f0d074b210e95fc4cFCDce2",
        "role": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "roleDecoded": "DEFAULT_ADMIN_ROLE",
        "roleOwnerName": "ibAlluoBTC Polygon"
    },
    {
        "contract": "0x49a659FF55b6eBE9F5f8F2495Cfad0B02bfFa91c",
        "contractName": "Superfluid Resolver",
        "roleOwner": "0x2580f9954529853Ca5aC5543cE39E9B5B1145135",
        "role": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "roleDecoded": "DEFAULT_ADMIN_ROLE",
        "roleOwnerName": "Polygon Gnosis"
    },
    {
        "contract": "0x49a659FF55b6eBE9F5f8F2495Cfad0B02bfFa91c",
        "contractName": "Superfluid Resolver",
        "roleOwner": "0x2580f9954529853Ca5aC5543cE39E9B5B1145135",
        "role": "0x8e81cee32eed7d8f4f15cd1d324edf5fe36cbe57fae18180879d4bdc265ceb30",
        "roleDecoded": "GELATO",
        "roleOwnerName": "Polygon Gnosis"
    },
    {
        "contract": "0x49a659FF55b6eBE9F5f8F2495Cfad0B02bfFa91c",
        "contractName": "Superfluid Resolver",
        "roleOwner": "0x0391ceD60d22Bc2FadEf543619858b12155b7030",
        "role": "0x8e81cee32eed7d8f4f15cd1d324edf5fe36cbe57fae18180879d4bdc265ceb30",
        "roleDecoded": "GELATO",
        "roleOwnerName": "msg.sender from Gelato"
    },
    {
        "contract": "0xac9024554aA823C7d0A2e73Fc3fea9639e7c6f9A",
        "contractName": "Superfluid End Resolver",
        "roleOwner": "0xC2DbaAEA2EfA47EBda3E572aa0e55B742E408BF6",
        "role": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "roleDecoded": "DEFAULT_ADMIN_ROLE",
        "roleOwnerName": "ibAlluoUSD Polygon"
    },
    {
        "contract": "0xac9024554aA823C7d0A2e73Fc3fea9639e7c6f9A",
        "contractName": "Superfluid End Resolver",
        "roleOwner": "0xc9d8556645853C465D1D5e7d2c81A0031F0B8a92",
        "role": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "roleDecoded": "DEFAULT_ADMIN_ROLE",
        "roleOwnerName": "ibAlluoEUR Polygon"
    },
    {
        "contract": "0xac9024554aA823C7d0A2e73Fc3fea9639e7c6f9A",
        "contractName": "Superfluid End Resolver",
        "roleOwner": "0xc677B0918a96ad258A68785C2a3955428DeA7e50",
        "role": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "roleDecoded": "DEFAULT_ADMIN_ROLE",
        "roleOwnerName": "ibAlluoETH Polygon"
    },
    {
        "contract": "0xac9024554aA823C7d0A2e73Fc3fea9639e7c6f9A",
        "contractName": "Superfluid End Resolver",
        "roleOwner": "0xf272Ff86c86529504f0d074b210e95fc4cFCDce2",
        "role": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "roleDecoded": "DEFAULT_ADMIN_ROLE",
        "roleOwnerName": "ibAlluoBTC Polygon"
    },
    {
        "contract": "0xac9024554aA823C7d0A2e73Fc3fea9639e7c6f9A",
        "contractName": "Superfluid End Resolver",
        "roleOwner": "0x0391ceD60d22Bc2FadEf543619858b12155b7030",
        "role": "0x8e81cee32eed7d8f4f15cd1d324edf5fe36cbe57fae18180879d4bdc265ceb30",
        "roleDecoded": "GELATO",
        "roleOwnerName": "msg.sender from Gelato"
    },
    {
        "contract": "0xac9024554aA823C7d0A2e73Fc3fea9639e7c6f9A",
        "contractName": "Superfluid End Resolver",
        "roleOwner": "0x2580f9954529853Ca5aC5543cE39E9B5B1145135",
        "role": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "roleDecoded": "DEFAULT_ADMIN_ROLE",
        "roleOwnerName": "Polygon Gnosis"
    },
    {
        "contract": "0xac9024554aA823C7d0A2e73Fc3fea9639e7c6f9A",
        "contractName": "Superfluid End Resolver",
        "roleOwner": "0x2580f9954529853Ca5aC5543cE39E9B5B1145135",
        "role": "0x8e81cee32eed7d8f4f15cd1d324edf5fe36cbe57fae18180879d4bdc265ceb30",
        "roleDecoded": "GELATO",
        "roleOwnerName": "Polygon Gnosis"
    },
    {
        "contract": "0x1D147031b6B4998bE7D446DecF7028678aeb732A",
        "contractName": "Vote Executor Slave",
        "roleOwner": "0x2580f9954529853Ca5aC5543cE39E9B5B1145135",
        "role": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "roleDecoded": "DEFAULT_ADMIN_ROLE",
        "roleOwnerName": "Polygon Gnosis"
    },
    {
        "contract": "0x1D147031b6B4998bE7D446DecF7028678aeb732A",
        "contractName": "Vote Executor Slave",
        "roleOwner": "0x2580f9954529853Ca5aC5543cE39E9B5B1145135",
        "role": "0x189ab7a9244df0848122154315af71fe140f3db0fe014031783b0946b8c9d2e3",
        "roleDecoded": "UPGRADER_ROLE",
        "roleOwnerName": "Polygon Gnosis"
    },
    {
        "contract": "0xb63bb8a0500a2F5c3F0c46E203f392Ca08947494",
        "contractName": "BTC Adapter",
        "roleOwner": "0x2580f9954529853Ca5aC5543cE39E9B5B1145135",
        "role": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "roleDecoded": "DEFAULT_ADMIN_ROLE",
        "roleOwnerName": "Polygon Gnosis"
    },
    {
        "contract": "0xb63bb8a0500a2F5c3F0c46E203f392Ca08947494",
        "contractName": "BTC Adapter",
        "roleOwner": "0x31a3439Ac7E6Ea7e0C0E4b846F45700c6354f8c1",
        "role": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "roleDecoded": "DEFAULT_ADMIN_ROLE",
        "roleOwnerName": "Liquidity Handler"
    },
    {
        "contract": "0xb63bb8a0500a2F5c3F0c46E203f392Ca08947494",
        "contractName": "BTC Adapter",
        "roleOwner": "0x2580f9954529853Ca5aC5543cE39E9B5B1145135",
        "role": "0x189ab7a9244df0848122154315af71fe140f3db0fe014031783b0946b8c9d2e3",
        "roleDecoded": "UPGRADER_ROLE",
        "roleOwnerName": "Polygon Gnosis"
    },
    {
        "contract": "0xb63bb8a0500a2F5c3F0c46E203f392Ca08947494",
        "contractName": "BTC Adapter",
        "roleOwner": "0x466b375cE0D1161aEb3e69f92B2B9c365f7877BE",
        "role": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "roleDecoded": "DEFAULT_ADMIN_ROLE",
        "roleOwnerName": "Buffer Manager"
    },
    {
        "contract": "0x466b375cE0D1161aEb3e69f92B2B9c365f7877BE",
        "contractName": "Buffer Manager",
        "roleOwner": "0x2580f9954529853Ca5aC5543cE39E9B5B1145135",
        "role": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "roleDecoded": "DEFAULT_ADMIN_ROLE",
        "roleOwnerName": "Polygon Gnosis"
    },
    {
        "contract": "0x466b375cE0D1161aEb3e69f92B2B9c365f7877BE",
        "contractName": "Buffer Manager",
        "roleOwner": "0x2580f9954529853Ca5aC5543cE39E9B5B1145135",
        "role": "0x189ab7a9244df0848122154315af71fe140f3db0fe014031783b0946b8c9d2e3",
        "roleDecoded": "UPGRADER_ROLE",
        "roleOwnerName": "Polygon Gnosis"
    },
    {
        "contract": "0x466b375cE0D1161aEb3e69f92B2B9c365f7877BE",
        "contractName": "Buffer Manager",
        "roleOwner": "0x2580f9954529853Ca5aC5543cE39E9B5B1145135",
        "role": "0x8e81cee32eed7d8f4f15cd1d324edf5fe36cbe57fae18180879d4bdc265ceb30",
        "roleDecoded": "GELATO",
        "roleOwnerName": "Polygon Gnosis"
    },
    {
        "contract": "0x466b375cE0D1161aEb3e69f92B2B9c365f7877BE",
        "contractName": "Buffer Manager",
        "roleOwner": "0x2580f9954529853Ca5aC5543cE39E9B5B1145135",
        "role": "0xd2761b102bda9831f4af400cc824b8cecb9cc5c1c85c51acb1479db9735fbfc6",
        "roleDecoded": "SWAPPER",
        "roleOwnerName": "Polygon Gnosis"
    },
    {
        "contract": "0x466b375cE0D1161aEb3e69f92B2B9c365f7877BE",
        "contractName": "Buffer Manager",
        "roleOwner": "0x0391ceD60d22Bc2FadEf543619858b12155b7030",
        "role": "0x8e81cee32eed7d8f4f15cd1d324edf5fe36cbe57fae18180879d4bdc265ceb30",
        "roleDecoded": "GELATO",
        "roleOwnerName": "msg.sender from Gelato"
    },
    {
        "contract": "0x466b375cE0D1161aEb3e69f92B2B9c365f7877BE",
        "contractName": "Buffer Manager",
        "roleOwner": "0x0391ceD60d22Bc2FadEf543619858b12155b7030",
        "role": "0xd2761b102bda9831f4af400cc824b8cecb9cc5c1c85c51acb1479db9735fbfc6",
        "roleDecoded": "SWAPPER",
        "roleOwnerName": "msg.sender from Gelato"
    },
    {
        "contract": "0x531f26C5fc03b2e394D4054Aac97924f2bd8E1D3",
        "contractName": "ETH Adapter",
        "roleOwner": "0x2580f9954529853Ca5aC5543cE39E9B5B1145135",
        "role": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "roleDecoded": "DEFAULT_ADMIN_ROLE",
        "roleOwnerName": "Polygon Gnosis"
    },
    {
        "contract": "0x531f26C5fc03b2e394D4054Aac97924f2bd8E1D3",
        "contractName": "ETH Adapter",
        "roleOwner": "0x31a3439Ac7E6Ea7e0C0E4b846F45700c6354f8c1",
        "role": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "roleDecoded": "DEFAULT_ADMIN_ROLE",
        "roleOwnerName": "Liquidity Handler"
    },
    {
        "contract": "0x531f26C5fc03b2e394D4054Aac97924f2bd8E1D3",
        "contractName": "ETH Adapter",
        "roleOwner": "0x2580f9954529853Ca5aC5543cE39E9B5B1145135",
        "role": "0x189ab7a9244df0848122154315af71fe140f3db0fe014031783b0946b8c9d2e3",
        "roleDecoded": "UPGRADER_ROLE",
        "roleOwnerName": "Polygon Gnosis"
    },
    {
        "contract": "0x531f26C5fc03b2e394D4054Aac97924f2bd8E1D3",
        "contractName": "ETH Adapter",
        "roleOwner": "0x466b375cE0D1161aEb3e69f92B2B9c365f7877BE",
        "role": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "roleDecoded": "DEFAULT_ADMIN_ROLE",
        "roleOwnerName": "Buffer Manager"
    },
    {
        "contract": "0x2D5a94fF5fC8c9Fb37c1F30e149e9a7E6ABC6C4C",
        "contractName": "EUR Adapter",
        "roleOwner": "0x2580f9954529853Ca5aC5543cE39E9B5B1145135",
        "role": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "roleDecoded": "DEFAULT_ADMIN_ROLE",
        "roleOwnerName": "Polygon Gnosis"
    },
    {
        "contract": "0x2D5a94fF5fC8c9Fb37c1F30e149e9a7E6ABC6C4C",
        "contractName": "EUR Adapter",
        "roleOwner": "0x31a3439Ac7E6Ea7e0C0E4b846F45700c6354f8c1",
        "role": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "roleDecoded": "DEFAULT_ADMIN_ROLE",
        "roleOwnerName": "Liquidity Handler"
    },
    {
        "contract": "0x2D5a94fF5fC8c9Fb37c1F30e149e9a7E6ABC6C4C",
        "contractName": "EUR Adapter",
        "roleOwner": "0x2580f9954529853Ca5aC5543cE39E9B5B1145135",
        "role": "0x189ab7a9244df0848122154315af71fe140f3db0fe014031783b0946b8c9d2e3",
        "roleDecoded": "UPGRADER_ROLE",
        "roleOwnerName": "Polygon Gnosis"
    },
    {
        "contract": "0x2D5a94fF5fC8c9Fb37c1F30e149e9a7E6ABC6C4C",
        "contractName": "EUR Adapter",
        "roleOwner": "0x466b375cE0D1161aEb3e69f92B2B9c365f7877BE",
        "role": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "roleDecoded": "DEFAULT_ADMIN_ROLE",
        "roleOwnerName": "Buffer Manager"
    },
    {
        "contract": "0x4B47188dE4D1591EA0542db7fFb9E7294db84197",
        "contractName": "USD Adapter",
        "roleOwner": "0x2580f9954529853Ca5aC5543cE39E9B5B1145135",
        "role": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "roleDecoded": "DEFAULT_ADMIN_ROLE",
        "roleOwnerName": "Polygon Gnosis"
    },
    {
        "contract": "0x4B47188dE4D1591EA0542db7fFb9E7294db84197",
        "contractName": "USD Adapter",
        "roleOwner": "0x31a3439Ac7E6Ea7e0C0E4b846F45700c6354f8c1",
        "role": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "roleDecoded": "DEFAULT_ADMIN_ROLE",
        "roleOwnerName": "Liquidity Handler"
    },
    {
        "contract": "0x4B47188dE4D1591EA0542db7fFb9E7294db84197",
        "contractName": "USD Adapter",
        "roleOwner": "0x2580f9954529853Ca5aC5543cE39E9B5B1145135",
        "role": "0x189ab7a9244df0848122154315af71fe140f3db0fe014031783b0946b8c9d2e3",
        "roleDecoded": "UPGRADER_ROLE",
        "roleOwnerName": "Polygon Gnosis"
    },
    {
        "contract": "0x4B47188dE4D1591EA0542db7fFb9E7294db84197",
        "contractName": "USD Adapter",
        "roleOwner": "0x466b375cE0D1161aEb3e69f92B2B9c365f7877BE",
        "role": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "roleDecoded": "DEFAULT_ADMIN_ROLE",
        "roleOwnerName": "Buffer Manager"
    },
    {
        "contract": "0xeE0674C1E7d0f64057B6eCFe845DC2519443567F",
        "contractName": "Exchange",
        "roleOwner": "0x2580f9954529853Ca5aC5543cE39E9B5B1145135",
        "role": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "roleDecoded": "DEFAULT_ADMIN_ROLE",
        "roleOwnerName": "Polygon Gnosis"
    },
    {
        "contract": "0x31a3439Ac7E6Ea7e0C0E4b846F45700c6354f8c1",
        "contractName": "Liquidity Handler",
        "roleOwner": "0x2580f9954529853Ca5aC5543cE39E9B5B1145135",
        "role": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "roleDecoded": "DEFAULT_ADMIN_ROLE",
        "roleOwnerName": "Polygon Gnosis"
    },
    {
        "contract": "0x31a3439Ac7E6Ea7e0C0E4b846F45700c6354f8c1",
        "contractName": "Liquidity Handler",
        "roleOwner": "0x2580f9954529853Ca5aC5543cE39E9B5B1145135",
        "role": "0x189ab7a9244df0848122154315af71fe140f3db0fe014031783b0946b8c9d2e3",
        "roleDecoded": "UPGRADER_ROLE",
        "roleOwnerName": "Polygon Gnosis"
    },
    {
        "contract": "0x31a3439Ac7E6Ea7e0C0E4b846F45700c6354f8c1",
        "contractName": "Liquidity Handler",
        "roleOwner": "0xC2DbaAEA2EfA47EBda3E572aa0e55B742E408BF6",
        "role": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "roleDecoded": "DEFAULT_ADMIN_ROLE",
        "roleOwnerName": "ibAlluoUSD Polygon"
    },
    {
        "contract": "0x31a3439Ac7E6Ea7e0C0E4b846F45700c6354f8c1",
        "contractName": "Liquidity Handler",
        "roleOwner": "0xc9d8556645853C465D1D5e7d2c81A0031F0B8a92",
        "role": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "roleDecoded": "DEFAULT_ADMIN_ROLE",
        "roleOwnerName": "ibAlluoEUR Polygon"
    },
    {
        "contract": "0x31a3439Ac7E6Ea7e0C0E4b846F45700c6354f8c1",
        "contractName": "Liquidity Handler",
        "roleOwner": "0xc677B0918a96ad258A68785C2a3955428DeA7e50",
        "role": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "roleDecoded": "DEFAULT_ADMIN_ROLE",
        "roleOwnerName": "ibAlluoETH Polygon"
    },
    {
        "contract": "0x31a3439Ac7E6Ea7e0C0E4b846F45700c6354f8c1",
        "contractName": "Liquidity Handler",
        "roleOwner": "0xf272Ff86c86529504f0d074b210e95fc4cFCDce2",
        "role": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "roleDecoded": "DEFAULT_ADMIN_ROLE",
        "roleOwnerName": "ibAlluoBTC Polygon"
    },
    {
        "contract": "0x31a3439Ac7E6Ea7e0C0E4b846F45700c6354f8c1",
        "contractName": "Liquidity Handler",
        "roleOwner": "0x466b375cE0D1161aEb3e69f92B2B9c365f7877BE",
        "role": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "roleDecoded": "DEFAULT_ADMIN_ROLE",
        "roleOwnerName": "Buffer Manager"
    },
    {
        "contract": "0x82220c7Be3a00ba0C6ed38572400A97445bdAEF2",
        "contractName": "Price Router",
        "roleOwner": "0x2580f9954529853Ca5aC5543cE39E9B5B1145135",
        "role": "0x0000000000000000000000000000000000000000000000000000000000000000",
        "roleDecoded": "DEFAULT_ADMIN_ROLE",
        "roleOwnerName": "Polygon Gnosis"
    },
    {
        "contract": "0x82220c7Be3a00ba0C6ed38572400A97445bdAEF2",
        "contractName": "Price Router",
        "roleOwner": "0x2580f9954529853Ca5aC5543cE39E9B5B1145135",
        "role": "0x189ab7a9244df0848122154315af71fe140f3db0fe014031783b0946b8c9d2e3",
        "roleDecoded": "UPGRADER_ROLE",
        "roleOwnerName": "Polygon Gnosis"
    }
]

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
})