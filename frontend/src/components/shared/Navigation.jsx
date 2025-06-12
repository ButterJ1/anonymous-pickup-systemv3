import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useWeb3 } from './Web3Provider';
import './Navigation.css';

const Navigation = ({ currentRole, setCurrentRole }) => {
  const location = useLocation();
  const { account, isConnected, connectWallet, disconnectWallet, isEIP7702Enabled } = useWeb3();

  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.substr(0, 6)}...${address.substr(-4)}`;
  };

  const getActiveClass = (path) => {
    return location.pathname === path ? 'nav-link active' : 'nav-link';
  };

  return (
    <nav className="navbar">
      <div className="nav-container">
        {/* Logo */}
        <div className="nav-logo">
          <Link to="/" className="logo-link">
            <span className="logo-icon">🚀</span>
            <span className="logo-text">Anonymous Pickup</span>
          </Link>
        </div>

        {/* Navigation Links */}
        <div className="nav-links">
          <Link to="/buyer" className={getActiveClass('/buyer')}>
            {/* <span className="nav-icon">👤</span> */}
            <span className="nav-text">Buyer</span>
          </Link>
          <Link to="/seller" className={getActiveClass('/seller')}>
            {/* <span className="nav-icon">🏪</span> */}
            <span className="nav-text">Seller</span>
          </Link>
          <Link to="/store" className={getActiveClass('/store')}>
            {/* <span className="nav-icon">🏬</span> */}
            <span className="nav-text">Store</span>
          </Link>
        </div>

        {/* Wallet Status */}
        <div className="nav-wallet">
          {isConnected ? (
            <div className="wallet-info">
              <div className="wallet-address">
                <span className="address-text">{formatAddress(account)}</span>
                {isEIP7702Enabled && (
                  <span className="eip7702-badge">EIP-7702</span>
                )}
              </div>
              <div className="wallet-controls">
                <button 
                  className="btn btn-small btn-outline"
                  onClick={disconnectWallet}
                >
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            <button 
              className="btn btn-primary"
              onClick={connectWallet}
            >
              Connect Wallet
            </button>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <div className="mobile-menu-toggle">
          <button className="menu-btn">
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>

      {/* System Status */}
      <div className="nav-status">
        <div className="status-container">
          <div className="status-item">
            <span className="status-label">Network:</span>
            <span className="status-value">Localhost</span>
          </div>
          <div className="status-item">
            <span className="status-label">Role:</span>
            <span className="status-value">{location.pathname.replace('/', '') || 'buyer'}</span>
          </div>
          <div className="status-item">
            <span className="status-label">Privacy:</span>
            <span className="status-value success">Protected 🔒</span>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;