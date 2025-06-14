export interface ZKProof {
  proof: {
    pi_a: [string, string];
    pi_b: [[string, string], [string, string]];
    pi_c: [string, string];
  };
  publicSignals: string[];
}

// // Mock ZK proof for development
// export const createMockZKProof = (packageData: any): ZKProof => ({
//   proof: {
//     pi_a: ['0x' + Math.random().toString(16), '0x' + Math.random().toString(16)] as [string, string],
//     pi_b: [
//       ['0x' + Math.random().toString(16), '0x' + Math.random().toString(16)], 
//       ['0x' + Math.random().toString(16), '0x' + Math.random().toString(16)]
//     ] as [[string, string], [string, string]],
//     pi_c: ['0x' + Math.random().toString(16), '0x' + Math.random().toString(16)] as [string, string]
//   },
//   publicSignals: [
//     '0x' + Math.random().toString(16).substring(2, 66),
//     '0x' + Math.random().toString(16).substring(2, 66),
//     '1',
//     packageData?.packageId || 'mock_package',
//     packageData?.needsAgeCheck ? '18' : '0'
//   ]
// });

// For compatibility with zkUtils
export interface ZKProofResult extends ZKProof {}

export interface UserIdentity {
  name: string;
  phone: string;
  age: string;
  secret: string;
  nameHash: string;
  phoneLastThree: string;
  nonce: string;
}

export interface PackageData {
  packageId: string;
  sellerCommitment: string;
  storeCommitment: string;
  needsAgeCheck: boolean;
  itemPrice: string;
  shippingFee: string;
  storeAddress: string;
}

export interface Notification {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  timestamp: number;
}

export interface SystemStatus {
  circuitsLoaded: boolean;
  contractsInitialized: boolean;
  smartEOADelegated: boolean;
  ageVerified: boolean;
  loading: boolean;
  proving: boolean;
}

export interface ContractAddresses {
  localWallet: string;
  pickupSystem: string;
  groth16Verifier: string;
}

export interface TransactionResult {
  txHash: string;
  success: boolean;
  gasUsed?: bigint;
  blockNumber?: number;
}

export interface StoreCommitmentResult {
  storeCommitment: string;
  txHash: string;
}

export interface DelegationResult {
  txHash: string;
  buyerCommitment: string;
  walletAddress: string;
}

export interface PackageRegistrationResult {
  txHash: string;
  sellerCommitment: string;
}

export const GAS_LIMITS = {
  DELEGATE_WALLET: BigInt(500000),
  VERIFY_AGE: BigInt(100000),
  REGISTER_PACKAGE: BigInt(300000),
  GENERATE_COMMITMENT: BigInt(200000),
  PICKUP_PACKAGE: BigInt(400000),
  DEFAULT: BigInt(150000)
} as const;

// Network configurations
export const SUPPORTED_NETWORKS = {
  1: {
    name: 'Ethereum Mainnet',
    rpcUrl: 'https://mainnet.infura.io/v3/',
    blockExplorer: 'https://etherscan.io'
  },
  11155111: {
    name: 'Sepolia Testnet',
    rpcUrl: 'https://sepolia.infura.io/v3/',
    blockExplorer: 'https://sepolia.etherscan.io'
  },
  31337: {
    name: 'Hardhat Local',
    rpcUrl: 'http://localhost:8545',
    blockExplorer: 'http://localhost:8545'
  }
} as const;

export type SupportedChainId = keyof typeof SUPPORTED_NETWORKS;

// Error messages
export const ERROR_MESSAGES = {
  CONTRACTS_NOT_INITIALIZED: 'Contracts not initialized',
  CIRCUITS_NOT_LOADED: 'ZK circuits not loaded',
  WALLET_NOT_CONNECTED: 'Wallet not connected',
  INVALID_NETWORK: 'Unsupported network',
  INSUFFICIENT_FUNDS: 'Insufficient funds for transaction',
  TRANSACTION_FAILED: 'Transaction failed',
  PROOF_GENERATION_FAILED: 'ZK proof generation failed',
  AGE_VERIFICATION_REQUIRED: 'Age verification required',
  PACKAGE_NOT_FOUND: 'Package not found',
  UNAUTHORIZED_PICKUP: 'Unauthorized pickup attempt'
} as const;

// System constants
export const SYSTEM_CONSTANTS = {
  MIN_AGE_REQUIRED: 18,
  MAX_RETRY_ATTEMPTS: 5,
  RETRY_DELAY_MS: 1000,
  PROOF_GENERATION_TIMEOUT_MS: 30000,
  TRANSACTION_TIMEOUT_MS: 60000,
  GAS_LIMITS: GAS_LIMITS
} as const;

// Event types for the notification system
export type NotificationType = Notification['type'];

// Utility type for making all properties optional
export type Partial<T> = {
  [P in keyof T]?: T[P];
};

// Utility type for making all properties required
export type Required<T> = {
  [P in keyof T]-?: T[P];
};

// Hook return types
export interface UsePickupSystemReturn {
  // State
  circuitsLoaded: boolean;
  contractsInitialized: boolean;
  smartEOADelegated: boolean;
  ageVerified: boolean;
  loading: boolean;
  proving: boolean;
  walletAddress: string;
  buyerCommitment: string;
  userIdentity: UserIdentity;
  
  // Actions
  delegateSmartEOA: (name: string, phone: string, age: number) => Promise<DelegationResult>;
  performAgeVerification: () => Promise<string>;
  registerPackage: (packageData: PackageData) => Promise<PackageRegistrationResult>;
  generateStoreCommitment: (packageId: string) => Promise<StoreCommitmentResult>;
  generateZKProof: (packageData: PackageData) => Promise<ZKProofResult>;
  submitPickupProof: (packageId: string, proof: ZKProofResult) => Promise<string>;
  checkAgeVerification: () => Promise<boolean>;
}