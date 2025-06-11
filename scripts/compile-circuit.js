const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

/**
 * JavaScript Circuit Compilation Script
 * Alternative to the bash script for cross-platform compatibility
 */

class CircuitCompiler {
  constructor() {
    this.circuitName = 'pickup-proof';
    this.circuitFile = `${this.circuitName}.circom`;
    this.buildDir = 'build';
    this.ptauFile = 'powersOfTau28_hez_final_14.ptau';
    this.ptauUrl = 'https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_14.ptau';
    
    this.colors = {
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      reset: '\x1b[0m'
    };
  }

  log(message, color = 'blue') {
    const colorCode = this.colors[color] || this.colors.blue;
    console.log(`${colorCode}[INFO]${this.colors.reset} ${message}`);
  }

  success(message) {
    console.log(`${this.colors.green}[SUCCESS]${this.colors.reset} ${message}`);
  }

  warning(message) {
    console.log(`${this.colors.yellow}[WARNING]${this.colors.reset} ${message}`);
  }

  error(message) {
    console.log(`${this.colors.red}[ERROR]${this.colors.reset} ${message}`);
  }

  async checkDependencies() {
    this.log('Checking dependencies...');
    
    try {
      await execAsync('circom --version');
    } catch (error) {
      this.error('circom is not installed. Please install circom first.');
      console.log('Visit: https://docs.circom.io/getting-started/installation/');
      process.exit(1);
    }

    try {
      await execAsync('snarkjs --version');
    } catch (error) {
      this.error('snarkjs is not installed. Please install snarkjs first.');
      console.log('Run: npm install -g snarkjs@latest');
      process.exit(1);
    }

    this.success('All dependencies are installed');
  }

  async setupBuildDir() {
    this.log('Setting up build directory...');
    
    const buildPath = path.join(process.cwd(), this.buildDir);
    
    if (fs.existsSync(buildPath)) {
      this.warning('Build directory exists, cleaning...');
      fs.rmSync(buildPath, { recursive: true, force: true });
    }
    
    fs.mkdirSync(buildPath, { recursive: true });
    this.success('Build directory created');
  }

  async downloadPtau() {
    this.log('Checking powers of tau file...');
    
    const ptauPath = path.join(this.buildDir, this.ptauFile);
    
    if (!fs.existsSync(ptauPath)) {
      this.log('Downloading powers of tau file (this may take a while)...');
      
      // Use curl or wget depending on platform
      const downloadCmd = process.platform === 'win32' 
        ? `curl -o "${ptauPath}" "${this.ptauUrl}"`
        : `wget -O "${ptauPath}" "${this.ptauUrl}"`;
      
      try {
        await execAsync(downloadCmd);
      } catch (error) {
        this.error('Failed to download powers of tau file');
        this.log(`You can manually download it from: ${this.ptauUrl}`);
        process.exit(1);
      }
    }
    
    this.success('Powers of tau file ready');
  }

  async compileCircuit() {
    this.log(`Compiling circuit: ${this.circuitFile}`);
    
    if (!fs.existsSync(this.circuitFile)) {
      this.error(`Circuit file ${this.circuitFile} not found!`);
      process.exit(1);
    }

    try {
      const compileCmd = `circom "${this.circuitFile}" --r1cs --wasm --sym --c -o "${this.buildDir}"`;
      const { stdout, stderr } = await execAsync(compileCmd);
      
      if (stderr) {
        console.log('Compilation output:', stderr);
      }
      
      this.success('Circuit compiled successfully');
      
      // Print circuit info
      this.log('Circuit information:');
      const infoCmd = `snarkjs r1cs info "${this.buildDir}/${this.circuitName}.r1cs"`;
      const { stdout: infoOutput } = await execAsync(infoCmd);
      console.log(infoOutput);
      
    } catch (error) {
      this.error('Circuit compilation failed');
      console.error(error.message);
      process.exit(1);
    }
  }

