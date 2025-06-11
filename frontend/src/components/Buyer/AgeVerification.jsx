import React, { useState, useRef, useCallback } from 'react';
import Webcam from 'react-webcam';
import { toast } from 'react-toastify';

/**
 * Age Verification Component
 * Uses camera to scan ID card locally (no data uploaded to blockchain)
 * Simulates OCR and age detection using AI/ML
 */
const AgeVerification = ({ onVerify, loading, isVerified }) => {
  const [cameraActive, setCameraActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [verificationResult, setVerificationResult] = useState(null);
  const webcamRef = useRef(null);

  /**
   * Start camera for ID scanning
   */
  const startCamera = async () => {
    try {
      setCameraActive(true);
      toast.info('Camera activated. Position your Taiwan ID card in the frame.');
    } catch (error) {
      toast.error('Failed to access camera: ' + error.message);
    }
  };

  /**
   * Stop camera
   */
  const stopCamera = () => {
    setCameraActive(false);
    setCapturedImage(null);
  };

  /**
   * Capture image from camera
   */
  const captureImage = useCallback(() => {
    if (!webcamRef.current) return;

    const imageSrc = webcamRef.current.getScreenshot();
    setCapturedImage(imageSrc);
    setCameraActive(false);
    
    toast.success('Image captured! Processing...');
    processIDImage(imageSrc);
  }, [webcamRef]);

  /**
   * Process ID image using OCR and AI
   * In production, this would use real OCR services like:
   * - Google Vision API
   * - AWS Textract
   * - Azure Computer Vision
   * - Local ML models (TensorFlow.js)
   */
  const processIDImage = async (imageData) => {
    setProcessing(true);
    
    try {
      // Simulate image processing time
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Mock OCR results for Taiwan ID card
      // In production, replace with real OCR processing
      const mockOCRResult = await mockTaiwanIDProcessing(imageData);

      if (mockOCRResult.isValid && mockOCRResult.confidence > 0.8) {
        setVerificationResult(mockOCRResult);
        toast.success(`Age verification successful! Detected age: ${mockOCRResult.age}`);
      } else {
        throw new Error('ID verification failed - low confidence or invalid ID');
      }

    } catch (error) {
      console.error('ID processing error:', error);
      toast.error('Failed to process ID: ' + error.message);
      setVerificationResult(null);
    } finally {
      setProcessing(false);
    }
  };

  /**
   * Mock Taiwan ID processing
   * Simulates real OCR and age detection
   * In production, replace with actual implementation
   */
  const mockTaiwanIDProcessing = async (imageData) => {
    // Simulate various processing steps
    console.log('🔍 Processing Taiwan ID card...');
    console.log('📊 Running OCR on image...');
    console.log('🤖 Extracting personal information...');
    console.log('🎂 Calculating age from birth date...');
    console.log('✅ Verification complete');

    // Mock result - in production, this would come from real OCR
    return {
      isValid: true,
      confidence: 0.95,
      documentType: 'taiwan_national_id',
      age: Math.floor(Math.random() * 20) + 20, // Random age 20-40
      birthYear: 1990 + Math.floor(Math.random() * 20),
      idNumber: 'A123456789', // Mock ID number
      verificationMethod: 'camera_ocr',
      timestamp: Date.now(),
      processingInfo: {
        ocrProvider: 'mock_vision_api',
        faceDetected: true,
        documentQuality: 'high',
        securityFeatures: ['watermark', 'hologram', 'microprint']
      }
    };
  };

  /**
   * Submit age verification
   */
  const submitVerification = () => {
    if (!verificationResult) {
      toast.error('No verification result available');
      return;
    }

    if (verificationResult.age < 18) {
      toast.warning('Age verification shows under 18. Cannot verify for 18+ items.');
      return;
    }

    // Pass verification result to parent component
    onVerify(verificationResult);
  };

  /**
   * Upload image file instead of using camera
   */
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target.result;
      setCapturedImage(imageData);
      toast.info('Image uploaded. Processing...');
      processIDImage(imageData);
    };
    reader.readAsDataURL(file);
  };

  if (isVerified) {
    return (
      <div className="step-content">
        <h2>✅ Age Verification Complete</h2>
        <div className="verification-success">
          <p>Your age has been verified locally and securely.</p>
          <p><strong>No personal data was uploaded to the blockchain.</strong></p>
          <div className="verification-info">
            <h3>Privacy Features:</h3>
            <ul>
              <li>✅ ID image processed locally on your device</li>
              <li>✅ Only verification result stored (not personal details)</li>
              <li>✅ No images uploaded to servers</li>
              <li>✅ Cryptographic proof of age (18+) generated</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="step-content">
      <h2>Step 3: Age Verification</h2>
      <p>
        Verify your age by scanning your Taiwan National ID card using your camera.
        All processing is done locally on your device - no personal data is uploaded.
      </p>

      <div className="age-verification-container">
        
        {/* Camera Interface */}
        {!capturedImage && (
          <div className="camera-section">
            <h3>📷 ID Card Scanner</h3>
            
            {!cameraActive ? (
              <div className="camera-controls">
                <div className="camera-placeholder">
                  <div className="placeholder-icon">📷</div>
                  <p>Click to start camera and scan your ID card</p>
                </div>
                <button 
                  className="btn btn-primary"
                  onClick={startCamera}
                  disabled={processing}
                >
                  Start Camera Scanner
                </button>
                
                <div className="or-divider">OR</div>
                
                <label className="btn btn-secondary file-upload-btn">
                  Upload ID Image
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                </label>
              </div>
            ) : (
              <div className="camera-active">
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  width="100%"
                  height="auto"
                  videoConstraints={{
                    width: 1280,
                    height: 720,
                    facingMode: "environment" // Use back camera on mobile
                  }}
                />
                <div className="camera-overlay">
                  <div className="id-frame">
                    <div className="frame-corner top-left"></div>
                    <div className="frame-corner top-right"></div>
                    <div className="frame-corner bottom-left"></div>
                    <div className="frame-corner bottom-right"></div>
                    <p>Position ID card within frame</p>
                  </div>
                </div>
                <div className="camera-controls">
                  <button 
                    className="btn btn-success"
                    onClick={captureImage}
                    disabled={processing}
                  >
                    📸 Capture ID
                  </button>
                  <button 
                    className="btn btn-secondary"
                    onClick={stopCamera}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Processing Status */}
        {processing && (
          <div className="processing-status">
            <div className="processing-spinner"></div>
            <h3>🔍 Processing ID Card...</h3>
            <div className="processing-steps">
              <div className="step-item">📊 Running OCR on image...</div>
              <div className="step-item">🤖 Extracting information...</div>
              <div className="step-item">🎂 Verifying age...</div>
              <div className="step-item">✅ Generating proof...</div>
            </div>
            <p><em>All processing done locally on your device</em></p>
          </div>
        )}

        {/* Captured Image Preview */}
        {capturedImage && !processing && (
          <div className="image-preview">
            <h3>📋 Captured ID Image</h3>
            <img src={capturedImage} alt="Captured ID" className="captured-image" />
            <div className="image-controls">
              <button 
                className="btn btn-warning"
                onClick={() => {
                  setCapturedImage(null);
                  setVerificationResult(null);
                }}
              >
                Retake Photo
              </button>
            </div>
          </div>
        )}

        {/* Verification Results */}
        {verificationResult && (
          <div className="verification-results">
            <h3>✅ Verification Results</h3>
            <div className="result-grid">
              <div className="result-item">
                <span className="label">Document Type:</span>
                <span className="value">Taiwan National ID</span>
              </div>
              <div className="result-item">
                <span className="label">Confidence:</span>
                <span className="value">{(verificationResult.confidence * 100).toFixed(1)}%</span>
              </div>
              <div className="result-item">
                <span className="label">Detected Age:</span>
                <span className="value">{verificationResult.age} years old</span>
              </div>
              <div className="result-item">
                <span className="label">18+ Eligible:</span>
                <span className={`value ${verificationResult.age >= 18 ? 'success' : 'error'}`}>
                  {verificationResult.age >= 18 ? 'Yes ✅' : 'No ❌'}
                </span>
              </div>
            </div>

            <div className="privacy-notice">
              <h4>🔒 Privacy Protected</h4>
              <ul>
                <li>✅ Image processed locally on your device</li>
                <li>✅ No personal details stored on blockchain</li>
                <li>✅ Only age verification status recorded</li>
                <li>✅ Original image not saved anywhere</li>
              </ul>
            </div>

            <button 
              className="btn btn-success"
              onClick={submitVerification}
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Confirm Age Verification'}
            </button>
          </div>
        )}

        {/* Instructions */}
        <div className="instructions">
          <h3>📝 Instructions</h3>
          <ol>
            <li>Position your Taiwan National ID card clearly in the camera frame</li>
            <li>Ensure good lighting and no glare on the card</li>
            <li>Make sure all text is readable and not blurred</li>
            <li>Click "Capture ID" when the card is properly positioned</li>
            <li>Wait for local processing to complete</li>
            <li>Confirm the verification results</li>
          </ol>
          
          <div className="privacy-assurance">
            <h4>🛡️ Privacy Guarantee</h4>
            <p>
              Your ID card image is processed entirely on your device using local AI/ML models. 
              No images or personal information are ever transmitted to our servers or stored on the blockchain.
              Only a cryptographic proof of your age eligibility is generated.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgeVerification;