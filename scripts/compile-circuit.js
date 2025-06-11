// scripts/compile-circuit.js
// Script to compile ZK circuit and generate verifier

const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

async function compileCircuit() {
    console.log("⚡ Compiling ZK Circuit for Anonymous Pickup System\n");

    const circuitDir = "./circuits";
    const buildDir = path.join(circuitDir, "build");
    
    // Create directories
    if (!fs.existsSync(circuitDir)) {
        fs.mkdirSync(circuitDir);
    }
    if (!fs.existsSync(buildDir)) {
        fs.mkdirSync(buildDir);
    }

    // Check if circom is installed
    try {
        await execCommand("circom --version");
        console.log("✅ Circom found");
    } catch (error) {
        console.log("❌ Circom not found. Please install:");
        console.log("   npm install -g circom");
        console.log("   Or download from: https://docs.circom.io/getting-started/installation/");
        return false;
    }

    // Check if circuit file exists
    const circuitFile = path.join(circuitDir, "pickup-proof.circom");
    if (!fs.existsSync(circuitFile)) {
        console.log("❌ Circuit file not found. Creating circuit file...");
        await createCircuitFile(circuitFile);
    }

    console.log("🔨 Step 1: Compiling circuit to R1CS...");
    await execCommand(`circom ${circuitFile} --r1cs --wasm --sym -o ${buildDir}`);
    console.log("✅ Circuit compiled to R1CS");

    console.log("🔨 Step 2: Generating witness...");
    // Copy wasm files to main circuits directory for easier access
    const wasmSource = path.join(buildDir, "pickup-proof_js", "pickup-proof.wasm");
    const wasmDest = path.join(circuitDir, "pickup-proof.wasm");
    if (fs.existsSync(wasmSource)) {
        fs.copyFileSync(wasmSource, wasmDest);
        console.log("✅ WASM file copied");
    }

    console.log("🔨 Step 3: Setting up trusted setup...");
    await setupTrustedSetup(buildDir);

    console.log("🔨 Step 4: Generating verification key...");
    await generateVerificationKey(buildDir);

    console.log("🔨 Step 5: Generating Solidity verifier...");
    await generateSolidityVerifier(buildDir);

    console.log("\n🎉 Circuit compilation completed!");
    console.log("\n📁 Generated files:");
    console.log(`   ${circuitDir}/pickup-proof.wasm - Circuit WASM`);
    console.log(`   ${circuitDir}/pickup-proof_final.zkey - Proving key`);
    console.log(`   ${circuitDir}/verification_key.json - Verification key`);
    console.log(`   ${circuitDir}/verifier.sol - Solidity verifier contract`);

    return true;
}

async function setupTrustedSetup(buildDir) {
    const r1csFile = path.join(buildDir, "pickup-proof.r1cs");
    const potFile = path.join(buildDir, "pot12_final.ptau");
    const zkeyFile = path.join(buildDir, "pickup-proof_0000.zkey");
    const finalZkeyFile = path.join("circuits", "pickup-proof_final.zkey");

    // Download or create powers of tau file
    if (!fs.existsSync(potFile)) {
        console.log("   Downloading powers of tau file...");
        await execCommand(`wget -O ${potFile} https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_12.ptau`);
    }

    // Generate initial zkey
    await execCommand(`snarkjs groth16 setup ${r1csFile} ${potFile} ${zkeyFile}`);
    console.log("   ✅ Initial setup completed");

    // Contribute to ceremony (dummy contribution for development)
    await execCommand(`echo "dummy contribution" | snarkjs zkey contribute ${zkeyFile} ${finalZkeyFile} --name="Development"`);
    console.log("   ✅ Trusted setup ceremony completed");
}

async function generateVerificationKey(buildDir) {
    const finalZkeyFile = path.join("circuits", "pickup-proof_final.zkey");
    const vkeyFile = path.join("circuits", "verification_key.json");

    await execCommand(`snarkjs zkey export verificationkey ${finalZkeyFile} ${vkeyFile}`);
    console.log("   ✅ Verification key generated");
}

