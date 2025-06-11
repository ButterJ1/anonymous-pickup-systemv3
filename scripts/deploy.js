const { ethers } = require("hardhat");

/**
 * Deployment script for Anonymous Pickup System
 * Deploys PickupSystem and LocalWallet contracts
 */

async function main() {
  console.log("🚀 Deploying Anonymous Pickup System...");
  console.log("=====================================");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", ethers.utils.formatEther(await deployer.getBalance()), "ETH");

  const network = await ethers.provider.getNetwork();
  console.log("🌐 Network:", network.name, "(Chain ID:", network.chainId + ")");
  console.log("");

  // Deploy LocalWallet contract first
  console.log("📦 Deploying LocalWallet contract...");
  const LocalWallet = await ethers.getContractFactory("LocalWallet");
  const localWallet = await LocalWallet.deploy();
  await localWallet.deployed();
  
  console.log("✅ LocalWallet deployed to:", localWallet.address);
  console.log("🧾 Transaction hash:", localWallet.deployTransaction.hash);
  console.log("");

  // Deploy PickupSystem contract
  console.log("📦 Deploying PickupSystem contract...");
  const PickupSystem = await ethers.getContractFactory("PickupSystem");
  const pickupSystem = await PickupSystem.deploy();
  await pickupSystem.deployed();

  console.log("✅ PickupSystem deployed to:", pickupSystem.address);
  console.log("🧾 Transaction hash:", pickupSystem.deployTransaction.hash);
  console.log("");

  // Verify contracts are working
  console.log("🔍 Verifying contract deployments...");
  
  try {
    // Test PickupSystem
    const owner = await pickupSystem.owner();
    console.log("✅ PickupSystem owner:", owner);
    
    // Test LocalWallet with a sample call
    const [isInit] = await localWallet.getWalletStatus();
    console.log("✅ LocalWallet accessible (initialized:", isInit + ")");
    
  } catch (error) {
    console.log("⚠️  Contract verification failed:", error.message);
  }

  // Set up some demo data for testing
  console.log("🧪 Setting up demo environment...");
  
  try {
    // Authorize deployer as a demo store
    console.log("🏬 Authorizing deployer as demo store...");
    const authTx = await pickupSystem.authorizeStore(deployer.address);
    await authTx.wait();
    console.log("✅ Demo store authorized");

    // Register deployer as demo seller
    console.log("🏪 Registering deployer as demo seller...");
    const regTx = await pickupSystem.registerSeller();
    await regTx.wait();
    console.log("✅ Demo seller registered");

  } catch (error) {
    console.log("⚠️  Demo setup failed:", error.message);
  }

  console.log("");
  console.log("🎉 Deployment Complete!");
  console.log("========================");
  console.log("");
  console.log("📋 Contract Addresses:");
  console.log("  LocalWallet:   ", localWallet.address);
  console.log("  PickupSystem:  ", pickupSystem.address);
  console.log("");
  console.log("🔧 Environment Variables:");
  console.log("  REACT_APP_LOCAL_WALLET_ADDRESS=" + localWallet.address);
  console.log("  REACT_APP_PICKUP_SYSTEM_ADDRESS=" + pickupSystem.address);
  console.log("");
  console.log("📝 Next Steps:");
  console.log("  1. Add the contract addresses to your .env file");
  console.log("  2. Update frontend/src/utils/contracts.js with the addresses");
  console.log("  3. Compile ZK circuits using: cd circuits && ./compile.sh");
  console.log("  4. Start the frontend: cd frontend && npm start");
  console.log("");

  // Save deployment info to a file
  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId,
    timestamp: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      LocalWallet: {
        address: localWallet.address,
        transactionHash: localWallet.deployTransaction.hash,
        blockNumber: localWallet.deployTransaction.blockNumber
      },
      PickupSystem: {
        address: pickupSystem.address,
        transactionHash: pickupSystem.deployTransaction.hash,
        blockNumber: pickupSystem.deployTransaction.blockNumber
      }
    },
    gasUsed: {
      LocalWallet: localWallet.deployTransaction.gasLimit?.toString() || "Unknown",
      PickupSystem: pickupSystem.deployTransaction.gasLimit?.toString() || "Unknown"
    }
  };

  // Write deployment info
  const fs = require('fs');
  const path = require('path');
  
  const deploymentsDir = path.join(__dirname, '..', 'deployments');
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentFile = path.join(deploymentsDir, `deployment-${network.chainId}-${Date.now()}.json`);
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  
  console.log("💾 Deployment info saved to:", deploymentFile);
  console.log("");

  // Generate environment file template
  const envTemplate = `# Anonymous Pickup System - Contract Addresses
# Network: ${network.name} (Chain ID: ${network.chainId})
# Deployed: ${new Date().toISOString()}

REACT_APP_LOCAL_WALLET_ADDRESS=${localWallet.address}
REACT_APP_PICKUP_SYSTEM_ADDRESS=${pickupSystem.address}
REACT_APP_NETWORK_NAME=${network.name}
REACT_APP_CHAIN_ID=${network.chainId}

# Optional: Add your own values
# REACT_APP_ALCHEMY_KEY=your_alchemy_key
# REACT_APP_INFURA_PROJECT_ID=your_infura_project_id
`;

  const envFile = path.join(__dirname, '..', '.env.example');
  fs.writeFileSync(envFile, envTemplate);
  console.log("📄 Environment template saved to:", envFile);
  console.log("   Copy this to .env and customize as needed");

  console.log("");
  console.log("🌟 Anonymous Pickup System is ready for testing!");
  console.log("   Happy hacking! 🚀");
}

// Enhanced error handling
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("");
    console.error("❌ Deployment failed!");
    console.error("===================");
    console.error("");
    console.error("Error:", error.message);
    
    if (error.code === 'INSUFFICIENT_FUNDS') {
      console.error("");
      console.error("💡 Tip: Make sure your account has enough ETH for deployment");
      console.error("   You can get test ETH from a faucet for testnets");
    }
    
    if (error.code === 'NETWORK_ERROR') {
      console.error("");
      console.error("💡 Tip: Check your network connection and RPC endpoint");
      console.error("   Make sure Hardhat network is running for local deployment");
    }

    console.error("");
    console.error("Stack trace:");
    console.error(error);
    process.exit(1);
  });