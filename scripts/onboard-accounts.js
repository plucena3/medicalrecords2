#!/usr/bin/env node
/**
 * COTI Account Onboarding Script
 * Onboards all private keys from .env with AES encryption keys
 * Based on: https://docs.coti.io/coti-documentation/build-on-coti/guides/account-onboard
 */

const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');
const cotiEthers = require('@coti-io/coti-ethers');
require('dotenv').config();

const COTI_TESTNET_RPC = process.env.COTI_TESTNET_RPC || 'https://testnet.coti.io/rpc';
const CHAIN_ID = 7082400;
const ENV_PATH = path.join(__dirname, '..', '.env');

// Extract all PK entries from .env
const PK_ENTRIES = [
  { key: 'ADMIN_PK', aesKey: 'ADMIN_AES_KEY', name: 'Admin' },
  { key: 'DOCTOR_PK', aesKey: 'DOCTOR_AES_KEY', name: 'Doctor' },
  { key: 'DOCTOR2_PK', aesKey: 'DOCTOR2_AES_KEY', name: 'Doctor 2' },
  { key: 'PATIENT_PK', aesKey: 'PATIENT_AES_KEY', name: 'Patient' },
];

async function onboardAccount(privateKey, accountName) {
  console.log(`\n📋 Onboarding ${accountName}...`);
  console.log('─'.repeat(60));

  try {
    const provider = new ethers.JsonRpcProvider(COTI_TESTNET_RPC, {
      chainId: CHAIN_ID,
      name: 'coti-testnet',
    });

    // Create COTI wallet (will auto-onboard if needed)
    const cotiWallet = new cotiEthers.Wallet(privateKey, provider);
    
    console.log(`   Address: ${cotiWallet.address}`);
    console.log(`   ⏳ Initializing onboarding...`);

    // Generate or recover AES key (this triggers onboarding if needed)
    await cotiWallet.generateOrRecoverAes();

    const userOnboardInfo = cotiWallet.getUserOnboardInfo();
    
    if (userOnboardInfo && userOnboardInfo.aesKey) {
      console.log(`   ✅ Onboarding completed successfully!`);
      console.log(`   🔑 AES Key: ${userOnboardInfo.aesKey}`);
      console.log(`   📝 Onboard TX Hash: ${userOnboardInfo.txHash || 'N/A'}`);
      
      return {
        success: true,
        aesKey: userOnboardInfo.aesKey,
        txHash: userOnboardInfo.txHash,
      };
    } else {
      console.log(`   ⚠️  Could not retrieve AES key`);
      return { success: false };
    }
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function updateEnvFile(updates) {
  try {
    let envContent = fs.readFileSync(ENV_PATH, 'utf8');

    // Update each key in the .env file
    for (const [key, value] of Object.entries(updates)) {
      // Match the pattern: KEY=... (allowing for empty values)
      const regex = new RegExp(`^${key}=.*$`, 'm');
      
      if (envContent.match(regex)) {
        envContent = envContent.replace(regex, `${key}=${value}`);
      } else {
        // Add new key if it doesn't exist
        envContent += `\n${key}=${value}`;
      }
    }

    fs.writeFileSync(ENV_PATH, envContent, 'utf8');
    console.log(`\n✅ Updated .env file with AES keys`);
  } catch (error) {
    console.error(`\n❌ Error updating .env: ${error.message}`);
  }
}

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║        🔐 COTI ACCOUNT ONBOARDING SCRIPT 🔐                   ║');
  console.log('║  Onboards all accounts and populates AES keys in .env         ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');

  console.log(`\n📍 Configuration:`);
  console.log(`   RPC: ${COTI_TESTNET_RPC}`);
  console.log(`   Chain ID: ${CHAIN_ID}`);
  console.log(`   Env File: ${ENV_PATH}`);

  const results = {};
  const updates = {};

  for (const entry of PK_ENTRIES) {
    const pk = process.env[entry.key];
    
    if (!pk) {
      console.log(`\n⏭️  Skipping ${entry.name} (${entry.key} not found in .env)`);
      continue;
    }

    const result = await onboardAccount(pk, entry.name);
    results[entry.name] = result;

    if (result.success && result.aesKey) {
      updates[entry.aesKey] = result.aesKey;
    }
  }

  // Update .env file with collected AES keys
  if (Object.keys(updates).length > 0) {
    await updateEnvFile(updates);
  }

  // Print summary
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║                    📊 SUMMARY 📊                              ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝\n');

  let successCount = 0;
  for (const [name, result] of Object.entries(results)) {
    if (result.success) {
      console.log(`✅ ${name.padEnd(20)}: Onboarded successfully`);
      successCount++;
    } else {
      console.log(`❌ ${name.padEnd(20)}: Failed - ${result.error || 'Unknown error'}`);
    }
  }

  console.log(`\n📈 Result: ${successCount}/${Object.keys(results).length} accounts onboarded`);
  
  if (successCount === Object.keys(results).length) {
    console.log('\n🎉 All accounts successfully onboarded!');
    console.log('💾 AES keys saved to .env file');
    console.log('🚀 Ready to use COTI encryption in your applications!\n');
  } else {
    console.log('\n⚠️  Some accounts failed onboarding. Check errors above.\n');
  }
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});