  async generateTrustedSetup() {
    this.log('Generating trusted setup (DEVELOPMENT ONLY - NOT FOR PRODUCTION)');
    
    const buildPath = path.join(process.cwd(), this.buildDir);
    const originalCwd = process.cwd();
    
    try {
      process.chdir(buildPath);
      
      // Phase 1: Initial ceremony
      this.log('Phase 1: Initial ceremony');
      const phase1Cmd = `snarkjs groth16 setup "${this.circuitName}.r1cs" "${this.ptauFile}" "${this.circuitName}_0000.zkey"`;
      await execAsync(phase1Cmd);
      
      // Phase 2: Contribute to ceremony
      this.log('Phase 2: Contributing to ceremony');
      const contributeCmd = `echo "dev_contribution" | snarkjs zkey contribute "${this.circuitName}_0000.zkey" "${this.circuitName}_0001.zkey" --name="Development Contribution"`;
      await execAsync(contributeCmd);
      
      // Final zkey
      this.log('Finalizing ceremony');
      const finalizeCmd = `snarkjs zkey beacon "${this.circuitName}_0001.zkey" "${this.circuitName}_final.zkey" 0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 10 -n="Final Beacon phase2"`;
      await execAsync(finalizeCmd);
      
      this.success('Trusted setup completed');
      
    } catch (error) {
      this.error('Trusted setup failed');
      console.error(error.message);
      process.exit(1);
    } finally {
      process.chdir(originalCwd);
    }
  }

  async generateVerificationKey() {
    this.log('Generating verification key');
    
    try {
      const vkCmd = `snarkjs zkey export verificationkey "${this.buildDir}/${this.circuitName}_final.zkey" "${this.buildDir}/verification_key.json"`;
      await execAsync(vkCmd);
      this.success('Verification key generated');
    } catch (error) {
      this.error('Failed to generate verification key');
      console.error(error.message);
      process.exit(1);
    }
  }

  async testCircuit() {
    this.log('Testing circuit with sample input');
    
    const inputFile = path.join('circuits', 'input.json');
    if (!fs.existsSync(inputFile)) {
      this.warning('input.json not found, skipping circuit test');
      return;
    }

    const buildPath = path.join(process.cwd(), this.buildDir);
    const originalCwd = process.cwd();
    
    try {
      process.chdir(buildPath);
      
      // Generate witness
      this.log('Generating witness...');
      const witnessCmd = `node "${this.circuitName}_js/generate_witness.js" "${this.circuitName}_js/${this.circuitName}.wasm" "../circuits/input.json" witness.wtns`;
      await execAsync(witnessCmd);
      
      // Generate proof
      this.log('Generating proof...');
      const proofCmd = `snarkjs groth16 prove "${this.circuitName}_final.zkey" witness.wtns proof.json public.json`;
      await execAsync(proofCmd);
      
      // Verify proof
      this.log('Verifying proof...');
      const verifyCmd = `snarkjs groth16 verify verification_key.json public.json proof.json`;
      const { stdout } = await execAsync(verifyCmd);
      
      if (stdout.includes('OK')) {
        this.success('Circuit test completed successfully');
      } else {
        this.error('Proof verification failed');
        return false;
      }
      
    } catch (error) {
      this.error('Circuit test failed');
      console.error(error.message);
      return false;
    } finally {
      process.chdir(originalCwd);
    }
    
    return true;
  }

  async copyToFrontend() {
    this.log('Copying files to frontend...');
    
    const frontendDir = path.join('frontend', 'public', 'circuits');
    
    try {
      // Create frontend circuits directory
      fs.mkdirSync(frontendDir, { recursive: true });
      
      // Copy necessary files
      const filesToCopy = [
        {
          src: path.join(this.buildDir, `${this.circuitName}_js`, `${this.circuitName}.wasm`),
          dest: path.join(frontendDir, `${this.circuitName}.wasm`)
        },
        {
          src: path.join(this.buildDir, `${this.circuitName}_final.zkey`),
          dest: path.join(frontendDir, `${this.circuitName}_final.zkey`)
        },
        {
          src: path.join(this.buildDir, 'verification_key.json'),
          dest: path.join(frontendDir, 'verification_key.json')
        }
      ];

      for (const file of filesToCopy) {
        if (fs.existsSync(file.src)) {
          fs.copyFileSync(file.src, file.dest);
        } else {
          this.warning(`${path.basename(file.src)} not found, skipping`);
        }
      }
      
      this.success('Files copied to frontend');
      
    } catch (error) {
      this.warning('Failed to copy some files to frontend');
      console.error(error.message);
    }
  }

