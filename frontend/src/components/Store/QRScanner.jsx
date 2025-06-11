import React, { useState, useRef, useEffect } from 'react';
import jsQR from 'jsqr';

/**
 * Real QR Code Scanner Component
 * Uses device camera to scan QR codes containing pickup proofs
 */
const QRScanner = ({ onResult, onCancel, loading }) => {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanIntervalRef = useRef(null);

  // Initialize camera and get available devices
  useEffect(() => {
    initializeCamera();
    return () => {
      stopScanning();
    };
  }, []);

  /**
   * Initialize camera and enumerate devices
   */
  const initializeCamera = async () => {
    try {
      // Get available video devices
      const mediaDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = mediaDevices.filter(device => device.kind === 'videoinput');
      
      setDevices(videoDevices);
      
      // Prefer back camera on mobile devices
      const backCamera = videoDevices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('rear') ||
        device.label.toLowerCase().includes('environment')
      );
      
      const defaultDevice = backCamera || videoDevices[0];
      setSelectedDevice(defaultDevice?.deviceId);
      
      if (defaultDevice) {
        await startScanning(defaultDevice.deviceId);
      } else {
        setError('No camera devices found');
      }
      
    } catch (err) {
      console.error('Camera initialization error:', err);
      setError('Failed to access camera: ' + err.message);
    }
  };

  /**
   * Start QR code scanning
   */
  const startScanning = async (deviceId) => {
    try {
      setError(null);
      setScanning(true);

      // Stop existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      // Start new stream
      const constraints = {
        video: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: deviceId ? undefined : { ideal: 'environment' }
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        
        // Start scanning loop
        scanIntervalRef.current = setInterval(scanForQRCode, 100);
      }

    } catch (err) {
      console.error('Scanner start error:', err);
      setError('Failed to start scanner: ' + err.message);
      setScanning(false);
    }
  };

  /**
   * Stop QR code scanning
   */
  const stopScanning = () => {
    setScanning(false);
    
    // Stop video stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Stop scanning interval
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    
    // Clear video element
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  /**
   * Scan for QR codes in video frame
   */
  const scanForQRCode = () => {
    if (!videoRef.current || !canvasRef.current || !scanning) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Get image data
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      
      // Scan for QR code
      const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: "dontInvert",
      });

      if (qrCode) {
        console.log('QR Code detected:', qrCode.data);
        
        // Draw detection overlay
        drawQROverlay(context, qrCode);
        
        // Stop scanning and process result
        stopScanning();
        processQRResult(qrCode.data);
      }
    }
  };

  /**
   * Draw QR code detection overlay
   */
  const drawQROverlay = (context, qrCode) => {
    const { topLeftCorner, topRightCorner, bottomLeftCorner, bottomRightCorner } = qrCode.location;
    
    context.strokeStyle = '#00ff00';
    context.lineWidth = 4;
    context.beginPath();
    context.moveTo(topLeftCorner.x, topLeftCorner.y);
    context.lineTo(topRightCorner.x, topRightCorner.y);
    context.lineTo(bottomRightCorner.x, bottomRightCorner.y);
    context.lineTo(bottomLeftCorner.x, bottomLeftCorner.y);
    context.closePath();
    context.stroke();
  };

  /**
   * Process QR scan result
   */
  const processQRResult = async (qrData) => {
    try {
      // Validate QR data format
      let parsedData;
      try {
        parsedData = JSON.parse(qrData);
      } catch (parseError) {
        throw new Error('Invalid QR code format - not valid JSON');
      }

      // Validate required fields
      if (!parsedData.packageId || !parsedData.proof || !parsedData.nullifier) {
        throw new Error('Invalid pickup QR code - missing required fields');
      }

      // Check expiration
      if (parsedData.expiresAt && Date.now() > parsedData.expiresAt) {
        throw new Error('QR code has expired');
      }

      // Pass to parent component
      onResult(parsedData);

    } catch (error) {
      console.error('QR processing error:', error);
      setError('Invalid QR code: ' + error.message);
      
      // Restart scanning after error
      setTimeout(() => {
        setError(null);
        startScanning(selectedDevice);
      }, 3000);
    }
  };

  /**
   * Switch camera device
   */
  const switchCamera = async (deviceId) => {
    setSelectedDevice(deviceId);
    if (scanning) {
      await startScanning(deviceId);
    }
  };

  /**
   * Handle cancel
   */
  const handleCancel = () => {
    stopScanning();
    onCancel();
  };

  if (error) {
    return (
      <div className="qr-scanner error">
        <div className="error-message">
          <div className="error-icon">⚠️</div>
          <h3>Scanner Error</h3>
          <p>{error}</p>
          <div className="error-actions">
            <button className="btn btn-primary" onClick={initializeCamera}>
              Retry
            </button>
            <button className="btn btn-secondary" onClick={handleCancel}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="qr-scanner">
      <div className="scanner-header">
        <h3>📱 Scanning for QR Code</h3>
        <p>Point camera at customer's pickup QR code</p>
      </div>

      <div className="scanner-container">
        <div className="video-container">
          <video
            ref={videoRef}
            className="scanner-video"
            autoPlay
            playsInline
            muted
          />
          <canvas
            ref={canvasRef}
            className="scanner-overlay"
          />
          
          {/* Scanner UI Overlay */}
          <div className="scanner-ui">
            <div className="scan-frame">
              <div className="frame-corner top-left"></div>
              <div className="frame-corner top-right"></div>
              <div className="frame-corner bottom-left"></div>
              <div class="frame-corner bottom-right"></div>
            </div>
            
            <div className="scan-instruction">
              <p>Position QR code within frame</p>
              <div className={`scan-status ${scanning ? 'active' : ''}`}>
                {scanning ? '🔍 Scanning...' : '⏸️ Paused'}
              </div>
            </div>
          </div>
        </div>

        {/* Camera Controls */}
        <div className="scanner-controls">
          {devices.length > 1 && (
            <div className="camera-selector">
              <label>Camera:</label>
              <select 
                value={selectedDevice || ''} 
                onChange={(e) => switchCamera(e.target.value)}
                disabled={loading}
              >
                {devices.map(device => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${device.deviceId.substr(0, 8)}...`}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <div className="control-buttons">
            <button 
              className="btn btn-success"
              onClick={() => startScanning(selectedDevice)}
              disabled={scanning || loading}
            >
              {scanning ? 'Scanning...' : 'Start Scan'}
            </button>
            <button 
              className="btn btn-warning"
              onClick={stopScanning}
              disabled={!scanning || loading}
            >
              Pause
            </button>
            <button 
              className="btn btn-secondary"
              onClick={handleCancel}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Scanner Status */}
      <div className="scanner-status">
        <div className="status-grid">
          <div className="status-item">
            <span className="label">Status:</span>
            <span className={`value ${scanning ? 'success' : 'pending'}`}>
              {scanning ? 'Active 🟢' : 'Paused 🟡'}
            </span>
          </div>
          <div className="status-item">
            <span className="label">Camera:</span>
            <span className="value">
              {devices.find(d => d.deviceId === selectedDevice)?.label || 'Default'}
            </span>
          </div>
          <div className="status-item">
            <span className="label">Processing:</span>
            <span className={`value ${loading ? 'warning' : 'success'}`}>
              {loading ? 'Verifying... ⏳' : 'Ready ✅'}
            </span>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="scanner-instructions">
        <h4>📋 Scanner Instructions</h4>
        <ul>
          <li>Position customer's phone QR code within the frame</li>
          <li>Ensure good lighting and stable positioning</li>
          <li>QR code should be clearly visible and not blurred</li>
          <li>Scanner will automatically detect and process the code</li>
          <li>Keep the code steady until verification completes</li>
        </ul>
        
        <div className="security-notice">
          <h5>🔒 Security Features</h5>
          <p>
            The scanner automatically verifies:
            • Package authenticity via ZK proof
            • Age requirements for restricted items
            • Pickup authorization and timing
            • Anti-fraud nullifier validation
          </p>
        </div>
      </div>
    </div>
  );
};

export default QRScanner;