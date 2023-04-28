import { BigNumber } from "ethers";
import { ethers, upgrades } from "hardhat"
import { BtcNoPoolAdapterMainnet, BtcNoPoolAdapterMainnet__factory, EthNoPoolAdapterMainnet, EthNoPoolAdapterMainnet__factory, EurCurveAdapterMainnet, EurCurveAdapterMainnet__factory, IbAlluoMainnet, IbAlluoMainnet__factory, UsdCurveAdapterMainnet, UsdCurveAdapterMainnet__factory } from "../../typechain-types";

async function main() {

    const IbAlluo = await ethers.getContractFactory("IbAlluoMainnet") as IbAlluoMainnet__factory;

    const gnosis = "0x1F020A4943EB57cd3b2213A66b355CB662Ea43C3"
    const exchangeAddress = "0x29c66CF57a03d41Cfe6d9ecB6883aa0E2AbA21Ec";
    const handler = ""

    const dai = "0x6B175474E89094C44Da98b954EedeAC495271d0F"
    const usdc = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
    const usdt = "0xdAC17F958D2ee523a2206206994597C13D831ec7"

    let ibAlluoUsd = await upgrades.deployProxy(IbAlluo,
        [
            "Interest Bearing Alluo USD",
            "ibAlluoUsd",
            gnosis,
            handler,
            [dai,
                usdc,
                usdt
            ],
            BigNumber.from("100000000214544160"),
            700,
            exchangeAddress
        ], {
        initializer: 'initialize',
        kind: 'uups'
    }
    ) as IbAlluoMainnet;

    console.log("ibAlluoUsd deployed to:", ibAlluoUsd.address);


    const ageur = "0x1a7e4e63778B4f12a199C062f3eFdD288afCBce8";
    const eurt = "0xC581b735A1688071A1746c968e0798D642EDE491";
    const eurs = "0xdB25f211AB05b1c97D595516F45794528a807ad8";

    let ibAlluoEur = await upgrades.deployProxy(IbAlluo,
        [
            "Interest Bearing Alluo EUR",
            "ibAlluoEur",
            gnosis,
            handler,
            [ageur,
                eurt,
                eurs
            ],
            BigNumber.from("100000000214544160"),
            700,
            exchangeAddress
        ], {
        initializer: 'initialize',
        kind: 'uups'
    }
    ) as IbAlluoMainnet;
    console.log("ibAlluoEur deployed to:", ibAlluoEur.address);


    const weth = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"

    let ibAlluoEth = await upgrades.deployProxy(IbAlluo,
        [
            "Interest Bearing Alluo ETH",
            "ibAlluoEth",
            gnosis,
            handler,
            [weth],
            BigNumber.from("100000000154712590"),
            500,
            exchangeAddress
        ], {
        initializer: 'initialize',
        kind: 'uups'
    }
    ) as IbAlluoMainnet;
    console.log("ibAlluoEth deployed to:", ibAlluoEth.address);


    const wbtc = "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599"

    let ibAlluoBtc = await upgrades.deployProxy(IbAlluo,
        [
            "Interest Bearing Alluo BTC",
            "ibAlluoBtc",
            gnosis,
            handler,
            [wbtc],
            BigNumber.from("100000000154712590"),
            500,
            exchangeAddress
        ], {
        initializer: 'initialize',
        kind: 'uups'
    }
    ) as IbAlluoMainnet;
    console.log("ibAlluoBtc deployed to:", ibAlluoBtc.address);

}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

