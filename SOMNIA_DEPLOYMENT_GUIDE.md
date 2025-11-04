# 🚀 AION Vault - Somnia AI Hackathon Deployment Guide

## 📋 Pre-requisites

### 1. Your Wallet Address
```
0xdafee25f98ff62504c1086eacbb406190f3110d5
```

### 2. Somnia Testnet Information
- **Network Name**: Somnia Dream Testnet
- **RPC URL**: `https://dream-rpc.somnia.network`
- **Chain ID**: `50311`
- **Currency Symbol**: `STT` (Somnia Test Token)
- **Block Explorer**: `https://somnia-devnet.socialscan.io`
- **Alternative Explorer**: `https://explorer-devnet.somnia.network`

### 3. Get Test Tokens
Visit the Somnia Faucet to get test tokens:
- **Faucet URL**: `https://faucet.somnia.network`
- Request test STT tokens for deployment

---

## 🔧 Step 1: Setup Environment

### Create `.env` file in contracts folder:
```bash
cd contracts
cat > .env << 'EOF'
# Your Private Key (DO NOT COMMIT THIS!)
PRIVATE_KEY=YOUR_PRIVATE_KEY_HERE

# Somnia Testnet RPC
SOMNIA_RPC_URL=https://dream-rpc.somnia.network

# Somnia Block Explorer API (if available)
SOMNIA_API_KEY=YOUR_API_KEY_OR_LEAVE_EMPTY

# Deployment Configuration
MIN_DEPOSIT=1000000000000000
MIN_YIELD_CLAIM=100000000000000
EOF
```

⚠️ **IMPORTANT**: Replace `YOUR_PRIVATE_KEY_HERE` with your actual private key!

---

## 🚀 Step 2: Deploy Contracts to Somnia

### Run Deployment Script:
```bash
cd contracts

# Make sure you have foundry installed
forge --version

# Deploy to Somnia Testnet
forge script script/DeploySomniaAgent.s.sol:DeploySomniaAgent \
  --rpc-url https://dream-rpc.somnia.network \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --verify \
  -vvvv
```

### Expected Output:
```
===========================================
AION Vault Somnia AI Deployment
===========================================
Deployer: 0xdafee25f98ff62504c1086eacbb406190f3110d5
Chain ID: 50311

1. Deploying AION Vault...
   Vault deployed at: 0x...

2. Deploying Somnia AI Mock...
   Somnia AI Mock deployed at: 0x...

3. Deploying Somnia Agent...
   Somnia Agent deployed at: 0x...

===========================================
DEPLOYMENT SUMMARY
===========================================
```

---

## ✅ Step 3: Verify Contracts on Block Explorer

### Option 1: Automatic Verification (Best)

If Foundry verification is supported:
```bash
# Verify AION Vault
forge verify-contract \
  --chain-id 50311 \
  --rpc-url https://dream-rpc.somnia.network \
  --watch \
  YOUR_VAULT_ADDRESS \
  src/AIONVault.sol:AIONVault \
  --constructor-args $(cast abi-encode "constructor(uint256,uint256)" 1000000000000000 100000000000000)

# Verify Somnia AI Mock
forge verify-contract \
  --chain-id 50311 \
  --rpc-url https://dream-rpc.somnia.network \
  --watch \
  YOUR_SOMNIA_AI_ADDRESS \
  src/mocks/SomniaAIMock.sol:SomniaAIMock

# Verify Somnia Agent
forge verify-contract \
  --chain-id 50311 \
  --rpc-url https://dream-rpc.somnia.network \
  --watch \
  YOUR_AGENT_ADDRESS \
  src/SomniaAgent.sol:SomniaAgent \
  --constructor-args $(cast abi-encode "constructor(address,address)" YOUR_VAULT_ADDRESS YOUR_SOMNIA_AI_ADDRESS)
```

### Option 2: Manual Verification via Block Explorer

Visit: **https://somnia-devnet.socialscan.io**

For each contract:
1. Go to your contract address
2. Click "Verify & Publish"
3. Fill in:
   - **Compiler Type**: Solidity (Single file) or (Standard-Json-Input)
   - **Compiler Version**: v0.8.30
   - **License**: MIT
4. Paste flattened source code
5. Add constructor arguments (if needed)

### Get Flattened Source Code:
```bash
# Flatten AION Vault
forge flatten src/AIONVault.sol > AIONVault_flat.sol

# Flatten Somnia Agent
forge flatten src/SomniaAgent.sol > SomniaAgent_flat.sol

# Flatten Somnia AI Mock
forge flatten src/mocks/SomniaAIMock.sol > SomniaAIMock_flat.sol
```

---

## 🔗 Important Links

### 📍 Somnia Testnet Resources
- **Faucet**: https://faucet.somnia.network
- **Block Explorer**: https://somnia-devnet.socialscan.io
- **Alternative Explorer**: https://explorer-devnet.somnia.network
- **RPC Endpoint**: https://dream-rpc.somnia.network
- **Chain ID**: 50311

