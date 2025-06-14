import React, { useState, useEffect, useCallback } from 'react';
import { 
  Shield, Package, QrCode, Users, Camera, Smartphone, 
  CheckCircle, AlertCircle, Clock, Eye, EyeOff, Copy, Check, 
  Zap, Store, User, CreditCard, Key, Hash, Loader, 
  ArrowRight, ArrowDown, Wifi, WifiOff, Moon, Sun
} from 'lucide-react';

// Mock ZK Circuit and EIP-7702 functionality for demo
const mockSnarkjs = {
  groth16: {
    fullProve: async (inputs, wasmPath, zkeyPath) => {
      await new Promise(resolve => setTimeout(resolve, 3000));
      return {
        proof: {
          pi_a: ["0x1234567890abcdef", "0xfedcba0987654321"],
          pi_b: [["0xabcdef1234567890", "0x0987654321fedcba"], ["0x1111222233334444", "0x5555666677778888"]],
          pi_c: ["0x9999aaaabbbbcccc", "0xddddeeeeffffaaaa"]
        },
        publicSignals: [
          "0x" + Math.random().toString(16).substring(2, 18) + "000000000000000000000000000000000000000000000000", // group_signature
          "0x" + Math.random().toString(16).substring(2, 18) + "111111111111111111111111111111111111111111111111", // nullifier  
          "1", // age_verified
          inputs.package_id,
          inputs.min_age_required
        ]
      };
    }
  }
};

const mockEthers = {
  generateCommitment: (secret, nameHash, phoneLastThree, nonce) => {
    return "0x" + Math.random().toString(16).substring(2, 66);
  },
  keccak256: (data) => {
    return "0x" + Math.random().toString(16).substring(2, 66);
  }
};

