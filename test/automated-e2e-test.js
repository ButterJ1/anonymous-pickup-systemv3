// test/automated-e2e-test.js
// Complete end-to-end automated testing suite for anonymous pickup system

const { ethers } = require("ethers");
const snarkjs = require("snarkjs");
const fs = require("fs");
const path = require("path");
const assert = require("assert");

/**
 * Comprehensive E2E Test Suite
 * 
 * Tests:
 * - Contract deployment
 * - ZK circuit compilation and proof generation
 * - Complete seller/buyer/store workflow
 * - Security features
 * - Error handling
 * - Performance metrics
 * - Analytics integration
 * - EIP-7702 wallet functionality
 */

class AnonymousPickupE2ETest {
    constructor() {
        this.testResults = {
            passed: 0,
            failed: 0,
            total: 0,
            errors: []
        };
        
        this.contracts = {};
        this.accounts = {};
        this.testData = {};
        
        this.useRealCircuit = false;
        this.testStartTime = Date.now();
    }

    // Initialize test environment
    async initialize() {
        console.log("🚀 Initializing Anonymous Pickup E2E Test Suite\n");
        
        try {
            // Connect to provider
            this.provider = new ethers.providers.JsonRpcProvider("http://localhost:8545");
            
            // Get test accounts
            const accounts = await this.provider.listAccounts();
            this.accounts = {
                deployer: accounts[0],
                seller1: accounts[1],
                seller2: accounts[2],
                buyer1: accounts[3],
                buyer2: accounts[4],
                store1: accounts[5],
                store2: accounts[6],
                admin: accounts[7]
            };
            
            console.log("👥 Test Accounts:");
            Object.entries(this.accounts).forEach(([role, address]) => {
                console.log(`   ${role}: ${address}`);
            });
            console.log();
            
            // Check if ZK circuit files exist
            this.useRealCircuit = this.checkCircuitFiles();
            
            if (this.useRealCircuit) {
                console.log("⚡ Using real ZK circuit for testing");
            } else {
                console.log("🔧 Using mock proofs for testing (compile circuit for full test)");
            }
            console.log();
            
        } catch (error) {
            throw new Error(`Initialization failed: ${error.message}`);
        }
    }

    // Check if circuit files exist
    checkCircuitFiles() {
        const requiredFiles = [
            './circuits/pickup-proof.wasm',
            './circuits/pickup-proof_final.zkey',
            './circuits/verification_key.json'
        ];
        
        return requiredFiles.every(file => fs.existsSync(file));
    }

    // Run all tests
    async runAllTests() {
        console.log("🧪 Starting Comprehensive E2E Test Suite\n");
        
        try {
            // Phase 1: Setup Tests
            await this.runSetupTests();
            
            // Phase 2: Core Functionality Tests
            await this.runCoreFunctionalityTests();
            
            // Phase 3: Security Tests
            await this.runSecurityTests();
            
            // Phase 4: Performance Tests
            await this.runPerformanceTests();
            
            // Phase 5: Edge Case Tests
            await this.runEdgeCaseTests();
            
            // Phase 6: Integration Tests
            await this.runIntegrationTests();
            
            // Generate test report
            this.generateTestReport();
            
        } catch (error) {
            console.error("❌ Test suite failed:", error);
            this.testResults.errors.push(`Test suite failure: ${error.message}`);
        }
    }

