#!/bin/bash
set -e

echo "🔧 Building Anonymous Pickup Circuits..."

CIRCUIT_NAME="PickupGroupSignature"
BUILD_DIR="circuits/build"
PUBLIC_DIR="public/circuits"

# Create directories
mkdir -p $BUILD_DIR
mkdir -p $PUBLIC_DIR

# Compile circuit
echo "📦 Compiling circuit..."
circom circuits/$CIRCUIT_NAME.circom --r1cs --wasm --sym -o $BUILD_DIR

# Powers of Tau ceremony
echo "🔑 Running Powers of Tau ceremony..."
snarkjs powersoftau new bn128 16 $BUILD_DIR/pot16_0000.ptau -v
snarkjs powersoftau contribute $BUILD_DIR/pot16_0000.ptau $BUILD_DIR/pot16_0001.ptau --name="First contribution" -v -e="$(openssl rand -hex 64)"
snarkjs powersoftau prepare phase2 $BUILD_DIR/pot16_0001.ptau $BUILD_DIR/pot16_final.ptau -v

# Circuit-specific setup
echo "⚙️ Setting up circuit-specific parameters..."
snarkjs groth16 setup $BUILD_DIR/$CIRCUIT_NAME.r1cs $BUILD_DIR/pot16_final.ptau $BUILD_DIR/${CIRCUIT_NAME}_0000.zkey
snarkjs zkey contribute $BUILD_DIR/${CIRCUIT_NAME}_0000.zkey $BUILD_DIR/${CIRCUIT_NAME}_0001.zkey --name="Circuit contribution" -v -e="$(openssl rand -hex 64)"

# Export verification key and Solidity verifier
snarkjs zkey export verificationkey $BUILD_DIR/${CIRCUIT_NAME}_0001.zkey $BUILD_DIR/verification_key.json
snarkjs zkey export solidityverifier $BUILD_DIR/${CIRCUIT_NAME}_0001.zkey contracts/Groth16Verifier.sol

# Copy files for frontend
cp $BUILD_DIR/${CIRCUIT_NAME}_js/${CIRCUIT_NAME}.wasm $PUBLIC_DIR/pickup-group-signature.wasm
cp $BUILD_DIR/${CIRCUIT_NAME}_0001.zkey $PUBLIC_DIR/pickup-group-signature_final.zkey

echo "✅ Circuits built successfully!"
echo "📁 Frontend files copied to $PUBLIC_DIR/"
echo "📁 Verifier contract generated at contracts/Groth16Verifier.sol"