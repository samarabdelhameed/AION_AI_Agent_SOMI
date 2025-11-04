# 🧩 AION Frontend - Component Library

## 🎨 **Core Components**

### **Layout Components**

```typescript
// Layout/Page.tsx - Main page wrapper
<Page title="Dashboard" description="AI DeFi Management">
  <Header />
  <Sidebar />
  <Main>{children}</Main>
  <Footer />
</Page>

// Layout/Header.tsx - Top navigation
<Header>
  <Logo />
  <Navigation />
  <WalletButton />
  <UserMenu />
</Header>

// Layout/Sidebar.tsx - Side navigation
<Sidebar>
  <NavItem icon="dashboard" href="/dashboard">Dashboard</NavItem>
  <NavItem icon="chart" href="/analytics">Analytics</NavItem>
  <NavItem icon="robot" href="/ai-agent">AI Agent</NavItem>
</Sidebar>
```

### **Data Display Components**

```typescript
// Cards/StatsCard.tsx - Metric display
<StatsCard
  title="Total Yield"
  value="$1,247.50"
  change="+8.2%"
  trend="up"
  icon="trending-up"
  color="success"
/>

// Charts/YieldChart.tsx - Interactive chart
<YieldChart
  data={yieldData}
  timeframe="30d"
  height={300}
  showTooltip={true}
  animated={true}
/>

// Tables/TransactionTable.tsx - Data table
<TransactionTable
  data={transactions}
  columns={['type', 'amount', 'status', 'date']}
  sortable={true}
  filterable={true}
  pagination={true}
/>
```

### **Form Components**

```typescript
// Forms/AmountInput.tsx - Smart amount input
<AmountInput
  label="Amount"
  currency="BNB"
  value={amount}
  onChange={setAmount}
  showUSDValue={true}
  max={balance}
  validation={required}
/>

// Forms/StrategySelector.tsx - Strategy choice
<StrategySelector
  strategies={strategies}
  selected={selectedStrategy}
  onSelect={setStrategy}
  showAPY={true}
  showRisk={true}
  aiRecommended="venus"
/>
```

### **AI-Specific Components**

```typescript
// AI/AgentStatus.tsx - AI agent display
<AgentStatus
  status="active"
  currentAction="analyzing"
  nextAction="rebalance"
  confidence={87}
  animated={true}
/>

// AI/DecisionLog.tsx - AI decisions feed
<DecisionLog
  decisions={aiDecisions}
  maxItems={10}
  realTime={true}
  expandable={true}
/>

// AI/RiskMeter.tsx - Risk level selector
<RiskMeter
  level={riskLevel}
  onChange={setRiskLevel}
  labels={['Conservative', 'Moderate', 'Aggressive']}
  animated={true}
/>
```

### **Blockchain Components**

```typescript
// Web3/WalletButton.tsx - Wallet connection
<WalletButton
  onConnect={handleConnect}
  onDisconnect={handleDisconnect}
  showBalance={true}
  showNetwork={true}
/>

// Web3/TransactionButton.tsx - Smart transaction
<TransactionButton
  action="deposit"
  amount={amount}
  strategy={strategy}
  onConfirm={handleTransaction}
  showGasEstimate={true}
  requiresApproval={needsApproval}
/>

// Web3/NetworkSwitch.tsx - Network selector
<NetworkSwitch
  current={currentNetwork}
  supported={['bsc', 'ethereum', 'polygon']}
  onChange={switchNetwork}
/>
```

## 🎨 **Theme & Styling**

### **Design Tokens**

