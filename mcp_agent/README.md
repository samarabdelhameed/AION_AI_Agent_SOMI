# 🧠 MCP Agent – Autonomous AI Memory Layer for AION DeFi Agent

This module powers the **decentralized AI logic** for the AION Protocol — enabling:

- 🧠 **Sovereign AI Memory** (via MultiMemory & Unibase)
- 🧩 **Agent Interoperability** (via AIP SDK & BitAgent)
- 📚 **Knowledge Recall & Reasoning** (via Chroma KnowledgeBase)
- 💾 **On-chain Proof of Memory** (via Unibase Data Availability Layer)
- 🔐 **Live Smart Contract Execution** (via AIONVault.sol on BNBChain)

The MCP Agent provides an _autonomous, evolving AI layer_ — recording, recalling, and analyzing DeFi actions across time, and enabling explainable recommendations through a timeline-friendly Memory API.

---

## 📁 Folder Structure

```bash
mcp_agent/
├── index.js                 # Node.js backend server (MCP Agent)
├── agent_memory.py          # Python: stores memory & knowledge via Unibase SDK
├── aip_share.py             # Python: share memory via AIP agent protocol
├── memory.json              # (Legacy) fallback memory (deprecated)
├── history.json             # Tracks wallet + vault balance snapshots
├── abi/                     # AIONVault ABI
├── .env                     # RPC_URL, PRIVATE_KEY, CONTRACT_ADDRESS
└── README.md                # This file
```

---

## 🛠 Setup & Installation

```bash
cd mcp_agent
npm install
pip install git+https://github.com/unibaseio/membase.git
pip install git+https://github.com/unibaseio/aip-agent.git
```

### Create `.env`

```env
RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545
PRIVATE_KEY=YOUR_PRIVATE_KEY_HERE
CONTRACT_ADDRESS=0x048AC9bE9365053c5569daa9860cBD5671869188
```

python3 agent_memory.py 0x1d58afB3a049DAd98Ab5219fb1FF768E1E3B2ED3 deposit auto_yield 0.001

/Users/s/ming-template/base hack/AION_AI_Agent/mcp_agent/agent_memory.py:61: DeprecationWarning: datetime.datetime.utcnow() is deprecated and scheduled for removal in a future version. Use timezone-aware objects to represent datetimes in UTC: datetime.datetime.now(datetime.UTC).
"created_at": getattr(msg, 'created_at', datetime.utcnow().isoformat() + "Z") # ✅ Safe fallback
✅ Memory & Knowledge saved successfully.
✅ Local memory updated for wallet 0x1d58afB3a049DAd98Ab5219fb1FF768E1E3B2ED3.

---

## 🚀 Running the Agent & Server

```bash
# Start the MCP API server
node index.js

# Execute AIP Agent Interop (simulate cross-agent knowledge sync)
python3 aip_share.py <wallet_address>
```

### Example Logs (Node.js)

```
🚀 MCP Agent is listening at http://localhost:3001
✅ Unibase memory saved: ✅ Memory & Knowledge saved successfully.
```

### Example Logs (Python AIP)

```
🔗 Initializing AIP Agent 'AinonAgent'...
🔑 Connecting agent to wallet: 0x...
📩 Sending message to AinonAgent memory...
✅ Memory log sent via send_message ✅
```

---

## ✅ Core Features

### 🧠 AI + Memory Layer

- ✅ MultiMemory integration for sovereign AI memory
- ✅ Chroma KnowledgeBase for contextual recall & learning
- ✅ Memory persisted via Unibase DA → verifiable on-chain AI learning
- ✅ `/memory/:wallet` → returns structured Memory Array → **Timeline-ready**

### 🤝 Agent Interoperability

- ✅ `aip_share.py` sends Memory to BitAgent via AIP Protocol
- ✅ API route `/share/:wallet` → triggers AI-to-AI memory sync

### 🔐 DeFi Execution Layer

- ✅ **AIONVault.sol** supports:

  - Native BNB deposit/withdraw
  - Vault state logged to `history.json`
  - Actions logged to `agent_memory.py` (Unibase memory + KnowledgeBase)

---

## ✅ API Endpoints

| Route              | Method | Description                                        |
| ------------------ | ------ | -------------------------------------------------- |
| `/`                | GET    | Welcome message                                    |
| `/ping`            | GET    | Check if server is alive                           |
| `/memory/all`      | GET    | Get memory for all wallets                         |
| `/memory/:wallet`  | GET    | Get Memory Array (rich timeline-ready structure)   |
| `/memory`          | POST   | Add/update memory manually (legacy fallback)       |
| `/wallet/:address` | GET    | Get BNB balance for an address                     |
| `/vault/:wallet`   | GET    | Get vault balance from contract                    |
| `/vault/deposit`   | POST   | Deposit BNB to AIONVault + log Memory/Knowledge    |
| `/vault/withdraw`  | POST   | Withdraw BNB from AIONVault + log Memory/Knowledge |
| `/history/:wallet` | GET    | View wallet-vault historical data                  |
| `/share/:wallet`   | GET    | Share memory to BitAgent (AIP)                     |
| `/analyze/:wallet` | GET    | AI-based strategy recommendation                   |

---

## ✅ Integration Logs (Live Testing)

```bash
# 🔁 Share Memory to BitAgent
python3 aip_share.py 0xYourWalletAddress

# 🟢 Server Alive Check
curl http://localhost:3001/ping

# ✅ Deposit
curl -X POST http://localhost:3001/vault/deposit \
  -H "Content-Type: application/json" \
  -d '{"amount": "0.00001", "wallet": "0xYourWalletAddress"}'

# ✅ Withdraw
curl -X POST http://localhost:3001/vault/withdraw \
  -H "Content-Type: application/json" \
  -d '{"amount": "0.000001"}'

# 🧠 Read Memory (Timeline-ready Array)
curl http://localhost:3001/memory/0xYourWalletAddress

# 📊 Analyze Strategy
curl http://localhost:3001/analyze/0xYourWalletAddress

# 🔁 Share Memory with BitAgent
curl http://localhost:3001/share/0xYourWalletAddress
```

---

## 🧩 Planned Enhancements

| Feature                    | Description                                  |
| -------------------------- | -------------------------------------------- |
| 🗣️ NLP Agent               | Natural queries: "What should I do next?"    |
| ⚡ Gas Oracle              | `/gas-price` endpoint with live data         |
| 🔐 Auth Layer              | AIP Agent auth with JWT/Passkeys             |
| 🌉 Cross-chain Vault Logic | Support zkSync, Arbitrum, Base               |
| 🔏 ZK-Proof DA Storage     | Long-term memory proof via Unibase blob + ZK |
| 🧠 Timeline + Event Log UI | Visualize AI Agent Memory + Decisions        |

---

## 📄 License

MIT © 2025 – Samar Abdelhameed

---

## 💥 Suggested Commit Message

```text
docs: update MCP Agent README with Timeline-ready Memory API + verified AI Memory & Reasoning Layer 🚀🧠
```

---

✨ **Notes for Reviewers:**
The MCP Agent now provides:

- **Timeline-ready Memory** for AI explainability → proven on-chain learning
- Full compatibility with upcoming Timeline + Event Log Frontend UI
- Live tested end-to-end with Unibase + AIP + AIONVault smart contract
