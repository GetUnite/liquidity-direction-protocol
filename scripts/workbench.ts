import { formatUnits, parseEther, parseUnits } from "ethers/lib/utils";
import { ethers, upgrades } from "hardhat";
import { UUPSProxiable } from "../typechain";

async function main() {
    const gnosis = await ethers.getImpersonatedSigner("0xc7061dD515B602F86733Fa0a0dBb6d6E6B34aED4");
    const signers = await ethers.getSigners();

    await signers[0].sendTransaction({
        to: gnosis.address,
        value: parseEther("100.0")
    })

    const priceRouter = await ethers.getContractAt("PriceFeedRouterV2", "0x7E6FD319A856A210b9957Cd6490306995830aD25");

    const weth = await ethers.getContractAt("IERC20Metadata", "0x4200000000000000000000000000000000000006");
    const wbtc = await ethers.getContractAt("IERC20Metadata", "0x68f180fcCe6836688e9084f035309E29Bf0A2095");
    const frax = await ethers.getContractAt("IERC20Metadata", "0x2E3D870790dC77A83DD1d18184Acc7439A53f475");
    const mai = await ethers.getContractAt("IERC20Metadata", "0xdFA46478F9e5EA86d57387849598dbFB2e964b02");
    const frxEth = await ethers.getContractAt("IERC20Metadata", "0x6806411765Af15Bddd26f8f544A34cC40cb9838B");

    const mooVelodromeMAIUSDC = await ethers.getContractAt("IERC20Metadata", "0x01D9cfB8a9D43013a1FdC925640412D8d2D900F0");
    const mooVelodromeDOLAMAI = await ethers.getContractAt("IERC20Metadata", "0xa9913D2DA71768CD13eA75B05D9E91A3120E2f08");
    const mooVelodromeDOLAFRAX = await ethers.getContractAt("IERC20Metadata", "0xe282AD2480fFD8e34454C56c4360E5ba3240a429");

    const chainlinkStrategyFactory = await ethers.getContractFactory("ChainlinkFeedStrategyV2");
    const velodromeStrategyFactory = await ethers.getContractFactory("VelodromeReferenceFeedStrategy");
    const strategyFactory = await ethers.getContractFactory("BeefyVelodromeStrategy");

    // already deployed and configured
    const usdcStrategy = "0x0b6bb9E47179390B7Cf708b57ceF65a44a8038a9";

    const wethStrategy = await upgrades.deployProxy(
        chainlinkStrategyFactory,
        [
            gnosis.address,
            "0x13e3Ee699D1909E989722E753853AE30b17e08c5",
            weth.address
        ],
        { kind: "uups" }
    );
    const fraxStrategy = await upgrades.deployProxy(
        chainlinkStrategyFactory,
        [
            gnosis.address,
            "0xc7d132becabe7dcc4204841f33bae45841e41d9c",
            frax.address
        ],
        { kind: "uups" }
    )
    const wbtcStrategy = await upgrades.deployProxy(
        chainlinkStrategyFactory,
        [
            gnosis.address,
            "0xD702DD976Fb76Fffc2D3963D037dfDae5b04E593",
            wbtc.address
        ],
        { kind: "uups" }
    );
    const maiStrategy = await upgrades.deployProxy(
        velodromeStrategyFactory,
        [
            gnosis.address,
            usdcStrategy,
            "0xd62C9D8a3D4fd98b27CaaEfE3571782a3aF0a737",
            true
        ],
        { kind: "uups" }
    );
    const frxEthStrategy = await upgrades.deployProxy(
        velodromeStrategyFactory,
        [
            gnosis.address,
            wethStrategy.address,
            "0x63642a192bab08b09a70a997bb35b36b9286b01e",
            true
        ],
        { kind: "uups" }
    )
    const mooVelodromeMAIUSDCStrategy = await upgrades.deployProxy(
        strategyFactory,
        [
            gnosis.address,
            mooVelodromeMAIUSDC.address,
            true,
            usdcStrategy
        ],
        { kind: "uups" }
    );
    const mooVelodromeDOLAFRAXStrategy = await upgrades.deployProxy(
        strategyFactory,
        [
            gnosis.address,
            mooVelodromeDOLAFRAX.address,
            true,
            fraxStrategy.address
        ],
        { kind: "uups" }
    );
    const mooVelodromeDOLAMAIStrategy = await upgrades.deployProxy(
        strategyFactory,
        [
            gnosis.address,
            mooVelodromeDOLAMAI.address,
            false,
            maiStrategy.address
        ],
        { kind: "uups" }
    );

    // execute these via gnosis
    await priceRouter.connect(gnosis).setCryptoStrategy(wethStrategy.address, weth.address);
    await priceRouter.connect(gnosis).setCryptoStrategy(wbtcStrategy.address, wbtc.address);
    await priceRouter.connect(gnosis).setCryptoStrategy(fraxStrategy.address, frax.address);
    await priceRouter.connect(gnosis).setCryptoStrategy(mooVelodromeMAIUSDCStrategy.address, mooVelodromeMAIUSDC.address);
    await priceRouter.connect(gnosis).setCryptoStrategy(mooVelodromeDOLAFRAXStrategy.address, mooVelodromeDOLAFRAX.address);
    await priceRouter.connect(gnosis).setCryptoStrategy(maiStrategy.address, mai.address);
    await priceRouter.connect(gnosis).setCryptoStrategy(frxEthStrategy.address, frxEth.address);
    await priceRouter.connect(gnosis).setCryptoStrategy(mooVelodromeDOLAMAIStrategy.address, mooVelodromeDOLAMAI.address);

    const fiats = ["USD", "EUR", "ETH", "BTC"];
    const cryptos = [frxEth];


    for (let i = 0; i < cryptos.length; i++) {
        const crypto = cryptos[i];

        for (let j = 0; j < fiats.length; j++) {
            const fiat = fiats[j];
            // returned amounts must be exactly same
            const res = await priceRouter["getPrice(address,string)"](crypto.address, fiat);
            const resAmount = await priceRouter["getPriceOfAmount(address,uint256,string)"](crypto.address, parseUnits("1.0", await crypto.decimals()), fiat);

            console.log(`1 ${await crypto.symbol()} costs ${formatUnits(res.value, res.decimals)} ${fiat}`);
            console.log(`1 ${await crypto.symbol()} costs ${formatUnits(resAmount.value, resAmount.decimals)} ${fiat}`);
        }

        console.log();
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
})