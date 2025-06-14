const { ethers } = require("hardhat");
const fs = require('fs');

async function main() {
  console.log("🚀 Setting up Anonymous Pickup System demo...");
  
  const [deployer, seller, store, buyer] = await ethers.getSigners();
  
  console.log("📋 Demo accounts:");
  console.log(`  Deployer: ${deployer.address}`);
  console.log(`  Seller: ${seller.address}`);
  console.log(`  Store: ${store.address}`);
  console.log(`  Buyer: ${buyer.address}`);
  
  // Get contract addresses from .env.local
  const envContent = fs.readFileSync('.env.local', 'utf8');
  const localWalletAddress = envContent.match(/NEXT_PUBLIC_LOCAL_WALLET_ADDRESS=(.+)/)?.[1];
  const pickupSystemAddress = envContent.match(/NEXT_PUBLIC_PICKUP_SYSTEM_ADDRESS=(.+)/)?.[1];
  
  if (!localWalletAddress || !pickupSystemAddress) {
    console.error("❌ Contract addresses not found in .env.local");
    console.log("💡 Please run: npm run deploy-local first");
    process.exit(1);
  }
  
  // Get contract instances
  const pickupSystem = await ethers.getContractAt("GroupSignaturePickupSystem", pickupSystemAddress);
  
  console.log("⚙️ Setting up demo data...");
  
  // 1. Authorize store
  console.log("🏪 Authorizing demo store...");
  await pickupSystem.authorizeStore(store.address);
  
  // 2. Set store secret
  console.log("🔐 Setting store secret...");
  const storeSecret = ethers.parseUnits("12345", 0); // Simple demo secret
  await pickupSystem.connect(store).setStoreSecret(storeSecret);
  
  // 3. Create demo package data
  const demoPackageId = ethers.id("DEMO-PKG-001");
  const demoBuyerCommitment = ethers.parseUnits("11111111111111111111111111111111", 0);
  const demoSellerCommitment = ethers.parseUnits("22222222222222222222222222222222", 0);
  const demoItemPrice = ethers.parseEther("25.99");
  const demoShippingFee = ethers.parseEther("3.99");
  
  console.log("📦 Registering demo package...");
  await pickupSystem.connect(seller).registerPackage(
    demoPackageId,
    demoBuyerCommitment,
    demoSellerCommitment,
    store.address,
    demoItemPrice,
    demoShippingFee,
    18, // Requires age verification
    { value: demoItemPrice + demoShippingFee }
  );
  
  // Save demo data
  const demoData = {
    accounts: {
      deployer: deployer.address,
      seller: seller.address,
      store: store.address,
      buyer: buyer.address
    },
    contracts: {
      localWallet: localWalletAddress,
      pickupSystem: pickupSystemAddress
    },
    demoPackage: {
      packageId: demoPackageId,
      buyerCommitment: demoBuyerCommitment.toString(),
      sellerCommitment: demoSellerCommitment.toString(),
      storeAddress: store.address,
      itemPrice: ethers.formatEther(demoItemPrice),
      shippingFee: ethers.formatEther(demoShippingFee),
      minAgeRequired: 18
    }
  };
  
  fs.writeFileSync('demo-data.json', JSON.stringify(demoData, null, 2));
  
  console.log("✅ Demo setup complete!");
  console.log("📁 Demo data saved to demo-data.json");
  console.log("\n🎯 Next steps:");
  console.log("  1. npm run dev (start frontend)");
  console.log("  2. Open http://localhost:3000");
  console.log("  3. Connect Ambire to localhost:8545");
  console.log("  4. Import demo accounts using private keys");
  console.log("  5. Test the complete anonymous pickup flow!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Demo setup failed:", error);
    process.exit(1);
  });