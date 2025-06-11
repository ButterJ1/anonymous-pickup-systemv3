// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title EIP7702PickupWallet
 * @dev Real EIP-7702 wallet enhancement for anonymous package pickup
 * 
 * This contract is delegated to by EOAs via EIP-7702, providing:
 * - Local commitment generation
 * - ZK proof preparation
 * - Age verification management
 * - Secure secret management
 */
contract EIP7702PickupWallet {
    
    // Events for wallet operations
    event WalletInitialized(address indexed owner, uint256 timestamp);
    event CommitmentGenerated(address indexed owner, uint256 commitment);
    event AgeVerified(address indexed owner, uint256 verificationTime, bool isAdult);
    event ProofDataPrepared(address indexed owner, bytes32 packageId, uint256 nullifier);
    
    // Wallet state per user
    struct WalletData {
        uint256 buyerSecret;         // Private secret for commitments
        uint256 userNameHash;        // Hash of user's name
        uint256 phoneLastThree;      // Last 3 digits of phone
        uint256 age;                 // User's age (verified locally)
        uint256 ageVerificationTime; // When age was last verified
        uint256 nonce;               // Anti-replay nonce
        bool isInitialized;          // Wallet setup status
        bool isAgeVerified;          // Age verification status
        mapping(uint256 => bool) usedNullifiers; // Track used nullifiers
    }
    
    // Storage for each wallet (when delegated via EIP-7702)
    mapping(address => WalletData) private walletData;
    
    // Constants
    uint256 private constant AGE_VERIFICATION_VALIDITY = 24 hours;
    uint256 private constant ADULT_AGE = 18;
    uint256 private constant MAX_PHONE_DIGITS = 999;
    
    /**
     * @dev Initialize wallet for pickup operations
     * @param buyerSecret Secret key for generating commitments
     * @param userNameHash Hash of user's full name
     * @param phoneLastThree Last 3 digits of phone number (0-999)
     * @param userAge User's age (for local verification)
     */
    function initializeWallet(
        uint256 buyerSecret,
        uint256 userNameHash,
        uint256 phoneLastThree,
        uint256 userAge
    ) external {
        require(buyerSecret != 0, "Invalid secret");
        require(userNameHash != 0, "Invalid name hash");
        require(phoneLastThree <= MAX_PHONE_DIGITS, "Invalid phone digits");
        require(userAge > 0 && userAge < 150, "Invalid age");
        require(!walletData[msg.sender].isInitialized, "Already initialized");
        
        WalletData storage data = walletData[msg.sender];
        data.buyerSecret = buyerSecret;
        data.userNameHash = userNameHash;
        data.phoneLastThree = phoneLastThree;
        data.age = userAge;
        data.nonce = 0;
        data.isInitialized = true;
        data.isAgeVerified = false;
        
        emit WalletInitialized(msg.sender, block.timestamp);
    }
    
    /**
     * @dev Verify age locally (simulates local ID verification)
     * In real implementation, this would be called after local camera/AI verification
     * @param ageProofHash Hash of age verification data (from local scanning)
     */
    function verifyAgeLocally(uint256 ageProofHash) external {
        require(walletData[msg.sender].isInitialized, "Wallet not initialized");
        require(ageProofHash != 0, "Invalid age proof");
        
        WalletData storage data = walletData[msg.sender];
        data.isAgeVerified = true;
        data.ageVerificationTime = block.timestamp;
        
        bool isAdult = data.age >= ADULT_AGE;
        emit AgeVerified(msg.sender, block.timestamp, isAdult);
    }
    
    /**
     * @dev Generate buyer commitment for package registration
     * This replaces traditional name + phone number sharing
     * @return commitment The commitment to share with seller
     */
    function generateBuyerCommitment() external view returns (uint256 commitment) {
        WalletData storage data = walletData[msg.sender];
        require(data.isInitialized, "Wallet not initialized");
        
        // commitment = hash(buyerSecret, userNameHash, phoneLastThree)
        commitment = uint256(keccak256(abi.encode(
            data.buyerSecret,
            data.userNameHash,
            data.phoneLastThree
        )));
        
        return commitment;
    }
    
    /**
     * @dev Prepare data for ZK proof generation (done off-chain)
     * Returns the private inputs needed for circuit
     * @param packageId Package to pickup
     * @return Private inputs for ZK proof circuit
     */
    function prepareProofInputs(bytes32 packageId) external returns (
        uint256 buyerSecret,
        uint256 userNameHash,
        uint256 phoneLastThree,
        uint256 age,
        uint256 nonce,
        uint256 nullifier
    ) {
        WalletData storage data = walletData[msg.sender];
        require(data.isInitialized, "Wallet not initialized");
        require(data.isAgeVerified, "Age not verified");
        require(
            block.timestamp - data.ageVerificationTime <= AGE_VERIFICATION_VALIDITY,
            "Age verification expired"
        );
        
        // Generate unique nullifier
        nullifier = uint256(keccak256(abi.encode(
            data.buyerSecret,
            packageId,
            data.nonce,
            block.timestamp
        )));
        
        require(!data.usedNullifiers[nullifier], "Nullifier already used");
        
        // Mark nullifier as used and increment nonce
        data.usedNullifiers[nullifier] = true;
        data.nonce++;
        
        emit ProofDataPrepared(msg.sender, packageId, nullifier);
        
        return (
            data.buyerSecret,
            data.userNameHash,
            data.phoneLastThree,
            data.age,
            data.nonce - 1, // Return the nonce that was used
            nullifier
        );
    }
    
    /**
     * @dev Generate commitment for external verification
     * Allows external systems to verify commitment matches
     * @param secret Buyer's secret
     * @param nameHash Hash of buyer's name
     * @param phoneDigits Last 3 digits of phone
     * @return Generated commitment
     */
    function computeCommitment(
        uint256 secret,
        uint256 nameHash,
        uint256 phoneDigits
    ) external pure returns (uint256) {
        return uint256(keccak256(abi.encode(secret, nameHash, phoneDigits)));
    }
    
    /**
     * @dev Check if wallet is ready for pickup operations
     * @return ready True if wallet can perform pickups
     * @return ageValid True if age verification is still valid
     * @return isAdult True if user is 18+
     */
    function isReadyForPickup() external view returns (
        bool ready,
        bool ageValid,
        bool isAdult
    ) {
        WalletData storage data = walletData[msg.sender];
        
        if (!data.isInitialized || !data.isAgeVerified) {
            return (false, false, false);
        }
        
        ageValid = (block.timestamp - data.ageVerificationTime) <= AGE_VERIFICATION_VALIDITY;
        isAdult = data.age >= ADULT_AGE;
        ready = ageValid;
        
        return (ready, ageValid, isAdult);
    }
    
    /**
     * @dev Get wallet status and statistics
     */
    function getWalletStatus() external view returns (
        bool isInitialized,
        bool isAgeVerified,
        uint256 ageVerificationTime,
        uint256 currentNonce,
        uint256 userAge,
        bool ageVerificationValid
    ) {
        WalletData storage data = walletData[msg.sender];
        
        bool ageValid = data.isAgeVerified && 
                       (block.timestamp - data.ageVerificationTime) <= AGE_VERIFICATION_VALIDITY;
        
        return (
            data.isInitialized,
            data.isAgeVerified,
            data.ageVerificationTime,
            data.nonce,
            data.age,
            ageValid
        );
    }
    
    /**
     * @dev Update user age (after new local verification)
     * @param newAge Updated age
     * @param ageProofHash New age verification proof
     */
    function updateAge(uint256 newAge, uint256 ageProofHash) external {
        require(walletData[msg.sender].isInitialized, "Wallet not initialized");
        require(newAge > 0 && newAge < 150, "Invalid age");
        require(ageProofHash != 0, "Invalid proof");
        
        WalletData storage data = walletData[msg.sender];
        data.age = newAge;
        data.isAgeVerified = true;
        data.ageVerificationTime = block.timestamp;
        
        bool isAdult = newAge >= ADULT_AGE;
        emit AgeVerified(msg.sender, block.timestamp, isAdult);
    }
    
    /**
     * @dev Check if nullifier was already used
     * @param nullifier Nullifier to check
     * @return used True if nullifier was used
     */
    function isNullifierUsed(uint256 nullifier) external view returns (bool used) {
        return walletData[msg.sender].usedNullifiers[nullifier];
    }
    
    /**
     * @dev Reset wallet (emergency function)
     * Clears all data - use with caution
     */
    function resetWallet() external {
        require(walletData[msg.sender].isInitialized, "Not initialized");
        
        // Clear wallet data
        delete walletData[msg.sender];
    }
    
    /**
     * @dev Get commitment that would be generated with current data
     * Useful for verification without emitting events
     */
    function previewCommitment() external view returns (uint256 commitment) {
        WalletData storage data = walletData[msg.sender];
        require(data.isInitialized, "Wallet not initialized");
        
        return uint256(keccak256(abi.encode(
            data.buyerSecret,
            data.userNameHash,
            data.phoneLastThree
        )));
    }
    
    /**
     * @dev Validate that provided data matches stored commitment
     * Useful for external verification
     */
    function validateCommitmentData(
        uint256 secret,
        uint256 nameHash,
        uint256 phoneDigits
    ) external view returns (bool valid) {
        WalletData storage data = walletData[msg.sender];
        require(data.isInitialized, "Wallet not initialized");
        
        uint256 expectedCommitment = uint256(keccak256(abi.encode(
            data.buyerSecret,
            data.userNameHash,
            data.phoneLastThree
        )));
        
        uint256 providedCommitment = uint256(keccak256(abi.encode(
            secret,
            nameHash,
            phoneDigits
        )));
        
        return expectedCommitment == providedCommitment;
    }
}