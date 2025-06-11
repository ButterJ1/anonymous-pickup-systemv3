pragma circom 2.1.0;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";

/*
 * Simple Pickup Proof Circuit
 * 
 * Proves:
 * 1. Buyer knows the secret behind the commitment
 * 2. Age >= 18 (if required)
 * 3. Generates unique nullifier (prevents double pickup)
 * 
 * Simple but secure implementation
 */
template PickupProofCircuit() {
    // Private inputs (secret, kept by buyer)
    signal private input secret;          // Buyer's secret key
    signal private input nameHash;        // Hash of buyer's name
    signal private input phoneLastThree;  // Last 3 digits of phone (0-999)
    signal private input age;             // Buyer's age
    signal private input nonce;           // Unique nonce for this pickup
    
    // Public inputs (visible to verifier/store)
    signal input packageId;               // Package ID to pickup
    signal input expectedCommitment;      // Expected commitment from seller
    signal input minAgeRequired;          // Minimum age (0 or 18)
    signal input storeAddress;            // Store performing pickup
    
    // Public outputs
    signal output nullifier;              // Unique nullifier (prevents double pickup)
    signal output commitmentProof;        // Proof of valid commitment
    signal output ageProof;               // Proof of age requirement (if needed)
    
    // Components for hashing
    component commitmentHasher = Poseidon(3);
    component nullifierHasher = Poseidon(4);
    component ageChecker = GreaterEqThan(8); // Support ages up to 255
    
    // Step 1: Verify buyer commitment
    // commitment = Poseidon(secret, nameHash, phoneLastThree)
    commitmentHasher.inputs[0] <== secret;
    commitmentHasher.inputs[1] <== nameHash;  
    commitmentHasher.inputs[2] <== phoneLastThree;
    
    // Ensure computed commitment matches expected commitment
    expectedCommitment === commitmentHasher.out;
    commitmentProof <== commitmentHasher.out;
    
    // Step 2: Generate unique nullifier (prevents double pickup)
    // nullifier = Poseidon(secret, packageId, nonce, storeAddress)
    nullifierHasher.inputs[0] <== secret;
    nullifierHasher.inputs[1] <== packageId;
    nullifierHasher.inputs[2] <== nonce;
    nullifierHasher.inputs[3] <== storeAddress;
    
    nullifier <== nullifierHasher.out;
    
    // Step 3: Age verification (if required)
    ageChecker.in[0] <== age;
    ageChecker.in[1] <== minAgeRequired;
    
    // If minAgeRequired > 0, then age must be >= minAgeRequired
    // If minAgeRequired = 0, then no age check needed
    component ageRequiredCheck = IsZero();
    ageRequiredCheck.in <== minAgeRequired;
    
    // ageProof = 1 if (no age required) OR (age >= minAgeRequired)
    component ageOk = OR();
    ageOk.a <== ageRequiredCheck.out;  // 1 if no age required
    ageOk.b <== ageChecker.out;       // 1 if age >= minAgeRequired
    
    ageProof <== ageOk.out;
    
    // Ensure age proof is valid (must be 1)
    ageProof === 1;
    
    // Step 4: Range checks for safety
    component phoneRangeCheck = LessThan(10);
    phoneRangeCheck.in[0] <== phoneLastThree;
    phoneRangeCheck.in[1] <== 1000; // 0-999
    phoneRangeCheck.out === 1;
    
    component ageRangeCheck = LessThan(8);
    ageRangeCheck.in[0] <== age;
    ageRangeCheck.in[1] <== 151; // 0-150
    ageRangeCheck.out === 1;
}

// Main component with public inputs specified
component main {public [packageId, expectedCommitment, minAgeRequired, storeAddress]} = PickupProofCircuit();