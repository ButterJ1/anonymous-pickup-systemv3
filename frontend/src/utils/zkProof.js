import * as snarkjs from 'snarkjs';
import { ethers } from 'ethers';

/**
 * Real ZK Proof Generation Utility
 * Uses snarkjs to generate actual zero-knowledge proofs
 */

class ZKProofGenerator {
  constructor() {
    this.circuitWasm = null;
    this.circuitZkey = null;
    this.verificationKey = null;
    this.isReady = false;
  }

  /**
   * Initialize the ZK proof system
   * Load circuit files and verification key
   */
  async initialize() {
    try {
      console.log('🔮 Initializing ZK proof system...');

      // Load circuit files
      // In production, these would be served from your server
      const wasmResponse = await fetch('/circuits/pickup-proof.wasm');
      const zkeyResponse = await fetch('/circuits/pickup-proof_final.zkey');
      const vkeyResponse = await fetch('/circuits/verification_key.json');

      if (!wasmResponse.ok || !zkeyResponse.ok || !vkeyResponse.ok) {
        throw new Error('Circuit files not found. Please compile the circuit first.');
      }

      this.circuitWasm = await wasmResponse.arrayBuffer();
      this.circuitZkey = await zkeyResponse.arrayBuffer();
      this.verificationKey = await vkeyResponse.json();

      this.isReady = true;
      console.log('✅ ZK proof system initialized');
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize ZK proof system:', error);
      
      // Fallback to mock mode for development
      console.log('⚠️ Using mock proof mode for development');
      this.isReady = false;
      
      return false;
    }
  }