const AnonymousPickupSystem = () => {
  // Core State
  const [currentPhase, setCurrentPhase] = useState(0); // 0: Setup, 1: Order, 2: Store, 3: Pickup
  const [currentStep, setCurrentStep] = useState(0);
  const [darkMode, setDarkMode] = useState(false);
  
  // EIP-7702 Smart EOA State
  const [smartEOADelegated, setSmartEOADelegated] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [buyerCommitment, setBuyerCommitment] = useState('');
  
  // User Identity State
  const [userIdentity, setUserIdentity] = useState({
    name: '',
    phone: '',
    age: '',
    secret: '',
    nameHash: '',
    phoneLastThree: '',
    nonce: ''
  });
  
  // Age Verification State
  const [ageVerified, setAgeVerified] = useState(false);
  const [ageVerificationExpiry, setAgeVerificationExpiry] = useState(null);
  
  // Package & Commitment State
  const [packageData, setPackageData] = useState({
    packageId: '',
    sellerCommitment: '',
    storeCommitment: '',
    needsAgeCheck: false,
    itemPrice: '',
    shippingFee: '',
    storeAddress: ''
  });
  
  // ZK Proof State
  const [circuitsLoaded, setCircuitsLoaded] = useState(false);
  const [proof, setProof] = useState(null);
  const [proving, setProving] = useState(false);
  
  // UI State
  const [loading, setLoading] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);
  const [copied, setCopied] = useState('');
  const [notifications, setNotifications] = useState([]);

  // Simulate circuit loading
  useEffect(() => {
    const timer = setTimeout(() => setCircuitsLoaded(true), 2000);
    return () => clearTimeout(timer);
  }, []);

  // Check age verification validity
  const isAgeVerificationValid = useCallback(() => {
    if (!ageVerificationExpiry) return false;
    return Date.now() < ageVerificationExpiry;
  }, [ageVerificationExpiry]);

  // Generate random secrets for demo
  const generateSecrets = () => {
    const secret = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const nameHash = mockEthers.keccak256(userIdentity.name);
    const phoneLastThree = userIdentity.phone.slice(-3);
    const nonce = Math.random().toString(36).substring(2, 15);
    
    return { secret, nameHash, phoneLastThree, nonce };
  };

  // EIP-7702 Smart EOA Delegation
  const delegateSmartEOA = async () => {
    setLoading(true);
    try {
      // Generate secrets
      const secrets = generateSecrets();
      setUserIdentity(prev => ({ ...prev, ...secrets }));
      
      // Generate buyer commitment using EIP-7702 LocalWallet
      const commitment = mockEthers.generateCommitment(
        secrets.secret, 
        secrets.nameHash, 
        secrets.phoneLastThree, 
        secrets.nonce
      );
      
      setBuyerCommitment(commitment);
      
      // Simulate EIP-7702 delegation transaction
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      const mockAddress = '0x' + Math.random().toString(16).substring(2, 42);
      setWalletAddress(mockAddress);
      setSmartEOADelegated(true);
      
      addNotification('Smart EOA delegated successfully!', 'success');
      setCurrentPhase(1);
      setCurrentStep(0);
      
    } catch (error) {
      addNotification('Smart EOA delegation failed: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Local Age Verification (20-day validity)
  const performAgeVerification = async () => {
    setLoading(true);
    try {
      // Simulate camera-based age verification
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setAgeVerified(true);
      const expiry = Date.now() + (20 * 24 * 60 * 60 * 1000); // 20 days
      setAgeVerificationExpiry(expiry);
      
      addNotification('Age verified locally (valid for 20 days)', 'success');
      
    } catch (error) {
      addNotification('Age verification failed: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Generate Store Commitment (Charlie's action)
  const generateStoreCommitment = async () => {
    setLoading(true);
    try {
      // Simulate store staff generating commitment
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const storeSecret = "store_secret_key_" + Math.random().toString(36).substring(2, 10);
      const storeCommitment = mockEthers.keccak256(
        packageData.sellerCommitment + storeSecret + packageData.packageId
      );
      
      setPackageData(prev => ({ ...prev, storeCommitment }));
      addNotification('Store commitment generated by staff', 'success');
      setCurrentStep(1);
      
    } catch (error) {
      addNotification('Store commitment generation failed: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Generate ZK Group Signature Proof
  const generateZKProof = async () => {
    if (!circuitsLoaded) {
      addNotification('ZK Circuits not loaded yet', 'error');
      return;
    }

    // Check age verification if needed
    if (packageData.needsAgeCheck && (!ageVerified || !isAgeVerificationValid())) {
      addNotification('Age verification required or expired', 'error');
      return;
    }

    setProving(true);
    try {
      // Prepare circuit inputs for group signature
      const circuitInputs = {
        // Private inputs (Alice's secrets)
        buyer_secret: userIdentity.secret,
        buyer_name_hash: userIdentity.nameHash,
        buyer_phone_last_three: userIdentity.phoneLastThree,
        buyer_nonce: userIdentity.nonce,
        buyer_age: userIdentity.age,
        
        // Public inputs (three-party commitments)
        buyer_commitment: buyerCommitment,
        seller_commitment: packageData.sellerCommitment,
        store_commitment: packageData.storeCommitment,
        
        // Package verification
        package_id: packageData.packageId,
        min_age_required: packageData.needsAgeCheck ? "18" : "0"
      };

      // Generate ZK proof using group signature circuit
      const result = await mockSnarkjs.groth16.fullProve(
        circuitInputs,
        '/circuits/pickup-group-signature.wasm',
        '/circuits/pickup-group-signature_final.zkey'
      );

      setProof(result);
      addNotification('Group signature proof generated!', 'success');
      setCurrentStep(2);
      
    } catch (error) {
      addNotification('Proof generation failed: ' + error.message, 'error');
    } finally {
      setProving(false);
    }
  };

  // Submit proof and complete pickup
  const completePickup = async () => {
    setLoading(true);
    try {
      // Alice submits proof to blockchain herself
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      addNotification('Package picked up successfully! 🎉', 'success');
      setCurrentPhase(3);
      setCurrentStep(0);
      
    } catch (error) {
      addNotification('Pickup completion failed: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Utility functions
  const addNotification = (message, type) => {
    const id = Math.random().toString(36).substring(7);
    setNotifications(prev => [...prev, { id, message, type, timestamp: Date.now() }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(''), 2000);
  };

  const resetDemo = () => {
    setCurrentPhase(0);
    setCurrentStep(0);
    setSmartEOADelegated(false);
    setWalletAddress('');
    setBuyerCommitment('');
    setUserIdentity({ name: '', phone: '', age: '', secret: '', nameHash: '', phoneLastThree: '', nonce: '' });
    setAgeVerified(false);
    setAgeVerificationExpiry(null);
    setPackageData({ packageId: '', sellerCommitment: '', storeCommitment: '', needsAgeCheck: false, itemPrice: '', shippingFee: '', storeAddress: '' });
    setProof(null);
    setNotifications([]);
  };

  const phases = [
    { title: "Smart EOA Setup", icon: Shield, color: "blue" },
    { title: "Order & Package", icon: Package, color: "green" }, 
    { title: "Store Pickup", icon: Store, color: "purple" },
    { title: "Complete", icon: CheckCircle, color: "emerald" }
  ];

  return (
    <div className={`min-h-screen transition-all duration-300 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className={`sticky top-0 z-50 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b backdrop-blur-sm`}>
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
                <Package className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Anonymous Pickup System
                </h1>
                <p className="text-sm opacity-70">EIP-7702 + ZK Group Signatures</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${circuitsLoaded ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`}></div>
                <span className="text-xs">ZK Circuits</span>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${smartEOADelegated ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                <span className="text-xs">Smart EOA</span>
              </div>
              
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-lg transition-colors ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-100 hover:bg-gray-200'}`}
              >
                {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="fixed top-20 right-4 z-50 space-y-2">
        {notifications.map(notif => (
          <div
            key={notif.id}
            className={`p-3 rounded-lg shadow-lg flex items-center space-x-2 animate-slide-in-right ${
              notif.type === 'success' ? 'bg-green-500 text-white' :
              notif.type === 'error' ? 'bg-red-500 text-white' :
              'bg-blue-500 text-white'
            }`}
          >
            {notif.type === 'success' ? <CheckCircle className="h-4 w-4" /> : 
             notif.type === 'error' ? <AlertCircle className="h-4 w-4" /> : 
             <Loader className="h-4 w-4" />}
            <span className="text-sm">{notif.message}</span>
          </div>
        ))}
      </div>

      {/* Phase Progress */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-8">
          {phases.map((phase, index) => {
            const Icon = phase.icon;
            const isActive = index === currentPhase;
            const isCompleted = index < currentPhase;
            
            return (
              <div key={index} className="flex items-center">
                <div className={`relative w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-500 ${
                  isCompleted ? `bg-${phase.color}-500 border-${phase.color}-500 text-white scale-110` :
                  isActive ? `border-${phase.color}-500 bg-${phase.color}-50 text-${phase.color}-600 scale-110 shadow-lg` :
                  darkMode ? 'border-gray-600 text-gray-400' : 'border-gray-300 text-gray-400'
                }`}>
                  <Icon className="h-6 w-6" />
                  {isActive && (
                    <div className={`absolute -inset-1 rounded-full bg-${phase.color}-500 opacity-20 animate-pulse`}></div>
                  )}
                </div>
                
                <div className={`ml-3 ${index < phases.length - 1 ? 'mr-8' : ''}`}>
                  <div className={`text-sm font-medium ${
                    isActive ? `text-${phase.color}-600` : 
                    isCompleted ? `text-${phase.color}-500` : 
                    'text-gray-500'
                  }`}>
                    {phase.title}
                  </div>
                </div>
                
                {index < phases.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-4 transition-all duration-500 ${
                    isCompleted ? `bg-${phase.color}-500` : 
                    darkMode ? 'bg-gray-700' : 'bg-gray-300'
                  }`}></div>
                )}
              </div>
            );
          })}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Panel */}
          <div className="lg:col-span-2">
            <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl shadow-xl border overflow-hidden`}>
              
              {/* Phase 0: Smart EOA Setup */}
              {currentPhase === 0 && (
                <div className="p-8">
                  <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Shield className="h-10 w-10 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold mb-2">Setup Anonymous Wallet</h2>
                    <p className="text-gray-600 dark:text-gray-400 text-lg">
                      Enable EIP-7702 Smart EOA for privacy-preserving pickups
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Full Name</label>
                        <input
                          type="text"
                          value={userIdentity.name}
                          onChange={(e) => setUserIdentity(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Your real name (stays private)"
                          className={`w-full p-4 rounded-xl border-2 transition-all duration-200 ${
                            darkMode 
                              ? 'bg-gray-700 border-gray-600 focus:border-blue-500 text-white' 
                              : 'bg-gray-50 border-gray-200 focus:border-blue-500'
                          } focus:outline-none focus:ring-4 focus:ring-blue-500/20`}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Age</label>
                        <input
                          type="number"
                          value={userIdentity.age}
                          onChange={(e) => setUserIdentity(prev => ({ ...prev, age: e.target.value }))}
                          placeholder="Your age"
                          min="13"
                          max="120"
                          className={`w-full p-4 rounded-xl border-2 transition-all duration-200 ${
                            darkMode 
                              ? 'bg-gray-700 border-gray-600 focus:border-blue-500 text-white' 
                              : 'bg-gray-50 border-gray-200 focus:border-blue-500'
                          } focus:outline-none focus:ring-4 focus:ring-blue-500/20`}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Phone Number</label>
                      <input
                        type="tel"
                        value={userIdentity.phone}
                        onChange={(e) => setUserIdentity(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="Your phone number"
                        className={`w-full p-4 rounded-xl border-2 transition-all duration-200 ${
                          darkMode 
                            ? 'bg-gray-700 border-gray-600 focus:border-blue-500 text-white' 
                            : 'bg-gray-50 border-gray-200 focus:border-blue-500'
                        } focus:outline-none focus:ring-4 focus:ring-blue-500/20`}
                      />
                      <p className="text-xs text-gray-500 mt-2">Only last 3 digits are used in ZK proofs</p>
                    </div>

                    <div className={`${darkMode ? 'bg-blue-900/20 border-blue-700' : 'bg-blue-50 border-blue-200'} border rounded-xl p-4`}>
                      <div className="flex items-start space-x-3">
                        <Shield className="h-5 w-5 text-blue-500 mt-1" />
                        <div>
                          <h3 className="font-medium text-blue-800 dark:text-blue-300 mb-1">Privacy Protection</h3>
                          <p className="text-sm text-blue-700 dark:text-blue-400">
                            Your personal information is processed locally using EIP-7702 Smart EOA. 
                            Only cryptographic commitments are stored on-chain.
                          </p>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={delegateSmartEOA}
                      disabled={loading || !userIdentity.name || !userIdentity.phone || !userIdentity.age}
                      className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center space-x-3 shadow-lg disabled:shadow-none transform hover:scale-[1.02] disabled:scale-100"
                    >
                      {loading ? (
                        <>
                          <Loader className="h-5 w-5 animate-spin" />
                          <span>Delegating Smart EOA...</span>
                        </>
                      ) : (
                        <>
                          <Zap className="h-5 w-5" />
                          <span>Enable Anonymous Pickup</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Phase 1: Order & Package Management */}
              {currentPhase === 1 && (
                <div className="p-8">
                  <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Package className="h-10 w-10 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold mb-2">Package Registration</h2>
                    <p className="text-gray-600 dark:text-gray-400 text-lg">
                      Order placed! Package registered with anonymous commitment
                    </p>
                  </div>

                  <div className="space-y-6">
                    {/* Demo order form */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Package ID</label>
                        <input
                          type="text"
                          value={packageData.packageId}
                          onChange={(e) => setPackageData(prev => ({ ...prev, packageId: e.target.value }))}
                          placeholder="Enter or generate package ID"
                          className={`w-full p-3 rounded-lg border ${
                            darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300'
                          } focus:outline-none focus:ring-2 focus:ring-green-500`}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-2">Store Address</label>
                        <input
                          type="text"
                          value={packageData.storeAddress}
                          onChange={(e) => setPackageData(prev => ({ ...prev, storeAddress: e.target.value }))}
                          placeholder="Pickup store location"
                          className={`w-full p-3 rounded-lg border ${
                            darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300'
                          } focus:outline-none focus:ring-2 focus:ring-green-500`}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">Item Price</label>
                        <input
                          type="text"
                          value={packageData.itemPrice}
                          onChange={(e) => setPackageData(prev => ({ ...prev, itemPrice: e.target.value }))}
                          placeholder="Item price"
                          className={`w-full p-3 rounded-lg border ${
                            darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300'
                          } focus:outline-none focus:ring-2 focus:ring-green-500`}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-2">Shipping Fee</label>
                        <input
                          type="text"
                          value={packageData.shippingFee}
                          onChange={(e) => setPackageData(prev => ({ ...prev, shippingFee: e.target.value }))}
                          placeholder="Shipping fee"
                          className={`w-full p-3 rounded-lg border ${
                            darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-gray-50 border-gray-300'
                          } focus:outline-none focus:ring-2 focus:ring-green-500`}
                        />
                      </div>
                    </div>

                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="ageCheck"
                        checked={packageData.needsAgeCheck}
                        onChange={(e) => setPackageData(prev => ({ ...prev, needsAgeCheck: e.target.checked }))}
                        className="h-4 w-4 text-green-600 rounded focus:ring-green-500"
                      />
                      <label htmlFor="ageCheck" className="text-sm font-medium">
                        This package requires 18+ age verification
                      </label>
                    </div>

                    <button
                      onClick={() => {
                        const pkgId = 'PKG-' + Math.random().toString(36).substr(2, 9).toUpperCase();
                        const sellerCommitment = "0x" + Math.random().toString(16).substring(2, 66);
                        setPackageData(prev => ({
                          ...prev,
                          packageId: pkgId,
                          sellerCommitment: sellerCommitment,
                          storeAddress: prev.storeAddress || "7-Eleven Branch A",
                          itemPrice: prev.itemPrice || "$25.99",
                          shippingFee: prev.shippingFee || "$3.99"
                        }));
                        addNotification('Package registered with seller commitment', 'success');
                        setCurrentPhase(2);
                      }}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-medium py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center space-x-3 shadow-lg transform hover:scale-[1.02]"
                    >
                      <Package className="h-5 w-5" />
                      <span>Register Package (Demo)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Phase 2: Store Pickup Process */}
              {currentPhase === 2 && (
                <div className="p-8">
                  <div className="text-center mb-8">
                    <div className="w-20 h-20 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Store className="h-10 w-10 text-white" />
                    </div>
                    <h2 className="text-3xl font-bold mb-2">Store Pickup Process</h2>
                    <p className="text-gray-600 dark:text-gray-400 text-lg">
                      Two-step anonymous verification
                    </p>
                  </div>

                  {/* Step indicator */}
                  <div className="flex items-center justify-center mb-8">
                    <div className="flex items-center space-x-4">
                      {['Show QR Code', 'Generate Proof', 'Complete Pickup'].map((step, index) => (
                        <div key={index} className="flex items-center">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                            index <= currentStep 
                              ? 'bg-purple-500 text-white' 
                              : darkMode ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-500'
                          }`}>
                            {index + 1}
                          </div>
                          {index < 2 && (
                            <ArrowRight className={`h-4 w-4 mx-2 ${
                              index < currentStep ? 'text-purple-500' : 'text-gray-400'
                            }`} />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Step 0: Show QR Code to Store */}
                  {currentStep === 0 && (
                    <div className="space-y-6">
                      <div className={`${darkMode ? 'bg-purple-900/20 border-purple-700' : 'bg-purple-50 border-purple-200'} border rounded-xl p-6`}>
                        <div className="flex items-center space-x-3 mb-4">
                          <QrCode className="h-6 w-6 text-purple-600" />
                          <h3 className="font-semibold text-purple-800 dark:text-purple-300">Show QR Code to Store Staff</h3>
                        </div>
                        
                        <div className="text-center py-8">
                          <div className="w-32 h-32 bg-gray-800 dark:bg-gray-200 rounded-lg mx-auto mb-4 flex items-center justify-center">
                            <QrCode className="h-16 w-16 text-white dark:text-gray-800" />
                          </div>
                          <p className="text-sm text-purple-700 dark:text-purple-400">
                            QR Code contains seller commitment: {packageData.sellerCommitment?.slice(0, 10)}...
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={generateStoreCommitment}
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center space-x-3 shadow-lg transform hover:scale-[1.02] disabled:scale-100"
                      >
                        {loading ? (
                          <>
                            <Loader className="h-5 w-5 animate-spin" />
                            <span>Store Processing...</span>
                          </>
                        ) : (
                          <>
                            <Store className="h-5 w-5" />
                            <span>Store Staff: Generate Commitment</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Step 1: Generate ZK Proof */}
                  {currentStep === 1 && (
                    <div className="space-y-6">
                      {/* Age verification check */}
                      {packageData.needsAgeCheck && (
                        <div className={`${darkMode ? 'bg-orange-900/20 border-orange-700' : 'bg-orange-50 border-orange-200'} border rounded-xl p-4`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <Camera className="h-5 w-5 text-orange-600" />
                              <span className="font-medium text-orange-800 dark:text-orange-300">Age Verification Required</span>
                            </div>
                            
                            {ageVerified && isAgeVerificationValid() ? (
                              <div className="flex items-center space-x-2 text-green-600">
                                <CheckCircle className="h-4 w-4" />
                                <span className="text-sm">Valid for {Math.ceil((ageVerificationExpiry - Date.now()) / (24 * 60 * 60 * 1000))} days</span>
                              </div>
                            ) : (
                              <button
                                onClick={performAgeVerification}
                                disabled={loading}
                                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg text-sm flex items-center space-x-2"
                              >
                                {loading ? <Loader className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                                <span>Verify Age</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-xl p-6`}>
                        <h3 className="font-semibold mb-4 flex items-center space-x-2">
                          <Users className="h-5 w-5 text-purple-600" />
                          <span>Group Signature Generation</span>
                        </h3>
                        
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between">
                            <span>Store Commitment:</span>
                            <code className="text-xs bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded">
                              {packageData.storeCommitment?.slice(0, 10)}...
                            </code>
                          </div>
                          <div className="flex justify-between">
                            <span>Proving Group Membership:</span>
                            <span className="text-purple-600">3-party system</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={generateZKProof}
                        disabled={proving || !circuitsLoaded || (packageData.needsAgeCheck && (!ageVerified || !isAgeVerificationValid()))}
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center space-x-3 shadow-lg transform hover:scale-[1.02] disabled:scale-100"
                      >
                        {proving ? (
                          <>
                            <Loader className="h-5 w-5 animate-spin" />
                            <span>Generating ZK Proof...</span>
                          </>
                        ) : (
                          <>
                            <Zap className="h-5 w-5" />
                            <span>Generate Anonymous Proof</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {/* Step 2: Complete Pickup */}
                  {currentStep === 2 && proof && (
                    <div className="space-y-6">
                      <div className={`${darkMode ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-200'} border rounded-xl p-6`}>
                        <div className="flex items-center space-x-3 mb-4">
                          <CheckCircle className="h-6 w-6 text-green-600" />
                          <h3 className="font-semibold text-green-800 dark:text-green-300">Proof Generated Successfully</h3>
                        </div>
                        
                        <div className="space-y-3 text-sm">
                          <div className="flex items-center justify-between">
                            <span>Group Signature:</span>
                            <div className="flex items-center space-x-2">
                              <code className="text-xs bg-green-100 dark:bg-green-800 px-2 py-1 rounded">
                                {proof.publicSignals[0].slice(0, 10)}...
                              </code>
                              <button
                                onClick={() => copyToClipboard(proof.publicSignals[0], 'signature')}
                                className="text-green-600 hover:text-green-800"
                              >
                                {copied === 'signature' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between">
                            <span>Nullifier:</span>
                            <div className="flex items-center space-x-2">
                              <code className="text-xs bg-green-100 dark:bg-green-800 px-2 py-1 rounded">
                                {proof.publicSignals[1].slice(0, 10)}...
                              </code>
                              <button
                                onClick={() => copyToClipboard(proof.publicSignals[1], 'nullifier')}
                                className="text-green-600 hover:text-green-800"
                              >
                                {copied === 'nullifier' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={completePickup}
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-medium py-4 px-6 rounded-xl transition-all duration-200 flex items-center justify-center space-x-3 shadow-lg transform hover:scale-[1.02] disabled:scale-100"
                      >
                        {loading ? (
                          <>
                            <Loader className="h-5 w-5 animate-spin" />
                            <span>Submitting Proof...</span>
                          </>
                        ) : (
                          <>
                            <Package className="h-5 w-5" />
                            <span>Complete Anonymous Pickup</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Phase 3: Pickup Complete */}
              {currentPhase === 3 && (
                <div className="p-8 text-center">
                  <div className="w-24 h-24 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="h-12 w-12 text-white" />
                  </div>
                  
                  <h2 className="text-3xl font-bold mb-4">Pickup Complete! 🎉</h2>
                  <p className="text-gray-600 dark:text-gray-400 text-lg mb-8">
                    Package successfully collected with full anonymity preserved
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 text-sm">
                    <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-4`}>
                      <h4 className="font-semibold mb-2">Privacy Protected</h4>
                      <p className="text-gray-600 dark:text-gray-400">Identity never revealed to seller or store</p>
                    </div>
                    <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-4`}>
                      <h4 className="font-semibold mb-2">Zero-Knowledge Verified</h4>
                      <p className="text-gray-600 dark:text-gray-400">Group signature proof confirmed</p>
                    </div>
                    <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-4`}>
                      <h4 className="font-semibold mb-2">Gas Paid</h4>
                      <p className="text-gray-600 dark:text-gray-400">Low cost transaction submitted</p>
                    </div>
                  </div>

                  <button
                    onClick={resetDemo}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-3 px-8 rounded-xl transition-all duration-200 flex items-center justify-center space-x-3 mx-auto shadow-lg transform hover:scale-105"
                  >
                    <Package className="h-5 w-5" />
                    <span>Start New Demo</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* System Status */}
            <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-lg border p-6`}>
              <h3 className="font-bold mb-4 flex items-center space-x-2">
                <Shield className="h-5 w-5 text-blue-500" />
                <span>System Status</span>
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Smart EOA</span>
                  <div className={`flex items-center space-x-2 ${smartEOADelegated ? 'text-green-500' : 'text-gray-400'}`}>
                    {smartEOADelegated ? <CheckCircle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                    <span className="text-xs">{smartEOADelegated ? 'Delegated' : 'Pending'}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">ZK Circuits</span>
                  <div className={`flex items-center space-x-2 ${circuitsLoaded ? 'text-green-500' : 'text-yellow-500'}`}>
                    {circuitsLoaded ? <CheckCircle className="h-4 w-4" /> : <Loader className="h-4 w-4 animate-spin" />}
                    <span className="text-xs">{circuitsLoaded ? 'Ready' : 'Loading'}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm">Age Verification</span>
                  <div className={`flex items-center space-x-2 ${
                    ageVerified && isAgeVerificationValid() ? 'text-green-500' : 'text-gray-400'
                  }`}>
                    {ageVerified && isAgeVerificationValid() ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Clock className="h-4 w-4" />
                    )}
                    <span className="text-xs">
                      {ageVerified && isAgeVerificationValid() 
                        ? `${Math.ceil((ageVerificationExpiry - Date.now()) / (24 * 60 * 60 * 1000))} days left`
                        : 'Required'
                      }
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Technical Details */}
            {smartEOADelegated && (
              <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-lg border p-6`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold flex items-center space-x-2">
                    <Key className="h-5 w-5 text-orange-500" />
                    <span>Commitments</span>
                  </h3>
                  <button
                    onClick={() => setShowSecrets(!showSecrets)}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                
                {showSecrets && (
                  <div className="space-y-4 text-xs">
                    <div>
                      <div className="text-gray-600 dark:text-gray-400 mb-1 font-medium">Buyer Commitment:</div>
                      <code className="block p-3 bg-gray-100 dark:bg-gray-700 rounded-lg break-all font-mono">
                        {buyerCommitment}
                      </code>
                    </div>
                    
                    {packageData.sellerCommitment && (
                      <div>
                        <div className="text-gray-600 dark:text-gray-400 mb-1 font-medium">Seller Commitment:</div>
                        <code className="block p-3 bg-gray-100 dark:bg-gray-700 rounded-lg break-all font-mono">
                          {packageData.sellerCommitment}
                        </code>
                      </div>
                    )}
                    
                    {packageData.storeCommitment && (
                      <div>
                        <div className="text-gray-600 dark:text-gray-400 mb-1 font-medium">Store Commitment:</div>
                        <code className="block p-3 bg-gray-100 dark:bg-gray-700 rounded-lg break-all font-mono">
                          {packageData.storeCommitment}
                        </code>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Privacy Features */}
            <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-xl shadow-lg border p-6`}>
              <h3 className="font-bold mb-4 flex items-center space-x-2">
                <Eye className="h-5 w-5 text-purple-500" />
                <span>Privacy Features</span>
              </h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>EIP-7702 Smart EOA delegation</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>ZK group signature proofs</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>Local age verification</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>Nullifier prevents reuse</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>Anonymous three-party system</span>
                </div>
                <div className="flex items-center space-x-3">
                  <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  <span>No personal data on-chain</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnonymousPickupSystem;