module.exports = [
    "0xa248Ba96d72005114e6C941f299D315757877c0e", //Liquidity buffer on mainnet matic
    "0x0B74fFf7D99E524319D59f4dC399413c1E4E1A93", //Gnosis address, also admin
    "0x645D275B7890823Afd3C669F8805e24EA64FFDaB" //Alluo user bank
  ];
//| => npx hardhat verify --constructor-args scripts/verification/argumentsIbAlluoUSDPriceResolver.ts 0x6267ead8D01A30C56943789eB324EfDE36c51Df0 --network mumbai
//| => npx hardhat verify --constructor-args scripts/verification/argumentsIbAlluoUSDPriceResolver.ts 0x325a311CC623AcAdD8DAb7757c26181AfB7bc9F8 --network polygon
