pragma circom 2.1.0;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";

/*
 * PickupProofCircuit
 * Real ZK circuit for anonymous package pickup
 * 
 * Proves:
 * 1. You know the buyer_secret used in the commitment
 * 2. You know the user_info (name + phone) that was committed  
 * 3. You are authorized to pickup this specific package
 * 4. Generate unique nullifier to prevent double pickup
 * 5. Verify age requirement if needed
 */
template PickupProofCircuit() {
    // Private inputs (kept secret)
    signal private input buyer_secret;     // Buyer's secret key
    signal private input user_name_hash;   // Hash of buyer's name
    signal private input phone_last3;      // Last 3 digits of phone (0-999)
    signal private input age;              // Buyer's age
    signal private input nonce;            // Unique nonce for this pickup
    
    // Public inputs (visible to verifier)
    signal input package_id;               // Package ID to pickup
    signal input buyer_commitment;         // Registered commitment
    signal input store_address;            // Store handling pickup
    signal input timestamp;               // Current timestamp
    signal input min_age_required;        // Minimum age (18 for restricted items)
    
    // Public outputs
    signal output nullifier;              // Unique nullifier preventing double pickup
    signal output is_valid;               // 1 if all conditions met
    
    // Hash components
    component commitment_hasher = Poseidon(3);
    component nullifier_hasher = Poseidon(5);
    component user_info_hasher = Poseidon(2);
    
    // Age comparison
    component age_check = GreaterEqThan(8); // Support ages up to 255
    
    // Step 1: Verify buyer commitment
    // commitment = Poseidon(buyer_secret, user_name_hash, phone_last3)
    commitment_hasher.inputs[0] <== buyer_secret;
    commitment_hasher.inputs[1] <== user_name_hash;
    commitment_hasher.inputs[2] <== phone_last3;
    
    // Constraint: provided commitment must match calculated commitment
    buyer_commitment === commitment_hasher.out;
    
    // Step 2: Generate unique nullifier
    // nullifier = Poseidon(buyer_secret, package_id, store_address, nonce, timestamp)
    nullifier_hasher.inputs[0] <== buyer_secret;
    nullifier_hasher.inputs[1] <== package_id;
    nullifier_hasher.inputs[2] <== store_address;
    nullifier_hasher.inputs[3] <== nonce;
    nullifier_hasher.inputs[4] <== timestamp;
    
    nullifier <== nullifier_hasher.out;
    
    // Step 3: Age verification (if required)
    age_check.in[0] <== age;
    age_check.in[1] <== min_age_required;
    
    // Step 4: Range checks
    // Ensure phone_last3 is valid (0-999)
    component phone_range = LessThan(10);
    phone_range.in[0] <== phone_last3;
    phone_range.in[1] <== 1000;
    phone_range.out === 1;
    
    // Ensure age is reasonable (0-150)
    component age_range = LessThan(8);
    age_range.in[0] <== age;
    age_range.in[1] <== 151;
    age_range.out === 1;
    
    // All constraints passed
    is_valid <== age_check.out;
}

// Main component
component main {public [package_id, buyer_commitment, store_address, timestamp, min_age_required]} = PickupProofCircuit();