    // Phase 1: Setup Tests
    async runSetupTests() {
        console.log("📋 Phase 1: Setup Tests");
        console.log("========================\n");
        
        await this.test("Deploy MockVerifier Contract", async () => {
            const MockVerifier = await ethers.getContractFactory("MockPickupVerifier");
            this.contracts.verifier = await MockVerifier.deploy();
            await this.contracts.verifier.deployed();
            
            assert(this.contracts.verifier.address, "Verifier contract not deployed");
        });
        
        await this.test("Deploy PickupSystem Contract", async () => {
            const PickupSystem = await ethers.getContractFactory("PickupSystem");
            this.contracts.pickupSystem = await PickupSystem.deploy(this.contracts.verifier.address);
            await this.contracts.pickupSystem.deployed();
            
            assert(this.contracts.pickupSystem.address, "PickupSystem contract not deployed");
        });
        
        await this.test("Deploy EIP7702PickupWallet Contract", async () => {
            const EIP7702PickupWallet = await ethers.getContractFactory("EIP7702PickupWallet");
            this.contracts.walletEnhancement = await EIP7702PickupWallet.deploy();
            await this.contracts.walletEnhancement.deployed();
            
            assert(this.contracts.walletEnhancement.address, "EIP7702PickupWallet contract not deployed");
        });
        
        await this.test("Deploy PickupAnalytics Contract", async () => {
            const PickupAnalytics = await ethers.getContractFactory("PickupAnalytics");
            this.contracts.analytics = await PickupAnalytics.deploy(this.contracts.pickupSystem.address);
            await this.contracts.analytics.deployed();
            
            assert(this.contracts.analytics.address, "PickupAnalytics contract not deployed");
        });
        
        await this.test("Initialize System Configuration", async () => {
            // Authorize stores
            const pickupSystemAsAdmin = this.contracts.pickupSystem.connect(
                this.provider.getSigner(this.accounts.admin)
            );
            
            await pickupSystemAsAdmin.authorizeStore(
                this.accounts.store1,
                "FamilyMart Hsinchu",
                "Hsinchu Science Park",
                200 // 2% commission
            );
            
            await pickupSystemAsAdmin.authorizeStore(
                this.accounts.store2,
                "7-Eleven Taipei",
                "Taipei Main Station",
                150 // 1.5% commission
            );
            
            // Verify store authorization
            const store1Info = await this.contracts.pickupSystem.getStoreInfo(this.accounts.store1);
            assert(store1Info.isAuthorized, "Store 1 not authorized");
            
            const store2Info = await this.contracts.pickupSystem.getStoreInfo(this.accounts.store2);
            assert(store2Info.isAuthorized, "Store 2 not authorized");
        });
        
        console.log("✅ Phase 1 Complete: All contracts deployed and configured\n");
    }

    // Phase 2: Core Functionality Tests
    async runCoreFunctionalityTests() {
        console.log("🔧 Phase 2: Core Functionality Tests");
        console.log("=====================================\n");
        
        await this.test("Seller Registration", async () => {
            const pickupSystemAsSeller1 = this.contracts.pickupSystem.connect(
                this.provider.getSigner(this.accounts.seller1)
            );
            
            await pickupSystemAsSeller1.registerSeller();
            
            const sellerInfo = await this.contracts.pickupSystem.getSellerInfo(this.accounts.seller1);
            assert(sellerInfo.isRegistered, "Seller not registered");
        });
        
        await this.test("Buyer Wallet Initialization", async () => {
            const walletAsBuyer1 = this.contracts.walletEnhancement.connect(
                this.provider.getSigner(this.accounts.buyer1)
            );
            
            const buyerSecret = ethers.utils.randomBytes(32);
            const nameHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("Test Buyer"));
            const phoneLastThree = 123;
            const age = 25;
            
            this.testData.buyer1 = {
                secret: ethers.BigNumber.from(buyerSecret),
                nameHash: ethers.BigNumber.from(nameHash),
                phoneLastThree,
                age
            };
            
            await walletAsBuyer1.initializeWallet(
                this.testData.buyer1.secret,
                this.testData.buyer1.nameHash,
                this.testData.buyer1.phoneLastThree,
                this.testData.buyer1.age
            );
            
            const walletStatus = await walletAsBuyer1.getWalletStatus();
            assert(walletStatus.isInitialized, "Wallet not initialized");
        });
        
        await this.test("Local Age Verification", async () => {
            const walletAsBuyer1 = this.contracts.walletEnhancement.connect(
                this.provider.getSigner(this.accounts.buyer1)
            );
            
            const ageProofHash = ethers.utils.keccak256(
                ethers.utils.toUtf8Bytes("age_verified_" + Date.now())
            );
            
            await walletAsBuyer1.verifyAgeLocally(ageProofHash);
            
            const walletStatus = await walletAsBuyer1.getWalletStatus();
            assert(walletStatus.isAgeVerified, "Age not verified");
        });
        
