import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { ethers } from 'ethers';

import { useWeb3 } from '../shared/Web3Provider';
import { useContract } from '../../hooks/useContract';
import RegisterPackage from './RegisterPackage';
import PackageList from './PackageList';

import './SellerApp.css';

const SellerApp = () => {
  const { account, isConnected } = useWeb3();
  const { pickupSystemContract } = useContract();
  
  // State management
  const [isRegistered, setIsRegistered] = useState(false);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalPackages: 0,
    successfulDeliveries: 0,
    totalRevenue: '0',
    successRate: 0
  });

  // Check seller registration status
  useEffect(() => {
    if (isConnected && pickupSystemContract && account) {
      checkSellerStatus();
      loadPackages();
    }
  }, [isConnected, pickupSystemContract, account]);

  /**
   * Check if seller is registered
   */
  const checkSellerStatus = async () => {
    if (!pickupSystemContract || !account) return;

    try {
      const registered = await pickupSystemContract.registeredSellers(account);
      setIsRegistered(registered);

      if (registered) {
        // Load seller statistics
        const sellerInfo = await pickupSystemContract.getSellerInfo(account);
        setStats({
          totalPackages: sellerInfo.totalPackages.toNumber(),
          successfulDeliveries: sellerInfo.successfulDeliveries.toNumber(),
          totalRevenue: ethers.utils.formatEther(sellerInfo.balance),
          successRate: sellerInfo.totalPackages.toNumber() > 0 
            ? (sellerInfo.successfulDeliveries.toNumber() / sellerInfo.totalPackages.toNumber() * 100).toFixed(1)
            : 0
        });
      }
    } catch (error) {
      console.error('Error checking seller status:', error);
    }
  };

  /**
   * Register as seller
   */
  const handleRegisterSeller = async () => {
    if (!pickupSystemContract) {
      toast.error('Contract not available');
      return;
    }

    setLoading(true);
    try {
      const tx = await pickupSystemContract.registerSeller();
      await tx.wait();

      setIsRegistered(true);
      toast.success('Successfully registered as seller!');
      
      // Refresh status
      await checkSellerStatus();

    } catch (error) {
      console.error('Seller registration error:', error);
      toast.error('Failed to register seller: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Register a new package
   */
  const handleRegisterPackage = async (packageData) => {
    if (!pickupSystemContract || !isRegistered) {
      toast.error('Please register as seller first');
      return;
    }

    setLoading(true);
    try {
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

      // Convert package ID to bytes32
      const packageIdHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(packageId));
      
      // Convert prices to wei
      const itemPriceWei = ethers.utils.parseEther(itemPrice.toString());
      const shippingFeeWei = ethers.utils.parseEther(shippingFee.toString());

      // Calculate total payment required
      const totalValue = sellerPaysShipping 
        ? itemPriceWei.add(shippingFeeWei)
        : itemPriceWei;

      // Register package
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

      toast.success(`Package ${packageId} registered successfully!`);
      
      // Refresh packages and stats
      await loadPackages();
      await checkSellerStatus();

    } catch (error) {
      console.error('Package registration error:', error);
      toast.error('Failed to register package: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load seller's packages
   * Note: In production, you'd need an indexing service or events to track packages
   */
  const loadPackages = async () => {
    if (!pickupSystemContract) return;

    try {
      // This is a mock implementation
      // In production, you'd query events or use The Graph for indexing
      const mockPackages = [
        {
          id: 'PKG001',
          buyerCommitment: '0x1234...5678',
          status: 'pending',
          itemPrice: '0.05',
          shippingFee: '0.01',
          createdTime: Date.now() - 86400000, // 1 day ago
          expiryTime: Date.now() + 6 * 86400000, // 6 days from now
          needsAgeCheck: true,
          store: '0x789...abc'
        },
        {
          id: 'PKG002',
          buyerCommitment: '0x5678...9abc',
          status: 'picked_up',
          itemPrice: '0.03',
          shippingFee: '0.01',
          createdTime: Date.now() - 172800000, // 2 days ago
          expiryTime: Date.now() + 5 * 86400000, // 5 days from now
          needsAgeCheck: false,
          store: '0xdef...123'
        }
      ];

      setPackages(mockPackages);

    } catch (error) {
      console.error('Error loading packages:', error);
    }
  };

  /**
   * Get store address options
   * In production, this would come from a registry
   */
  const getStoreOptions = async () => {
    // Mock store options
    return [
      {
        address: '0x8ba1f109551bD432803012645Hac136c873c',
        name: 'FamilyMart Hsinchu Science Park',
        location: 'No. 123, Park Road, Hsinchu'
      },
      {
        address: '0x2546BcD3c84621e976D8185a91A922aE77ECEc30',
        name: '7-Eleven Taipei Main Station',
        location: 'No. 456, Station Road, Taipei'
      }
    ];
  };

  if (!isConnected) {
    return (
      <div className="seller-app">
        <div className="seller-header">
          <h1>🏪 Seller Interface</h1>
          <p>Please connect your wallet to continue</p>
        </div>
      </div>
    );
  }

  return (
    <div className="seller-app">
      <div className="seller-header">
        {/* <h1>🏪 Seller Interface</h1> */}
        <p>Register packages with anonymous buyer commitments</p>
        
        {/* Registration Status */}
        <div className="registration-status">
          {isRegistered ? (
            <div className="status-badge success">
              ✅ Registered Seller
            </div>
          ) : (
            <div className="registration-prompt">
              <div className="status-badge pending">
                ❌ Not Registered
              </div>
              <button 
                className="btn btn-primary"
                onClick={handleRegisterSeller}
                disabled={loading}
              >
                {loading ? 'Registering...' : 'Register as Seller'}
              </button>
            </div>
          )}
        </div>
      </div>

      {isRegistered && (
        <>
          {/* Seller Statistics */}
          <div className="seller-stats">
            <h2>📊 Your Statistics</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-number">{stats.totalPackages}</div>
                <div className="stat-label">Total Packages</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{stats.successfulDeliveries}</div>
                <div className="stat-label">Successful Deliveries</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{stats.totalRevenue} ETH</div>
                <div className="stat-label">Total Revenue</div>
              </div>
              <div className="stat-card">
                <div className="stat-number">{stats.successRate}%</div>
                <div className="stat-label">Success Rate</div>
              </div>
            </div>
          </div>

          {/* Main Content Tabs */}
          <div className="seller-content">
            <div className="content-tabs">
              <div className="tab-nav">
                <button className="tab-btn active">📦 Register Package</button>
                <button className="tab-btn">📋 My Packages</button>
              </div>
              
              <div className="tab-content">
                {/* Register Package Tab */}
                <div className="tab-panel active">
                  <RegisterPackage
                    onRegister={handleRegisterPackage}
                    loading={loading}
                    getStoreOptions={getStoreOptions}
                  />
                </div>
                
                {/* Package List Tab - Hidden for now, will be activated by tab click */}
                <div className="tab-panel" style={{ display: 'none' }}>
                  <PackageList
                    packages={packages}
                    onRefresh={loadPackages}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Information Panel */}
          <div className="info-panel">
            <h3>ℹ️ How It Works</h3>
            <div className="info-content">
              <h4>Traditional vs Anonymous Pickup:</h4>
              <div className="comparison">
                <div className="old-way">
                  <h5>❌ Old Way:</h5>
                  <ul>
                    <li>Share buyer's name (買家姓名)</li>
                    <li>Share phone last 3 digits (電話末三碼)</li>
                    <li>Privacy concerns</li>
                    <li>Manual verification</li>
                  </ul>
                </div>
                <div className="new-way">
                  <h5>✅ New Way:</h5>
                  <ul>
                    <li>Use anonymous commitment</li>
                    <li>Zero-knowledge proof verification</li>
                    <li>Complete privacy protection</li>
                    <li>Automatic verification</li>
                  </ul>
                </div>
              </div>
              
              <h4>Package Registration Process:</h4>
              <ol>
                <li>Get buyer commitment (replaces name + phone)</li>
                <li>Set package details and pricing</li>
                <li>Choose pickup store and age requirements</li>
                <li>Pay item price + shipping (if applicable)</li>
                <li>Package is ready for anonymous pickup</li>
              </ol>
            </div>
          </div>
        </>
      )}

      {!isRegistered && (
        <div className="registration-info">
          <h2>🎯 Become a Seller</h2>
          <p>
            Register as a seller to start using the anonymous pickup system.
            Your packages will use buyer commitments instead of personal information.
          </p>
          
          <div className="benefits">
            <h3>Benefits of Anonymous Pickup:</h3>
            <ul>
              <li>Enhanced buyer privacy (no personal data sharing)</li>
              <li>Reduced fraud risk (cryptographic verification)</li>
              <li>Automated payment processing</li>
              <li>Lower liability (no personal data storage)</li>
              <li>Future-proof system (built on Web3)</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerApp;