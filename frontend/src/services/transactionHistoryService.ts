import { ethers, BigNumber, utils, BrowserProvider, Contract } from '../utils/ethersCompat';
import { vaultService } from './vaultService';

export interface Transaction {
  id: string;
  hash: string;
  type: 'deposit' | 'withdraw' | 'withdrawShares' | 'claimYield' | 'rebalance' | 'emergencyWithdraw';
  amount: BigNumber;
  amountUSD: number;
  timestamp: Date;
  blockNumber: number;
  gasUsed: BigNumber;
  gasPrice: BigNumber;
  status: 'pending' | 'confirmed' | 'failed';
  from: string;
  to: string;
  protocol?: string;
  strategy?: string;
}

export interface TransactionSummary {
  totalTransactions: number;
  totalVolume: BigNumber;
  totalVolumeUSD: number;
  totalGasFees: BigNumber;
  totalGasFeesUSD: number;
  deposits: number;
  withdrawals: number;
  yieldClaims: number;
  rebalances: number;
}

export interface TaxReport {
  taxYear: number;
  totalIncome: number;
  totalCapitalGains: number;
  totalCapitalLosses: number;
  netCapitalGains: number;
  transactions: TaxTransaction[];
  summary: TaxSummary;
}

export interface TaxTransaction {
  date: Date;
  type: 'income' | 'capital_gain' | 'capital_loss';
  amount: number;
  description: string;
  transactionHash: string;
}

export interface TaxSummary {
  totalTaxableIncome: number;
  totalDeductibleLosses: number;
  netTaxableAmount: number;
  estimatedTaxLiability: number;
}

class TransactionHistoryService {
  private bnbPriceUSD: number = 326.12;
  private transactions: Map<string, Transaction[]> = new Map();

  async getTransactionHistory(userAddress: string, limit: number = 50): Promise<Transaction[]> {
    try {
      console.log('📜 Fetching transaction history for:', userAddress);

      // Check cache first
      const cached = this.transactions.get(userAddress);
      if (cached && cached.length > 0) {
        return cached.slice(0, limit);
      }

      // Fetch from blockchain
      const transactions = await this.fetchBlockchainTransactions(userAddress);
      
      // Cache results
      this.transactions.set(userAddress, transactions);
      
      console.log(`✅ Found ${transactions.length} transactions`);
      return transactions.slice(0, limit);
    } catch (error) {
      console.error('❌ Error fetching transaction history:', error);
      return this.getMockTransactions(userAddress, limit);
    }
  }

  private async fetchBlockchainTransactions(userAddress: string): Promise<Transaction[]> {
    // In a real implementation, this would query blockchain events
    // For now, return mock data with realistic structure
    return this.getMockTransactions(userAddress, 50);
  }

  private getMockTransactions(userAddress: string, count: number): Transaction[] {
    const transactions: Transaction[] = [];
    const now = new Date();

    const transactionTypes: Transaction['type'][] = [
      'deposit', 'withdraw', 'withdrawShares', 'claimYield', 'rebalance'
    ];

    const protocols = ['Venus', 'Beefy', 'PancakeSwap', 'Aave'];
    const strategies = ['Venus Lending', 'Beefy Farming', 'LP Staking', 'Aave Lending'];

    for (let i = 0; i < count; i++) {
      const type = transactionTypes[Math.floor(Math.random() * transactionTypes.length)];
      const amount = utils.parseEther((Math.random() * 5 + 0.1).toFixed(4));
      const amountUSD = parseFloat(utils.formatEther(amount)) * this.bnbPriceUSD;
      
      const timestamp = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000) - Math.random() * 24 * 60 * 60 * 1000);
      
