import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { ethers } from 'ethers';
import QRCode from 'qrcode';

import { useWeb3 } from '../shared/Web3Provider';
import { useContract } from '../../hooks/useContract';
import zkProofGenerator from '../../utils/zkProof';
import WalletSetup from './WalletSetup';
import AgeVerification from './AgeVerification';
import GenerateProof from './GenerateProof';

import './BuyerApp.css';

const BuyerApp = () => {
  const { account, isConnected, isEIP7702Enabled, enableEIP7702 } = useWeb3();
  const { localWalletContract, pickupSystemContract } = useContract();
  
  // State management
  const [currentStep, setCurrentStep] = useState(1);
  const [walletInitialized, setWalletInitialized] = useState(false);
  const [ageVerified, setAgeVerified] = useState(false);
  const [buyerData, setBuyerData] = useState(null);
  const [commitment, setCommitment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [zkReady, setZkReady] = useState(false);

  // Initialize ZK proof system
  useEffect(() => {
    const initZK = async () => {
      const ready = await zkProofGenerator.initialize();
      setZkReady(ready);
    };
    initZK();
  }, []);

  // Check wallet status on component mount
  useEffect(() => {
    if (isConnected && isEIP7702Enabled && localWalletContract) {
      checkWalletStatus();
    }
  }, [isConnected, isEIP7702Enabled, localWalletContract]);

  /**
   * Check current wallet status from contract
   */
  const checkWalletStatus = async () => {
    if (!localWalletContract) return;

    try {
      const status = await localWalletContract.getWalletStatus();
      const [isInitialized, ageVerified, age, nonce, ageVerificationValid] = status;

      setWalletInitialized(isInitialized);
      setAgeVerified(ageVerified && ageVerificationValid);

      // Update current step based on status
      if (!isInitialized) {
        setCurrentStep(2); // Need to initialize wallet
      } else if (!ageVerified || !ageVerificationValid) {
        setCurrentStep(3); // Need age verification
      } else {
        setCurrentStep(4); // Ready to generate proofs
      }

    } catch (error) {
      console.error('Error checking wallet status:', error);
    }
  };

  /**
   * Step 1: Enable EIP-7702 wallet enhancement
   */
  const handleEnableEIP7702 = async () => {
    if (!localWalletContract) {
      toast.error('LocalWallet contract not available');
      return;
    }

    setLoading(true);
    try {
      const success = await enableEIP7702(localWalletContract.address);
      if (success) {
        setCurrentStep(2);
        toast.success('EIP-7702 enabled! Your wallet now has enhanced capabilities.');
      }
    } catch (error) {
      toast.error('Failed to enable EIP-7702: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Step 2: Initialize buyer wallet
   */
  const handleWalletInitialization = async (name, phone, age) => {
    if (!localWalletContract) {
      toast.error('LocalWallet contract not available');
      return;
    }

    setLoading(true);
    try {
      // Initialize wallet with buyer data
      const tx = await localWalletContract.initializeWallet(name, phone, age);
      await tx.wait();

      // Store buyer data locally (for ZK proof generation)
      const nameHash = zkProofGenerator.hashName(name);
      const phoneLastThree = zkProofGenerator.extractPhoneLastThree(phone);
      const secret = ethers.utils.randomBytes(32);

      const buyerInfo = {
        secret: ethers.BigNumber.from(secret),
        nameHash: ethers.BigNumber.from(nameHash),
        phoneLastThree,
        age: parseInt(age),
        name, // Store for UI purposes only
        phone // Store for UI purposes only
      };

      setBuyerData(buyerInfo);
      setWalletInitialized(true);
      setCurrentStep(3);

      toast.success('Wallet initialized successfully!');

    } catch (error) {
      console.error('Wallet initialization error:', error);
      toast.error('Failed to initialize wallet: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Step 3: Verify age locally
   */
  const handleAgeVerification = async (verificationResult) => {
    if (!localWalletContract) {
      toast.error('LocalWallet contract not available');
      return;
    }

    setLoading(true);
    try {
      // Generate age proof hash from verification result
      const ageProofHash = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes(
          `age_verified_${verificationResult.age}_${Date.now()}_${account}`
        )
      );

      // Submit age verification to contract
      const tx = await localWalletContract.verifyAgeLocally(ageProofHash);
      await tx.wait();

      setAgeVerified(true);
      setCurrentStep(4);

      toast.success('Age verified successfully! No personal data uploaded to blockchain.');

    } catch (error) {
      console.error('Age verification error:', error);
      toast.error('Failed to verify age: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Generate buyer commitment for sharing with seller
   */
  const handleGenerateCommitment = async () => {
    if (!localWalletContract || !buyerData) {
      toast.error('Wallet not properly initialized');
      return;
    }

    setLoading(true);
    try {
      // Generate commitment through contract
      const tx = await localWalletContract.generateCommitment();
      const receipt = await tx.wait();

      // Extract commitment from event
      const event = receipt.events.find(e => e.event === 'CommitmentGenerated');
      const generatedCommitment = event.args.commitment;

      setCommitment(generatedCommitment);
      
      toast.success('Commitment generated! Share this with the seller instead of your name and phone.');

    } catch (error) {
      console.error('Commitment generation error:', error);
      toast.error('Failed to generate commitment: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Generate pickup proof for a specific package
   */
  const handleGeneratePickupProof = async (packageId) => {
    if (!buyerData || !localWalletContract) {
      toast.error('Wallet not properly initialized');
      return;
    }

    setLoading(true);
    try {
      // Get package info first
      const packageInfo = await pickupSystemContract.getPackage(
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes(packageId))
      );

      if (packageInfo.id === ethers.constants.HashZero) {
        toast.error('Package not found');
        return;
      }

      // Prepare proof inputs through contract
      const packageIdHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(packageId));
      const proofData = await localWalletContract.preparePickupProof(packageIdHash);
      
      const [secret, nameHash, phoneLastThree, age, nonce, nullifier, commitment, ageProof] = proofData;

      // Generate ZK proof
      const zkProofInputs = {
        secret,
        nameHash,
        phoneLastThree,
        age,
        nonce,
        packageId: packageIdHash,
        expectedCommitment: commitment,
        minAgeRequired: packageInfo.needsAgeCheck ? 18 : 0,
        storeAddress: packageInfo.store
      };

      const proofResult = await zkProofGenerator.generatePickupProof(zkProofInputs);

      // Create QR code data
      const qrData = {
        packageId: packageId,
        packageIdHash: packageIdHash.toString(),
        proof: proofResult.proof,
        nullifier: proofResult.nullifier,
        publicSignals: proofResult.publicSignals,
        buyerAddress: account,
        timestamp: Date.now(),
        expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
        isRealProof: !proofResult.isMock
      };

      // Generate QR code
      const qrCodeDataURL = await QRCode.toDataURL(
        JSON.stringify(qrData),
        {
          errorCorrectionLevel: 'M',
          type: 'image/png',
          quality: 0.92,
          margin: 1,
          width: 256
        }
      );

      toast.success(
        proofResult.isMock 
          ? 'Mock pickup proof generated for testing!' 
          : 'Real ZK pickup proof generated!'
      );

      return {
        qrCode: qrCodeDataURL,
        qrData,
        proofResult
      };

    } catch (error) {
      console.error('Pickup proof generation error:', error);
      toast.error('Failed to generate pickup proof: ' + error.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="buyer-app">
        <div className="buyer-header">
          <h1>👤 Buyer Interface</h1>
          <p>Please connect your wallet to continue</p>
        </div>
      </div>
    );
  }

  return (
    <div className="buyer-app">
      {/* <div className="buyer-header">
        <h1>👤 Buyer Interface</h1>
        <p>Setup your anonymous pickup wallet with EIP-7702 enhancement</p>
      </div> */}

      {/* Progress Steps */}
      <div className="progress-steps">
        <div className={`step ${currentStep >= 1 ? 'active' : ''} ${isEIP7702Enabled ? 'completed' : ''}`}>
          <div className="step-number">1</div>
          <div className="step-label">Enable EIP-7702</div>
        </div>
        <div className={`step ${currentStep >= 2 ? 'active' : ''} ${walletInitialized ? 'completed' : ''}`}>
          <div className="step-number">2</div>
          <div className="step-label">Initialize Wallet</div>
        </div>
        <div className={`step ${currentStep >= 3 ? 'active' : ''} ${ageVerified ? 'completed' : ''}`}>
          <div className="step-number">3</div>
          <div className="step-label">Verify Age</div>
        </div>
        <div className={`step ${currentStep >= 4 ? 'active' : ''}`}>
          <div className="step-number">4</div>
          <div className="step-label">Generate Proofs</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="buyer-content">
        {/* Step 1: Enable EIP-7702 */}
        {currentStep === 1 && (
          <div className="step-content">
            <h2>Step 1: Enable EIP-7702 Wallet Enhancement</h2>
            <p>
              EIP-7702 gives your wallet superpowers for anonymous pickup operations.
              This enables local commitment generation, age verification, and ZK proof preparation.
            </p>
            <div className="eip7702-info">
              <h3>What EIP-7702 enables:</h3>
              <ul>
                <li> Local commitment generation (replaces sharing name + phone)</li>
                <li> Private age verification (camera/AI, no data uploaded)</li>
                <li> ZK proof preparation for anonymous pickup</li>
                <li> Enhanced privacy protection</li>
              </ul>
            </div>
            <button 
              className="btn btn-primary"
              onClick={handleEnableEIP7702}
              disabled={loading || isEIP7702Enabled}
            >
              {loading ? 'Enabling...' : isEIP7702Enabled ? 'EIP-7702 Enabled' : 'Enable EIP-7702'}
            </button>
          </div>
        )}

        {/* Step 2: Initialize Wallet */}
        {currentStep === 2 && (
          <WalletSetup
            onInitialize={handleWalletInitialization}
            loading={loading}
            isInitialized={walletInitialized}
          />
        )}

        {/* Step 3: Age Verification */}
        {currentStep === 3 && (
          <AgeVerification
            onVerify={handleAgeVerification}
            loading={loading}
            isVerified={ageVerified}
          />
        )}

        {/* Step 4: Generate Proofs */}
        {currentStep === 4 && (
          <GenerateProof
            onGenerateCommitment={handleGenerateCommitment}
            onGeneratePickupProof={handleGeneratePickupProof}
            commitment={commitment}
            loading={loading}
            zkReady={zkReady}
            buyerData={buyerData}
          />
        )}
      </div>

      {/* Status Panel */}
      <div className="status-panel">
        <h3>Wallet Status</h3>
        <div className="status-grid">
          <div className="status-item">
            <span className="status-label">EIP-7702:</span>
            <span className={`status-value ${isEIP7702Enabled ? 'success' : 'pending'}`}>
              {isEIP7702Enabled ? 'Enabled ✅' : 'Not Enabled ❌'}
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">Wallet:</span>
            <span className={`status-value ${walletInitialized ? 'success' : 'pending'}`}>
              {walletInitialized ? 'Initialized ✅' : 'Not Initialized ❌'}
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">Age Verified:</span>
            <span className={`status-value ${ageVerified ? 'success' : 'pending'}`}>
              {ageVerified ? 'Verified ✅' : 'Not Verified ❌'}
            </span>
          </div>
          <div className="status-item">
            <span className="status-label">ZK System:</span>
            <span className={`status-value ${zkReady ? 'success' : 'warning'}`}>
              {zkReady ? 'Real Proofs ✅' : 'Mock Mode ⚠️'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BuyerApp;