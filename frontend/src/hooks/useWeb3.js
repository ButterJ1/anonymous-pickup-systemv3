import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';

/**
 * Custom hook for Web3 wallet connection and management
 * Provides wallet connection, network switching, and transaction handling
 */
export const useWeb3 = () => {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [account, setAccount] = useState(null);
  const [chainId, setChainId] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [balance, setBalance] = useState('0');
  const [networkName, setNetworkName] = useState('Unknown');

  // Check if wallet is available
  const isWalletAvailable = useCallback(() => {
    return typeof window !== 'undefined' && window.ethereum;
  }, []);

  // Connect to wallet
  const connectWallet = useCallback(async () => {
    if (!isWalletAvailable()) {
      toast.error('Please install MetaMask or another Web3 wallet!');
      return false;
    }

    if (isConnecting) return false;

    setIsConnecting(true);
    try {
      // Request account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });

      if (accounts.length === 0) {
        throw new Error('No accounts returned from wallet');
      }

      // Create provider and signer
      const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
      const web3Signer = web3Provider.getSigner();
      const address = await web3Signer.getAddress();
      const network = await web3Provider.getNetwork();
      const accountBalance = await web3Provider.getBalance(address);

      // Update state
      setProvider(web3Provider);
      setSigner(web3Signer);
      setAccount(address);
      setChainId(network.chainId);
      setBalance(ethers.utils.formatEther(accountBalance));
      setNetworkName(getNetworkName(network.chainId));
      setIsConnected(true);

      toast.success('Wallet connected successfully!');
      return true;

    } catch (error) {
      console.error('Wallet connection error:', error);
      
      if (error.code === 4001) {
        toast.error('Wallet connection rejected by user');
      } else if (error.code === -32002) {
        toast.error('Wallet connection request already pending');
      } else {
        toast.error('Failed to connect wallet: ' + error.message);
      }
      
      return false;
    } finally {
      setIsConnecting(false);
    }
  }, [isWalletAvailable, isConnecting]);

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    setProvider(null);
    setSigner(null);
    setAccount(null);
    setChainId(null);
    setBalance('0');
    setNetworkName('Unknown');
    setIsConnected(false);
    
    toast.info('Wallet disconnected');
  }, []);

  // Switch network
  const switchNetwork = useCallback(async (targetChainId) => {
    if (!window.ethereum) {
      toast.error('No wallet detected');
      return false;
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: ethers.utils.hexValue(targetChainId) }],
      });
      
      return true;
    } catch (error) {
      if (error.code === 4902) {
        toast.error('Network not added to wallet. Please add it manually.');
      } else {
        toast.error('Failed to switch network: ' + error.message);
      }
      return false;
    }
  }, []);

  // Add network to wallet
  const addNetwork = useCallback(async (networkConfig) => {
    if (!window.ethereum) {
      toast.error('No wallet detected');
      return false;
    }

    try {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [networkConfig],
      });
      
      toast.success('Network added successfully');
      return true;
    } catch (error) {
      toast.error('Failed to add network: ' + error.message);
      return false;
    }
  }, []);

  // Sign message
  const signMessage = useCallback(async (message) => {
    if (!signer) {
      throw new Error('No signer available');
    }

    try {
      const signature = await signer.signMessage(message);
      return signature;
    } catch (error) {
      if (error.code === 4001) {
        toast.error('Message signing rejected by user');
      } else {
        toast.error('Failed to sign message: ' + error.message);
      }
      throw error;
    }
  }, [signer]);

  // Send transaction
  const sendTransaction = useCallback(async (transactionRequest) => {
    if (!signer) {
      throw new Error('No signer available');
    }

    try {
      const tx = await signer.sendTransaction(transactionRequest);
      toast.info('Transaction sent, waiting for confirmation...');
      
      const receipt = await tx.wait();
      toast.success('Transaction confirmed!');
      
      // Update balance after transaction
      await updateBalance();
      
      return receipt;
    } catch (error) {
      if (error.code === 4001) {
        toast.error('Transaction rejected by user');
      } else if (error.code === 'INSUFFICIENT_FUNDS') {
        toast.error('Insufficient funds for transaction');
      } else {
        toast.error('Transaction failed: ' + error.message);
      }
      throw error;
    }
  }, [signer]);

  // Update balance
  const updateBalance = useCallback(async () => {
    if (!provider || !account) return;

    try {
      const accountBalance = await provider.getBalance(account);
      setBalance(ethers.utils.formatEther(accountBalance));
    } catch (error) {
      console.error('Error updating balance:', error);
    }
  }, [provider, account]);

  // Get network name from chain ID
  const getNetworkName = useCallback((chainId) => {
    const networks = {
      1: 'Ethereum Mainnet',
      5: 'Goerli Testnet',
      11155111: 'Sepolia Testnet',
      137: 'Polygon Mainnet',
      80001: 'Mumbai Testnet',
      42161: 'Arbitrum One',
      421613: 'Arbitrum Goerli',
      10: 'Optimism',
      420: 'Optimism Goerli',
      31337: 'Localhost',
      1337: 'Localhost'
    };
    
    return networks[chainId] || `Unknown (${chainId})`;
  }, []);

  // Check if on correct network
  const isCorrectNetwork = useCallback((expectedChainId) => {
    return chainId === expectedChainId;
  }, [chainId]);

  // Get wallet info
  const getWalletInfo = useCallback(async () => {
    if (!provider || !account) return null;

    try {
      const network = await provider.getNetwork();
      const blockNumber = await provider.getBlockNumber();
      const gasPrice = await provider.getGasPrice();

      return {
        account,
        chainId: network.chainId,
        networkName: getNetworkName(network.chainId),
        balance,
        blockNumber,
        gasPrice: ethers.utils.formatUnits(gasPrice, 'gwei')
      };
    } catch (error) {
      console.error('Error getting wallet info:', error);
      return null;
    }
  }, [provider, account, balance, getNetworkName]);

  // Listen for account changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else if (accounts[0] !== account) {
        // Reconnect with new account
        connectWallet();
      }
    };

    const handleChainChanged = (chainId) => {
      const newChainId = parseInt(chainId, 16);
      setChainId(newChainId);
      setNetworkName(getNetworkName(newChainId));
      
      // Update balance on network change
      setTimeout(updateBalance, 1000);
    };

    const handleDisconnect = () => {
      disconnectWallet();
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);
    window.ethereum.on('disconnect', handleDisconnect);

    return () => {
      if (window.ethereum.removeListener) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
        window.ethereum.removeListener('disconnect', handleDisconnect);
      }
    };
  }, [account, connectWallet, disconnectWallet, getNetworkName, updateBalance]);

  // Auto-connect if previously connected
  useEffect(() => {
    const autoConnect = async () => {
      if (!isWalletAvailable()) return;

      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          await connectWallet();
        }
      } catch (error) {
        console.error('Auto-connect failed:', error);
      }
    };

    autoConnect();
  }, [isWalletAvailable, connectWallet]);

  // Update balance periodically
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(updateBalance, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [isConnected, updateBalance]);

  return {
    // State
    provider,
    signer,
    account,
    chainId,
    balance,
    networkName,
    isConnected,
    isConnecting,

    // Actions
    connectWallet,
    disconnectWallet,
    switchNetwork,
    addNetwork,
    signMessage,
    sendTransaction,
    updateBalance,

    // Utilities
    isWalletAvailable,
    isCorrectNetwork,
    getWalletInfo,
    getNetworkName
  };
};

/**
 * Hook for wallet connection status
 */
export const useWalletConnection = () => {
  const { isConnected, account, networkName, balance } = useWeb3();
  
  return {
    isConnected,
    account,
    networkName,
    balance,
    formattedAccount: account ? `${account.slice(0, 6)}...${account.slice(-4)}` : null
  };
};

/**
 * Hook for network management
 */
export const useNetwork = () => {
  const { chainId, networkName, switchNetwork, addNetwork, isCorrectNetwork } = useWeb3();

  const networkConfigs = {
    1: {
      chainId: '0x1',
      chainName: 'Ethereum Mainnet',
      nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
      rpcUrls: ['https://mainnet.infura.io/v3/YOUR_INFURA_PROJECT_ID'],
      blockExplorerUrls: ['https://etherscan.io']
    },
    5: {
      chainId: '0x5',
      chainName: 'Goerli Testnet',
      nativeCurrency: { name: 'GoerliETH', symbol: 'GoerliETH', decimals: 18 },
      rpcUrls: ['https://goerli.infura.io/v3/YOUR_INFURA_PROJECT_ID'],
      blockExplorerUrls: ['https://goerli.etherscan.io']
    },
    11155111: {
      chainId: '0xaa36a7',
      chainName: 'Sepolia Testnet',
      nativeCurrency: { name: 'SepoliaETH', symbol: 'SepoliaETH', decimals: 18 },
      rpcUrls: ['https://rpc.sepolia.org'],
      blockExplorerUrls: ['https://sepolia.etherscan.io']
    },
    31337: {
      chainId: '0x7a69',
      chainName: 'Localhost',
      nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
      rpcUrls: ['http://127.0.0.1:8545'],
      blockExplorerUrls: []
    }
  };

  const switchToNetwork = useCallback(async (targetChainId) => {
    const success = await switchNetwork(targetChainId);
    
    if (!success && networkConfigs[targetChainId]) {
      // Try to add the network if switching failed
      return await addNetwork(networkConfigs[targetChainId]);
    }
    
    return success;
  }, [switchNetwork, addNetwork]);

  return {
    chainId,
    networkName,
    switchToNetwork,
    isCorrectNetwork,
    supportedNetworks: Object.keys(networkConfigs).map(Number)
  };
};

export default useWeb3;