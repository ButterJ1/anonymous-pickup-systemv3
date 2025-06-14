import { useState, useEffect, useCallback } from 'react';
import { ZKUtils, CircuitInputs, ZKProofResult } from '../utils/zkUtils';
import { ContractUtils } from '../utils/contractUtils';

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

export const usePickupSystem = () => {
  // State
  const [circuitsLoaded, setCircuitsLoaded] = useState(false);
  const [contractsInitialized, setContractsInitialized] = useState(false);
  const [smartEOADelegated, setSmartEOADelegated] = useState(false);
  const [ageVerified, setAgeVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [proving, setProving] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [buyerCommitment, setBuyerCommitment] = useState('');
  const [userIdentity, setUserIdentity] = useState({
    name: '', phone: '', age: '', secret: '', nameHash: '', phoneLastThree: '', nonce: ''
  });

  // Contract utils instance
  const [contractUtils] = useState(() => new ContractUtils());

  // Initialize everything
  useEffect(() => {
    const initialize = async () => {
      try {
        // Load ZK circuits
        const circuitsReady = await ZKUtils.loadCircuits();
        setCircuitsLoaded(circuitsReady);

        // Initialize contracts
        const contractsReady = await contractUtils.initialize();
        setContractsInitialized(contractsReady);

        if (circuitsReady && contractsReady) {
          console.log('✅ System initialized successfully');
        }
      } catch (error) {
        console.error('❌ System initialization failed:', error);
      }
    };

    initialize();
  }, [contractUtils]);

  // useEffect(() => {
  //   const timer = setTimeout(() => {
  //     setCircuitsLoaded(true);
  //     setContractsInitialized(true);
  //   }, 3000);
  //   return () => clearTimeout(timer);
  // }, []);

  // Check age verification status
  const checkAgeVerification = useCallback(async () => {
    if (!contractsInitialized) return false;

    try {
      const isValid = await contractUtils.isAgeVerificationValid();
      setAgeVerified(isValid);
      return isValid;
    } catch (error) {
      console.error('Error checking age verification:', error);
      return false;
    }
  }, [contractUtils, contractsInitialized]);

  // EIP-7702 Smart EOA delegation
  const delegateSmartEOA = async (name: string, phone: string, age: number) => {
    if (!contractsInitialized) {
      throw new Error('Contracts not initialized');
    }

    setLoading(true);
    try {
      const secret = ZKUtils.generateSecret();
      const nameHash = await ZKUtils.hashName(name);
      const phoneLastThree = ZKUtils.extractPhoneLastThree(phone);
      const nonce = await ZKUtils.generateNonce(secret, name);

      // Update user identity
      const identity: UserIdentity = {
        name, phone, age: age.toString(), secret, nameHash, phoneLastThree, nonce
      };
      setUserIdentity(identity);

      const buyerCommit = await ZKUtils.generateBuyerCommitment(secret, nameHash, phoneLastThree, nonce);
      setBuyerCommitment(buyerCommit);

      // Delegate Smart EOA via EIP-7702
      const result = await contractUtils.delegateSmartEOA(name, phone, age);

      setWalletAddress(result.walletAddress);
      setSmartEOADelegated(true);

      return result;
    } catch (error) {
      console.error('Smart EOA delegation error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Perform local age verification
  const performAgeVerification = async () => {
    if (!contractsInitialized) {
      throw new Error('Contracts not initialized');
    }

    setLoading(true);
    try {
      const txHash = await contractUtils.verifyAgeLocally();
      setAgeVerified(true);
      return txHash;
    } catch (error) {
      console.error('Age verification error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Register package (seller action)
  const registerPackage = async (packageData: PackageData) => {
    if (!contractsInitialized) {
      throw new Error('Contracts not initialized');
    }

    setLoading(true);
    try {
      const sellerCommit = await ZKUtils.generateSellerCommitment(
        buyerCommitment,
        packageData.packageId,
        packageData.itemPrice,
        packageData.shippingFee,
        packageData.storeAddress,
        packageData.needsAgeCheck
      );

      const txHash = await contractUtils.registerPackage(
        packageData.packageId,
        buyerCommitment,
        sellerCommit,
        packageData.storeAddress,
        packageData.itemPrice,
        packageData.shippingFee,
        packageData.needsAgeCheck
      );

      return { txHash, sellerCommitment: sellerCommit };
    } catch (error) {
      console.error('Package registration error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Generate store commitment (store staff action)
  const generateStoreCommitment = async (packageId: string) => {
    if (!contractsInitialized) {
      throw new Error('Contracts not initialized');
    }

    setLoading(true);
    try {
      const result = await contractUtils.generateStoreCommitment(packageId);
      return result;
    } catch (error) {
      console.error('Store commitment generation error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Generate ZK proof
  const generateZKProof = async (packageData: PackageData) => {
    if (!circuitsLoaded) {
      throw new Error('ZK circuits not loaded');
    }

    if (packageData.needsAgeCheck && !ageVerified) {
      throw new Error('Age verification required');
    }

    setProving(true);
    try {
      // Prepare circuit inputs
      const inputs: CircuitInputs = {
        buyer_secret: userIdentity.secret,
        buyer_name_hash: userIdentity.nameHash,
        buyer_phone_last_three: userIdentity.phoneLastThree,
        buyer_nonce: userIdentity.nonce,
        buyer_age: userIdentity.age,
        buyer_commitment: buyerCommitment,
        seller_commitment: packageData.sellerCommitment,
        store_commitment: packageData.storeCommitment,
        package_id: Buffer.from(packageData.packageId, 'utf8').toString('hex'),
        min_age_required: packageData.needsAgeCheck ? '18' : '0'
      };

      const proof = await ZKUtils.generateProof(inputs);
      return proof;
    } catch (error) {
      console.error('ZK proof generation error:', error);
      throw error;
    } finally {
      setProving(false);
    }
  };

  // Submit pickup proof
  const submitPickupProof = async (packageId: string, proof: ZKProofResult) => {
    if (!contractsInitialized) {
      throw new Error('Contracts not initialized');
    }

    setLoading(true);
    try {
      const txHash = await contractUtils.submitPickupProof(packageId, proof);
      return txHash;
    } catch (error) {
      console.error('Pickup proof submission error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    // State
    circuitsLoaded,
    contractsInitialized,
    smartEOADelegated,
    ageVerified,
    loading,
    proving,
    walletAddress,
    buyerCommitment,
    userIdentity,

    // Actions
    delegateSmartEOA,
    performAgeVerification,
    registerPackage,
    generateStoreCommitment,
    generateZKProof,
    submitPickupProof,
    checkAgeVerification
  };
};