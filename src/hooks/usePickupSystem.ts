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
  const [userIdentity, setUserIdentity] = useState<UserIdentity>({
    name: '', phone: '', age: '', secret: '', nameHash: '', phoneLastThree: '', nonce: ''
  });
  
  // Contract utils instance
  const [contractUtils] = useState(() => new ContractUtils());
  
  // Initialize everything
  useEffect(() => {
    const initialize = async () => {
      try {
        console.log('🔄 Initializing pickup system...');
        
        console.log('📡 Loading ZK circuits...');
        const circuitsReady = await ZKUtils.loadCircuits();
        setCircuitsLoaded(circuitsReady);
        console.log(circuitsReady ? '✅ ZK circuits loaded' : '❌ ZK circuits failed to load');
        
        console.log('🔗 Initializing contracts...');
        const contractsReady = await contractUtils.initialize();
        setContractsInitialized(contractsReady);
        console.log(contractsReady ? '✅ Contracts initialized' : '❌ Contracts failed to initialize');
        
        if (circuitsReady && contractsReady) {
          console.log('🎉 System initialization complete!');
        } else {
          console.warn('⚠️ System partially initialized');
        }
      } catch (error) {
        console.error('❌ System initialization failed:', error);
      }
    };
    
    initialize();
  }, [contractUtils]);
  
  // Check age verification status
  const checkAgeVerification = useCallback(async () => {
    if (!contractsInitialized) {
      console.log('⚠️ Cannot check age verification - contracts not initialized');
      return false;
    }
    
    try {
      const isValid = await contractUtils.isAgeVerificationValid();
      setAgeVerified(isValid);
      console.log('🔍 Age verification status:', isValid);
      return isValid;
    } catch (error) {
      console.error('❌ Error checking age verification:', error);
      return false;
    }
  }, [contractUtils, contractsInitialized]);
  
  // EIP-7702 Smart EOA delegation (enhanced fallback)
  const delegateSmartEOA = async (name: string, phone: string, age: number) => {
    if (!contractsInitialized) {
      throw new Error('Contracts not initialized');
    }
    
    setLoading(true);
    try {
      console.log('🔄 Starting Smart EOA delegation process...');

      console.log('🔐 Generating cryptographic secrets...');
      const secret = ZKUtils.generateSecret();
      const nameHash = await ZKUtils.hashName(name);
      const phoneLastThree = ZKUtils.extractPhoneLastThree(phone);
      const nonce = await ZKUtils.generateNonce(secret, name);
      
      console.log('✅ Secrets generated:', {
        secret: secret.slice(0, 10) + '...',
        nameHash: nameHash.slice(0, 10) + '...',
        phoneLastThree,
        nonce: nonce.slice(0, 10) + '...'
      });
      
      const identity: UserIdentity = {
        name, 
        phone, 
        age: age.toString(), 
        secret, 
        nameHash, 
        phoneLastThree, 
        nonce
      };
      setUserIdentity(identity);
      
      console.log('🔒 Generating buyer commitment...');
      const buyerCommit = await ZKUtils.generateBuyerCommitment(secret, nameHash, phoneLastThree, nonce);
      setBuyerCommitment(buyerCommit);
      console.log('✅ Buyer commitment generated:', buyerCommit.slice(0, 10) + '...');
      
      console.log('⚡ Delegating Smart EOA...');
      const result = await contractUtils.delegateSmartEOA(name, phone, age);
      
      setWalletAddress(result.walletAddress);
      setSmartEOADelegated(true);
      
      console.log('🎉 Smart EOA delegation complete!', {
        walletAddress: result.walletAddress,
        txHash: result.txHash.slice(0, 10) + '...'
      });
      
      return result;
    } catch (error) {
      console.error('❌ Smart EOA delegation error:', error);
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
      console.log('🔍 Performing age verification...');
      const txHash = await contractUtils.verifyAgeLocally();
      setAgeVerified(true);
      console.log('✅ Age verification complete:', txHash.slice(0, 10) + '...');
      return txHash;
    } catch (error) {
      console.error('❌ Age verification error:', error);
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
      console.log('📦 Registering package...', {
        packageId: packageData.packageId,
        storeAddress: packageData.storeAddress,
        needsAgeCheck: packageData.needsAgeCheck
      });
      
      const sellerCommit = await ZKUtils.generateSellerCommitment(
        buyerCommitment,
        packageData.packageId,
        packageData.itemPrice,
        packageData.shippingFee,
        packageData.storeAddress,
        packageData.needsAgeCheck
      );
      
      console.log('🔒 Seller commitment generated:', sellerCommit.slice(0, 10) + '...');
      
      const txHash = await contractUtils.registerPackage(
        packageData.packageId,
        buyerCommitment,
        sellerCommit,
        packageData.storeAddress,
        packageData.itemPrice,
        packageData.shippingFee,
        packageData.needsAgeCheck
      );
      
      console.log('✅ Package registration complete:', txHash.slice(0, 10) + '...');
      
      return { txHash, sellerCommitment: sellerCommit };
    } catch (error) {
      console.error('❌ Package registration error:', error);
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
      console.log('🏪 Generating store commitment for:', packageId);
      const result = await contractUtils.generateStoreCommitment(packageId);
      console.log('✅ Store commitment generated:', result.storeCommitment.slice(0, 10) + '...');
      return result;
    } catch (error) {
      console.error('❌ Store commitment generation error:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  
  // Generate ZK proof
  const generateZKProof = async (packageData: PackageData): Promise<ZKProofResult> => {
    if (!circuitsLoaded) {
      throw new Error('ZK circuits not loaded');
    }
    
    if (packageData.needsAgeCheck && !ageVerified) {
      throw new Error('Age verification required for this package');
    }
    
    setProving(true);
    try {
      console.log('🔒 Generating ZK proof...', {
        packageId: packageData.packageId,
        needsAgeCheck: packageData.needsAgeCheck,
        ageVerified
      });
      
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
      
      console.log('🔍 Circuit inputs prepared:', {
        buyer_age: inputs.buyer_age,
        min_age_required: inputs.min_age_required,
        package_id: inputs.package_id
      });
      
      const proof = await ZKUtils.generateProof(inputs);
      console.log('✅ ZK proof generated successfully!');
      
      return proof;
    } catch (error) {
      console.error('❌ ZK proof generation error:', error);
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
      console.log('📝 Submitting pickup proof...', {
        packageId,
        proofGenerated: !!proof
      });
      
      const txHash = await contractUtils.submitPickupProof(packageId, proof);
      console.log('🎉 Pickup completed successfully!', txHash.slice(0, 10) + '...');
      
      return txHash;
    } catch (error) {
      console.error('❌ Pickup proof submission error:', error);
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