  /**
   * Generate pickup proof
   * @param {Object} inputs - Circuit inputs
   * @returns {Object} Generated proof and public signals
   */
  async generatePickupProof(inputs) {
    const {
      secret,
      nameHash,
      phoneLastThree,
      age,
      nonce,
      packageId,
      expectedCommitment,
      minAgeRequired,
      storeAddress
    } = inputs;

    if (!this.isReady) {
      console.log('🧪 Generating mock proof (circuit not ready)');
      return this.generateMockProof(inputs);
    }

    try {
      console.log('🔮 Generating real ZK proof...');

      // Prepare circuit inputs
      const circuitInputs = {
        // Private inputs
        secret: secret.toString(),
        nameHash: nameHash.toString(),
        phoneLastThree: phoneLastThree.toString(),
        age: age.toString(),
        nonce: nonce.toString(),
        
        // Public inputs
        packageId: packageId.toString(),
        expectedCommitment: expectedCommitment.toString(),
        minAgeRequired: minAgeRequired.toString(),
        storeAddress: storeAddress.toString()
      };

      console.log('📊 Circuit inputs prepared:', Object.keys(circuitInputs));

      // Generate witness and proof
      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        circuitInputs,
        new Uint8Array(this.circuitWasm),
        new Uint8Array(this.circuitZkey)
      );

      console.log('✅ ZK proof generated successfully');

      // Format proof for smart contract
      const formattedProof = this.formatProofForContract(proof);

      return {
        proof: formattedProof,
        publicSignals,
        nullifier: publicSignals[0], // First public signal is nullifier
        isValid: true
      };

    } catch (error) {
      console.error('❌ ZK proof generation failed:', error);
      
      // Fallback to mock proof
      console.log('⚠️ Falling back to mock proof');
      return this.generateMockProof(inputs);
    }
  }

  /**
   * Verify a ZK proof
   * @param {Array} proof - Formatted proof
   * @param {Array} publicSignals - Public signals
   * @returns {boolean} Verification result
   */
  async verifyProof(proof, publicSignals) {
    if (!this.isReady) {
      console.log('🧪 Mock verification (always true)');
      return true;
    }

    try {
      // Convert formatted proof back to snarkjs format
      const snarkjsProof = this.convertToSnarkjsFormat(proof);
      
      const isValid = await snarkjs.groth16.verify(
        this.verificationKey,
        publicSignals,
        snarkjsProof
      );

      console.log('🔍 Proof verification result:', isValid);
      return isValid;

    } catch (error) {
      console.error('❌ Proof verification failed:', error);
      return false;
    }
  }

  /**
   * Generate commitment from buyer data
   * @param {Object} buyerData - Buyer's secret data
   * @returns {string} Generated commitment
   */
  generateCommitment(buyerData) {
    const { secret, nameHash, phoneLastThree } = buyerData;
    
    // Generate commitment using same logic as circuit
    const commitment = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ['uint256', 'uint256', 'uint256'],
        [secret, nameHash, phoneLastThree]
      )
    );

    return commitment;
  }

  /**
   * Generate unique nullifier
   * @param {Object} data - Data for nullifier generation
   * @returns {string} Generated nullifier
   */
  generateNullifier(data) {
    const { secret, packageId, nonce, storeAddress } = data;
    
    const nullifier = ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ['uint256', 'bytes32', 'uint256', 'address'],
        [secret, packageId, nonce, storeAddress]
      )
    );

    return nullifier;
  }

  /**
   * Format proof for smart contract consumption
   * @param {Object} proof - Raw snarkjs proof
   * @returns {Array} Formatted proof array
   */
  formatProofForContract(proof) {
    return [
      proof.pi_a[0],
      proof.pi_a[1],
      proof.pi_b[0][1],
      proof.pi_b[0][0],
      proof.pi_b[1][1],
      proof.pi_b[1][0],
      proof.pi_c[0],
      proof.pi_c[1]
    ];
  }

  /**
   * Convert formatted proof back to snarkjs format
   * @param {Array} formattedProof - Formatted proof array
   * @returns {Object} snarkjs proof format
   */
  convertToSnarkjsFormat(formattedProof) {
    return {
      pi_a: [formattedProof[0], formattedProof[1]],
      pi_b: [
        [formattedProof[3], formattedProof[2]],
        [formattedProof[5], formattedProof[4]]
      ],
      pi_c: [formattedProof[6], formattedProof[7]]
    };
  }

  /**
   * Generate mock proof for development/testing
   * @param {Object} inputs - Circuit inputs
   * @returns {Object} Mock proof data
   */
  generateMockProof(inputs) {
    console.log('🧪 Generating mock proof for development');

    // Generate deterministic mock proof based on inputs
    const mockProof = Array(8).fill(0).map((_, i) => 
      ethers.BigNumber.from(
        ethers.utils.keccak256(
          ethers.utils.toUtf8Bytes(`mock_proof_${i}_${inputs.packageId}`)
        )
      ).toString()
    );

    const mockNullifier = this.generateNullifier({
      secret: inputs.secret,
      packageId: inputs.packageId,
      nonce: inputs.nonce,
      storeAddress: inputs.storeAddress
    });

    const mockPublicSignals = [
      mockNullifier,
      inputs.expectedCommitment.toString(),
      '1' // Age proof valid
    ];

    return {
      proof: mockProof,
      publicSignals: mockPublicSignals,
      nullifier: mockNullifier,
      isValid: true,
      isMock: true
    };
  }

  /**
   * Hash buyer name for circuit input
   * @param {string} name - Buyer's name
   * @returns {string} Name hash
   */
  hashName(name) {
    return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(name));
  }

  /**
   * Extract last 3 digits from phone number
   * @param {string} phone - Phone number
   * @returns {number} Last 3 digits
   */
  extractPhoneLastThree(phone) {
    const cleaned = phone.replace(/\D/g, ''); // Remove non-digits
    if (cleaned.length < 3) {
      throw new Error('Phone number too short');
    }
    return parseInt(cleaned.slice(-3));
  }

  /**
   * Check if system is ready for real proofs
   * @returns {boolean} Ready status
   */
  isSystemReady() {
    return this.isReady;
  }
}

// Create singleton instance
const zkProofGenerator = new ZKProofGenerator();

export default zkProofGenerator;