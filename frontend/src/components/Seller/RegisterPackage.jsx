import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { ethers } from 'ethers';

/**
 * Register Package Component
 * Allows sellers to register packages with buyer commitments
 */
const RegisterPackage = ({ onRegister, loading, getStoreOptions }) => {
  const [formData, setFormData] = useState({
    packageId: '',
    buyerCommitment: '',
    storeAddress: '',
    itemPrice: '',
    shippingFee: '',
    needsAgeCheck: false,
    sellerPaysShipping: true,
    pickupDays: 7
  });
  
  const [storeOptions, setStoreOptions] = useState([]);
  const [estimatedCost, setEstimatedCost] = useState('0');
  const [formValid, setFormValid] = useState(false);

  // Load store options on mount
  useEffect(() => {
    if (getStoreOptions) {
      loadStoreOptions();
    }
  }, [getStoreOptions]);

  // Validate form and calculate costs
  useEffect(() => {
    validateForm();
    calculateEstimatedCost();
  }, [formData]);

  /**
   * Load available store options
   */
  const loadStoreOptions = async () => {
    try {
      const stores = await getStoreOptions();
      setStoreOptions(stores);
      
      // Set default store if available
      if (stores.length > 0 && !formData.storeAddress) {
        setFormData(prev => ({ ...prev, storeAddress: stores[0].address }));
      }
    } catch (error) {
      console.error('Error loading store options:', error);
      toast.error('Failed to load store options');
    }
  };

  /**
   * Validate form data
   */
  const validateForm = () => {
    const {
      packageId,
      buyerCommitment,
      storeAddress,
      itemPrice,
      shippingFee
    } = formData;

    const isValid = 
      packageId.trim() !== '' &&
      buyerCommitment.trim() !== '' &&
      storeAddress.trim() !== '' &&
      parseFloat(itemPrice) > 0 &&
      parseFloat(shippingFee) >= 0;

    setFormValid(isValid);
  };

  /**
   * Calculate estimated cost for seller
   */
  const calculateEstimatedCost = () => {
    const { itemPrice, shippingFee, sellerPaysShipping } = formData;
    
    const itemCost = parseFloat(itemPrice) || 0;
    const shippingCost = parseFloat(shippingFee) || 0;
    
    const totalCost = sellerPaysShipping ? itemCost + shippingCost : itemCost;
    setEstimatedCost(totalCost.toFixed(4));
  };

  /**
   * Handle form input changes
   */
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  /**
   * Handle form submission
   */
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formValid) {
      toast.error('Please fill all required fields correctly');
      return;
    }

    // Validate buyer commitment format
    if (!isValidCommitment(formData.buyerCommitment)) {
      toast.error('Invalid buyer commitment format');
      return;
    }

    // Validate Ethereum address
    if (!ethers.utils.isAddress(formData.storeAddress)) {
      toast.error('Invalid store address');
      return;
    }

    try {
      await onRegister(formData);
      
      // Reset form on success
      setFormData({
        packageId: '',
        buyerCommitment: '',
        storeAddress: storeOptions[0]?.address || '',
        itemPrice: '',
        shippingFee: '',
        needsAgeCheck: false,
        sellerPaysShipping: true,
        pickupDays: 7
      });
      
    } catch (error) {
      // Error handling is done in parent component
      console.error('Package registration error:', error);
    }
  };

  /**
   * Validate buyer commitment format
   */
  const isValidCommitment = (commitment) => {
    // Check if it's a valid hex string (commitment should be a large number)
    return /^(0x)?[0-9a-fA-F]+$/.test(commitment) && commitment.length >= 10;
  };

  /**
   * Generate sample package ID
   */
  const generateSamplePackageId = () => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    const sampleId = `PKG${timestamp}${random}`;
    
    setFormData(prev => ({ ...prev, packageId: sampleId }));
    toast.info('Sample package ID generated');
  };

  return (
    <div className="register-package">
      <div className="form-header">
        <h3>📦 Register New Package</h3>
        <p>Create a new package entry with anonymous buyer commitment</p>
      </div>

      <form onSubmit={handleSubmit} className="package-form">
        
        {/* Package ID */}
        <div className="form-group">
          <label htmlFor="packageId">
            Package ID (包裹配送編號) *
          </label>
          <div className="input-with-button">
            <input
              type="text"
              name="packageId"
              id="packageId"
              value={formData.packageId}
              onChange={handleInputChange}
              placeholder="e.g., PKG202412010001"
              required
            />
            <button
              type="button"
              className="btn btn-secondary btn-small"
              onClick={generateSamplePackageId}
            >
              Generate
            </button>
          </div>
          <small>Unique identifier for tracking this package</small>
        </div>

        {/* Buyer Commitment */}
        <div className="form-group">
          <label htmlFor="buyerCommitment">
            Buyer Commitment *
          </label>
          <input
            type="text"
            name="buyerCommitment"
            id="buyerCommitment"
            value={formData.buyerCommitment}
            onChange={handleInputChange}
            placeholder="Buyer provides this anonymous commitment"
            required
          />
          <small>
            🔒 Anonymous commitment from buyer (replaces 買家姓名+電話末三碼)
          </small>
        </div>

        {/* Store Selection */}
        <div className="form-group">
          <label htmlFor="storeAddress">
            Pickup Store *
          </label>
          <select
            name="storeAddress"
            id="storeAddress"
            value={formData.storeAddress}
            onChange={handleInputChange}
            required
          >
            <option value="">Select pickup store...</option>
            {storeOptions.map(store => (
              <option key={store.address} value={store.address}>
                {store.name} - {store.location}
              </option>
            ))}
          </select>
          <small>Where the buyer will collect the package</small>
        </div>

        {/* Pricing */}
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="itemPrice">
              Item Price (ETH) *
            </label>
            <input
              type="number"
              name="itemPrice"
              id="itemPrice"
              value={formData.itemPrice}
              onChange={handleInputChange}
              step="0.001"
              min="0"
              placeholder="0.050"
              required
            />
            <small>Price of the item being sold</small>
          </div>

          <div className="form-group">
            <label htmlFor="shippingFee">
              Shipping Fee (ETH) *
            </label>
            <input
              type="number"
              name="shippingFee"
              id="shippingFee"
              value={formData.shippingFee}
              onChange={handleInputChange}
              step="0.001"
              min="0"
              placeholder="0.010"
              required
            />
            <small>Cost of shipping/handling</small>
          </div>
        </div>

        {/* Payment Options */}
        <div className="form-group">
          <label>Shipping Payment</label>
          <div className="radio-group">
            <label className="radio-option">
              <input
                type="radio"
                name="sellerPaysShipping"
                value="true"
                checked={formData.sellerPaysShipping === true}
                onChange={() => setFormData(prev => ({ ...prev, sellerPaysShipping: true }))}
              />
              <span className="radio-label">Seller pays shipping (pay now)</span>
            </label>
            <label className="radio-option">
              <input
                type="radio"
                name="sellerPaysShipping"
                value="false"
                checked={formData.sellerPaysShipping === false}
                onChange={() => setFormData(prev => ({ ...prev, sellerPaysShipping: false }))}
              />
              <span className="radio-label">Buyer pays on pickup</span>
            </label>
          </div>
        </div>

        {/* Age Check */}
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="needsAgeCheck"
              checked={formData.needsAgeCheck}
              onChange={handleInputChange}
            />
            <span className="checkmark"></span>
            <span className="radio-label">18+ Age verification required</span>
          </label>
          <small>Check this for alcohol, tobacco, or other age-restricted items</small>
        </div>

        {/* Pickup Window */}
        <div className="form-group">
          <label htmlFor="pickupDays">
            Pickup Window (Days)
          </label>
          <select
            name="pickupDays"
            id="pickupDays"
            value={formData.pickupDays}
            onChange={handleInputChange}
          >
            <option value={3}>3 days</option>
            <option value={7}>7 days (recommended)</option>
            <option value={14}>14 days</option>
            <option value={30}>30 days</option>
          </select>
          <small>How long buyer has to collect the package</small>
        </div>

        {/* Cost Summary */}
        <div className="cost-summary">
          <h4>💰 Cost Summary</h4>
          <div className="summary-grid">
            <div className="summary-item">
              <span className="label">Item Price:</span>
              <span className="value">{formData.itemPrice || '0'} ETH</span>
            </div>
            <div className="summary-item">
              <span className="label">Shipping Fee:</span>
              <span className="value">{formData.shippingFee || '0'} ETH</span>
            </div>
            <div className="summary-item">
              <span className="label">You Pay Now:</span>
              <span className="value total">{estimatedCost} ETH</span>
            </div>
            {!formData.sellerPaysShipping && (
              <div className="summary-note">
                <small>Buyer will pay {formData.shippingFee || '0'} ETH shipping fee on pickup</small>
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="form-actions">
          <button
            type="submit"
            className="btn btn-primary btn-large"
            disabled={!formValid || loading}
          >
            {loading ? (
              <>
                <span className="loading-spinner"></span>
                Registering Package...
              </>
            ) : (
              <>
                📦 Register Package
              </>
            )}
          </button>
        </div>
      </form>

      {/* Information Panel */}
      <div className="info-panel">
        <h4>ℹ️ How Anonymous Registration Works</h4>
        <div className="info-content">
          <div className="info-section">
            <h5>Traditional Method:</h5>
            <ul>
              <li>❌ Collect buyer's name (買家姓名)</li>
              <li>❌ Collect phone number last 3 digits (電話末三碼)</li>
              <li>❌ Store personal information</li>
              <li>❌ Privacy concerns</li>
            </ul>
          </div>
          
          <div className="info-section">
            <h5>Anonymous Method:</h5>
            <ul>
              <li>✅ Use cryptographic commitment instead</li>
              <li>✅ No personal information stored</li>
              <li>✅ ZK proof-based verification</li>
              <li>✅ Complete buyer privacy</li>
            </ul>
          </div>
          
          <div className="info-section">
            <h5>Getting Buyer Commitment:</h5>
            <ol>
              <li>Buyer sets up EIP-7702 enhanced wallet</li>
              <li>Buyer generates anonymous commitment</li>
              <li>Buyer shares commitment with you (not personal info)</li>
              <li>You register package with commitment</li>
              <li>Buyer can pickup anonymously with ZK proof</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPackage;