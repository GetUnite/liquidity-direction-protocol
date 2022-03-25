import * as dotenv from "dotenv";

import { HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import 'hardhat-contract-sizer'
import './tasks'
import '@openzeppelin/hardhat-upgrades';

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.11",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000000,
      },
    },
  },
  // networks: {
  //   hardhat: {
  //     accounts: {
  //       mnemonic: process.env.MNEMONIC,
  //     },
<<<<<<< HEAD
  //     forking: {
  //       enabled: process.env.FORKING_ENABLED == "true",
  //       url: process.env.FORKING_URL as string
  //     }
=======
>>>>>>> 3f2362a838231d3ee2a591ddd8c166d1bc28d8b0
  //   },
  //   rinkeby: {
  //     url: process.env.RINKEBY_URL,
  //     gasPrice: "auto",
  //     accounts: {
  //       mnemonic: process.env.MNEMONIC,
  //     },
  //   },
  //   goerli: {
  //     url: process.env.GOERLI_URL,
  //     gasPrice: "auto",
  //     accounts: {
  //       mnemonic: process.env.MNEMONIC,
  //     },
  //   },
  //   maticmainnet: {
  //     url: process.env.POLYGON_URL,
  //     gasPrice: "auto",
  //     accounts: {
  //       mnemonic: process.env.MNEMONIC,
  //     },
  //   },
  //   matictestnet: {
  //     url: process.env.POLYGON_TESTNET_URL,
  //     gasPrice: "auto",
  //     accounts: {
  //       mnemonic: process.env.MNEMONIC,
  //     },
  //   }
  // },
<<<<<<< HEAD
  gasReporter: {
    enabled: process.env.REPORT_GAS == "true",
    currency: "USD",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  mocha: {
    timeout: 3600000,
  },
  contractSizer: {
    alphaSort: false,
    disambiguatePaths: false,
    runOnCompile: process.env.CONTRACT_SIZER == "true",
    strict: false,
  }
=======
  // gasReporter: {
  //   enabled: process.env.REPORT_GAS == "true",
  //   currency: "USD",
  // },
  // etherscan: {
  //   apiKey: process.env.ETHERSCAN_API_KEY,
  // },
  // mocha: {
  //   timeout: 3600000,
  // },
  // contractSizer: {
  //   alphaSort: false,
  //   disambiguatePaths: false,
  //   runOnCompile: process.env.CONTRACT_SIZER == "true",
  //   strict: false,
  // }
>>>>>>> 3f2362a838231d3ee2a591ddd8c166d1bc28d8b0
};

export default config;