  async generateSolidityVerifier() {
    this.log('Generating Solidity verifier contract');
    
    try {
      const verifierCmd = `snarkjs zkey export solidityverifier "${this.buildDir}/${this.circuitName}_final.zkey" "contracts/Verifier.sol"`;
      await execAsync(verifierCmd);
      this.success('Solidity verifier generated');
    } catch (error) {
      this.warning('Failed to generate Solidity verifier (this is optional)');
    }
  }

  printSummary() {
    this.success('=== COMPILATION COMPLETE ===');
    console.log('');
    console.log(`Generated files in ${this.buildDir}/:`);
    console.log(`  - ${this.circuitName}.r1cs (R1CS constraint system)`);
    console.log(`  - ${this.circuitName}_js/ (WASM and witness generator)`);
    console.log(`  - ${this.circuitName}_final.zkey (Proving key)`);
    console.log(`  - verification_key.json (Verification key)`);
    console.log('');
    console.log('Files copied to frontend/public/circuits/:');
    console.log(`  - ${this.circuitName}.wasm`);
    console.log(`  - ${this.circuitName}_final.zkey`);
    console.log(`  - verification_key.json`);
    console.log('');
    console.log(`${this.colors.yellow}⚠️  IMPORTANT SECURITY NOTICE ⚠️${this.colors.reset}`);
    console.log('This trusted setup is for DEVELOPMENT ONLY!');
    console.log('For production use, you MUST perform a proper trusted setup ceremony.');
    console.log('Never use development keys in production!');
    console.log('');
    this.success('✅ Your ZK circuit is ready for development!');
  }

  async compile() {
    console.log('🔮 Anonymous Pickup System - Circuit Compiler (JavaScript)');
    console.log('==========================================================');
    console.log('');

    try {
      await this.checkDependencies();
      await this.setupBuildDir();
      await this.downloadPtau();
      await this.compileCircuit();
      await this.generateTrustedSetup();
      await this.generateVerificationKey();
      await this.testCircuit();
      await this.copyToFrontend();
      await this.generateSolidityVerifier();
      this.printSummary();
      
    } catch (error) {
      this.error('Compilation failed');
      console.error(error);
      process.exit(1);
    }
  }

  async clean() {
    this.log('Cleaning build directory...');
    const buildPath = path.join(process.cwd(), this.buildDir);
    
    if (fs.existsSync(buildPath)) {
      fs.rmSync(buildPath, { recursive: true, force: true });
      this.success('Build directory cleaned');
    } else {
      this.log('Build directory does not exist');
    }
  }

  async testOnly() {
    this.log('Testing existing circuit...');
    const success = await this.testCircuit();
    if (success) {
      this.success('Circuit test completed');
    } else {
      process.exit(1);
    }
  }
}

// Handle command line arguments
async function main() {
  const compiler = new CircuitCompiler();
  const args = process.argv.slice(2);

  // Change to circuits directory if it exists
  const circuitsDir = path.join(process.cwd(), 'circuits');
  if (fs.existsSync(circuitsDir)) {
    process.chdir(circuitsDir);
  }

  switch (args[0]) {
    case '--help':
    case '-h':
      console.log('Usage: node compile-circuit.js [OPTIONS]');
      console.log('');
      console.log('Compile the pickup-proof.circom circuit for the Anonymous Pickup System');
      console.log('');
      console.log('Options:');
      console.log('  --help, -h     Show this help message');
      console.log('  --clean        Clean build directory only');
      console.log('  --test-only    Only test existing circuit (skip compilation)');
      console.log('');
      console.log('Examples:');
      console.log('  node compile-circuit.js              # Full compilation');
      console.log('  node compile-circuit.js --clean      # Clean build directory');
      console.log('  node compile-circuit.js --test-only  # Test existing circuit');
      break;
      
    case '--clean':
      await compiler.clean();
      break;
      
    case '--test-only':
      await compiler.testOnly();
      break;
      
    default:
      await compiler.compile();
      break;
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = CircuitCompiler;