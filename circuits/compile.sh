#!/bin/bash

# Circuit Compilation Script for Anonymous Pickup System
# Compiles the pickup-proof.circom circuit and generates necessary files

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CIRCUIT_NAME="pickup-proof"
CIRCUIT_FILE="${CIRCUIT_NAME}.circom"
BUILD_DIR="build"
PTAU_FILE="powersOfTau28_hez_final_14.ptau"
PTAU_URL="https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_14.ptau"

# Print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required tools are installed
check_dependencies() {
    print_status "Checking dependencies..."
    
    if ! command -v circom &> /dev/null; then
        print_error "circom is not installed. Please install circom first."
        echo "Visit: https://docs.circom.io/getting-started/installation/"
        exit 1
    fi
    
    if ! command -v snarkjs &> /dev/null; then
        print_error "snarkjs is not installed. Please install snarkjs first."
        echo "Run: npm install -g snarkjs@latest"
        exit 1
    fi
    
    print_success "All dependencies are installed"
}

# Create build directory
setup_build_dir() {
    print_status "Setting up build directory..."
    
    if [ -d "$BUILD_DIR" ]; then
        print_warning "Build directory exists, cleaning..."
        rm -rf "$BUILD_DIR"
    fi
    
    mkdir -p "$BUILD_DIR"
    print_success "Build directory created"
}

# Download powers of tau file if not exists
download_ptau() {
    print_status "Checking powers of tau file..."
    
    if [ ! -f "$BUILD_DIR/$PTAU_FILE" ]; then
        print_status "Downloading powers of tau file (this may take a while)..."
        wget -O "$BUILD_DIR/$PTAU_FILE" "$PTAU_URL" || {
            print_error "Failed to download powers of tau file"
            print_status "You can manually download it from: $PTAU_URL"
            exit 1
        }
    fi
    
    print_success "Powers of tau file ready"
}

# Compile the circuit
compile_circuit() {
    print_status "Compiling circuit: $CIRCUIT_FILE"
    
    # Compile circuit to r1cs, wasm, and sym
    circom "$CIRCUIT_FILE" \
        --r1cs \
        --wasm \
        --sym \
        --c \
        -o "$BUILD_DIR" || {
        print_error "Circuit compilation failed"
        exit 1
    }
    
    print_success "Circuit compiled successfully"
    
    # Print circuit info
    print_status "Circuit information:"
    snarkjs r1cs info "$BUILD_DIR/${CIRCUIT_NAME}.r1cs"
}

# Generate trusted setup (development only)
generate_trusted_setup() {
    print_status "Generating trusted setup (DEVELOPMENT ONLY - NOT FOR PRODUCTION)"
    
    cd "$BUILD_DIR" || exit 1
    
    # Generate zkey file (phase 1)
    print_status "Phase 1: Initial ceremony"
    snarkjs groth16 setup "${CIRCUIT_NAME}.r1cs" "$PTAU_FILE" "${CIRCUIT_NAME}_0000.zkey" || {
        print_error "Failed to generate initial zkey"
        exit 1
    }
    
    # Contribute to ceremony (phase 2)
    print_status "Phase 2: Contributing to ceremony"
    echo "dev_contribution" | snarkjs zkey contribute "${CIRCUIT_NAME}_0000.zkey" "${CIRCUIT_NAME}_0001.zkey" --name="Development Contribution" || {
        print_error "Failed to contribute to ceremony"
        exit 1
    }
    
    # Final zkey
    print_status "Finalizing ceremony"
    snarkjs zkey beacon "${CIRCUIT_NAME}_0001.zkey" "${CIRCUIT_NAME}_final.zkey" 0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 10 -n="Final Beacon phase2" || {
        print_error "Failed to finalize ceremony"
        exit 1
    }
    
    cd .. || exit 1
    print_success "Trusted setup completed"
}

# Generate verification key
generate_verification_key() {
    print_status "Generating verification key"
    
    snarkjs zkey export verificationkey "$BUILD_DIR/${CIRCUIT_NAME}_final.zkey" "$BUILD_DIR/verification_key.json" || {
        print_error "Failed to generate verification key"
        exit 1
    }
    
    print_success "Verification key generated"
}