```typescript
// theme/tokens.ts
export const tokens = {
  colors: {
    primary: {
      50: "#FFFBEB",
      500: "#FFD700", // Main gold
      900: "#92400E",
    },
    gray: {
      50: "#F9FAFB",
      900: "#0A0A0A", // Deep black
    },
    success: "#00FF88",
    warning: "#FF6B35",
    error: "#EF4444",
  },

  spacing: {
    xs: "0.5rem",
    sm: "1rem",
    md: "1.5rem",
    lg: "2rem",
    xl: "3rem",
  },

  typography: {
    fontFamily: {
      sans: ["Inter", "sans-serif"],
      mono: ["JetBrains Mono", "monospace"],
    },
    fontSize: {
      xs: "0.75rem",
      sm: "0.875rem",
      base: "1rem",
      lg: "1.125rem",
      xl: "1.25rem",
      "2xl": "1.5rem",
      "3xl": "1.875rem",
    },
  },

  animation: {
    duration: {
      fast: "150ms",
      normal: "300ms",
      slow: "500ms",
    },
    easing: {
      out: "cubic-bezier(0.4, 0, 0.2, 1)",
      in: "cubic-bezier(0.4, 0, 1, 1)",
      inOut: "cubic-bezier(0.4, 0, 0.2, 1)",
    },
  },
};
```

### **Component Variants**

```typescript
// components/Button/variants.ts
export const buttonVariants = {
  primary: "bg-primary-500 text-black hover:bg-primary-400",
  secondary: "bg-gray-800 text-white hover:bg-gray-700",
  success: "bg-success text-black hover:bg-success/90",
  ghost: "bg-transparent text-white hover:bg-gray-800",
};

export const buttonSizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-base",
  lg: "px-6 py-3 text-lg",
};
```

## 🔄 **State Management Structure**

### **Zustand Stores**

```typescript
// stores/auth.ts - Authentication state
interface AuthStore {
  user: User | null;
  wallet: Wallet | null;
  isConnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

// stores/portfolio.ts - Portfolio data
interface PortfolioStore {
  balance: number;
  positions: Position[];
  totalYield: number;
  isLoading: boolean;
  fetchPortfolio: () => Promise<void>;
  deposit: (amount: number, strategy: string) => Promise<void>;
  withdraw: (amount: number) => Promise<void>;
}

// stores/ai.ts - AI agent state
interface AIStore {
  status: "active" | "paused" | "analyzing";
  currentStrategy: string;
  decisions: Decision[];
  settings: AISettings;
  updateSettings: (settings: Partial<AISettings>) => void;
}
```

## 📱 **Mobile-First Components**

### **Mobile Navigation**

```typescript
// Mobile/BottomNav.tsx - Mobile bottom navigation
<BottomNav>
  <NavItem icon="home" label="Dashboard" active />
  <NavItem icon="chart" label="Analytics" />
  <NavItem icon="plus" label="Deposit" />
  <NavItem icon="robot" label="AI" />
  <NavItem icon="user" label="Profile" />
</BottomNav>

// Mobile/SwipeCard.tsx - Swipeable cards
<SwipeCard
  onSwipeLeft={handleReject}
  onSwipeRight={handleApprove}
  threshold={100}
>
  <StrategyCard strategy={strategy} />
</SwipeCard>
```

## 🎬 **Animation Components**

### **Framer Motion Animations**

```typescript
// Animations/FadeIn.tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3 }}
>
  {children}
</motion.div>

// Animations/CountUp.tsx
<CountUp
  start={0}
  end={value}
  duration={2}
  decimals={2}
  prefix="$"
  separator=","
/>

// Animations/PulseLoader.tsx
<motion.div
  animate={{ scale: [1, 1.1, 1] }}
  transition={{ repeat: Infinity, duration: 1 }}
  className="w-4 h-4 bg-primary-500 rounded-full"
/>
```

## 🔧 **Utility Components**

### **Helpers**

```typescript
// Utils/LoadingSpinner.tsx
<LoadingSpinner size="lg" color="primary" />

// Utils/ErrorBoundary.tsx
<ErrorBoundary fallback={<ErrorFallback />}>
  {children}
</ErrorBoundary>

// Utils/ProtectedRoute.tsx
<ProtectedRoute requireWallet>
  <DashboardPage />
</ProtectedRoute>
```

This component library provides everything needed for a stunning, professional frontend! 🚀
