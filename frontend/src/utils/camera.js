import jsQR from 'jsqr';

/**
 * Camera and QR Code Utilities
 * Handles camera access, QR code scanning, and image processing
 */

class CameraHelper {
  constructor() {
    this.stream = null;
    this.video = null;
    this.canvas = null;
    this.context = null;
    this.scanInterval = null;
    this.isScanning = false;
    this.constraints = {
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'environment' // Use back camera on mobile
      }
    };
  }

  /**
   * Check if camera API is supported
   * @returns {boolean} Support status
   */
  isSupported() {
    return !!(
      navigator.mediaDevices &&
      navigator.mediaDevices.getUserMedia &&
      window.URL &&
      window.URL.createObjectURL
    );
  }

  /**
   * Get available camera devices
   * @returns {Array} List of video input devices
   */
  async getVideoDevices() {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'videoinput');
    } catch (error) {
      console.error('Error getting video devices:', error);
      return [];
    }
  }

  /**
   * Start camera stream
   * @param {string} deviceId - Optional device ID
   * @returns {MediaStream} Camera stream
   */
  async startCamera(deviceId = null) {
    try {
      // Stop existing stream
      this.stopCamera();

      // Update constraints with specific device if provided
      const constraints = {
        ...this.constraints,
        video: {
          ...this.constraints.video,
          ...(deviceId && { deviceId: { exact: deviceId } })
        }
      };

      // Request camera access
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      console.log('✅ Camera started successfully');
      return this.stream;

    } catch (error) {
      console.error('❌ Camera start failed:', error);
      throw this.handleCameraError(error);
    }
  }

  /**
   * Stop camera stream
   */
  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
    
    this.stopScanning();
    console.log('📷 Camera stopped');
  }

  /**
   * Initialize QR code scanning
   * @param {HTMLVideoElement} videoElement - Video element
   * @param {HTMLCanvasElement} canvasElement - Canvas element
   * @param {Function} onResult - Callback for QR code results
   * @param {Function} onError - Callback for errors
   */
  initializeScanning(videoElement, canvasElement, onResult, onError) {
    this.video = videoElement;
    this.canvas = canvasElement;
    this.context = canvasElement.getContext('2d');
    this.onResult = onResult;
    this.onError = onError;

    // Start scanning when video is ready
    this.video.addEventListener('loadedmetadata', () => {
      this.canvas.width = this.video.videoWidth;
      this.canvas.height = this.video.videoHeight;
    });
  }

  /**
   * Start QR code scanning loop
   * @param {number} interval - Scan interval in milliseconds (default: 100)
   */
  startScanning(interval = 100) {
    if (this.isScanning) return;
    
    this.isScanning = true;
    this.scanInterval = setInterval(() => {
      this.scanFrame();
    }, interval);
    
    console.log('🔍 QR scanning started');
  }

  /**
   * Stop QR code scanning loop
   */
  stopScanning() {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    
    this.isScanning = false;
    console.log('⏹️ QR scanning stopped');
  }

  /**
   * Scan current video frame for QR codes
   */
  scanFrame() {
    if (!this.video || !this.canvas || !this.context) return;
    if (this.video.readyState !== this.video.HAVE_ENOUGH_DATA) return;

    try {
      // Draw current video frame to canvas
      this.context.drawImage(
        this.video, 
        0, 0, 
        this.canvas.width, 
        this.canvas.height
      );

      // Get image data
      const imageData = this.context.getImageData(
        0, 0, 
        this.canvas.width, 
        this.canvas.height
      );

      // Scan for QR code
      const qrCode = jsQR(
        imageData.data, 
        imageData.width, 
        imageData.height,
        {
          inversionAttempts: "dontInvert"
        }
      );

      if (qrCode) {
        // Draw detection overlay
        this.drawQROverlay(qrCode);
        
        // Process result
        this.processQRResult(qrCode);
      }

    } catch (error) {
      console.error('Frame scanning error:', error);
      if (this.onError) {
        this.onError(error);
      }
    }
  }

  /**
   * Draw QR code detection overlay on canvas
   * @param {Object} qrCode - Detected QR code object
   */
  drawQROverlay(qrCode) {
    const { topLeftCorner, topRightCorner, bottomLeftCorner, bottomRightCorner } = qrCode.location;
    
    this.context.strokeStyle = '#00ff00';
    this.context.lineWidth = 4;
    this.context.beginPath();
    this.context.moveTo(topLeftCorner.x, topLeftCorner.y);
    this.context.lineTo(topRightCorner.x, topRightCorner.y);
    this.context.lineTo(bottomRightCorner.x, bottomRightCorner.y);
    this.context.lineTo(bottomLeftCorner.x, bottomLeftCorner.y);
    this.context.closePath();
    this.context.stroke();

    // Add detection indicator
    this.context.fillStyle = '#00ff0080';
    this.context.fillRect(
      topLeftCorner.x - 10,
      topLeftCorner.y - 30,
      100,
      20
    );
    
    this.context.fillStyle = '#ffffff';
    this.context.font = '14px Arial';
    this.context.fillText('QR Detected', topLeftCorner.x - 5, topLeftCorner.y - 15);
  }

  /**
   * Process detected QR code
   * @param {Object} qrCode - Detected QR code object
   */
  processQRResult(qrCode) {
    try {
      // Validate QR data
      const qrData = this.validateQRData(qrCode.data);
      
      // Stop scanning on successful detection
      this.stopScanning();
      
      // Call result callback
      if (this.onResult) {
        this.onResult(qrData);
      }

    } catch (error) {
      console.error('QR processing error:', error);
      if (this.onError) {
        this.onError(error);
      }
    }
  }

  /**
   * Validate QR code data format
   * @param {string} qrData - Raw QR code data
   * @returns {Object} Validated QR data
   */
  validateQRData(qrData) {
    try {
      // Try to parse as JSON
      const parsedData = JSON.parse(qrData);
      
      // Validate required fields for pickup QR codes
      if (!parsedData.packageId || !parsedData.proof || !parsedData.nullifier) {
        throw new Error('Invalid pickup QR code format');
      }

      // Check expiration
      if (parsedData.expiresAt && Date.now() > parsedData.expiresAt) {
        throw new Error('QR code has expired');
      }

      return parsedData;

    } catch (parseError) {
      if (parseError.message.includes('Invalid pickup QR code') || 
          parseError.message.includes('expired')) {
        throw parseError;
      }
      
      // If not JSON, treat as plain text QR code
      return {
        type: 'text',
        data: qrData,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Capture image from video stream
   * @param {string} format - Output format ('image/png' or 'image/jpeg')
   * @param {number} quality - JPEG quality (0-1)
   * @returns {string} Base64 image data URL
   */
  captureImage(format = 'image/jpeg', quality = 0.8) {
    if (!this.video || !this.canvas || !this.context) {
      throw new Error('Camera not initialized');
    }

    try {
      // Draw current frame to canvas
      this.context.drawImage(
        this.video,
        0, 0,
        this.canvas.width,
        this.canvas.height
      );

      // Convert to base64 data URL
      const imageData = this.canvas.toDataURL(format, quality);
      console.log('📸 Image captured successfully');
      
      return imageData;

    } catch (error) {
      console.error('Image capture failed:', error);
      throw error;
    }
  }

  /**
   * Handle camera-specific errors
   * @param {Error} error - Camera error
   * @returns {Error} Formatted error
   */
  handleCameraError(error) {
    let message = 'Camera access failed';
    
    switch (error.name) {
      case 'NotAllowedError':
        message = 'Camera access denied. Please allow camera permissions.';
        break;
      case 'NotFoundError':
        message = 'No camera found on this device.';
        break;
      case 'NotReadableError':
        message = 'Camera is already in use by another application.';
        break;
      case 'OverconstrainedError':
        message = 'Camera does not support the required specifications.';
        break;
      case 'SecurityError':
        message = 'Camera access blocked for security reasons.';
        break;
      default:
        message = error.message || 'Unknown camera error occurred.';
    }

    return new Error(message);
  }

  /**
   * Request camera permissions
   * @returns {boolean} Permission granted status
   */
  async requestPermissions() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop()); // Stop immediately
      return true;
    } catch (error) {
      console.error('Camera permission denied:', error);
      return false;
    }
  }

  /**
   * Check camera permissions status
   * @returns {string} Permission status ('granted', 'denied', 'prompt')
   */
  async checkPermissions() {
    try {
      if (!navigator.permissions) {
        return 'unknown';
      }
      
      const permission = await navigator.permissions.query({ name: 'camera' });
      return permission.state;
    } catch (error) {
      console.error('Permission check failed:', error);
      return 'unknown';
    }
  }

  /**
   * Get optimal camera constraints for different use cases
   * @param {string} useCase - 'qr', 'id', 'general'
   * @returns {Object} Camera constraints
   */
  getOptimalConstraints(useCase = 'qr') {
    const baseConstraints = {
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'environment'
      }
    };

    switch (useCase) {
      case 'qr':
        return {
          ...baseConstraints,
          video: {
            ...baseConstraints.video,
            focusMode: 'continuous',
            aspectRatio: 16/9
          }
        };
      
      case 'id':
        return {
          ...baseConstraints,
          video: {
            ...baseConstraints.video,
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            focusMode: 'single-shot'
          }
        };
      
      default:
        return baseConstraints;
    }
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    this.stopCamera();
    this.video = null;
    this.canvas = null;
    this.context = null;
    this.onResult = null;
    this.onError = null;
  }
}

// Create singleton instance
const cameraHelper = new CameraHelper();

export default cameraHelper;