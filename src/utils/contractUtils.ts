import { ethers, BrowserProvider, Contract, Wallet } from 'ethers';
import { ZKProofResult } from './zkUtils';
import { ERROR_MESSAGES, SYSTEM_CONSTANTS } from './constants';

// Type definitions for Ethereum provider
interface EthereumProvider {
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  on: (event: string, callback: (...args: any[]) => void) => void;
  removeListener: (event: string, callback: (...args: any[]) => void) => void;
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
  
  // Check if Ethereum provider is available
  private checkEthereumProvider(): EthereumProvider {
    if (typeof window !== 'undefined' && window.ethereum) {
      return window.ethereum;
    }
    throw new Error('Ethereum provider not found. Please install MetaMask.');
  }
  
  async initialize(): Promise<boolean> {
    try {
      const ethereum = this.checkEthereumProvider();
      
      this.provider = new ethers.BrowserProvider(ethereum);
      await this.provider.send("eth_requestAccounts", []);
      this.signer = await this.provider.getSigner();
      
      const localWalletAddress = process.env.NEXT_PUBLIC_LOCAL_WALLET_ADDRESS;
      const pickupSystemAddress = process.env.NEXT_PUBLIC_PICKUP_SYSTEM_ADDRESS;
      
      if (!localWalletAddress || !pickupSystemAddress) {
        throw new Error('Contract addresses not found in environment variables');
      }
      
      this.localWalletContract = new Contract(localWalletAddress, LOCAL_WALLET_ABI, this.signer);
      this.pickupSystemContract = new Contract(pickupSystemAddress, PICKUP_SYSTEM_ABI, this.signer);
      
      return true;
    } catch (error) {
      console.error('Contract initialization error:', error);
      return false;
    }
  }
  
  async delegateSmartEOA(name: string, phone: string, age: number): Promise<{
    txHash: string;
    buyerCommitment: string;
    walletAddress: string;
  }> {
    if (!this.localWalletContract || !this.signer || !this.provider) {
      throw new Error(ERROR_MESSAGES.CONTRACTS_NOT_INITIALIZED);
    }
    
    try {
      // Get wallet address
      const walletAddress = await this.signer.getAddress();
      const localWalletAddress = await this.localWalletContract.getAddress();
      
      // Create the authorization for EIP-7702
      const network = await this.provider.getNetwork();
      const nonce = await this.signer.getNonce();
      
      const authorization = {
        chainId: network.chainId,
        address: localWalletAddress,
        nonce: nonce,
      };
      
      // Sign the authorization
      const authData = ethers.solidityPackedKeccak256(
        ['uint256', 'address', 'uint256', 'uint256'],
        [0x05, authorization.chainId, authorization.address, authorization.nonce]
      );
      
      const authSignature = await this.signer.signMessage(ethers.getBytes(authData));
      const { v, r, s } = ethers.Signature.from(authSignature);
      
      // Create the transaction data
      const calldata = this.localWalletContract.interface.encodeFunctionData(
        'initializeBuyerIdentity', 
        [name, phone, age]
      );
      
      // Send EIP-7702 transaction
      const tx = await this.signer.sendTransaction({
        to: walletAddress,
        data: calldata,
        gasLimit: SYSTEM_CONSTANTS.GAS_LIMITS.DELEGATE_WALLET,
        authorizationList: [{
          chainId: authorization.chainId,
          address: authorization.address, 
          nonce: authorization.nonce,
          yParity: v,
          r: r,
          s: s
        }]
      });
      
      const receipt = await tx.wait();
      
      // Get the buyer commitment
      const buyerCommitment = await this.getBuyerCommitment();
      
      return {
        txHash: receipt.hash,
        buyerCommitment,
        walletAddress
      };
    } catch (error) {
      console.error('EIP-7702 delegation error:', error);
      throw new Error(`Smart EOA delegation failed: ${error.message}`);
    }
  }
  
  async getBuyerCommitment(): Promise<string> {
    if (!this.localWalletContract) {
      throw new Error(ERROR_MESSAGES.CONTRACTS_NOT_INITIALIZED);
    }
    
    try {
      const commitment = await this.localWalletContract.getBuyerCommitment();
      return '0x' + commitment.toString(16).padStart(64, '0');
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
      const packageIdBytes = ethers.id(packageId);
      const itemPriceWei = ethers.parseEther(itemPrice);
      const shippingFeeWei = ethers.parseEther(shippingFee);
      const totalValue = itemPriceWei + shippingFeeWei;
      
      const tx = await this.pickupSystemContract.registerPackage(
        packageIdBytes,
        BigInt(buyerCommitment),
        BigInt(sellerCommitment),
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
      
      const storeCommitment = '0x' + BigInt(storeCommitmentEvent.topics[2]).toString(16).padStart(64, '0');
      
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
      
      const tx = await this.pickupSystemContract.pickupPackage(
        packageIdBytes,
        proof.proof.pi_a,
        proof.proof.pi_b,
        proof.proof.pi_c,
        proof.publicSignals,
        { gasLimit: SYSTEM_CONSTANTS.GAS_LIMITS.PICKUP_PACKAGE }
      );
      
      const receipt = await tx.wait();
      return receipt.hash;
    } catch (error) {
      console.error('Pickup proof submission error:', error);
      throw new Error(`Pickup proof submission failed: ${error.message}`);
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