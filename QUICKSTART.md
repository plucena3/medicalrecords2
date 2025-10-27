# Quick Start Guide - Deploy to COTI Testnet

## 🚀 Quick Deployment (3 Steps)

### Step 1: Setup Environment
Ensure your `.env` file has:
```bash
COTI_TESTNET_RPC=https://testnet.coti.io/rpc
ADMIN_PK=your_private_key_without_0x
ADMIN_AES_KEY=your_aes_key  # Optional, will be generated if missing
```

### Step 2: Deploy Contract
```bash
npx hardhat run scripts/deploy.js --network coti-testnet
```

### Step 3: Register Doctors
```bash
npx hardhat run scripts/register-doctor.js --network coti-testnet
```

## 📦 Installation

If packages not installed yet:
```bash
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox
npm install ethers @coti-io/coti-ethers @coti-io/coti-contracts
npm install @openzeppelin/contracts dotenv
```

## 🔑 Get Testnet Tokens

Fund your admin account at COTI faucet (check COTI docs for current faucet URL).

## 🧪 Test Deployment

After deployment, test with:
```bash
node scripts/test.js
```

## 📚 Network Info

| Property | Value |
|----------|-------|
| Network | COTI Testnet |
| RPC | https://testnet.coti.io/rpc |
| Chain ID | 7082400 |
| Explorer | https://testnet.cotiscan.io |

## 🆘 Common Issues

### "Insufficient funds"
➡️ Fund your account with testnet COTI tokens

### "ADMIN_PK not found"
➡️ Add your private key to `.env` file

### "Contract not deployed"
➡️ Run deploy script first before register-doctor

## 📖 Full Documentation

See `DEPLOYMENT.md` for comprehensive guide.
