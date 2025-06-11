import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';
import { useWeb3 } from '../components/shared/Web3Provider';

/**
 * Custom hook for smart contract interactions
 * Provides easy-to-use functions for common contract operations
 */
export const useContract = () => {
  // This would normally import from ContractProvider, but for the hook file structure
  // we'll create a simplified version that integrates with Web3Provider
  
  const { provider, signer, account, isConnected } = useWeb3();
  const [contracts, setContracts] = useState({});
  const [loading, setLoading] = useState(false);

  // Contract addresses - should be updated with deployed addresses
  const CONTRACT_ADDRESSES = {
    pickupSystem: process.env.REACT_APP_PICKUP_SYSTEM_ADDRESS || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
    localWallet: process.env.REACT_APP_LOCAL_WALLET_ADDRESS || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512'
  };

  // Contract ABIs (simplified versions)
  const PICKUP_SYSTEM_ABI = [
    "function registerSeller() external",
    "function registerPackage(bytes32,uint256,address,uint256,uint256,bool,bool,uint256) external payable",
    "function executePickup(bytes32,uint256,uint256,uint256) external payable",
    "function getPackage(bytes32) external view returns (bytes32,uint256,address,address,uint256,uint256,uint256,uint256,bool,bool,bool)",
    "function registeredSellers(address) external view returns (bool)",
    "function authorizedStores(address) external view returns (bool)",
    "function getSellerInfo(address) external view returns (bool,uint256,uint256,uint256)",
    "function getStoreInfo(address) external view returns (bool,string,string,uint256,uint256)"
  ];

  const LOCAL_WALLET_ABI = [
    "function initializeWallet(string,string,uint256) external",
    "function verifyAgeLocally(uint256) external",
    "function generateCommitment() external returns (uint256)",
    "function preparePickupProof(bytes32) external returns (uint256,uint256,uint256,uint256,uint256,uint256,uint256,uint256)",
    "function getWalletStatus() external view returns (bool,bool,uint256,uint256,bool)",
    "function canPickupAdultItems() external view returns (bool)"
  ];

  // Initialize contracts when Web3 is ready
  useEffect(() => {
    if (isConnected && signer) {
      initializeContracts();
    }
  }, [isConnected, signer]);

  const initializeContracts = useCallback(async () => {
    try {
      const pickupSystem = new ethers.Contract(
        CONTRACT_ADDRESSES.pickupSystem,
        PICKUP_SYSTEM_ABI,
        signer
      );

      const localWallet = new ethers.Contract(
        CONTRACT_ADDRESSES.localWallet,
        LOCAL_WALLET_ABI,
        signer
      );

      setContracts({
        pickupSystemContract: pickupSystem,
        localWalletContract: localWallet
      });

    } catch (error) {
      console.error('Contract initialization error:', error);
    }
  }, [signer]);

  return contracts;
};

/**
 * Hook for seller operations
 */
