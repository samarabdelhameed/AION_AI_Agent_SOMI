# 🚀 **AION Frontend Integration - Quick Start Guide**

**من Mock Data إلى Production في 3 أيام**

## ⚡ **Quick Overview**

هذا الملف يحتوي على خطة سريعة لتحويل الـ Frontend من Mock Data إلى Real Web3 Integration في أقل وقت ممكن.

---

## 📋 **Pre-Requirements Checklist**

```bash
# ✅ تأكد من أن كل شيء يعمل:
cd /Users/s/ming-template/base\ hack/AION_AI_Agent

# 1. Smart Contracts
cd contracts && forge test
# Expected: All tests passing

# 2. Backend
cd ../mcp_agent && npm start
# Expected: Server running on http://localhost:3001

# 3. Frontend
cd ../frontend && npm run dev
# Expected: Frontend running on http://localhost:5173
```

---

## 🏃‍♂️ **3-Day Sprint Plan**

### **🌅 Day 1: Web3 Foundation (4-6 hours)**

#### **⏰ Morning (2-3 hours): Setup Web3**

```bash
cd frontend

# Install Web3 dependencies
npm install wagmi viem @tanstack/react-query
npm install @rainbow-me/rainbowkit @walletconnect/web3-modal
npm install @reduxjs/toolkit react-redux
```

#### **📝 Create Core Files:**

**1. Create `src/lib/web3Config.ts`:**

```typescript
import { createConfig, http } from "wagmi";
import { bsc, bscTestnet } from "wagmi/chains";
import { metaMask, walletConnect } from "wagmi/connectors";

export const config = createConfig({
  chains: [bscTestnet, bsc],
  connectors: [
    metaMask(),
    walletConnect({
      projectId: "demo-project-id", // Replace with real project ID
    }),
  ],
  transports: {
    [bsc.id]: http("https://bsc-dataseed.binance.org/"),
    [bscTestnet.id]: http("https://data-seed-prebsc-1-s1.binance.org:8545/"),
  },
});

export const CONTRACT_ADDRESSES = {
  [bscTestnet.id]: {
    AION_VAULT: "0x1234567890123456789012345678901234567890", // TODO: Replace with actual
    VENUS_ADAPTER: "0x2345678901234567890123456789012345678901",
    BEEFY_ADAPTER: "0x3456789012345678901234567890123456789012",
    PANCAKE_ADAPTER: "0x4567890123456789012345678901234567890123",
  },
  [bsc.id]: {
    AION_VAULT: "0x5678901234567890123456789012345678901234",
    VENUS_ADAPTER: "0x6789012345678901234567890123456789012345",
    BEEFY_ADAPTER: "0x7890123456789012345678901234567890123456",
    PANCAKE_ADAPTER: "0x8901234567890123456789012345678901234567",
  },
} as const;
```

**2. Update `src/main.tsx`:**

```typescript
import React from "react";
import ReactDOM from "react-dom/client";
import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { config } from "./lib/web3Config";
import App from "./App.tsx";
import "./index.css";

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <App />
        <ReactQueryDevtools initialIsOpen={false} />
      </QueryClientProvider>
    </WagmiProvider>
  </React.StrictMode>
);
```

#### **⏰ Afternoon (2-3 hours): Wallet Integration**

**3. Update Navbar with Real Wallet:**

```typescript
// In src/components/layout/Navbar.tsx
import { useAccount, useConnect, useDisconnect } from 'wagmi'

// Replace mock wallet state with:
const { address, isConnected } = useAccount()
const { connect, connectors } = useConnect()
const { disconnect } = useDisconnect()

// Update Connect Wallet button:
<Button
  onClick={isConnected ? disconnect : () => connect({ connector: connectors[0] })}
>
  {isConnected && address ? `${address.slice(0,6)}...${address.slice(-4)}` : 'Connect Wallet'}
</Button>
```

**🎯 Day 1 Goal: Working wallet connection**

---

### **🌄 Day 2: Smart Contract Integration (6-8 hours)**

#### **⏰ Morning (3-4 hours): Contract Hooks**

**4. Create `src/hooks/useVault.ts`:**

