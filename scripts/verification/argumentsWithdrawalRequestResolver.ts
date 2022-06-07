module.exports = [
    "0x527a819db1eb0e34426297b03bae11F2f8B3A19E", //pokeMe for gelato ops
    "0xa248Ba96d72005114e6C941f299D315757877c0e", //Liquidity buffer on mainnet matic
    "0x0B74fFf7D99E524319D59f4dC399413c1E4E1A93" //Gnosis address, also admin
  ];
//| => npx hardhat verify --constructor-args scripts/verification/argumentsWithdrawalRequestResolver.ts 0x6267ead8D01A30C56943789eB324EfDE36c51Df0 --network mumbai
//| => npx hardhat verify --constructor-args scripts/verification/argumentsWithdrawalRequestResolver.ts 0x325a311CC623AcAdD8DAb7757c26181AfB7bc9F8 --network polygon