import { ethers } from 'ethers';
import { toast } from 'react-toastify';

/**
 * Contract Interaction Utilities
 * Helper functions for smart contract operations
 */

// Contract addresses - update these with deployed addresses
const CONTRACT_ADDRESSES = {
  pickupSystem: process.env.REACT_APP_PICKUP_SYSTEM_ADDRESS || '0x5FC8d32690cc91D4c39d9d3abcBD16989F875707',
  localWallet: process.env.REACT_APP_LOCAL_WALLET_ADDRESS || '0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9'
};

// Simplified contract ABIs
const CONTRACT_ABIS = {
  pickupSystem: [
    // Core functions
    "function registerSeller() external",
    "function registerPackage(bytes32 packageId, uint256 buyerCommitment, address store, uint256 itemPrice, uint256 shippingFee, bool needsAgeCheck, bool sellerPaysShipping, uint256 pickupDays) external payable",
    "function executePickup(bytes32 packageId, uint256 nullifier, uint256 ageProof, uint256 commitmentProof) external payable",
    
    // View functions
    "function getPackage(bytes32 packageId) external view returns (bytes32,uint256,address,address,uint256,uint256,uint256,uint256,bool,bool,bool)",
    "function canPickup(bytes32 packageId) external view returns (bool)",
    "function getSellerInfo(address seller) external view returns (bool,uint256,uint256,uint256)",
    "function getStoreInfo(address store) external view returns (bool,string,string,uint256,uint256)",
    
    // Status checks
    "function registeredSellers(address) external view returns (bool)",
    "function authorizedStores(address) external view returns (bool)",
    "function usedNullifiers(uint256) external view returns (bool)",
    
    // Admin functions
    "function authorizeStore(address store) external",
    "function owner() external view returns (address)",
    
    // Events
    "event SellerRegistered(address indexed seller)",
    "event StoreAuthorized(address indexed store)",
    "event PackageRegistered(bytes32 indexed packageId, uint256 buyerCommitment, address indexed seller, address indexed store, bool needsAgeCheck)",
    "event PackagePickedUp(bytes32 indexed packageId, uint256 nullifier, address indexed store)"
  ],
  
  localWallet: [
    // Core functions
    "function initializeWallet(string calldata name, string calldata phone, uint256 age) external",
    "function verifyAgeLocally(uint256 ageProofHash) external",
    "function generateCommitment() external returns (uint256)",
    "function preparePickupProof(bytes32 packageId) external returns (uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256)",
    
    // View functions
    "function getWalletStatus() external view returns (bool,bool,uint256,uint256,bool)",
    "function canPickupAdultItems() external view returns (bool)",
    "function verifyCommitment(uint256 commitment) external view returns (bool)",
    "function isNullifierUsed(uint256 nullifier) external view returns (bool)",
    
    // Utility functions
    "function resetWallet() external",
    
    // Events
    "event WalletInitialized(address indexed buyer, uint256 timestamp)",
    "event AgeVerified(address indexed buyer, bool isAdult)",
    "event CommitmentGenerated(address indexed buyer, uint256 commitment)"
  ]
};

class ContractHelper {
  constructor() {
    this.contracts = {};
    this.provider = null;
    this.signer = null;
  }

  /**
   * Initialize contract helper with provider and signer
   * @param {ethers.providers.Web3Provider} provider 
   * @param {ethers.Signer} signer 
   */
  async initialize(provider, signer) {
    this.provider = provider;
    this.signer = signer;
    
    try {
      // Initialize contract instances
      this.contracts.pickupSystem = new ethers.Contract(
        CONTRACT_ADDRESSES.pickupSystem,
        CONTRACT_ABIS.pickupSystem,
        signer
      );

      this.contracts.localWallet = new ethers.Contract(
        CONTRACT_ADDRESSES.localWallet,
        CONTRACT_ABIS.localWallet,
        signer
      );

      // Test contract connectivity
      await this.testContractConnectivity();
      
      console.log('✅ Contract helper initialized successfully');
      return true;
    } catch (error) {
      console.error('❌ Contract helper initialization failed:', error);
      return false;
    }
  }

  /**
   * Test contract connectivity
   */
  async testContractConnectivity() {
    try {
      // Test PickupSystem contract
      await this.contracts.pickupSystem.owner();
      
      // Test LocalWallet contract  
      const address = await this.signer.getAddress();
      await this.contracts.localWallet.getWalletStatus();
      
      console.log('✅ All contracts are accessible');
    } catch (error) {
      console.warn('⚠️ Some contracts may not be deployed:', error.message);
    }
  }

