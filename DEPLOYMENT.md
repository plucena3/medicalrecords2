# EncryptedMedicalRecords Deployment Guide

This guide explains how to deploy the EncryptedMedicalRecords smart contract to COTI Testnet using Hardhat.

## Network Information

- **Network Name**: COTI Testnet
- **RPC URL**: https://testnet.coti.io/rpc
- **Chain ID**: 7082400
- **Explorer**: https://testnet.cotiscan.io
- **Currency**: COTI

## Prerequisites

1. **Node.js and npm** installed
2. **Hardhat** and dependencies installed:
   ```bash
   npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
   npm install ethers @coti-io/coti-ethers dotenv
   npm install @coti-io/coti-contracts @openzeppelin/contracts
   ```

3. **Environment Setup**: Ensure your `.env` file contains:
   ```bash
   COTI_TESTNET_RPC=https://testnet.coti.io/rpc
   ADMIN_PK=your_admin_private_key_here
   ADMIN_AES_KEY=your_admin_aes_key_here
   ```

4. **COTI Testnet Tokens**: Fund your admin account with COTI testnet tokens

## Deployment Steps

### Step 1: Onboard Accounts (Optional but Recommended)

If you haven't onboarded your accounts yet, run:

```bash
node scripts/onboard-accounts.js
```

This will generate AES keys needed for COTI's encryption features and save them to your `.env` file.

### Step 2: Deploy the Contract

Run the deployment script using Hardhat:

```bash
npx hardhat run scripts/deploy.js --network coti-testnet
```

Or directly with node:

```bash
node scripts/deploy.js
```

### Step 3: Verify Deployment

The deployment script will:
- ✅ Display the deployed contract address
- ✅ Verify that the deployer has admin roles
- ✅ Save the contract address to your `.env` file
- ✅ Show explorer links for easy verification

Example output:
```
╔═══════════════════════════════════════════════════════════════╗
║                  ✅ DEPLOYMENT SUCCESSFUL! ✅                  ║
╚═══════════════════════════════════════════════════════════════╝

📋 Deployment Details:
   📍 Contract Address: 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
   👤 Deployer: 0xe45FC1a7D84e73C8c71EdF2814E7467F7C86a8A2
   🔗 Explorer: https://testnet.cotiscan.io/address/0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb
```

## Post-Deployment Tasks

### 1. Register Doctors

After deployment, you need to register doctors who can add medical records:

```javascript
// Example code to register a doctor
const contract = await ethers.getContractAt(
  'EncryptedMedicalRecords',
  process.env.DEPLOYED_CONTRACT_ADDRESS
);

await contract.registerDoctor(
  doctorAddress,
  'Dr. John Smith',
  'Cardiology'
);
```

### 2. Configure Access Control

The deployer automatically receives:
- `DEFAULT_ADMIN_ROLE`: Can grant/revoke all roles
- `ADMIN_ROLE`: Can register doctors

### 3. Test the Contract

Run integration tests to verify contract functionality:

```bash
node scripts/test.js
```

## Hardhat Configuration

The `hardhat.config.js` includes:

- **Solidity Version**: 0.8.19
- **Optimizer**: Enabled (200 runs)
- **Network Configuration**: COTI Testnet pre-configured
- **Etherscan Verification**: COTIScan API configuration

## Troubleshooting

### Insufficient Funds Error
```
❌ Error: Deployer account has insufficient balance
```
**Solution**: Fund your deployer address with COTI testnet tokens from the faucet.

### AES Key Not Found
```
⚠️ Warning: ADMIN_AES_KEY not found
```
**Solution**: Run `node scripts/onboard-accounts.js` to generate AES keys.

### Network Connection Issues
```
❌ Error: could not detect network
```
**Solution**: Verify RPC URL and internet connection. Try:
```bash
curl -X POST https://testnet.coti.io/rpc \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}'
```

### Contract Verification

To verify your contract on COTIScan:

```bash
npx hardhat verify --network coti-testnet <CONTRACT_ADDRESS>
```

## Additional Resources

- [COTI Documentation](https://docs.coti.io)
- [COTI Testnet Faucet](https://faucet.coti.io)
- [COTIScan Explorer](https://testnet.cotiscan.io)
- [Hardhat Documentation](https://hardhat.org/docs)

## Security Notes

⚠️ **Important Security Reminders**:
- Never commit private keys to version control
- Keep your `.env` file secure and in `.gitignore`
- Use different keys for testnet and mainnet
- Regularly backup your AES keys
- Verify contract addresses before interacting

## Contract Features

The deployed contract supports:
- 🏥 Encrypted medical record storage
- 👨‍⚕️ Doctor registration and verification
- 🔐 Patient-controlled access authorization
- 📊 Privacy-preserving data sharing
- ⚡ Gas-optimized operations
- 🛡️ Reentrancy protection

## Support

For issues or questions:
1. Check the [COTI Documentation](https://docs.coti.io)
2. Review the contract code and comments
3. Contact COTI support channels