### 📚 Documentation
- **Somnia Docs**: https://docs.somnia.network
- **Hackathon Guide**: https://dorahacks.io/hackathon/somnia-ai
- **Somnia AI SDK**: https://github.com/somnia-network/ai-sdk

### 🛠️ Development Tools
- **Foundry Book**: https://book.getfoundry.sh
- **Remix IDE**: https://remix.ethereum.org
- **Hardhat**: https://hardhat.org

---

## 📝 Constructor Arguments Reference

### AION Vault Constructor:
```solidity
constructor(uint256 _minDeposit, uint256 _minYieldClaim)
```
- `_minDeposit`: `1000000000000000` (0.001 STT)
- `_minYieldClaim`: `100000000000000` (0.0001 STT)

**ABI Encoded**:
```
0x00000000000000000000000000000000000000000000000000038d7ea4c68000
0x00000000000000000000000000000000000000000000000000005af3107a4000
```

### Somnia Agent Constructor:
```solidity
constructor(address _vault, address _somniaAI)
```
- `_vault`: Your deployed vault address
- `_somniaAI`: Your deployed Somnia AI Mock address

---

## 🧪 Step 4: Test Deployment

### Test via Cast (Command Line):
```bash
# Check vault owner
cast call YOUR_VAULT_ADDRESS "owner()" --rpc-url https://dream-rpc.somnia.network

# Check AI Agent
cast call YOUR_VAULT_ADDRESS "aiAgent()" --rpc-url https://dream-rpc.somnia.network

# Check Somnia Agent config
cast call YOUR_AGENT_ADDRESS "getAgentConfig()" --rpc-url https://dream-rpc.somnia.network

# Check min deposit
cast call YOUR_VAULT_ADDRESS "minDeposit()" --rpc-url https://dream-rpc.somnia.network
```

### Test Deposit:
```bash
# Deposit 0.01 STT to vault
cast send YOUR_VAULT_ADDRESS \
  "deposit()" \
  --value 0.01ether \
  --private-key $PRIVATE_KEY \
  --rpc-url https://dream-rpc.somnia.network

# Check your balance
cast call YOUR_VAULT_ADDRESS \
  "balanceOf(address)" \
  0xdafee25f98ff62504c1086eacbb406190f3110d5 \
  --rpc-url https://dream-rpc.somnia.network
```

---

## 🎯 Quick Deploy Commands (All-in-One)

```bash
#!/bin/bash

# Set your private key
export PRIVATE_KEY="YOUR_PRIVATE_KEY"

# Navigate to contracts directory
cd contracts

# Deploy everything
forge script script/DeploySomniaAgent.s.sol:DeploySomniaAgent \
  --rpc-url https://dream-rpc.somnia.network \
  --private-key $PRIVATE_KEY \
  --broadcast \
  -vvvv

# Save the deployment addresses that appear in the output!

echo "✅ Deployment Complete!"
echo "📋 Next Steps:"
echo "1. Copy contract addresses from output"
echo "2. Verify on https://somnia-devnet.socialscan.io"
echo "3. Test deposits and AI recommendations"
```

---

## 🐛 Troubleshooting

### Issue: "Insufficient funds for gas"
**Solution**: Get more test tokens from faucet: https://faucet.somnia.network

### Issue: "Invalid nonce"
**Solution**: Reset your nonce or wait for pending transactions to complete

### Issue: "Contract verification failed"
**Solution**: 
1. Use flattened source code
2. Match exact compiler version (0.8.30)
3. Enable optimizer with 200 runs
4. Use correct constructor arguments

### Issue: "RPC connection failed"
**Solution**: 
- Try alternative RPC: https://dream-rpc.somnia.network
- Check your internet connection
- Verify chain ID is 50311

---

## 📊 Deployment Checklist

- [ ] Get test tokens from faucet
- [ ] Set up .env file with private key
- [ ] Run deployment script
- [ ] Save all contract addresses
- [ ] Verify AIONVault contract
- [ ] Verify SomniaAgent contract
- [ ] Verify SomniaAIMock contract
- [ ] Test deposit function
- [ ] Register strategies in agent
- [ ] Test AI recommendations
- [ ] Document deployment in README
- [ ] Create demo video
- [ ] Submit to hackathon

---

## 🎉 Success Criteria

Your deployment is successful when:
1. ✅ All 3 contracts are deployed
2. ✅ All contracts are verified on block explorer
3. ✅ You can deposit to vault
4. ✅ AI Agent can get recommendations
5. ✅ Frontend can interact with contracts

---

## 📞 Support

If you need help:
- **Somnia Discord**: https://discord.gg/somnia
- **Hackathon Support**: Check DoraHacks platform
- **GitHub Issues**: Open an issue in your repo

---

**Good Luck! 🚀**

Made with ❤️ by AION Team for Somnia AI Hackathon

