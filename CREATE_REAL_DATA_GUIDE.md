# 📊 Real Data Creation Guide - SeiMoney

## 🎯 Objective

Create real data in the project so the dashboard displays real numbers instead of zeros.

---

## 🚀 Steps

### 1. Start the Project

```bash
./start-all.sh
```

Wait until you see: "🚀 All Services Started Successfully!"

### 2. Open the Website

- Go to: http://localhost:5175
- Make sure the website is working

### 3. Connect Wallet

- Click "Connect Wallet"
- Choose any available wallet (MetaMask for example)
- **Important:** The wallet must be connected to create data

### 4. Create Transfers

1. Go to **Payments** page
2. Fill out the form:
   - **Recipient:** `sei1abc123def456ghi789jkl012mno345pqr678stu` (dummy address)
   - **Amount:** `10.5`
   - **Remark:** `Test transfer`
3. Click **Send**
4. Repeat the process 2-3 times with different amounts

### 5. Create Groups

1. Go to **Groups** page
2. Click **Create Group**
3. Fill in the data:
   - **Name:** `Test Group 1`
   - **Description:** `This is a test group`
   - **Target Amount:** `1000`
   - **Type:** `savings`
4. Save the group
5. Repeat the process to create 2-3 groups

### 6. Create Savings Pots

1. Go to **Pots** page
2. Click **Create Pot**
3. Fill in the data:
   - **Name:** `Emergency Fund`
   - **Target Amount:** `5000`
   - **Target Date:** `2024-12-31`
   - **Description:** `Emergency savings pot`
4. Save the pot
5. Add initial amount (e.g., 100 SEI)
6. Repeat the process to create 2-3 pots

### 7. Create Vaults

1. Go to **Vaults** page
2. Click **Create Vault**
3. Fill in the data:
   - **Name:** `High Yield Vault`
   - **Strategy:** `yield-farming`
   - **Initial Deposit:** `500`
   - **Lock Period:** `30 days`
4. Save the vault
5. Repeat the process to create 2-3 vaults

### 8. Return to Dashboard

1. Go to **Dashboard** page
2. Click **Refresh** button (🔄)
3. Wait a few seconds
4. **Result:** You will see real numbers!

---

## 📈 Expected Result

After creating data, the dashboard will display:

### Portfolio Overview

- **Total Portfolio:** Sum of all your investments
- **Daily P&L:** Daily profit/loss
- **Active Vaults:** Number of active vaults
- **Group Pools:** Number of active groups

### Charts & Graphs

- **Portfolio Performance:** Chart showing portfolio performance
- **Savings Progress:** Progress of savings goals
- **Recent Activity:** Latest operations

### Real Numbers Example

```
Total Portfolio: 1,650.75 SEI
Daily P&L: +33.02 SEI (+2.04%)
Active Vaults: 3
Group Pools: 2
```

---

## 🐛 If Data Doesn't Appear

### Check:

1. **Wallet Connected:** Make sure wallet address is visible in Navbar
2. **Data Saved:** Make sure operations succeeded (success messages)
3. **Refresh:** Click refresh button in dashboard
4. **Console:** Open F12 and check for errors

### If Operations Failed:

1. **Check Backend:** http://localhost:3001/health/health
2. **Restart Project:** `./stop-all.sh` then `./start-all.sh`
3. **Check Logs:** `tail -f logs/backend.log`

---

## ⚡ Quick Tips

### To Get Data Quickly:

1. **Start with Transfers** - Easiest and fastest
2. **Use Small Amounts** - For testing only
3. **Create 3-5 Operations** - Enough to see data
4. **Click Refresh** - After each operation

### To Get Rich Data:

1. **Create Different Types** - Transfers, groups, pots, vaults
2. **Use Different Dates** - To see time progress
3. **Add Descriptions** - To distinguish operations
4. **Try Different Scenarios** - Savings, investment, transfers

---

## 🎉 Final Result

After following these steps, you will have:

- ✅ Dashboard filled with real data
- ✅ Interactive charts and graphs
- ✅ Accurate statistics
- ✅ Complete user experience

**Congratulations! 🎊 Now you have a real DeFi project working completely!**
