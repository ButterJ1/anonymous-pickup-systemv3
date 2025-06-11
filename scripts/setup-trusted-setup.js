const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const readline = require('readline');

const execAsync = promisify(exec);

/**
 * Trusted Setup Ceremony Script
 * Guides users through setting up a proper trusted setup for production
 */

class TrustedSetupManager {
  constructor() {
    this.circuitName = 'pickup-proof';
    this.buildDir = 'build';
    this.ceremonyDir = 'ceremony';
    
    this.colors = {
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      cyan: '\x1b[36m',
      reset: '\x1b[0m'
    };

    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
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

  highlight(message) {
    console.log(`${this.colors.cyan}${message}${this.colors.reset}`);
  }

  async question(prompt) {
    return new Promise((resolve) => {
      this.rl.question(prompt, resolve);
    });
  }

  async confirmAction(message) {
    const answer = await this.question(`${message} (y/N): `);
    return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
  }

  async displayIntroduction() {
    console.clear();
    this.highlight('🔐 TRUSTED SETUP CEREMONY MANAGER');
    this.highlight('==================================');
    console.log('');
    console.log('This script will guide you through setting up a proper trusted setup');
    console.log('ceremony for the Anonymous Pickup System ZK circuit.');
    console.log('');
    this.warning('⚠️  CRITICAL SECURITY INFORMATION ⚠️');
    console.log('');
    console.log('A trusted setup ceremony is essential for production ZK systems:');
    console.log('• Development setups are NOT secure for production');
    console.log('• Ceremony participants must be trustworthy');
    console.log('• At least one participant must destroy their toxic waste');
    console.log('• The ceremony should be publicly verifiable');
    console.log('');
    
    const proceed = await this.confirmAction('Do you want to continue?');
    if (!proceed) {
      console.log('Setup cancelled.');
      process.exit(0);
    }
  }

  async checkPrerequisites() {
    this.log('Checking prerequisites...');
    
    // Check if circuit is compiled
    const r1csPath = path.join(this.buildDir, `${this.circuitName}.r1cs`);
    if (!fs.existsSync(r1csPath)) {
      this.error('Circuit not compiled. Please run circuit compilation first.');
      console.log('Run: cd circuits && ./compile.sh');
      process.exit(1);
    }

    // Check if powers of tau file exists
    const ptauFile = path.join(this.buildDir, 'powersOfTau28_hez_final_14.ptau');
    if (!fs.existsSync(ptauFile)) {
      this.error('Powers of tau file not found.');
      console.log('Please run circuit compilation to download the file.');
      process.exit(1);
    }

    // Check snarkjs
    try {
      await execAsync('snarkjs --version');
    } catch (error) {
      this.error('snarkjs not installed. Please install: npm install -g snarkjs@latest');
      process.exit(1);
    }

    this.success('Prerequisites check passed');
  }

  async selectCeremonyType() {
    console.log('');
    this.highlight('CEREMONY TYPE SELECTION');
    this.highlight('========================');
    console.log('');
    console.log('1. 🧪 Development Setup (NOT for production)');
    console.log('   • Quick setup for testing');
    console.log('   • Single participant (you)');
    console.log('   • No security guarantees');
    console.log('');
    console.log('2. 🏗️  Multi-Party Ceremony (Recommended for production)');
    console.log('   • Multiple trusted participants');
    console.log('   • Each participant contributes randomness');
    console.log('   • Secure if at least one participant is honest');
    console.log('');
    console.log('3. 📋 Ceremony Verification');
    console.log('   • Verify an existing ceremony');
    console.log('   • Check ceremony integrity');
    console.log('');

    const choice = await this.question('Select ceremony type (1-3): ');
    
    switch (choice) {
      case '1':
        return 'dev';
      case '2':
        return 'multi-party';
      case '3':
        return 'verify';
      default:
        this.error('Invalid choice. Please select 1, 2, or 3.');
        return await this.selectCeremonyType();
    }
  }

  async setupCeremonyDirectory() {
    const ceremonyPath = path.join(this.ceremonyDir);
    
    if (fs.existsSync(ceremonyPath)) {
      this.warning('Ceremony directory exists.');
      const overwrite = await this.confirmAction('Overwrite existing ceremony?');
      if (overwrite) {
        fs.rmSync(ceremonyPath, { recursive: true, force: true });
      } else {
        this.log('Using existing ceremony directory');
        return;
      }
    }

    fs.mkdirSync(ceremonyPath, { recursive: true });
    this.success('Ceremony directory created');
  }

  async developmentSetup() {
    this.warning('🧪 DEVELOPMENT SETUP - NOT FOR PRODUCTION');
    console.log('');
    
    const confirm = await this.confirmAction('Continue with development setup?');
    if (!confirm) return;

    await this.setupCeremonyDirectory();
    
    try {
      this.log('Generating development trusted setup...');
      
      // Copy R1CS to ceremony directory
      fs.copyFileSync(
        path.join(this.buildDir, `${this.circuitName}.r1cs`),
        path.join(this.ceremonyDir, `${this.circuitName}.r1cs`)
      );
      
      // Copy powers of tau
      fs.copyFileSync(
        path.join(this.buildDir, 'powersOfTau28_hez_final_14.ptau'),
        path.join(this.ceremonyDir, 'powersOfTau28_hez_final_14.ptau')
      );

      const originalCwd = process.cwd();
      process.chdir(this.ceremonyDir);

      // Phase 1
      this.log('Phase 1: Initial setup...');
      await execAsync(`snarkjs groth16 setup ${this.circuitName}.r1cs powersOfTau28_hez_final_14.ptau ${this.circuitName}_0000.zkey`);

      // Single contribution
      this.log('Adding development contribution...');
      const contributionName = await this.question('Enter your name for the contribution: ') || 'Anonymous Developer';
      await execAsync(`echo "development_entropy_$(date +%s)" | snarkjs zkey contribute ${this.circuitName}_0000.zkey ${this.circuitName}_0001.zkey --name="${contributionName}"`);

      // Finalize
      this.log('Finalizing ceremony...');
      await execAsync(`snarkjs zkey beacon ${this.circuitName}_0001.zkey ${this.circuitName}_final.zkey 0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f 10 -n="Development Final Beacon"`);

      // Generate verification key
      await execAsync(`snarkjs zkey export verificationkey ${this.circuitName}_final.zkey verification_key.json`);

      process.chdir(originalCwd);
      
      this.success('Development setup completed');
      this.warning('⚠️  Remember: This setup is only for development and testing!');
      
    } catch (error) {
      this.error('Development setup failed');
      console.error(error.message);
    }
  }

  async multiPartySetup() {
    this.highlight('🏗️  MULTI-PARTY CEREMONY SETUP');
    console.log('');
    console.log('This will set up a multi-party trusted setup ceremony.');
    console.log('You will need to coordinate with other participants.');
    console.log('');

    const participants = await this.question('How many participants (including you)? ');
    const numParticipants = parseInt(participants);
    
    if (numParticipants < 2) {
      this.error('Multi-party ceremony requires at least 2 participants');
      return;
    }

    console.log('');
    this.highlight('CEREMONY STEPS:');
    console.log('1. You will create the initial ceremony file');
    console.log('2. Each participant adds their contribution');
    console.log('3. The final participant applies the beacon');
    console.log('4. Verification key is generated');
    console.log('');

    const proceed = await this.confirmAction('Start multi-party ceremony setup?');
    if (!proceed) return;

    await this.setupCeremonyDirectory();

    try {
      // Setup initial ceremony
      this.log('Setting up initial ceremony...');
      
      const originalCwd = process.cwd();
      process.chdir(this.ceremonyDir);

      // Copy required files
      fs.copyFileSync(
        path.join('..', this.buildDir, `${this.circuitName}.r1cs`),
        `${this.circuitName}.r1cs`
      );
      fs.copyFileSync(
        path.join('..', this.buildDir, 'powersOfTau28_hez_final_14.ptau'),
        'powersOfTau28_hez_final_14.ptau'
      );

      // Initial setup
      await execAsync(`snarkjs groth16 setup ${this.circuitName}.r1cs powersOfTau28_hez_final_14.ptau ${this.circuitName}_0000.zkey`);

      // Create ceremony info file
      const ceremonyInfo = {
        circuitName: this.circuitName,
        totalParticipants: numParticipants,
        currentPhase: 0,
        participants: [],
        created: new Date().toISOString(),
        status: 'initialized'
      };

      fs.writeFileSync('ceremony_info.json', JSON.stringify(ceremonyInfo, null, 2));

      process.chdir(originalCwd);

      this.success('Multi-party ceremony initialized');
      console.log('');
      this.highlight('NEXT STEPS:');
      console.log(`1. Share the ceremony directory with participants`);
      console.log(`2. Each participant should run: node setup-trusted-setup.js --contribute`);
      console.log(`3. The final participant should run: node setup-trusted-setup.js --finalize`);
      console.log(`4. Verify the ceremony: node setup-trusted-setup.js --verify`);
      
    } catch (error) {
      this.error('Multi-party setup failed');
      console.error(error.message);
    }
  }

  async contributeToMultiParty() {
    this.log('Contributing to multi-party ceremony...');
    
    if (!fs.existsSync(path.join(this.ceremonyDir, 'ceremony_info.json'))) {
      this.error('Ceremony not found. Please ensure you have the ceremony files.');
      return;
    }

    const ceremonyInfo = JSON.parse(fs.readFileSync(path.join(this.ceremonyDir, 'ceremony_info.json'), 'utf8'));
    const currentPhase = ceremonyInfo.currentPhase;
    const nextPhase = currentPhase + 1;

    const contributorName = await this.question('Enter your name for the contribution: ');
    const contributorEmail = await this.question('Enter your email (optional): ') || 'not provided';

    try {
      const originalCwd = process.cwd();
      process.chdir(this.ceremonyDir);

      this.log(`Adding contribution ${nextPhase}...`);
      
      // Add entropy source
      const entropy = `contribution_${contributorName}_${Date.now()}_${Math.random()}`;
      
      await execAsync(`echo "${entropy}" | snarkjs zkey contribute ${this.circuitName}_${String(currentPhase).padStart(4, '0')}.zkey ${this.circuitName}_${String(nextPhase).padStart(4, '0')}.zkey --name="${contributorName}"`);

      // Update ceremony info
      ceremonyInfo.currentPhase = nextPhase;
      ceremonyInfo.participants.push({
        name: contributorName,
        email: contributorEmail,
        phase: nextPhase,
        timestamp: new Date().toISOString()
      });

      fs.writeFileSync('ceremony_info.json', JSON.stringify(ceremonyInfo, null, 2));

      process.chdir(originalCwd);

      this.success(`Contribution ${nextPhase} added successfully`);
      console.log(`Contributor: ${contributorName}`);
      console.log(`Phase: ${nextPhase}/${ceremonyInfo.totalParticipants}`);
      
      if (nextPhase < ceremonyInfo.totalParticipants) {
        console.log('');
        this.log('Pass the ceremony files to the next participant');
      } else {
        console.log('');
        this.success('All contributions collected! Ready for finalization.');
      }

    } catch (error) {
      this.error('Contribution failed');
      console.error(error.message);
    }
  }

  async finalizeCeremony() {
    this.log('Finalizing multi-party ceremony...');
    
    const ceremonyInfo = JSON.parse(fs.readFileSync(path.join(this.ceremonyDir, 'ceremony_info.json'), 'utf8'));
    
    if (ceremonyInfo.currentPhase < ceremonyInfo.totalParticipants) {
      this.error(`Not all contributions collected. Current: ${ceremonyInfo.currentPhase}/${ceremonyInfo.totalParticipants}`);
      return;
    }

    try {
      const originalCwd = process.cwd();
      process.chdir(this.ceremonyDir);

      this.log('Applying random beacon...');
      
      // Use a random beacon (in production, use a trusted randomness source)
      const beacon = Array.from({length: 32}, () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('');
      
      await execAsync(`snarkjs zkey beacon ${this.circuitName}_${String(ceremonyInfo.currentPhase).padStart(4, '0')}.zkey ${this.circuitName}_final.zkey ${beacon} 10 -n="Final Random Beacon"`);

      // Generate verification key
      this.log('Generating verification key...');
      await execAsync(`snarkjs zkey export verificationkey ${this.circuitName}_final.zkey verification_key.json`);

      // Update ceremony info
      ceremonyInfo.status = 'finalized';
      ceremonyInfo.finalizedAt = new Date().toISOString();
      ceremonyInfo.beacon = beacon;

      fs.writeFileSync('ceremony_info.json', JSON.stringify(ceremonyInfo, null, 2));

      process.chdir(originalCwd);

      this.success('Ceremony finalized successfully!');
      
    } catch (error) {
      this.error('Ceremony finalization failed');
      console.error(error.message);
    }
  }

  async verifyCeremony() {
    this.log('Verifying ceremony...');
    
    if (!fs.existsSync(path.join(this.ceremonyDir, 'ceremony_info.json'))) {
      this.error('Ceremony info not found');
      return;
    }

    const ceremonyInfo = JSON.parse(fs.readFileSync(path.join(this.ceremonyDir, 'ceremony_info.json'), 'utf8'));

    try {
      const originalCwd = process.cwd();
      process.chdir(this.ceremonyDir);

      // Verify final zkey
      this.log('Verifying final zkey...');
      const { stdout } = await execAsync(`snarkjs zkey verify ${this.circuitName}.r1cs powersOfTau28_hez_final_14.ptau ${this.circuitName}_final.zkey`);
      
      console.log('Verification output:');
      console.log(stdout);

      // Generate ceremony report
      this.generateCeremonyReport(ceremonyInfo);

      process.chdir(originalCwd);

      this.success('Ceremony verification completed');
      
    } catch (error) {
      this.error('Ceremony verification failed');
      console.error(error.message);
    }
  }

  generateCeremonyReport(ceremonyInfo) {
    const report = `
TRUSTED SETUP CEREMONY REPORT
============================

Circuit: ${ceremonyInfo.circuitName}
Status: ${ceremonyInfo.status}
Created: ${ceremonyInfo.created}
${ceremonyInfo.finalizedAt ? `Finalized: ${ceremonyInfo.finalizedAt}` : ''}

Participants (${ceremonyInfo.participants.length}):
${ceremonyInfo.participants.map(p => `  ${p.phase}. ${p.name} (${p.email}) - ${p.timestamp}`).join('\n')}

${ceremonyInfo.beacon ? `Random Beacon: ${ceremonyInfo.beacon}` : ''}

Security Notes:
- This ceremony is only secure if at least one participant was honest
- All participants should destroy their intermediate files and random data
- The ceremony should be publicly auditable
- Verification key hash: [To be calculated]

Generated: ${new Date().toISOString()}
`;

    fs.writeFileSync(path.join(this.ceremonyDir, 'ceremony_report.txt'), report);
    console.log('');
    this.highlight('CEREMONY REPORT:');
    console.log(report);
  }

  async cleanup() {
    this.rl.close();
  }

  async run() {
    try {
      const args = process.argv.slice(2);

      if (args.includes('--contribute')) {
        await this.contributeToMultiParty();
        return;
      }

      if (args.includes('--finalize')) {
        await this.finalizeCeremony();
        return;
      }

      if (args.includes('--verify')) {
        await this.verifyCeremony();
        return;
      }

      if (args.includes('--help')) {
        console.log('Trusted Setup Ceremony Manager');
        console.log('');
        console.log('Usage: node setup-trusted-setup.js [OPTIONS]');
        console.log('');
        console.log('Options:');
        console.log('  --contribute    Contribute to an existing multi-party ceremony');
        console.log('  --finalize      Finalize a multi-party ceremony');
        console.log('  --verify        Verify an existing ceremony');
        console.log('  --help          Show this help');
        console.log('');
        console.log('Interactive mode (no options):');
        console.log('  Guides you through ceremony setup');
        return;
      }

      // Interactive mode
      await this.displayIntroduction();
      await this.checkPrerequisites();
      
      const ceremonyType = await this.selectCeremonyType();
      
      switch (ceremonyType) {
        case 'dev':
          await this.developmentSetup();
          break;
        case 'multi-party':
          await this.multiPartySetup();
          break;
        case 'verify':
          await this.verifyCeremony();
          break;
      }

    } catch (error) {
      this.error('Setup failed');
      console.error(error);
    } finally {
      await this.cleanup();
    }
  }
}

// Run the script
if (require.main === module) {
  const setupManager = new TrustedSetupManager();
  setupManager.run();
}

module.exports = TrustedSetupManager;