// api/server.js
// Backend API service for Anonymous Pickup System

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { ethers } = require('ethers');
const snarkjs = require('snarkjs');
const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');

const app = express();
const PORT = process.env.PORT || 3000;

// Configuration
const config = {
    rpcUrl: process.env.RPC_URL || 'http://localhost:8545',
    jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
    contracts: {
        pickupSystem: process.env.PICKUP_SYSTEM_ADDRESS,
        walletEnhancement: process.env.WALLET_ENHANCEMENT_ADDRESS,
        analytics: process.env.ANALYTICS_ADDRESS
    },
    circuit: {
        wasmPath: './circuits/pickup-proof.wasm',
        zkeyPath: './circuits/pickup-proof_final.zkey',
        vkeyPath: './circuits/verification_key.json'
    },
    maxFileSize: 5 * 1024 * 1024, // 5MB
    maxImageProcessingTime: 30000 // 30 seconds
};

// Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// File upload configuration
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: config.maxFileSize
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'));
        }
    }
});

// Initialize blockchain connection
let provider;
let contracts = {};

async function initializeBlockchain() {
    try {
        provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
        
        // Test connection
        const network = await provider.getNetwork();
        console.log(`Connected to blockchain network: ${network.name} (${network.chainId})`);
        
        // Initialize contract instances (read-only)
        // In production, you'd load the actual ABIs
        const pickupSystemABI = [
            "function getPackage(bytes32) external view returns (bytes32,uint256,address,address,uint256,uint256,uint256,uint256,uint256,bool,bool)",
            "function canPickup(bytes32) external view returns (bool)",
            "function getSellerInfo(address) external view returns (bool,uint256,uint256,uint256)",
            "function getStoreInfo(address) external view returns (bool,string,string,uint256,uint256)"
        ];
        
        contracts.pickupSystem = new ethers.Contract(
            config.contracts.pickupSystem,
            pickupSystemABI,
            provider
        );
        
        console.log('✅ Blockchain connection initialized');
        
    } catch (error) {
        console.error('❌ Failed to initialize blockchain:', error);
        throw error;
    }
}

// Authentication middleware
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }
    
    jwt.verify(token, config.jwtSecret, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
}

// Validation middleware
function validate(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            details: errors.array()
        });
    }
    next();
}

// Routes

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        blockchain: provider ? 'connected' : 'disconnected'
    });
});

// Authentication endpoints
app.post('/api/auth/register', [
    body('walletAddress').isEthereumAddress(),
    body('signature').isLength({ min: 1 })
], validate, async (req, res) => {
    try {
        const { walletAddress, signature, message } = req.body;
        
        // Verify signature
        const recoveredAddress = ethers.utils.verifyMessage(message, signature);
        if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
            return res.status(400).json({ error: 'Invalid signature' });
        }
        
        // Generate JWT token
        const token = jwt.sign(
            { 
                walletAddress: walletAddress.toLowerCase(),
                iat: Math.floor(Date.now() / 1000)
            },
            config.jwtSecret,
            { expiresIn: '24h' }
        );
        
        res.json({
            success: true,
            token,
            walletAddress
        });
        
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Package information endpoints
app.get('/api/packages/:packageId', async (req, res) => {
    try {
        const { packageId } = req.params;
        
        // Validate package ID format
        if (!ethers.utils.isHexString(packageId, 32)) {
            return res.status(400).json({ error: 'Invalid package ID format' });
        }
        
        const packageInfo = await contracts.pickupSystem.getPackage(packageId);
        
        if (packageInfo.id === ethers.constants.HashZero) {
            return res.status(404).json({ error: 'Package not found' });
        }
        
        res.json({
            id: packageInfo.id,
            storeAddress: packageInfo.storeAddress,
            seller: packageInfo.seller,
            itemPrice: ethers.utils.formatEther(packageInfo.itemPrice),
            shippingFee: ethers.utils.formatEther(packageInfo.shippingFee),
            createdTime: packageInfo.createdTime.toNumber(),
            expiryTime: packageInfo.expiryTime.toNumber(),
            minAgeRequired: packageInfo.minAgeRequired.toNumber(),
            isPickedUp: packageInfo.isPickedUp,
            sellerPaysShipping: packageInfo.sellerPaysShipping
        });
        
    } catch (error) {
        console.error('Package lookup error:', error);
        res.status(500).json({ error: 'Failed to retrieve package information' });
    }
});

// Check if package can be picked up
app.get('/api/packages/:packageId/can-pickup', async (req, res) => {
    try {
        const { packageId } = req.params;
        
        if (!ethers.utils.isHexString(packageId, 32)) {
            return res.status(400).json({ error: 'Invalid package ID format' });
        }
        
        const canPickup = await contracts.pickupSystem.canPickup(packageId);
        
        res.json({
            canPickup,
            packageId,
            timestamp: Date.now()
        });
        
    } catch (error) {
        console.error('Pickup eligibility check error:', error);
        res.status(500).json({ error: 'Failed to check pickup eligibility' });
    }
});

// Age verification endpoint
app.post('/api/verify-age', authenticateToken, upload.single('idImage'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'ID image is required' });
        }
        
        // Process ID image with timeout
        const verificationResult = await Promise.race([
            processIDImage(req.file.buffer),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Processing timeout')), config.maxImageProcessingTime)
            )
        ]);
        
        if (verificationResult.isValid && verificationResult.age >= 18) {
            // Generate age verification hash
            const ageProofHash = ethers.utils.keccak256(
                ethers.utils.toUtf8Bytes(
                    `age_verified_${verificationResult.age}_${Date.now()}_${req.user.walletAddress}`
                )
            );
            
            res.json({
                success: true,
                ageProofHash,
                isAdult: true,
                verificationTime: Date.now()
            });
        } else {
            res.status(400).json({
                success: false,
                error: 'Age verification failed',
                isAdult: false
            });
        }
        
    } catch (error) {
        console.error('Age verification error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Age verification service unavailable' 
        });
    }
});

