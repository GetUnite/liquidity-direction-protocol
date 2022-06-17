import { BigNumber } from "ethers";
import { ethers, upgrades } from "hardhat"

async function main() {
    const pseudoMultisig = await ethers.getContractFactory("PseudoMultisigWallet");
    const multisig = await (await pseudoMultisig.deploy(true)).deployed()
    console.log(multisig.address, "ADdress of multisig")
    const gnosis = multisig.address
  

    const Handler = await ethers.getContractFactory("LiquidityHandler");

    let handler = await upgrades.deployProxy(Handler,
          [gnosis],
          {initializer: 'initialize', kind:'uups'}
    );
  
    console.log("Handler upgradable deployed to:", handler.address);


    let trustedForwarder = multisig.address

    const IbAlluo = await ethers.getContractFactory("IbAlluo");
    const TestERC20 = await ethers.getContractFactory("TestERC20")

    
    const fakeUSDC = await (await TestERC20.deploy("USDC", "USDC", 6, true, multisig.address)).deployed()
    const fakeDai = await (await TestERC20.deploy("DAI", "DAI", 18, true, multisig.address)).deployed()
    const fakeUSDT = await (await TestERC20.deploy("USDT", "USDT", 6, true, multisig.address)).deployed()

    
    const fakeWETH = await (await TestERC20.deploy("WETH", "WETH", 18, true, multisig.address)).deployed()


    const fakePAR = await (await TestERC20.deploy("PAR", "PAR", 18, true, multisig.address)).deployed()
    const fakeEURT = await (await TestERC20.deploy("EURT", "EURT", 6, true, multisig.address)).deployed()
    const fakeEURS = await (await TestERC20.deploy("EURS", "EURS", 2, true, multisig.address)).deployed()
    const fakejEUR = await (await TestERC20.deploy("jEUR", "jEUR", 18, true, multisig.address)).deployed()

    console.log("fakeUSDC", fakeUSDC.address);
    console.log("fakeDai", fakeDai.address);
    console.log("fakeUSDT", fakeUSDT.address);

    console.log("fakeWeth", fakeWETH.address)

    console.log("fakePAR", fakePAR.address);
    console.log("fakeEURT", fakeEURT.address);
    console.log("fakeEURS", fakeEURS.address)
    console.log("FakejEUR", fakejEUR.address);

    let ethSupported = [fakeWETH.address];


    let ibAlluoEth = await upgrades.deployProxy(IbAlluo,
        [
            "Interest Bearing Alluo ETH",
            "IbAlluoETH",
            gnosis,
            handler.address,
            ethSupported,
            BigNumber.from("100000000154712590"),
            500,
            trustedForwarder],
        { initializer: 'initialize', kind: 'uups' }
    );

    console.log("ibAlluoEth deployed to:", ibAlluoEth.address);

    let eurSupported = [fakePAR.address, fakeEURT.address, fakeEURS.address, fakejEUR.address];

    let ibAlluoEur = await upgrades.deployProxy(IbAlluo,
        [
            "Interest Bearing Alluo EUR",
            "IbAlluoEUR",
            gnosis,
            handler.address,
            eurSupported,
            BigNumber.from("100000000214544160"),
            700,
            trustedForwarder],
        { initializer: 'initialize', kind: 'uups' }
    );

    console.log("ibAlluoEur deployed to:", ibAlluoEur.address);

    let usdSupported = [fakeUSDC.address, fakeUSDT.address, fakeDai.address];

    let ibAlluoUsd = await upgrades.deployProxy(IbAlluo,
        [
            "Interest Bearing Alluo EUR",
            "IbAlluoEUR",
            gnosis,
            handler.address,
            usdSupported,
            BigNumber.from("100000000314544160"),
            700,
            trustedForwarder],
        { initializer: 'initialize', kind: 'uups' }
    );

    console.log("ibAlluoUsd deployed to:", ibAlluoUsd.address);




}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