# Test the circuit with sample input
test_circuit() {
    print_status "Testing circuit with sample input"
    
    if [ ! -f "input.json" ]; then
        print_warning "input.json not found, skipping circuit test"
        return 0
    fi
    
    cd "$BUILD_DIR" || exit 1
    
    # Generate witness
    print_status "Generating witness..."
    node "${CIRCUIT_NAME}_js/generate_witness.js" "${CIRCUIT_NAME}_js/${CIRCUIT_NAME}.wasm" "../input.json" witness.wtns || {
        print_error "Failed to generate witness"
        cd .. || exit 1
        return 1
    }
    
    # Generate proof
    print_status "Generating proof..."
    snarkjs groth16 prove "${CIRCUIT_NAME}_final.zkey" witness.wtns proof.json public.json || {
        print_error "Failed to generate proof"
        cd .. || exit 1
        return 1
    }
    
    # Verify proof
    print_status "Verifying proof..."
    snarkjs groth16 verify verification_key.json public.json proof.json || {
        print_error "Proof verification failed"
        cd .. || exit 1
        return 1
    }
    
    cd .. || exit 1
    print_success "Circuit test completed successfully"
}

# Copy files to frontend
copy_to_frontend() {
    print_status "Copying files to frontend..."
    
    FRONTEND_PUBLIC="../frontend/public/circuits"
    mkdir -p "$FRONTEND_PUBLIC"
    
    # Copy necessary files
    cp "$BUILD_DIR/${CIRCUIT_NAME}_js/${CIRCUIT_NAME}.wasm" "$FRONTEND_PUBLIC/" 2>/dev/null || print_warning "WASM file not found"
    cp "$BUILD_DIR/${CIRCUIT_NAME}_final.zkey" "$FRONTEND_PUBLIC/" 2>/dev/null || print_warning "Final zkey not found"
    cp "$BUILD_DIR/verification_key.json" "$FRONTEND_PUBLIC/" 2>/dev/null || print_warning "Verification key not found"
    
    print_success "Files copied to frontend (if they exist)"
}

# Generate Solidity verifier
generate_solidity_verifier() {
    print_status "Generating Solidity verifier contract"
    
    snarkjs zkey export solidityverifier "$BUILD_DIR/${CIRCUIT_NAME}_final.zkey" "../contracts/Verifier.sol" || {
        print_warning "Failed to generate Solidity verifier (this is optional)"
        return 0
    }
    
    print_success "Solidity verifier generated"
}

# Print summary
print_summary() {
    print_success "=== COMPILATION COMPLETE ==="
    echo ""
    echo "Generated files in $BUILD_DIR/:"
    echo "  - ${CIRCUIT_NAME}.r1cs (R1CS constraint system)"
    echo "  - ${CIRCUIT_NAME}_js/ (WASM and witness generator)"
    echo "  - ${CIRCUIT_NAME}_final.zkey (Proving key)"
    echo "  - verification_key.json (Verification key)"
    echo ""
    echo "Files copied to frontend/public/circuits/:"
    echo "  - ${CIRCUIT_NAME}.wasm"
    echo "  - ${CIRCUIT_NAME}_final.zkey"
    echo "  - verification_key.json"
    echo ""
    print_warning "⚠️  IMPORTANT SECURITY NOTICE ⚠️"
    echo "This trusted setup is for DEVELOPMENT ONLY!"
    echo "For production use, you MUST perform a proper trusted setup ceremony."
    echo "Never use development keys in production!"
    echo ""
    print_success "✅ Your ZK circuit is ready for development!"
}

# Main execution
main() {
    echo "🔮 Anonymous Pickup System - Circuit Compiler"
    echo "=============================================="
    echo ""
    
    # Check if circuit file exists
    if [ ! -f "$CIRCUIT_FILE" ]; then
        print_error "Circuit file $CIRCUIT_FILE not found!"
        exit 1
    fi
    
    # Run compilation steps
    check_dependencies
    setup_build_dir
    download_ptau
    compile_circuit
    generate_trusted_setup
    generate_verification_key
    test_circuit
    copy_to_frontend
    generate_solidity_verifier
    print_summary
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Compile the pickup-proof.circom circuit for the Anonymous Pickup System"
        echo ""
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --clean        Clean build directory only"
        echo "  --test-only    Only test existing circuit (skip compilation)"
        echo ""
        echo "Examples:"
        echo "  $0              # Full compilation"
        echo "  $0 --clean      # Clean build directory"
        echo "  $0 --test-only  # Test existing circuit"
        exit 0
        ;;
    --clean)
        print_status "Cleaning build directory..."
        rm -rf "$BUILD_DIR"
        print_success "Build directory cleaned"
        exit 0
        ;;
    --test-only)
        print_status "Testing existing circuit..."
        test_circuit
        exit 0
        ;;
    "")
        main
        ;;
    *)
        print_error "Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
esac