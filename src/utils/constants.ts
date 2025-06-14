// constants.ts - System constants and error messages for the anonymous pickup system

export const ERROR_MESSAGES = {
  CONTRACTS_NOT_INITIALIZED: 'Contracts not initialized. Please call initialize() first.',
  WALLET_NOT_CONNECTED: 'Wallet not connected. Please connect your wallet.',
  INVALID_NETWORK: 'Invalid network. Please switch to a supported network.',
  INSUFFICIENT_BALANCE: 'Insufficient balance for transaction.',
  TRANSACTION_FAILED: 'Transaction failed. Please try again.',
  INVALID_PACKAGE_ID: 'Invalid package ID format.',
  PACKAGE_NOT_FOUND: 'Package not found.',
  PACKAGE_ALREADY_PICKED_UP: 'Package has already been picked up.',
  AGE_VERIFICATION_REQUIRED: 'Age verification required for this package.',
  AGE_VERIFICATION_EXPIRED: 'Age verification has expired. Please verify again.',
  INVALID_PROOF: 'Invalid ZK proof provided.',
  STORE_NOT_AUTHORIZED: 'Store is not authorized for this package.',
  BUYER_NOT_AUTHORIZED: 'Buyer is not authorized for this package.',
  COMMITMENT_MISMATCH: 'Commitment verification failed.',
  ZK_CIRCUITS_NOT_LOADED: 'ZK circuits not loaded. Please wait for initialization.',
  INVALID_ADDRESS_FORMAT: 'Invalid Ethereum address format.',
  INVALID_COMMITMENT_FORMAT: 'Invalid commitment format.',
  STORE_COMMITMENT_NOT_GENERATED: 'Store commitment has not been generated yet.',
  EIP7702_NOT_SUPPORTED: 'EIP-7702 not supported on this network or wallet.',
  IDENTITY_NOT_INITIALIZED: 'Buyer identity not initialized. Please set up Smart EOA first.',
  IDENTITY_ALREADY_EXISTS: 'Buyer identity already exists for this address.',
} as const;

export const SYSTEM_CONSTANTS = {
  // Gas limits for different operations
  GAS_LIMITS: {
    DELEGATE_WALLET: 500000,      // EIP-7702 delegation
    INITIALIZE_IDENTITY: 300000,   // Initialize buyer identity
    REGISTER_PACKAGE: 400000,      // Register package
    GENERATE_COMMITMENT: 200000,   // Generate store commitment
    PICKUP_PACKAGE: 600000,        // Submit pickup proof
    VERIFY_AGE: 150000,           // Local age verification
    UPDATE_AGE: 100000,           // Update age
  },
  
  // Time constants
  TIME: {
    AGE_VERIFICATION_VALIDITY: 20 * 24 * 60 * 60, // 20 days in seconds
    TRANSACTION_TIMEOUT: 60000,                    // 60 seconds
    RETRY_INTERVAL: 2000,                         // 2 seconds
    MAX_RETRIES: 30,                              // Maximum retry attempts
  },
  
  // ZK proof constants
  ZK: {
    CIRCUIT_LOAD_TIMEOUT: 30000,    // 30 seconds
    PROOF_GENERATION_TIMEOUT: 60000, // 60 seconds
    MAX_PUBLIC_SIGNALS: 10,          // Maximum number of public signals
    FIELD_SIZE: '21888242871839275222246405745257275088548364400416034343698204186575808495617',
  },
  
  // Network constants
  NETWORKS: {
    MAINNET_CHAIN_ID: 1,
    SEPOLIA_CHAIN_ID: 11155111,
    POLYGON_CHAIN_ID: 137,
    ARBITRUM_CHAIN_ID: 42161,
  },
  
  // Package constants
  PACKAGE: {
    MAX_PACKAGE_ID_LENGTH: 64,
    MIN_AGE_REQUIRED: 18,
    MAX_AGE: 150,
    MIN_AGE: 13,
    MAX_PRICE_ETH: '10.0',        // Maximum package price in ETH
    MIN_PRICE_ETH: '0.001',       // Minimum package price in ETH
  },
  
  // Commitment constants
  COMMITMENTS: {
    HASH_LENGTH: 32,              // bytes
    HEX_LENGTH: 64,               // hex characters (without 0x)
    PHONE_LAST_DIGITS: 3,         // Number of phone digits to use
  },
  
  // UI constants
  UI: {
    NOTIFICATION_DURATION: 5000,  // 5 seconds
    POLLING_INTERVAL: 2000,       // 2 seconds
    ANIMATION_DURATION: 300,      // 300ms
  },
  
  // Security constants
  SECURITY: {
    MAX_RETRY_ATTEMPTS: 3,
    RATE_LIMIT_WINDOW: 60000,     // 1 minute
    MAX_REQUESTS_PER_WINDOW: 10,
  },
  
  // File and storage constants
  STORAGE: {
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'application/pdf'],
    SESSION_DURATION: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  },
} as const;

