import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Components
import Navigation from './components/shared/Navigation';
import Web3Provider from './components/shared/Web3Provider';
import ContractProvider from './components/shared/ContractProvider';
import SellerApp from './components/Seller/SellerApp';
import BuyerApp from './components/Buyer/BuyerApp';
import StoreApp from './components/Store/StoreApp';

// Styles
import './App.css';

function App() {
  const [currentRole, setCurrentRole] = useState('buyer');
  const [isWeb3Ready, setIsWeb3Ready] = useState(false);

  useEffect(() => {
    // Check if we're in the right environment
    if (typeof window !== 'undefined' && window.ethereum) {
      setIsWeb3Ready(true);
    }
  }, []);

  if (!isWeb3Ready) {
    return (
      <div className="app-loading">
        <div className="loading-container">
          <h1>🚀 Anonymous Pickup System</h1>
          <p>Please install MetaMask or use a Web3-enabled browser</p>
          <div className="loading-spinner"></div>
        </div>
      </div>
    );
  }

  return (
    <Web3Provider>
      <ContractProvider>
        <Router>
          <div className="App">
            <Navigation currentRole={currentRole} setCurrentRole={setCurrentRole} />
            
            <main className="main-content">
              <Routes>
                <Route path="/" element={<Navigate to="/buyer" replace />} />
                <Route path="/seller" element={<SellerApp />} />
                <Route path="/buyer" element={<BuyerApp />} />
                <Route path="/store" element={<StoreApp />} />
              </Routes>
            </main>

            <ToastContainer
              position="top-right"
              autoClose={5000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
            />
          </div>
        </Router>
      </ContractProvider>
    </Web3Provider>
  );
}

export default App;