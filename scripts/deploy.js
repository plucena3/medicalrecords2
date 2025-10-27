#!/usr/bin/env node
/**
 * COTI Deployment Script for EncryptedMedicalRecords
 * Deploys the EncryptedMedicalRecords smart contract to COTI Testnet
 * Network: COTI Testnet
 * RPC: https://testnet.coti.io/rpc
 * Chain ID: 7082400
 * Explorer: https://testnet.cotiscan.io
 */

const { ethers } = require('hardhat');
const cotiEthers = require('@coti-io/coti-ethers');
require('dotenv').config();

// COTI Testnet Configuration
const COTI_TESTNET_RPC = process.env.COTI_TESTNET_RPC || 'https://testnet.coti.io/rpc';
const CHAIN_ID = 7082400;
const EXPLORER_URL = 'https://testnet.cotiscan.io';

// Deployment account (Admin)
const ADMIN_PK = process.env.ADMIN_PK;
const ADMIN_AES_KEY = process.env.ADMIN_AES_KEY;

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║     🏥 ENCRYPTED MEDICAL RECORDS DEPLOYMENT SCRIPT 🏥         ║');
  console.log('║              Deploying to COTI Testnet                        ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');

  // Validate environment variables
  if (!ADMIN_PK) {
    console.error('\n❌ Error: ADMIN_PK not found in environment variables');
    console.error('   Please ensure your .env file contains ADMIN_PK');
    process.exit(1);
  }

  console.log(`\n📍 Network Configuration:`);
  console.log(`   Network: COTI Testnet`);
  console.log(`   RPC URL: ${COTI_TESTNET_RPC}`);
  console.log(`   Chain ID: ${CHAIN_ID}`);
  console.log(`   Explorer: ${EXPLORER_URL}`);

  try {
    // Setup provider and wallet
    console.log('\n⚙️  Setting up COTI provider and wallet...');
    const provider = new ethers.JsonRpcProvider(COTI_TESTNET_RPC, {
      chainId: CHAIN_ID,
      name: 'coti-testnet',
    });

    // Create COTI wallet from admin private key
    const deployer = new cotiEthers.Wallet(ADMIN_PK, provider);
    const deployerAddress = deployer.address;

    console.log(`   ✅ Deployer address: ${deployerAddress}`);

    // Check deployer balance
    const balance = await provider.getBalance(deployerAddress);
    const balanceInEth = ethers.formatEther(balance);
    console.log(`   💰 Deployer balance: ${balanceInEth} COTI`);

    if (balance === 0n) {
      console.error('\n❌ Error: Deployer account has insufficient balance');
      console.error(`   Please fund ${deployerAddress} with COTI tokens`);
      console.error(`   Get testnet tokens from COTI faucet`);
      process.exit(1);
    }

    // Ensure wallet is onboarded with AES key
    if (ADMIN_AES_KEY) {
      console.log('\n🔐 Setting AES key for encryption...');
      deployer.setAesKey(ADMIN_AES_KEY);
      console.log('   ✅ AES key configured');
    } else {
      console.log('\n⚠️  Warning: ADMIN_AES_KEY not found');
      console.log('   Attempting to generate/recover AES key...');
      try {
        await deployer.generateOrRecoverAes();
        const userOnboardInfo = deployer.getUserOnboardInfo();
        if (userOnboardInfo && userOnboardInfo.aesKey) {
          console.log(`   ✅ AES Key generated: ${userOnboardInfo.aesKey}`);
          console.log('   💡 Consider adding this to your .env file as ADMIN_AES_KEY');
        }
      } catch (error) {
        console.error('   ⚠️  Could not generate AES key:', error.message);
        console.log('   Continuing without AES key...');
      }
    }

    // Get contract factory
    console.log('\n📦 Preparing contract deployment...');
    const EncryptedMedicalRecords = await ethers.getContractFactory(
      'EncryptedMedicalRecords',
      deployer
    );

    console.log('   ✅ Contract factory created');
    console.log('   📝 Contract: EncryptedMedicalRecords');

    // Deploy contract
    console.log('\n🚀 Deploying contract...');
    console.log('   ⏳ Please wait, this may take a few moments...');

    const contract = await EncryptedMedicalRecords.deploy();
    
    console.log('   ⏳ Waiting for deployment confirmation...');
    await contract.waitForDeployment();

    const contractAddress = await contract.getAddress();

    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                  ✅ DEPLOYMENT SUCCESSFUL! ✅                  ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');

    console.log('\n📋 Deployment Details:');
    console.log(`   📍 Contract Address: ${contractAddress}`);
    console.log(`   👤 Deployer: ${deployerAddress}`);
    console.log(`   🔗 Explorer: ${EXPLORER_URL}/address/${contractAddress}`);
    
    // Get deployment transaction
    const deployTx = contract.deploymentTransaction();
    if (deployTx) {
      console.log(`   📝 Transaction Hash: ${deployTx.hash}`);
      console.log(`   🔗 Transaction: ${EXPLORER_URL}/tx/${deployTx.hash}`);
      
      // Get gas details if available
      if (deployTx.gasLimit) {
        console.log(`   ⛽ Gas Limit: ${deployTx.gasLimit.toString()}`);
      }
      if (deployTx.gasPrice) {
        console.log(`   ⛽ Gas Price: ${ethers.formatUnits(deployTx.gasPrice, 'gwei')} Gwei`);
      }
    }

    // Verify contract roles
    console.log('\n🔐 Verifying contract setup...');
    const DEFAULT_ADMIN_ROLE = await contract.DEFAULT_ADMIN_ROLE();
    const ADMIN_ROLE = await contract.ADMIN_ROLE();
    const DOCTOR_ROLE = await contract.DOCTOR_ROLE();

    const hasDefaultAdminRole = await contract.hasRole(DEFAULT_ADMIN_ROLE, deployerAddress);
    const hasAdminRole = await contract.hasRole(ADMIN_ROLE, deployerAddress);

    console.log(`   ✅ DEFAULT_ADMIN_ROLE granted to deployer: ${hasDefaultAdminRole}`);
    console.log(`   ✅ ADMIN_ROLE granted to deployer: ${hasAdminRole}`);
    console.log(`   📋 DOCTOR_ROLE: ${DOCTOR_ROLE}`);

    // Save deployment info to .env
    console.log('\n💾 Updating .env file...');
    const fs = require('fs');
    const path = require('path');
    const envPath = path.join(__dirname, '..', '.env');
    
    try {
      let envContent = fs.readFileSync(envPath, 'utf8');
      const deploymentInfoRegex = /^DEPLOYED_CONTRACT_ADDRESS=.*$/m;
      
      if (envContent.match(deploymentInfoRegex)) {
        envContent = envContent.replace(deploymentInfoRegex, `DEPLOYED_CONTRACT_ADDRESS=${contractAddress}`);
      } else {
        envContent += `\n\n# Deployed Contract Address\nDEPLOYED_CONTRACT_ADDRESS=${contractAddress}\n`;
      }
      
      fs.writeFileSync(envPath, envContent, 'utf8');
      console.log('   ✅ Contract address saved to .env file');
    } catch (error) {
      console.log('   ⚠️  Could not update .env file:', error.message);
      console.log('   💡 Please manually add: DEPLOYED_CONTRACT_ADDRESS=' + contractAddress);
    }

    // Next steps
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                      📝 NEXT STEPS 📝                         ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log('\n1️⃣  Register doctors using the registerDoctor function');
    console.log('2️⃣  Configure patient and doctor accounts');
    console.log('3️⃣  Test the contract with sample medical records');
    console.log('4️⃣  Verify the contract on COTIScan (optional)');
    
    console.log('\n💡 Quick command to register a doctor:');
    console.log(`   npx hardhat run scripts/register-doctor.js --network coti-testnet`);
    
    console.log('\n🎉 Deployment complete!\n');

    return {
      contractAddress,
      deployerAddress,
      transactionHash: deployTx?.hash,
    };

  } catch (error) {
    console.error('\n❌ Deployment failed:');
    console.error('   Error:', error.message);
    
    if (error.message.includes('insufficient funds')) {
      console.error('\n💡 Solution: Fund your deployer account with COTI testnet tokens');
      console.error(`   Address: ${ADMIN_PK ? new cotiEthers.Wallet(ADMIN_PK).address : 'N/A'}`);
    } else if (error.message.includes('nonce')) {
      console.error('\n💡 Solution: Try resetting your account nonce or wait a moment');
    } else if (error.message.includes('network')) {
      console.error('\n💡 Solution: Check your internet connection and RPC URL');
    }
    
    console.error('\n📚 For more help, visit: https://docs.coti.io\n');
    process.exit(1);
  }
}

// Execute deployment
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = main;
