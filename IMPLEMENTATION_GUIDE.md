# 🚀 **AION Frontend Integration - Direct Implementation Guide**

## 🎯 **Start Here - 3 Days for Complete Implementation**

### **📋 Prerequisites:**

```bash
# Ensure everything is working:
cd /path/to/AION_AI_Agent

# 1. Test Smart Contracts
cd contracts && forge test

# 2. Start Backend
cd ../mcp_agent && npm start

# 3. Start Frontend
cd ../frontend && npm run dev
```

---

## 🌅 **Day 1: Web3 Setup (4 hours)**

### **⏰ Morning (2 hours): Install Dependencies**

```bash
cd frontend

# Install Web3 packages
npm install wagmi viem @tanstack/react-query @rainbow-me/rainbowkit @walletconnect/web3-modal @reduxjs/toolkit react-redux @tanstack/react-query-devtools
```

### **📝 Step 1: Create Web3 Config**

**Create file `src/lib/web3Config.ts`:**

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

// Contract addresses - Replace with actual addresses
export const CONTRACT_ADDRESSES = {
  [bscTestnet.id]: {
    AION_VAULT: "0x1234567890123456789012345678901234567890", // TODO: Replace
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

### **📝 Step 2: Contract ABI**

**Create file `src/lib/contractConfig.ts`:**

```typescript
export const VAULT_ABI = [
  {
    inputs: [{ name: "user", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "user", type: "address" }],
    name: "sharesOf",
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
  {
    inputs: [{ name: "shares", type: "uint256" }],
    name: "withdrawShares",
    outputs: [{ name: "amount", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export const STRATEGY_ADAPTER_ABI = [
  {
    inputs: [],
    name: "totalAssets",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "estimatedAPY",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;
```

### **📝 Step 3: Update Main App**

**Update file `src/main.tsx`:**

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

### **⏰ Afternoon (2 hours): Wallet Integration**

### **📝 Step 4: Create Wallet Hook**

**Create file `src/hooks/useVault.ts`:**

```typescript
import { useAccount, useReadContract, useWriteContract } from "wagmi";
import { parseEther, formatEther } from "viem";
import { CONTRACT_ADDRESSES, VAULT_ABI } from "../lib/contractConfig";

export function useVault() {
  const { address, chainId } = useAccount();
  const vaultAddress = chainId
    ? CONTRACT_ADDRESSES[chainId]?.AION_VAULT
    : undefined;

  const { data: balance, refetch: refetchBalance } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!vaultAddress },
  });

  const { data: shares } = useReadContract({
    address: vaultAddress,
    abi: VAULT_ABI,
    functionName: "sharesOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!vaultAddress },
  });

  const { writeContract: depositWrite, isPending } = useWriteContract();

  const deposit = async (amount: string) => {
    if (!vaultAddress) throw new Error("Vault address not found");
    return depositWrite({
      address: vaultAddress,
      abi: VAULT_ABI,
      functionName: "deposit",
      value: parseEther(amount),
    });
  };

  return {
    balance: balance ? formatEther(balance) : "0",
    shares: shares ? formatEther(shares) : "0",
    deposit,
    isPending,
    refetchBalance,
  };
}
```

### **🎯 Day 1 Testing:**

```bash
npm run dev
# Verify:
# - Wallet connection works
# - MetaMask popup appears
# - Address displays in navbar
```

---

## 📊 **Day 2: Smart Contract Integration (6 hours)**

### **⏰ Morning (3 hours): Dashboard Real Data**

### **📝 Step 5: Update Dashboard**

**In file `src/pages/Dashboard.tsx` - Add at the beginning:**

```typescript
import { useAccount } from "wagmi";
import { useVault } from "../hooks/useVault";

// In the component:
export function Dashboard({ onNavigate }: DashboardProps) {
  const { address, isConnected } = useAccount();
  const { balance, shares } = useVault();

  if (!isConnected) {
    return (
      <div className="pt-20 min-h-screen bg-dark-900 flex items-center justify-center">
        <Card className="max-w-md mx-auto text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-gold-500 to-neon-cyan rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Zap className="w-8 h-8 text-dark-900" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-4">Connect Your Wallet</h2>
          <p className="text-gray-400 mb-6">
            Connect your wallet to view your AION dashboard
          </p>
          <Button onClick={() => onNavigate("landing")} icon={Zap} glow>
            Connect Wallet
          </Button>
        </Card>
      </div>
    );
  }

  // Rest of dashboard code...
```

### **🎯 Day 2 Testing:**

```bash
npm run dev
# Verify:
# - Real wallet balance displays
# - Vault balance from contract
# - Strategy APY cards load from contracts
# - Loading states work
```

---

## 🔌 **Day 3: API Integration (6 hours)**

### **⏰ Morning (3 hours): API Client**

### **📝 Step 6: Create API Client**

**Create file `src/lib/apiClient.ts`:**

```typescript
const BASE_URL = "http://localhost:3003";

export const api = {
  async getStrategyRecommendation(data: {
    userAddress: string;
    amountBNB: string;
    intent: string;
    network: string;
  }) {
    const response = await fetch(`${BASE_URL}/api/agent/decide`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async getMarketData() {
    const response = await fetch(`${BASE_URL}/api/oracle/snapshot`);
    return response.json();
  },

  async executeStrategy(data: {
    wallet: string;
    action: string;
    strategy: string;
    amount: number;
    network: string;
    simulate?: boolean;
  }) {
    const response = await fetch(`${BASE_URL}/api/agent/execute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  async getUserTimeline(address: string) {
    const response = await fetch(`${BASE_URL}/api/timeline/${address}`);
    return response.json();
  },
};
```

### **🎯 Day 3 Testing:**

```bash
npm run dev
# Verify:
# - AI Agent responds with real responses
# - KPI cards load from API
# - Execute page simulation works
# - Real transactions execute
```

---

## 🚀 **Final Testing & Polish**

### **📝 Create Environment Variables**

**Create `.env` file in frontend folder:**

```bash
VITE_WALLET_CONNECT_PROJECT_ID=demo-project-id
VITE_MCP_API_URL=http://localhost:3003
VITE_ENVIRONMENT=development
```

### **🔧 Quick Debug Checklist**

```typescript
// Console.log for debugging:

// 1. Check wallet connection
console.log("Wallet connected:", isConnected, address);

// 2. Check contract addresses
console.log("Contract address:", vaultAddress);

// 3. Check API responses
console.log("API response:", response);

// 4. Check balance updates
console.log("Balance:", balance, "Shares:", shares);
```

### **🎯 Final Demo Flow:**

1. **Landing Page** → Real KPI data loads
2. **Connect Wallet** → MetaMask connects
3. **Dashboard** → Real wallet balance, vault data, strategy APYs
4. **AI Agent** → Real AI responses from backend
5. **Execute** → Real transaction simulation and execution
6. **Proof/Timeline** → Real transaction data

### **✅ Success Checklist:**

- [ ] Wallet connects successfully ✅
- [ ] Real balance shows in dashboard ✅
- [ ] Strategy APYs load from contracts ✅
- [ ] AI gives real recommendations ✅
- [ ] Can simulate and execute real transactions ✅
- [ ] No console errors ✅
- [ ] Mobile responsive ✅
- [ ] Demo ready! 🎉

### **🚨 Emergency Fallbacks:**

```typescript
// If APIs fail, add fallbacks:
const safeApiCall = async (apiFunction, fallbackData) => {
  try {
    return await apiFunction();
  } catch (error) {
    console.warn("API failed, using fallback:", error);
    return fallbackData;
  }
};

// If contracts fail:
const safeContractCall = (contractData, fallbackValue) => {
  return contractData || fallbackValue;
};
```

---

## 🎉 **Congratulations! Integration Complete**

**Final Result:**

- ✅ **Real Web3 Integration** - Wallet, contracts, transactions
- ✅ **Live API Data** - AI recommendations, market data
- ✅ **Professional UX** - Loading states, error handling
- ✅ **Demo Ready** - Perfect for hackathon presentation

**Implementation Time:** 3 days maximum
**Result:** Production-ready DeFi application! 🚀

**Let's start implementing! 💪**