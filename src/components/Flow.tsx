import React from 'react';

const SystemFlowDiagram = () => {
  return (
    <div style={{ 
      backgroundColor: 'white', 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      maxWidth: '1200px',
      margin: '0 auto'
    }}>
      <h1 style={{ textAlign: 'center', color: '#2c3e50', marginBottom: '30px' }}>
        Anonymous Pickup System: Technical Flow Diagrams
      </h1>

      {/* EIP-7702 Transaction Flow */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ color: '#2c3e50', borderBottom: '2px solid #3498db', paddingBottom: '10px' }}>
          EIP-7702 Transaction Flow
        </h2>
        
        <div style={{ 
          border: '2px solid #ddd', 
          borderRadius: '10px', 
          padding: '20px', 
          backgroundColor: '#f8f9fa',
          position: 'relative'
        }}>
          {/* Alice's Wallet */}
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '50px',
            width: '120px',
            height: '80px',
            backgroundColor: '#e8f4fd',
            border: '2px solid #3498db',
            borderRadius: '10px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px'
          }}>
            <div style={{ fontWeight: 'bold', color: '#2c3e50' }}>Alice's EOA</div>
            <div style={{ fontSize: '10px', color: '#666' }}>0x1234...abcd</div>
          </div>

          {/* Smart Contract */}
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '50px',
            width: '120px',
            height: '80px',
            backgroundColor: '#fdf2e9',
            border: '2px solid #f39c12',
            borderRadius: '10px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '12px'
          }}>
            <div style={{ fontWeight: 'bold', color: '#2c3e50' }}>LocalWallet</div>
            <div style={{ fontSize: '10px', color: '#666' }}>Contract</div>
          </div>

          {/* Flow Steps */}
          <div style={{ marginTop: '120px' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
              <div style={{
                width: '30px',
                height: '30px',
                backgroundColor: '#3498db',
                color: 'white',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '15px',
                fontWeight: 'bold'
              }}>1</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold' }}>Authorization Creation</div>
                <div style={{ fontSize: '11px', color: '#666' }}>
                  Alice signs: <code>hash(0x05 + chainId + contractAddress + nonce)</code>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
              <div style={{
                width: '30px',
                height: '30px',
                backgroundColor: '#3498db',
                color: 'white',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '15px',
                fontWeight: 'bold'
              }}>2</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold' }}>Transaction Construction</div>
                <div style={{ fontSize: '11px', color: '#666' }}>
                  Type 0x04 transaction with authorizationList + function call data
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
              <div style={{
                width: '30px',
                height: '30px',
                backgroundColor: '#3498db',
                color: 'white',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '15px',
                fontWeight: 'bold'
              }}>3</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold' }}>Delegation Activation</div>
                <div style={{ fontSize: '11px', color: '#666' }}>
                  EVM sets Alice's account code: <code>0xef0100 + contractAddress</code>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
              <div style={{
                width: '30px',
                height: '30px',
                backgroundColor: '#27ae60',
                color: 'white',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: '15px',
                fontWeight: 'bold'
              }}>4</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 'bold' }}>Function Execution</div>
                <div style={{ fontSize: '11px', color: '#666' }}>
                  <code>initializeBuyerIdentity()</code> executes with Alice's address as msg.sender
                </div>
              </div>
            </div>
          </div>

          {/* Current Challenge Box */}
          <div style={{
            backgroundColor: '#fff3cd',
            border: '1px solid #ffeaa7',
            borderRadius: '5px',
            padding: '10px',
            marginTop: '20px'
          }}>
            <div style={{ fontWeight: 'bold', color: '#856404', marginBottom: '5px' }}>
              Current Implementation Challenge
            </div>
            <div style={{ fontSize: '11px', color: '#856404' }}>
              Viem's <code>eip7702Actions</code> fails in TypeScript → Manual EIP-7702 implementation hits ABI encoding issues → Falls back to enhanced ethers.js
            </div>
          </div>
        </div>
      </section>

      {/* ZKP Process Flow */}
      <section style={{ marginBottom: '40px' }}>
        <h2 style={{ color: '#2c3e50', borderBottom: '2px solid #3498db', paddingBottom: '10px' }}>
          Zero-Knowledge Proof Generation & Verification
        </h2>
        
        <div style={{ 
          border: '2px solid #ddd', 
          borderRadius: '10px', 
          padding: '20px', 
          backgroundColor: '#f8f9fa'
        }}>
          {/* Three Parties */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '30px' }}>
            <div style={{
              width: '150px',
              height: '100px',
              backgroundColor: '#e8f4fd',
              border: '2px solid #3498db',
              borderRadius: '10px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px'
            }}>
              <div style={{ fontWeight: 'bold', color: '#2c3e50' }}>Alice (Buyer)</div>
              <div style={{ fontSize: '10px', color: '#666', textAlign: 'center' }}>
                Knows: secret, nameHash,<br/>phoneLastThree, nonce
              </div>
            </div>

            <div style={{
              width: '150px',
              height: '100px',
              backgroundColor: '#fdf2e9',
              border: '2px solid #f39c12',
              borderRadius: '10px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px'
            }}>
              <div style={{ fontWeight: 'bold', color: '#2c3e50' }}>Bob (Seller)</div>
              <div style={{ fontSize: '10px', color: '#666', textAlign: 'center' }}>
                Knows: sellerSecret,<br/>package details
              </div>
            </div>

            <div style={{
              width: '150px',
              height: '100px',
              backgroundColor: '#edf7ed',
              border: '2px solid #27ae60',
              borderRadius: '10px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px'
            }}>
              <div style={{ fontWeight: 'bold', color: '#2c3e50' }}>Charlie (Store)</div>
              <div style={{ fontSize: '10px', color: '#666', textAlign: 'center' }}>
                Knows: storeSecret,<br/>timestamp
              </div>
            </div>
          </div>

          {/* Commitment Generation */}
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ color: '#2c3e50', marginBottom: '15px' }}>Commitment Generation</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px' }}>
              <div style={{
                flex: 1,
                backgroundColor: '#e8f4fd',
                border: '1px solid #3498db',
                borderRadius: '5px',
                padding: '10px',
                fontSize: '10px'
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Buyer Commitment</div>
                <code>hash(secret, nameHash, phoneLastThree, nonce)</code>
                <div style={{ marginTop: '5px', color: '#666' }}>→ 0x16b0eb45...</div>
              </div>
              <div style={{
                flex: 1,
                backgroundColor: '#fdf2e9',
                border: '1px solid #f39c12',
                borderRadius: '5px',
                padding: '10px',
                fontSize: '10px'
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Seller Commitment</div>
                <code>hash(buyerCommit, packageId, price, storeAddr)</code>
                <div style={{ marginTop: '5px', color: '#666' }}>→ 0x9876543...</div>
              </div>
              <div style={{
                flex: 1,
                backgroundColor: '#edf7ed',
                border: '1px solid #27ae60',
                borderRadius: '5px',
                padding: '10px',
                fontSize: '10px'
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Store Commitment</div>
                <code>hash(sellerCommit, storeSecret, timestamp)</code>
                <div style={{ marginTop: '5px', color: '#666' }}>→ 0xabcdef12...</div>
              </div>
            </div>
          </div>

          {/* ZK Circuit */}
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ color: '#2c3e50', marginBottom: '15px' }}>ZK Circuit: Group Signature Proof</h3>
            <div style={{
              backgroundColor: '#f1f2f6',
              border: '2px solid #6c757d',
              borderRadius: '10px',
              padding: '20px',
              position: 'relative'
            }}>
              <div style={{ textAlign: 'center', fontWeight: 'bold', color: '#2c3e50', marginBottom: '20px' }}>
                ZK-SNARK Circuit
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
                <div style={{
                  backgroundColor: '#fff',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  padding: '10px',
                  width: '45%'
                }}>
                  <div style={{ fontWeight: 'bold', color: '#e74c3c', marginBottom: '5px' }}>Private Inputs</div>
                  <div style={{ fontSize: '10px' }}>
                    • buyer_secret<br/>
                    • buyer_name_hash<br/>
                    • buyer_phone_last_three<br/>
                    • buyer_nonce<br/>
                    • buyer_age
                  </div>
                </div>
                <div style={{
                  backgroundColor: '#fff',
                  border: '1px solid #ddd',
                  borderRadius: '5px',
                  padding: '10px',
                  width: '45%'
                }}>
                  <div style={{ fontWeight: 'bold', color: '#27ae60', marginBottom: '5px' }}>Public Inputs</div>
                  <div style={{ fontSize: '10px' }}>
                    • buyer_commitment<br/>
                    • seller_commitment<br/>
                    • store_commitment<br/>
                    • package_id<br/>
                    • min_age_required
                  </div>
                </div>
              </div>

              <div style={{
                backgroundColor: '#fff3cd',
                border: '1px solid #ffeaa7',
                borderRadius: '5px',
                padding: '10px',
                marginBottom: '20px'
              }}>
                <div style={{ fontWeight: 'bold', color: '#856404', marginBottom: '5px' }}>Circuit Constraints</div>
                <div style={{ fontSize: '10px', color: '#856404' }}>
                  1. Commitment verification: <code>buyer_commitment == hash(private_inputs)</code><br/>
                  2. Age verification: <code>buyer_age `{'>='}` min_age_required</code><br/>
                  3. Group membership: Prove knowledge of at least one commitment secret<br/>
                  4. Nullifier generation: Create unique nullifier to prevent double-spending
                </div>
              </div>

              <div style={{
                backgroundColor: '#d4edda',
                border: '1px solid #c3e6cb',
                borderRadius: '5px',
                padding: '10px',
                textAlign: 'center'
              }}>
                <div style={{ fontWeight: 'bold', color: '#155724' }}>Output: ZK Proof</div>
                <div style={{ fontSize: '10px', color: '#155724' }}>
                  Proves: "I know the secret behind one of the three commitments" without revealing which one
                </div>
              </div>
            </div>
          </div>

          {/* Verification Process */}
          <div>
            <h3 style={{ color: '#2c3e50', marginBottom: '15px' }}>Verification Process</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '25px', height: '25px', backgroundColor: '#3498db', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '15px', fontSize: '12px' }}>1</div>
                <div style={{ fontSize: '12px' }}>Alice generates ZK proof on her phone (computationally intensive)</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '25px', height: '25px', backgroundColor: '#3498db', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '15px', fontSize: '12px' }}>2</div>
                <div style={{ fontSize: '12px' }}>Charlie's system receives proof + public inputs</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '25px', height: '25px', backgroundColor: '#3498db', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '15px', fontSize: '12px' }}>3</div>
                <div style={{ fontSize: '12px' }}>Smart contract verifies proof using Groth16 verifier (milliseconds)</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '25px', height: '25px', backgroundColor: '#3498db', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '15px', fontSize: '12px' }}>4</div>
                <div style={{ fontSize: '12px' }}>Nullifier checked to prevent double-spending</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <div style={{ width: '25px', height: '25px', backgroundColor: '#27ae60', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '15px', fontSize: '12px' }}>5</div>
                <div style={{ fontSize: '12px' }}>Package pickup authorized ✅</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Complete System Flow */}
      <section>
        <h2 style={{ color: '#2c3e50', borderBottom: '2px solid #3498db', paddingBottom: '10px' }}>
          Complete System Integration Flow
        </h2>
        
        <div style={{ 
          border: '2px solid #ddd', 
          borderRadius: '10px', 
          padding: '20px', 
          backgroundColor: '#f8f9fa'
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginBottom: '30px' }}>
            {/* Phase 1 */}
            <div style={{
              backgroundColor: '#e8f4fd',
              border: '2px solid #3498db',
              borderRadius: '10px',
              padding: '15px'
            }}>
              <h3 style={{ color: '#2c3e50', marginBottom: '10px', fontSize: '14px' }}>Phase 1: Setup</h3>
              <div style={{ fontSize: '11px' }}>
                <p>• Alice generates buyer commitment using EIP-7702</p>
                <p>• Bob registers package with seller commitment</p>
                <p>• Smart contracts store only cryptographic hashes</p>
              </div>
            </div>

            {/* Phase 2 */}
            <div style={{
              backgroundColor: '#fdf2e9',
              border: '2px solid #f39c12',
              borderRadius: '10px',
              padding: '15px'
            }}>
              <h3 style={{ color: '#2c3e50', marginBottom: '10px', fontSize: '14px' }}>Phase 2: Arrival</h3>
              <div style={{ fontSize: '11px' }}>
                <p>• Alice arrives at store with QR code</p>
                <p>• Charlie scans QR code, generates store commitment</p>
                <p>• Three commitments now available for proof</p>
              </div>
            </div>

            {/* Phase 3 */}
            <div style={{
              backgroundColor: '#edf7ed',
              border: '2px solid #27ae60',
              borderRadius: '10px',
              padding: '15px'
            }}>
              <h3 style={{ color: '#2c3e50', marginBottom: '10px', fontSize: '14px' }}>Phase 3: Proof</h3>
              <div style={{ fontSize: '11px' }}>
                <p>• Alice generates ZK proof of group membership</p>
                <p>• Charlie verifies proof instantly</p>
                <p>• Package released, privacy preserved</p>
              </div>
            </div>
          </div>

          {/* Current Status */}
          <div style={{
            backgroundColor: '#fff3cd',
            border: '1px solid #ffeaa7',
            borderRadius: '5px',
            padding: '15px'
          }}>
            <h3 style={{ color: '#856404', marginBottom: '10px' }}>Current Implementation Status</h3>
            <div style={{ fontSize: '11px', color: '#856404' }}>
              <p><strong>✅ Working:</strong> ZK circuits, React UI, ethers.js integration, cryptographic commitments</p>
              <p><strong>⚠️ Challenges:</strong> EIP-7702 tooling limitations, contract state management, getBuyerCommitment() returning empty data</p>
              <p><strong>🔄 Next:</strong> Debug contract integration, monitor Web3 tooling updates, prepare for MetaMask EIP-7702 support</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SystemFlowDiagram;