```typescript
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { parseEther, formatEther } from "viem";
import { CONTRACT_ADDRESSES } from "../lib/web3Config";

const VAULT_ABI = [
  {
    inputs: [{ name: "user", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "deposit",
    outputs: [{ name: "shares", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
] as const;

export function useVault() {
  const { address, chainId } = useAccount();
  const vaultAddress = chainId
    ? CONTRACT_ADDRESSES[chainId]?.AION_VAULT
    : undefined;

  const { data: balance } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!vaultAddress },
  });

  const { writeContract: depositWrite, isPending } = useWriteContract();

  const deposit = async (amount: string) => {
    if (!vaultAddress) return;
    return depositWrite({
      address: vaultAddress,
      abi: VAULT_ABI,
      functionName: "deposit",
      value: parseEther(amount),
    });
  };

  return {
    balance: balance ? formatEther(balance) : "0",
    deposit,
    isPending,
  };
}
```

#### **⏰ Afternoon (3-4 hours): Update Dashboard**

**5. Update Dashboard with Real Data:**

```typescript
// In src/pages/Dashboard.tsx
import { useAccount } from "wagmi";
import { useVault } from "../hooks/useVault";

export function Dashboard({ onNavigate }: DashboardProps) {
  const { address, isConnected } = useAccount();
  const { balance } = useVault();

  if (!isConnected) {
    return <ConnectWalletPrompt />;
  }

  return (
    <div className="dashboard">
      {/* Replace mock data with real data */}
      <WalletCard address={address!} balance={balance} />
      <VaultCard balance={balance} />
      {/* ... rest of components */}
    </div>
  );
}
```

**🎯 Day 2 Goal: Real smart contract data in dashboard**

---

### **🌇 Day 3: API Integration & Polish (6-8 hours)**

#### **⏰ Morning (3-4 hours): API Client**

**6. Create `src/lib/apiClient.ts`:**

