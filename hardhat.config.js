/* global task ethers */
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-ethers");
require("hardhat-gas-reporter");
require("hardhat-contract-sizer");
require("@nomiclabs/hardhat-etherscan");

require("dotenv").config();

// This is a sample Buidler task. To learn how to create your own go to
// https://buidler.dev/guides/create-task.html
task("accounts", "Prints the list of accounts", async () => {
  const accounts = await ethers.getSigners();

  for (const account of accounts) {
    console.log(await account.getAddress());
  }
});

// You have to export an object to set up your config
// This object can have the following optional entries:
// defaultNetwork, networks, solc, and paths.
// Go to https://buidler.dev/config/ to learn more
module.exports = {
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
        timeout: 120000,
      },
      blockGasLimit: 20000000,
      timeout: 120000,
      gas: "auto",
    },

    kovan: {
      url: process.env.KOVAN_URL,
      accounts: [process.env.SECRET],
      gasPrice: 20000000000,
    },
    mainnet: {
      url: process.env.MAINNET_URL,
      accounts: [process.env.SECRET],
      gasPrice: 61000000000,
    },
    matic: {
      url: process.env.MATIC_URL,
      accounts: [process.env.SECRET],
      gasPrice: 61000000000,
    },
  },
  // This is a sample solc configuration that specifies which version of solc to use
  solidity: {
    version: "0.7.4",
    settings: {
      optimizer: {
        enabled: true,
        runs: 20000,
      },
    },
  },
};
