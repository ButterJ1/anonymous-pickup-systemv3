const circomlibjs = require("circomlibjs");

async function calculateCommitment() {
  console.log("🔮 Calculating correct commitment for test data");
  console.log("===============================================");

  // Values from current input.json
  const secret = BigInt("123");
  const nameHash = BigInt("456");
  const phoneLastThree = BigInt("789");
  
  console.log("Input values:");
  console.log("  secret:", secret.toString());
  console.log("  nameHash:", nameHash.toString());
  console.log("  phoneLastThree:", phoneLastThree.toString());
  
  // Build the poseidon hash function
  const poseidon = await circomlibjs.buildPoseidon();
  
  // Calculate Poseidon hash: commitment = Poseidon(secret, nameHash, phoneLastThree)
  const commitment = poseidon([secret, nameHash, phoneLastThree]);
  
  console.log("");
  console.log("✅ Calculated commitment:", poseidon.F.toString(commitment));
  
  // Generate the corrected input.json
  const inputData = {
    secret: "123",
    nameHash: "456",
    phoneLastThree: "789",
    age: "25",
    nonce: "1",
    packageId: "111",
    expectedCommitment: poseidon.F.toString(commitment),
    minAgeRequired: "18",
    storeAddress: "222"
  };
  
  console.log("");
  console.log("📝 Corrected input.json:");
  console.log(JSON.stringify(inputData, null, 2));
  
  // Write to file
  const fs = require('fs');
  fs.writeFileSync('input.json', JSON.stringify(inputData, null, 2));
  console.log("");
  console.log("✅ Updated input.json file");
  
  // Also calculate expected outputs
  const age = BigInt("25");
  const nonce = BigInt("1");
  const packageId = BigInt("111");
  const storeAddress = BigInt("222");
  const minAgeRequired = BigInt("18");
  
  const nullifier = poseidon([secret, packageId, nonce, storeAddress]);
  
  console.log("");
  console.log("Expected circuit outputs:");
  console.log("  nullifier:", poseidon.F.toString(nullifier));
  console.log("  commitmentProof:", poseidon.F.toString(commitment));
  console.log("  ageProof: 1 (since", age.toString(), ">=", minAgeRequired.toString(), ")");
}

if (require.main === module) {
  calculateCommitment().catch(console.error);
}

module.exports = { calculateCommitment };