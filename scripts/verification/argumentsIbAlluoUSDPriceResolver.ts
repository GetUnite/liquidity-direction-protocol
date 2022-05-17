module.exports = [
    "0xC2DbaAEA2EfA47EBda3E572aa0e55B742E408BF6", //iBAlluoUSD
    "0x0B74fFf7D99E524319D59f4dC399413c1E4E1A93", //Gnosis address, also admin
    "0x645D275B7890823Afd3C669F8805e24EA64FFDaB" //Alluo user bank
  ];
//| => npx hardhat verify --constructor-args scripts/verification/argumentsIbAlluoUSDPriceResolver.ts 0x6267ead8D01A30C56943789eB324EfDE36c51Df0 --network mumbai
//| => npx hardhat verify --constructor-args scripts/verification/argumentsIbAlluoUSDPriceResolver.ts 0x9021de2b2085B6708Af34e6019A78b364a7209B3 --network polygon
