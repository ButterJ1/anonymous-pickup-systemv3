import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { useWeb3 } from '../components/shared/Web3Provider';
import eip7702Helper from '../utils/eip7702';

/**
 * Custom hook for EIP-7702 wallet enhancement
 * Provides functions for delegation, enhanced capabilities, and local operations
 */
export const useEIP7702 = () => {
  const { provider, signer, account, isConnected } = useWeb3();
  
  // State management
  const [isSupported, setIsSupported] = useState(false);
  const [isDelegated, setIsDelegated] = useState(false);
  const [delegationInfo, setDelegationInfo] = useState(null);
  const [capabilities, setCapabilities] = useState([]);
  const [loading, setLoading] = useState(false);

  // Check EIP-7702 support and delegation status
  useEffect(() => {
    if (provider && account) {
      checkSupportAndStatus();
    }
  }, [provider, account]);

  /**
   * Check EIP-7702 support and current delegation status
   */
  const checkSupportAndStatus = useCallback(async () => {
    try {
      // Check if EIP-7702 is supported
      const supported = await eip7702Helper.checkSupport(provider);
      setIsSupported(supported);

      // Check current delegation status
      if (account) {
        const delegation = eip7702Helper.getDelegationInfo(account);
        setIsDelegated(delegation.isDelegated);
        setDelegationInfo(delegation);

        // Get enhanced capabilities
        const caps = eip7702Helper.getEnhancedCapabilities(account);
        setCapabilities(caps.capabilities || []);
      }
    } catch (error) {
      console.error('Error checking EIP-7702 status:', error);
    }
  }, [provider, account]);

  /**
   * Delegate wallet to LocalWallet contract
   * @param {string} localWalletAddress - LocalWallet contract address
   * @returns {boolean} Success status
   */
  const delegateToContract = useCallback(async (localWalletAddress) => {
    if (!signer || !account) {
      toast.error('Please connect wallet first');
      return false;
    }

    setLoading(true);
    try {
      const success = await eip7702Helper.delegateToContract(
        signer,
        localWalletAddress,
        account
      );

      if (success) {
        // Update delegation status
        await checkSupportAndStatus();
        toast.success('EIP-7702 delegation successful! Your wallet now has enhanced capabilities.');
        return true;
      } else {
        throw new Error('Delegation failed');
      }
    } catch (error) {
      console.error('Delegation error:', error);
      toast.error('Failed to delegate wallet: ' + error.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [signer, account, checkSupportAndStatus]);

  /**
   * Revoke delegation and restore original wallet behavior
   * @returns {boolean} Success status
   */
  const revokeDelegation = useCallback(async () => {
    if (!signer || !account) {
      toast.error('Please connect wallet first');
      return false;
    }

    setLoading(true);
    try {
      const success = await eip7702Helper.revokeDelegation(signer, account);

      if (success) {
        // Update status
        await checkSupportAndStatus();
        toast.success('Delegation revoked. Wallet restored to original state.');
        return true;
      } else {
        throw new Error('Revocation failed');
      }
    } catch (error) {
      console.error('Revocation error:', error);
      toast.error('Failed to revoke delegation: ' + error.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, [signer, account, checkSupportAndStatus]);

  /**
   * Execute a delegated function call
   * @param {string} functionData - Encoded function call data
   * @returns {Object} Transaction receipt
   */
  const executeDelegatedCall = useCallback(async (functionData) => {
    if (!isDelegated) {
      throw new Error('Wallet is not delegated to any contract');
    }

    setLoading(true);
    try {
      const receipt = await eip7702Helper.executeDelegatedCall(
        signer,
        account,
        functionData
      );

      toast.success('Delegated call executed successfully');
      return receipt;
    } catch (error) {
      console.error('Delegated call error:', error);
      toast.error('Delegated call failed: ' + error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [signer, account, isDelegated]);

  /**
   * Generate commitment using enhanced wallet capabilities
   * @param {Object} buyerData - Buyer's private data
   * @returns {string} Generated commitment
   */
  const generateCommitmentLocally = useCallback((buyerData) => {
    if (!isDelegated) {
      throw new Error('Enhanced capabilities not available - wallet not delegated');
    }

    try {
      const commitment = eip7702Helper.generateCommitmentLocally(buyerData);
      console.log('✅ Commitment generated using enhanced wallet');
      return commitment;
    } catch (error) {
      console.error('Local commitment generation error:', error);
      throw error;
    }
  }, [isDelegated]);

  /**
   * Process age verification locally using enhanced capabilities
   * @param {Object} verificationData - Age verification data
   * @returns {Object} Verification result
   */
  const processAgeVerificationLocally = useCallback((verificationData) => {
    if (!isDelegated) {
      throw new Error('Enhanced capabilities not available - wallet not delegated');
    }

    try {
      const result = eip7702Helper.processAgeVerificationLocally(verificationData);
      console.log('✅ Age verification processed locally');
      return result;
    } catch (error) {
      console.error('Local age verification error:', error);
      throw error;
    }
  }, [isDelegated]);

  /**
   * Prepare ZK proof inputs using enhanced wallet
   * @param {Object} inputs - Raw proof inputs
   * @returns {Object} Processed inputs for ZK circuit
   */
  const prepareZKProofInputs = useCallback((inputs) => {
    if (!isDelegated) {
      throw new Error('Enhanced capabilities not available - wallet not delegated');
    }

    try {
      const processedInputs = eip7702Helper.prepareZKProofInputs(inputs);
      console.log('✅ ZK proof inputs prepared using enhanced wallet');
      return processedInputs;
    } catch (error) {
      console.error('ZK proof input preparation error:', error);
      throw error;
    }
  }, [isDelegated]);

  /**
   * Check if specific capability is available
   * @param {string} capability - Capability name to check
   * @returns {boolean} Availability status
   */
  const hasCapability = useCallback((capability) => {
    return capabilities.includes(capability);
  }, [capabilities]);

  /**
   * Get delegation status info
   * @returns {Object} Status information
   */
  const getDelegationStatus = useCallback(() => {
    return {
      isSupported,
      isDelegated,
      delegationInfo,
      capabilities,
      hasEnhancedCapabilities: capabilities.length > 0
    };
  }, [isSupported, isDelegated, delegationInfo, capabilities]);

  return {
    // Status
    isSupported,
    isDelegated,
    delegationInfo,
    capabilities,
    loading,
    hasCapability,
    getDelegationStatus,

    // Core operations
    delegateToContract,
    revokeDelegation,
    executeDelegatedCall,
    checkSupportAndStatus,

    // Enhanced capabilities
    generateCommitmentLocally,
    processAgeVerificationLocally,
    prepareZKProofInputs
  };
};

/**
 * Hook for managing EIP-7702 enhanced wallet operations
 * Specialized for the anonymous pickup system
 */
export const useEnhancedWallet = () => {
  const eip7702 = useEIP7702();
  const [walletData, setWalletData] = useState(null);

  /**
   * Initialize enhanced wallet with buyer data
   * @param {Object} buyerInfo - Buyer information
   */
  const initializeEnhancedWallet = useCallback(async (buyerInfo) => {
    const { name, phone, age } = buyerInfo;

    try {
      // Process data locally using enhanced capabilities
      const processedData = {
        secret: Math.random().toString(36).substr(2, 9), // Generate random secret
        nameHash: eip7702.generateCommitmentLocally({ 
          secret: name, 
          nameHash: name, 
          phoneLastThree: phone.slice(-3) 
        }),
        phoneLastThree: parseInt(phone.slice(-3)),
        age: parseInt(age),
        name, // Keep for UI purposes
        phone // Keep for UI purposes
      };

      setWalletData(processedData);
      return processedData;
    } catch (error) {
      console.error('Enhanced wallet initialization error:', error);
      throw error;
    }
  }, [eip7702]);

  /**
   * Generate anonymous commitment using enhanced wallet
   * @returns {string} Generated commitment
   */
  const generateAnonymousCommitment = useCallback(() => {
    if (!walletData) {
      throw new Error('Wallet not initialized');
    }

    return eip7702.generateCommitmentLocally(walletData);
  }, [eip7702, walletData]);

  /**
   * Prepare pickup proof with enhanced capabilities
   * @param {string} packageId - Package ID
   * @param {string} storeAddress - Store address
   * @returns {Object} Prepared proof inputs
   */
  const preparePickupProof = useCallback((packageId, storeAddress) => {
    if (!walletData) {
      throw new Error('Wallet not initialized');
    }

    const inputs = {
      ...walletData,
      packageId,
      storeAddress
    };

    return eip7702.prepareZKProofInputs(inputs);
  }, [eip7702, walletData]);

  return {
    // State
    walletData,
    isInitialized: !!walletData,

    // Operations
    initializeEnhancedWallet,
    generateAnonymousCommitment,
    preparePickupProof,

    // EIP-7702 operations
    ...eip7702
  };
};

export default useEIP7702;