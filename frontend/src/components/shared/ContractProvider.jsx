import React, { createContext, useContext, useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';
import { useWeb3 } from './Web3Provider';

// Contract ABIs
const PICKUP_SYSTEM_ABI = [
  "function registerSeller() external",
  "function registerPackage(bytes32 packageId, uint256 buyerCommitment, address store, uint256 itemPrice, uint256 shippingFee, bool needsAgeCheck, bool sellerPaysShipping, uint256 pickupDays) external payable",
  "function executePickup(bytes32 packageId, uint256 nullifier, uint256 ageProof, uint256 commitmentProof) external payable",
  "function getPackage(bytes32 packageId) external view returns (bytes32,uint256,address,address,uint256,uint256,uint256,uint256,bool,bool,bool)",
  "function canPickup(bytes32 packageId) external view returns (bool)",
  "function getSellerInfo(address seller) external view returns (bool,uint256,uint256,uint256)",
  "function getStoreInfo(address store) external view returns (bool,string,string,uint256,uint256)",
  "function authorizeStore(address store) external",
  "function registeredSellers(address) external view returns (bool)",
  "function authorizedStores(address) external view returns (bool)",
  "function usedNullifiers(uint256) external view returns (bool)",
  "function owner() external view returns (address)",
  
  // Events
  "event SellerRegistered(address indexed seller)",
  "event StoreAuthorized(address indexed store)",
  "event PackageRegistered(bytes32 indexed packageId, uint256 buyerCommitment, address indexed seller, address indexed store, bool needsAgeCheck)",
  "event PackagePickedUp(bytes32 indexed packageId, uint256 nullifier, address indexed store)"
];

const LOCAL_WALLET_ABI = [
  "function initializeWallet(string calldata name, string calldata phone, uint256 age) external",
  "function verifyAgeLocally(uint256 ageProofHash) external",
  "function generateCommitment() external returns (uint256)",
  "function preparePickupProof(bytes32 packageId) external returns (uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256)",
  "function getWalletStatus() external view returns (bool,bool,uint256,uint256,bool)",
  "function canPickupAdultItems() external view returns (bool)",
  "function verifyCommitment(uint256 commitment) external view returns (bool)",
  "function isNullifierUsed(uint256 nullifier) external view returns (bool)",
  "function resetWallet() external",
  
  // Events
  "event WalletInitialized(address indexed buyer, uint256 timestamp)",
  "event AgeVerified(address indexed buyer, bool isAdult)",
  "event CommitmentGenerated(address indexed buyer, uint256 commitment)"
];

// Default contract addresses (update with deployed addresses)
const DEFAULT_CONTRACT_ADDRESSES = {
  pickupSystem: process.env.REACT_APP_PICKUP_SYSTEM_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  localWallet: process.env.REACT_APP_LOCAL_WALLET_ADDRESS || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512'
};

const ContractContext = createContext();

export const useContract = () => {
  const context = useContext(ContractContext);
  if (!context) {
    throw new Error('useContract must be used within ContractProvider');
  }
  return context;
};

const ContractProvider = ({ children }) => {
  const { provider, signer, isConnected, account } = useWeb3();
  
  // Contract instances
  const [pickupSystemContract, setPickupSystemContract] = useState(null);
  const [localWalletContract, setLocalWalletContract] = useState(null);
  
  // Contract addresses
  const [contractAddresses, setContractAddresses] = useState(DEFAULT_CONTRACT_ADDRESSES);
  
  // Loading states
  const [loading, setLoading] = useState(false);
  
  // Contract event listeners
  const [eventListeners, setEventListeners] = useState([]);

  // Initialize contracts when Web3 is ready
  useEffect(() => {
    if (isConnected && signer) {
      initializeContracts();
    } else {
      cleanupContracts();
    }
  }, [isConnected, signer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanupEventListeners();
    };
  }, []);

  /**
   * Initialize contract instances
   */
  const initializeContracts = async () => {
    try {
      setLoading(true);

      // Initialize PickupSystem contract
      const pickupSystem = new ethers.Contract(
        contractAddresses.pickupSystem,
        PICKUP_SYSTEM_ABI,
        signer
      );

      // Initialize LocalWallet contract
      const localWallet = new ethers.Contract(
        contractAddresses.localWallet,
        LOCAL_WALLET_ABI,
        signer
      );

      // Test contract connectivity
      await Promise.all([
        pickupSystem.owner().catch(() => null),
        localWallet.getWalletStatus(account).catch(() => null)
      ]);

      setPickupSystemContract(pickupSystem);
      setLocalWalletContract(localWallet);

      // Set up event listeners
      setupEventListeners(pickupSystem, localWallet);

      console.log('✅ Contracts initialized successfully');

    } catch (error) {
      console.error('❌ Contract initialization failed:', error);
      toast.error('Failed to connect to smart contracts. Please check network and addresses.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Clean up contract instances
   */
  const cleanupContracts = () => {
    setPickupSystemContract(null);
    setLocalWalletContract(null);
    cleanupEventListeners();
  };

  /**
   * Set up contract event listeners
   */
  const setupEventListeners = (pickupSystem, localWallet) => {
    const listeners = [];

    try {
      // PickupSystem events
      const sellerRegisteredListener = pickupSystem.on('SellerRegistered', (seller, event) => {
        if (seller.toLowerCase() === account.toLowerCase()) {
          toast.success('🎉 Seller registration confirmed!');
        }
      });

      const packageRegisteredListener = pickupSystem.on('PackageRegistered', (packageId, commitment, seller, store, needsAgeCheck, event) => {
        if (seller.toLowerCase() === account.toLowerCase()) {
          toast.success(`📦 Package ${packageId.substr(0, 10)}... registered successfully!`);
        }
      });

      const packagePickedUpListener = pickupSystem.on('PackagePickedUp', (packageId, nullifier, store, event) => {
        if (store.toLowerCase() === account.toLowerCase()) {
          toast.success(`✅ Package ${packageId.substr(0, 10)}... picked up successfully!`);
        }
      });

      // LocalWallet events
      const walletInitializedListener = localWallet.on('WalletInitialized', (buyer, timestamp, event) => {
        if (buyer.toLowerCase() === account.toLowerCase()) {
          toast.success('🎉 Wallet initialized with EIP-7702 enhancement!');
        }
      });

      const ageVerifiedListener = localWallet.on('AgeVerified', (buyer, isAdult, event) => {
        if (buyer.toLowerCase() === account.toLowerCase()) {
          toast.success(`🎂 Age verification complete! ${isAdult ? '18+' : 'Under 18'}`);
        }
      });

      const commitmentGeneratedListener = localWallet.on('CommitmentGenerated', (buyer, commitment, event) => {
        if (buyer.toLowerCase() === account.toLowerCase()) {
          toast.success('🏷️ Anonymous commitment generated successfully!');
        }
      });

      listeners.push(
        sellerRegisteredListener,
        packageRegisteredListener,
        packagePickedUpListener,
        walletInitializedListener,
        ageVerifiedListener,
        commitmentGeneratedListener
      );

      setEventListeners(listeners);

    } catch (error) {
      console.error('Error setting up event listeners:', error);
    }
  };

  /**
   * Clean up event listeners
   */
  const cleanupEventListeners = () => {
    eventListeners.forEach(listener => {
      try {
        if (listener && typeof listener.removeAllListeners === 'function') {
          listener.removeAllListeners();
        }
      } catch (error) {
        console.error('Error cleaning up event listener:', error);
      }
    });
    setEventListeners([]);
  };

  /**
   * Update contract addresses
   */
  const updateContractAddresses = (newAddresses) => {
    setContractAddresses({ ...contractAddresses, ...newAddresses });
    
    // Reinitialize contracts with new addresses
    if (isConnected && signer) {
      initializeContracts();
    }
  };

  /**
   * Get contract address by name
   */
  const getContractAddress = (contractName) => {
    return contractAddresses[contractName];
  };

  /**
   * Check if contracts are ready
   */
  const areContractsReady = () => {
    return !!(pickupSystemContract && localWalletContract && !loading);
  };

  /**
   * Execute contract transaction with error handling
   */
  const executeTransaction = async (contractMethod, options = {}) => {
    if (!contractMethod) {
      throw new Error('Contract method not provided');
    }

    try {
      const tx = await contractMethod;
      
      if (options.showPending) {
        toast.info('Transaction submitted, waiting for confirmation...');
      }

      const receipt = await tx.wait();
      
      if (options.showSuccess) {
        toast.success('Transaction confirmed successfully!');
      }

      return receipt;

    } catch (error) {
      console.error('Transaction failed:', error);
      
      let errorMessage = 'Transaction failed';
      
      if (error.code === 4001) {
        errorMessage = 'Transaction rejected by user';
      } else if (error.code === -32603) {
        errorMessage = 'Internal error - please try again';
      } else if (error.message) {
        errorMessage = error.message.includes('revert') 
          ? error.message.split('revert ')[1] || 'Transaction reverted'
          : error.message;
      }
      
      if (options.showError !== false) {
        toast.error(errorMessage);
      }
      
      throw error;
    }
  };

  /**
   * Get network information
   */
  const getNetworkInfo = async () => {
    if (!provider) return null;

    try {
      const network = await provider.getNetwork();
      const gasPrice = await provider.getGasPrice();
      
      return {
        chainId: network.chainId,
        name: network.name,
        gasPrice: ethers.utils.formatUnits(gasPrice, 'gwei')
      };
    } catch (error) {
      console.error('Error getting network info:', error);
      return null;
    }
  };

  const value = {
    // Contract instances
    pickupSystemContract,
    localWalletContract,
    
    // Contract addresses
    contractAddresses,
    updateContractAddresses,
    getContractAddress,
    
    // Status
    loading,
    areContractsReady,
    
    // Utilities
    executeTransaction,
    getNetworkInfo
  };

  return (
    <ContractContext.Provider value={value}>
      {children}
    </ContractContext.Provider>
  );
};

export default ContractProvider;