// Constants for the anonymous pickup system

export const SYSTEM_CONSTANTS = {
  // Age verification
  AGE_VERIFICATION_VALIDITY_DAYS: 20,
  MINIMUM_AGE: 13,
  ADULT_AGE: 18,
  
  // Package settings
  PICKUP_VALIDITY_DAYS: 30,
  MIN_PACKAGE_VALUE_ETH: '0.01',
  
  // Network settings
  SUPPORTED_CHAIN_IDS: [31337, 11155111], // Hardhat, Sepolia
  DEFAULT_CHAIN_ID: 31337,
  
  // Circuit settings
  CIRCUIT_PATHS: {
    WASM: '/circuits/pickup-group-signature.wasm',
    ZKEY: '/circuits/pickup-group-signature_final.zkey'
  },
  
  // Contract settings
  GAS_LIMITS: {
    DELEGATE_WALLET: 500000,
    REGISTER_PACKAGE: 300000,
    GENERATE_COMMITMENT: 200000,
    PICKUP_PACKAGE: 400000
  }
} as const;

export const ERROR_MESSAGES = {
  SYSTEM_NOT_READY: 'System not ready. Please wait for initialization.',
  CIRCUITS_NOT_LOADED: 'ZK circuits not loaded',
  CONTRACTS_NOT_INITIALIZED: 'Smart contracts not initialized',
  WALLET_NOT_CONNECTED: 'Wallet not connected',
  AGE_VERIFICATION_REQUIRED: 'Age verification required for this package',
  AGE_VERIFICATION_EXPIRED: 'Age verification has expired',
  INVALID_INPUT: 'Invalid input provided',
  PROOF_GENERATION_FAILED: 'ZK proof generation failed',
  TRANSACTION_FAILED: 'Transaction failed'
} as const;

export const SUCCESS_MESSAGES = {
  SMART_EOA_DELEGATED: 'Smart EOA delegated successfully',
  AGE_VERIFIED: 'Age verified locally',
  PACKAGE_REGISTERED: 'Package registered successfully',
  STORE_COMMITMENT_GENERATED: 'Store commitment generated',
  PROOF_GENERATED: 'ZK proof generated successfully',
  PICKUP_COMPLETED: 'Package picked up successfully'
} as const;