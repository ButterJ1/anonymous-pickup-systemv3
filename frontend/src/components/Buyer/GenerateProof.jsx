import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import QRCode from 'qrcode';

/**
 * Generate Proof Component
 * Handles commitment generation and ZK proof creation for package pickup
 */
const GenerateProof = ({ 
  onGenerateCommitment, 
  onGeneratePickupProof, 
  commitment, 
  loading, 
  zkReady,
  buyerData 
}) => {
  const [selectedOperation, setSelectedOperation] = useState('commitment');
  const [packageId, setPackageId] = useState('');
  const [generatedProof, setGeneratedProof] = useState(null);
  const [qrCodeData, setQrCodeData] = useState(null);
  const [showQRModal, setShowQRModal] = useState(false);

  /**
   * Handle commitment generation
   */
  const handleGenerateCommitment = async () => {
    try {
      await onGenerateCommitment();
    } catch (error) {
      console.error('Commitment generation error:', error);
    }
  };

  /**
   * Handle pickup proof generation
   */
  const handleGeneratePickupProof = async () => {
    if (!packageId.trim()) {
      toast.error('Please enter a package ID');
      return;
    }

    try {
      const proofResult = await onGeneratePickupProof(packageId.trim());
      
      if (proofResult) {
        setGeneratedProof(proofResult);
        setQrCodeData(proofResult.qrData);
        setShowQRModal(true);
      }
    } catch (error) {
      console.error('Pickup proof generation error:', error);
    }
  };

  /**
   * Copy commitment to clipboard
   */
  const copyCommitment = async () => {
    if (!commitment) return;
    
    try {
      await navigator.clipboard.writeText(commitment.toString());
      toast.success('Commitment copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy commitment');
    }
  };

  /**
   * Save QR code image
   */
  const saveQRCode = () => {
    if (!generatedProof?.qrCode) return;

    const link = document.createElement('a');
    link.download = `pickup-proof-${packageId}.png`;
    link.href = generatedProof.qrCode;
    link.click();
  };

  /**
   * Generate sample package ID
   */
  const generateSamplePackageId = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    const sampleId = `PKG${timestamp}${random}`;
    setPackageId(sampleId);
    toast.info('Sample package ID generated');
  };

  return (
    <div className="step-content">
      <h2>Step 4: Generate Anonymous Proofs</h2>
      <p>
        Your wallet is ready! Generate commitments to share with sellers or 
        create pickup proofs for anonymous package collection.
      </p>

      {/* Operation Selector */}
      <div className="operation-selector">
        <div className="selector-tabs">
          <button
            className={`tab-btn ${selectedOperation === 'commitment' ? 'active' : ''}`}
            onClick={() => setSelectedOperation('commitment')}
          >
            🏷️ Generate Commitment
          </button>
          <button
            className={`tab-btn ${selectedOperation === 'pickup' ? 'active' : ''}`}
            onClick={() => setSelectedOperation('pickup')}
          >
            📱 Create Pickup Proof
          </button>
        </div>
      </div>

      {/* Commitment Generation */}
      {selectedOperation === 'commitment' && (
        <div className="commitment-section">
          <h3>Anonymous Commitment</h3>
          <p>
            Generate an anonymous commitment to share with sellers instead of 
            your personal information (name + phone digits).
          </p>

          {commitment ? (
            <div className="commitment-display">
              <h4>✅ Your Anonymous Commitment:</h4>
              <div className="commitment-box">
                <div className="commitment-value">
                  {commitment.toString()}
                </div>
                <button 
                  className="btn btn-secondary btn-small"
                  onClick={copyCommitment}
                >
                  📋 Copy
                </button>
              </div>
              
              <div className="commitment-info">
                <h5>How to use this commitment:</h5>
                <ol>
                  <li>Share this commitment with the seller (not your name/phone)</li>
                  <li>Seller registers package with your commitment</li>
                  <li>You can pickup anonymously using ZK proofs</li>
                  <li>Your personal information stays private</li>
                </ol>
              </div>
              
              <button 
                className="btn btn-primary"
                onClick={handleGenerateCommitment}
                disabled={loading}
              >
                🔄 Regenerate Commitment
              </button>
            </div>
          ) : (
            <div className="commitment-generate">
              <div className="generate-info">
                <h4>Ready to Generate:</h4>
                <ul>
                  <li>✅ Name hash: {buyerData?.nameHash ? 'Ready' : 'Missing'}</li>
                  <li>✅ Phone digits: {buyerData?.phoneLastThree ? 'Ready' : 'Missing'}</li>
                  <li>✅ Secret key: {buyerData?.secret ? 'Ready' : 'Missing'}</li>
                </ul>
              </div>
              
              <button 
                className="btn btn-primary btn-large"
                onClick={handleGenerateCommitment}
                disabled={loading || !buyerData}
              >
                {loading ? (
                  <>
                    <span className="loading-spinner"></span>
                    Generating...
                  </>
                ) : (
                  <>
                    🏷️ Generate Anonymous Commitment
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Pickup Proof Generation */}
      {selectedOperation === 'pickup' && (
        <div className="pickup-section">
          <h3>Pickup Proof Generation</h3>
          <p>
            Create a QR code with zero-knowledge proof for anonymous package pickup.
          </p>

          <div className="pickup-form">
            <div className="form-group">
              <label htmlFor="packageId">
                Package ID *
              </label>
              <div className="input-with-button">
                <input
                  type="text"
                  name="packageId"
                  id="packageId"
                  value={packageId}
                  onChange={(e) => setPackageId(e.target.value)}
                  placeholder="Enter package ID to pickup"
                />
                <button
                  className="btn btn-secondary btn-small"
                  onClick={generateSamplePackageId}
                >
                  Generate Sample
                </button>
              </div>
              <small>Package ID provided by the seller</small>
            </div>

            <div className="zk-status">
              <h4>🔮 ZK Proof System Status:</h4>
              <div className={`status-item ${zkReady ? 'success' : 'warning'}`}>
                <span className="status-icon">{zkReady ? '✅' : '⚠️'}</span>
                <span className="status-text">
                  {zkReady ? 'Real ZK Proofs Ready' : 'Mock Mode (Development)'}
                </span>
              </div>
              {!zkReady && (
                <small>
                  Circuit files not loaded. Using mock proofs for development.
                  Real proofs require compiled circuits.
                </small>
              )}
            </div>

            <button 
              className="btn btn-success btn-large"
              onClick={handleGeneratePickupProof}
              disabled={loading || !packageId.trim()}
            >
              {loading ? (
                <>
                  <span className="loading-spinner"></span>
                  Generating Proof...
                </>
              ) : (
                <>
                  🔮 Generate Pickup Proof
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRModal && qrCodeData && (
        <div className="qr-modal-overlay" onClick={() => setShowQRModal(false)}>
          <div className="qr-modal" onClick={(e) => e.stopPropagation()}>
            <div className="qr-modal-header">
              <h3>📱 Pickup QR Code</h3>
              <button 
                className="close-btn"
                onClick={() => setShowQRModal(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="qr-modal-content">
              <div className="qr-code-display">
                <img 
                  src={generatedProof.qrCode} 
                  alt="Pickup QR Code"
                  className="qr-image"
                />
              </div>
              
              <div className="qr-info">
                <h4>Pickup Information:</h4>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="label">Package ID:</span>
                    <span className="value">{qrCodeData.packageId}</span>
                  </div>
                  <div className="info-item">
                    <span className="label">Proof Type:</span>
                    <span className={`value ${qrCodeData.isRealProof ? 'success' : 'warning'}`}>
                      {qrCodeData.isRealProof ? 'Real ZK Proof ✅' : 'Mock Proof ⚠️'}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="label">Generated:</span>
                    <span className="value">
                      {new Date(qrCodeData.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="label">Expires:</span>
                    <span className="value">
                      {new Date(qrCodeData.expiresAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="qr-actions">
                <button 
                  className="btn btn-primary"
                  onClick={saveQRCode}
                >
                  💾 Save QR Code
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowQRModal(false)}
                >
                  Close
                </button>
              </div>
              
              <div className="usage-instructions">
                <h4>📋 How to Use:</h4>
                <ol>
                  <li>Save or screenshot this QR code</li>
                  <li>Go to the pickup store</li>
                  <li>Show the QR code to store staff</li>
                  <li>Staff will scan and verify your proof</li>
                  <li>Complete anonymous pickup!</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Information Panel */}
      <div className="info-panel">
        <h3>ℹ️ Anonymous Proof System</h3>
        <div className="info-content">
          <h4>Two Types of Proofs:</h4>
          
          <div className="proof-comparison">
            <div className="commitment-info">
              <h5>Anonymous Commitment:</h5>
              <ul>
                <li>Replaces sharing name + phone digits</li>
                <li>Generated from your private data</li>
                <li>Share with seller during ordering</li>
                <li>Enables anonymous package registration</li>
              </ul>
            </div>
            
            <div className="pickup-info">
              <h5>Pickup Proof:</h5>
              <ul>
                <li>Zero-knowledge proof of ownership</li>
                <li>Includes age verification (if needed)</li>
                <li>Prevents double pickup with nullifiers</li>
                <li>QR code for easy store scanning</li>
              </ul>
            </div>
          </div>
          
          <h4>Privacy Features:</h4>
          <ul>
            <li>✅ No personal data shared with seller</li>
            <li>✅ No personal data stored on blockchain</li>
            <li>✅ Age verification done locally (camera/AI)</li>
            <li>✅ Cryptographic proofs prevent fraud</li>
            <li>✅ Unique nullifiers prevent double pickup</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default GenerateProof;