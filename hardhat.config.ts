/* global task ethers */
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-etherscan";
require("hardhat-gas-reporter");
require("hardhat-contract-sizer");

require("dotenv").config();
import "@typechain/hardhat";
import "@typechain/ethers-v5";

require("./tasks/startDropRaffle");
require("./tasks/deployRaffleVoucher");
require("./tasks/deployPortalConverter");
require("./tasks/deployRealmConverter");
require("./tasks/startRealmRaffle");

// You have to export an object to set up your config
// This object can have the following optional entries:
// defaultNetwork, networks, solc, and paths.
// Go to https://buidler.dev/config/ to learn more
module.exports = {
  mocha: {
    timeout: 80000000,
  },
  etherscan: {
    // Your API key for Etherscan
    // Obtain one at https://etherscan.io/
    apiKey: process.env.ETHERSCAN_APIKEY,
  },
  contractSizer: {
    alphaSort: false,
    runOnCompile: false,
    disambiguatePaths: false,
  },
  gasReporter: {
    enabled: false,
    currency: "USD",
    gasPrice: 21,
  },
  networks: {
    hardhat: {
      forking: {
        url: process.env.MATIC_URL,
        timeout: 8000000,
      },
      blockGasLimit: 20000000,
      timeout: 8000000,
      gas: "auto",
    },

    kovan: {
      url: process.env.KOVAN_URL,
      accounts: [process.env.SECRET],
      gasPrice: 20000000000,
    },
    // mainnet: {
    //   url: process.env.MAINNET_URL,
    //   accounts: [process.env.SECRET],
    //   gasPrice: 61000000000,
    // },
    matic: {
      url: process.env.MATIC_URL,
      accounts: [process.env.ITEM_MANAGER],
      gasPrice: 61000000000,
    },
  },
  // This is a sample solc configuration that specifies which version of solc to use
  solidity: {
    version: "0.8.0",
    settings: {
      optimizer: {
        enabled: true,
        runs: 20000,
      },
    },
  },
};
