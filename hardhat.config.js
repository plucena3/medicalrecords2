require('@nomicfoundation/hardhat-toolbox');
require('dotenv').config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: '0.8.19',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    'coti-testnet': {
      url: process.env.COTI_TESTNET_RPC || 'https://testnet.coti.io/rpc',
      chainId: 7082400,
      accounts: process.env.ADMIN_PK ? [process.env.ADMIN_PK] : [],
      timeout: 60000,
    },
    hardhat: {
      chainId: 1337,
    },
  },
  paths: {
    sources: './contracts',
    tests: './test',
    cache: './cache',
    artifacts: './artifacts',
  },
  etherscan: {
    apiKey: {
      'coti-testnet': process.env.COTI_ETHERSCAN_API_KEY || 'placeholder',
    },
    customChains: [
      {
        network: 'coti-testnet',
        chainId: 7082400,
        urls: {
          apiURL: 'https://testnet.cotiscan.io/api',
          browserURL: 'https://testnet.cotiscan.io',
        },
      },
    ],
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === 'true',
    currency: 'USD',
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
  },
};
