import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { ethers } from 'ethers';

import { useWeb3 } from '../shared/Web3Provider';
import { useContract } from '../../hooks/useContract';
import zkProofGenerator from '../../utils/zkProof';
import QRScanner from './QRScanner';
import VerifyPickup from './VerifyPickup';

import './StoreApp.css';

const StoreApp = () => {
  const { account, isConnected } = useWeb3();
  const { pickupSystemContract } = useContract();
  
  // State management
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [storeInfo, setStoreInfo] = useState(null);
  const [currentPickup, setCurrentPickup] = useState(null);
  const [scannerActive, setScannerActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dailyStats, setDailyStats] = useState({
    todayPickups: 0,
    todayRevenue: '0',
    totalPickups: 0,
    averageRating: 0
  });
  const [recentPickups, setRecentPickups] = useState([]);

  // Check store authorization status
  useEffect(() => {
    if (isConnected && pickupSystemContract && account) {
      checkStoreStatus();
      loadStoreData();
    }
  }, [isConnected, pickupSystemContract, account]);

  /**
   * Check if store is authorized
   */
  const checkStoreStatus = async () => {
    if (!pickupSystemContract || !account) return;

    try {
      const authorized = await pickupSystemContract.authorizedStores(account);
      setIsAuthorized(authorized);

      if (authorized) {
        const info = await pickupSystemContract.getStoreInfo(account);
        setStoreInfo({
          isAuthorized: info.isAuthorized,
          storeName: info.storeName || 'Unknown Store',
          location: info.location || 'Unknown Location',
          totalPickups: info.totalPickups.toNumber(),
          commissionRate: info.commissionRate.toNumber() / 100 // Convert from basis points
        });
      }
    } catch (error) {
      console.error('Error checking store status:', error);
    }
  };

  /**
   * Load store analytics and recent activity
   */
  const loadStoreData = async () => {
    if (!isAuthorized) return;

    try {
      // Mock daily statistics
      // In production, this would come from analytics contract or indexing service
      setDailyStats({
        todayPickups: 15,
        todayRevenue: '0.25',
        totalPickups: storeInfo?.totalPickups || 0,
        averageRating: 4.7
      });

      // Mock recent pickups
      setRecentPickups([
        {
          id: 'PKG001',
          time: Date.now() - 1800000, // 30 minutes ago
          status: 'completed',
          value: '0.06'
        },
        {
          id: 'PKG002',
          time: Date.now() - 3600000, // 1 hour ago
          status: 'completed',
          value: '0.04'
        },
        {
          id: 'PKG003',
          time: Date.now() - 7200000, // 2 hours ago
          status: 'completed',
          value: '0.08'
        }
      ]);

    } catch (error) {
      console.error('Error loading store data:', error);
    }
  };

  /**
   * Start QR code scanner
   */
  const handleStartScanner = () => {
    setScannerActive(true);
    setCurrentPickup(null);
    toast.info('QR Scanner activated. Point camera at customer QR code.');
  };

  /**
   * Handle QR code scan result
   */
  const handleQRScanResult = async (qrData) => {
    setScannerActive(false);
    setLoading(true);

    try {
      // Parse QR code data
      const pickupData = typeof qrData === 'string' ? JSON.parse(qrData) : qrData;

      // Validate QR code data structure
      if (!pickupData.packageId || !pickupData.proof || !pickupData.nullifier) {
        throw new Error('Invalid QR code format');
      }

      // Check if QR code is expired
      if (pickupData.expiresAt && Date.now() > pickupData.expiresAt) {
        throw new Error('QR code has expired');
      }

      // Get package information from blockchain
      const packageIdHash = pickupData.packageIdHash || 
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes(pickupData.packageId));

      const packageInfo = await pickupSystemContract.getPackage(packageIdHash);
      
      if (packageInfo.id === ethers.constants.HashZero) {
        throw new Error('Package not found');
      }

      if (packageInfo.isPickedUp) {
        throw new Error('Package already picked up');
      }

      if (packageInfo.store.toLowerCase() !== account.toLowerCase()) {
        throw new Error('Package not assigned to this store');
      }

      // Verify ZK proof
      let proofValid = false;
      if (pickupData.isRealProof && zkProofGenerator.isSystemReady()) {
        proofValid = await zkProofGenerator.verifyProof(
          pickupData.proof,
          pickupData.publicSignals
        );
      } else {
        // Mock verification for development
        proofValid = true;
      }

      if (!proofValid) {
        throw new Error('Invalid proof - verification failed');
      }

      // Prepare pickup data
      const enrichedPickupData = {
        ...pickupData,
        packageInfo: {
          id: packageInfo.id,
          seller: packageInfo.seller,
          itemPrice: ethers.utils.formatEther(packageInfo.itemPrice),
          shippingFee: ethers.utils.formatEther(packageInfo.shippingFee),
          needsAgeCheck: packageInfo.needsAgeCheck,
          sellerPaysShipping: packageInfo.sellerPaysShipping,
          createdTime: packageInfo.createdTime.toNumber(),
          expiryTime: packageInfo.expiryTime.toNumber()
        },
        verificationStatus: 'verified',
        proofType: pickupData.isRealProof ? 'real_zk_proof' : 'mock_proof'
      };

      setCurrentPickup(enrichedPickupData);
      toast.success('QR code verified successfully!');

    } catch (error) {
      console.error('QR scan error:', error);
      toast.error('QR verification failed: ' + error.message);
      setCurrentPickup(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Execute package pickup
   */
  const handleExecutePickup = async () => {
    if (!currentPickup || !pickupSystemContract) {
      toast.error('No pickup data available');
      return;
    }

    setLoading(true);
    try {
      const { packageInfo } = currentPickup;
      
      // Prepare transaction parameters
      const packageIdHash = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes(currentPickup.packageId)
      );
      
      const nullifier = currentPickup.nullifier;
      const ageProof = packageInfo.needsAgeCheck ? 
        ethers.utils.keccak256(ethers.utils.toUtf8Bytes('age_verified_18+')) : 
        ethers.constants.HashZero;
      const commitmentProof = ethers.utils.keccak256(
        ethers.utils.toUtf8Bytes('commitment_verified')
      );

      // Calculate shipping fee payment
      const shippingPayment = packageInfo.sellerPaysShipping ? 
        0 : 
        ethers.utils.parseEther(packageInfo.shippingFee);

      // Execute pickup transaction
      const tx = await pickupSystemContract.executePickup(
        packageIdHash,
        nullifier,
        ageProof,
        commitmentProof,
        { value: shippingPayment }
      );

      await tx.wait();

      toast.success(`Pickup completed for package ${currentPickup.packageId}!`);
      
      // Update recent pickups
      const newPickup = {
        id: currentPickup.packageId,
        time: Date.now(),
        status: 'completed',
        value: (parseFloat(packageInfo.itemPrice) + parseFloat(packageInfo.shippingFee)).toFixed(3)
      };
      
      setRecentPickups(prev => [newPickup, ...prev.slice(0, 4)]);
      
      // Update daily stats
      setDailyStats(prev => ({
        ...prev,
        todayPickups: prev.todayPickups + 1,
        todayRevenue: (parseFloat(prev.todayRevenue) + parseFloat(newPickup.value)).toFixed(3)
      }));

      // Clear current pickup
      setCurrentPickup(null);
      
      // Refresh store data
      await loadStoreData();

    } catch (error) {
      console.error('Pickup execution error:', error);
      toast.error('Failed to execute pickup: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cancel current pickup
   */
  const handleCancelPickup = () => {
    setCurrentPickup(null);
    toast.info('Pickup cancelled');
  };

  /**
   * Simulate pickup for demo purposes
   */
  const handleSimulatePickup = async () => {
    const mockQRData = {
      packageId: 'PKG_DEMO_' + Date.now(),
      packageIdHash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes('PKG_DEMO')),
      proof: Array(8).fill(0).map(() => Math.random().toString()),
      nullifier: ethers.utils.keccak256(ethers.utils.toUtf8Bytes('demo_nullifier')),
      publicSignals: [],
      buyerAddress: '0x742d35Cc6634C0532925a3b8D2bC3A1239b2', // Mock address
      timestamp: Date.now(),
      expiresAt: Date.now() + (24 * 60 * 60 * 1000),
      isRealProof: false
    };

    await handleQRScanResult(mockQRData);
  };

  if (!isConnected) {
    return (
      <div className="store-app">
        <div className="store-header">
          <h1>🏬 Store Interface</h1>
          <p>Please connect your wallet to continue</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="store-app">
        <div className="store-header">
          <h1>🏬 Store Interface</h1>
          <div className="unauthorized-message">
            <h2>❌ Store Not Authorized</h2>
            <p>This wallet address is not authorized to perform pickup operations.</p>
            <p>Please contact the system administrator to authorize your store.</p>
            <div className="contact-info">
              <h3>Store Authorization Requirements:</h3>
              <ul>
                <li>Valid business registration</li>
                <li>Physical store location</li>
                <li>Staff training completion</li>
                <li>Security compliance verification</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="store-app">
      <div className="store-header">
        <h1>🏬 {storeInfo?.storeName || 'Store Interface'}</h1>
        <p>{storeInfo?.location || 'Authorized pickup location'}</p>
        
        <div className="store-status">
          <div className="status-badge success">
            ✅ Authorized Store
          </div>
          <div className="store-details">
            <span>Commission Rate: {storeInfo?.commissionRate}%</span>
            <span>Total Pickups: {storeInfo?.totalPickups}</span>
          </div>
        </div>
      </div>

      {/* Daily Statistics */}
      <div className="daily-stats">
        <h2>📊 Today's Performance</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-number">{dailyStats.todayPickups}</div>
            <div className="stat-label">Pickups Today</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{dailyStats.todayRevenue} ETH</div>
            <div className="stat-label">Revenue Today</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{dailyStats.totalPickups}</div>
            <div className="stat-label">Total Pickups</div>
          </div>
          <div className="stat-card">
            <div className="stat-number">{dailyStats.averageRating} ⭐</div>
            <div className="stat-label">Store Rating</div>
          </div>
        </div>
      </div>

      {/* Main Interface */}
      <div className="store-content">
        
        {/* QR Scanner Section */}
        {!currentPickup && (
          <div className="scanner-section">
            <h2>📱 Customer QR Scanner</h2>
            
            {scannerActive ? (
              <QRScanner
                onResult={handleQRScanResult}
                onCancel={() => setScannerActive(false)}
                loading={loading}
              />
            ) : (
              <div className="scanner-controls">
                <div className="scanner-placeholder">
                  <div className="placeholder-icon">📷</div>
                  <p>Ready to scan customer QR codes</p>
                </div>
                <button 
                  className="btn btn-primary btn-large"
                  onClick={handleStartScanner}
                  disabled={loading}
                >
                  📱 Start QR Scanner
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={handleSimulatePickup}
                  disabled={loading}
                >
                  🧪 Simulate Pickup (Demo)
                </button>
              </div>
            )}
          </div>
        )}

        {/* Pickup Verification Section */}
        {currentPickup && (
          <VerifyPickup
            pickupData={currentPickup}
            onExecute={handleExecutePickup}
            onCancel={handleCancelPickup}
            loading={loading}
          />
        )}

        {/* Recent Activity */}
        <div className="recent-activity">
          <h2>🕐 Recent Pickups</h2>
          <div className="activity-list">
            {recentPickups.length > 0 ? (
              recentPickups.map((pickup, index) => (
                <div key={index} className="activity-item">
                  <div className="activity-info">
                    <div className="package-id">{pickup.id}</div>
                    <div className="pickup-time">
                      {new Date(pickup.time).toLocaleTimeString()}
                    </div>
                  </div>
                  <div className="activity-details">
                    <span className="pickup-value">{pickup.value} ETH</span>
                    <span className={`pickup-status ${pickup.status}`}>
                      {pickup.status === 'completed' ? '✅' : '⏳'}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="no-activity">
                <p>No recent pickups</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Instructions Panel */}
      <div className="instructions-panel">
        <h3>📝 Pickup Process</h3>
        <div className="process-steps">
          <div className="step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h4>Customer Approach</h4>
              <p>Customer arrives with package ID and shows mobile QR code</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h4>Scan QR Code</h4>
              <p>Use the scanner to read customer's anonymous pickup proof</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h4>Automatic Verification</h4>
              <p>System verifies ZK proof and age requirements automatically</p>
            </div>
          </div>
          <div className="step">
            <div className="step-number">4</div>
            <div class="step-content">
              <h4>Complete Pickup</h4>
              <p>Hand over package and confirm pickup completion</p>
            </div>
          </div>
        </div>

        <div className="benefits">
          <h4>✅ Benefits of Anonymous Pickup:</h4>
          <ul>
            <li>No manual ID checking required</li>
            <li>Automatic age verification for 18+ items</li>
            <li>Reduced fraud risk with cryptographic proofs</li>
            <li>No personal data storage liability</li>
            <li>Faster processing time</li>
            <li>Enhanced customer privacy</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default StoreApp;