#!/usr/bin/env node
/**
 * Register Doctor Script
 * Registers doctors in the EncryptedMedicalRecords contract
 * Must be run by an account with ADMIN_ROLE
 */

const { ethers } = require('hardhat');
const cotiEthers = require('@coti-io/coti-ethers');
require('dotenv').config();

// Configuration
const COTI_TESTNET_RPC = process.env.COTI_TESTNET_RPC || 'https://testnet.coti.io/rpc';
const CHAIN_ID = 7082400;
const CONTRACT_ADDRESS = process.env.DEPLOYED_CONTRACT_ADDRESS;
const ADMIN_PK = process.env.ADMIN_PK;
const ADMIN_AES_KEY = process.env.ADMIN_AES_KEY;

// Doctors to register (from .env)
const DOCTORS = [
  {
    address: process.env.Doctor,
    name: 'Dr. Sarah Johnson',
    specialty: 'Cardiology',
  },
  {
    address: process.env.Doctor2,
    name: 'Dr. Michael Chen',
    specialty: 'Neurology',
  },
];

async function registerDoctor(contract, doctorAddress, name, specialty) {
  console.log(`\n👨‍⚕️ Registering Doctor: ${name}`);
  console.log(`   Address: ${doctorAddress}`);
  console.log(`   Specialty: ${specialty}`);

  try {
    // Check if doctor is already registered
    const doctorInfo = await contract.getDoctorInfo(doctorAddress);
    if (doctorInfo.isVerified) {
      console.log(`   ⚠️  Doctor already registered`);
      console.log(`   ✅ Name: ${doctorInfo.name}`);
      console.log(`   ✅ Specialty: ${doctorInfo.specialty}`);
      return { success: true, alreadyRegistered: true };
    }

    // Register the doctor
    console.log(`   ⏳ Sending transaction...`);
    const tx = await contract.registerDoctor(doctorAddress, name, specialty);
    
    console.log(`   📝 Transaction hash: ${tx.hash}`);
    console.log(`   ⏳ Waiting for confirmation...`);
    
    const receipt = await tx.wait();
    
    console.log(`   ✅ Doctor registered successfully!`);
    console.log(`   ⛽ Gas used: ${receipt.gasUsed.toString()}`);
    
    // Verify registration
    const verifiedInfo = await contract.getDoctorInfo(doctorAddress);
    console.log(`   ✅ Verification: ${verifiedInfo.isVerified ? 'VERIFIED' : 'NOT VERIFIED'}`);

    return { success: true, transactionHash: tx.hash };
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('\n╔═══════════════════════════════════════════════════════════════╗');
  console.log('║            👨‍⚕️ DOCTOR REGISTRATION SCRIPT 👨‍⚕️                ║');
  console.log('╚═══════════════════════════════════════════════════════════════╝');

  // Validate environment
  if (!CONTRACT_ADDRESS) {
    console.error('\n❌ Error: DEPLOYED_CONTRACT_ADDRESS not found in .env');
    console.error('   Please deploy the contract first or add the address to .env');
    process.exit(1);
  }

  if (!ADMIN_PK) {
    console.error('\n❌ Error: ADMIN_PK not found in .env');
    process.exit(1);
  }

  console.log(`\n📍 Configuration:`);
  console.log(`   Contract: ${CONTRACT_ADDRESS}`);
  console.log(`   Network: COTI Testnet`);
  console.log(`   RPC: ${COTI_TESTNET_RPC}`);

  try {
    // Setup provider and wallet
    const provider = new ethers.JsonRpcProvider(COTI_TESTNET_RPC, {
      chainId: CHAIN_ID,
      name: 'coti-testnet',
    });

    const adminWallet = new cotiEthers.Wallet(ADMIN_PK, provider);
    
    if (ADMIN_AES_KEY) {
      adminWallet.setAesKey(ADMIN_AES_KEY);
    }

    console.log(`   👤 Admin: ${adminWallet.address}`);

    // Get contract instance
    const contract = await ethers.getContractAt(
      'EncryptedMedicalRecords',
      CONTRACT_ADDRESS,
      adminWallet
    );

    console.log(`   ✅ Contract loaded`);

    // Verify admin has permission
    const ADMIN_ROLE = await contract.ADMIN_ROLE();
    const hasAdminRole = await contract.hasRole(ADMIN_ROLE, adminWallet.address);

    if (!hasAdminRole) {
      console.error('\n❌ Error: Connected account does not have ADMIN_ROLE');
      console.error('   Only admins can register doctors');
      process.exit(1);
    }

    console.log(`   ✅ Admin role verified`);

    // Register doctors
    console.log('\n📋 Registering Doctors:');
    console.log('─'.repeat(60));

    const results = [];

    for (const doctor of DOCTORS) {
      if (!doctor.address) {
        console.log(`\n⏭️  Skipping ${doctor.name} (address not found in .env)`);
        continue;
      }

      const result = await registerDoctor(
        contract,
        doctor.address,
        doctor.name,
        doctor.specialty
      );

      results.push({
        name: doctor.name,
        address: doctor.address,
        ...result,
      });

      // Small delay between transactions
      if (result.success && !result.alreadyRegistered) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    // Summary
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                    📊 SUMMARY 📊                              ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    let successCount = 0;
    let alreadyRegisteredCount = 0;

    for (const result of results) {
      if (result.success) {
        if (result.alreadyRegisteredCount) {
          console.log(`ℹ️  ${result.name.padEnd(25)}: Already registered`);
          alreadyRegisteredCount++;
        } else {
          console.log(`✅ ${result.name.padEnd(25)}: Successfully registered`);
          successCount++;
        }
      } else {
        console.log(`❌ ${result.name.padEnd(25)}: Failed - ${result.error}`);
      }
    }

    console.log(`\n📈 New Registrations: ${successCount}/${results.length}`);
    console.log(`📋 Already Registered: ${alreadyRegisteredCount}`);

    if (successCount > 0) {
      console.log('\n🎉 Doctor registration complete!');
      console.log('👨‍⚕️ Doctors can now add medical records for patients\n');
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
}

// Execute
if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = main;
