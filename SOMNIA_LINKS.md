# 🔗 AION Vault - Somnia Testnet Links

## 🌐 Somnia Testnet - Essential Links

### 🎯 Main Links (Most Important)

1. **Block Explorer (Verification)**
   - 🔗 **https://somnia-devnet.socialscan.io**
   - Use this to verify your contracts
   - View transactions and contract interactions

2. **Alternative Block Explorer**
   - 🔗 **https://explorer-devnet.somnia.network**
   - Backup option if main explorer is down

3. **Faucet (Get Test Tokens)**
   - 🔗 **https://faucet.somnia.network**
   - Request STT test tokens for deployment
   - Your address: `0xdafee25f98ff62504c1086eacbb406190f3110d5`

---

## 🔍 Contract Verification Steps

### Step 1: Go to Block Explorer
👉 **https://somnia-devnet.socialscan.io**

### Step 2: Search for Your Contract
- Paste your deployed contract address
- Click on the contract

### Step 3: Verify Contract
- Click "Contract" tab
- Click "Verify & Publish" button
- Fill in the form:

#### For AION Vault:
```
Contract Address: YOUR_VAULT_ADDRESS
Compiler Type: Solidity (Single file) OR Standard-Json-Input
Compiler Version: v0.8.30+commit.a9bf7ba
Optimization: Yes
Runs: 200
License: MIT License

Constructor Arguments:
0x00000000000000000000000000000000000000000000000000038d7ea4c68000
0x00000000000000000000000000000000000000000000000000005af3107a4000
```

#### For Somnia Agent:
```
Contract Address: YOUR_AGENT_ADDRESS
Compiler Type: Solidity (Single file) OR Standard-Json-Input
Compiler Version: v0.8.30+commit.a9bf7ba
Optimization: Yes
Runs: 200
License: MIT License

Constructor Arguments: (Use cast to encode)
vault_address + somnia_ai_address (concatenated)
```

---

## 📡 RPC Configuration

### Add Somnia to MetaMask:
```
Network Name: Somnia Dream Testnet
RPC URL: https://dream-rpc.somnia.network
Chain ID: 50311
Currency Symbol: STT
Block Explorer: https://somnia-devnet.socialscan.io
```

### Or use this quick add link:
🔗 **https://chainlist.org/?search=somnia** (if available)

---

## 📚 Documentation Links

### Official Documentation
- **Main Docs**: https://docs.somnia.network
- **AI SDK Docs**: https://github.com/somnia-network/ai-sdk
- **Developer Guide**: https://docs.somnia.network/developers

### Hackathon Resources
- **Hackathon Portal**: https://dorahacks.io/hackathon/somnia-ai
- **Discord Support**: https://discord.gg/somnia
- **Telegram**: https://t.me/somnianetwork

---

## 🛠️ Development Tools

### Foundry Commands
```bash
# Deploy
forge script script/DeploySomniaAgent.s.sol:DeploySomniaAgent \
  --rpc-url https://dream-rpc.somnia.network \
  --private-key $PRIVATE_KEY \
  --broadcast \
  -vvvv

# Verify (if supported)
forge verify-contract \
  --chain-id 50311 \
  --rpc-url https://dream-rpc.somnia.network \
  YOUR_CONTRACT_ADDRESS \
  src/AIONVault.sol:AIONVault

# Flatten for manual verification
forge flatten src/AIONVault.sol > AIONVault_flat.sol
```

### Cast Commands
```bash
# Check balance
cast balance 0xdafee25f98ff62504c1086eacbb406190f3110d5 \
  --rpc-url https://dream-rpc.somnia.network

# Call contract
cast call YOUR_CONTRACT_ADDRESS "function()" \
  --rpc-url https://dream-rpc.somnia.network

# Send transaction
cast send YOUR_CONTRACT_ADDRESS "function()" \
  --private-key $PRIVATE_KEY \
  --rpc-url https://dream-rpc.somnia.network
```

---

## 🎬 Demo & Submission Links

### For Hackathon Submission

1. **GitHub Repository**
   - 🔗 https://github.com/samarabdelhameed/AION_AI_Agent_SOMI

2. **Demo Video** (Upload to):
   - YouTube: https://youtube.com
   - Loom: https://loom.com
   - Vimeo: https://vimeo.com

3. **Live Demo** (Deploy frontend to):
   - Vercel: https://vercel.com
   - Netlify: https://netlify.com
   - GitHub Pages: https://pages.github.com

4. **Pitch Deck** (Create on):
   - Canva: https://canva.com
   - Google Slides: https://slides.google.com
   - Pitch: https://pitch.com

---

## 🆘 Troubleshooting Links

### If Something Goes Wrong:

1. **Check RPC Status**
   - https://status.somnia.network (if available)
   - Try alternative RPC endpoints

2. **Get Help**
   - Discord: https://discord.gg/somnia
   - Telegram: https://t.me/somnianetwork
   - Twitter: https://twitter.com/SomniaNetwork

3. **Check Transactions**
   - Explorer: https://somnia-devnet.socialscan.io
   - Search by your address or tx hash

4. **Foundry Issues**
   - Foundry Book: https://book.getfoundry.sh
   - Foundry Discord: https://discord.gg/foundry

---

## 📋 Quick Reference Card

### Your Wallet
```
Address: 0xdafee25f98ff62504c1086eacbb406190f3110d5
```

### Network Details
```
Chain ID: 50311
RPC: https://dream-rpc.somnia.network
Explorer: https://somnia-devnet.socialscan.io
Faucet: https://faucet.somnia.network
```

### After Deployment
```
✅ Verify at: https://somnia-devnet.socialscan.io
✅ Test with: cast commands
✅ Update README with addresses
✅ Create demo video
✅ Submit to hackathon portal
```

---

## 🎯 Success Checklist

- [ ] Got test tokens from faucet ✅
- [ ] Deployed AION Vault
- [ ] Deployed Somnia Agent
- [ ] Deployed Somnia AI Mock
- [ ] Verified all contracts on explorer
- [ ] Tested deposit function
- [ ] Tested AI recommendations
- [ ] Created demo video
- [ ] Updated GitHub README
- [ ] Submitted to hackathon

---

## 🌟 Pro Tips

1. **Save Everything**: Copy all contract addresses immediately after deployment
2. **Verify Fast**: Verify contracts right after deployment while constructor args are fresh
3. **Test First**: Use testnet extensively before any mainnet deployment
4. **Document Well**: Good documentation = better hackathon scores
5. **Demo Quality**: Clear, short demo video (3-5 minutes max)

---

**Made with ❤️ for Somnia AI Hackathon**

**Good Luck Samar! 🚀🎉**

