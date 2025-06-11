import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

/**
 * Package List Component
 * Displays seller's registered packages and their status
 */
const PackageList = ({ packages, onRefresh }) => {
  const [filteredPackages, setFilteredPackages] = useState([]);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter and sort packages when data changes
  useEffect(() => {
    let filtered = [...packages];

    // Apply status filter
    if (filter !== 'all') {
      filtered = filtered.filter(pkg => pkg.status === filter);
    }

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(pkg => 
        pkg.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pkg.buyerCommitment.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return b.createdTime - a.createdTime;
        case 'oldest':
          return a.createdTime - b.createdTime;
        case 'expiry':
          return a.expiryTime - b.expiryTime;
        case 'price':
          return parseFloat(b.itemPrice) - parseFloat(a.itemPrice);
        default:
          return 0;
      }
    });

    setFilteredPackages(filtered);
  }, [packages, filter, sortBy, searchTerm]);

  /**
   * Format timestamp for display
   */
  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  /**
   * Format address for display
   */
  const formatAddress = (address) => {
    return `${address.substr(0, 6)}...${address.substr(-4)}`;
  };

  /**
   * Get status badge class
   */
  const getStatusClass = (status) => {
    switch (status) {
      case 'pending':
        return 'status-pending';
      case 'picked_up':
        return 'status-success';
      case 'expired':
        return 'status-error';
      default:
        return 'status-pending';
    }
  };

  /**
   * Get time remaining until expiry
   */
  const getTimeRemaining = (expiryTime) => {
    const now = Date.now();
    const remaining = expiryTime - now;
    
    if (remaining <= 0) return 'Expired';
    
    const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
    const hours = Math.floor((remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return `${days}d ${hours}h left`;
    } else {
      return `${hours}h left`;
    }
  };

  /**
   * Copy commitment to clipboard
   */
  const copyCommitment = async (commitment) => {
    try {
      await navigator.clipboard.writeText(commitment);
      // You might want to show a toast here
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (packages.length === 0) {
    return (
      <div className="package-list empty">
        <div className="empty-state">
          <div className="empty-icon">📦</div>
          <h3>No Packages Yet</h3>
          <p>You haven't registered any packages yet. Start by registering your first package!</p>
          <button className="btn btn-primary" onClick={onRefresh}>
            Refresh List
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="package-list">
      <div className="list-header">
        <h3>📋 Your Packages</h3>
        <button className="btn btn-secondary btn-small" onClick={onRefresh}>
          🔄 Refresh
        </button>
      </div>

      {/* Filters and Search */}
      <div className="list-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search packages..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        <div className="filter-controls">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="picked_up">Picked Up</option>
            <option value="expired">Expired</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="expiry">By Expiry</option>
            <option value="price">By Price</option>
          </select>
        </div>
      </div>

      {/* Package List */}
      <div className="packages-container">
        {filteredPackages.map((pkg, index) => (
          <div key={index} className="package-card">
            <div className="package-header">
              <div className="package-id">
                <h4>{pkg.id}</h4>
                <span className={`status-badge ${getStatusClass(pkg.status)}`}>
                  {pkg.status.replace('_', ' ')}
                </span>
              </div>
              <div className="package-value">
                <span className="price">{pkg.itemPrice} ETH</span>
                {pkg.shippingFee !== '0' && (
                  <span className="shipping">+{pkg.shippingFee} ETH shipping</span>
                )}
              </div>
            </div>

            <div className="package-details">
              <div className="detail-row">
                <span className="label">Buyer Commitment:</span>
                <span className="commitment">
                  {formatAddress(pkg.buyerCommitment)}
                  <button 
                    className="copy-btn"
                    onClick={() => copyCommitment(pkg.buyerCommitment)}
                    title="Copy full commitment"
                  >
                    📋
                  </button>
                </span>
              </div>

              <div className="detail-row">
                <span className="label">Store:</span>
                <span className="value">{formatAddress(pkg.store)}</span>
              </div>

              <div className="detail-row">
                <span className="label">Created:</span>
                <span className="value">{formatTimestamp(pkg.createdTime)}</span>
              </div>

              <div className="detail-row">
                <span className="label">Expires:</span>
                <span className={`value ${pkg.status === 'expired' ? 'expired' : ''}`}>
                  {getTimeRemaining(pkg.expiryTime)}
                </span>
              </div>

              {pkg.needsAgeCheck && (
                <div className="detail-row">
                  <span className="label">Age Check:</span>
                  <span className="value warning">18+ Required ⚠️</span>
                </div>
              )}
            </div>

            <div className="package-actions">
              {pkg.status === 'pending' && (
                <>
                  <button className="btn btn-small btn-outline">
                    📊 View Details
                  </button>
                  <button className="btn btn-small btn-warning">
                    📞 Contact Buyer
                  </button>
                </>
              )}
              
              {pkg.status === 'picked_up' && (
                <button className="btn btn-small btn-success">
                  ✅ Completed
                </button>
              )}
              
              {pkg.status === 'expired' && (
                <button className="btn btn-small btn-error">
                  ⏰ Expired
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredPackages.length === 0 && packages.length > 0 && (
        <div className="no-results">
          <p>No packages match your current filters.</p>
          <button 
            className="btn btn-secondary btn-small"
            onClick={() => {
              setFilter('all');
              setSearchTerm('');
            }}
          >
            Clear Filters
          </button>
        </div>
      )}

      {/* Summary Statistics */}
      <div className="list-summary">
        <div className="summary-stats">
          <div className="stat">
            <span className="stat-number">
              {packages.filter(p => p.status === 'pending').length}
            </span>
            <span className="stat-label">Pending</span>
          </div>
          <div className="stat">
            <span className="stat-number">
              {packages.filter(p => p.status === 'picked_up').length}
            </span>
            <span className="stat-label">Completed</span>
          </div>
          <div className="stat">
            <span className="stat-number">
              {packages.filter(p => p.status === 'expired').length}
            </span>
            <span className="stat-label">Expired</span>
          </div>
          <div className="stat">
            <span className="stat-number">
              {packages.reduce((sum, p) => sum + parseFloat(p.itemPrice), 0).toFixed(3)}
            </span>
            <span className="stat-label">Total Value (ETH)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// CSS for PackageList (inline for demo, should be in separate file)
const packageListStyles = `
.package-list {
  max-width: 1000px;
  margin: 0 auto;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
}

.list-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--spacing-lg);
  flex-wrap: wrap;
  gap: var(--spacing-md);
}

.search-box {
  flex: 1;
  max-width: 300px;
}

.search-input {
  width: 100%;
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 0.9rem;
}

.filter-controls {
  display: flex;
  gap: var(--spacing-sm);
}

.filter-select,
.sort-select {
  padding: var(--spacing-sm) var(--spacing-md);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  font-size: 0.9rem;
}

.packages-container {
  display: grid;
  gap: var(--spacing-lg);
}

.package-card {
  background: var(--background-light);
  border-radius: var(--radius-lg);
  padding: var(--spacing-lg);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-normal);
}

.package-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

.package-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--spacing-md);
}

.package-id h4 {
  margin: 0 0 var(--spacing-xs) 0;
  color: var(--text-primary);
}

.package-value {
  text-align: right;
}

.price {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--primary-color);
}

.shipping {
  display: block;
  font-size: 0.8rem;
  color: var(--text-secondary);
}

.package-details {
  margin-bottom: var(--spacing-md);
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--spacing-xs) 0;
  border-bottom: 1px solid var(--border-light);
}

.detail-row:last-child {
  border-bottom: none;
}

.label {
  font-weight: 500;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.value {
  font-weight: 500;
  color: var(--text-primary);
  font-size: 0.9rem;
}

.value.expired {
  color: var(--error-color);
}

.value.warning {
  color: var(--warning-color);
}

.commitment {
  display: flex;
  align-items: center;
  gap: var(--spacing-xs);
  font-family: monospace;
}

.copy-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.8rem;
  opacity: 0.7;
  transition: opacity var(--transition-fast);
}

.copy-btn:hover {
  opacity: 1;
}

.package-actions {
  display: flex;
  gap: var(--spacing-sm);
  flex-wrap: wrap;
}

.empty-state,
.no-results {
  text-align: center;
  padding: var(--spacing-xxl);
  color: var(--text-secondary);
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: var(--spacing-lg);
}

.list-summary {
  margin-top: var(--spacing-xl);
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--border-color);
}

.summary-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: var(--spacing-lg);
}

.stat {
  text-align: center;
}

.stat-number {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--primary-color);
}

.stat-label {
  font-size: 0.8rem;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

@media (max-width: 768px) {
  .list-controls {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-box {
    max-width: none;
  }
  
  .filter-controls {
    justify-content: stretch;
  }
  
  .filter-select,
  .sort-select {
    flex: 1;
  }
  
  .package-header {
    flex-direction: column;
    gap: var(--spacing-sm);
  }
  
  .package-value {
    text-align: left;
  }
  
  .detail-row {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--spacing-xs);
  }
}
`;

// Inject styles (in a real app, this would be in a separate CSS file)
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = packageListStyles;
  document.head.appendChild(styleSheet);
}

export default PackageList;