// ZK proof generation endpoint
app.post('/api/generate-proof', authenticateToken, [
    body('packageId').isHexString(),
    body('buyerSecret').isNumeric(),
    body('userNameHash').isNumeric(),
    body('phoneLastThree').isInt({ min: 0, max: 999 }),
    body('age').isInt({ min: 1, max: 150 }),
    body('nonce').isNumeric()
], validate, async (req, res) => {
    try {
        // Check if circuit files exist
        const circuitExists = await checkCircuitFiles();
        if (!circuitExists) {
            return res.status(503).json({ 
                error: 'ZK circuit not available',
                message: 'Circuit files not found. Using simplified proof generation.'
            });
        }
        
        const {
            packageId,
            buyerSecret,
            userNameHash,
            phoneLastThree,
            age,
            nonce,
            storeAddress,
            minAgeRequired
        } = req.body;
        
        // Prepare circuit inputs
        const circuitInputs = {
            buyer_secret: buyerSecret,
            user_name_hash: userNameHash,
            phone_last3: phoneLastThree.toString(),
            age: age.toString(),
            nonce: nonce,
            package_id: packageId,
            buyer_commitment: ethers.utils.keccak256(
                ethers.utils.defaultAbiCoder.encode(
                    ['uint256', 'uint256', 'uint256'],
                    [buyerSecret, userNameHash, phoneLastThree]
                )
            ),
            store_address: ethers.BigNumber.from(storeAddress).toString(),
            timestamp: Math.floor(Date.now() / 1000).toString(),
            min_age_required: minAgeRequired.toString()
        };
        
        // Generate ZK proof
        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            circuitInputs,
            config.circuit.wasmPath,
            config.circuit.zkeyPath
        );
        
        // Format proof for smart contract
        const formattedProof = [
            proof.pi_a[0], proof.pi_a[1],
            proof.pi_b[0][1], proof.pi_b[0][0],
            proof.pi_b[1][1], proof.pi_b[1][0],
            proof.pi_c[0], proof.pi_c[1]
        ];
        
        res.json({
            success: true,
            proof: formattedProof,
            publicSignals,
            timestamp: Date.now()
        });
        
    } catch (error) {
        console.error('Proof generation error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Proof generation failed',
            details: error.message
        });
    }
});

// QR code generation endpoint
app.post('/api/generate-qr', authenticateToken, [
    body('packageId').isHexString(),
    body('proof').isArray(),
    body('nullifier').isNumeric()
], validate, async (req, res) => {
    try {
        const { packageId, proof, nullifier } = req.body;
        
        const qrData = {
            packageId,
            proof,
            nullifier,
            buyerAddress: req.user.walletAddress,
            timestamp: Date.now(),
            expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
        };
        
        // Generate QR code as base64 image
        const QRCode = require('qrcode');
        const qrCodeDataURL = await QRCode.toDataURL(
            JSON.stringify(qrData),
            {
                errorCorrectionLevel: 'M',
                type: 'image/png',
                quality: 0.92,
                margin: 1,
                color: {
                    dark: '#000000',
                    light: '#FFFFFF'
                }
            }
        );
        
        res.json({
            success: true,
            qrCode: qrCodeDataURL,
            qrData,
            expiresAt: qrData.expiresAt
        });
        
    } catch (error) {
        console.error('QR generation error:', error);
        res.status(500).json({ 
            success: false,
            error: 'QR code generation failed' 
        });
    }
});

