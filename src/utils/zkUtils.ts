// Import with proper typing
import * as snarkjs from 'snarkjs';

// Dynamic import for circomlibjs since it has module issues
let poseidon: any;

const loadPoseidon = async () => {
  if (!poseidon) {
    const lib: any = await import('circomlibjs');

    // Manually check known entry points
    poseidon =
      lib.poseidon ??              // Try direct
      lib.default?.poseidon ??    // ESM default
      lib.default?.default?.poseidon; // Webpack build issues

    if (!poseidon) {
      throw new Error('poseidon not found in circomlibjs');
    }
  }

  return poseidon;
};

export interface CircuitInputs {
  buyer_secret: string;
  buyer_name_hash: string;
  buyer_phone_last_three: string;
  buyer_nonce: string;
  buyer_age: string;
  buyer_commitment: string;
  seller_commitment: string;
  store_commitment: string;
  package_id: string;
  min_age_required: string;
}

export interface ZKProofResult {
  proof: {
    pi_a: [string, string];
    pi_b: [[string, string], [string, string]]; 
    pi_c: [string, string];
  };
  publicSignals: string[];
}

export class ZKUtils {
  private static wasmBuffer: ArrayBuffer | null = null;
  private static zkeyBuffer: ArrayBuffer | null = null;
  private static poseidonHash: any = null;
  
  static async init(): Promise<void> {
    if (!this.poseidonHash) {
      this.poseidonHash = await loadPoseidon();
    }
  }
  
  static async loadCircuits(): Promise<boolean> {
    try {
      await this.init(); // Ensure poseidon is loaded
      
      const wasmResponse = await fetch('/circuits/pickup-group-signature.wasm');
      const zkeyResponse = await fetch('/circuits/pickup-group-signature_final.zkey');
      
      if (!wasmResponse.ok || !zkeyResponse.ok) {
        throw new Error('Failed to fetch circuit files');
      }
      
      this.wasmBuffer = await wasmResponse.arrayBuffer();
      this.zkeyBuffer = await zkeyResponse.arrayBuffer();
      
      return true;
    } catch (error) {
      console.error('Error loading circuits:', error);
      return false;
    }
  }
  
  static generateSecret(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return '0x' + Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  static async hashName(name: string): Promise<string> {
    await this.init();
    const nameBytes = new TextEncoder().encode(name);
    const nameHex = Array.from(nameBytes).map(b => b.toString(16).padStart(2, '0')).join('');
    const result = this.poseidonHash([BigInt('0x' + nameHex)]);
    return result.toString();
  }
  
  static extractPhoneLastThree(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    return cleaned.slice(-3);
  }
  
  static async generateNonce(secret: string, name: string): Promise<string> {
    await this.init();
    const combined = secret + name;
    const combinedHex = Array.from(new TextEncoder().encode(combined))
      .map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 64);
    const result = this.poseidonHash([BigInt('0x' + combinedHex)]);
    return result.toString();
  }
  
  static async generateBuyerCommitment(
    secret: string,
    nameHash: string, 
    phoneLastThree: string,
    nonce: string
  ): Promise<string> {
    await this.init();
    const commitment = this.poseidonHash([
      BigInt(secret),
      BigInt(nameHash),
      BigInt(phoneLastThree),
      BigInt(nonce)
    ]);
    return '0x' + commitment.toString(16).padStart(64, '0');
  }
  
  static async generateSellerCommitment(
    buyerCommitment: string,
    packageId: string,
    itemPrice: string,
    shippingFee: string,
    storeAddress: string,
    minAgeRequired: boolean
  ): Promise<string> {
    await this.init();
    const packageIdHex = Array.from(new TextEncoder().encode(packageId))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    
    const commitment = this.poseidonHash([
      BigInt(buyerCommitment),
      BigInt('0x' + packageIdHex.slice(0, 64)),
      BigInt(Math.floor(parseFloat(itemPrice) * 100)), // Convert to cents
      BigInt(Math.floor(parseFloat(shippingFee) * 100)),
      BigInt(storeAddress),
      BigInt(minAgeRequired ? 18 : 0)
    ]);
    return '0x' + commitment.toString(16).padStart(64, '0');
  }
  
  static async generateStoreCommitment(
    sellerCommitment: string,
    storeSecret: string,
    packageId: string
  ): Promise<string> {
    await this.init();
    const packageIdHex = Array.from(new TextEncoder().encode(packageId))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    
    const commitment = this.poseidonHash([
      BigInt(sellerCommitment),
      BigInt(storeSecret),
      BigInt('0x' + packageIdHex.slice(0, 64))
    ]);
    return '0x' + commitment.toString(16).padStart(64, '0');
  }
  
  static async generateProof(inputs: CircuitInputs): Promise<ZKProofResult> {
    if (!this.wasmBuffer || !this.zkeyBuffer) {
      throw new Error('Circuits not loaded. Call loadCircuits() first.');
    }
    
    try {
      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
        inputs,
        new Uint8Array(this.wasmBuffer),
        new Uint8Array(this.zkeyBuffer)
      );
      
      return {
        proof: {
          pi_a: [proof.pi_a[0], proof.pi_a[1]],
          pi_b: [[proof.pi_b[0][1], proof.pi_b[0][0]], [proof.pi_b[1][1], proof.pi_b[1][0]]],
          pi_c: [proof.pi_c[0], proof.pi_c[1]]
        },
        publicSignals
      };
    } catch (error) {
      console.error('Proof generation error:', error);
      throw new Error(`Failed to generate proof: ${error.message}`);
    }
  }
  
  static async generateNullifier(
    buyerSecret: string,
    packageId: string,
    storeCommitment: string
  ): Promise<string> {
    await this.init();
    const packageIdHex = Array.from(new TextEncoder().encode(packageId))
      .map(b => b.toString(16).padStart(2, '0')).join('');
    
    const nullifier = this.poseidonHash([
      BigInt(buyerSecret),
      BigInt('0x' + packageIdHex.slice(0, 64)),
      BigInt(storeCommitment)
    ]);
    return '0x' + nullifier.toString(16).padStart(64, '0');
  }
}