// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title LocalWallet - EIP-7702 Smart EOA Contract
 * @dev This contract is delegated to by buyer's EOA via EIP-7702
 * Enables local operations for anonymous package pickup
 */
contract LocalWallet {
    
    struct BuyerIdentity {
        uint256 secret;              // Private secret for commitments
        uint256 nameHash;            // Hash of buyer's name
        uint256 phoneLastThree;      // Last 3 digits of phone (0-999)
        uint256 nonce;               // For generating unique commitments
        uint256 age;                 // Buyer's age
        uint256 commitment;          // Buyer's commitment
        uint256 lastAgeVerification; // When age was verified
        bool isInitialized;          // Wallet setup status
    }
    
    mapping(address => BuyerIdentity) private identities;
    
    uint256 private constant AGE_VERIFICATION_VALIDITY = 20 days;
    uint256 private constant ADULT_AGE = 18;
    
    // Events
    event IdentityCreated(address indexed buyer, uint256 commitment);
    event AgeVerified(address indexed buyer, uint256 timestamp);
    event CommitmentGenerated(address indexed buyer, uint256 commitment);
    
    // Custom errors for gas efficiency
    error AlreadyInitialized();
    error NotInitialized();
    error InvalidAge();
    error InvalidPhoneNumber();
    error InvalidInput();
    
    /**
     * @dev Initialize buyer identity (called after EIP-7702 delegation)
     * This generates the buyer's cryptographic identity for anonymous pickups
     */
    function initializeBuyerIdentity(
        string calldata name,
        string calldata phone,
        uint256 age
    ) external returns (uint256) {
        if (identities[msg.sender].isInitialized) revert AlreadyInitialized();
        if (age < 13 || age > 150) revert InvalidAge();
        if (bytes(phone).length < 3) revert InvalidPhoneNumber();
        
        // Generate cryptographically secure secret
        uint256 secret = uint256(keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            msg.sender,
            name,
            phone,
            age
        )));
        
        // Hash name for privacy (Poseidon equivalent using keccak256)
        uint256 nameHash = uint256(keccak256(abi.encodePacked(name)));
        
        // Extract last 3 digits of phone
        uint256 phoneLastThree = extractLastThreeDigits(phone);
        
        // Generate unique nonce
        uint256 nonce = uint256(keccak256(abi.encodePacked(secret, name, block.timestamp)));
        
        // Generate buyer commitment: hash(secret, nameHash, phoneLastThree, nonce)
        uint256 commitment = uint256(keccak256(abi.encodePacked(
            secret,
            nameHash,
            phoneLastThree,
            nonce
        )));
        
        // Store buyer identity
        identities[msg.sender] = BuyerIdentity({
            secret: secret,
            nameHash: nameHash,
            phoneLastThree: phoneLastThree,
            nonce: nonce,
            age: age,
            commitment: commitment,
            lastAgeVerification: 0,
            isInitialized: true
        });
        
        emit IdentityCreated(msg.sender, commitment);
        return commitment;
    }
    
    /**
     * @dev Verify age locally (valid for 20 days)
     * In production, this would verify actual age proof data
     */
    function verifyAgeLocally(bytes memory _ageProof) external {
        if (!identities[msg.sender].isInitialized) revert NotInitialized();
        if (_ageProof.length == 0) revert InvalidInput();
        
        identities[msg.sender].lastAgeVerification = block.timestamp;
        emit AgeVerified(msg.sender, block.timestamp);
    }
    
    /**
     * @dev Get pickup proof data for ZK circuit
     * Returns all necessary data for generating ZK proofs
     */
    function getPickupProofData(bytes32 _packageId) external view returns (
        uint256 buyerSecret,
        uint256 nameHash,
        uint256 phoneLastThree,
        uint256 nonce,
        uint256 age,
        uint256 commitment,
        bool ageVerificationValid
    ) {
        BuyerIdentity memory identity = identities[msg.sender];
        if (!identity.isInitialized) revert NotInitialized();
        
        bool ageValid = identity.lastAgeVerification > 0 && 
            (block.timestamp - identity.lastAgeVerification) <= AGE_VERIFICATION_VALIDITY;
        
        return (
            identity.secret,
            identity.nameHash,
            identity.phoneLastThree,
            identity.nonce,
            identity.age,
            identity.commitment,
            ageValid
        );
    }
    
    /**
     * @dev Check if age verification is still valid
     */
    function isAgeVerificationValid() external view returns (bool) {
        BuyerIdentity memory identity = identities[msg.sender];
        if (!identity.isInitialized || identity.lastAgeVerification == 0) {
            return false;
        }
        return (block.timestamp - identity.lastAgeVerification) <= AGE_VERIFICATION_VALIDITY;
    }
    
    /**
     * @dev Generate buyer commitment (for sharing with seller)
     */
    function getBuyerCommitment() external view returns (uint256) {
        BuyerIdentity memory identity = identities[msg.sender];
        if (!identity.isInitialized) revert NotInitialized();
        return identity.commitment;
    }
    
    /**
     * @dev Update age (for birthday updates)
     */
    function updateAge(uint256 _newAge) external {
        if (!identities[msg.sender].isInitialized) revert NotInitialized();
        if (_newAge <= identities[msg.sender].age || _newAge > 150) revert InvalidAge();
        
        identities[msg.sender].age = _newAge;
    }
    
    /**
     * @dev Check if wallet is initialized
     */
    function isInitialized() external view returns (bool) {
        return identities[msg.sender].isInitialized;
    }
    
    /**
     * @dev Extract last 3 digits from phone number string
     */
    function extractLastThreeDigits(string memory phone) private pure returns (uint256) {
        bytes memory phoneBytes = bytes(phone);
        if (phoneBytes.length < 3) revert InvalidPhoneNumber();
        
        uint256 result = 0;
        uint256 multiplier = 1;
        
        // Extract last 3 characters and convert to number
        for (uint i = 0; i < 3; i++) {
            uint256 charIndex = phoneBytes.length - 1 - i;
            bytes1 char = phoneBytes[charIndex];
            
            if (char < '0' || char > '9') {
                revert InvalidPhoneNumber();
            }
            
            uint256 digit = uint256(uint8(char)) - 48; // Convert ASCII to number
            result += digit * multiplier;
            multiplier *= 10;
        }
        
        return result;
    }
    
    /**
     * @dev Emergency reset (use with caution)
     */
    function resetIdentity() external {
        delete identities[msg.sender];
    }
}