// Circuit-specific constants
export const CIRCUIT_CONSTANTS = {
  PICKUP_GROUP_SIGNATURE: {
    CIRCUIT_NAME: 'pickup-group-signature',
    CIRCUIT_FILE: 'pickup-group-signature.wasm',
    ZKEY_FILE: 'pickup-group-signature_final.zkey',
    VERIFICATION_KEY_FILE: 'pickup-group-signature_verification_key.json',
  },
  
  AGE_VERIFICATION: {
    CIRCUIT_NAME: 'age-verification',
    CIRCUIT_FILE: 'age-verification.wasm',
    ZKEY_FILE: 'age-verification_final.zkey',
    VERIFICATION_KEY_FILE: 'age-verification_verification_key.json',
  },
  
  COMMITMENT_NULLIFIER: {
    CIRCUIT_NAME: 'commitment-nullifier',
    CIRCUIT_FILE: 'commitment-nullifier.wasm',
    ZKEY_FILE: 'commitment-nullifier_final.zkey',
    VERIFICATION_KEY_FILE: 'commitment-nullifier_verification_key.json',
  },
} as const;

// API endpoints (if using external services)
export const API_ENDPOINTS = {
  BLOCKCHAIN_EXPLORER: {
    MAINNET: 'https://api.etherscan.io/api',
    SEPOLIA: 'https://api-sepolia.etherscan.io/api',
  },
  
  IPFS_GATEWAYS: [
    'https://ipfs.io/ipfs/',
    'https://gateway.pinata.cloud/ipfs/',
    'https://cloudflare-ipfs.com/ipfs/',
  ],
  
  ZK_TRUSTED_SETUP: {
    POWERS_OF_TAU: 'https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_15.ptau',
  },
} as const;

// Contract addresses (these would typically come from environment variables)
export const CONTRACT_ADDRESSES = {
  // These are placeholders - replace with actual deployed addresses
  MAINNET: {
    LOCAL_WALLET: process.env.NEXT_PUBLIC_LOCAL_WALLET_ADDRESS_MAINNET || '',
    PICKUP_SYSTEM: process.env.NEXT_PUBLIC_PICKUP_SYSTEM_ADDRESS_MAINNET || '',
    VERIFIER: process.env.NEXT_PUBLIC_VERIFIER_ADDRESS_MAINNET || '',
  },
  
  SEPOLIA: {
    LOCAL_WALLET: process.env.NEXT_PUBLIC_LOCAL_WALLET_ADDRESS_SEPOLIA || '',
    PICKUP_SYSTEM: process.env.NEXT_PUBLIC_PICKUP_SYSTEM_ADDRESS_SEPOLIA || '',
    VERIFIER: process.env.NEXT_PUBLIC_VERIFIER_ADDRESS_SEPOLIA || '',
  },
} as const;

// Validation patterns
export const VALIDATION_PATTERNS = {
  ETHEREUM_ADDRESS: /^0x[a-fA-F0-9]{40}$/,
  TRANSACTION_HASH: /^0x[a-fA-F0-9]{64}$/,
  COMMITMENT_HASH: /^0x[a-fA-F0-9]{64}$/,
  PHONE_NUMBER: /^\+?[\d\s\-\(\)]{10,}$/,
  PACKAGE_ID: /^[A-Z0-9\-]{3,64}$/,
} as const;

// Feature flags
export const FEATURE_FLAGS = {
  ENABLE_EIP7702: true,
  ENABLE_AGE_VERIFICATION: true,
  ENABLE_BATCH_TRANSACTIONS: true,
  ENABLE_IPFS_STORAGE: false,
  ENABLE_PUSH_NOTIFICATIONS: false,
  ENABLE_ANALYTICS: false,
  DEBUG_MODE: process.env.NODE_ENV === 'development',
} as const;

// Wallet-specific constants
export const WALLET_CONSTANTS = {
  AMBIRE: {
    SUPPORTS_EIP7702: true,
    SUPPORTS_BATCH_CALLS: true,
    BATCH_CALL_METHOD: 'wallet_sendCalls',
  },
  
  METAMASK: {
    SUPPORTS_EIP7702: false,
    SUPPORTS_BATCH_CALLS: false,
  },
  
  EMBEDDED: {
    SUPPORTS_EIP7702: true,
    SUPPORTS_BATCH_CALLS: false,
  },
} as const;

// Export type definitions for better TypeScript support
export type ErrorMessageKey = keyof typeof ERROR_MESSAGES;
export type GasLimitKey = keyof typeof SYSTEM_CONSTANTS.GAS_LIMITS;
export type NetworkChainId = typeof SYSTEM_CONSTANTS.NETWORKS[keyof typeof SYSTEM_CONSTANTS.NETWORKS];
export type CircuitName = keyof typeof CIRCUIT_CONSTANTS;