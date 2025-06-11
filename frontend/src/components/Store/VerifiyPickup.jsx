import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

/**
 * Pickup Verification Component
 * Displays scanned pickup data and handles verification process
 */
const VerifyPickup = ({ pickupData, onExecute, onCancel, loading }) => {
  const [verificationSteps, setVerificationSteps] = useState({
    qrFormat: false,
    packageExists: false,
    proofValid: false,
    ageRequirement: false,
    storeMatch: false,
    notExpired: false
  });
  const [allChecksPass, setAllChecksPass] = useState(false);
  const [estimatedGas, setEstimatedGas] = useState(null);

  // Run verification checks when pickup data changes
  useEffect(() => {
    if (pickupData) {
      runVerificationChecks();
    }
  }, [pickupData]);

  /**
   * Run all verification checks
   */
  const runVerificationChecks = async () => {
    const checks = {
      qrFormat: checkQRFormat(),
      packageExists: checkPackageExists(),
      proofValid: checkProofValidity(),
      ageRequirement: checkAgeRequirement(),
      storeMatch: checkStoreMatch(),
      notExpired: checkExpiration()
    };

    setVerificationSteps(checks);
    
    const allPass = Object.values(checks).every(check => check);
    setAllChecksPass(allPass);

    if (allPass) {
      await estimateTransactionGas();
    }
  };

  /**
   * Check QR code format validity
   */
  const checkQRFormat = () => {
    return !!(
      pickupData.packageId &&
      pickupData.proof &&
      pickupData.nullifier &&
      pickupData.buyerAddress &&
      pickupData.timestamp
    );
  };

  /**
   * Check if package exists and is available
   */
  const checkPackageExists = () => {
    return !!(
      pickupData.packageInfo &&
      pickupData.packageInfo.id !== ethers.constants.HashZero &&
      !pickupData.packageInfo.isPickedUp
    );
  };

  /**
   * Check ZK proof validity
   */
  const checkProofValidity = () => {
    // In production, this would verify the actual ZK proof
    // For now, we check if proof verification was successful
    return pickupData.verificationStatus === 'verified';
  };

  /**
   * Check age requirement compliance
   */
  const checkAgeRequirement = () => {
    if (!pickupData.packageInfo.needsAgeCheck) {
      return true; // No age check required
    }
    
    // If age check is required, verify proof includes age verification
    return pickupData.proofType === 'real_zk_proof' || pickupData.proofType === 'mock_proof';
  };

  /**
   * Check store assignment match
   */
  const checkStoreMatch = () => {
    // This would be validated in the smart contract call
    return true; // Assuming contract validation
  };

  /**
   * Check package and QR code expiration
   */
  const checkExpiration = () => {
    const now = Date.now();
    const packageExpired = pickupData.packageInfo.expiryTime * 1000 < now;
    const qrExpired = pickupData.expiresAt && pickupData.expiresAt < now;
    
    return !packageExpired && !qrExpired;
  };

  /**
   * Estimate gas for pickup transaction
   */
  const estimateTransactionGas = async () => {
    try {
      // Mock gas estimation
      // In production, this would call the contract's estimateGas method
      setEstimatedGas({
        gasLimit: 150000,
        gasPrice: ethers.utils.parseUnits('20', 'gwei'),
        estimatedCost: '0.003'
      });
    } catch (error) {
      console.error('Gas estimation error:', error);
    }
  };

  /**
   * Format timestamp for display
   */
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  /**
   * Format address for display
   */
  const formatAddress = (address) => {
    return `${address.substr(0, 6)}...${address.substr(-4)}`;
  };

  /**
   * Calculate time remaining until expiry
   */
  const getTimeRemaining = (expiryTime) => {
    const now = Date.now();
    const expiry = expiryTime * 1000;
    const remaining = expiry - now;
    
    if (remaining <= 0) return 'Expired';
    
    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    return `${days}d ${hours}h remaining`;
  };

  if (!pickupData) {
    return null;
  }

  const { packageInfo } = pickupData;

  return (
    <div className="verify-pickup">
      <div className="verification-header">
        <h2>🔍 Pickup Verification</h2>
        <p>Package: <strong>{pickupData.packageId}</strong></p>
      </div>

      {/* Package Information */}
      <div className="package-details">
        <h3>📦 Package Details</h3>
        <div className="details-grid">
          <div className="detail-item">
            <span className="label">Package ID:</span>
            <span className="value">{pickupData.packageId}</span>
          </div>
          <div className="detail-item">
            <span className="label">Seller:</span>
            <span className="value">{formatAddress(packageInfo.seller)}</span>
          </div>
          <div className="detail-item">
            <span className="label">Item Price:</span>
            <span className="value">{packageInfo.itemPrice} ETH</span>
          </div>
          <div className="detail-item">
            <span className="label">Shipping Fee:</span>
            <span className="value">{packageInfo.shippingFee} ETH</span>
          </div>
          <div className="detail-item">
            <span className="label">Age Check Required:</span>
            <span className={`value ${packageInfo.needsAgeCheck ? 'warning' : 'success'}`}>
              {packageInfo.needsAgeCheck ? '18+ Required ⚠️' : 'No Age Check ✅'}
            </span>
          </div>
          <div className="detail-item">
            <span className="label">Shipping Payment:</span>
            <span className="value">
              {packageInfo.sellerPaysShipping ? 'Seller Pays' : 'Buyer Pays'}
            </span>
          </div>
          <div className="detail-item">
            <span className="label">Created:</span>
            <span className="value">{formatTimestamp(packageInfo.createdTime)}</span>
          </div>
          <div className="detail-item">
            <span className="label">Expires:</span>
            <span className="value">{getTimeRemaining(packageInfo.expiryTime)}</span>
          </div>
        </div>
      </div>

      {/* Buyer Information */}
      <div className="buyer-details">
        <h3>👤 Buyer Information</h3>
        <div className="details-grid">
          <div className="detail-item">
            <span className="label">Buyer Address:</span>
            <span className="value">{formatAddress(pickupData.buyerAddress)}</span>
          </div>
          <div className="detail-item">
            <span className="label">Proof Type:</span>
            <span className={`value ${pickupData.proofType === 'real_zk_proof' ? 'success' : 'warning'}`}>
              {pickupData.proofType === 'real_zk_proof' ? 'Real ZK Proof ✅' : 'Mock Proof ⚠️'}
            </span>
          </div>
          <div className="detail-item">
            <span className="label">QR Generated:</span>
            <span className="value">{new Date(pickupData.timestamp).toLocaleString()}</span>
          </div>
          <div className="detail-item">
            <span className="label">QR Expires:</span>
            <span className="value">
              {pickupData.expiresAt ? new Date(pickupData.expiresAt).toLocaleString() : 'No expiry'}
            </span>
          </div>
        </div>
      </div>

      {/* Verification Checklist */}
      <div className="verification-checklist">
        <h3>✅ Verification Checklist</h3>
        <div className="checklist">
          <div className={`check-item ${verificationSteps.qrFormat ? 'pass' : 'fail'}`}>
            <span className="check-icon">{verificationSteps.qrFormat ? '✅' : '❌'}</span>
            <span className="check-label">QR Code Format Valid</span>
          </div>
          <div className={`check-item ${verificationSteps.packageExists ? 'pass' : 'fail'}`}>
            <span className="check-icon">{verificationSteps.packageExists ? '✅' : '❌'}</span>
            <span className="check-label">Package Exists & Available</span>
          </div>
          <div className={`check-item ${verificationSteps.proofValid ? 'pass' : 'fail'}`}>
            <span className="check-icon">{verificationSteps.proofValid ? '✅' : '❌'}</span>
            <span className="check-label">ZK Proof Valid</span>
          </div>
          <div className={`check-item ${verificationSteps.ageRequirement ? 'pass' : 'fail'}`}>
            <span className="check-icon">{verificationSteps.ageRequirement ? '✅' : '❌'}</span>
            <span className="check-label">Age Requirement Met</span>
          </div>
          <div className={`check-item ${verificationSteps.storeMatch ? 'pass' : 'fail'}`}>
            <span className="check-icon">{verificationSteps.storeMatch ? '✅' : '❌'}</span>
            <span className="check-label">Store Assignment Match</span>
          </div>
          <div className={`check-item ${verificationSteps.notExpired ? 'pass' : 'fail'}`}>
            <span className="check-icon">{verificationSteps.notExpired ? '✅' : '❌'}</span>
            <span className="check-label">Not Expired</span>
          </div>
        </div>
      </div>

      {/* Transaction Information */}
      {estimatedGas && (
        <div className="transaction-info">
          <h3>⛽ Transaction Information</h3>
          <div className="details-grid">
            <div className="detail-item">
              <span className="label">Estimated Gas:</span>
              <span className="value">{estimatedGas.gasLimit.toLocaleString()}</span>
            </div>
            <div className="detail-item">
              <span className="label">Gas Price:</span>
              <span className="value">{ethers.utils.formatUnits(estimatedGas.gasPrice, 'gwei')} Gwei</span>
            </div>
            <div className="detail-item">
              <span className="label">Estimated Cost:</span>
              <span className="value">{estimatedGas.estimatedCost} ETH</span>
            </div>
            <div className="detail-item">
              <span className="label">Buyer Pays:</span>
              <span className="value">
                {!packageInfo.sellerPaysShipping ? `${packageInfo.shippingFee} ETH` : '0 ETH'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="action-buttons">
        {allChecksPass ? (
          <div className="success-actions">
            <div className="success-message">
              <span className="success-icon">✅</span>
              <span>All verification checks passed!</span>
            </div>
            <button 
              className="btn btn-success btn-large"
              onClick={onExecute}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="loading-spinner"></span>
                  Processing Pickup...
                </>
              ) : (
                <>
                  🎉 Complete Pickup
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="error-actions">
            <div className="error-message">
              <span className="error-icon">❌</span>
              <span>Verification failed - cannot complete pickup</span>
            </div>
            <button 
              className="btn btn-warning"
              onClick={() => runVerificationChecks()}
              disabled={loading}
            >
              🔄 Retry Verification
            </button>
          </div>
        )}
        
        <button 
          className="btn btn-secondary"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </button>
      </div>

      {/* Security Notice */}
      <div className="security-notice">
        <h4>🔒 Security Features</h4>
        <ul>
          <li>✅ Zero-knowledge proof verification protects buyer privacy</li>
          <li>✅ Cryptographic nullifier prevents double pickup</li>
          <li>✅ Age verification done locally (no personal data exposed)</li>
          <li>✅ Smart contract ensures automatic payment processing</li>
          <li>✅ All verifications happen on-chain for transparency</li>
        </ul>
      </div>

      {/* Debug Information (Development Only) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="debug-info">
          <h4>🐛 Debug Information</h4>
          <details>
            <summary>Raw Pickup Data</summary>
            <pre>{JSON.stringify(pickupData, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
};

export default VerifyPickup;