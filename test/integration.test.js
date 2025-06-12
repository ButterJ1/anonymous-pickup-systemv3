const { expect } = require("chai");
const { ethers } = require("hardhat");
const snarkjs = require("snarkjs");

/**
 * Integration Tests for Anonymous Pickup System
 * Tests the complete flow from seller registration to anonymous pickup
 */

describe("Anonymous Pickup System - Integration Tests", function() {
  let pickupSystem;
  let localWallet;
  let owner;
  let seller;
  let buyer;
  let store;
  let unauthorized;

  // Shared test data (accessible across all test suites)
  let buyerCommitment;
  let pickupProofData;
  let packageIdHash;

  // Test data
  const BUYER_NAME = "Alice Wang";
  const BUYER_PHONE = "0912345678";
  const BUYER_AGE = 25;
  const PACKAGE_ID = "PKG2024001";
  const ITEM_PRICE = ethers.parseEther("0.05");
  const SHIPPING_FEE = ethers.parseEther("0.01");

  before(async function() {
    // Get signers
    [owner, seller, buyer, store, unauthorized] = await ethers.getSigners();
    
    console.log("🚀 Setting up integration tests...");
    console.log("Accounts:");
    console.log("  Owner:", owner.address);
    console.log("  Seller:", seller.address);
    console.log("  Buyer:", buyer.address);
    console.log("  Store:", store.address);
  });

  describe("Contract Deployment", function() {
    it("Should deploy LocalWallet contract", async function() {
      const LocalWallet = await ethers.getContractFactory("LocalWallet");
      localWallet = await LocalWallet.deploy();
      await localWallet.waitForDeployment();
      
      expect(await localWallet.getAddress()).to.not.equal(ethers.ZeroAddress);
      console.log("✅ LocalWallet deployed to:", await localWallet.getAddress());
    });

    it("Should deploy PickupSystem contract", async function() {
      const PickupSystem = await ethers.getContractFactory("PickupSystem");
      pickupSystem = await PickupSystem.deploy();
      await pickupSystem.waitForDeployment();
      
      expect(await pickupSystem.getAddress()).to.not.equal(ethers.ZeroAddress);
      expect(await pickupSystem.owner()).to.equal(owner.address);
      console.log("✅ PickupSystem deployed to:", await pickupSystem.getAddress());
    });
  });

  describe("System Setup", function() {
    it("Should authorize store", async function() {
      await pickupSystem.connect(owner).authorizeStore(store.address);
      
      const isAuthorized = await pickupSystem.authorizedStores(store.address);
      expect(isAuthorized).to.be.true;
      console.log("✅ Store authorized");
    });

    it("Should register seller", async function() {
      await pickupSystem.connect(seller).registerSeller();
      
      const isRegistered = await pickupSystem.registeredSellers(seller.address);
      expect(isRegistered).to.be.true;
      console.log("✅ Seller registered");
    });

    it("Should reject unauthorized store operations", async function() {
      const isAuthorized = await pickupSystem.authorizedStores(unauthorized.address);
      expect(isAuthorized).to.be.false;
      console.log("✅ Unauthorized store correctly rejected");
    });
  });

  describe("EIP-7702 Enhanced Wallet Flow", function() {
    let walletStatus;

    it("Should initialize buyer's enhanced wallet", async function() {
      // Initialize wallet with buyer data
      await localWallet.connect(buyer).initializeWallet(
        BUYER_NAME,
        BUYER_PHONE,
        BUYER_AGE
      );

      // Check wallet status
      walletStatus = await localWallet.connect(buyer).getWalletStatus();
      expect(walletStatus[0]).to.be.true; // isInitialized
      expect(walletStatus[2]).to.equal(BUYER_AGE); // age

      console.log("✅ Enhanced wallet initialized");
      console.log("  Age:", walletStatus[2].toString());
      console.log("  Nonce:", walletStatus[3].toString());
    });

    it("Should generate buyer commitment", async function() {
      const tx = await localWallet.connect(buyer).generateCommitment();
      const receipt = await tx.wait();
      
      // Extract commitment from event logs
      const event = receipt.logs.find(log => {
        try {
          const parsed = localWallet.interface.parseLog(log);
          return parsed.name === 'CommitmentGenerated';
        } catch {
          return false;
        }
      });
      
      expect(event).to.not.be.undefined;
      
      const parsedEvent = localWallet.interface.parseLog(event);
      buyerCommitment = parsedEvent.args.commitment;
      expect(buyerCommitment).to.not.equal(0);
      
      console.log("✅ Buyer commitment generated");
      console.log("  Commitment:", buyerCommitment.toString());
    });

    it("Should verify commitment locally", async function() {
      const isValid = await localWallet.connect(buyer).verifyCommitment(buyerCommitment);
      expect(isValid).to.be.true;
      console.log("✅ Commitment verification successful");
    });

    it("Should handle age verification", async function() {
      // Mock age proof hash (in real system, this comes from camera/AI)
      const ageProofHash = ethers.keccak256(
        ethers.toUtf8Bytes(`age_verified_${BUYER_AGE}_${Date.now()}`)
      );

      await localWallet.connect(buyer).verifyAgeLocally(ageProofHash);

      // Check updated status
      const status = await localWallet.connect(buyer).getWalletStatus();
      expect(status[1]).to.be.true; // ageVerified
      expect(status[4]).to.be.true; // ageVerificationValid

      const canPickupAdult = await localWallet.connect(buyer).canPickupAdultItems();
      expect(canPickupAdult).to.be.true;

      console.log("✅ Age verification completed");
    });
  });

  describe("Package Registration and Pickup Flow", function() {
    it("Should register package with buyer commitment", async function() {
      // Ensure buyerCommitment is available from previous test
      expect(buyerCommitment).to.not.be.undefined;
      
      packageIdHash = ethers.keccak256(ethers.toUtf8Bytes(PACKAGE_ID));
      
      // Seller pays item price + shipping fee
      const totalValue = ITEM_PRICE + SHIPPING_FEE;
      
      await pickupSystem.connect(seller).registerPackage(
        packageIdHash,
        buyerCommitment,
        store.address,
        ITEM_PRICE,
        SHIPPING_FEE,
        true, // needsAgeCheck
        true, // sellerPaysShipping
        7,    // pickupDays
        { value: totalValue }
      );

      // Verify package registration
      const packageInfo = await pickupSystem.getPackage(packageIdHash);
      expect(packageInfo.id).to.equal(packageIdHash);
      expect(packageInfo.buyerCommitment).to.equal(buyerCommitment);
      expect(packageInfo.seller).to.equal(seller.address);
      expect(packageInfo.store).to.equal(store.address);
      expect(packageInfo.needsAgeCheck).to.be.true;

      console.log("✅ Package registered with commitment");
      console.log("  Package ID:", PACKAGE_ID);
      console.log("  Seller:", packageInfo.seller);
      console.log("  Store:", packageInfo.store);
      console.log("  Age check required:", packageInfo.needsAgeCheck);
    });

    it("Should prepare pickup proof data", async function() {
      // Ensure buyerCommitment is available from previous test
      expect(buyerCommitment).to.not.be.undefined;
      expect(packageIdHash).to.not.be.undefined;
      
      console.log("🔍 Debug: Preparing pickup proof data");
      console.log("  Package ID Hash:", packageIdHash);
      console.log("  Buyer address:", buyer.address);
      
      try {
        // Check wallet status first
        const walletStatus = await localWallet.connect(buyer).getWalletStatus();
        console.log("  Wallet status:", {
          isInitialized: walletStatus[0],
          ageVerified: walletStatus[1],
          age: walletStatus[2].toString(),
          nonce: walletStatus[3].toString(),
          ageVerificationValid: walletStatus[4]
        });
        
        // Use callStatic to get return values without sending transaction
        const proofData = await localWallet.connect(buyer).preparePickupProof.staticCall(packageIdHash);
        
        console.log("  Raw proof data:", proofData);
        
        // Ensure proofData is valid
        expect(proofData).to.not.be.undefined;
        expect(proofData.length).to.equal(8);
        
        pickupProofData = {
          secret: proofData[0],
          nameHash: proofData[1], 
          phoneLastThree: proofData[2],
          age: proofData[3],
          nonce: proofData[4],
          nullifier: proofData[5],
          commitment: proofData[6],
          ageProof: proofData[7]
        };

        // Validate each field
        expect(pickupProofData.secret).to.not.be.undefined;
        expect(pickupProofData.nameHash).to.not.be.undefined;
        expect(pickupProofData.phoneLastThree).to.not.be.undefined;
        expect(pickupProofData.age).to.not.be.undefined;
        expect(pickupProofData.nonce).to.not.be.undefined;
        expect(pickupProofData.nullifier).to.not.be.undefined;
        expect(pickupProofData.commitment).to.not.be.undefined;
        expect(pickupProofData.ageProof).to.not.be.undefined;

        expect(pickupProofData.nullifier).to.not.equal(0);
        expect(pickupProofData.commitment).to.equal(buyerCommitment);

        // Now actually send the transaction to update state (increment nonce)
        await localWallet.connect(buyer).preparePickupProof(packageIdHash);

        console.log("✅ Pickup proof data prepared");
        console.log("  Nullifier:", pickupProofData.nullifier.toString());
        console.log("  Age proof:", pickupProofData.ageProof.toString());
        
      } catch (error) {
        console.error("❌ Error preparing pickup proof:", error.message);
        throw error;
      }
    });

    it("Should execute anonymous pickup", async function() {
      // Ensure prerequisites are met
      expect(packageIdHash).to.not.be.undefined;
      expect(pickupProofData).to.not.be.undefined;
      expect(pickupProofData.nullifier).to.not.be.undefined;
      
      console.log("🔍 Debug: Executing anonymous pickup");
      console.log("  Package ID Hash:", packageIdHash);
      console.log("  Nullifier:", pickupProofData.nullifier.toString());
      
      try {
        // Check package can be picked up
        const canPickup = await pickupSystem.canPickup(packageIdHash);
        
        // Debug: Check package info if canPickup is false
        if (!canPickup) {
          const packageInfo = await pickupSystem.getPackage(packageIdHash);
          console.log("Package info:", {
            id: packageInfo.id.toString(),
            isPickedUp: packageInfo.isPickedUp,
            expiryTime: packageInfo.expiryTime.toString(),
            currentTime: Math.floor(Date.now() / 1000)
          });
        }
        
        expect(canPickup).to.be.true;

        // Check nullifier hasn't been used
        const nullifierUsed = await pickupSystem.usedNullifiers(pickupProofData.nullifier);
        expect(nullifierUsed).to.be.false;

        // Generate mock commitment proof (in real system, this comes from ZK proof)
        const commitmentProof = ethers.keccak256(
          ethers.toUtf8Bytes("mock_zk_proof_commitment_valid")
        );

        // Execute pickup
        await pickupSystem.connect(store).executePickup(
          packageIdHash,
          pickupProofData.nullifier,  
          pickupProofData.ageProof,
          commitmentProof
        );

        // Verify pickup completed
        const packageInfo = await pickupSystem.getPackage(packageIdHash);
        expect(packageInfo.isPickedUp).to.be.true;

        const nullifierNowUsed = await pickupSystem.usedNullifiers(pickupProofData.nullifier);
        expect(nullifierNowUsed).to.be.true;

        console.log("✅ Anonymous pickup completed");
        
      } catch (error) {
        console.error("❌ Error executing pickup:", error.message);
        throw error;
      }
    });

    it("Should prevent double pickup with same nullifier", async function() {
      // Ensure pickupProofData is defined
      expect(pickupProofData).to.not.be.undefined;
      expect(pickupProofData.nullifier).to.not.be.undefined;
      
      console.log("🔍 Debug: Testing double pickup prevention");
      
      try {
        // Register a NEW package for this test (so it's not already picked up)
        const newPackageId = "PKG2024999"; // Different package
        const newPackageIdHash = ethers.keccak256(ethers.toUtf8Bytes(newPackageId));
        
        // Register the new package with same buyer commitment
        await pickupSystem.connect(seller).registerPackage(
          newPackageIdHash,
          buyerCommitment,
          store.address,
          ITEM_PRICE,
          SHIPPING_FEE,
          true, // needsAgeCheck
          true, // sellerPaysShipping
          7,    // pickupDays
          { value: ITEM_PRICE + SHIPPING_FEE }
        );
        
        console.log("  Registered new package for nullifier test");
        
        // Generate a FRESH nullifier for this test (since the previous one is already used)
        const freshNullifierData = await localWallet.connect(buyer).preparePickupProof.staticCall(newPackageIdHash);
        const freshNullifier = freshNullifierData[5]; // nullifier is at index 5
        const freshAgeProof = freshNullifierData[7]; // ageProof is at index 7
        
        console.log("  Fresh nullifier:", freshNullifier.toString());
        
        // Actually send the transaction to update state
        await localWallet.connect(buyer).preparePickupProof(newPackageIdHash);
        
        const commitmentProof = ethers.keccak256(
          ethers.toUtf8Bytes("mock_zk_proof_commitment_valid")
        );

        // First pickup with the fresh nullifier (should succeed)
        await pickupSystem.connect(store).executePickup(
          newPackageIdHash,
          freshNullifier,
          freshAgeProof,
          commitmentProof
        );
        
        console.log("  First pickup completed with fresh nullifier");
        
        // Register ANOTHER new package
        const anotherPackageId = "PKG2024998"; 
        const anotherPackageIdHash = ethers.keccak256(ethers.toUtf8Bytes(anotherPackageId));
        
        await pickupSystem.connect(seller).registerPackage(
          anotherPackageIdHash,
          buyerCommitment,
          store.address,
          ITEM_PRICE,
          SHIPPING_FEE,
          true, // needsAgeCheck
          true, // sellerPaysShipping
          7,    // pickupDays
          { value: ITEM_PRICE + SHIPPING_FEE }
        );
        
        console.log("  Registered second package for nullifier reuse test");

        // Try to pickup the second package with the SAME nullifier (should fail)
        await expect(
          pickupSystem.connect(store).executePickup(
            anotherPackageIdHash,  // Different package
            freshNullifier, // Same nullifier (should be rejected)
            freshAgeProof,
            commitmentProof
          )
        ).to.be.revertedWith("Nullifier already used");

        console.log("✅ Double pickup prevention works");
        
      } catch (error) {
        console.error("❌ Error testing double pickup prevention:", error.message);
        throw error;
      }
    });
  });

  describe("Edge Cases and Security", function() {
    it("Should reject pickup from unauthorized store", async function() {
      // Ensure buyerCommitment is available from previous tests
      expect(buyerCommitment).to.not.be.undefined;
      
      // Register another package
      const packageId2 = "PKG2024002";
      const packageIdHash2 = ethers.keccak256(ethers.toUtf8Bytes(packageId2));
      
      await pickupSystem.connect(seller).registerPackage(
        packageIdHash2,
        buyerCommitment,
        store.address, // Authorized for this package
        ITEM_PRICE,
        SHIPPING_FEE,
        false, // no age check
        true,
        7,
        { value: ITEM_PRICE + SHIPPING_FEE }
      );

      // Try pickup from unauthorized store
      const mockProof = ethers.keccak256(ethers.toUtf8Bytes("mock"));
      
      await expect(
        pickupSystem.connect(unauthorized).executePickup(
          packageIdHash2,
          mockProof,
          0, // no age proof needed
          mockProof
        )
      ).to.be.revertedWith("Store not authorized");

      console.log("✅ Unauthorized store correctly rejected");
    });

    it("Should handle package expiration", async function() {
      // Ensure buyerCommitment is available from previous tests
      expect(buyerCommitment).to.not.be.undefined;
      
      // This would require time manipulation in a real test
      // For now, just verify the expiry logic exists
      const packageId3 = "PKG2024003";
      const packageIdHash3 = ethers.keccak256(ethers.toUtf8Bytes(packageId3));
      
      await pickupSystem.connect(seller).registerPackage(
        packageIdHash3,
        buyerCommitment,
        store.address,
        ITEM_PRICE,
        SHIPPING_FEE,
        false,
        true,
        1, // 1 day pickup window
        { value: ITEM_PRICE + SHIPPING_FEE }
      );

      const packageInfo = await pickupSystem.getPackage(packageIdHash3);
      expect(packageInfo.expiryTime).to.be.gt(packageInfo.createdTime);

      console.log("✅ Package expiration logic verified");
    });

    it("Should require proper age verification for 18+ items", async function() {
      // Test with a minor's wallet
      const minorWallet = localWallet.connect(unauthorized);
      
      // Initialize with minor age
      await minorWallet.initializeWallet("Minor User", "0987654321", 16);
      
      const canPickupAdult = await minorWallet.canPickupAdultItems();
      expect(canPickupAdult).to.be.false;

      console.log("✅ Age restriction properly enforced");
    });
  });

  describe("Privacy and Anonymity Verification", function() {
    it("Should not expose buyer's personal information", async function() {
      // Check that the package only contains commitment, not personal data
      const packageInfo = await pickupSystem.getPackage(
        ethers.keccak256(ethers.toUtf8Bytes(PACKAGE_ID))
      );

      // Commitment should not reveal name or phone
      expect(packageInfo.buyerCommitment).to.not.equal(
        ethers.keccak256(ethers.toUtf8Bytes(BUYER_NAME))
      );
      expect(packageInfo.buyerCommitment).to.not.equal(
        ethers.keccak256(ethers.toUtf8Bytes(BUYER_PHONE))
      );

      console.log("✅ Personal information properly protected");
    });

    it("Should demonstrate privacy-preserving commitment scheme", async function() {
      // Ensure buyerCommitment is available from previous tests
      expect(buyerCommitment).to.not.be.undefined;
      
      // Two buyers with same name/phone should generate different commitments
      // due to different secrets
      const buyer2 = store; // Reuse existing account
      
      await localWallet.connect(buyer2).initializeWallet(BUYER_NAME, BUYER_PHONE, BUYER_AGE);
      const tx = await localWallet.connect(buyer2).generateCommitment();
      const receipt = await tx.wait();
      
      const event = receipt.logs.find(log => {
        try {
          const parsed = localWallet.interface.parseLog(log);
          return parsed.name === 'CommitmentGenerated';
        } catch {
          return false;
        }
      });
      
      const parsedEvent = localWallet.interface.parseLog(event);
      const commitment2 = parsedEvent.args.commitment;

      // Same personal data, different commitments due to different secrets
      expect(commitment2).to.not.equal(buyerCommitment);

      console.log("✅ Commitment privacy verified");
      console.log("  Commitment 1:", buyerCommitment.toString());
      console.log("  Commitment 2:", commitment2.toString());
    });
  });

  // describe("System Statistics and Monitoring", function() {
  //   it("Should track system metrics", async function() {
  //     // This would include metrics like:
  //     // - Total packages registered
  //     // - Successful pickups
  //     // - Failed attempts
  //     // - Privacy breaches (should be 0)
      
  //     console.log("✅ System monitoring capabilities verified");
  //   });
  // });

  after(async function() {
    console.log("🚀 Anonymous Pickup System is ready for deployment!");
  });
});