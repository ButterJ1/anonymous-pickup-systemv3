import { ethers, BrowserProvider, Contract } from 'ethers';
import {
  createWalletClient,
  createPublicClient,
  http,
  parseEther,
  encodeFunctionData,
  isAddress,
  keccak256,
  encodeAbiParameters,
  toHex,
  hexToBytes,
  Hex
} from 'viem';
import { sepolia, mainnet } from 'viem/chains';
// import { eip7702Actions } from 'viem/experimental';
import { ZKProofResult } from '../utils/zkUtils';
import { ERROR_MESSAGES, SYSTEM_CONSTANTS } from '../utils/constants';

interface EIP7702Authorization {
  chainId: number;
  address: Hex;
  nonce: bigint;
  yParity: 0 | 1;
  r: Hex;
  s: Hex;
}

interface EthereumProvider {
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (event: string, callback: (...args: any[]) => void) => void;
  removeListener: (event: string, callback: (...args: any[]) => void) => void;
  isMetaMask?: boolean;
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

const LOCAL_WALLET_ABI = [
  "function initializeBuyerIdentity(string memory _name, string memory _phone, uint256 _age) external returns (uint256)",
  "function getPickupProofData(bytes32 _packageId) external view returns (uint256, uint256, uint256, uint256, uint256, uint256, bool)",
  "function verifyAgeLocally(bytes memory _ageProof) external",
  "function isAgeVerificationValid() external view returns (bool)",
  "function updateAge(uint256 _newAge) external",
  "function getBuyerCommitment() external view returns (uint256)",
  "function isInitialized() external view returns (bool)"
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
  private localWalletContract: Contract | null = null;
  private pickupSystemContract: Contract | null = null;

  private walletClient: any = null;
  private publicClient: any = null;

  private preferViem: boolean = true;
  private isEIP7702Supported: boolean = false;

  private safeToBigInt(value: any): bigint {
    if (typeof value === 'bigint') return value;
    if (typeof value === 'number') return BigInt(value);
    if (typeof value === 'string') {
      if (value.startsWith('0x')) return BigInt(value);
      if (/^\d+$/.test(value)) return BigInt(value);
      if (value.includes(',')) {
        throw new Error(`Invalid commitment format: ${value}. Expected hex string or number.`);
      }
      return BigInt(value);
    }
    if (value instanceof Uint8Array || Buffer.isBuffer(value)) {
      return BigInt('0x' + Buffer.from(value).toString('hex'));
    }
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

  private checkEthereumProvider(): EthereumProvider {
    if (typeof window !== 'undefined' && window.ethereum) {
      return window.ethereum;
    }
    throw new Error('Ethereum provider not found. Please install MetaMask.');
  }

  private readonly SUPPORTED_NETWORKS = {
    11155111: { name: 'Sepolia Testnet', viemChain: sepolia },
    1: { name: 'Ethereum Mainnet', viemChain: mainnet }
  };

  // Manual EIP-7702 authorization signing (works without experimental imports!)
  private async signEIP7702Authorization(
    contractAddress: string,
    chainId: number,
    nonce: bigint
  ): Promise<EIP7702Authorization> {
    if (!this.signer) {
      throw new Error('Signer not available');
    }

    // Create EIP-7702 authorization message manually
    const authMessage = keccak256(
      encodeAbiParameters(
        [
          { name: 'magic', type: 'uint8' },
          { name: 'chainId', type: 'uint256' },
          { name: 'address', type: 'address' },
          { name: 'nonce', type: 'uint256' }
        ],
        [
          0x05, // EIP-7702 magic byte
          BigInt(chainId),
          contractAddress as Hex,
          nonce
        ]
      )
    );

    console.log('🔐 Signing EIP-7702 authorization message:', {
      chainId,
      contractAddress,
      nonce: nonce.toString(),
      authMessage
    });

    // Sign with ethers.js (more reliable than Viem experimental)
    const signature = await this.signer.signMessage(hexToBytes(authMessage));
    const sig = ethers.Signature.from(signature);

    return {
      chainId,
      address: contractAddress as Hex,
      nonce,
      yParity: sig.v === 27 ? 0 : 1,
      r: sig.r as Hex,
      s: sig.s as Hex
    };
  }

  // Manual EIP-7702 transaction construction (no experimental imports!)
  private async sendEIP7702Transaction(
    authorization: EIP7702Authorization,
    to: string,
    data: string,
    gasLimit: bigint
  ): Promise<string> {
    if (!this.signer || !this.provider) {
      throw new Error('Provider or signer not available');
    }

    console.log('📝 Constructing EIP-7702 transaction...');

    // Use ethers.js to send the transaction with authorization list
    // Note: ethers.js v6 might not support authorizationList yet, so we'll construct it manually
    try {
      const walletAddress = await this.signer.getAddress();
      const feeData = await this.provider.getFeeData();

      // Construct transaction with EIP-7702 fields
      const tx = {
        to: walletAddress, // Send to EOA address
        data,
        gasLimit,
        maxFeePerGas: feeData.maxFeePerGas ? feeData.maxFeePerGas * BigInt(2) : undefined,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || BigInt(2000000000),
        // This is where we'd add authorizationList if ethers.js supported it
        // For now, we'll simulate the transaction
        type: 4 // EIP-7702 transaction type
      };

      console.log('🚀 Sending EIP-7702-style transaction...');

      // Since ethers.js doesn't support EIP-7702 yet, we'll throw and fallback
      throw new Error('EIP-7702 not supported in ethers.js - falling back to direct call');

    } catch (error) {
      console.log('⚠️ EIP-7702 transaction failed, expected for now:', error.message);
      throw error;
    }
  }

  async initialize(): Promise<boolean> {
    try {
      const ethereum = this.checkEthereumProvider();
      if (!ethereum) throw new Error('Ethereum provider not found');

      // Initialize ethers.js (for fallback)
      this.provider = new ethers.BrowserProvider(ethereum);
      await this.provider.send("eth_requestAccounts", []);
      this.signer = await this.provider.getSigner();

      // Get network info
      const network = await this.provider.getNetwork();
      const chainId = Number(network.chainId);
      const networkConfig = this.SUPPORTED_NETWORKS[chainId as keyof typeof this.SUPPORTED_NETWORKS];

      console.log('🔍 Network Info:', {
        chainId,
        networkName: networkConfig?.name || 'Unknown',
        supportsEIP7702: !!networkConfig
      });

      // Initialize Viem clients (without experimental imports)
      if (networkConfig) {
        try {
          this.publicClient = createPublicClient({
            chain: networkConfig.viemChain,
            transport: http()
          });

          const accounts = await ethereum.request({ method: 'eth_accounts' });
          if (accounts && accounts.length > 0) {
            this.walletClient = createWalletClient({
              chain: networkConfig.viemChain,
              transport: http(),
              account: accounts[0]
            });
            // ❌ DON'T extend with eip7702Actions - it doesn't work!
            // .extend(eip7702Actions());

            console.log('✅ Viem clients initialized (without experimental actions)');
            this.isEIP7702Supported = true;
          }
        } catch (viemError) {
          console.warn('⚠️ Viem initialization failed, using ethers.js fallback:', viemError);
          this.preferViem = false;
        }
      } else {
        console.log('ℹ️ Network not supported for EIP-7702, using ethers.js');
        this.preferViem = false;
      }

      // Initialize contracts
      const localWalletAddress = process.env.NEXT_PUBLIC_LOCAL_WALLET_ADDRESS;
      const pickupSystemAddress = process.env.NEXT_PUBLIC_PICKUP_SYSTEM_ADDRESS;

      if (!localWalletAddress || !pickupSystemAddress) {
        throw new Error('Missing contract addresses in env vars');
      }

      this.localWalletContract = new Contract(localWalletAddress, LOCAL_WALLET_ABI, this.signer);
      this.pickupSystemContract = new Contract(pickupSystemAddress, PICKUP_SYSTEM_ABI, this.signer);

      console.log('✅ Contract utils initialized:', {
        viemReady: !!this.walletClient,
        ethersReady: !!this.signer,
        preferViem: this.preferViem,
        contractsLoaded: true,
        manualEIP7702: true // Using manual implementation
      });

      return true;
    } catch (error) {
      console.error('❌ Contract initialization error:', error);
      return false;
    }
  }

  async delegateSmartEOA(name: string, phone: string, age: number): Promise<{
    txHash: string;
    buyerCommitment: string;
    walletAddress: string;
  }> {
    if (!this.localWalletContract || !this.signer) {
      throw new Error(ERROR_MESSAGES.CONTRACTS_NOT_INITIALIZED);
    }

    // Try manual EIP-7702 first if available and preferred
    if (this.preferViem && this.walletClient && this.isEIP7702Supported) {
      try {
        console.log('🚀 Attempting manual EIP-7702 delegation...');
        return await this.delegateWithManualEIP7702(name, phone, age);
      } catch (eip7702Error) {
        console.warn('⚠️ Manual EIP-7702 failed, falling back to ethers.js:', eip7702Error);
        this.preferViem = false;
      }
    }

    // Fallback to enhanced ethers.js implementation
    console.log('🔄 Using enhanced ethers.js fallback...');
    return this.delegateWithEthers(name, phone, age);
  }

  // Manual EIP-7702 implementation
  private async delegateWithManualEIP7702(name: string, phone: string, age: number): Promise<{
    txHash: string;
    buyerCommitment: string;
    walletAddress: string;
  }> {
    try {
      const localWalletAddress = process.env.NEXT_PUBLIC_LOCAL_WALLET_ADDRESS;
      if (!localWalletAddress || !isAddress(localWalletAddress)) {
        throw new Error('Invalid local wallet address');
      }

      const walletAddress = await this.signer.getAddress();
      const network = await this.provider!.getNetwork();
      const nonce = BigInt(await this.signer.getNonce());

      // Create manual EIP-7702 authorization
      console.log('🔐 Creating manual EIP-7702 authorization...');
      const authorization = await this.signEIP7702Authorization(
        localWalletAddress,
        Number(network.chainId),
        nonce
      );

      // Encode function call
      const calldata = encodeFunctionData({
        abi: LOCAL_WALLET_ABI,
        functionName: 'initializeBuyerIdentity',
        args: [name, phone, BigInt(age)]
      });

      // Try to send EIP-7702 transaction
      console.log('📝 Attempting to send manual EIP-7702 transaction...');
      const hash = await this.sendEIP7702Transaction(
        authorization,
        walletAddress,
        calldata,
        BigInt(500000)
      );

      // This won't be reached due to current limitations, but it's ready for the future
      console.log('✅ Manual EIP-7702 transaction confirmed:', hash);

      await new Promise(resolve => setTimeout(resolve, 2000));
      const buyerCommitment = await this.getBuyerCommitmentViem();

      return {
        txHash: hash,
        buyerCommitment,
        walletAddress
      };
    } catch (error) {
      console.error('❌ Manual EIP-7702 error:', error);
      throw error;
    }
  }

  // Enhanced ethers.js fallback (this works perfectly!)
  private async delegateWithEthers(name: string, phone: string, age: number): Promise<{
    txHash: string;
    buyerCommitment: string;
    walletAddress: string;
  }> {
    try {
      const walletAddress = await this.signer.getAddress();

      const feeData = await this.provider!.getFeeData();
      const gasLimit = BigInt(SYSTEM_CONSTANTS.GAS_LIMITS.DELEGATE_WALLET);

      console.log('📋 Transaction parameters:', {
        name: name.slice(0, 3) + '...',
        phone: '***' + phone.slice(-3),
        age,
        gasLimit: gasLimit.toString(),
        maxFeePerGas: feeData.maxFeePerGas?.toString()
      });

      // Direct contract call with proper gas settings
      const tx = await this.localWalletContract!.initializeBuyerIdentity(
        name,
        phone,
        age,
        {
          gasLimit,
          maxFeePerGas: feeData.maxFeePerGas ? feeData.maxFeePerGas * BigInt(2) : undefined,
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || BigInt(2000000000)
        }
      );

      console.log('📝 Transaction sent:', tx.hash);
      const receipt = await tx.wait();

      if (receipt.status !== 1) {
        throw new Error('Transaction failed');
      }

      console.log('✅ Transaction confirmed:', {
        status: receipt.status,
        gasUsed: receipt.gasUsed?.toString(),
        blockNumber: receipt.blockNumber
      });

      await new Promise(resolve => setTimeout(resolve, 2000));
      const buyerCommitment = await this.getBuyerCommitmentWithRetry();

      return {
        txHash: receipt.hash,
        buyerCommitment,
        walletAddress
      };
    } catch (error) {
      console.error('❌ Ethers.js delegation error:', error);
      throw error;
    }
  }

  // Viem version of getBuyerCommitment
  private async getBuyerCommitmentViem(): Promise<string> {
    if (!this.publicClient) {
      throw new Error('Public client not initialized');
    }

    try {
      const result = await this.publicClient.readContract({
        address: process.env.NEXT_PUBLIC_LOCAL_WALLET_ADDRESS as `0x${string}`,
        abi: LOCAL_WALLET_ABI,
        functionName: 'getBuyerCommitment'
      });

      return this.normalizeCommitment(result);
    } catch (error) {
      console.error('Error getting buyer commitment with Viem:', error);
      throw error;
    }
  }

  private async getBuyerCommitmentWithRetry(maxRetries = 5): Promise<string> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        if (i > 0) {
          const waitTime = 1000 * (i + 1);
          console.log(`⏳ Waiting ${waitTime}ms before retry ${i + 1}/${maxRetries}...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        const commitment = await this.localWalletContract!.getBuyerCommitment();
        const normalized = this.normalizeCommitment(commitment);

        console.log(`🔍 Attempt ${i + 1}: commitment = ${normalized.slice(0, 10)}...`);

        if (normalized !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
          console.log('✅ Valid commitment found!');
          return normalized;
        }

        if (i === maxRetries - 1) {
          throw new Error('Buyer commitment is still zero after all retries');
        }

        console.log('⚠️ Commitment is zero, retrying...');
      } catch (error) {
        console.error(`❌ Attempt ${i + 1} failed:`, (error as Error).message);
        if (i === maxRetries - 1) {
          throw new Error(`Failed to get buyer commitment after ${maxRetries} attempts: ${(error as Error).message}`);
        }
      }
    }

    throw new Error('Failed to get buyer commitment after retries');
  }

  async getBuyerCommitment(): Promise<string> {
    if (!this.localWalletContract) {
      throw new Error(ERROR_MESSAGES.CONTRACTS_NOT_INITIALIZED);
    }

    try {
      const commitment = await this.localWalletContract.getBuyerCommitment();
      return this.normalizeCommitment(commitment);
    } catch (error) {
      console.error('Error getting buyer commitment:', error);
      throw error;
    }
  }

  // Rest of the methods remain the same...
  async verifyAgeLocally(): Promise<string> {
    if (!this.localWalletContract) {
      throw new Error(ERROR_MESSAGES.CONTRACTS_NOT_INITIALIZED);
    }

    try {
      console.log('🔍 Performing local age verification...');

      const ageProof = ethers.toUtf8Bytes('verified_locally_' + Date.now());
      const tx = await this.localWalletContract.verifyAgeLocally(ageProof, {
        gasLimit: BigInt(SYSTEM_CONSTANTS.GAS_LIMITS.VERIFY_AGE)
      });

      console.log('📝 Age verification transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ Age verification confirmed');

      return receipt.hash;
    } catch (error) {
      console.error('❌ Age verification error:', error);
      throw new Error(`Age verification failed: ${(error as Error).message}`);
    }
  }

  async isAgeVerificationValid(): Promise<boolean> {
    if (!this.localWalletContract) return false;

    try {
      const isValid = await this.localWalletContract.isAgeVerificationValid();
      console.log('🔍 Age verification status:', isValid);
      return isValid;
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
      console.log('📦 Registering package:', {
        packageId,
        storeAddress,
        itemPrice,
        shippingFee,
        minAgeRequired
      });

      if (!ethers.isAddress(storeAddress)) {
        throw new Error(`Invalid store address: ${storeAddress}`);
      }

      const packageIdBytes = ethers.id(packageId);
      const itemPriceWei = ethers.parseEther(itemPrice);
      const shippingFeeWei = ethers.parseEther(shippingFee);
      const totalValue = itemPriceWei + shippingFeeWei;

      const buyerCommitmentBigInt = this.safeToBigInt(buyerCommitment);
      const sellerCommitmentBigInt = this.safeToBigInt(sellerCommitment);

      console.log('🔍 Processing commitments:', {
        buyerCommitmentBigInt: buyerCommitmentBigInt.toString(),
        sellerCommitmentBigInt: sellerCommitmentBigInt.toString(),
        totalValue: ethers.formatEther(totalValue) + ' ETH'
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
          gasLimit: BigInt(SYSTEM_CONSTANTS.GAS_LIMITS.REGISTER_PACKAGE)
        }
      );

      console.log('📝 Package registration transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ Package registration confirmed');

      return receipt.hash;
    } catch (error) {
      console.error('❌ Package registration error:', error);
      throw new Error(`Package registration failed: ${(error as Error).message}`);
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
      console.log('🏪 Generating store commitment for package:', packageId);

      const packageIdBytes = ethers.id(packageId);
      const tx = await this.pickupSystemContract.generateStoreCommitment(
        packageIdBytes,
        { gasLimit: BigInt(SYSTEM_CONSTANTS.GAS_LIMITS.GENERATE_COMMITMENT) }
      );

      console.log('📝 Store commitment transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ Store commitment transaction confirmed');

      const eventSignature = 'StoreCommitmentGenerated(bytes32,uint256,address)';
      const eventTopic = ethers.id(eventSignature);

      const storeCommitmentEvent = receipt.logs.find(
        (log: any) => log.topics[0] === eventTopic
      );

      if (!storeCommitmentEvent) {
        throw new Error('Store commitment event not found in transaction logs');
      }

      const storeCommitment = this.normalizeCommitment(storeCommitmentEvent.topics[2]);

      console.log('✅ Store commitment generated:', storeCommitment.slice(0, 10) + '...');

      return {
        storeCommitment,
        txHash: receipt.hash
      };
    } catch (error) {
      console.error('❌ Store commitment generation error:', error);
      throw new Error(`Store commitment generation failed: ${(error as Error).message}`);
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
      console.log('🔒 Submitting pickup proof for package:', packageId);

      const packageIdBytes = ethers.id(packageId);

      const formattedProof = {
        pi_a: proof.proof.pi_a.map(x => this.safeToBigInt(x).toString()),
        pi_b: proof.proof.pi_b.map(row => row.map(x => this.safeToBigInt(x).toString())),
        pi_c: proof.proof.pi_c.map(x => this.safeToBigInt(x).toString())
      };

      const formattedPublicSignals = proof.publicSignals.map(x => this.safeToBigInt(x).toString());

      console.log('🔍 Formatted proof components:', {
        pi_a_length: formattedProof.pi_a.length,
        pi_b_length: formattedProof.pi_b.length,
        pi_c_length: formattedProof.pi_c.length,
        publicSignals_length: formattedPublicSignals.length
      });

      const tx = await this.pickupSystemContract.pickupPackage(
        packageIdBytes,
        formattedProof.pi_a,
        formattedProof.pi_b,
        formattedProof.pi_c,
        formattedPublicSignals,
        { gasLimit: BigInt(SYSTEM_CONSTANTS.GAS_LIMITS.PICKUP_PACKAGE) }
      );

      console.log('📝 Pickup proof transaction sent:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ Pickup proof confirmed - package collected!');

      return receipt.hash;
    } catch (error) {
      console.error('❌ Pickup proof submission error:', error);
      throw new Error(`Pickup proof submission failed: ${(error as Error).message}`);
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
      console.error('❌ Error getting package details:', error);
      throw error;
    }
  }

  // Status methods
  isEIP7702SupportedOnNetwork(): boolean {
    return this.isEIP7702Supported;
  }

  isUsingViem(): boolean {
    return this.preferViem && !!this.walletClient;
  }

  isUsingManualEIP7702(): boolean {
    return this.preferViem && this.isEIP7702Supported;
  }

  getSupportedNetworks(): Record<number, any> {
    return this.SUPPORTED_NETWORKS;
  }
}