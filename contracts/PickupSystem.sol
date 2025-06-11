// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IPickupVerifier {
    function verifyProof(
        uint[2] memory _pA,
        uint[2][2] memory _pB,
        uint[2] memory _pC,
        uint[6] memory _pubSignals
    ) external view returns (bool);
}

/**
 * @title PickupSystem
 * @dev Real anonymous package pickup system with ZK proof verification
 * 
 * Three roles:
 * 1. Seller: Registers packages with buyer commitments
 * 2. Buyer: Generates ZK proofs for pickup authorization  
 * 3. Store: Verifies proofs and executes pickups
 */
contract PickupSystem {
    
    // ZK proof verifier contract
    IPickupVerifier public immutable verifier;
    
    // Package structure
    struct Package {
        bytes32 packageId;           // 包裹配送編號
        uint256 buyerCommitment;     // Commitment (replaces 買家姓名+電話末三碼)
        address storeAddress;        // 取件門市
        address seller;              // 賣家
        uint256 itemPrice;           // 商品價格
        uint256 shippingFee;         // 運費
        uint256 createdTime;         // 寄件成功時間
        uint256 expiryTime;          // 取件期限
        uint256 minAgeRequired;      // 最低年齡要求 (18+ items)
        bool isPickedUp;            // 是否已取件
        bool sellerPaysShipping;    // 運費付款方式
    }
    
    // Role management
    struct SellerInfo {
        bool isRegistered;
        uint256 totalPackages;
        uint256 successfulDeliveries;
        uint256 balance;            // Seller's balance for refunds
    }
    
    struct StoreInfo {
        bool isAuthorized;
        string storeName;
        string location;
        uint256 totalPickups;
        uint256 commissionRate;     // Commission percentage (basis points)
    }
    
    struct BuyerStats {
        uint256 totalPickups;
        uint256 lastPickupTime;
    }
    
    // Storage
    mapping(bytes32 => Package) public packages;
    mapping(uint256 => bool) public usedNullifiers;  // Prevent double pickup
    mapping(address => SellerInfo) public sellers;
    mapping(address => StoreInfo) public stores;
    mapping(address => BuyerStats) public buyerStats;
    
    // System parameters
    address public owner;
    uint256 public platformFeeRate = 100; // 1% in basis points
    uint256 public constant MAX_PICKUP_DAYS = 14;
    uint256 public constant COMMISSION_DENOMINATOR = 10000;
    
    // Events
    event SellerRegistered(address indexed seller);
    event StoreAuthorized(address indexed store, string storeName);
    event PackageRegistered(
        bytes32 indexed packageId,
        uint256 buyerCommitment,
        address indexed seller,
        address indexed store,
        uint256 itemPrice,
        uint256 shippingFee,
        uint256 minAgeRequired
    );
    event PackagePickedUp(
        bytes32 indexed packageId,
        uint256 nullifier,
        address indexed store,
        address indexed buyer
    );
    event PaymentProcessed(
        bytes32 indexed packageId,
        address indexed seller,
        address indexed store,
        uint256 sellerAmount,
        uint256 storeCommission,
        uint256 platformFee
    );
    
    constructor(address _verifier) {
        verifier = IPickupVerifier(_verifier);
        owner = msg.sender;
    }
    
    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }
    
    modifier onlyRegisteredSeller() {
        require(sellers[msg.sender].isRegistered, "Seller not registered");
        _;
    }
    
    modifier onlyAuthorizedStore() {
        require(stores[msg.sender].isAuthorized, "Store not authorized");
        _;
    }
    
    // ==================== SELLER FUNCTIONS ====================
    
    /**
     * @dev Register as a seller
     */
    function registerSeller() external {
        require(!sellers[msg.sender].isRegistered, "Already registered");
        
        sellers[msg.sender] = SellerInfo({
            isRegistered: true,
            totalPackages: 0,
            successfulDeliveries: 0,
            balance: 0
        });
        
        emit SellerRegistered(msg.sender);
    }
    
    /**
     * @dev Seller registers a package
     * @param packageId 包裹配送編號 (unique package tracking ID)
     * @param buyerCommitment Buyer's commitment (replaces 買家姓名+電話末三碼)
     * @param storeAddress 取件門市
     * @param itemPrice 商品價格
     * @param minAgeRequired 最低年齡要求 (18 for alcohol/tobacco, 0 for normal items)
     * @param sellerPaysShipping 運費付款方式 (true: seller pays, false: buyer pays)
     * @param pickupDays 取件期限 (days from now)
     */
    function registerPackage(
        bytes32 packageId,
        uint256 buyerCommitment,
        address storeAddress,
        uint256 itemPrice,
        uint256 minAgeRequired,
        bool sellerPaysShipping,
        uint256 pickupDays
    ) external payable onlyRegisteredSeller {
        require(packageId != bytes32(0), "Invalid package ID");
        require(buyerCommitment != 0, "Invalid buyer commitment");
        require(stores[storeAddress].isAuthorized, "Store not authorized");
        require(packages[packageId].packageId == bytes32(0), "Package exists");
        require(pickupDays > 0 && pickupDays <= MAX_PICKUP_DAYS, "Invalid pickup days");
        require(itemPrice > 0, "Invalid item price");
        
        uint256 shippingFee;
        uint256 totalRequired = itemPrice;
        
        if (sellerPaysShipping) {
            // Seller must pay item price + shipping fee
            require(msg.value >= totalRequired, "Insufficient payment");
            shippingFee = msg.value - itemPrice;
            require(shippingFee > 0, "Must include shipping fee");
        } else {
            // Seller only pays item price, buyer pays shipping later
            require(msg.value >= itemPrice, "Must pay item price");
            shippingFee = 0; // Will be paid by buyer
        }
        
        packages[packageId] = Package({
            packageId: packageId,
            buyerCommitment: buyerCommitment,
            storeAddress: storeAddress,
            seller: msg.sender,
            itemPrice: itemPrice,
            shippingFee: shippingFee,
            createdTime: block.timestamp,
            expiryTime: block.timestamp + (pickupDays * 1 days),
            minAgeRequired: minAgeRequired,
            isPickedUp: false,
            sellerPaysShipping: sellerPaysShipping
        });
        
        sellers[msg.sender].totalPackages++;
        
        emit PackageRegistered(
            packageId,
            buyerCommitment,
            msg.sender,
            storeAddress,
            itemPrice,
            shippingFee,
            minAgeRequired
        );
    }
    
    // ==================== STORE FUNCTIONS ====================
    
    /**
     * @dev Store executes package pickup with ZK proof verification
     * @param packageId Package to pickup
     * @param proof ZK proof in Groth16 format [pA, pB, pC]
     * @param nullifier Unique nullifier preventing double pickup
     * @param buyerAddress Buyer's address (for stats)
     */
    function executePickup(
        bytes32 packageId,
        uint[8] calldata proof, // [pA.x, pA.y, pB.x[0], pB.x[1], pB.y[0], pB.y[1], pC.x, pC.y]
        uint256 nullifier,
        address buyerAddress
    ) external payable onlyAuthorizedStore {
        Package storage pkg = packages[packageId];
        
        require(pkg.packageId != bytes32(0), "Package not found");
        require(!pkg.isPickedUp, "Already picked up");
        require(block.timestamp <= pkg.expiryTime, "Package expired");
        require(!usedNullifiers[nullifier], "Nullifier already used");
        require(pkg.storeAddress == msg.sender, "Wrong store");
        
        // Handle shipping fee payment by buyer
        if (!pkg.sellerPaysShipping) {
            require(msg.value >= pkg.shippingFee, "Insufficient shipping fee");
        }
        
        // Verify ZK proof
        require(_verifyPickupProof(proof, pkg, nullifier), "Invalid ZK proof");
        
        // Mark as picked up
        pkg.isPickedUp = true;
        usedNullifiers[nullifier] = true;
        
        // Update statistics
        sellers[pkg.seller].successfulDeliveries++;
        stores[msg.sender].totalPickups++;
        buyerStats[buyerAddress].totalPickups++;
        buyerStats[buyerAddress].lastPickupTime = block.timestamp;
        
        // Process payments
        _processPayments(pkg);
        
        emit PackagePickedUp(packageId, nullifier, msg.sender, buyerAddress);
    }
    
    // ==================== BUYER FUNCTIONS ====================
    
    /**
     * @dev Get buyer's pickup statistics
     */
    function getBuyerStats(address buyer) external view returns (
        uint256 totalPickups,
        uint256 lastPickupTime
    ) {
        BuyerStats memory stats = buyerStats[buyer];
        return (stats.totalPickups, stats.lastPickupTime);
    }
    
    // ==================== ADMIN FUNCTIONS ====================
    
    /**
     * @dev Authorize a store
     */
    function authorizeStore(
        address storeAddress,
        string calldata storeName,
        string calldata location,
        uint256 commissionRate
    ) external onlyOwner {
        require(!stores[storeAddress].isAuthorized, "Store already authorized");
        require(commissionRate <= 1000, "Commission too high"); // Max 10%
        
        stores[storeAddress] = StoreInfo({
            isAuthorized: true,
            storeName: storeName,
            location: location,
            totalPickups: 0,
            commissionRate: commissionRate
        });
        
        emit StoreAuthorized(storeAddress, storeName);
    }
    
    /**
     * @dev Remove store authorization
     */
    function removeStoreAuthorization(address storeAddress) external onlyOwner {
        stores[storeAddress].isAuthorized = false;
    }
    
    /**
     * @dev Update platform fee rate
     */
    function setPlatformFeeRate(uint256 newRate) external onlyOwner {
        require(newRate <= 500, "Fee too high"); // Max 5%
        platformFeeRate = newRate;
    }
    
    // ==================== INTERNAL FUNCTIONS ====================
    
    /**
     * @dev Verify ZK proof for pickup authorization
     */
    function _verifyPickupProof(
        uint[8] calldata proof,
        Package storage pkg,
        uint256 nullifier
    ) internal view returns (bool) {
        // Format proof for verifier
        uint[2] memory pA = [proof[0], proof[1]];
        uint[2][2] memory pB = [[proof[2], proof[3]], [proof[4], proof[5]]];
        uint[2] memory pC = [proof[6], proof[7]];
        
        // Public signals: [package_id, buyer_commitment, store_address, timestamp, min_age_required, nullifier]
        uint[6] memory pubSignals = [
            uint256(pkg.packageId),
            pkg.buyerCommitment,
            uint256(uint160(pkg.storeAddress)),
            block.timestamp,
            pkg.minAgeRequired,
            nullifier
        ];
        
        return verifier.verifyProof(pA, pB, pC, pubSignals);
    }
    
    /**
     * @dev Process payments to seller, store, and platform
     */
    function _processPayments(Package storage pkg) internal {
        uint256 totalValue = pkg.itemPrice + pkg.shippingFee;
        
        // Calculate fees
        uint256 platformFee = (totalValue * platformFeeRate) / COMMISSION_DENOMINATOR;
        uint256 storeCommission = (totalValue * stores[pkg.storeAddress].commissionRate) / COMMISSION_DENOMINATOR;
        uint256 sellerAmount = totalValue - platformFee - storeCommission;
        
        // Transfer payments
        payable(pkg.seller).transfer(sellerAmount);
        payable(pkg.storeAddress).transfer(storeCommission);
        payable(owner).transfer(platformFee);
        
        emit PaymentProcessed(
            pkg.packageId,
            pkg.seller,
            pkg.storeAddress,
            sellerAmount,
            storeCommission,
            platformFee
        );
    }
    
    // ==================== VIEW FUNCTIONS ====================
    
    /**
     * @dev Get complete package information
     */
    function getPackage(bytes32 packageId) external view returns (
        bytes32 id,
        uint256 buyerCommitment,
        address storeAddress,
        address seller,
        uint256 itemPrice,
        uint256 shippingFee,
        uint256 createdTime,
        uint256 expiryTime,
        uint256 minAgeRequired,
        bool isPickedUp,
        bool sellerPaysShipping
    ) {
        Package memory pkg = packages[packageId];
        return (
            pkg.packageId,
            pkg.buyerCommitment,
            pkg.storeAddress,
            pkg.seller,
            pkg.itemPrice,
            pkg.shippingFee,
            pkg.createdTime,
            pkg.expiryTime,
            pkg.minAgeRequired,
            pkg.isPickedUp,
            pkg.sellerPaysShipping
        );
    }
    
    /**
     * @dev Check if package is available for pickup
     */
    function canPickup(bytes32 packageId) external view returns (bool) {
        Package memory pkg = packages[packageId];
        return pkg.packageId != bytes32(0) && 
               !pkg.isPickedUp && 
               block.timestamp <= pkg.expiryTime;
    }
    
    /**
     * @dev Get store information
     */
    function getStoreInfo(address storeAddress) external view returns (
        bool isAuthorized,
        string memory storeName,
        string memory location,
        uint256 totalPickups,
        uint256 commissionRate
    ) {
        StoreInfo memory store = stores[storeAddress];
        return (
            store.isAuthorized,
            store.storeName,
            store.location,
            store.totalPickups,
            store.commissionRate
        );
    }
    
    /**
     * @dev Get seller information
     */
    function getSellerInfo(address sellerAddress) external view returns (
        bool isRegistered,
        uint256 totalPackages,
        uint256 successfulDeliveries,
        uint256 balance
    ) {
        SellerInfo memory seller = sellers[sellerAddress];
        return (
            seller.isRegistered,
            seller.totalPackages,
            seller.successfulDeliveries,
            seller.balance
        );
    }
}