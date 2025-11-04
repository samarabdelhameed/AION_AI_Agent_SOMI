# 🧠 AION DeFi Platform - Pages Logic Flow Chart

> **Complete Logic Documentation for All Pages in AION AI Agent Platform**

---

## 📋 **Table of Contents**

1. [Landing Page](#1-landing-page-🏠)
2. [Dashboard](#2-dashboard-📊)
3. [Execute Page](#3-execute-page-⚡)
4. [Advanced Operations](#4-advanced-operations-🚀)
5. [Agent Studio](#5-agent-studio-🤖)
6. [Strategies Explorer](#6-strategies-explorer-🔍)
7. [Portfolio Analytics](#7-portfolio-analytics-📈)
8. [Vault Page](#8-vault-page-🏦)
9. [Settings](#9-settings-⚙️)
10. [Proof of Yield](#10-proof-of-yield-🛡️)
11. [Activity Timeline](#11-activity-timeline-📅)
12. [Venus Page](#12-venus-page-🌟)
13. [Documentation](#13-documentation-📚)

---

## **1. Landing Page 🏠**

### **Purpose**: First impression and user onboarding

### **Logic Flow**:
```
Page Load → Hero Animation → Real Data Fetch → KPI Display → CTA Actions
    ↓              ↓              ↓              ↓           ↓
- Load Page    - Animate      - Get Market   - Show Live  - Navigate
- Initialize   - Hero Text    - Data         - KPIs       - to Dashboard
- Hooks        - Features     - Calculate    - Display    - Connect Wallet
               - Steps        - Real Stats   - Charts     - Start Journey
```

### **Key Components**:
- **Hero Section**: Animated title with gradient text
- **Features Showcase**: AI Intelligence, Security, Yield Optimization
- **How It Works**: 3-step process (Connect → Decide → Execute)
- **Live KPIs**: Real TVL, Users, APY, Volume from strategies
- **Performance Chart**: Mock data for visual appeal

### **Data Sources**:
- `useStrategies()` - Real strategy data
- `useRealData()` - Market data
- `generateMockChartData()` - Chart visualization

### **User Journey**:
1. **Lands on page** → Sees animated hero
2. **Scrolls down** → Views features and benefits
3. **Sees live data** → Builds trust with real metrics
4. **Clicks CTA** → Navigates to Dashboard or connects wallet

---

## **2. Dashboard 📊**

### **Purpose**: Central hub for portfolio overview and quick actions

### **Logic Flow**:
```
Authentication → Data Loading → Real-time Updates → Action Triggers
      ↓              ↓              ↓                 ↓
- Check Wallet  - Fetch All    - Live Market     - Quick Actions
- Connection    - Data Sources - Updates         - Navigation
- Status        - Vault Stats  - Performance     - Refresh Data
                - Portfolio    - Health Status   - AI Chat
```

### **Key Components**:
- **Wallet Card**: Balance, address, network status
- **Vault Card**: Total deposits, shares, yield earned
- **Performance Chart**: Historical portfolio value
- **Portfolio Metrics**: Detailed breakdown of investments
- **AI Recommendations**: Smart suggestions for optimization
- **Risk Management**: Current risk level and alerts
- **Recent Activity**: Latest transactions and actions
- **System Health**: Service status indicators

### **Data Sources**:
- `useVaultOnchain()` - On-chain vault data
- `useWalletOnchain()` - Wallet balances
- `useRealData()` - Market and system data
- `useHistoricalPerformance()` - Performance charts
- `useRecentActivity()` - Transaction history

### **Real-time Features**:
- Live balance updates
- Market price changes
- System health monitoring
- Performance tracking

---

## **3. Execute Page ⚡**

### **Purpose**: Transaction execution with simulation and validation

### **Logic Flow**:
```
Parameters → Validation → Simulation → Confirmation → Execution → Result
    ↓           ↓           ↓            ↓             ↓          ↓
- Select    - Check     - Calculate  - Review      - Send     - Show
- Strategy  - Amounts   - Expected   - Details     - Transaction - Status
- Action    - Balances  - Returns    - Confirm     - Wait     - Hash
- Amount    - Limits    - Gas Fees   - Execute     - Monitor  - Success
```

### **Execution Steps**:
1. **Parameters** (`params`): User selects strategy, action, amount
2. **Validation** (`validate`): Check balances, limits, network
3. **Simulation** (`simulate`): Calculate expected outcomes
4. **Confirmation** (`confirm`): Review and approve transaction
5. **Result** (`result`): Show transaction status and hash

### **Key Features**:
- **11 Advanced Operations**: Deposit, Withdraw, Rebalance, etc.
- **Real-time Simulation**: Live calculation of returns and fees
- **Smart Validation**: Minimum deposit checks, balance validation
- **Gas Optimization**: Efficient transaction execution
- **Progress Tracking**: Step-by-step execution monitoring

### **Data Integration**:
- Real strategy data from `useStrategies()`
- Live market prices from `useRealData()`
- On-chain validation with `useVaultOnchain()`
- Minimum deposit checks with `useVaultMinDeposit()`

---

## **4. Advanced Operations 🚀**

### **Purpose**: Professional DeFi tools and automation

### **Logic Flow**:
```
Tab Selection → Configuration → Simulation → Setup → Monitoring
     ↓              ↓             ↓          ↓        ↓
- Choose Tab   - Set Params   - Preview   - Deploy  - Real-time
- Auto-Rebal   - Thresholds   - Results   - Smart   - Alerts
- DCA          - Frequencies  - Returns   - Contract- Status
- Risk Mgmt    - Targets      - Risks     - Setup   - Updates
- Analytics    - Validation   - Impact    - Execute - Monitoring
```

### **4 Main Tabs**:

#### **Auto-Rebalance 🔄**
```
Configuration → Target Allocation → Threshold Setting → Automation Setup
      ↓               ↓                  ↓                 ↓
- Enable/Disable - Set % per      - Drift Threshold  - Smart Contract
- Frequency      - Strategy       - 1-20% range      - Deployment
- Validation     - Total = 100%   - Trigger Logic    - Monitoring
```

#### **DCA Strategy 📈**
```
Investment Setup → Target Selection → Projection → Automation
       ↓               ↓               ↓           ↓
- Amount (BNB)    - Choose Strategy - Calculate  - Schedule
- Frequency       - Risk Profile    - Returns   - Execute
- Slippage        - Validation      - Timeline  - Monitor
```

#### **Risk Management 🛡️**
```
Risk Controls → Price Triggers → Protection Setup → Monitoring
      ↓             ↓               ↓               ↓
- Stop Loss     - Calculate      - Smart Contract - Real-time
- Take Profit   - Target Prices  - Automation     - Alerts
- Max Drawdown  - Thresholds     - Deployment     - Status
```

#### **Analytics 📊**
```
Data Collection → AI Analysis → Recommendations → Actions
       ↓             ↓              ↓              ↓
- Portfolio     - Performance   - Rebalance     - Execute
- Metrics       - Risk Score    - Opportunities - Navigate
- Real-time     - Efficiency    - Optimizations - Implement
```

### **Service Integration**:
- `advancedOperationsService` - Core logic and simulations
- Real-time monitoring with alerts
- Smart contract automation
- AI-powered recommendations

---

## **5. Agent Studio 🤖**

### **Purpose**: AI-powered chat interface for DeFi assistance

### **Logic Flow**:
```
User Input → Context Analysis → AI Processing → Response Generation → Action Execution
    ↓            ↓                ↓              ↓                   ↓
- Message    - Market Data    - Natural      - Recommendations   - Navigate
- Voice      - Portfolio      - Language     - Explanations      - Execute
- Commands   - Strategies     - Processing   - Insights          - Update
```

### **Key Features**:
- **Natural Language Interface**: Chat with AI about DeFi strategies
- **Context Awareness**: AI knows your portfolio, market conditions
- **Smart Recommendations**: Personalized investment advice
- **Action Integration**: Direct execution from chat
- **Voice Support**: Speech-to-text input (planned)
- **Real-time Data**: Live market and portfolio context

### **AI Capabilities**:
- Portfolio analysis and optimization
- Strategy comparison and recommendations
- Risk assessment and management
- Market trend analysis
- Educational explanations

### **Data Context**:
- Live market data from `useRealData()`
- Portfolio status from `useVaultOnchain()`
- Strategy performance from `useStrategies()`
- User preferences and history

---

## **6. Strategies Explorer 🔍**

### **Purpose**: Comprehensive strategy discovery and comparison

### **Logic Flow**:
```
Data Loading → Filtering → Sorting → Comparison → Selection → Action
     ↓           ↓         ↓          ↓           ↓          ↓
- Fetch      - Network  - APY      - Side-by   - Choose   - Navigate
- Strategies - Risk     - TVL      - Side      - Strategy - to Execute
- Real Data  - Protocol - Name     - Analysis  - Details  - Implement
- Status     - Type     - Performance - Metrics - Review   - Compare
```

### **Advanced Filtering**:
- **Network**: BSC, Ethereum, Polygon
- **Risk Level**: Low, Medium, High
- **Protocol**: Venus, Beefy, PancakeSwap, Aave
- **Type**: Lending, Farming, Staking
- **Data Source**: Live API vs Cached
- **Status**: Active vs Paused

### **Sorting Options**:
- APY (Annual Percentage Yield)
- TVL (Total Value Locked)
- Risk Score
- Performance (24h change)
- Name (Alphabetical)

### **Comparison Features**:
- Multi-select strategies
- Side-by-side analysis
- Risk vs Return visualization
- Performance metrics
- Recommendation engine

### **Real-time Updates**:
- Live APY changes
- TVL fluctuations
- Health status monitoring
- Performance tracking

---

## **7. Portfolio Analytics 📈**

### **Purpose**: Detailed portfolio performance analysis

### **Logic Flow**:
```
Wallet Check → Data Aggregation → Analysis → Visualization → Insights
     ↓             ↓               ↓          ↓              ↓
- Connect     - Portfolio      - Calculate - Charts       - Recommendations
- Wallet      - Metrics        - Returns   - Graphs       - Optimizations
- Validate    - Performance    - Risk      - Tables       - Actions
- Address     - Attribution    - Yield     - Breakdown    - Export
```

### **4 Analysis Views**:

#### **Overview**
- Total portfolio value
- Performance summary
- Asset allocation
- Recent changes

#### **Performance**
- Historical returns
- Benchmark comparison
- Risk-adjusted metrics
- Volatility analysis

#### **Risk Analysis**
- Risk score calculation
- Diversification metrics
- Correlation analysis
- Stress testing

#### **Yield Tracking**
- Yield breakdown by strategy
- Compound interest effects
- Yield optimization suggestions
- Historical yield performance

### **Time Frames**:
- 7 Days, 30 Days, 90 Days, 1 Year
- Custom date ranges
- Real-time updates

---

## **8. Vault Page 🏦**

### **Purpose**: Direct vault interaction and management

### **Logic Flow**:
```
Connection → Vault Data → Operations → Calculations → Execution → Monitoring
    ↓           ↓           ↓           ↓             ↓           ↓
- Check     - Load       - Deposit   - Shares      - Send      - Track
- Wallet    - Balances   - Withdraw  - Assets      - Transaction - Status
- Status    - Shares     - Claim     - Real-time   - Wait      - Refresh
- Network   - Yield      - Emergency - Updates     - Confirm   - Update
```

### **Core Operations**:
- **Deposit**: Add BNB to vault, receive shares
- **Withdraw**: Redeem shares for BNB
- **Withdraw Shares**: Direct share redemption
- **Claim Yield**: Harvest earned rewards
- **Emergency Withdraw**: Emergency exit function

### **Real-time Calculations**:
- Shares ↔ Assets conversion
- Current exchange rates
- Yield calculations
- Gas estimations

### **Advanced Features**:
- Adapter management
- Health monitoring
- Performance tracking
- Transaction history

---

## **9. Settings ⚙️**

### **Purpose**: User preferences and system configuration

### **Logic Flow**:
```
Tab Selection → Load Settings → Modify → Validate → Save → Apply
     ↓             ↓            ↓       ↓         ↓      ↓
- Choose Tab   - Fetch       - Edit   - Check   - Store - Update
- Category     - Current     - Values - Rules   - Data  - System
- Navigate     - Config      - Update - Format  - Persist - Refresh
```

### **6 Settings Categories**:

#### **Profile** 👤
- Personal information
- Investment preferences
- Risk tolerance
- Experience level

#### **Security** 🔒
- Two-factor authentication
- Session management
- Security alerts
- Device management

#### **Risk & Trading** 🛡️
- Risk parameters
- Trading limits
- Auto-execution rules
- Stop-loss settings

#### **Wallets** 💰
- Connected wallets
- Address management
- Network preferences
- Backup settings

#### **Notifications** 🔔
- Alert preferences
- Communication channels
- Frequency settings
- Event subscriptions

#### **Developer** 💻
- API keys
- Webhook URLs
- Debug settings
- Advanced options

---

## **10. Proof of Yield 🛡️**

### **Purpose**: Transparent yield verification and audit trail

### **Logic Flow**:
```
Data Collection → Verification → Audit Trail → Proof Generation → Export
      ↓              ↓             ↓             ↓                ↓
- Gather        - Oracle      - Transaction - Generate        - Download
- Yield Data    - Validation  - History     - Certificates   - Reports
- Sources       - Cross-check - Timestamps  - Signatures     - Share
- Real-time     - Accuracy    - Immutable   - Verification   - Audit
```

### **Verification Sources**:
- **On-chain Data**: Direct blockchain verification
- **Oracle Feeds**: Chainlink, Venus, PancakeSwap price feeds
- **Protocol APIs**: Real-time yield calculations
- **Transaction History**: Complete audit trail

### **Proof Components**:
- **Yield Breakdown**: Source-by-source yield attribution
- **Oracle Data**: Price feeds and rate verification
- **Transaction Proof**: On-chain transaction verification
- **Performance Metrics**: Historical yield performance
- **Audit Trail**: Complete transaction history

### **Export Features**:
- PDF reports
- CSV data export
- Blockchain verification links
- Shareable proof certificates

---

## **11. Activity Timeline 📅**

### **Purpose**: Comprehensive activity tracking and history

### **Logic Flow**:
```
Data Sources → Activity Aggregation → Filtering → Display → Actions
     ↓              ↓                  ↓          ↓        ↓
- On-chain     - Combine            - Type     - Timeline - View Details
- Local        - Activities         - Status   - Cards    - Navigate
- API          - Sort by Time       - Date     - Icons    - Retry
- Real-time    - Categorize         - Search   - Status   - Export
```

### **Activity Types**:
- **Deposits**: BNB deposits to strategies
- **Withdrawals**: Asset withdrawals and redemptions
- **Rebalancing**: Strategy allocation changes
- **Yield**: Earned rewards and compound interest
- **AI Decisions**: Automated recommendations and actions

### **Status Tracking**:
- **Completed**: ✅ Successful transactions
- **Pending**: ⏳ In-progress transactions
- **Failed**: ❌ Failed or reverted transactions

### **Data Sources**:
- On-chain transaction data
- Local activity cache
- API activity feeds
- Real-time monitoring

---

## **12. Venus Page 🌟**

### **Purpose**: Direct Venus Protocol integration

### **Logic Flow**:
```
Connection → Venus Data → Operations → Monitoring → Analytics
    ↓           ↓           ↓           ↓            ↓
- Wallet    - Stats      - Supply    - Real-time  - Performance
- Venus     - Position   - Redeem    - Updates    - Analytics
- Protocol  - Health     - Monitor   - Alerts     - Market Data
- Status    - Rates      - Yield     - Status     - Insights
```

### **Core Features**:
- **Supply BNB**: Lend BNB to Venus Protocol
- **Redeem**: Withdraw supplied BNB plus interest
- **Health Monitoring**: Collateral and liquidation tracking
- **Yield Tracking**: Real-time yield calculations
- **Analytics**: Performance and market analysis

### **Real-time Data**:
- Exchange rates
- Supply rates
- User yield
- Total yield
- Market conditions

---

## **13. Documentation 📚**

### **Purpose**: Technical documentation and guides

### **Logic Flow**:
```
Page Load → Content Display → Navigation → Search → Interactive Examples
    ↓           ↓               ↓           ↓        ↓
- Load      - Show           - Menu      - Find   - Code Samples
- Docs      - Sections       - Links     - Topics - Live Examples
- Structure - Content        - Breadcrumb- Results - Try Now
```

### **Documentation Sections**:
- **Getting Started**: Quick start guide
- **API Reference**: Complete API documentation
- **Smart Contracts**: Contract addresses and ABIs
- **Integration Guide**: How to integrate with AION
- **Troubleshooting**: Common issues and solutions

---

## 🔄 **Cross-Page Data Flow**

### **Shared Data Sources**:
```
useStrategies() ──┐
useRealData() ────┼─→ All Pages (Real-time market data)
useVaultOnchain() ┘

useWalletOnchain() ──→ Dashboard, Execute, Vault, Analytics
useAIAgent() ────────→ Agent Studio, Dashboard (recommendations)
settingsService ─────→ Settings, All Pages (user preferences)
```

### **Navigation Flow**:
```
Landing → Dashboard → Execute → Advanced Operations
   ↓         ↓          ↓              ↓
Connect   Overview   Actions      Automation
Wallet    Status     Execute      Setup
          ↓          ↓              ↓
      Analytics   Strategies    Agent Studio
      Portfolio   Explorer      AI Chat
          ↓          ↓              ↓
      Settings    Vault Page    Activity
      Config      Direct        Timeline
                  Control       History
```

---

## 🚀 **Performance Optimizations**

### **Data Loading Strategy**:
- **Lazy Loading**: Load data only when needed
- **Caching**: Cache frequently accessed data
- **Real-time Updates**: WebSocket connections for live data
- **Fallback Data**: Graceful degradation with mock data

### **User Experience**:
- **Loading States**: Skeleton screens and spinners
- **Error Handling**: Graceful error recovery
- **Offline Support**: Cached data when offline
- **Progressive Enhancement**: Core functionality first

---

## 📊 **State Management**

### **Global State**:
- User authentication status
- Wallet connection state
- Market data cache
- User preferences

### **Page-Specific State**:
- Form inputs and validation
- UI state (tabs, modals, etc.)
- Local data cache
- Component state

---

This comprehensive logic documentation provides a complete understanding of how each page in the AION DeFi Platform operates, their interconnections, and the overall user journey through the application.