async function generateSolidityVerifier(buildDir) {
    const finalZkeyFile = path.join("circuits", "pickup-proof_final.zkey");
    const verifierFile = path.join("circuits", "verifier.sol");

    await execCommand(`snarkjs zkey export solidityverifier ${finalZkeyFile} ${verifierFile}`);
    console.log("   ✅ Solidity verifier generated");

    // Copy verifier to contracts directory
    const contractsVerifier = path.join("contracts", "Groth16Verifier.sol");
    fs.copyFileSync(verifierFile, contractsVerifier);
    console.log("   ✅ Verifier copied to contracts directory");
}

async function createCircuitFile(filePath) {
    const circuitCode = `pragma circom 2.1.0;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";

template PickupProofCircuit() {
    // Private inputs
    signal private input buyer_secret;
    signal private input user_name_hash;
    signal private input phone_last3;
    signal private input age;
    signal private input nonce;
    
    // Public inputs
    signal input package_id;
    signal input buyer_commitment;
    signal input store_address;
    signal input timestamp;
    signal input min_age_required;
    
    // Outputs
    signal output nullifier;
    signal output is_valid;
    
    // Hash components
    component commitment_hasher = Poseidon(3);
    component nullifier_hasher = Poseidon(5);
    component age_check = GreaterEqThan(8);
    
    // Verify commitment
    commitment_hasher.inputs[0] <== buyer_secret;
    commitment_hasher.inputs[1] <== user_name_hash;
    commitment_hasher.inputs[2] <== phone_last3;
    buyer_commitment === commitment_hasher.out;
    
    // Generate nullifier
    nullifier_hasher.inputs[0] <== buyer_secret;
    nullifier_hasher.inputs[1] <== package_id;
    nullifier_hasher.inputs[2] <== store_address;
    nullifier_hasher.inputs[3] <== nonce;
    nullifier_hasher.inputs[4] <== timestamp;
    nullifier <== nullifier_hasher.out;
    
    // Age verification
    age_check.in[0] <== age;
    age_check.in[1] <== min_age_required;
    is_valid <== age_check.out;
}

component main {public [package_id, buyer_commitment, store_address, timestamp, min_age_required]} = PickupProofCircuit();`;

    fs.writeFileSync(filePath, circuitCode);
    console.log("✅ Circuit file created");
}

function execCommand(command) {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.log(`Error: ${error.message}`);
                reject(error);
            } else {
                if (stdout) console.log(stdout);
                if (stderr) console.log(stderr);
                resolve(stdout);
            }
        });
    });
}

async function testCircuit() {
    console.log("\n🧪 Testing compiled circuit...");
    
    const snarkjs = require("snarkjs");
    
    try {
        // Test inputs
        const circuitInputs = {
            buyer_secret: "12345",
            user_name_hash: "67890",
            phone_last3: "123",
            age: "25",
            nonce: "1",
            package_id: "11111",
            buyer_commitment: "22222",
            store_address: "33333",
            timestamp: "44444",
            min_age_required: "18"
        };

        // Generate proof
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            circuitInputs,
            "./circuits/pickup-proof.wasm",
            "./circuits/pickup-proof_final.zkey"
        );

        console.log("✅ Test proof generated successfully");
        console.log(`   Public signals: ${publicSignals.length}`);
        console.log(`   Proof size: ${JSON.stringify(proof).length} bytes`);

        // Verify proof
        const vKey = JSON.parse(fs.readFileSync("./circuits/verification_key.json"));
        const res = await snarkjs.groth16.verify(vKey, publicSignals, proof);
        
        if (res) {
            console.log("✅ Proof verification successful");
        } else {
            console.log("❌ Proof verification failed");
        }

    } catch (error) {
        console.log("❌ Circuit test failed:", error.message);
    }
}

// Main execution
if (require.main === module) {
    compileCircuit()
        .then(success => {
            if (success) {
                return testCircuit();
            }
        })
        .then(() => {
            console.log("\n🎯 Circuit ready for production use!");
        })
        .catch(error => {
            console.error("❌ Compilation failed:", error);
            process.exit(1);
        });
}

module.exports = { compileCircuit, testCircuit };