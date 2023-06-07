
import * as dotenv from "dotenv";
import { HardhatUserConfig } from "hardhat/config";
import 'hardhat-contract-sizer'
import './tasks'
import '@openzeppelin/hardhat-upgrades';
import "hardhat-tracer";
import "@nomicfoundation/hardhat-toolbox";
import "@nomicfoundation/hardhat-chai-matchers";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.11",
        settings: {
          optimizer: {
            enabled: true,
            runs: 0,
          },
        },
      },
      {
        version: "0.8.17",
        settings: {
          optimizer: {
            enabled: true,
            runs: 0,
          },
        },
      }
    ],
    settings: {
      optimizer: {
        enabled: true,
        runs: 0,
      },
    },
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
      accounts: {
        mnemonic: process.env.MNEMONIC
      }
    },
    mainnet: {
      url: process.env.MAINNET_URL,
      gasPrice: 32000000000,
      accounts: {
        mnemonic: process.env.MNEMONIC,
      },
    },
    polygon: {
      url: process.env.POLYGON_URL,
      gasPrice: "auto",
      accounts: { mnemonic: process.env.MNEMONIC as string }

    },
    // fantom: {
    //   url: process.env.FANTOM_URL,
    //   gasPrice: "auto",
    //   accounts: {
    //     mnemonic: process.env.MNEMONIC,
    //   },
    // },
    // TESTNETS
    mumbai: {
      url: process.env.MUMBAI_URL,
      gasPrice: "auto",
      accounts: {
        mnemonic: process.env.MNEMONIC,
      },
    },
    // kovan: {
    //   url: process.env.KOVAN_URL,
    //   gasPrice: "auto",
    //   accounts: {
    //     mnemonic: process.env.MNEMONIC,
    //   },
    // },
    optimisticEthereum: {
      url: process.env.OPTIMISM_URL,
      gasPrice: "auto",
      accounts: { mnemonic: process.env.MNEMONIC as string }

    },
    goerli: {
      url: process.env.GOERLI_URL,
      gasPrice: "auto",
      accounts: {
        mnemonic: process.env.MNEMONIC,
      },
    },
  },

  gasReporter: {
    enabled: process.env.REPORT_GAS == "true",
    currency: "USD",
  },

  etherscan: {
    apiKey: {
      mainnet: process.env.ETHERSCAN_API_KEY != undefined ? process.env.ETHERSCAN_API_KEY : "",
      polygon: process.env.POLYGONSCAN_API_KEY != undefined ? process.env.POLYGONSCAN_API_KEY : "",
      optimisticEthereum: process.env.OPTIMISMSCAN_API_KEY != undefined ? process.env.OPTIMISMSCAN_API_KEY : ""
    }

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
};

export default config;