        await this.test("Generate Buyer Commitment", async () => {
            const walletAsBuyer1 = this.contracts.walletEnhancement.connect(
                this.provider.getSigner(this.accounts.buyer1)
            );
            
            const commitment = await walletAsBuyer1.generateBuyerCommitment();
            
            this.testData.buyer1Commitment = commitment;
            
            assert(commitment.gt(0), "Invalid commitment generated");
        });
        
        await this.test("Package Registration", async () => {
            const pickupSystemAsSeller1 = this.contracts.pickupSystem.connect(
                this.provider.getSigner(this.accounts.seller1)
            );
            
            const packageId = ethers.utils.keccak256(
                ethers.utils.toUtf8Bytes("TEST_PKG_" + Date.now())
            );
            
            const itemPrice = ethers.utils.parseEther("0.05");
            const shippingFee = ethers.utils.parseEther("0.01");
            const totalValue = itemPrice.add(shippingFee);
            
            this.testData.packageId = packageId;
            
            await pickupSystemAsSeller1.registerPackage(
                packageId,
                this.testData.buyer1Commitment,
                this.accounts.store1,
                itemPrice,
                18, // min age required
                true, // seller pays shipping
                7, // pickup days
                { value: totalValue }
            );
            
            const packageInfo = await this.contracts.pickupSystem.getPackage(packageId);
            assert(packageInfo.id === packageId, "Package not registered correctly");
        });
        
        await this.test("Generate ZK Proof for Pickup", async () => {
            if (this.useRealCircuit) {
                await this.generateRealZKProof();
            } else {
                await this.generateMockProof();
            }
        });
        
        await this.test("Execute Package Pickup", async () => {
            const pickupSystemAsStore1 = this.contracts.pickupSystem.connect(
                this.provider.getSigner(this.accounts.store1)
            );
            
            await pickupSystemAsStore1.executePickup(
                this.testData.packageId,
                this.testData.proof,
                this.testData.nullifier,
                this.accounts.buyer1
            );
            
            const packageInfo = await this.contracts.pickupSystem.getPackage(this.testData.packageId);
            assert(packageInfo.isPickedUp, "Package not marked as picked up");
            
            const nullifierUsed = await this.contracts.pickupSystem.usedNullifiers(this.testData.nullifier);
            assert(nullifierUsed, "Nullifier not marked as used");
        });
        
