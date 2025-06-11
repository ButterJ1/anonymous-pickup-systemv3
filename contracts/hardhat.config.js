require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
};

// require("@nomicfoundation/hardhat-toolbox");
// require("@nomicfoundation/hardhat-ethers");
// require("hardhat-gas-reporter");
// require("solidity-coverage");

// // Load environment variables
// const dotenv = require("dotenv");
// dotenv.config();

// /** @type import('hardhat/config').HardhatUserConfig */
// module.exports = {
//   solidity: {
//     version: "0.8.24",
//     settings: {
//       optimizer: {
//         enabled: true,
//         runs: 200,
//       },
//       viaIR: true, // Enable for better optimization
//     },
//   },
  
//   networks: {
//     // Local development network
//     localhost: {
//       url: "http://127.0.0.1:8545",
//       chainId: 31337,
//       gas: 12000000,
//       blockGasLimit: 12000000,
//       allowUnlimitedContractSize: true,
//     },
    
//     // Hardhat network for testing
//     hardhat: {
//       chainId: 31337,
//       gas: 12000000,
//       blockGasLimit: 12000000,
//       allowUnlimitedContractSize: true,
//       forking: process.env.ETHEREUM_RPC_URL ? {
//         url: process.env.ETHEREUM_RPC_URL,
//         blockNumber: parseInt(process.env.FORK_BLOCK_NUMBER || "0") || undefined,
//       } : undefined,
//     },
    
//     // Ethereum Sepolia Testnet
//     sepolia: {
//       url: process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org",
//       accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
//       chainId: 11155111,
//       gas: 5000000,
//       gasPrice: 20000000000, // 20 gwei
//     },
    
//     // Ethereum Goerli Testnet (deprecated but still used)
//     goerli: {
//       url: process.env.GOERLI_RPC_URL || `https://goerli.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
//       accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
//       chainId: 5,
//       gas: 5000000,
//       gasPrice: 20000000000, // 20 gwei
//     },
    
//     // Polygon Mumbai Testnet
//     mumbai: {
//       url: process.env.MUMBAI_RPC_URL || "https://rpc-mumbai.maticvigil.com",
//       accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
//       chainId: 80001,
//       gas: 5000000,
//       gasPrice: 20000000000, // 20 gwei
//     },
    
//     // Arbitrum Goerli Testnet
//     arbitrumGoerli: {
//       url: process.env.ARBITRUM_GOERLI_RPC_URL || "https://goerli-rollup.arbitrum.io/rpc",
//       accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
//       chainId: 421613,
//       gas: 5000000,
//     },
    
//     // Optimism Goerli Testnet
//     optimismGoerli: {
//       url: process.env.OPTIMISM_GOERLI_RPC_URL || "https://goerli.optimism.io",
//       accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
//       chainId: 420,
//       gas: 5000000,
//     },
//   },
  
//   // Etherscan API keys for contract verification
//   etherscan: {
//     apiKey: {
//       mainnet: process.env.ETHERSCAN_API_KEY,
//       sepolia: process.env.ETHERSCAN_API_KEY,
//       goerli: process.env.ETHERSCAN_API_KEY,
//       polygon: process.env.POLYGONSCAN_API_KEY,
//       polygonMumbai: process.env.POLYGONSCAN_API_KEY,
//       arbitrumOne: process.env.ARBISCAN_API_KEY,
//       arbitrumGoerli: process.env.ARBISCAN_API_KEY,
//       optimisticEthereum: process.env.OPTIMISTIC_ETHERSCAN_API_KEY,
//       optimisticGoerli: process.env.OPTIMISTIC_ETHERSCAN_API_KEY,
//     },
//   },
  
//   // Gas reporting
//   gasReporter: {
//     enabled: process.env.REPORT_GAS === "true",
//     currency: "USD",
//     gasPrice: 20, // gwei
//     coinmarketcap: process.env.COINMARKETCAP_API_KEY,
//     excludeContracts: ["Migrations"],
//     outputFile: "gas-report.txt",
//     noColors: true,
//   },
  
//   // Contract verification
//   sourcify: {
//     enabled: true,
//   },
  
//   // Paths
//   paths: {
//     sources: "./contracts",
//     tests: "./test",
//     cache: "./cache",
//     artifacts: "./artifacts",
//   },
  
//   // Mocha test configuration
//   mocha: {
//     timeout: 40000,
//     reporter: "spec",
//   },
  
//   // TypeChain configuration
//   typechain: {
//     outDir: "typechain-types",
//     target: "ethers-v6",
//     alwaysGenerateOverloads: false,
//     externalArtifacts: ["externalArtifacts/*.json"],
//     dontOverrideCompile: false,
//   },
  
//   // Contract size limits
//   contractSizer: {
//     alphaSort: true,
//     disambiguatePaths: false,
//     runOnCompile: true,
//     strict: true,
//   },
// };