      transactions.push({
        id: `tx_${i}_${Date.now()}`,
        hash: `0x${Math.random().toString(16).substr(2, 64)}`,
        type,
        amount,
        amountUSD,
        timestamp,
        blockNumber: 12345678 - i * 100,
        gasUsed: BigNumber.from(Math.floor(Math.random() * 200000 + 50000)),
        gasPrice: utils.parseUnits((Math.random() * 10 + 5).toFixed(2), 'gwei'),
        status: Math.random() > 0.05 ? 'confirmed' : 'failed',
        from: userAddress,
        to: '0x' + Math.random().toString(16).substr(2, 40),
        protocol: protocols[Math.floor(Math.random() * protocols.length)],
        strategy: strategies[Math.floor(Math.random() * strategies.length)]
      });
    }

    return transactions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async getTransactionSummary(userAddress: string, timeframe: 'week' | 'month' | 'year' = 'month'): Promise<TransactionSummary> {
    try {
      const transactions = await this.getTransactionHistory(userAddress, 1000);
      
      const cutoffDate = new Date();
      switch (timeframe) {
        case 'week':
          cutoffDate.setDate(cutoffDate.getDate() - 7);
          break;
        case 'month':
          cutoffDate.setMonth(cutoffDate.getMonth() - 1);
          break;
        case 'year':
          cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
          break;
      }

      const filteredTxs = transactions.filter(tx => tx.timestamp >= cutoffDate && tx.status === 'confirmed');

      const summary: TransactionSummary = {
        totalTransactions: filteredTxs.length,
        totalVolume: filteredTxs.reduce((sum, tx) => sum.add(tx.amount), BigNumber.from(0)),
        totalVolumeUSD: filteredTxs.reduce((sum, tx) => sum + tx.amountUSD, 0),
        totalGasFees: filteredTxs.reduce((sum, tx) => sum.add(tx.gasUsed.mul(tx.gasPrice)), BigNumber.from(0)),
        totalGasFeesUSD: 0, // Will be calculated
        deposits: filteredTxs.filter(tx => tx.type === 'deposit').length,
        withdrawals: filteredTxs.filter(tx => tx.type === 'withdraw' || tx.type === 'withdrawShares').length,
        yieldClaims: filteredTxs.filter(tx => tx.type === 'claimYield').length,
        rebalances: filteredTxs.filter(tx => tx.type === 'rebalance').length
      };

      summary.totalGasFeesUSD = parseFloat(utils.formatEther(summary.totalGasFees)) * this.bnbPriceUSD;

      return summary;
    } catch (error) {
      console.error('❌ Error calculating transaction summary:', error);
      throw error;
    }
  }

  async generateTaxReport(userAddress: string, taxYear: number): Promise<TaxReport> {
    try {
      console.log(`📊 Generating tax report for ${taxYear}...`);

      const transactions = await this.getTransactionHistory(userAddress, 1000);
      
      const yearStart = new Date(taxYear, 0, 1);
      const yearEnd = new Date(taxYear, 11, 31, 23, 59, 59);
      
      const yearTransactions = transactions.filter(tx => 
        tx.timestamp >= yearStart && 
        tx.timestamp <= yearEnd && 
        tx.status === 'confirmed'
      );

      const taxTransactions: TaxTransaction[] = [];
      let totalIncome = 0;
      let totalCapitalGains = 0;
      let totalCapitalLosses = 0;

      // Process yield claims as income
      const yieldClaims = yearTransactions.filter(tx => tx.type === 'claimYield');
      for (const claim of yieldClaims) {
        const income = claim.amountUSD;
        totalIncome += income;
        
        taxTransactions.push({
          date: claim.timestamp,
          type: 'income',
          amount: income,
          description: `Yield claimed from ${claim.protocol}`,
          transactionHash: claim.hash
        });
      }

      // Process deposits/withdrawals for capital gains/losses
      const deposits = yearTransactions.filter(tx => tx.type === 'deposit');
      const withdrawals = yearTransactions.filter(tx => tx.type === 'withdraw' || tx.type === 'withdrawShares');

      // Simplified capital gains calculation (FIFO method)
      let totalDeposited = 0;
      let totalWithdrawn = 0;

      deposits.forEach(deposit => {
        totalDeposited += deposit.amountUSD;
      });

      withdrawals.forEach(withdrawal => {
        totalWithdrawn += withdrawal.amountUSD;
        
        // Simplified: assume any withdrawal above deposited amount is capital gain
        if (totalWithdrawn > totalDeposited) {
          const gain = withdrawal.amountUSD - (totalDeposited - (totalWithdrawn - withdrawal.amountUSD));
          if (gain > 0) {
            totalCapitalGains += gain;
            taxTransactions.push({
              date: withdrawal.timestamp,
              type: 'capital_gain',
              amount: gain,
              description: `Capital gain from withdrawal`,
              transactionHash: withdrawal.hash
            });
          }
        }
      });

      const netCapitalGains = totalCapitalGains - totalCapitalLosses;

      const summary: TaxSummary = {
        totalTaxableIncome: totalIncome,
        totalDeductibleLosses: totalCapitalLosses,
        netTaxableAmount: totalIncome + Math.max(0, netCapitalGains),
        estimatedTaxLiability: (totalIncome + Math.max(0, netCapitalGains)) * 0.25 // Estimated 25% tax rate
      };

      const report: TaxReport = {
        taxYear,
        totalIncome,
        totalCapitalGains,
        totalCapitalLosses,
        netCapitalGains,
        transactions: taxTransactions,
        summary
      };

      console.log('✅ Tax report generated:', {
        transactions: taxTransactions.length,
        totalIncome,
        netCapitalGains,
        estimatedTax: summary.estimatedTaxLiability
      });

      return report;
    } catch (error) {
      console.error('❌ Error generating tax report:', error);
      throw error;
    }
  }

  async exportTransactions(userAddress: string, format: 'csv' | 'json' = 'csv'): Promise<string> {
    try {
      const transactions = await this.getTransactionHistory(userAddress, 1000);
      
      if (format === 'json') {
        return JSON.stringify(transactions, null, 2);
      }

      // CSV format
      const headers = [
        'Date', 'Type', 'Amount (BNB)', 'Amount (USD)', 'Hash', 
        'Block', 'Gas Used', 'Gas Price', 'Status', 'Protocol', 'Strategy'
      ];

      const csvRows = [headers.join(',')];
      
      transactions.forEach(tx => {
        const row = [
          tx.timestamp.toISOString(),
          tx.type,
          utils.formatEther(tx.amount),
          tx.amountUSD.toFixed(2),
          tx.hash,
          tx.blockNumber.toString(),
          tx.gasUsed.toString(),
          utils.formatUnits(tx.gasPrice, 'gwei'),
          tx.status,
          tx.protocol || '',
          tx.strategy || ''
        ];
        csvRows.push(row.join(','));
      });

      return csvRows.join('\n');
    } catch (error) {
      console.error('❌ Error exporting transactions:', error);
      throw error;
    }
  }

  async refreshTransactionHistory(userAddress: string): Promise<void> {
    try {
      console.log('🔄 Refreshing transaction history...');
      
      // Clear cache
      this.transactions.delete(userAddress);
      
      // Fetch fresh data
      await this.getTransactionHistory(userAddress);
      
      console.log('✅ Transaction history refreshed');
    } catch (error) {
      console.error('❌ Error refreshing transaction history:', error);
      throw error;
    }
  }

  // Real-time transaction monitoring
  startTransactionMonitoring(userAddress: string, callback: (transaction: Transaction) => void): void {
    console.log('👂 Starting transaction monitoring for:', userAddress);
    
    // In a real implementation, this would listen to blockchain events
    // For demo, simulate new transactions periodically
    const interval = setInterval(() => {
      if (Math.random() < 0.1) { // 10% chance every 30 seconds
        const newTx = this.getMockTransactions(userAddress, 1)[0];
        newTx.status = 'pending';
        
        // Add to cache
        const cached = this.transactions.get(userAddress) || [];
        cached.unshift(newTx);
        this.transactions.set(userAddress, cached);
        
        callback(newTx);
        
        // Simulate confirmation after 30 seconds
        setTimeout(() => {
          newTx.status = 'confirmed';
          callback(newTx);
        }, 30000);
      }
    }, 30000);

    // Store interval for cleanup
    (this as any).monitoringInterval = interval;
  }

  stopTransactionMonitoring(): void {
    if ((this as any).monitoringInterval) {
      clearInterval((this as any).monitoringInterval);
      (this as any).monitoringInterval = null;
      console.log('⏹️ Transaction monitoring stopped');
    }
  }
}

export const transactionHistoryService = new TransactionHistoryService();