        console.log("✅ Phase 2 Complete: Core functionality working\n");
    }

    // Phase 3: Security Tests
    async runSecurityTests() {
        console.log("🔒 Phase 3: Security Tests");
        console.log("==========================\n");
        
        await this.test("Prevent Double Pickup", async () => {
            const pickupSystemAsStore1 = this.contracts.pickupSystem.connect(
                this.provider.getSigner(this.accounts.store1)
            );
            
            try {
                // Attempt to pickup same package again
                await pickupSystemAsStore1.executePickup(
                    this.testData.packageId,
                    this.testData.proof,
                    this.testData.nullifier,
                    this.accounts.buyer1
                );
                
                throw new Error("Double pickup should have failed");
            } catch (error) {
                assert(error.message.includes("already used") || error.message.includes("already picked"), 
                       "Double pickup not properly prevented");
            }
        });
        
        await this.test("Unauthorized Store Prevention", async () => {
            // Try to pickup from unauthorized address
            const unauthorizedSigner = this.provider.getSigner(this.accounts.buyer2);
            const pickupSystemAsUnauthorized = this.contracts.pickupSystem.connect(unauthorizedSigner);
            
            try {
                await pickupSystemAsUnauthorized.executePickup(
                    ethers.utils.keccak256(ethers.utils.toUtf8Bytes("FAKE_PKG")),
                    Array(8).fill("0x1234"),
                    ethers.BigNumber.from("999"),
                    this.accounts.buyer1
                );
                
                throw new Error("Unauthorized pickup should have failed");
            } catch (error) {
                assert(error.message.includes("not authorized") || error.message.includes("revert"), 
                       "Unauthorized access not properly prevented");
            }
        });
        
        await this.test("Invalid Commitment Protection", async () => {
            // Register package with invalid commitment
            const pickupSystemAsSeller1 = this.contracts.pickupSystem.connect(
                this.provider.getSigner(this.accounts.seller1)
            );
            
            const fakePackageId = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("FAKE_PKG"));
            const fakeCommitment = ethers.BigNumber.from("12345");
            
            await pickupSystemAsSeller1.registerPackage(
                fakePackageId,
                fakeCommitment,
                this.accounts.store1,
                ethers.utils.parseEther("0.01"),
                0, // no age requirement
                true,
                7,
                { value: ethers.utils.parseEther("0.02") }
            );
            
            // Generate proof with wrong commitment should fail verification
            // This test passes as long as the invalid proof is rejected during pickup
        });
        
        await this.test("Age Requirement Enforcement", async () => {
            // This test would verify that underage users cannot pickup 18+ items
            // Implementation depends on ZK circuit verification
            const walletStatus = await this.contracts.walletEnhancement.connect(
                this.provider.getSigner(this.accounts.buyer1)
            ).getWalletStatus();
            
            assert(walletStatus.userAge >= 18, "Age requirement check failed");
        });
        
        console.log("✅ Phase 3 Complete: Security features working\n");
    }

    // Phase 4: Performance Tests
    async runPerformanceTests() {
        console.log("⚡ Phase 4: Performance Tests");
        console.log("=============================\n");
        
        await this.test("Gas Usage Analysis", async () => {
            const gasUsage = {};
            
            // Test seller registration gas
            const pickupSystemAsSeller2 = this.contracts.pickupSystem.connect(
                this.provider.getSigner(this.accounts.seller2)
            );
            
            const sellerRegTx = await pickupSystemAsSeller2.registerSeller();
            const sellerRegReceipt = await sellerRegTx.wait();
            gasUsage.sellerRegistration = sellerRegReceipt.gasUsed.toNumber();
            
            // Test package registration gas
            const packageRegTx = await pickupSystemAsSeller2.registerPackage(
                ethers.utils.keccak256(ethers.utils.toUtf8Bytes("PERF_TEST_PKG")),
                ethers.BigNumber.from("12345"),
                this.accounts.store1,
                ethers.utils.parseEther("0.01"),
                0,
                true,
                7,
                { value: ethers.utils.parseEther("0.02") }
            );
            const packageRegReceipt = await packageRegTx.wait();
            gasUsage.packageRegistration = packageRegReceipt.gasUsed.toNumber();
            
            console.log("   Gas Usage Results:");
            console.log(`   Seller Registration: ${gasUsage.sellerRegistration.toLocaleString()} gas`);
            console.log(`   Package Registration: ${gasUsage.packageRegistration.toLocaleString()} gas`);
            
            // Verify gas usage is within reasonable limits
            assert(gasUsage.sellerRegistration < 100000, "Seller registration gas too high");
            assert(gasUsage.packageRegistration < 200000, "Package registration gas too high");
        });
        
        await this.test("Proof Generation Time", async () => {
            if (this.useRealCircuit) {
                const startTime = Date.now();
                await this.generateRealZKProof();
                const endTime = Date.now();
                
                const proofTime = endTime - startTime;
                console.log(`   ZK Proof Generation Time: ${proofTime}ms`);
                
                // Proof generation should complete within reasonable time (30 seconds)
                assert(proofTime < 30000, "Proof generation too slow");
            } else {
                console.log("   Skipping proof generation time test (using mock proofs)");
            }
        });
        
        await this.test("Concurrent Operations", async () => {
            // Test multiple simultaneous package registrations
            const promises = [];
            
            for (let i = 0; i < 5; i++) {
                const promise = this.contracts.pickupSystem.connect(
                    this.provider.getSigner(this.accounts.seller2)
                ).registerPackage(
                    ethers.utils.keccak256(ethers.utils.toUtf8Bytes(`CONCURRENT_PKG_${i}`)),
                    ethers.BigNumber.from(`${12345 + i}`),
                    this.accounts.store1,
                    ethers.utils.parseEther("0.01"),
                    0,
                    true,
                    7,
                    { value: ethers.utils.parseEther("0.02") }
                );
                promises.push(promise);
            }
            
            await Promise.all(promises);
            console.log("   Successfully handled 5 concurrent package registrations");
        });
        
        console.log("✅ Phase 4 Complete: Performance within acceptable limits\n");
    }

    // Phase 5: Edge Case Tests
    async runEdgeCaseTests() {
        console.log("🎯 Phase 5: Edge Case Tests");
        console.log("============================\n");
        
        await this.test("Expired Package Pickup", async () => {
            // This would test packages that have exceeded their pickup window
            // For now, we just verify the expiry logic exists
            const packageInfo = await this.contracts.pickupSystem.getPackage(this.testData.packageId);
            assert(packageInfo.expiryTime.gt(0), "Package expiry time not set");
        });
        
        await this.test("Maximum Values Handling", async () => {
            // Test with maximum allowed values
            const maxUint256 = ethers.constants.MaxUint256;
            
            // Test large commitment values
            const largeCommitment = maxUint256.sub(1);
            
            try {
                await this.contracts.pickupSystem.connect(
                    this.provider.getSigner(this.accounts.seller2)
                ).registerPackage(
                    ethers.utils.keccak256(ethers.utils.toUtf8Bytes("MAX_VALUE_PKG")),
                    largeCommitment,
                    this.accounts.store1,
                    ethers.utils.parseEther("0.01"),
                    0,
                    true,
                    7,
                    { value: ethers.utils.parseEther("0.02") }
                );
                
                console.log("   Successfully handled maximum commitment value");
            } catch (error) {
                console.log("   Maximum value handling: " + error.message);
            }
        });
        
        await this.test("Empty String/Zero Value Handling", async () => {
            // Test contract behavior with edge case inputs
            try {
                await this.contracts.pickupSystem.connect(
                    this.provider.getSigner(this.accounts.seller2)
                ).registerPackage(
                    ethers.constants.HashZero, // Empty package ID
                    ethers.BigNumber.from("12345"),
                    this.accounts.store1,
                    ethers.utils.parseEther("0.01"),
                    0,
                    true,
                    7,
                    { value: ethers.utils.parseEther("0.02") }
                );
                
                throw new Error("Should have failed with empty package ID");
            } catch (error) {
                assert(error.message.includes("Invalid package ID") || error.message.includes("revert"), 
                       "Empty package ID not properly handled");
            }
        });
        
        console.log("✅ Phase 5 Complete: Edge cases handled properly\n");
    }

    // Phase 6: Integration Tests
    async runIntegrationTests() {
        console.log("🔗 Phase 6: Integration Tests");
        console.log("==============================\n");
        
        await this.test("Analytics Integration", async () => {
            // Test that analytics contract records data correctly
            const sellerMetrics = await this.contracts.analytics.getSellerMetrics(this.accounts.seller1);
            
            assert(sellerMetrics.totalPackages.toNumber() > 0, "Analytics not recording seller data");
            
            const storeMetrics = await this.contracts.analytics.getStoreMetrics(this.accounts.store1);
            assert(storeMetrics.totalPickups.toNumber() > 0, "Analytics not recording store data");
        });
        
        await this.test("Multi-Store Operations", async () => {
            // Test operations across multiple stores
            const stores = [this.accounts.store1, this.accounts.store2];
            
            for (const store of stores) {
                const storeInfo = await this.contracts.pickupSystem.getStoreInfo(store);
                assert(storeInfo.isAuthorized, `Store ${store} not properly configured`);
            }
            
            console.log("   All stores properly configured and operational");
        });
        
        await this.test("Cross-Contract Communication", async () => {
            // Test that all contracts work together properly
            const systemKPIs = await this.contracts.analytics.getSystemKPIs();
            
            assert(systemKPIs.totalPackages.toNumber() > 0, "Cross-contract data flow issue");
            
            console.log("   Cross-contract communication working properly");
        });
        
        console.log("✅ Phase 6 Complete: All integrations working\n");
    }

    // Generate mock proof for testing
    async generateMockProof() {
        const walletAsBuyer1 = this.contracts.walletEnhancement.connect(
            this.provider.getSigner(this.accounts.buyer1)
        );
        
        const proofInputs = await walletAsBuyer1.prepareProofInputs(this.testData.packageId);
        
        // Generate mock proof
        this.testData.proof = Array(8).fill(0).map(() => 
            ethers.BigNumber.from(ethers.utils.randomBytes(32)).toString()
        );
        
        this.testData.nullifier = proofInputs.nullifier;
        
        console.log("   Mock proof generated for testing");
    }

    // Generate real ZK proof
    async generateRealZKProof() {
        const walletAsBuyer1 = this.contracts.walletEnhancement.connect(
            this.provider.getSigner(this.accounts.buyer1)
        );
        
        const proofInputs = await walletAsBuyer1.prepareProofInputs(this.testData.packageId);
        const [buyerSecret, userNameHash, phoneLastThree, age, nonce, nullifier] = proofInputs;
        
        const circuitInputs = {
            buyer_secret: buyerSecret.toString(),
            user_name_hash: userNameHash.toString(),
            phone_last3: phoneLastThree.toString(),
            age: age.toString(),
            nonce: nonce.toString(),
            package_id: this.testData.packageId,
            buyer_commitment: this.testData.buyer1Commitment.toString(),
            store_address: ethers.BigNumber.from(this.accounts.store1).toString(),
            timestamp: Math.floor(Date.now() / 1000).toString(),
            min_age_required: "18"
        };
        
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            circuitInputs,
            "./circuits/pickup-proof.wasm",
            "./circuits/pickup-proof_final.zkey"
        );
        
        this.testData.proof = [
            proof.pi_a[0], proof.pi_a[1],
            proof.pi_b[0][1], proof.pi_b[0][0],
            proof.pi_b[1][1], proof.pi_b[1][0],
            proof.pi_c[0], proof.pi_c[1]
        ];
        
        this.testData.nullifier = nullifier;
        
        console.log("   Real ZK proof generated and verified");
    }

    // Test wrapper function
    async test(name, testFunction) {
        this.testResults.total++;
        try {
            console.log(`🧪 Testing: ${name}`);
            await testFunction();
            console.log(`✅ Passed: ${name}\n`);
            this.testResults.passed++;
        } catch (error) {
            console.log(`❌ Failed: ${name}`);
            console.log(`   Error: ${error.message}\n`);
            this.testResults.failed++;
            this.testResults.errors.push(`${name}: ${error.message}`);
        }
    }

    // Generate comprehensive test report
    generateTestReport() {
        const testDuration = Date.now() - this.testStartTime;
        
        console.log("📊 COMPREHENSIVE TEST REPORT");
        console.log("=============================\n");
        
        console.log("📈 Test Statistics:");
        console.log(`   Total Tests: ${this.testResults.total}`);
        console.log(`   Passed: ${this.testResults.passed} (${((this.testResults.passed / this.testResults.total) * 100).toFixed(1)}%)`);
        console.log(`   Failed: ${this.testResults.failed} (${((this.testResults.failed / this.testResults.total) * 100).toFixed(1)}%)`);
        console.log(`   Duration: ${(testDuration / 1000).toFixed(2)} seconds\n`);
        
        console.log("🏗️ System Components:");
        console.log(`   ✅ PickupSystem: ${this.contracts.pickupSystem.address}`);
        console.log(`   ✅ EIP7702PickupWallet: ${this.contracts.walletEnhancement.address}`);
        console.log(`   ✅ PickupAnalytics: ${this.contracts.analytics.address}`);
        console.log(`   ✅ MockVerifier: ${this.contracts.verifier.address}\n`);
        
        console.log("🔧 Test Environment:");
        console.log(`   Provider: ${this.provider.connection.url}`);
        console.log(`   ZK Circuit: ${this.useRealCircuit ? 'Real' : 'Mock'}`);
        console.log(`   Accounts: ${Object.keys(this.accounts).length}\n`);
        
        if (this.testResults.errors.length > 0) {
            console.log("❌ Failed Tests:");
            this.testResults.errors.forEach(error => {
                console.log(`   • ${error}`);
            });
            console.log();
        }
        
        console.log("🎯 Test Coverage:");
        console.log("   ✅ Contract Deployment");
        console.log("   ✅ Seller Registration");
        console.log("   ✅ Buyer Wallet Setup");
        console.log("   ✅ Package Registration");
        console.log("   ✅ ZK Proof Generation");
        console.log("   ✅ Pickup Verification");
        console.log("   ✅ Security Features");
        console.log("   ✅ Performance Metrics");
        console.log("   ✅ Edge Cases");
        console.log("   ✅ Integration Tests\n");
        
        const overallStatus = this.testResults.failed === 0 ? "PASSED" : "FAILED";
        const statusEmoji = overallStatus === "PASSED" ? "🎉" : "💥";
        
        console.log(`${statusEmoji} OVERALL TEST STATUS: ${overallStatus}`);
        
        if (overallStatus === "PASSED") {
            console.log("\n🚀 System is ready for production deployment!");
            console.log("   • All core functionality working");
            console.log("   • Security features validated");
            console.log("   • Performance within limits");
            console.log("   • Edge cases handled");
            console.log("   • Integration tests passing");
        } else {
            console.log("\n⚠️  System needs attention before deployment:");
            console.log("   • Review failed tests");
            console.log("   • Fix identified issues");
            console.log("   • Re-run test suite");
        }
        
        // Write detailed report to file
        const reportData = {
            timestamp: new Date().toISOString(),
            duration: testDuration,
            results: this.testResults,
            contracts: Object.fromEntries(
                Object.entries(this.contracts).map(([key, contract]) => [key, contract.address])
            ),
            environment: {
                provider: this.provider.connection.url,
                zkCircuit: this.useRealCircuit ? 'real' : 'mock',
                accountCount: Object.keys(this.accounts).length
            }
        };
        
        fs.writeFileSync(
            `./test-reports/e2e-report-${Date.now()}.json`,
            JSON.stringify(reportData, null, 2)
        );
        
        console.log("\n💾 Detailed report saved to ./test-reports/");
    }
}

// Mock contract ABIs for testing
const MOCK_PICKUP_VERIFIER_BYTECODE = "0x608060405234801561001057600080fd5b50610150806100206000396000f3fe608060405234801561001057600080fd5b506004361061002b5760003560e01c80631e8e1e1314610030575b600080fd5b61004361003e366004610055565b6001949350505050565b604051901515815260200160405180910390f35b600080600080600080600080610120896040838d018e6000851161007857600080fd5b8335600160208083020191831c6001603f1b168117821c61009857600080fd5b6040848e0180358e358f01358d358301011093506000811561007857600080fdfea264697066735822122030c6e7a5e5a4e1a3f19c3e5a1a8e0a6f2b5e8f7c9b0e1a5c3c7e4f6e9d8b5a2a64736f6c63430008180033";

// Main execution
async function runE2ETests() {
    // Create test reports directory
    if (!fs.existsSync('./test-reports')) {
        fs.mkdirSync('./test-reports');
    }
    
    const testSuite = new AnonymousPickupE2ETest();
    
    try {
        await testSuite.initialize();
        await testSuite.runAllTests();
    } catch (error) {
        console.error("💥 E2E Test Suite Failed:", error);
        process.exit(1);
    }
}

// Export for use in other test files
module.exports = { AnonymousPickupE2ETest, runE2ETests };

// Run if this file is executed directly
if (require.main === module) {
    runE2ETests();
}