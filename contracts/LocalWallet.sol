// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title LocalWallet
 * @dev EIP-7702 contract for buyer wallet enhancement
 * 
 * This contract is delegated to by buyer's EOA via EIP-7702
 * Enables local operations:
 * - Generate commitments (replaces sharing name+phone)
 * - Age verification (camera/AI, local only)
 * - ZK proof preparation
 * - Privacy-preserving operations
 */
contract LocalWallet {
    
    // Buyer data stored locally in delegated wallet
    struct BuyerData {
        uint256 secret;              // Private secret for commitments
        uint256 nameHash;            // Hash of buyer's name
        uint256 phoneLastThree;      // Last 3 digits of phone (0-999)
        uint256 age;                 // Buyer's age
        uint256 nonce;               // For generating unique nullifiers
        bool isInitialized;          // Wallet setup status
        bool ageVerified;            // Age verified locally
        uint256 ageVerificationTime; // When age was verified
    }
    
    // Storage for each delegated wallet
    mapping(address => BuyerData) private walletData;
    mapping(address => mapping(uint256 => bool)) private usedNullifiers;
    
    uint256 private constant AGE_VERIFICATION_VALIDITY = 24 hours;
    uint256 private constant ADULT_AGE = 18;
    
    // Events
    event WalletInitialized(address indexed buyer, uint256 timestamp);
    event AgeVerified(address indexed buyer, bool isAdult);
    event CommitmentGenerated(address indexed buyer, uint256 commitment);
    
    /**
     * @dev Initialize buyer wallet (called after EIP-7702 delegation)
     * @param name Buyer's full name
     * @param phone Buyer's phone number
     * @param age Buyer's age
     */
    function initializeWallet(
        string calldata name,
        string calldata phone,
        uint256 age
    ) external {
        require(age > 0 && age < 150, "Invalid age");
        require(bytes(name).length > 0, "Name required");
        require(bytes(phone).length >= 3, "Phone number too short");
        require(!walletData[msg.sender].isInitialized, "Already initialized");
        
        // Generate secret and hash data
        uint256 secret = uint256(keccak256(abi.encode(
            msg.sender, 
            name, 
            phone, 
            block.timestamp, 
            block.prevrandao
        )));
        
        uint256 nameHash = uint256(keccak256(abi.encodePacked(name)));
        
        // Extract last 3 digits of phone
        uint256 phoneLastThree = extractLastThreeDigits(phone);
        
        walletData[msg.sender] = BuyerData({
            secret: secret,
            nameHash: nameHash,
            phoneLastThree: phoneLastThree,
            age: age,
            nonce: 0,
            isInitialized: true,
            ageVerified: false,
            ageVerificationTime: 0
        });
        
        emit WalletInitialized(msg.sender, block.timestamp);
    }
    
    /**
     * @dev Verify age locally (called after camera/AI verification)
     * @param ageProofHash Hash of local age verification result
     */
    function verifyAgeLocally(uint256 ageProofHash) external {
        require(walletData[msg.sender].isInitialized, "Wallet not initialized");
        require(ageProofHash != 0, "Invalid age proof");
        
        BuyerData storage data = walletData[msg.sender];
        data.ageVerified = true;
        data.ageVerificationTime = block.timestamp;
        
        bool isAdult = data.age >= ADULT_AGE;
        emit AgeVerified(msg.sender, isAdult);
    }
    
    /**
     * @dev Generate buyer commitment (replaces sharing 買家姓名+電話末三碼)
     * @return commitment Commitment to share with seller
     */
    function generateCommitment() external returns (uint256 commitment) {
        BuyerData storage data = walletData[msg.sender];
        require(data.isInitialized, "Wallet not initialized");
        
        // Generate commitment: hash(secret, nameHash, phoneLastThree)
        commitment = uint256(keccak256(abi.encode(
            data.secret,
            data.nameHash,
            data.phoneLastThree
        )));
        
        emit CommitmentGenerated(msg.sender, commitment);
        return commitment;
    }
    
    /**
     * @dev Prepare data for pickup proof generation
     * @param packageId Package to pickup
     * @return All data needed to generate ZK proof
     */
    function preparePickupProof(bytes32 packageId) external returns (
        uint256 secret,
        uint256 nameHash,
        uint256 phoneLastThree,
        uint256 age,
        uint256 nonce,
        uint256 nullifier,
        uint256 commitment,
        uint256 ageProof
    ) {
        BuyerData storage data = walletData[msg.sender];
        require(data.isInitialized, "Wallet not initialized");
        
        // Check age verification if buyer is trying to pickup 18+ items
        bool ageValid = data.ageVerified && 
            (block.timestamp - data.ageVerificationTime) <= AGE_VERIFICATION_VALIDITY;
        
        // Generate unique nullifier for this pickup
        nullifier = uint256(keccak256(abi.encode(
            data.secret,
            packageId,
            data.nonce,
            block.timestamp
        )));
        
        require(!usedNullifiers[msg.sender][nullifier], "Nullifier already used");
        usedNullifiers[msg.sender][nullifier] = true;
        
        // Generate commitment
        commitment = uint256(keccak256(abi.encode(
            data.secret,
            data.nameHash,
            data.phoneLastThree
        )));
        
        // Generate age proof (if age verified)
        ageProof = ageValid ? uint256(keccak256(abi.encode(
            data.age,
            data.ageVerificationTime,
            "age_verified"
        ))) : 0;
        
        // Increment nonce
        data.nonce++;
        
        return (
            data.secret,
            data.nameHash,
            data.phoneLastThree,
            data.age,
            data.nonce - 1, // Return the nonce that was used
            nullifier,
            commitment,
            ageProof
        );
    }
    
    /**
     * @dev Get wallet status
     */
    function getWalletStatus() external view returns (
        bool isInitialized,
        bool ageVerified,
        uint256 age,
        uint256 nonce,
        bool ageVerificationValid
    ) {
        BuyerData memory data = walletData[msg.sender];
        
        bool ageValid = data.ageVerified && 
            (block.timestamp - data.ageVerificationTime) <= AGE_VERIFICATION_VALIDITY;
        
        return (
            data.isInitialized,
            data.ageVerified,
            data.age,
            data.nonce,
            ageValid
        );
    }
    
    /**
     * @dev Check if wallet can pickup 18+ items
     */
    function canPickupAdultItems() external view returns (bool) {
        BuyerData memory data = walletData[msg.sender];
        
        if (!data.isInitialized || data.age < ADULT_AGE) {
            return false;
        }
        
        return data.ageVerified && 
            (block.timestamp - data.ageVerificationTime) <= AGE_VERIFICATION_VALIDITY;
    }
    
    // ==================== HELPER FUNCTIONS ====================
    
    /**
     * @dev Extract last 3 digits from phone number string
     */
    function extractLastThreeDigits(string memory phone) private pure returns (uint256) {
        bytes memory phoneBytes = bytes(phone);
        require(phoneBytes.length >= 3, "Phone number too short");
        
        uint256 result = 0;
        uint256 multiplier = 1;
        
        // Extract last 3 digits
        for (uint i = 0; i < 3; i++) {
            bytes1 digit = phoneBytes[phoneBytes.length - 1 - i];
            require(digit >= '0' && digit <= '9', "Invalid phone number");
            
            result += (uint8(digit) - 48) * multiplier;
            multiplier *= 10;
        }
        
        return result;
    }
    
    /**
     * @dev Verify commitment matches wallet data
     */
    function verifyCommitment(uint256 commitment) external view returns (bool) {
        BuyerData memory data = walletData[msg.sender];
        if (!data.isInitialized) return false;
        
        uint256 expectedCommitment = uint256(keccak256(abi.encode(
            data.secret,
            data.nameHash,
            data.phoneLastThree
        )));
        
        return commitment == expectedCommitment;
    }
    
    /**
     * @dev Reset wallet (emergency function)
     */
    function resetWallet() external {
        delete walletData[msg.sender];
    }
}