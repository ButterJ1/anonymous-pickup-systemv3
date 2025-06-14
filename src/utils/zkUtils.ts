// Import with proper typing
import * as snarkjs from 'snarkjs';
import * as circomlibjs from 'circomlibjs';

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
      this.poseidonHash = await circomlibjs.buildPoseidon();
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
  
  private static safeBigInt(value: any): bigint {
    if (typeof value === 'bigint') {
      return value;
    }
    
    if (typeof value === 'number') {
      return BigInt(value);
    }
    
    if (typeof value === 'string') {
      // Handle hex strings
      if (value.startsWith('0x') || value.startsWith('0X')) {
        return BigInt(value);
      }
      // Handle decimal strings
      if (/^\d+$/.test(value)) {
        return BigInt(value);
      }
      if (value.includes(',')) {
        throw new Error(`Invalid BigInt input - appears to be array: ${value.substring(0, 100)}...`);
      }
      try {
        return BigInt(value);
      } catch (err) {
        throw new Error(`Cannot convert string "${value.substring(0, 50)}..." to BigInt. Use stringToHexBigInt() for text strings.`);
      }
    }
    
    // If it's an array or Uint8Array
    if (Array.isArray(value) || value instanceof Uint8Array) {
      const hexString = '0x' + Array.from(value)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
      return BigInt(hexString);
    }
    
    throw new Error(`Cannot convert ${typeof value} to BigInt: ${String(value).substring(0, 100)}...`);
  }
  
  private static stringToHexBigInt(text: string, maxBytes: number = 32): bigint {
    try {
      const textBytes = new TextEncoder().encode(text);
      const hexString = Array.from(textBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
        .slice(0, maxBytes * 2); // Limit to maxBytes * 2 hex chars
      
      return BigInt('0x' + hexString.padEnd(2, '0')); // Ensure at least 1 byte
    } catch (error) {
      throw new Error(`Failed to convert string "${text}" to hex BigInt: ${error.message}`);
    }
  }
  
  private static poseidonResultToHex(result: any): string {
    try {
      // If result is already a BigInt
      if (typeof result === 'bigint') {
        return '0x' + result.toString(16).padStart(64, '0');
      }
      
      // If result is a number
      if (typeof result === 'number') {
        return '0x' + BigInt(result).toString(16).padStart(64, '0');
      }
      
      // If result is a string
      if (typeof result === 'string') {
        const bigIntValue = BigInt(result);
        return '0x' + bigIntValue.toString(16).padStart(64, '0');
      }
      
      // If result is an array (shouldn't happen but just in case)
      if (Array.isArray(result) || result instanceof Uint8Array) {
        const hexString = '0x' + Array.from(result)
          .map(b => Number(b).toString(16).padStart(2, '0'))
          .join('');
        return hexString.padStart(66, '0'); // Ensure 0x + 64 chars
      }
      
      // Fallback: convert to string then BigInt
      const bigIntValue = BigInt(String(result));
      return '0x' + bigIntValue.toString(16).padStart(64, '0');
      
    } catch (error) {
      console.error('Error converting poseidon result:', error, 'Result:', result);
      throw new Error(`Failed to convert poseidon result to hex: ${error.message}`);
    }
  }
  
  static generateSecret(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return '0x' + Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  static async hashName(name: string): Promise<string> {
    await this.init();
    try {
      const nameBytes = new TextEncoder().encode(name);
      const nameHex = Array.from(nameBytes).map(b => b.toString(16).padStart(2, '0')).join('');
      const nameBigInt = this.safeBigInt('0x' + nameHex);
      const result = this.poseidonHash([nameBigInt]);
      return this.poseidonResultToHex(result);
    } catch (error) {
      console.error('Error in hashName:', error);
      throw new Error(`Failed to hash name: ${error.message}`);
    }
  }
  
  static extractPhoneLastThree(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    const lastThree = cleaned.slice(-3);
    // Ensure it's a valid number string
    return lastThree.padStart(3, '0');
  }
  
  static async generateNonce(secret: string, name: string): Promise<string> {
    await this.init();
    try {
      const combined = secret + name;
      const combinedHex = Array.from(new TextEncoder().encode(combined))
        .map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 64);
      const combinedBigInt = this.safeBigInt('0x' + combinedHex);
      const result = this.poseidonHash([combinedBigInt]);
      return this.poseidonResultToHex(result);
    } catch (error) {
      console.error('Error in generateNonce:', error);
      throw new Error(`Failed to generate nonce: ${error.message}`);
    }
  }
  
  static async generateBuyerCommitment(
    secret: string,
    nameHash: string, 
    phoneLastThree: string,
    nonce: string
  ): Promise<string> {
    await this.init();
    try {
      console.log('generateBuyerCommitment inputs:', { secret, nameHash, phoneLastThree, nonce });
      
      const secretBigInt = this.safeBigInt(secret);
      const nameHashBigInt = this.safeBigInt(nameHash);
      const phoneBigInt = this.safeBigInt(phoneLastThree);
      const nonceBigInt = this.safeBigInt(nonce);
      
      console.log('Converted to BigInt:', { secretBigInt, nameHashBigInt, phoneBigInt, nonceBigInt });
      
      const result = this.poseidonHash([
        secretBigInt,
        nameHashBigInt,
        phoneBigInt,
        nonceBigInt
      ]);
      
      const hexResult = this.poseidonResultToHex(result);
      console.log('generateBuyerCommitment result:', hexResult);
      return hexResult;
      
    } catch (error) {
      console.error('Error in generateBuyerCommitment:', error);
      console.error('Input values:', { secret, nameHash, phoneLastThree, nonce });
      throw new Error(`Failed to generate buyer commitment: ${error.message}`);
    }
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
    try {
      console.log('generateSellerCommitment inputs:', { 
        buyerCommitment, packageId, itemPrice, shippingFee, storeAddress, minAgeRequired 
      });
      
      const packageIdHex = Array.from(new TextEncoder().encode(packageId))
        .map(b => b.toString(16).padStart(2, '0')).join('');
      
      const storeAddressHex = Array.from(new TextEncoder().encode(storeAddress))
        .map(b => b.toString(16).padStart(2, '0')).join('');

      const buyerCommitmentBigInt = this.safeBigInt(buyerCommitment);
      const packageIdBigInt = this.safeBigInt('0x' + packageIdHex.slice(0, 64));
      const itemPriceBigInt = this.safeBigInt(Math.floor(parseFloat(itemPrice) * 100));
      const shippingFeeBigInt = this.safeBigInt(Math.floor(parseFloat(shippingFee) * 100));
      const storeAddressBigInt = this.safeBigInt('0x' + storeAddressHex.slice(0, 64)); // ✅ FIXED!
      const minAgeBigInt = this.safeBigInt(minAgeRequired ? 18 : 0);
      
      console.log('Converted to BigInt:', {
        buyerCommitmentBigInt: buyerCommitmentBigInt.toString(),
        packageIdBigInt: packageIdBigInt.toString(),
        itemPriceBigInt: itemPriceBigInt.toString(),
        shippingFeeBigInt: shippingFeeBigInt.toString(),
        storeAddressBigInt: storeAddressBigInt.toString(),
        minAgeBigInt: minAgeBigInt.toString()
      });
      
      const result = this.poseidonHash([
        buyerCommitmentBigInt,
        packageIdBigInt,
        itemPriceBigInt,
        shippingFeeBigInt,
        storeAddressBigInt,
        minAgeBigInt
      ]);
      
      const hexResult = this.poseidonResultToHex(result);
      console.log('generateSellerCommitment result:', hexResult);
      return hexResult;
      
    } catch (error) {
      console.error('Error in generateSellerCommitment:', error);
      console.error('Input values:', { buyerCommitment, packageId, itemPrice, shippingFee, storeAddress, minAgeRequired });
      throw new Error(`Failed to generate seller commitment: ${error.message}`);
    }
  }
  
  static async generateStoreCommitment(
    sellerCommitment: string,
    storeSecret: string,
    packageId: string
  ): Promise<string> {
    await this.init();
    try {
      const packageIdHex = Array.from(new TextEncoder().encode(packageId))
        .map(b => b.toString(16).padStart(2, '0')).join('');
      
      // Safely convert all inputs
      const sellerCommitmentBigInt = this.safeBigInt(sellerCommitment);
      const storeSecretBigInt = this.safeBigInt(storeSecret);
      const packageIdBigInt = this.safeBigInt('0x' + packageIdHex.slice(0, 64));
      
      const result = this.poseidonHash([
        sellerCommitmentBigInt,
        storeSecretBigInt,
        packageIdBigInt
      ]);
      
      return this.poseidonResultToHex(result);
    } catch (error) {
      console.error('Error in generateStoreCommitment:', error);
      throw new Error(`Failed to generate store commitment: ${error.message}`);
    }
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
    try {
      const packageIdHex = Array.from(new TextEncoder().encode(packageId))
        .map(b => b.toString(16).padStart(2, '0')).join('');
      
      const buyerSecretBigInt = this.safeBigInt(buyerSecret);
      const packageIdBigInt = this.safeBigInt('0x' + packageIdHex.slice(0, 64));
      const storeCommitmentBigInt = this.safeBigInt(storeCommitment);
      
      const result = this.poseidonHash([
        buyerSecretBigInt,
        packageIdBigInt,
        storeCommitmentBigInt
      ]);
      
      return this.poseidonResultToHex(result);
    } catch (error) {
      console.error('Error in generateNullifier:', error);
      throw new Error(`Failed to generate nullifier: ${error.message}`);
    }
  }
}