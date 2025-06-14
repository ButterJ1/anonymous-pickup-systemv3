// contractUtils.ts

import { ethers, BrowserProvider, Contract } from 'ethers';
import { createWalletClient, http, custom, Chain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { sepolia, mainnet } from 'viem/chains';
import { ZKProofResult } from './zkUtils';
import { ERROR_MESSAGES, SYSTEM_CONSTANTS } from './constants';

// EIP-7702 Transaction Type (0x04)
const EIP_7702_TRANSACTION_TYPE = '0x04';

// Viem client for EIP-7702 transactions (embedded wallets only)
interface EIP7702Authorization {
  chainId: number;
  address: `0x${string}`;
  nonce: bigint;
  yParity: 0 | 1;
  r: `0x${string}`;
  s: `0x${string}`;
}

// Type definitions for Ethereum provider
interface EthereumProvider {
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (event: string, callback: (...args: any[]) => void) => void;
  removeListener: (event: string, callback: (...args: any[]) => void) => void;
  isAmbire?: boolean;
  isMetaMask?: boolean;
}

// Extend Window interface to include ethereum
declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

const LOCAL_WALLET_ABI = [
  "function initializeBuyerIdentity(string memory _name, string memory _phone, uint256 _age) external returns (uint256)",
  "function getPickupProofData(bytes32 _packageId) external view returns (uint256, uint256, uint256, uint256, uint256, uint256, bool)",
  "function verifyAgeLocally(bytes memory _ageProof) external",
  "function verifyAgeLocallyFor(address _buyer, bytes memory _ageProof) external",
  "function getPickupProofDataFor(address _buyer, bytes32 _packageId) external view returns (uint256, uint256, uint256, uint256, uint256, uint256, bool)",
  "function isAgeVerificationValid() external view returns (bool)",
  "function isAgeVerificationValidFor(address _buyer) external view returns (bool)",
  "function getBuyerCommitment() external view returns (uint256)",
  "function getBuyerCommitmentFor(address _buyer) external view returns (uint256)",
  "function updateAge(uint256 _newAge) external",
  "function updateAgeFor(address _buyer, uint256 _newAge) external",
  "function isInitialized() external view returns (bool)",
  "function isInitializedFor(address _buyer) external view returns (bool)",
  "function getBuyerIdentitySummary(address _buyer) external view returns (bool, uint256, uint256, uint256, bool)",
  "function resetIdentity() external",
  "function resetIdentityFor(address _buyer) external",
  "function batchExecute(bytes[] calldata _calls) external returns (bytes[] memory)",
  "event IdentityCreated(address indexed buyer, uint256 commitment)",
  "event AgeVerified(address indexed buyer, uint256 timestamp)",
  "event CommitmentGenerated(address indexed buyer, uint256 commitment)"
];

const PICKUP_SYSTEM_ABI = [
  "function authorizeStore(address _store) external",
  "function setStoreSecret(uint256 _storeSecret) external",
  "function registerPackage(bytes32 _packageId, uint256 _buyerCommitment, uint256 _sellerCommitment, address _storeAddress, uint256 _itemPrice, uint256 _shippingFee, uint256 _minAgeRequired) external payable",
  "function generateStoreCommitment(bytes32 _packageId) external returns (uint256)",
  "function pickupPackage(bytes32 _packageId, uint[2] memory _pA, uint[2][2] memory _pB, uint[2] memory _pC, uint[5] memory _publicSignals) external",
  "function getPackageDetails(bytes32 _packageId) external view returns (tuple(bytes32,uint256,uint256,address,uint256,uint256,uint256,bool,uint256))",
  "function getStoreCommitmentDetails(bytes32 _packageId) external view returns (tuple(uint256,address,bytes32,uint256,bool))",
  "function canPickupPackage(bytes32 _packageId) external view returns (bool)",
  "function isStoreReady(address _store) external view returns (bool)"
];

export interface PackageDetails {
  packageId: string;
  buyerCommitment: bigint;
  sellerCommitment: bigint;
  storeAddress: string;
  itemPrice: bigint;
  shippingFee: bigint;
  minAgeRequired: bigint;
  isPickedUp: boolean;
  registeredAt: bigint;
}

export class ContractUtils {
  private provider: BrowserProvider | null = null;
  private signer: any = null;
  private viemWalletClient: any = null;
  private localWalletContract: Contract | null = null;
  private pickupSystemContract: Contract | null = null;
  private isEIP7702Supported: boolean = false;
  
  // Track the actual address that initialized the identity
  private buyerIdentityAddress: string | null = null;

  // EIP-7702 supported networks
  private readonly EIP7702_SUPPORTED_NETWORKS = {
    1: { name: 'Ethereum Mainnet', viemChain: mainnet },
    11155111: { name: 'Sepolia Testnet', viemChain: sepolia }
  };

  private safeToBigInt(value: any): bigint {
    // Handle different input types
    if (typeof value === 'bigint') {
      return value;
    }

    if (typeof value === 'number') {
      return BigInt(value);
    }

    if (typeof value === 'string') {
      // If it's a hex string
      if (value.startsWith('0x')) {
        return BigInt(value);
      }
      // If it's a decimal string
      if (/^\d+$/.test(value)) {
        return BigInt(value);
      }
      // If it contains commas (stringified array), it's invalid
      if (value.includes(',')) {
        throw new Error(`Invalid commitment format: ${value}. Expected hex string or number.`);
      }
      return BigInt(value);
    }

    // Handle Uint8Array or Buffer
    if (value instanceof Uint8Array || Buffer.isBuffer(value)) {
      return BigInt('0x' + Buffer.from(value).toString('hex'));
    }

    // Handle arrays (likely from stringified Uint8Array)
    if (Array.isArray(value)) {
      const bytes = new Uint8Array(value);
      return BigInt('0x' + Buffer.from(bytes).toString('hex'));
    }

    throw new Error(`Cannot convert ${typeof value} to BigInt: ${value}`);
  }

  private normalizeCommitment(commitment: any): string {
    try {
      const bigIntValue = this.safeToBigInt(commitment);
      return '0x' + bigIntValue.toString(16).padStart(64, '0');
    } catch (error) {
      console.error('Error normalizing commitment:', error);
      throw new Error(`Invalid commitment format: ${commitment}`);
    }
  }

  // Check if Ethereum provider is available
  private checkEthereumProvider(): EthereumProvider {
    if (typeof window !== 'undefined' && window.ethereum) {
      return window.ethereum;
    }
    throw new Error('Ethereum provider not found. Please install Ambire.');
  }

  async initialize(): Promise<boolean> {
    try {
      if (typeof window === 'undefined' || !window.ethereum) {
        throw new Error('Ethereum provider not found');
      }

      // Initialize ethers provider
      this.provider = new ethers.BrowserProvider(window.ethereum);
      await this.provider.send("eth_requestAccounts", []);
      this.signer = await this.provider.getSigner();

      // Check EIP-7702 support
      const network = await this.provider.getNetwork();
      const chainId = Number(network.chainId);
      this.isEIP7702Supported = chainId in this.EIP7702_SUPPORTED_NETWORKS;

      console.log('🔍 Network Info:', {
        chainId,
        networkName: this.EIP7702_SUPPORTED_NETWORKS[chainId]?.name || 'Unknown',
        isEIP7702Supported: this.isEIP7702Supported
      });

      // Initialize Viem client for embedded wallets only (not browser wallets)
      if (this.isEIP7702Supported && await this.isEmbeddedWallet()) {
        await this.initializeViemClient(chainId);
      }

      // Initialize contracts
      const localWalletAddress = process.env.NEXT_PUBLIC_LOCAL_WALLET_ADDRESS;
      const pickupSystemAddress = process.env.NEXT_PUBLIC_PICKUP_SYSTEM_ADDRESS;

      if (!localWalletAddress || !pickupSystemAddress) {
        throw new Error('Missing contract addresses in environment variables');
      }

      this.localWalletContract = new Contract(localWalletAddress, LOCAL_WALLET_ABI, this.signer);
      this.pickupSystemContract = new Contract(pickupSystemAddress, PICKUP_SYSTEM_ABI, this.signer);

      // Test if the new methods are available
      try {
        console.log('🔍 Testing contract methods...');
        const testAddress = await this.signer.getAddress();
        
        // Test the new method to ensure it's available
        const contractAny = this.localWalletContract as any;
        if (contractAny.getBuyerCommitmentFor) {
          console.log('✅ getBuyerCommitmentFor method is available');
        } else {
          console.warn('⚠️ getBuyerCommitmentFor method not found - contract may need redeployment');
        }
        
        if (contractAny.isInitializedFor) {
          console.log('✅ isInitializedFor method is available');
        } else {
          console.warn('⚠️ isInitializedFor method not found - contract may need redeployment');
        }
      } catch (testError) {
        console.warn('⚠️ Contract method test failed:', testError.message);
      }

      return true;
    } catch (error) {
      console.error('❌ Contract initialization error:', error);
      return false;
    }
  }

  // Method to reinitialize contracts with new addresses
  async reinitializeContracts(localWalletAddress?: string, pickupSystemAddress?: string): Promise<boolean> {
    try {
      if (!this.provider || !this.signer) {
        throw new Error('Provider not initialized. Call initialize() first.');
      }

      const localAddress = localWalletAddress || process.env.NEXT_PUBLIC_LOCAL_WALLET_ADDRESS;
      const pickupAddress = pickupSystemAddress || process.env.NEXT_PUBLIC_PICKUP_SYSTEM_ADDRESS;

      if (!localAddress || !pickupAddress) {
        throw new Error('Missing contract addresses');
      }

      console.log('🔄 Reinitializing contracts with addresses:', {
        localWallet: localAddress,
        pickupSystem: pickupAddress
      });

      // Create new contract instances with updated ABI
      this.localWalletContract = new Contract(localAddress, LOCAL_WALLET_ABI, this.signer);
      this.pickupSystemContract = new Contract(pickupAddress, PICKUP_SYSTEM_ABI, this.signer);

      // Test the new contract methods
      const contractAny = this.localWalletContract as any;
      if (contractAny.getBuyerCommitmentFor) {
        console.log('✅ Contract reinitialized successfully with new methods');
        return true;
      } else {
        console.error('❌ Contract reinitialization failed - new methods not available');
        return false;
      }
    } catch (error) {
      console.error('❌ Contract reinitialization error:', error);
      return false;
    }
  }

  // Check if wallet is embedded (has private key) vs browser wallet
  private async isEmbeddedWallet(): Promise<boolean> {
    try {
      const provider = window.ethereum as any;
      
      // Browser wallets have these properties
      if (provider?.isMetaMask || provider?.isAmbire) {
        return false;
      }
      
      // If it's a browser extension or has these methods, it's a browser wallet
      if (provider?.isConnected || provider?.enable) {
        return false;
      }
      
      return true; // Assume embedded if no browser wallet indicators
    } catch {
      return false;
    }
  }

  // Initialize Viem client for EIP-7702 transactions (embedded wallets only)
  private async initializeViemClient(chainId: number): Promise<void> {
    try {
      const networkConfig = this.EIP7702_SUPPORTED_NETWORKS[chainId];
      if (!networkConfig) {
        throw new Error(`Chain ${chainId} not supported for EIP-7702`);
      }

      // Create Viem wallet client with window.ethereum for embedded wallets only
      this.viemWalletClient = createWalletClient({
        chain: networkConfig.viemChain,
        transport: custom(window.ethereum!)
      });

      console.log('✅ Viem client initialized for EIP-7702 (embedded wallet)');
    } catch (error) {
      console.error('❌ Viem client initialization failed:', error);
      this.isEIP7702Supported = false;
    }
  }

  // Check if wallet is Ambire with EIP-7702 support
  private async checkAmbireEIP7702Support(): Promise<boolean> {
    try {
      if (!window.ethereum) return false;
      
      // Check if it's Ambire wallet
      const isAmbire = !!(window.ethereum as any).isAmbire;
      if (!isAmbire) return false;
      
      // Check if Ambire supports EIP-7702 methods
      const provider = window.ethereum as any;
      
      // Try to detect Ambire's EIP-7702 methods
      const hasEIP7702 = typeof provider.request === 'function';
      
      console.log('🔍 Ambire EIP-7702 Check:', { isAmbire, hasEIP7702 });
      return hasEIP7702;
      
    } catch (error) {
      console.error('❌ Ambire EIP-7702 check failed:', error);
      return false;
    }
  }

  // Extract transaction receipt from Ambire response and verify identity creation
  private async verifyIdentityCreation(
    txHash: string, 
    expectedWalletAddress: string,
    maxRetries: number = 10
  ): Promise<{ commitment: string; actualAddress: string }> {
    console.log('🔍 Verifying identity creation for tx:', txHash);
    
    let retryCount = 0;
    while (retryCount < maxRetries) {
      try {
        // Wait a bit for the transaction to be mined
        if (retryCount > 0) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // Try to get the transaction receipt
        const receipt = await this.provider!.getTransactionReceipt(txHash);
        
        if (receipt && receipt.status === 1) {
          console.log('✅ Transaction receipt found:', {
            hash: receipt.hash,
            status: receipt.status,
            from: receipt.from,
            to: receipt.to,
            logsCount: receipt.logs.length
          });
          
          console.log('🔍 All transaction logs:');
          receipt.logs.forEach((log, index) => {
            console.log(`Log ${index}:`, {
              address: log.address,
              topics: log.topics,
              data: log.data
            });
          });
          
          const contractAddress = await this.localWalletContract!.getAddress();
          
          // Look for IdentityCreated event in logs
          const identityCreatedTopic = ethers.id('IdentityCreated(address,uint256)');
          console.log('🔍 Looking for event topic:', identityCreatedTopic);
          console.log('🔍 Contract address:', contractAddress);
          
          const identityEvent = receipt.logs.find(log => 
            log.topics[0] === identityCreatedTopic &&
            log.address.toLowerCase() === contractAddress.toLowerCase()
          );
          
          if (identityEvent) {
            console.log('✅ Found IdentityCreated event:', identityEvent);
            
            try {
              const decodedEvent = this.localWalletContract!.interface.parseLog({
                topics: identityEvent.topics,
                data: identityEvent.data
              });
              
              const actualAddress = decodedEvent.args[0];
              const commitment = this.normalizeCommitment(decodedEvent.args[1]);
              
              console.log('✅ Identity created for address:', actualAddress);
              console.log('✅ Buyer commitment:', commitment);
              
              // Store the actual address that created the identity
              this.buyerIdentityAddress = actualAddress;
              
              return { commitment, actualAddress };
            } catch (parseError) {
              console.error('❌ Event parsing failed:', parseError);
            }
          } else {
            console.warn('⚠️ IdentityCreated event not found in transaction logs');
            console.log('🔄 Trying fallback method to get commitment...');
            try {
              // Try both the current signer and the expected address
              let commitment: any;
              
              try {
                commitment = await this.localWalletContract!.getBuyerCommitment();
                console.log('✅ Got commitment from current signer:', commitment);
              } catch (error) {
                console.log('🔄 Current signer failed, trying expected address...');
                
                // Try with the expected wallet address
                const contractInterface = this.localWalletContract!.interface;
                const calldata = contractInterface.encodeFunctionData('getBuyerCommitmentFor', [expectedWalletAddress]);
                
                const result = await this.provider!.call({
                  to: contractAddress,
                  data: calldata
                });
                
                if (result && result !== '0x') {
                  commitment = contractInterface.decodeFunctionResult('getBuyerCommitmentFor', result)[0];
                  console.log('✅ Got commitment via direct call:', commitment);
                }
              }
              
              if (commitment && commitment !== '0x' && commitment !== 0) {
                const normalizedCommitment = this.normalizeCommitment(commitment);
                this.buyerIdentityAddress = expectedWalletAddress;
                
                console.log('✅ Fallback successful - commitment found:', normalizedCommitment);
                return { 
                  commitment: normalizedCommitment, 
                  actualAddress: expectedWalletAddress 
                };
              }
            } catch (fallbackError) {
              console.warn('⚠️ Fallback method also failed:', fallbackError.message);
            }
          }
        } else if (receipt && receipt.status === 0) {
          throw new Error(`Transaction failed with status 0`);
        }
        
        retryCount++;
        if (retryCount < maxRetries) {
          console.log(`🔄 Retry ${retryCount}/${maxRetries} - waiting for transaction confirmation...`);
        }
        
      } catch (error) {
        console.warn(`⚠️ Error checking transaction (attempt ${retryCount + 1}):`, error.message);
        retryCount++;
        
        if (retryCount >= maxRetries) {
          console.log('🔄 Final fallback attempt...');
          try {
            const commitment = await this.localWalletContract!.getBuyerCommitment();
            if (commitment && commitment !== '0x' && commitment !== 0) {
              const normalizedCommitment = this.normalizeCommitment(commitment);
              this.buyerIdentityAddress = expectedWalletAddress;
              
              console.log('✅ Final fallback successful:', normalizedCommitment);
              return { 
                commitment: normalizedCommitment, 
                actualAddress: expectedWalletAddress 
              };
            }
          } catch (finalError) {
            console.error('❌ Final fallback failed:', finalError.message);
          }
          
          throw new Error(`Could not verify identity creation after ${maxRetries} attempts. Transaction may have succeeded but event parsing failed.`);
        }
      }
    }
    
    throw new Error(`Transaction verification failed after ${maxRetries} attempts`);
  }

  // Use Ambire's native EIP-7702 implementation with proper verification
  private async delegateWithAmbireEIP7702(
    name: string, 
    phone: string, 
    age: number, 
    walletAddress: string
  ): Promise<{ txHash: string; buyerCommitment: string; walletAddress: string }> {
    try {
      console.log('🔍 Attempting Ambire native EIP-7702...');
      
      const network = await this.provider!.getNetwork();
      const chainId = Number(network.chainId);
      const localWalletAddress = await this.localWalletContract!.getAddress();
      
      // Use Ambire's transaction batching feature (which uses EIP-7702 internally)
      const calldata = this.localWalletContract!.interface.encodeFunctionData(
        'initializeBuyerIdentity',
        [name, phone, age]
      );
      
      // Try to use Ambire's batching feature (EIP-5792 + EIP-7702)
      const provider = window.ethereum as any;
      
      // Method 1: Try wallet_sendCalls (EIP-5792)
      try {
        const calls = [{
          to: localWalletAddress,
          data: calldata,
          value: '0x0'
        }];
        
        const batchResult = await provider.request({
          method: 'wallet_sendCalls',
          params: [{
            version: '1.0',
            chainId: `0x${chainId.toString(16)}`,
            from: walletAddress,
            calls
          }]
        });
        
        console.log('✅ Ambire batch transaction sent:', batchResult);
        
        // Extract actual transaction hash from Ambire's response
        let txHash = batchResult;
        if (typeof batchResult === 'string' && batchResult.startsWith('Transaction:')) {
          txHash = batchResult.replace('Transaction:', '');
        }
        
        if (!txHash || typeof txHash !== 'string' || !txHash.startsWith('0x')) {
          throw new Error(`Invalid transaction hash received from Ambire: ${JSON.stringify(batchResult)}`);
        }
        
        console.log('🎯 Final transaction hash:', txHash);
        
        // Verify identity creation and get actual commitment
        const { commitment, actualAddress } = await this.verifyIdentityCreation(txHash, walletAddress);
        
        return {
          txHash,
          buyerCommitment: commitment,
          walletAddress: actualAddress
        };
        
      } catch (batchError) {
        console.log('📋 Batch method failed, trying direct transaction...');
        
        // Method 2: Regular transaction (Ambire will handle EIP-7702 internally)
        const tx = await this.signer!.sendTransaction({
          to: localWalletAddress,
          data: calldata,
          gasLimit: SYSTEM_CONSTANTS.GAS_LIMITS.DELEGATE_WALLET
        });
        
        console.log('✅ Ambire direct transaction sent:', tx.hash);
        
        // Verify identity creation and get actual commitment
        const { commitment, actualAddress } = await this.verifyIdentityCreation(tx.hash, walletAddress);
        
        return {
          txHash: tx.hash,
          buyerCommitment: commitment,
          walletAddress: actualAddress
        };
      }
      
    } catch (error) {
      console.error('❌ Ambire EIP-7702 delegation error:', error);
      throw new Error(`Ambire EIP-7702 delegation failed: ${error.message}`);
    }
  }

  // Smart EOA delegation with proper wallet detection
  async delegateSmartEOA(name: string, phone: string, age: number): Promise<{
    txHash: string;
    buyerCommitment: string;
    walletAddress: string;
  }> {
    if (!this.localWalletContract || !this.signer || !this.provider) {
      throw new Error(ERROR_MESSAGES.CONTRACTS_NOT_INITIALIZED);
    }

    const walletAddress = await this.signer.getAddress();
    
    // Check if identity is already initialized
    try {
      const isAlreadyInitialized = await this.localWalletContract.isInitialized();
      if (isAlreadyInitialized) {
        console.log('✅ Identity already initialized, getting existing commitment...');
        const commitment = await this.getBuyerCommitment();
        return {
          txHash: 'already_initialized',
          buyerCommitment: commitment,
          walletAddress
        };
      }
    } catch (error) {
      console.log('🔄 Identity not initialized yet, proceeding with delegation...');
    }
    
    // Try different approaches in order of preference
    try {
      // 1. Try Ambire native EIP-7702
      if (await this.checkAmbireEIP7702Support()) {
        console.log('🎯 Using Ambire native EIP-7702...');
        return await this.delegateWithAmbireEIP7702(name, phone, age, walletAddress);
      }
      
      // 2. Try Viem EIP-7702 (only for embedded wallets)
      if (this.isEIP7702Supported && this.viemWalletClient && await this.isEmbeddedWallet()) {
        console.log('🎯 Attempting Viem EIP-7702...');
        try {
          return await this.delegateWithViemEIP7702(name, phone, age, walletAddress);
        } catch (viemError) {
          console.log('📋 Viem EIP-7702 failed (expected for browser wallets):', viemError.message);
        }
      }
      
      // 3. Fallback to direct contract call
      console.log('🎯 Using fallback direct contract call...');
      return await this.delegateWithFallback(name, phone, age, walletAddress);
      
    } catch (error) {
      console.error('❌ All delegation methods failed:', error);
      throw new Error(`Smart EOA delegation failed: ${error.message}`);
    }
  }

  // Viem EIP-7702 method for embedded wallets only
  private async delegateWithViemEIP7702(
    name: string, 
    phone: string, 
    age: number, 
    walletAddress: string
  ): Promise<{ txHash: string; buyerCommitment: string; walletAddress: string }> {
    try {
      const network = await this.provider!.getNetwork();
      const chainId = Number(network.chainId);
      const localWalletAddress = await this.localWalletContract!.getAddress();

      // Get connected accounts from Viem client
      const accounts = await this.viemWalletClient.getAddresses();
      const account = accounts[0]; // Use first connected account

      if (!account) {
        throw new Error('No account connected to Viem client');
      }

      // Get current nonce for authorization
      const nonce = await this.provider!.getTransactionCount(account);

      console.log('🔍 EIP-7702 Authorization Details:', {
        chainId,
        contractAddress: localWalletAddress,
        nonce,
        account,
        walletAddress
      });

      // Sign authorization (only works with embedded wallets, not browser wallets)
      const authorization = await this.viemWalletClient.signAuthorization({
        account: walletAddress as `0x${string}`,
        contractAddress: localWalletAddress as `0x${string}`,
        chainId,
        nonce: BigInt(nonce)
      });

      console.log('✅ EIP-7702 Authorization signed:', authorization);

      // Prepare transaction data
      const calldata = this.localWalletContract!.interface.encodeFunctionData(
        'initializeBuyerIdentity',
        [name, phone, age]
      );

      // Send EIP-7702 transaction using Viem with account
      const txHash = await this.viemWalletClient.sendTransaction({
        account,
        to: account,
        data: calldata as `0x${string}`,
        authorizationList: [authorization],
        gas: BigInt(SYSTEM_CONSTANTS.GAS_LIMITS.DELEGATE_WALLET)
      });

      console.log('✅ EIP-7702 transaction sent:', txHash);

      // Wait for confirmation using Viem
      const receipt = await this.viemWalletClient.waitForTransactionReceipt({
        hash: txHash
      });

      console.log('✅ EIP-7702 transaction confirmed:', receipt.transactionHash);

      // Verify identity creation and get actual commitment
      const { commitment } = await this.verifyIdentityCreation(receipt.transactionHash, walletAddress);

      return {
        txHash: receipt.transactionHash,
        buyerCommitment: commitment,
        walletAddress: account
      };

    } catch (error) {
      console.error('❌ EIP-7702 delegation error:', error);
      throw new Error(`EIP-7702 delegation failed: ${error.message}`);
    }
  }

  // Fallback implementation for unsupported networks/providers
  private async delegateWithFallback(
    name: string,
    phone: string,
    age: number,
    walletAddress: string
  ): Promise<{ txHash: string; buyerCommitment: string; walletAddress: string }> {
    try {
      console.log('🔄 Using fallback Smart EOA delegation...');

      // Direct contract call without EIP-7702
      const tx = await this.localWalletContract!.initializeBuyerIdentity(
        name,
        phone,
        age,
        { gasLimit: SYSTEM_CONSTANTS.GAS_LIMITS.DELEGATE_WALLET }
      );

      console.log('✅ Fallback transaction sent:', tx.hash);

      const receipt = await tx.wait();
      
      // Verify identity creation and get actual commitment
      const { commitment } = await this.verifyIdentityCreation(receipt.hash, walletAddress);

      return {
        txHash: receipt.hash,
        buyerCommitment: commitment,
        walletAddress
      };

    } catch (error) {
      console.error('❌ Fallback delegation error:', error);
      throw new Error(`Smart EOA delegation failed: ${error.message}`);
    }
  }

  // Enhanced wallet detection
  async getWalletInfo(): Promise<{
    name: string;
    eip7702Support: 'native' | 'viem' | 'none';
    features: string[];
  }> {
    try {
      const provider = window.ethereum as any;
      
      if (provider?.isAmbire) {
        const hasEIP7702 = await this.checkAmbireEIP7702Support();
        return {
          name: 'Ambire Wallet',
          eip7702Support: hasEIP7702 ? 'native' : 'none',
          features: [
            'Transaction Batching',
            'Gas Abstraction', 
            'Smart Account Features',
            ...(hasEIP7702 ? ['EIP-7702 Native'] : [])
          ]
        };
      }
      
      if (provider?.isMetaMask) {
        return {
          name: 'MetaMask',
          eip7702Support: 'none',
          features: ['Standard EOA']
        };
      }
      
      if (await this.isEmbeddedWallet()) {
        return {
          name: 'Embedded Wallet',
          eip7702Support: this.isEIP7702Supported ? 'viem' : 'none',
          features: [
            'Private Key Control',
            ...(this.isEIP7702Supported ? ['EIP-7702 via Viem'] : [])
          ]
        };
      }
      
      return {
        name: 'Unknown Wallet',
        eip7702Support: 'none',
        features: ['Standard EOA']
      };
      
    } catch (error) {
      return {
        name: 'Unknown',
        eip7702Support: 'none',
        features: []
      };
    }
  }

  // Check if current network supports EIP-7702
  isEIP7702SupportedOnNetwork(): boolean {
    return this.isEIP7702Supported;
  }

  // Get supported networks
  getSupportedNetworks(): Record<number, { name: string; viemChain: Chain }> {
    return this.EIP7702_SUPPORTED_NETWORKS;
  }

  // Check if user's wallet supports EIP-7702
  async checkWalletEIP7702Support(): Promise<{
    supported: boolean;
    reason?: string;
  }> {
    try {
      if (!window.ethereum) {
        return { supported: false, reason: 'No Ethereum provider found' };
      }

      const provider = window.ethereum as any;

      // Check for Ambire native support
      if (provider?.isAmbire) {
        const hasNativeSupport = await this.checkAmbireEIP7702Support();
        if (hasNativeSupport) {
          return { supported: true };
        }
        return { supported: false, reason: 'Ambire wallet found but EIP-7702 support not detected' };
      }

      // Check for embedded wallet support
      if (await this.isEmbeddedWallet()) {
        return { 
          supported: this.isEIP7702Supported, 
          reason: this.isEIP7702Supported ? undefined : 'Network does not support EIP-7702'
        };
      }

      // MetaMask and other browser wallets
      if (provider?.isMetaMask) {
        return {
          supported: false,
          reason: 'MetaMask does not support EIP-7702 yet. Try Ambire Wallet.'
        };
      }

      return {
        supported: false,
        reason: 'Browser wallet does not support EIP-7702. Try Ambire Wallet or embedded wallets.'
      };

    } catch (error) {
      return {
        supported: false,
        reason: `Wallet check failed: ${error.message}`
      };
    }
  }

  // Get buyer commitment with address fallback and proper typing
  async getBuyerCommitment(): Promise<string> {
    if (!this.localWalletContract) {
      throw new Error(ERROR_MESSAGES.CONTRACTS_NOT_INITIALIZED);
    }

    try {
      // First try to get commitment for the current signer
      let commitment = await this.localWalletContract.getBuyerCommitment();
      
      // If that fails and we have a stored identity address, try that
      if (commitment === '0x' || commitment === 0 || commitment === '0x0000000000000000000000000000000000000000000000000000000000000000') {
        if (this.buyerIdentityAddress) {
          console.log('🔄 Trying to get commitment for stored identity address:', this.buyerIdentityAddress);
          
          try {
            // Use call method directly to bypass TypeScript typing issues
            const contractInterface = this.localWalletContract.interface;
            const calldata = contractInterface.encodeFunctionData('getBuyerCommitmentFor', [this.buyerIdentityAddress]);
            
            const result = await this.provider!.call({
              to: await this.localWalletContract.getAddress(),
              data: calldata
            });
            
            if (result && result !== '0x') {
              commitment = contractInterface.decodeFunctionResult('getBuyerCommitmentFor', result)[0];
              console.log('✅ Got commitment via direct call:', commitment);
            }
          } catch (callError) {
            console.log('🔄 Direct call failed, trying alternative approach...');
            
            // Alternative: Use the contract method with explicit casting
            try {
              const contractAny = this.localWalletContract as any;
              if (contractAny.getBuyerCommitmentFor) {
                commitment = await contractAny.getBuyerCommitmentFor(this.buyerIdentityAddress);
                console.log('✅ Got commitment via any cast:', commitment);
              } else {
                throw new Error('getBuyerCommitmentFor method not available');
              }
            } catch (castError) {
              console.error('❌ All methods failed:', castError);
              throw new Error(`Identity was created for address ${this.buyerIdentityAddress}, but we can't access the commitment. Contract may need redeployment.`);
            }
          }
        } else {
          throw new Error('No buyer commitment found and no stored identity address');
        }
      }
      
      if (commitment === '0x' || commitment === 0 || commitment === '0x0000000000000000000000000000000000000000000000000000000000000000') {
        throw new Error('Buyer commitment is empty - identity may not be initialized');
      }
      
      return this.normalizeCommitment(commitment);
    } catch (error) {
      console.error('Error getting buyer commitment:', error);
      throw error;
    }
  }

  async verifyAgeLocally(): Promise<string> {
    if (!this.localWalletContract) {
      throw new Error(ERROR_MESSAGES.CONTRACTS_NOT_INITIALIZED);
    }

    try {
      const ageProof = ethers.toUtf8Bytes('verified_locally_' + Date.now());
      const tx = await this.localWalletContract.verifyAgeLocally(ageProof);
      const receipt = await tx.wait();
      return receipt.hash;
    } catch (error) {
      console.error('Age verification error:', error);
      throw new Error(`Age verification failed: ${error.message}`);
    }
  }

  async isAgeVerificationValid(): Promise<boolean> {
    if (!this.localWalletContract) return false;

    try {
      return await this.localWalletContract.isAgeVerificationValid();
    } catch (error) {
      console.error('Error checking age verification:', error);
      return false;
    }
  }

  async registerPackage(
    packageId: string,
    buyerCommitment: string,
    sellerCommitment: string,
    storeAddress: string,
    itemPrice: string,
    shippingFee: string,
    minAgeRequired: boolean
  ): Promise<string> {
    if (!this.pickupSystemContract) {
      throw new Error(ERROR_MESSAGES.CONTRACTS_NOT_INITIALIZED);
    }

    try {
      // Validate store address
      if (!ethers.isAddress(storeAddress)) {
        throw new Error(`Invalid store address: ${storeAddress}`);
      }

      const packageIdBytes = ethers.id(packageId);
      const itemPriceWei = ethers.parseEther(itemPrice);
      const shippingFeeWei = ethers.parseEther(shippingFee);
      const totalValue = itemPriceWei + shippingFeeWei;

      const buyerCommitmentBigInt = this.safeToBigInt(buyerCommitment);
      const sellerCommitmentBigInt = this.safeToBigInt(sellerCommitment);

      console.log('🔍 Debug registerPackage inputs:', {
        packageId,
        buyerCommitment: buyerCommitment.toString(),
        sellerCommitment: sellerCommitment.toString(),
        buyerCommitmentBigInt: buyerCommitmentBigInt.toString(),
        sellerCommitmentBigInt: sellerCommitmentBigInt.toString(),
        storeAddress
      });

      const tx = await this.pickupSystemContract.registerPackage(
        packageIdBytes,
        buyerCommitmentBigInt,
        sellerCommitmentBigInt,
        storeAddress,
        itemPriceWei,
        shippingFeeWei,
        minAgeRequired ? 18 : 0,
        {
          value: totalValue,
          gasLimit: SYSTEM_CONSTANTS.GAS_LIMITS.REGISTER_PACKAGE
        }
      );

      const receipt = await tx.wait();
      return receipt.hash;
    } catch (error) {
      console.error('Package registration error:', error);
      console.error('Error details:', {
        buyerCommitment,
        sellerCommitment,
        storeAddress,
        error: error.message
      });
      throw new Error(`Package registration failed: ${error.message}`);
    }
  }

  async generateStoreCommitment(packageId: string): Promise<{
    storeCommitment: string;
    txHash: string;
  }> {
    if (!this.pickupSystemContract) {
      throw new Error(ERROR_MESSAGES.CONTRACTS_NOT_INITIALIZED);
    }

    try {
      const packageIdBytes = ethers.id(packageId);
      const tx = await this.pickupSystemContract.generateStoreCommitment(
        packageIdBytes,
        { gasLimit: SYSTEM_CONSTANTS.GAS_LIMITS.GENERATE_COMMITMENT }
      );
      const receipt = await tx.wait();

      // Find the StoreCommitmentGenerated event
      const eventSignature = 'StoreCommitmentGenerated(bytes32,uint256,address)';
      const eventTopic = ethers.id(eventSignature);

      const storeCommitmentEvent = receipt.logs.find(
        (log: any) => log.topics[0] === eventTopic
      );

      if (!storeCommitmentEvent) {
        throw new Error('Store commitment event not found');
      }

      const storeCommitment = this.normalizeCommitment(storeCommitmentEvent.topics[2]);

      return {
        storeCommitment,
        txHash: receipt.hash
      };
    } catch (error) {
      console.error('Store commitment generation error:', error);
      throw new Error(`Store commitment generation failed: ${error.message}`);
    }
  }

  async submitPickupProof(
    packageId: string,
    proof: ZKProofResult
  ): Promise<string> {
    if (!this.pickupSystemContract) {
      throw new Error(ERROR_MESSAGES.CONTRACTS_NOT_INITIALIZED);
    }

    try {
      const packageIdBytes = ethers.id(packageId);

      // Ensure proof components are properly formatted
      const formattedProof = {
        pi_a: proof.proof.pi_a.map(x => this.safeToBigInt(x).toString()),
        pi_b: proof.proof.pi_b.map(row => row.map(x => this.safeToBigInt(x).toString())),
        pi_c: proof.proof.pi_c.map(x => this.safeToBigInt(x).toString())
      };

      const formattedPublicSignals = proof.publicSignals.map(x => this.safeToBigInt(x).toString());

      const tx = await this.pickupSystemContract.pickupPackage(
        packageIdBytes,
        formattedProof.pi_a,
        formattedProof.pi_b,
        formattedProof.pi_c,
        formattedPublicSignals,
        { gasLimit: SYSTEM_CONSTANTS.GAS_LIMITS.PICKUP_PACKAGE }
      );

      const receipt = await tx.wait();
      return receipt.hash;
    } catch (error) {
      console.error('Pickup proof submission error:', error);
      throw new Error(`Pickup proof submission failed: ${error.message}`);
    }
  }

  // Debug contract connectivity and method availability
  async debugContractMethods(): Promise<{
    contractAddress: string;
    availableMethods: string[];
    missingMethods: string[];
    testResults: Record<string, boolean>;
  }> {
    if (!this.localWalletContract) {
      throw new Error('Contract not initialized');
    }

    const contractAddress = await this.localWalletContract.getAddress();
    const expectedMethods = [
      'getBuyerCommitment',
      'getBuyerCommitmentFor',
      'isInitialized',
      'isInitializedFor',
      'getBuyerIdentitySummary',
      'initializeBuyerIdentity',
      'verifyAgeLocally',
      'verifyAgeLocallyFor'
    ];

    const availableMethods: string[] = [];
    const missingMethods: string[] = [];
    const testResults: Record<string, boolean> = {};

    const contractAny = this.localWalletContract as any;

    for (const method of expectedMethods) {
      const isAvailable = typeof contractAny[method] === 'function';
      testResults[method] = isAvailable;
      
      if (isAvailable) {
        availableMethods.push(method);
      } else {
        missingMethods.push(method);
      }
    }

    console.log('🔍 Contract Debug Results:', {
      contractAddress,
      availableMethods,
      missingMethods,
      testResults
    });

    return {
      contractAddress,
      availableMethods,
      missingMethods,
      testResults
    };
  }

  // Test specific contract method
  async testContractMethod(methodName: string, ...args: any[]): Promise<any> {
    if (!this.localWalletContract) {
      throw new Error('Contract not initialized');
    }

    try {
      const contractAny = this.localWalletContract as any;
      if (typeof contractAny[methodName] === 'function') {
        const result = await contractAny[methodName](...args);
        console.log(`✅ Method ${methodName} executed successfully:`, result);
        return result;
      } else {
        throw new Error(`Method ${methodName} not found on contract`);
      }
    } catch (error) {
      console.error(`❌ Method ${methodName} failed:`, error);
      throw error;
    }
  }

  async getPackageDetails(packageId: string): Promise<PackageDetails> {
    if (!this.pickupSystemContract) {
      throw new Error(ERROR_MESSAGES.CONTRACTS_NOT_INITIALIZED);
    }

    try {
      const packageIdBytes = ethers.id(packageId);
      const details = await this.pickupSystemContract.getPackageDetails(packageIdBytes);

      return {
        packageId: details[0],
        buyerCommitment: details[1],
        sellerCommitment: details[2],
        storeAddress: details[3],
        itemPrice: details[4],
        shippingFee: details[5],
        minAgeRequired: details[6],
        isPickedUp: details[7],
        registeredAt: details[8]
      };
    } catch (error) {
      console.error('Error getting package details:', error);
      throw error;
    }
  }
}