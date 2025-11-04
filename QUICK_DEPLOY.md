# ⚡ Quick Deploy to Somnia - Command Cheat Sheet

## 🎯 Your Info
```
Wallet: 0xdafee25f98ff62504c1086eacbb406190f3110d5
Network: Somnia Dream Testnet
Chain ID: 50311
```

---

## 🚀 Step 1: Get Test Tokens
👉 **Go to**: https://faucet.somnia.network
- Connect wallet: `0xdafee25f98ff62504c1086eacbb406190f3110d5`
- Request test STT tokens

---

## 💻 Step 2: Deploy Contracts

### Option A: Automated (Recommended)
```bash
cd contracts
./deploy_to_somnia.sh
```

### Option B: Manual
```bash
cd contracts

# Set your private key
export PRIVATE_KEY="your_private_key_here"

# Deploy
forge script script/DeploySomniaAgent.s.sol:DeploySomniaAgent \
  --rpc-url https://dream-rpc.somnia.network \
  --private-key $PRIVATE_KEY \
  --broadcast \
  --legacy \
  -vvvv
```

---

## ✅ Step 3: Verify Contracts

### Get contract addresses from deployment output, then:

```bash
# Flatten contracts
forge flatten src/AIONVault.sol > AIONVault_flat.sol
forge flatten src/SomniaAgent.sol > SomniaAgent_flat.sol
forge flatten src/mocks/SomniaAIMock.sol > SomniaAIMock_flat.sol
```

### Go to Block Explorer:
👉 **https://somnia-devnet.socialscan.io**

For each contract:
1. Search for contract address
2. Click "Contract" tab
3. Click "Verify & Publish"
4. Fill in:
   - Compiler: v0.8.30
   - Optimization: Yes (200 runs)
   - License: MIT
5. Paste flattened code
6. Add constructor args (if needed)

---

## 🔍 Constructor Arguments

### AION Vault
```
Min Deposit: 1000000000000000 (0.001 STT)
Min Yield: 100000000000000 (0.0001 STT)

ABI Encoded:
0x00000000000000000000000000000000000000000000000000038d7ea4c68000
0x00000000000000000000000000000000000000000000000000005af3107a4000
```

### Somnia Agent
```
Constructor(address vault, address somniaAI)
Use: YOUR_VAULT_ADDRESS + YOUR_SOMNIA_AI_ADDRESS
```

---

## 🧪 Step 4: Test Deployment

```bash
# Check vault owner
cast call YOUR_VAULT_ADDRESS "owner()" \
  --rpc-url https://dream-rpc.somnia.network

# Deposit test
cast send YOUR_VAULT_ADDRESS "deposit()" \
  --value 0.01ether \
  --private-key $PRIVATE_KEY \
  --rpc-url https://dream-rpc.somnia.network

# Check balance
cast call YOUR_VAULT_ADDRESS "balanceOf(address)" \
  0xdafee25f98ff62504c1086eacbb406190f3110d5 \
  --rpc-url https://dream-rpc.somnia.network
```

---

## 📝 Step 5: Update README

After deployment, update these in README.md:

```markdown
### Contract Addresses

| Contract | Address | Verification |
|----------|---------|--------------|
| **AION Vault** | `YOUR_VAULT_ADDRESS` | [Verify ↗](https://somnia-devnet.socialscan.io/address/YOUR_VAULT_ADDRESS) |
| **Somnia AI Agent** | `YOUR_AGENT_ADDRESS` | [Verify ↗](https://somnia-devnet.socialscan.io/address/YOUR_AGENT_ADDRESS) |
| **Somnia AI Mock** | `YOUR_AI_MOCK_ADDRESS` | [Verify ↗](https://somnia-devnet.socialscan.io/address/YOUR_AI_MOCK_ADDRESS) |
```

---

## 🔗 All Important Links

### Network
- **RPC**: https://dream-rpc.somnia.network
- **Explorer**: https://somnia-devnet.socialscan.io
- **Faucet**: https://faucet.somnia.network
- **Chain ID**: 50311

### Verification
- **Block Explorer**: https://somnia-devnet.socialscan.io
- Search → Contract → Verify & Publish

### Documentation
- **Somnia Docs**: https://docs.somnia.network
- **Deployment Guide**: [SOMNIA_DEPLOYMENT_GUIDE.md](./SOMNIA_DEPLOYMENT_GUIDE.md)
- **All Links**: [SOMNIA_LINKS.md](./SOMNIA_LINKS.md)

---

## 🎬 After Deployment Checklist

- [ ] ✅ Deployed AION Vault
- [ ] ✅ Deployed Somnia Agent
- [ ] ✅ Deployed Somnia AI Mock
- [ ] ✅ Verified all contracts
- [ ] ✅ Tested deposit function
- [ ] ✅ Updated README with addresses
- [ ] ✅ Created demo video
- [ ] ✅ Prepared pitch deck
- [ ] ✅ Submitted to hackathon

---

## 🆘 Quick Troubleshooting

### "Insufficient funds"
→ Get more tokens: https://faucet.somnia.network

### "Deployment failed"
→ Check gas: use `--legacy` flag
→ Check RPC: https://dream-rpc.somnia.network

### "Verification failed"
→ Use flattened source
→ Match compiler version: 0.8.30
→ Enable optimizer: 200 runs

---

## 📞 Need Help?

- **Discord**: https://discord.gg/somnia
- **Telegram**: https://t.me/somnianetwork
- **GitHub Issues**: Open an issue in this repo

---

**Made for Somnia AI Hackathon 🏆**

Good Luck Samar! 🚀