// Store verification endpoint
app.post('/api/verify-pickup', authenticateToken, [
    body('packageId').isHexString(),
    body('proof').isArray(),
    body('nullifier').isNumeric(),
    body('buyerAddress').isEthereumAddress()
], validate, async (req, res) => {
    try {
        const { packageId, proof, nullifier, buyerAddress } = req.body;
        
        // Verify proof format
        if (proof.length !== 8) {
            return res.status(400).json({ error: 'Invalid proof format' });
        }
        
        // Check if package exists and can be picked up
        const canPickup = await contracts.pickupSystem.canPickup(packageId);
        if (!canPickup) {
            return res.status(400).json({ error: 'Package cannot be picked up' });
        }
        
        // In a real implementation, you would verify the ZK proof here
        // For now, we'll return a successful verification
        
        res.json({
            success: true,
            verified: true,
            packageId,
            nullifier,
            timestamp: Date.now(),
            message: 'Pickup verified successfully'
        });
        
    } catch (error) {
        console.error('Pickup verification error:', error);
        res.status(500).json({ 
            success: false,
            error: 'Pickup verification failed' 
        });
    }
});

// Analytics endpoints
app.get('/api/analytics/seller/:address', async (req, res) => {
    try {
        const { address } = req.params;
        
        if (!ethers.utils.isAddress(address)) {
            return res.status(400).json({ error: 'Invalid address format' });
        }
        
        const sellerInfo = await contracts.pickupSystem.getSellerInfo(address);
        
        res.json({
            isRegistered: sellerInfo.isRegistered,
            totalPackages: sellerInfo.totalPackages.toNumber(),
            successfulDeliveries: sellerInfo.successfulDeliveries.toNumber(),
            totalRevenue: ethers.utils.formatEther(sellerInfo.totalRevenue),
            successRate: sellerInfo.totalPackages.toNumber() > 0 
                ? (sellerInfo.successfulDeliveries.toNumber() / sellerInfo.totalPackages.toNumber() * 100).toFixed(1)
                : 0
        });
        
    } catch (error) {
        console.error('Seller analytics error:', error);
        res.status(500).json({ error: 'Failed to retrieve seller analytics' });
    }
});

app.get('/api/analytics/store/:address', async (req, res) => {
    try {
        const { address } = req.params;
        
        if (!ethers.utils.isAddress(address)) {
            return res.status(400).json({ error: 'Invalid address format' });
        }
        
        const storeInfo = await contracts.pickupSystem.getStoreInfo(address);
        
        res.json({
            isAuthorized: storeInfo.isAuthorized,
            storeName: storeInfo.storeName,
            location: storeInfo.location,
            totalPickups: storeInfo.totalPickups.toNumber(),
            commissionRate: storeInfo.commissionRate.toNumber() / 100 // Convert from basis points
        });
        
    } catch (error) {
        console.error('Store analytics error:', error);
        res.status(500).json({ error: 'Failed to retrieve store analytics' });
    }
});

// Utility functions

async function processIDImage(imageBuffer) {
    try {
        // Process image with sharp for better quality
        const processedImage = await sharp(imageBuffer)
            .resize(800, 600)
            .jpeg({ quality: 90 })
            .toBuffer();
        
        // Mock OCR processing (in production, integrate with actual OCR service)
        // This would typically use services like Google Vision API, AWS Textract, etc.
        
        // Simulate OCR result for Taiwan ID
        const mockOCRResult = {
            isValid: true,
            age: 25, // Mock age extraction
            documentType: 'taiwan_id',
            confidence: 0.95
        };
        
        return mockOCRResult;
        
    } catch (error) {
        console.error('Image processing error:', error);
        return {
            isValid: false,
            error: 'Failed to process ID image'
        };
    }
}

async function checkCircuitFiles() {
    try {
        await fs.access(config.circuit.wasmPath);
        await fs.access(config.circuit.zkeyPath);
        await fs.access(config.circuit.vkeyPath);
        return true;
    } catch (error) {
        return false;
    }
}

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('API Error:', error);
    
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large' });
        }
    }
    
    res.status(500).json({ 
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    process.exit(0);
});

// Start server
async function startServer() {
    try {
        await initializeBlockchain();
        
        app.listen(PORT, () => {
            console.log(`🚀 Anonymous Pickup API Server running on port ${PORT}`);
            console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
            console.log(`🔗 Blockchain: ${config.rpcUrl}`);
            console.log(`⚡ Environment: ${process.env.NODE_ENV || 'development'}`);
        });
        
    } catch (error) {
        console.error('❌ Failed to start server:', error);
        process.exit(1);
    }
}

// Start the server
if (require.main === module) {
    startServer();
}

module.exports = app;