export const useSeller = () => {
  const { account } = useWeb3();
  const { pickupSystemContract } = useContract();
  const [sellerData, setSellerData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Register as seller
  const registerSeller = useCallback(async () => {
    if (!pickupSystemContract) throw new Error('Contract not available');
    
    setLoading(true);
    try {
      const tx = await pickupSystemContract.registerSeller();
      await tx.wait();
      await loadSellerData();
      return true;
    } finally {
      setLoading(false);
    }
  }, [pickupSystemContract]);

  // Register package
  const registerPackage = useCallback(async (packageData) => {
    if (!pickupSystemContract) throw new Error('Contract not available');
    
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

    setLoading(true);
    try {
      const packageIdHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(packageId));
      const itemPriceWei = ethers.utils.parseEther(itemPrice.toString());
      const shippingFeeWei = ethers.utils.parseEther(shippingFee.toString());
      const totalValue = sellerPaysShipping ? itemPriceWei.add(shippingFeeWei) : itemPriceWei;

      const tx = await pickupSystemContract.registerPackage(
        packageIdHash,
        buyerCommitment,
        storeAddress,
        itemPriceWei,
        shippingFeeWei,
        needsAgeCheck,
        sellerPaysShipping,
        pickupDays,
        { value: totalValue }
      );

      await tx.wait();
      await loadSellerData();
      return true;
    } finally {
      setLoading(false);
    }
  }, [pickupSystemContract]);

  // Load seller data
  const loadSellerData = useCallback(async () => {
    if (!pickupSystemContract || !account) return;

    try {
      const [isRegistered, sellerInfo] = await Promise.all([
        pickupSystemContract.registeredSellers(account),
        pickupSystemContract.getSellerInfo(account).catch(() => [false, 0, 0, 0])
      ]);

      setSellerData({
        isRegistered,
        totalPackages: sellerInfo[1]?.toNumber() || 0,
        successfulDeliveries: sellerInfo[2]?.toNumber() || 0,
        totalRevenue: ethers.utils.formatEther(sellerInfo[3] || 0)
      });
    } catch (error) {
      console.error('Error loading seller data:', error);
    }
  }, [pickupSystemContract, account]);

  // Load data on mount
  useEffect(() => {
    loadSellerData();
  }, [loadSellerData]);

  return {
    sellerData,
    loading,
    registerSeller,
    registerPackage,
    refreshData: loadSellerData
  };
};

/**
 * Hook for buyer operations
 */
export const useBuyer = () => {
  const { account } = useWeb3();
  const { localWalletContract } = useContract();
  const [buyerData, setBuyerData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Initialize wallet
  const initializeWallet = useCallback(async (name, phone, age) => {
    if (!localWalletContract) throw new Error('Contract not available');
    
    setLoading(true);
    try {
      const tx = await localWalletContract.initializeWallet(name, phone, age);
      await tx.wait();
      await loadBuyerData();
      return true;
    } finally {
      setLoading(false);
    }
  }, [localWalletContract]);

  // Verify age locally
  const verifyAge = useCallback(async (ageProofHash) => {
    if (!localWalletContract) throw new Error('Contract not available');
    
    setLoading(true);
    try {
      const tx = await localWalletContract.verifyAgeLocally(ageProofHash);
      await tx.wait();
      await loadBuyerData();
      return true;
    } finally {
      setLoading(false);
    }
  }, [localWalletContract]);

  // Generate commitment
  const generateCommitment = useCallback(async () => {
    if (!localWalletContract) throw new Error('Contract not available');
    
    setLoading(true);
    try {
      const tx = await localWalletContract.generateCommitment();
      const receipt = await tx.wait();
      
      // Extract commitment from events
      const event = receipt.events?.find(e => e.event === 'CommitmentGenerated');
      const commitment = event?.args?.commitment;
      
      await loadBuyerData();
      return commitment;
    } finally {
      setLoading(false);
    }
  }, [localWalletContract]);

  // Prepare pickup proof
  const preparePickupProof = useCallback(async (packageId) => {
    if (!localWalletContract) throw new Error('Contract not available');
    
    const packageIdHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(packageId));
    
    setLoading(true);
    try {
      const proofData = await localWalletContract.preparePickupProof(packageIdHash);
      return {
        secret: proofData[0],
        nameHash: proofData[1],
        phoneLastThree: proofData[2],
        age: proofData[3],
        nonce: proofData[4],
        nullifier: proofData[5],
        commitment: proofData[6],
        ageProof: proofData[7]
      };
    } finally {
      setLoading(false);
    }
  }, [localWalletContract]);

  // Load buyer data
  const loadBuyerData = useCallback(async () => {
    if (!localWalletContract || !account) return;

    try {
      const [status, canPickupAdult] = await Promise.all([
        localWalletContract.getWalletStatus(),
        localWalletContract.canPickupAdultItems().catch(() => false)
      ]);

      setBuyerData({
        isInitialized: status[0],
        ageVerified: status[1],
        age: status[2]?.toNumber() || 0,
        nonce: status[3]?.toNumber() || 0,
        ageVerificationValid: status[4],
        canPickupAdult
      });
    } catch (error) {
      console.error('Error loading buyer data:', error);
    }
  }, [localWalletContract, account]);

  // Load data on mount
  useEffect(() => {
    loadBuyerData();
  }, [loadBuyerData]);

  return {
    buyerData,
    loading,
    initializeWallet,
    verifyAge,
    generateCommitment,
    preparePickupProof,
    refreshData: loadBuyerData
  };
};

