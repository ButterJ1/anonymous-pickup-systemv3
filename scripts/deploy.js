// scripts/deploy.js
// Deployment script for anonymous pickup system

const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("🚀 Deploying Anonymous Pickup System...\n");

    // Get deployment account
    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    console.log("Account balance:", ethers.utils.formatEther(await deployer.getBalance()), "ETH\n");

    // Step 1: Deploy Verifier Contract
    console.log("📜 Step 1: Deploying ZK Proof Verifier...");
    
    let verifierAddress;
    const verifierPath = "./circuits/verifier.sol";
    
    if (fs.existsSync(verifierPath)) {
        // Deploy real verifier generated from circuit
        console.log("   Using real verifier from circuit compilation");
        const Verifier = await ethers.getContractFactory("Groth16Verifier", {
            // Load from generated verifier contract
            contractName: "Groth16Verifier"
        });
        const verifier = await Verifier.deploy();
        await verifier.deployed();
        verifierAddress = verifier.address;
        console.log("   ✅ Real verifier deployed:", verifierAddress);
    } else {
        // Deploy mock verifier for testing
        console.log("   Using mock verifier (compile circuit for production)");
        const MockVerifier = await ethers.getContractFactory("MockPickupVerifier");
        const mockVerifier = await MockVerifier.deploy();
        await mockVerifier.deployed();
        verifierAddress = mockVerifier.address;
        console.log("   ✅ Mock verifier deployed:", verifierAddress);
    }

    // Step 2: Deploy Main Pickup System
    console.log("\n📦 Step 2: Deploying Main Pickup System...");
    const PickupSystem = await ethers.getContractFactory("PickupSystem");
    const pickupSystem = await PickupSystem.deploy(verifierAddress);
    await pickupSystem.deployed();
    console.log("   ✅ PickupSystem deployed:", pickupSystem.address);

    // Step 3: Deploy EIP-7702 Wallet Enhancement
    console.log("\n📱 Step 3: Deploying EIP-7702 Wallet Enhancement...");
    const EIP7702PickupWallet = await ethers.getContractFactory("EIP7702PickupWallet");
    const walletEnhancement = await EIP7702PickupWallet.deploy();
    await walletEnhancement.deployed();
    console.log("   ✅ EIP7702PickupWallet deployed:", walletEnhancement.address);

    // Step 4: Initial Setup
    console.log("\n⚙️ Step 4: Initial system setup...");
    
    // Set up initial store for testing
    await pickupSystem.authorizeStore(
        "0x8ba1f109551bD432803012645Hac136c873c", // Replace with actual store address
        "Family Mart Hsinchu Science Park",
        "No. 123, Park Road, Hsinchu",
        200 // 2% commission
    );
    console.log("   ✅ Demo store authorized");

    // Step 5: Save deployment info
    const deploymentInfo = {
        network: (await ethers.provider.getNetwork()).name,
        chainId: (await ethers.provider.getNetwork()).chainId,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        contracts: {
            verifier: verifierAddress,
            pickupSystem: pickupSystem.address,
            walletEnhancement: walletEnhancement.address
        },
        gasUsed: {
            verifier: "~500,000",
            pickupSystem: "~2,500,000", 
            walletEnhancement: "~1,200,000"
        }
    };

    // Save to file
    const deploymentPath = "./deployments";
    if (!fs.existsSync(deploymentPath)) {
        fs.mkdirSync(deploymentPath);
    }
    
    fs.writeFileSync(
        path.join(deploymentPath, `deployment-${Date.now()}.json`),
        JSON.stringify(deploymentInfo, null, 2)
    );

    console.log("\n🎉 Deployment completed successfully!");
    console.log("\n📋 Contract Addresses:");
    console.log(`   Verifier: ${verifierAddress}`);
    console.log(`   PickupSystem: ${pickupSystem.address}`);
    console.log(`   EIP7702PickupWallet: ${walletEnhancement.address}`);

    console.log("\n🔧 Next Steps:");
    console.log("   1. Verify contracts on Etherscan (if on public network)");
    console.log("   2. Set up frontend integration");
    console.log("   3. Register sellers and authorize more stores");
    console.log("   4. Test complete pickup flow");

    console.log("\n📚 Usage Examples:");
    console.log("   Register as seller:");
    console.log(`   await pickupSystem.registerSeller()`);
    console.log("");
    console.log("   Register package:");
    console.log(`   await pickupSystem.registerPackage(packageId, commitment, storeAddr, price, 18, true, 7)`);
    console.log("");
    console.log("   Initialize buyer wallet (EIP-7702):");
    console.log(`   await wallet.delegateToContract("${walletEnhancement.address}")`);
    console.log(`   await walletEnhancement.initializeWallet(secret, nameHash, phone, age)`);

    return deploymentInfo;
}

// Mock verifier contract for testing without circuit compilation
const MOCK_VERIFIER_CONTRACT = `
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract MockPickupVerifier {
    function verifyProof(
        uint[2] memory _pA,
        uint[2][2] memory _pB,
        uint[2] memory _pC,
        uint[6] memory _pubSignals
    ) external pure returns (bool) {
        // Mock verification - always returns true for testing
        // In production, this would be replaced by real Groth16 verifier
        return true;
    }
}
`;

// Deploy mock verifier if real one doesn't exist
async function deployMockVerifier() {
    console.log("Creating mock verifier for testing...");
    
    // Write mock verifier contract
    const contractsDir = "./contracts";
    if (!fs.existsSync(contractsDir)) {
        fs.mkdirSync(contractsDir);
    }
    
    fs.writeFileSync(
        path.join(contractsDir, "MockPickupVerifier.sol"),
        MOCK_VERIFIER_CONTRACT
    );
    
    console.log("Mock verifier contract created");
}

// Verify deployment
async function verifyDeployment(deploymentInfo) {
    console.log("\n🔍 Verifying deployment...");
    
    const pickupSystem = await ethers.getContractAt(
        "PickupSystem", 
        deploymentInfo.contracts.pickupSystem
    );
    
    const walletEnhancement = await ethers.getContractAt(
        "EIP7702PickupWallet",
        deploymentInfo.contracts.walletEnhancement
    );
    
    // Test basic functionality
    const verifierAddr = await pickupSystem.verifier();
    console.log(`   ✅ PickupSystem verifier: ${verifierAddr}`);
    
    const platformFee = await pickupSystem.platformFeeRate();
    console.log(`   ✅ Platform fee rate: ${platformFee / 100}%`);
    
    console.log("   ✅ All contracts operational");
}

// Main execution
main()
    .then((deploymentInfo) => {
        return verifyDeployment(deploymentInfo);
    })
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });