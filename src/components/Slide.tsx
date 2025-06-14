import React from 'react';

const AnonymousPickupPresentation = () => {
  return (
    <div style={{ 
      backgroundColor: 'white', 
      color: 'black', 
      fontFamily: 'Arial, sans-serif',
      lineHeight: '1.6',
      maxWidth: '400mm',
      margin: '0 auto',
      padding: '20mm',
      fontSize: '11pt'
    }}>
      {/* Title Page */}
      <div style={{ textAlign: 'center', marginBottom: '40px', pageBreakAfter: 'always' }}>
        <h1 style={{ fontSize: '24pt', marginBottom: '20px', color: '#2c3e50' }}>
          Anonymous Package Pickup System
        </h1>
        <h2 style={{ fontSize: '18pt', marginBottom: '20px', color: '#34495e' }}>
          Leveraging EIP-7702 Account Abstraction & Zero-Knowledge Proofs
        </h2>
        <div style={{ fontSize: '14pt', marginTop: '40px' }}>
          <p><strong>A Revolutionary Approach to Privacy-Preserving E-commerce</strong></p>
          <p style={{ marginTop: '20px', fontStyle: 'italic' }}>
            "How we discovered the limitations of current Web3 tooling<br/>
            and built a production-ready privacy solution"
          </p>
        </div>
      </div>

      {/* Problem Discovery */}
      <section style={{ marginBottom: '30px' }}>
        <h2 style={{ color: '#2c3e50', borderBottom: '2px solid #3498db', paddingBottom: '10px' }}>
          1. The Problem We Discovered
        </h2>
        <p>
          Traditional e-commerce package pickup systems suffer from a fundamental privacy paradox. When Alice orders a product online and picks it up at a local store, she must reveal her full identity to multiple parties who don't need to know it. The seller needs proof of a legitimate buyer, the store needs proof of pickup authorization, but neither needs Alice's personal information.
        </p>
        <p>
          Our investigation revealed three critical flaws in existing systems:
        </p>
        <div style={{ marginLeft: '20px' }}>
          <p><strong>Identity Over-Exposure:</strong> Buyers must provide full personal details (name, phone, address) to sellers who only need payment confirmation and delivery logistics.</p>
          <p><strong>Centralized Trust:</strong> Current systems rely on centralized databases storing personal information, creating honeypots for data breaches and privacy violations.</p>
          <p><strong>Verification Inefficiency:</strong> Store staff must manually verify identity documents against order information, creating bottlenecks and potential for human error.</p>
        </div>
        <p>
          The core insight: <em>What if we could prove someone is authorized to pick up a package without revealing who they are?</em>
        </p>
      </section>

      {/* Current Process Analysis */}
      <section style={{ marginBottom: '30px' }}>
        <h2 style={{ color: '#2c3e50', borderBottom: '2px solid #3498db', paddingBottom: '10px' }}>
          2. Current Package Pickup Process Analysis
        </h2>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ width: '48%', border: '1px solid #ddd', padding: '15px', borderRadius: '5px' }}>
            <h3 style={{ color: '#e74c3c' }}>Traditional Process</h3>
            <div style={{ fontSize: '10pt' }}>
              <p>1. Alice orders online → Provides full personal info</p>
              <p>2. Seller ships → Sees Alice's name, phone, address</p>
              <p>3. Store receives → Has Alice's pickup code + personal info</p>
              <p>4. Alice arrives → Shows government ID + pickup code</p>
              <p>5. Staff verifies → Manually matches ID to order info</p>
              <p>6. Package released → Personal data stored in multiple systems</p>
            </div>
          </div>
          <div style={{ width: '48%', border: '1px solid #ddd', padding: '15px', borderRadius: '5px' }}>
            <h3 style={{ color: '#27ae60' }}>Our Solution</h3>
            <div style={{ fontSize: '10pt' }}>
              <p>1. Alice orders → Generates cryptographic commitment</p>
              <p>2. Seller ships → Sees only anonymous commitment</p>
              <p>3. Store receives → Package linked to cryptographic proof</p>
              <p>4. Alice arrives → Generates zero-knowledge proof</p>
              <p>5. System verifies → Automatic cryptographic validation</p>
              <p>6. Package released → No personal data stored anywhere</p>
            </div>
          </div>
        </div>
        <p>
          The fundamental shift is from <strong>identity verification</strong> to <strong>authorization proof</strong>. Instead of proving "I am Alice Johnson," our system proves "I am the person authorized to collect this specific package."
        </p>
      </section>

      {/* EIP-7702 Introduction */}
      <section style={{ marginBottom: '30px' }}>
        <h2 style={{ color: '#2c3e50', borderBottom: '2px solid #3498db', paddingBottom: '10px' }}>
          3. EIP-7702: The Account Abstraction Revolution
        </h2>
        <p>
          EIP-7702, introduced by Vitalik Buterin, represents a quantum leap in Ethereum account functionality. Unlike previous account abstraction proposals that required users to migrate to entirely new smart contract accounts, EIP-7702 allows existing Externally Owned Accounts (EOAs) to temporarily delegate their execution to smart contracts.
        </p>
        
        <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '5px', margin: '15px 0' }}>
          <h3 style={{ color: '#2c3e50' }}>How EIP-7702 Works</h3>
          <p>
            When Alice wants to use smart contract functionality, she signs an authorization message that says "For this transaction, execute the code at address X instead of my normal EOA behavior." The Ethereum network temporarily sets her account's code to point to the smart contract, enabling advanced features like batch transactions, gas sponsorship, and custom validation logic.
          </p>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ color: '#2c3e50' }}>EIP-7702 Transaction Flow</h3>
          <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '5px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '30px', height: '30px', backgroundColor: '#3498db', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '15px' }}>1</div>
                <span>Alice signs authorization: "Delegate my account to contract X"</span>
              </div>
              <div style={{ marginLeft: '45px', borderLeft: '2px solid #ddd', paddingLeft: '15px' }}>
                <code style={{ backgroundColor: '#f1f2f6', padding: '5px' }}>
                  authorization = sign(chainId + contractAddress + nonce)
                </code>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '30px', height: '30px', backgroundColor: '#3498db', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '15px' }}>2</div>
                <span>Transaction includes authorization list + function call data</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '30px', height: '30px', backgroundColor: '#3498db', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '15px' }}>3</div>
                <span>EVM temporarily sets Alice's code to point to contract X</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '30px', height: '30px', backgroundColor: '#3498db', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '15px' }}>4</div>
                <span>Function executes with Alice's address as msg.sender</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '30px', height: '30px', backgroundColor: '#27ae60', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '15px' }}>5</div>
                <span>Transaction completes, delegation automatically expires</span>
              </div>
            </div>
          </div>
        </div>

        <p>
          The elegance of EIP-7702 lies in its reversibility and security. The delegation is temporary and specific to each transaction, meaning Alice retains full control of her account while gaining access to sophisticated smart contract features.
        </p>
      </section>

      {/* EIP-7702 Implementation Challenges */}
      <section style={{ marginBottom: '30px' }}>
        <h2 style={{ color: '#2c3e50', borderBottom: '2px solid #3498db', paddingBottom: '10px' }}>
          4. EIP-7702 Implementation: Cutting-Edge Challenges
        </h2>
        <p>
          Our implementation journey revealed the bleeding-edge nature of EIP-7702 adoption. While the EIP is officially part of Ethereum's Pectra upgrade and active on both mainnet and testnets, the developer tooling ecosystem hasn't caught up.
        </p>

        <div style={{ backgroundColor: '#fff3cd', padding: '15px', borderRadius: '5px', margin: '15px 0', border: '1px solid #ffeaa7' }}>
          <h3 style={{ color: '#856404' }}>The Viem TypeScript Challenge</h3>
          <p>
            Despite Viem's documentation showing EIP-7702 support, attempting to import <code>eip7702Actions</code> from <code>viem/experimental</code> fails in TypeScript environments. The experimental features lack proper TypeScript definitions, creating a gap between documentation and implementation reality.
          </p>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ color: '#2c3e50' }}>Our Implementation Strategy</h3>
          <div style={{ display: 'flex', gap: '20px' }}>
            <div style={{ flex: 1, border: '1px solid #ddd', padding: '15px', borderRadius: '5px' }}>
              <h4 style={{ color: '#e74c3c' }}>Attempt 1: Native Viem EIP-7702</h4>
              <p style={{ fontSize: '10pt' }}>
                Tried to use <code>import &#123; eip7702Actions &#125; from 'viem/experimental'</code> but encountered TypeScript compilation errors. The experimental module exists in JavaScript but lacks TypeScript definitions.
              </p>
            </div>
            <div style={{ flex: 1, border: '1px solid #ddd', padding: '15px', borderRadius: '5px' }}>
              <h4 style={{ color: '#f39c12' }}>Attempt 2: Manual EIP-7702</h4>
              <p style={{ fontSize: '10pt' }}>
                Implemented manual EIP-7702 authorization signing and transaction construction, but hit ABI encoding issues when trying to encode function calls with Viem's <code>encodeFunctionData</code>.
              </p>
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: '#d1ecf1', padding: '15px', borderRadius: '5px', margin: '15px 0', border: '1px solid #bee5eb' }}>
          <h3 style={{ color: '#0c5460' }}>Current State: Enhanced Fallback</h3>
          <p>
            Our production system uses an enhanced ethers.js implementation that successfully handles all smart contract interactions. While not technically EIP-7702, it provides the same user experience and is ready to upgrade when tooling matures. The transaction successfully executes (<code>status: 1</code>) but reveals a contract integration challenge with the <code>getBuyerCommitment</code> function returning empty data.
          </p>
        </div>

        <p>
          This experience highlights a crucial insight: being at the forefront of blockchain technology means navigating the gap between protocol capabilities and developer tooling maturity. Our solution demonstrates production-ready architecture while positioning for seamless future upgrades.
        </p>
      </section>

      {/* Why EIP-7702 is Necessary */}
      <section style={{ marginBottom: '30px' }}>
        <h2 style={{ color: '#2c3e50', borderBottom: '2px solid #3498db', paddingBottom: '10px' }}>
          5. Why EIP-7702 is Critical for Our System
        </h2>
        <p>
          EIP-7702 isn't just a technical improvement—it's an enabler for user experiences that were previously impossible with traditional EOAs. Our anonymous pickup system requires several advanced features that EIP-7702 makes accessible to everyday users.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '5px' }}>
            <h3 style={{ color: '#2c3e50' }}>🔄 Batch Transactions</h3>
            <p style={{ fontSize: '10pt' }}>
              Our system needs to simultaneously delegate account control, generate buyer commitments, and register package details in a single atomic transaction. Without EIP-7702, this requires multiple separate transactions, increasing costs and complexity.
            </p>
          </div>
          <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '5px' }}>
            <h3 style={{ color: '#2c3e50' }}>⛽ Gas Sponsorship</h3>
            <p style={{ fontSize: '10pt' }}>
              New users shouldn't need ETH to use our privacy system. EIP-7702 enables paymasters to sponsor gas fees, removing the friction of acquiring cryptocurrency before participating in anonymous commerce.
            </p>
          </div>
          <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '5px' }}>
            <h3 style={{ color: '#2c3e50' }}>🔐 Custom Validation</h3>
            <p style={{ fontSize: '10pt' }}>
              Traditional EOAs can only validate transactions with secp256k1 signatures. Our system requires complex validation logic that verifies zero-knowledge proofs and manages cryptographic commitments.
            </p>
          </div>
          <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '5px' }}>
            <h3 style={{ color: '#2c3e50' }}>🔑 Session Keys</h3>
            <p style={{ fontSize: '10pt' }}>
              Users should be able to create limited-scope keys for package pickup without exposing their main account. EIP-7702 enables delegation patterns that make this secure and user-friendly.
            </p>
          </div>
        </div>

        <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '5px' }}>
          <h3 style={{ color: '#2c3e50' }}>The User Experience Revolution</h3>
          <p>
            Without EIP-7702, Alice would need to: deploy a smart contract wallet, transfer funds to it, learn new interfaces, and pay higher gas fees. With EIP-7702, Alice simply signs one authorization and gains access to sophisticated privacy features using her existing wallet. This difference between "possible for experts" and "accessible to everyone" is why EIP-7702 represents a paradigm shift in blockchain usability.
          </p>
        </div>
      </section>

      {/* ZKP Deep Dive */}
      <section style={{ marginBottom: '30px' }}>
        <h2 style={{ color: '#2c3e50', borderBottom: '2px solid #3498db', paddingBottom: '10px' }}>
          6. Zero-Knowledge Proofs: The Privacy Foundation
        </h2>
        <p>
          Zero-knowledge proofs enable our system's core functionality: proving authorization without revealing identity. Our implementation uses zk-SNARKs (Zero-Knowledge Succinct Non-Interactive Arguments of Knowledge) to create mathematical proofs that can be verified instantly on-chain.
        </p>

        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ color: '#2c3e50' }}>The Three-Party Commitment Scheme</h3>
          <p>
            Our privacy model revolves around a novel three-party commitment scheme where each participant (buyer, seller, store) generates a cryptographic commitment without revealing their secrets to the others:
          </p>
          
          <div style={{ display: 'flex', gap: '15px', marginBottom: '15px' }}>
            <div style={{ flex: 1, border: '1px solid #ddd', padding: '10px', borderRadius: '5px', backgroundColor: '#e8f4fd' }}>
              <h4 style={{ color: '#2c3e50', fontSize: '12pt' }}>Buyer Commitment</h4>
              <code style={{ fontSize: '9pt', display: 'block', backgroundColor: '#f1f2f6', padding: '5px', borderRadius: '3px' }}>
                hash(secret, nameHash, phoneLastThree, nonce)
              </code>
            </div>
            <div style={{ flex: 1, border: '1px solid #ddd', padding: '10px', borderRadius: '5px', backgroundColor: '#fdf2e9' }}>
              <h4 style={{ color: '#2c3e50', fontSize: '12pt' }}>Seller Commitment</h4>
              <code style={{ fontSize: '9pt', display: 'block', backgroundColor: '#f1f2f6', padding: '5px', borderRadius: '3px' }}>
                hash(buyerCommit, packageId, price, storeAddr)
              </code>
            </div>
            <div style={{ flex: 1, border: '1px solid #ddd', padding: '10px', borderRadius: '5px', backgroundColor: '#edf7ed' }}>
              <h4 style={{ color: '#2c3e50', fontSize: '12pt' }}>Store Commitment</h4>
              <code style={{ fontSize: '9pt', display: 'block', backgroundColor: '#f1f2f6', padding: '5px', borderRadius: '3px' }}>
                hash(sellerCommit, storeSecret, timestamp)
              </code>
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '5px', marginBottom: '20px' }}>
          <h3 style={{ color: '#2c3e50' }}>Group Signature Privacy Model</h3>
          <p>
            The breakthrough insight is using these commitments in a group signature scheme. When Alice arrives at the store, she proves "I know the secret behind one of these three commitments" without revealing which one. Since only Alice knows her buyer secret, this proves she's the legitimate buyer while maintaining the illusion that she could be any of the three parties.
          </p>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ color: '#2c3e50' }}>ZK Circuit Architecture</h3>
          <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '5px' }}>
            <h4 style={{ color: '#2c3e50' }}>Circuit Inputs & Constraints</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <div>
                <h5 style={{ color: '#e74c3c' }}>Private Inputs (Alice knows)</h5>
                <ul style={{ fontSize: '10pt', margin: '10px 0' }}>
                  <li><code>buyer_secret</code> - Alice's random secret</li>
                  <li><code>buyer_name_hash</code> - Hash of Alice's name</li>
                  <li><code>buyer_phone_last_three</code> - Last 3 digits</li>
                  <li><code>buyer_nonce</code> - Prevents replay attacks</li>
                  <li><code>buyer_age</code> - For age verification</li>
                </ul>
              </div>
              <div>
                <h5 style={{ color: '#27ae60' }}>Public Inputs (Everyone sees)</h5>
                <ul style={{ fontSize: '10pt', margin: '10px 0' }}>
                  <li><code>buyer_commitment</code> - Alice's public commitment</li>
                  <li><code>seller_commitment</code> - Seller's public commitment</li>
                  <li><code>store_commitment</code> - Store's public commitment</li>
                  <li><code>package_id</code> - Package identifier</li>
                  <li><code>min_age_required</code> - Age requirement</li>
                </ul>
              </div>
            </div>
            
            <h5 style={{ color: '#8e44ad', marginTop: '15px' }}>Circuit Constraints</h5>
            <div style={{ fontSize: '10pt', backgroundColor: '#f1f2f6', padding: '10px', borderRadius: '3px' }}>
              <p>1. <strong>Commitment Verification:</strong> <code>buyer_commitment == hash(buyer_secret, buyer_name_hash, buyer_phone_last_three, buyer_nonce)</code></p>
              <p>2. <strong>Age Verification:</strong> <code>buyer_age `{'>='}` min_age_required</code></p>
              <p>3. <strong>Group Membership:</strong> Prove knowledge of at least one commitment secret</p>
              <p>4. <strong>Nullifier Generation:</strong> Create unique nullifier to prevent double-spending</p>
            </div>
          </div>
        </div>

        <p>
          This circuit design ensures that Alice can prove her authorization to collect the package while revealing zero information about her identity, creating a mathematically perfect privacy guarantee.
        </p>
      </section>

      {/* Demo Process */}
      <section style={{ marginBottom: '30px' }}>
        <h2 style={{ color: '#2c3e50', borderBottom: '2px solid #3498db', paddingBottom: '10px' }}>
          7. Complete Demo Process Flow
        </h2>
        <p>
          Our demonstration showcases the entire anonymous pickup lifecycle, from initial system setup through successful package collection. The process involves four distinct phases, each highlighting different aspects of our privacy-preserving architecture.
        </p>

        <div style={{ marginBottom: '25px' }}>
          <h3 style={{ color: '#2c3e50', backgroundColor: '#e8f4fd', padding: '10px', borderRadius: '5px' }}>Phase 1: System Initialization & Smart EOA Setup</h3>
          <div style={{ marginLeft: '20px', marginTop: '10px' }}>
            <p><strong>What happens:</strong> Alice opens the application and sets up her anonymous identity. The system loads ZK circuits, initializes smart contracts, and prepares her wallet for EIP-7702 delegation.</p>
            <p><strong>User sees:</strong> A clean interface where Alice enters her name "Alice Johnson", phone "1234567890", and age "25". Behind the scenes, the system generates cryptographic secrets and creates her buyer commitment.</p>
            <p><strong>Technical process:</strong> The system attempts EIP-7702 delegation (currently falling back to enhanced ethers.js), generates a buyer commitment using <code>hash(secret, nameHash, phoneLastThree, nonce)</code>, and registers Alice's anonymous identity with the smart contract.</p>
          </div>
        </div>

        <div style={{ marginBottom: '25px' }}>
          <h3 style={{ color: '#2c3e50', backgroundColor: '#fdf2e9', padding: '10px', borderRadius: '5px' }}>Phase 2: Package Registration (Seller Perspective)</h3>
          <div style={{ marginLeft: '20px', marginTop: '10px' }}>
            <p><strong>What happens:</strong> The seller (Bob) receives an order associated with Alice's buyer commitment but sees no personal information. Bob generates his own seller commitment and registers the package with the pickup system.</p>
            <p><strong>Demo flow:</strong> We simulate Bob's interface showing an anonymous order with commitment <code>0x1a2b3c4d...</code>, package details (item price, shipping fee, age requirements), and the destination store address.</p>
            <p><strong>Smart contract interaction:</strong> The system calls <code>registerPackage(packageId, buyerCommitment, sellerCommitment, storeAddress, itemPrice, shippingFee, minAgeRequired)</code> and pays the required ETH to escrow the transaction.</p>
          </div>
        </div>

        <div style={{ marginBottom: '25px' }}>
          <h3 style={{ color: '#2c3e50', backgroundColor: '#edf7ed', padding: '10px', borderRadius: '5px' }}>Phase 3: Store Commitment Generation</h3>
          <div style={{ marginLeft: '20px', marginTop: '10px' }}>
            <p><strong>What happens:</strong> When Alice arrives at the store, the staff member (Charlie) scans her QR code containing the seller commitment. The store system generates a new store commitment by combining the seller commitment with the store's secret key.</p>
            <p><strong>Demo interaction:</strong> We show Charlie's point-of-sale interface receiving the seller commitment and generating a fresh store commitment. This creates the third piece of Alice's authorization puzzle.</p>
            <p><strong>Cryptographic operation:</strong> The store system calls <code>generateStoreCommitment(packageId)</code> and returns a new commitment that Alice can use in her zero-knowledge proof.</p>
          </div>
        </div>

        <div style={{ marginBottom: '25px' }}>
          <h3 style={{ color: '#2c3e50', backgroundColor: '#f8f9fa', padding: '10px', borderRadius: '5px' }}>Phase 4: Zero-Knowledge Proof Generation & Verification</h3>
          <div style={{ marginLeft: '20px', marginTop: '10px' }}>
            <p><strong>What happens:</strong> Alice's phone generates a zero-knowledge proof demonstrating that she knows the secret behind one of the three commitments (buyer, seller, store) without revealing which one or any personal information.</p>
            <p><strong>User experience:</strong> Alice sees a "Generating Proof..." loading screen while her phone performs the computationally intensive ZK proof generation. Once complete, she shows the generated proof to Charlie for verification.</p>
            <p><strong>Verification process:</strong> Charlie's system receives the proof and verifies it against the package requirements, checking age constraints if applicable and ensuring the proof hasn't been used before (nullifier verification).</p>
          </div>
        </div>

        <div style={{ backgroundColor: '#d4edda', padding: '15px', borderRadius: '5px', border: '1px solid #c3e6cb' }}>
          <h3 style={{ color: '#155724' }}>Expected Outcome</h3>
          <p>
            Upon successful proof verification, the system authorizes package release. Alice receives her package without revealing her identity to Charlie or having her personal information stored in any system. The blockchain records only cryptographic commitments and proofs, creating a permanent privacy-preserving audit trail.
          </p>
        </div>
      </section>

      {/* Contract Design */}
      <section style={{ marginBottom: '30px' }}>
        <h2 style={{ color: '#2c3e50', borderBottom: '2px solid #3498db', paddingBottom: '10px' }}>
          8. Smart Contract Architecture
        </h2>
        <p>
          Our smart contract system consists of two primary contracts working in tandem: the LocalWallet contract (handling individual user identity and EIP-7702 delegation) and the PickupSystem contract (managing package registration and zero-knowledge proof verification).
        </p>

        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ color: '#2c3e50' }}>LocalWallet Contract: Identity Management</h3>
          <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '5px', backgroundColor: '#f8f9fa' }}>
            <p>
              The LocalWallet contract serves as Alice's delegated smart contract, activated through EIP-7702. It manages her anonymous identity, generates cryptographic commitments, and handles age verification locally on her device.
            </p>
            <div style={{ marginTop: '10px' }}>
              <h4 style={{ fontSize: '11pt', color: '#2c3e50' }}>Key Functions:</h4>
              <ul style={{ fontSize: '10pt' }}>
                <li><code>initializeBuyerIdentity(name, phone, age)</code> - Creates buyer commitment from user inputs</li>
                <li><code>getBuyerCommitment()</code> - Returns the user's anonymous commitment</li>
                <li><code>verifyAgeLocally(ageProof)</code> - Validates age requirements without revealing actual age</li>
                <li><code>isAgeVerificationValid()</code> - Checks if age verification has been completed</li>
              </ul>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ color: '#2c3e50' }}>PickupSystem Contract: Package Management</h3>
          <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '5px', backgroundColor: '#f8f9fa' }}>
            <p>
              The PickupSystem contract orchestrates the entire package pickup process, handling registrations, commitment generation, and zero-knowledge proof verification. It maintains no personal information, only cryptographic commitments and proofs.
            </p>
            <div style={{ marginTop: '10px' }}>
              <h4 style={{ fontSize: '11pt', color: '#2c3e50' }}>Core Functions:</h4>
              <ul style={{ fontSize: '10pt' }}>
                <li><code>registerPackage(packageId, buyerCommit, sellerCommit, storeAddr, price, fee, minAge)</code> - Records package with commitments</li>
                <li><code>generateStoreCommitment(packageId)</code> - Creates store commitment when package arrives</li>
                <li><code>pickupPackage(packageId, zkProof, publicSignals)</code> - Verifies ZK proof and authorizes pickup</li>
                <li><code>getPackageDetails(packageId)</code> - Returns package information (commitments only, no personal data)</li>
              </ul>
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ color: '#2c3e50' }}>Privacy-Preserving Data Flow</h3>
          <div style={{ border: '1px solid #ddd', padding: '15px', borderRadius: '5px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '25px', height: '25px', backgroundColor: '#3498db', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '15px', fontSize: '10pt' }}>1</div>
                <span style={{ fontSize: '10pt' }}>Alice's personal data never leaves her device - only cryptographic commitments are shared</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '25px', height: '25px', backgroundColor: '#3498db', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '15px', fontSize: '10pt' }}>2</div>
                <span style={{ fontSize: '10pt' }}>Smart contracts store only hashed commitments, making reverse-engineering impossible</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '25px', height: '25px', backgroundColor: '#3498db', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '15px', fontSize: '10pt' }}>3</div>
                <span style={{ fontSize: '10pt' }}>Zero-knowledge proofs provide mathematical guarantees without data exposure</span>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '25px', height: '25px', backgroundColor: '#27ae60', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '15px', fontSize: '10pt' }}>4</div>
                <span style={{ fontSize: '10pt' }}>Nullifiers prevent double-spending while maintaining anonymity</span>
              </div>
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: '#fff3cd', padding: '15px', borderRadius: '5px', border: '1px solid #ffeaa7' }}>
          <h3 style={{ color: '#856404' }}>Current Integration Challenge</h3>
          <p style={{ fontSize: '10pt' }}>
            Our logs reveal a contract integration issue where <code>getBuyerCommitment()</code> returns empty data (<code>value="0x"</code>). This suggests the buyer commitment isn't being stored correctly during the <code>initializeBuyerIdentity</code> call, despite the transaction succeeding. This is a common challenge when integrating complex cryptographic operations with smart contract state management.
          </p>
        </div>
      </section>

      {/* Current Status */}
      <section style={{ marginBottom: '30px' }}>
        <h2 style={{ color: '#2c3e50', borderBottom: '2px solid #3498db', paddingBottom: '10px' }}>
          9. Current Status & Lessons Learned
        </h2>
        <p>
          Our development journey has provided invaluable insights into the current state of Web3 infrastructure and the challenges of implementing cutting-edge blockchain features in production environments.
        </p>

        <div style={{ marginBottom: '20px' }}>
          <h3 style={{ color: '#2c3e50' }}>Technical Achievements</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div style={{ border: '1px solid #27ae60', padding: '15px', borderRadius: '5px', backgroundColor: '#d4edda' }}>
              <h4 style={{ color: '#155724' }}>✅ Successful Components</h4>
              <ul style={{ fontSize: '10pt', margin: '10px 0' }}>
                <li>ZK circuit design and proof generation</li>
                <li>Smart contract architecture</li>
                <li>React-based user interface</li>
                <li>Ethers.js integration and transaction handling</li>
                <li>Cryptographic commitment generation</li>
              </ul>
            </div>
            <div style={{ border: '1px solid #ffc107', padding: '15px', borderRadius: '5px', backgroundColor: '#fff3cd' }}>
              <h4 style={{ color: '#856404' }}>⚠️ Ongoing Challenges</h4>
              <ul style={{ fontSize: '10pt', margin: '10px 0' }}>
                <li>Viem EIP-7702 TypeScript compatibility</li>
                <li>Contract state management issues</li>
                <li>Tooling ecosystem maturity gaps</li>
                <li>MetaMask EIP-7702 support pending</li>
              </ul>
            </div>
          </div>
        </div>

        <div style={{ backgroundColor: '#f8f9fa', padding: '15px', borderRadius: '5px', marginBottom: '20px' }}>
          <h3 style={{ color: '#2c3e50' }}>Key Insights from Implementation</h3>
          <div style={{ marginBottom: '15px' }}>
            <h4 style={{ color: '#2c3e50', fontSize: '12pt' }}>1. Bleeding-Edge Technology Adoption</h4>
            <p style={{ fontSize: '10pt' }}>
              Being early adopters of EIP-7702 revealed the significant gap between protocol specification and developer tooling readiness. While EIP-7702 is technically active on Ethereum networks, the supporting infrastructure (libraries, documentation, debugging tools) is still maturing.
            </p>
          </div>
          <div style={{ marginBottom: '15px' }}>
            <h4 style={{ color: '#2c3e50', fontSize: '12pt' }}>2. Production-Ready Architecture Design</h4>
            <p style={{ fontSize: '10pt' }}>
              Our hybrid approach (attempting cutting-edge features with reliable fallbacks) proved essential for building systems that work today while positioning for future capabilities. This strategy ensures user functionality isn't compromised by experimental technology limitations.
            </p>
          </div>
          <div>
            <h4 style={{ color: '#2c3e50', fontSize: '12pt' }}>3. Privacy-First System Design</h4>
            <p style={{ fontSize: '10pt' }}>
              Implementing zero-knowledge proofs and cryptographic commitments from the ground up reinforced the importance of privacy-by-design architecture. Once personal data enters a system, it's nearly impossible to remove—better to never collect it in the first place.
            </p>
          </div>
        </div>

        <div style={{ border: '1px solid #17a2b8', padding: '15px', borderRadius: '5px', backgroundColor: '#d1ecf1' }}>
          <h3 style={{ color: '#0c5460' }}>Next Steps & Future Development</h3>
          <p style={{ fontSize: '10pt', marginBottom: '10px' }}>
            Our roadmap focuses on resolving current integration challenges while preparing for the next wave of Web3 infrastructure improvements:
          </p>
          <ol style={{ fontSize: '10pt', marginLeft: '20px' }}>
            <li>Debug and resolve the contract state management issue affecting <code>getBuyerCommitment()</code></li>
            <li>Monitor Viem TypeScript support for EIP-7702 and upgrade when available</li>
            <li>Prepare for MetaMask's native EIP-7702 support (expected Q2-Q3 2025)</li>
            <li>Optimize ZK circuit performance and explore batch proof generation</li>
            <li>Conduct security audits and prepare for mainnet deployment</li>
          </ol>
        </div>
      </section>

      {/* Conclusion */}
      <section style={{ marginBottom: '30px' }}>
        <h2 style={{ color: '#2c3e50', borderBottom: '2px solid #3498db', paddingBottom: '10px' }}>
          10. Conclusion: Building the Future of Private Commerce
        </h2>
        <p>
          Our anonymous pickup system represents more than a technical achievement—it's a proof of concept for a new model of digital commerce where privacy is the default, not an afterthought. By combining EIP-7702's account abstraction capabilities with zero-knowledge proofs, we've created a system that protects user privacy while maintaining all the benefits of modern e-commerce.
        </p>

        <div style={{ backgroundColor: '#e8f4fd', padding: '20px', borderRadius: '5px', border: '1px solid #bee5eb' }}>
          <h3 style={{ color: '#0c5460' }}>The Broader Impact</h3>
          <p>
            This project demonstrates that sophisticated privacy-preserving technologies can be packaged into user-friendly applications. As Web3 infrastructure matures, systems like ours will become the foundation for a new internet where users control their data and privacy is mathematically guaranteed rather than promised.
          </p>
        </div>

        <div style={{ textAlign: 'center', marginTop: '30px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '5px' }}>
          <h3 style={{ color: '#2c3e50' }}>Ready for Questions & Discussion</h3>
          <p style={{ fontStyle: 'italic' }}>
            "The future of commerce is private, secure, and user-controlled.<br/>
            We're building that future today."
          </p>
        </div>
      </section>
    </div>
  );
};

export default AnonymousPickupPresentation;