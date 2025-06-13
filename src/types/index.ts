// Notification system types
export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
  timestamp: number;
}

// User identity for Smart EOA setup
export interface UserIdentity {
  name: string;
  phone: string;
  age: string;
  secret: string;
  nameHash: string;
  phoneLastThree: string;
  nonce: string;
}

// Package data structure
export interface PackageData {
  packageId: string;
  sellerCommitment: string;
  storeCommitment: string;
  needsAgeCheck: boolean;
  itemPrice: string;
  shippingFee: string;
  storeAddress: string;
}

// ZK Proof structure (Groth16 format)
export interface ZKProof {
  proof: {
    pi_a: [string, string];
    pi_b: [[string, string], [string, string]];
    pi_c: [string, string];
  };
  publicSignals: string[];
}

// Smart contract interaction types
export interface TransactionResult {
  txHash: string;
  blockNumber?: number;
  gasUsed?: string;
}

export interface PackageRegistrationResult extends TransactionResult {
  sellerCommitment: string;
}

export interface StoreCommitmentResult extends TransactionResult {
  storeCommitment: string;
}

export interface SmartEOASetupResult extends TransactionResult {
  buyerCommitment: string;
  walletAddress: string;
}

// System status types
export interface SystemStatus {
  circuitsLoaded: boolean;
  contractsInitialized: boolean;
  smartEOADelegated: boolean;
  ageVerified: boolean;
  walletConnected: boolean;
}

// Circuit and proof generation types
export interface CircuitInputs {
  buyerCommitment: string;
  sellerCommitment: string;
  storeCommitment: string;
  packageId: string;
  minAgeRequired: string;
  userAge: string;
  phoneLastThree: string;
  userSecret: string;
  nonce: string;
}

// Age verification types
export interface AgeVerificationResult {
  verified: boolean;
  expiryDate: string;
  method: 'biometric' | 'document' | 'manual';
}

// Store management types
export interface StoreInfo {
  address: string;
  name: string;
  authorized: boolean;
  secretSet: boolean;
  packagesHandled: number;
}

// Blockchain network types
export interface NetworkConfig {
  chainId: number;
  name: string;
  rpcUrl: string;
  explorerUrl: string;
  contracts: {
    pickupSystem: string;
    verifier: string;
  };
}

// Error types for better error handling
export interface SystemError {
  code: string;
  message: string;
  details?: any;
  timestamp: number;
}

// Event types for the pickup system
export interface PickupSystemEvent {
  type: 'PackageRegistered' | 'StoreCommitmentGenerated' | 'PackagePickedUp' | 'StoreAuthorized';
  packageId?: string;
  storeAddress?: string;
  data: any;
  blockNumber: number;
  transactionHash: string;
  timestamp: number;
}