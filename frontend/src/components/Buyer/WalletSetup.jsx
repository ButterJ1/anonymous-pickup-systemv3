import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

/**
 * Wallet Setup Component for EIP-7702 Enhancement
 * Allows buyers to initialize their enhanced wallet with personal data
 * All data is processed locally and securely committed to blockchain
 */
const WalletSetup = ({ onInitialize, loading, isInitialized }) => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    age: ''
  });
  const [formValid, setFormValid] = useState(false);
  const [showPrivacyInfo, setShowPrivacyInfo] = useState(false);

  // Validate form data
  useEffect(() => {
    const { name, phone, age } = formData;
    const ageNum = parseInt(age);
    
    const isValid = 
      name.trim().length >= 2 &&
      phone.trim().length >= 10 &&
      ageNum >= 1 && ageNum <= 150;
    
    setFormValid(isValid);
  }, [formData]);

  /**
   * Handle form input changes
   */
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formValid) {
      toast.error('Please fill all fields correctly');
      return;
    }

    const { name, phone, age } = formData;
    
    // Validate phone number format
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      toast.error('Phone number must be at least 10 digits');
      return;
    }

    // Validate age
    const ageNum = parseInt(age);
    if (ageNum < 1 || ageNum > 150) {
      toast.error('Please enter a valid age');
      return;
    }

    try {
      await onInitialize(name.trim(), cleanPhone, ageNum);
    } catch (error) {
      // Error handling is done in parent component
      console.error('Wallet initialization error:', error);
    }
  };

  /**
   * Generate sample data for testing
   */
  const fillSampleData = () => {
    setFormData({
      name: 'Alice Wang',
      phone: '0912345678',
      age: '25'
    });
    toast.info('Sample data filled for testing');
  };

  if (isInitialized) {
    return (
      <div className="step-content">
        <h2>✅ Wallet Initialized Successfully</h2>
        <div className="success-message">
          <p>Your EIP-7702 enhanced wallet is ready for anonymous operations!</p>
          <div className="wallet-features">
            <h3>Enhanced Features Enabled:</h3>
            <ul>
              <li>✅ Anonymous commitment generation</li>
              <li>✅ Local data processing capabilities</li>
              <li>✅ ZK proof preparation</li>
              <li>✅ Privacy-preserving operations</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="step-content">
      <h2>Step 2: Initialize Your Enhanced Wallet</h2>
      <p>
        Set up your EIP-7702 enhanced wallet with your basic information.
        This data will be processed locally and used to generate anonymous commitments.
      </p>

      <form onSubmit={handleSubmit} className="wallet-setup-form">
        
        {/* Name Input */}
        <div className="form-group">
          <label htmlFor="name">
            Full Name *
          </label>
          <input
            type="text"
            name="name"
            id="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Enter your full name"
            required
            minLength={2}
            maxLength={50}
          />
          <small>Used for generating anonymous commitments (not shared with seller)</small>
        </div>

        {/* Phone Input */}
        <div className="form-group">
          <label htmlFor="phone">
            Phone Number *
          </label>
          <input
            type="tel"
            name="phone"
            id="phone"
            value={formData.phone}
            onChange={handleInputChange}
            placeholder="0912345678"
            required
            pattern="[0-9+\-\s\(\)]+"
          />
          <small>Last 3 digits will be used for anonymous verification</small>
        </div>

        {/* Age Input */}
        <div className="form-group">
          <label htmlFor="age">
            Age *
          </label>
          <input
            type="number"
            name="age"
            id="age"
            value={formData.age}
            onChange={handleInputChange}
            placeholder="25"
            required
            min="1"
            max="150"
          />
          <small>Required for age verification (18+ items)</small>
        </div>

        {/* Privacy Information */}
        <div className="privacy-section">
          <button
            type="button"
            className="privacy-toggle"
            onClick={() => setShowPrivacyInfo(!showPrivacyInfo)}
          >
            🔒 Privacy Information {showPrivacyInfo ? '▼' : '▶'}
          </button>
          
          {showPrivacyInfo && (
            <div className="privacy-details">
              <h4>How Your Data is Protected:</h4>
              <ul>
                <li>✅ <strong>Local Processing:</strong> All data processed in your browser</li>
                <li>✅ <strong>Cryptographic Hashing:</strong> Name converted to secure hash</li>
                <li>✅ <strong>Partial Phone:</strong> Only last 3 digits used for verification</li>
                <li>✅ <strong>Anonymous Commitments:</strong> Seller receives commitment, not personal data</li>
                <li>✅ <strong>No Storage:</strong> Original data not stored on blockchain</li>
                <li>✅ <strong>ZK Proofs:</strong> Prove identity without revealing information</li>
              </ul>
              
              <h4>What Gets Stored:</h4>
              <div className="storage-comparison">
                <div className="traditional">
                  <h5>❌ Traditional Method:</h5>
                  <ul>
                    <li>Full name stored plaintext</li>
                    <li>Phone digits stored plaintext</li>
                    <li>Age stored plaintext</li>
                    <li>Personal info shared with seller</li>
                  </ul>
                </div>
                <div className="enhanced">
                  <h5>✅ EIP-7702 Enhanced:</h5>
                  <ul>
                    <li>Cryptographic secret (random)</li>
                    <li>Name hash (irreversible)</li>
                    <li>Last 3 phone digits only</li>
                    <li>Anonymous commitment shared</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Form Actions */}
        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-primary btn-large"
            disabled={!formValid || loading}
          >
            {loading ? (
              <>
                <span className="loading-spinner"></span>
                Initializing Wallet...
              </>
            ) : (
              <>
                🚀 Initialize Enhanced Wallet
              </>
            )}
          </button>
          
          <button
            type="button"
            className="btn btn-secondary"
            onClick={fillSampleData}
            disabled={loading}
          >
            🧪 Fill Sample Data
          </button>
        </div>
      </form>

      {/* Information Panel */}
      <div className="info-panel">
        <h3>ℹ️ EIP-7702 Wallet Enhancement</h3>
        <div className="info-content">
          <h4>What is EIP-7702?</h4>
          <p>
            EIP-7702 allows your regular wallet to temporarily gain smart contract capabilities.
            This enables advanced privacy features while keeping your existing wallet.
          </p>
          
          <h4>Benefits for Anonymous Pickup:</h4>
          <ul>
            <li><strong>Privacy:</strong> Generate commitments instead of sharing personal data</li>
            <li><strong>Security:</strong> Local processing prevents data leaks</li>
            <li><strong>Convenience:</strong> No need for separate smart contract wallet</li>
            <li><strong>Flexibility:</strong> Can be disabled when not needed</li>
          </ul>
          
          <h4>How It Works:</h4>
          <ol>
            <li>Your wallet delegates code execution to LocalWallet contract</li>
            <li>Enhanced wallet can generate commitments locally</li>
            <li>Age verification processed with camera/AI (no upload)</li>
            <li>ZK proofs generated for anonymous pickup</li>
            <li>Seller receives commitment, not personal information</li>
          </ol>
        </div>
      </div>

      {/* Security Notice */}
      <div className="security-notice">
        <h4>🛡️ Security Guarantee</h4>
        <p>
          Your personal information never leaves your device in plaintext. 
          The system uses cryptographic commitments and zero-knowledge proofs 
          to protect your privacy while enabling secure package pickup.
        </p>
      </div>
    </div>
  );
};

export default WalletSetup;