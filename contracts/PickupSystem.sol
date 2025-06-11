// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title PickupSystem
 * @dev Simple anonymous package pickup system
 * 
 * Replaces traditional pickup process:
 * OLD: Show name + phone last 3 digits + ID card
 * NEW: Show QR code with ZK proof
 */
contract PickupSystem {
    
    // Package structure
    struct Package {
        bytes32 id;                  // 包裹配送編號
        uint256 buyerCommitment;     // Replaces 買家姓名+電話末三碼
        address seller;              // 賣家
        address store;               // 取件門市
        uint256 itemPrice;           // 商品價格
        uint256 shippingFee;         // 運費
        uint256 createdTime;         // 寄件成功時間
        uint256 expiryTime;          // 取件期限
        bool needsAgeCheck;          // 是否需要年齡驗證 (18+)
        bool sellerPaysShipping;     // 賣家付運費 or 買家付運費
        bool isPickedUp;             // 是否已取件
    }
    
    // System state
    mapping(bytes32 => Package) public packages;
    mapping(uint256 => bool) public usedNullifiers;    // Prevent double pickup
    mapping(address => bool) public authorizedStores;  // Authorized pickup stores
    mapping(address => bool) public registeredSellers; // Registered sellers
    
    address public owner;
    uint256 public platformFee = 50; // 0.5% platform fee
    
    // Events
    event SellerRegistered(address indexed seller);
    event StoreAuthorized(address indexed store);
    event PackageRegistered(
        bytes32 indexed packageId,
        uint256 buyerCommitment,
        address indexed seller,
        address indexed store,
        bool needsAgeCheck
    );
    event PackagePickedUp(
        bytes32 indexed packageId,
        uint256 nullifier,
        address indexed store
    );
    
    constructor() {
        owner = msg.sender;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier onlyAuthorizedStore() {
        require(authorizedStores[msg.sender], "Store not authorized");
        _;
    }
    
    modifier onlyRegisteredSeller() {
        require(registeredSellers[msg.sender], "Seller not registered");
        _;
    }
    
    // ==================== ADMIN FUNCTIONS ====================
    
    /**
     * @dev Authorize a store for package pickup
     */
    function authorizeStore(address store) external onlyOwner {
        authorizedStores[store] = true;
        emit StoreAuthorized(store);
    }
    
    // ==================== SELLER FUNCTIONS ====================
    
    /**
     * @dev Register as a seller
     */
    function registerSeller() external {
        registeredSellers[msg.sender] = true;
        emit SellerRegistered(msg.sender);
    }
    
    /**
     * @dev Register a package for pickup
     * @param packageId 包裹配送編號 (unique)
     * @param buyerCommitment Buyer's commitment (replaces 買家姓名+電話末三碼)
     * @param store 取件門市
     * @param itemPrice 商品價格
     * @param shippingFee 運費
     * @param needsAgeCheck Whether 18+ verification needed
     * @param sellerPaysShipping Whether seller pays shipping
     * @param pickupDays How many days buyer has to pickup
     */
    function registerPackage(
        bytes32 packageId,
        uint256 buyerCommitment,
        address store,
        uint256 itemPrice,
        uint256 shippingFee,
        bool needsAgeCheck,
        bool sellerPaysShipping,
        uint256 pickupDays
    ) external payable onlyRegisteredSeller {
        require(packageId != bytes32(0), "Invalid package ID");
        require(buyerCommitment != 0, "Invalid buyer commitment");
        require(authorizedStores[store], "Store not authorized");
        require(packages[packageId].id == bytes32(0), "Package already exists");
        require(pickupDays > 0 && pickupDays <= 30, "Invalid pickup days");
        
        uint256 requiredPayment = itemPrice;
        if (sellerPaysShipping) {
            requiredPayment += shippingFee;
        }
        require(msg.value >= requiredPayment, "Insufficient payment");
        
        packages[packageId] = Package({
            id: packageId,
            buyerCommitment: buyerCommitment,
            seller: msg.sender,
            store: store,
            itemPrice: itemPrice,
            shippingFee: shippingFee,
            createdTime: block.timestamp,
            expiryTime: block.timestamp + (pickupDays * 1 days),
            needsAgeCheck: needsAgeCheck,
            sellerPaysShipping: sellerPaysShipping,
            isPickedUp: false
        });
        
        emit PackageRegistered(
            packageId,
            buyerCommitment,
            msg.sender,
            store,
            needsAgeCheck
        );
    }
    
    // ==================== STORE FUNCTIONS ====================
    
    /**
     * @dev Execute package pickup with ZK proof verification
     * @param packageId Package to pickup
     * @param nullifier Unique nullifier (prevents double pickup)
     * @param ageProof Age verification proof (0 if not needed)
     * @param commitmentProof Proof that buyer knows secret behind commitment
     */
    function executePickup(
        bytes32 packageId,
        uint256 nullifier,
        uint256 ageProof,
        uint256 commitmentProof
    ) external payable onlyAuthorizedStore {
        Package storage pkg = packages[packageId];
        
        require(pkg.id != bytes32(0), "Package not found");
        require(!pkg.isPickedUp, "Already picked up");
        require(block.timestamp <= pkg.expiryTime, "Package expired");
        require(!usedNullifiers[nullifier], "Nullifier already used");
        require(pkg.store == msg.sender, "Wrong store");
        
        // Verify commitment proof (simplified - in production use ZK verifier)
        require(commitmentProof != 0, "Invalid commitment proof");
        
        // Verify age proof if needed
        if (pkg.needsAgeCheck) {
            require(ageProof != 0, "Age verification required");
        }
        
        // Handle shipping fee payment
        if (!pkg.sellerPaysShipping) {
            require(msg.value >= pkg.shippingFee, "Insufficient shipping fee");
        }
        
        // Mark as picked up
        pkg.isPickedUp = true;
        usedNullifiers[nullifier] = true;
        
        // Process payments
        uint256 totalValue = pkg.itemPrice;
        if (!pkg.sellerPaysShipping) {
            totalValue += msg.value; // Add shipping fee paid by buyer
        } else {
            totalValue += pkg.shippingFee; // Add shipping fee paid by seller
        }
        
        uint256 platformFeeAmount = (totalValue * platformFee) / 10000;
        uint256 sellerAmount = totalValue - platformFeeAmount;
        
        // Transfer payments
        payable(pkg.seller).transfer(sellerAmount);
        payable(owner).transfer(platformFeeAmount);
        
        emit PackagePickedUp(packageId, nullifier, msg.sender);
    }
    
    // ==================== VIEW FUNCTIONS ====================
    
    /**
     * @dev Get package information
     */
    function getPackage(bytes32 packageId) external view returns (
        bytes32 id,
        uint256 buyerCommitment,
        address seller,
        address store,
        uint256 itemPrice,
        uint256 shippingFee,
        uint256 createdTime,
        uint256 expiryTime,
        bool needsAgeCheck,
        bool sellerPaysShipping,
        bool isPickedUp
    ) {
        Package memory pkg = packages[packageId];
        return (
            pkg.id,
            pkg.buyerCommitment,
            pkg.seller,
            pkg.store,
            pkg.itemPrice,
            pkg.shippingFee,
            pkg.createdTime,
            pkg.expiryTime,
            pkg.needsAgeCheck,
            pkg.sellerPaysShipping,
            pkg.isPickedUp
        );
    }
    
    /**
     * @dev Check if package can be picked up
     */
    function canPickup(bytes32 packageId) external view returns (bool) {
        Package memory pkg = packages[packageId];
        return pkg.id != bytes32(0) && 
               !pkg.isPickedUp && 
               block.timestamp <= pkg.expiryTime;
    }
    
    /**
     * @dev Check if nullifier was used
     */
    function isNullifierUsed(uint256 nullifier) external view returns (bool) {
        return usedNullifiers[nullifier];
    }
}