  /**
   * Execute transaction with error handling and gas estimation
   * @param {Function} contractMethod - Contract method to execute
   * @param {Object} options - Transaction options
   * @returns {Object} Transaction receipt
   */
  async executeTransaction(contractMethod, options = {}) {
    const {
      showPending = true,
      showSuccess = true,
      showError = true,
      estimateGas = true
    } = options;

    try {
      // Estimate gas if requested
      let gasLimit;
      if (estimateGas) {
        try {
          gasLimit = await contractMethod.estimateGas();
          gasLimit = gasLimit.mul(120).div(100); // Add 20% buffer
        } catch (gasError) {
          console.warn('Gas estimation failed, using default:', gasError.message);
          gasLimit = 300000; // Default gas limit
        }
      }

      // Show pending notification
      if (showPending) {
        toast.info('Transaction submitted, waiting for confirmation...');
      }

      // Execute transaction
      const tx = await contractMethod({ gasLimit });
      const receipt = await tx.wait();

      // Show success notification
      if (showSuccess) {
        toast.success('Transaction confirmed successfully!');
      }

      return receipt;

    } catch (error) {
      console.error('Transaction failed:', error);
      
      if (showError) {
        const errorMessage = this.parseErrorMessage(error);
        toast.error(errorMessage);
      }
      
      throw error;
    }
  }

  /**
   * Parse error message for user-friendly display
   * @param {Error} error - Contract error
   * @returns {string} User-friendly error message
   */
  parseErrorMessage(error) {
    if (error.code === 4001) {
      return 'Transaction rejected by user';
    }
    
    if (error.code === -32603) {
      return 'Internal error - please try again';
    }

    if (error.message.includes('revert')) {
      const revertReason = error.message.split('revert ')[1];
      return revertReason || 'Transaction reverted';
    }

    if (error.message.includes('insufficient funds')) {
      return 'Insufficient funds for transaction';
    }

    if (error.message.includes('gas')) {
      return 'Gas estimation failed - please try again';
    }

    return error.message || 'Transaction failed';
  }

  /**
   * Get contract instance
   * @param {string} contractName - Name of contract
   * @returns {ethers.Contract} Contract instance
   */
  getContract(contractName) {
    const contract = this.contracts[contractName];
    if (!contract) {
      throw new Error(`Contract ${contractName} not initialized`);
    }
    return contract;
  }

  /**
   * Convert package ID string to bytes32 hash
   * @param {string} packageId - Package ID string
   * @returns {string} Bytes32 hash
   */
  packageIdToHash(packageId) {
    return ethers.utils.keccak256(ethers.utils.toUtf8Bytes(packageId));
  }

  /**
   * Format address for display
   * @param {string} address - Ethereum address
   * @returns {string} Formatted address
   */
  formatAddress(address) {
    return `${address.substr(0, 6)}...${address.substr(-4)}`;
  }

  /**
   * Format timestamp for display
   * @param {number} timestamp - Unix timestamp
   * @returns {string} Formatted date string
   */
  formatTimestamp(timestamp) {
    return new Date(timestamp * 1000).toLocaleString();
  }

  /**
   * Seller Operations
   */
  seller = {
    /**
     * Register as seller
     */
    register: async () => {
      const contract = this.getContract('pickupSystem');
      return await this.executeTransaction(
        () => contract.registerSeller()
      );
    },

    /**
     * Register a package
     * @param {Object} packageData - Package registration data
     */
    registerPackage: async (packageData) => {
      const contract = this.getContract('pickupSystem');
      const {
        packageId,
        buyerCommitment,
        storeAddress,
        itemPrice,
        shippingFee,
        needsAgeCheck,
        sellerPaysShipping,
        pickupDays
      } = packageData;

      const packageIdHash = this.packageIdToHash(packageId);
      const itemPriceWei = ethers.utils.parseEther(itemPrice.toString());
      const shippingFeeWei = ethers.utils.parseEther(shippingFee.toString());
      const totalValue = sellerPaysShipping ? itemPriceWei.add(shippingFeeWei) : itemPriceWei;

      return await this.executeTransaction(
        () => contract.registerPackage(
          packageIdHash,
          buyerCommitment,
          storeAddress,
          itemPriceWei,
          shippingFeeWei,
          needsAgeCheck,
          sellerPaysShipping,
          pickupDays,
          { value: totalValue }
        )
      );
    },

    /**
     * Check if address is registered seller
     * @param {string} address - Seller address
     */
    isRegistered: async (address) => {
      const contract = this.getContract('pickupSystem');
      return await contract.registeredSellers(address);
    },

    /**
     * Get seller information
     * @param {string} address - Seller address
     */
    getInfo: async (address) => {
      const contract = this.getContract('pickupSystem');
      const info = await contract.getSellerInfo(address);
      return {
        isRegistered: info[0],
        totalPackages: info[1].toNumber(),
        successfulDeliveries: info[2].toNumber(),
        totalRevenue: ethers.utils.formatEther(info[3])
      };
    }
  };