```typescript
const BASE_URL = "http://localhost:3001";

export const api = {
  async getStrategyRecommendation(data: any) {
    const response = await fetch(`${BASE_URL}/agent/decide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async getMarketData() {
    const response = await fetch(`${BASE_URL}/market/snapshot`);
    return response.json();
  },

  async executeStrategy(data: any) {
    const response = await fetch(`${BASE_URL}/agent/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return response.json();
  },
};
```

**7. Update AI Agent with Real API:**

```typescript
// In src/components/agent/AgentChat.tsx
import { api } from "../../lib/apiClient";

const handleSendMessage = async (message: string) => {
  setLoading(true);
  try {
    const response = await api.getStrategyRecommendation({
      userAddress: address,
      message,
      amountBNB: "1.0",
      intent: "analyze",
      network: "bscTestnet",
    });

    setMessages((prev) => [
      ...prev,
      {
        type: "ai",
        content: response.reason,
        timestamp: new Date(),
      },
    ]);
  } catch (error) {
    console.error("AI Error:", error);
  } finally {
    setLoading(false);
  }
};
```

#### **⏰ Afternoon (3-4 hours): Execute Page Integration**

**8. Update Execute Page:**

```typescript
// In src/pages/ExecutePage.tsx
import { useVault } from '../hooks/useVault'
import { api } from '../lib/apiClient'

export function ExecutePage() {
  const { deposit, isPending } = useVault()
  const [amount, setAmount] = useState('')

  const handleExecute = async () => {
    try {
      // 1. Simulate first
      const simulation = await api.executeStrategy({
        wallet: address,
        action: 'deposit',
        strategy: selectedStrategy,
        amount: parseFloat(amount),
        network: 'bscTestnet',
        simulate: true
      })

      // 2. Show simulation results
      setSimulationResult(simulation)

      // 3. Execute real transaction
      if (userConfirms) {
        await deposit(amount)
      }
    } catch (error) {
      console.error('Execution error:', error)
    }
  }

  return (
    // ... execution flow UI
  )
}
```

**🎯 Day 3 Goal: Complete integration with real transactions**

---

## 🔧 **Quick Fixes for Common Issues**

### **🚨 Issue 1: Contract Address Not Found**

```typescript
// Add fallback handling:
const vaultAddress = chainId
  ? CONTRACT_ADDRESSES[chainId]?.AION_VAULT
  : undefined;

if (!vaultAddress) {
  return <div>Contract not deployed on this network</div>;
}
```

### **🚨 Issue 2: API Connection Failed**

```typescript
// Add error handling:
const [apiError, setApiError] = useState(null);

try {
  const response = await api.getMarketData();
  setData(response);
} catch (error) {
  setApiError("Failed to load market data");
  // Use fallback data
}
```

### **🚨 Issue 3: Transaction Failed**

```typescript
// Add transaction error handling:
const handleDeposit = async () => {
  try {
    const hash = await deposit(amount);
    setStatus("pending");

    // Wait for confirmation
    await waitForTransaction({ hash });
    setStatus("success");
  } catch (error) {
    setStatus("error");
    setError(error.message);
  }
};
```

---

## 📊 **Testing Checklist**

### **Day 1 Tests:**

- [ ] Wallet connects successfully
- [ ] Network switching works
- [ ] Address displays correctly
- [ ] Disconnect works

### **Day 2 Tests:**

- [ ] Real balance shows in dashboard
- [ ] Contract calls don't error
- [ ] Loading states work
- [ ] Error handling for no connection

### **Day 3 Tests:**

- [ ] AI recommendations are real
- [ ] Market data loads from API
- [ ] Execute page works end-to-end
- [ ] Transaction confirmations work

---

## 🎯 **Success Metrics**

After 3 days, you should have:

### **✅ Functional Integration:**

- Real wallet connection (not mock)
- Live smart contract data
- Working API calls to MCP Agent
- Complete transaction flow

### **✅ User Experience:**

- No more "demo" or "mock" labels
- Real-time data updates
- Proper loading states
- Clear error messages

### **✅ Demo Readiness:**

- Can connect real wallet
- Can make real deposits
- AI gives real recommendations
- All data is live and accurate

---

## 🔄 **Quick Start Commands**

```bash
# Day 1: Setup
cd frontend
npm install wagmi viem @tanstack/react-query @rainbow-me/rainbowkit
# Update main.tsx, web3Config.ts, Navbar.tsx

# Day 2: Contracts
# Create useVault.ts hook
# Update Dashboard.tsx with real data
# Test wallet connection

# Day 3: APIs
# Create apiClient.ts
# Update AgentChat.tsx
# Update ExecutePage.tsx
# Test complete flow

# Final Test
npm run build
npm run preview
# Test production build
```

---

## 💡 **Pro Tips**

### **🎯 Focus on Core Flow First:**

1. **Wallet Connection** → Most important for demo
2. **Real Balance Display** → Shows integration works
3. **One Working Transaction** → Proves end-to-end functionality
4. **AI Recommendation** → Shows backend integration

### **⚡ Use Shortcuts:**

- Start with BSC Testnet only (simpler)
- Use mock data as fallback (graceful degradation)
- Copy contract ABIs from existing tests
- Test with small amounts first

### **🔧 Debug Tools:**

- React Query Devtools for API states
- MetaMask console for transaction errors
- Browser Network tab for API calls
- Wagmi hooks for Web3 debugging

---

## 🎉 **Final Validation**

Before demo, verify:

```markdown
✅ **Integration Checklist:**

- [ ] Connect wallet works
- [ ] Real balance shows
- [ ] Can make deposit
- [ ] AI responds with real data
- [ ] Transaction appears in timeline
- [ ] No console errors
- [ ] Mobile responsive
- [ ] Fast loading (<3 sec)

✅ **Demo Flow:**

- [ ] Landing → Connect Wallet → Dashboard
- [ ] Dashboard shows real data
- [ ] Execute → Deposit 0.01 BNB → Success
- [ ] AI Agent → Ask question → Get real answer
- [ ] Proof → Show yield tracking
```

**When all checkboxes pass, you're ready to impress the judges! 🏆**

---

## 📞 **Need Help?**

### **Common Solutions:**

- **Can't connect wallet:** Check MetaMask network settings
- **Contract errors:** Verify contract addresses are correct
- **API errors:** Ensure MCP Agent is running on port 3001
- **Transaction fails:** Check gas limits and balances

### **Emergency Fallbacks:**

- Keep mock data as fallback if APIs fail
- Use simulation mode if contracts not ready
- Demo on localhost if deployment issues
- Have screenshots ready as backup

**Remember: A working demo is better than a perfect app that doesn't work! 🚀**