/**
 * Hook for store operations
 */
export const useStore = () => {
  const { account } = useWeb3();
  const { pickupSystemContract } = useContract();
  const [storeData, setStoreData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Execute pickup
  const executePickup = useCallback(async (pickupData) => {
    if (!pickupSystemContract) throw new Error('Contract not available');
    
    const {
      packageId,
      nullifier,
      ageProof = ethers.constants.HashZero,
      commitmentProof,
      shippingFee = 0
    } = pickupData;

    setLoading(true);
    try {
      const packageIdHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(packageId));
      const shippingPayment = ethers.utils.parseEther(shippingFee.toString());

      const tx = await pickupSystemContract.executePickup(
        packageIdHash,
        nullifier,
        ageProof,
        commitmentProof,
        { value: shippingPayment }
      );

      await tx.wait();
      await loadStoreData();
      return true;
    } finally {
      setLoading(false);
    }
  }, [pickupSystemContract]);

  // Load store data
  const loadStoreData = useCallback(async () => {
    if (!pickupSystemContract || !account) return;

    try {
      const [isAuthorized, storeInfo] = await Promise.all([
        pickupSystemContract.authorizedStores(account),
        pickupSystemContract.getStoreInfo(account).catch(() => [false, '', '', 0, 0])
      ]);

      setStoreData({
        isAuthorized,
        storeName: storeInfo[1] || 'Unknown Store',
        location: storeInfo[2] || 'Unknown Location',
        totalPickups: storeInfo[3]?.toNumber() || 0,
        commissionRate: storeInfo[4]?.toNumber() / 100 || 0
      });
    } catch (error) {
      console.error('Error loading store data:', error);
    }
  }, [pickupSystemContract, account]);

  // Load data on mount
  useEffect(() => {
    loadStoreData();
  }, [loadStoreData]);

  return {
    storeData,
    loading,
    executePickup,
    refreshData: loadStoreData
  };
};

/**
 * Hook for package operations
 */
export const usePackage = () => {
  const { pickupSystemContract } = useContract();
  const [loading, setLoading] = useState(false);

  // Get package information
  const getPackage = useCallback(async (packageId) => {
    if (!pickupSystemContract) throw new Error('Contract not available');
    
    setLoading(true);
    try {
      const packageIdHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(packageId));
      const packageInfo = await pickupSystemContract.getPackage(packageIdHash);
      
      return {
        id: packageInfo[0],
        buyerCommitment: packageInfo[1],
        seller: packageInfo[2],
        store: packageInfo[3],
        itemPrice: ethers.utils.formatEther(packageInfo[4]),
        shippingFee: ethers.utils.formatEther(packageInfo[5]),
        createdTime: packageInfo[6].toNumber(),
        expiryTime: packageInfo[7].toNumber(),
        needsAgeCheck: packageInfo[8],
        sellerPaysShipping: packageInfo[9],
        isPickedUp: packageInfo[10]
      };
    } finally {
      setLoading(false);
    }
  }, [pickupSystemContract]);

  // Check if package can be picked up
  const canPickup = useCallback(async (packageId) => {
    if (!pickupSystemContract) throw new Error('Contract not available');
    
    const packageIdHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(packageId));
    return await pickupSystemContract.canPickup(packageIdHash);
  }, [pickupSystemContract]);

  return {
    loading,
    getPackage,
    canPickup
  };
};

export default useContract;