  /**
   * Buyer Operations
   */
  buyer = {
    /**
     * Initialize wallet
     * @param {string} name - Buyer name
     * @param {string} phone - Phone number
     * @param {number} age - Buyer age
     */
    initializeWallet: async (name, phone, age) => {
      const contract = this.getContract('localWallet');
      return await this.executeTransaction(
        () => contract.initializeWallet(name, phone, age)
      );
    },

    /**
     * Verify age locally
     * @param {string} ageProofHash - Age proof hash
     */
    verifyAge: async (ageProofHash) => {
      const contract = this.getContract('localWallet');
      return await this.executeTransaction(
        () => contract.verifyAgeLocally(ageProofHash)
      );
    },

    /**
     * Generate commitment
     */
    generateCommitment: async () => {
      const contract = this.getContract('localWallet');
      return await this.executeTransaction(
        () => contract.generateCommitment()
      );
    },

    /**
     * Prepare pickup proof
     * @param {string} packageId - Package ID
     */
    preparePickupProof: async (packageId) => {
      const contract = this.getContract('localWallet');
      const packageIdHash = this.packageIdToHash(packageId);
      const result = await contract.preparePickupProof(packageIdHash);
      
      return {
        secret: result[0],
        nameHash: result[1],
        phoneLastThree: result[2],
        age: result[3],
        nonce: result[4],
        nullifier: result[5],
        commitment: result[6],
        ageProof: result[7]
      };
    },

    /**
     * Get wallet status
     */
    getStatus: async () => {
      const contract = this.getContract('localWallet');
      const status = await contract.getWalletStatus();
      
      return {
        isInitialized: status[0],
        ageVerified: status[1],
        age: status[2].toNumber(),
        nonce: status[3].toNumber(),
        ageVerificationValid: status[4]
      };
    },

    /**
     * Check if can pickup adult items
     */
    canPickupAdult: async () => {
      const contract = this.getContract('localWallet');
      return await contract.canPickupAdultItems();
    }
  };

  /**
   * Store Operations
   */
  store = {
    /**
     * Execute pickup
     * @param {Object} pickupData - Pickup execution data
     */
    executePickup: async (pickupData) => {
      const contract = this.getContract('pickupSystem');
      const {
        packageId,
        nullifier,
        ageProof = ethers.constants.HashZero,
        commitmentProof,
        shippingFee = 0
      } = pickupData;

      const packageIdHash = this.packageIdToHash(packageId);
      const shippingPayment = ethers.utils.parseEther(shippingFee.toString());

      return await this.executeTransaction(
        () => contract.executePickup(
          packageIdHash,
          nullifier,
          ageProof,
          commitmentProof,
          { value: shippingPayment }
        )
      );
    },

    /**
     * Check if address is authorized store
     * @param {string} address - Store address
     */
    isAuthorized: async (address) => {
      const contract = this.getContract('pickupSystem');
      return await contract.authorizedStores(address);
    },

    /**
     * Get store information
     * @param {string} address - Store address
     */
    getInfo: async (address) => {
      const contract = this.getContract('pickupSystem');
      const info = await contract.getStoreInfo(address);
      return {
        isAuthorized: info[0],
        storeName: info[1],
        location: info[2],
        totalPickups: info[3].toNumber(),
        commissionRate: info[4].toNumber() / 100
      };
    }
  };

  /**
   * Package Operations
   */
  package = {
    /**
     * Get package information
     * @param {string} packageId - Package ID
     */
    getInfo: async (packageId) => {
      const contract = this.getContract('pickupSystem');
      const packageIdHash = this.packageIdToHash(packageId);
      const info = await contract.getPackage(packageIdHash);
      
      return {
        id: info[0],
        buyerCommitment: info[1],
        seller: info[2],
        store: info[3],
        itemPrice: ethers.utils.formatEther(info[4]),
        shippingFee: ethers.utils.formatEther(info[5]),
        createdTime: info[6].toNumber(),
        expiryTime: info[7].toNumber(),
        needsAgeCheck: info[8],
        sellerPaysShipping: info[9],
        isPickedUp: info[10]
      };
    },

    /**
     * Check if package can be picked up
     * @param {string} packageId - Package ID
     */
    canPickup: async (packageId) => {
      const contract = this.getContract('pickupSystem');
      const packageIdHash = this.packageIdToHash(packageId);
      return await contract.canPickup(packageIdHash);
    }
  };
}

// Create singleton instance
const contractHelper = new ContractHelper();

export default contractHelper;