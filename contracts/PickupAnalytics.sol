// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./PickupSystem.sol";

/**
 * @title PickupAnalytics
 * @dev Analytics and monitoring contract for the pickup system
 * Tracks KPIs, generates reports, and provides business intelligence
 */
contract PickupAnalytics {
    
    PickupSystem public immutable pickupSystem;
    
    // Time-based statistics
    struct DailyStats {
        uint256 packagesRegistered;
        uint256 packagesPickedUp;
        uint256 totalRevenue;
        uint256 uniqueUsers;
        uint256 averagePickupTime;
        mapping(address => bool) dailyUsers;
    }
    
    struct StorePerformance {
        uint256 totalPickups;
        uint256 totalRevenue;
        uint256 averageRating;
        uint256 totalRatings;
        uint256 averagePickupTime;
        bool isActive;
    }
    
    struct SellerMetrics {
        uint256 totalPackages;
        uint256 successfulDeliveries;
        uint256 totalRevenue;
        uint256 averageItemValue;
        uint256 returnsCount;
        uint256 customerSatisfactionScore;
    }
    
    // Storage
    mapping(uint256 => DailyStats) public dailyStats; // day => stats
    mapping(address => StorePerformance) public storePerformance;
    mapping(address => SellerMetrics) public sellerMetrics;
    mapping(bytes32 => uint256) public packagePickupTimes;
    
    // System-wide KPIs
    uint256 public totalPackagesEver;
    uint256 public totalRevenueEver;
    uint256 public totalUsersEver;
    uint256 public averageSuccessRate;
    
    // Events for real-time monitoring
    event DailyStatsUpdated(uint256 indexed day, uint256 packages, uint256 pickups, uint256 revenue);
    event StoreRated(address indexed store, uint256 rating, uint256 newAverage);
    event PerformanceAlert(address indexed entity, string alertType, uint256 value);
    event MilestoneReached(string milestone, uint256 value);
    
    constructor(address _pickupSystem) {
        pickupSystem = PickupSystem(_pickupSystem);
    }
    
    /**
     * @dev Record package registration for analytics
     * Called by PickupSystem when package is registered
     */
    function recordPackageRegistration(
        bytes32 packageId,
        address seller,
        uint256 itemPrice,
        uint256 shippingFee
    ) external {
        require(msg.sender == address(pickupSystem), "Only pickup system");
        
        uint256 today = block.timestamp / 1 days;
        uint256 totalValue = itemPrice + shippingFee;
        
        // Update daily stats
        DailyStats storage dayStats = dailyStats[today];
        dayStats.packagesRegistered++;
        dayStats.totalRevenue += totalValue;
        
        // Track unique users
        if (!dayStats.dailyUsers[seller]) {
            dayStats.dailyUsers[seller] = true;
            dayStats.uniqueUsers++;
        }
        
        // Update seller metrics
        SellerMetrics storage metrics = sellerMetrics[seller];
        metrics.totalPackages++;
        metrics.totalRevenue += totalValue;
        metrics.averageItemValue = metrics.totalRevenue / metrics.totalPackages;
        
        // Update system totals
        totalPackagesEver++;
        totalRevenueEver += totalValue;
        
        emit DailyStatsUpdated(today, dayStats.packagesRegistered, dayStats.packagesPickedUp, dayStats.totalRevenue);
        
        // Check for milestones
        if (totalPackagesEver % 1000 == 0) {
            emit MilestoneReached("packages", totalPackagesEver);
        }
    }
    
    /**
     * @dev Record package pickup for analytics
     */
    function recordPackagePickup(
        bytes32 packageId,
        address store,
        address seller,
        address buyer,
        uint256 registrationTime
    ) external {
        require(msg.sender == address(pickupSystem), "Only pickup system");
        
        uint256 today = block.timestamp / 1 days;
        uint256 pickupTime = block.timestamp - registrationTime;
        
        // Update daily stats
        DailyStats storage dayStats = dailyStats[today];
        dayStats.packagesPickedUp++;
        dayStats.averagePickupTime = (dayStats.averagePickupTime * (dayStats.packagesPickedUp - 1) + pickupTime) / dayStats.packagesPickedUp;
        
        // Track unique buyers
        if (!dayStats.dailyUsers[buyer]) {
            dayStats.dailyUsers[buyer] = true;
            dayStats.uniqueUsers++;
        }
        
        // Update store performance
        StorePerformance storage storePerf = storePerformance[store];
        storePerf.totalPickups++;
        storePerf.averagePickupTime = (storePerf.averagePickupTime * (storePerf.totalPickups - 1) + pickupTime) / storePerf.totalPickups;
        
        // Update seller metrics
        SellerMetrics storage sellerMetrics_ = sellerMetrics[seller];
        sellerMetrics_.successfulDeliveries++;
        
        // Record pickup time for this package
        packagePickupTimes[packageId] = pickupTime;
        
        // Update success rate
        averageSuccessRate = (totalUsersEver > 0) ? (sellerMetrics_.successfulDeliveries * 100) / totalPackagesEver : 0;
        
        emit DailyStatsUpdated(today, dayStats.packagesRegistered, dayStats.packagesPickedUp, dayStats.totalRevenue);
        
        // Performance alerts
        if (pickupTime > 7 days) {
            emit PerformanceAlert(store, "slow_pickup", pickupTime);
        }
    }
    
    /**
     * @dev Rate a store after pickup
     * @param store Store to rate
     * @param rating Rating (1-5 stars)
     */
    function rateStore(address store, uint256 rating) external {
        require(rating >= 1 && rating <= 5, "Invalid rating");
        
        StorePerformance storage perf = storePerformance[store];
        
        // Update average rating
        uint256 totalScore = perf.averageRating * perf.totalRatings;
        perf.totalRatings++;
        perf.averageRating = (totalScore + rating) / perf.totalRatings;
        
        emit StoreRated(store, rating, perf.averageRating);
        
        // Alert if rating drops below 3.0
        if (perf.averageRating < 3000) { // 3.0 * 1000 for precision
            emit PerformanceAlert(store, "low_rating", perf.averageRating);
        }
    }
    
    /**
     * @dev Get comprehensive daily statistics
     */
    function getDailyStats(uint256 day) external view returns (
        uint256 packagesRegistered,
        uint256 packagesPickedUp,
        uint256 totalRevenue,
        uint256 uniqueUsers,
        uint256 averagePickupTime,
        uint256 successRate
    ) {
        DailyStats storage stats = dailyStats[day];
        uint256 rate = stats.packagesRegistered > 0 ? (stats.packagesPickedUp * 100) / stats.packagesRegistered : 0;
        
        return (
            stats.packagesRegistered,
            stats.packagesPickedUp,
            stats.totalRevenue,
            stats.uniqueUsers,
            stats.averagePickupTime,
            rate
        );
    }
    
    /**
     * @dev Get store performance metrics
     */
    function getStoreMetrics(address store) external view returns (
        uint256 totalPickups,
        uint256 totalRevenue,
        uint256 averageRating,
        uint256 totalRatings,
        uint256 averagePickupTime,
        bool isActive
    ) {
        StorePerformance memory perf = storePerformance[store];
        return (
            perf.totalPickups,
            perf.totalRevenue,
            perf.averageRating,
            perf.totalRatings,
            perf.averagePickupTime,
            perf.isActive
        );
    }
    
    /**
     * @dev Get seller performance metrics
     */
    function getSellerMetrics(address seller) external view returns (
        uint256 totalPackages,
        uint256 successfulDeliveries,
        uint256 totalRevenue,
        uint256 averageItemValue,
        uint256 successRate,
        uint256 customerSatisfactionScore
    ) {
        SellerMetrics memory metrics = sellerMetrics[seller];
        uint256 rate = metrics.totalPackages > 0 ? (metrics.successfulDeliveries * 100) / metrics.totalPackages : 0;
        
        return (
            metrics.totalPackages,
            metrics.successfulDeliveries,
            metrics.totalRevenue,
            metrics.averageItemValue,
            rate,
            metrics.customerSatisfactionScore
        );
    }
    
    /**
     * @dev Get system-wide KPIs
     */
    function getSystemKPIs() external view returns (
        uint256 totalPackages,
        uint256 totalRevenue,
        uint256 totalUsers,
        uint256 systemSuccessRate,
        uint256 averageTransactionValue
    ) {
        uint256 avgValue = totalPackagesEver > 0 ? totalRevenueEver / totalPackagesEver : 0;
        
        return (
            totalPackagesEver,
            totalRevenueEver,
            totalUsersEver,
            averageSuccessRate,
            avgValue
        );
    }
    
    /**
     * @dev Get performance comparison for last N days
     */
    function getPerformanceTrend(uint256 days) external view returns (
        uint256[] memory dailyPackages,
        uint256[] memory dailyPickups,
        uint256[] memory dailyRevenue
    ) {
        dailyPackages = new uint256[](days);
        dailyPickups = new uint256[](days);
        dailyRevenue = new uint256[](days);
        
        uint256 currentDay = block.timestamp / 1 days;
        
        for (uint256 i = 0; i < days; i++) {
            uint256 day = currentDay - i;
            DailyStats storage stats = dailyStats[day];
            
            dailyPackages[i] = stats.packagesRegistered;
            dailyPickups[i] = stats.packagesPickedUp;
            dailyRevenue[i] = stats.totalRevenue;
        }
        
        return (dailyPackages, dailyPickups, dailyRevenue);
    }
    
    /**
     * @dev Get top performing stores
     */
    function getTopStores(address[] calldata storeList, uint256 limit) external view returns (
        address[] memory topStores,
        uint256[] memory pickupCounts,
        uint256[] memory ratings
    ) {
        require(limit <= storeList.length, "Limit too high");
        
        // Simple sorting for top stores by pickup count
        address[] memory sortedStores = new address[](storeList.length);
        uint256[] memory sortedCounts = new uint256[](storeList.length);
        uint256[] memory sortedRatings = new uint256[](storeList.length);
        
        // Copy data
        for (uint256 i = 0; i < storeList.length; i++) {
            sortedStores[i] = storeList[i];
            sortedCounts[i] = storePerformance[storeList[i]].totalPickups;
            sortedRatings[i] = storePerformance[storeList[i]].averageRating;
        }
        
        // Bubble sort (simple, for small lists)
        for (uint256 i = 0; i < storeList.length - 1; i++) {
            for (uint256 j = 0; j < storeList.length - i - 1; j++) {
                if (sortedCounts[j] < sortedCounts[j + 1]) {
                    // Swap
                    (sortedStores[j], sortedStores[j + 1]) = (sortedStores[j + 1], sortedStores[j]);
                    (sortedCounts[j], sortedCounts[j + 1]) = (sortedCounts[j + 1], sortedCounts[j]);
                    (sortedRatings[j], sortedRatings[j + 1]) = (sortedRatings[j + 1], sortedRatings[j]);
                }
            }
        }
        
        // Return top N
        topStores = new address[](limit);
        pickupCounts = new uint256[](limit);
        ratings = new uint256[](limit);
        
        for (uint256 i = 0; i < limit; i++) {
            topStores[i] = sortedStores[i];
            pickupCounts[i] = sortedCounts[i];
            ratings[i] = sortedRatings[i];
        }
        
        return (topStores, pickupCounts, ratings);
    }
    
    /**
     * @dev Emergency pause analytics (admin only)
     */
    function pauseAnalytics() external {
        // In production, add proper access control
        require(msg.sender == pickupSystem.owner(), "Not authorized");
        // Pause logic here
    }
}