import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { 
  transactionHistoryService, 
  Transaction, 
  TransactionSummary 
} from '../../services/transactionHistoryService';
import { 
  History, 
  Download, 
  RefreshCw, 
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  Target,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  ExternalLink
} from 'lucide-react';
import { ethers, BigNumber, utils } from '../../utils/ethersCompat';

interface TransactionHistoryCardProps {
  userAddress?: string;
  className?: string;
  maxItems?: number;
}

export function TransactionHistoryCard({ 
  userAddress, 
  className = '', 
  maxItems = 10 
}: TransactionHistoryCardProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<TransactionSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'deposit' | 'withdraw' | 'yield' | 'rebalance'>('all');
  const [timeframe, setTimeframe] = useState<'week' | 'month' | 'year'>('month');

  useEffect(() => {
    if (userAddress) {
      loadTransactionHistory();
      loadSummary();
      
      // Start real-time monitoring
      transactionHistoryService.startTransactionMonitoring(userAddress, (newTx) => {
        setTransactions(prev => [newTx, ...prev.slice(0, maxItems - 1)]);
      });

      return () => {
        transactionHistoryService.stopTransactionMonitoring();
      };
    }
  }, [userAddress, maxItems]);

  useEffect(() => {
    if (userAddress) {
      loadSummary();
    }
  }, [timeframe, userAddress]);

  const loadTransactionHistory = async () => {
    if (!userAddress) return;
    
    try {
      setIsLoading(true);
      const txs = await transactionHistoryService.getTransactionHistory(userAddress, maxItems * 2);
      setTransactions(txs);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSummary = async () => {
    if (!userAddress) return;
    
    try {
      const summaryData = await transactionHistoryService.getTransactionSummary(userAddress, timeframe);
      setSummary(summaryData);
    } catch (error) {
      console.error('Error loading summary:', error);
    }
  };

  const handleExport = async () => {
    if (!userAddress) return;
    
    try {
      const csvData = await transactionHistoryService.exportTransactions(userAddress, 'csv');
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `transactions_${userAddress.slice(0, 8)}_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting transactions:', error);
    }
  };

  const getTransactionIcon = (type: Transaction['type']) => {
    switch (type) {
      case 'deposit':
        return <ArrowDownLeft className="w-4 h-4 text-green-400" />;
      case 'withdraw':
      case 'withdrawShares':
        return <ArrowUpRight className="w-4 h-4 text-red-400" />;
      case 'claimYield':
        return <Target className="w-4 h-4 text-gold-500" />;
      case 'rebalance':
        return <Zap className="w-4 h-4 text-blue-400" />;
      default:
        return <History className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusIcon = (status: Transaction['status']) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="w-3 h-3 text-green-400" />;
      case 'pending':
        return <Clock className="w-3 h-3 text-yellow-400" />;
      case 'failed':
        return <XCircle className="w-3 h-3 text-red-400" />;
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    if (filter === 'all') return true;
    if (filter === 'deposit') return tx.type === 'deposit';
    if (filter === 'withdraw') return tx.type === 'withdraw' || tx.type === 'withdrawShares';
    if (filter === 'yield') return tx.type === 'claimYield';
    if (filter === 'rebalance') return tx.type === 'rebalance';
    return true;
  }).slice(0, maxItems);

  if (!userAddress) {
    return (
      <Card className={className}>
        <div className="text-center py-8">
          <History className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400">Connect wallet to view transaction history</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <History className="w-5 h-5 text-gold-500" />
          <h3 className="text-lg font-semibold text-white">Transaction History</h3>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            icon={Download}
            onClick={handleExport}
          >
            Export
          </Button>
          <Button
            size="sm"
            variant="ghost"
            icon={RefreshCw}
            onClick={loadTransactionHistory}
            disabled={isLoading}
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-dark-700/30 rounded-xl p-3">
            <p className="text-xs text-gray-400">Total Transactions</p>
            <p className="text-lg font-bold text-white">{summary.totalTransactions}</p>
          </div>
          <div className="bg-dark-700/30 rounded-xl p-3">
            <p className="text-xs text-gray-400">Total Volume</p>
            <p className="text-lg font-bold text-white">${summary.totalVolumeUSD.toFixed(0)}</p>
          </div>
          <div className="bg-dark-700/30 rounded-xl p-3">
            <p className="text-xs text-gray-400">Gas Fees</p>
            <p className="text-lg font-bold text-white">${summary.totalGasFeesUSD.toFixed(2)}</p>
          </div>
          <div className="bg-dark-700/30 rounded-xl p-3">
            <p className="text-xs text-gray-400">Yield Claims</p>
            <p className="text-lg font-bold text-green-400">{summary.yieldClaims}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4">
        <div className="flex bg-dark-800 rounded-lg p-1">
          {(['all', 'deposit', 'withdraw', 'yield', 'rebalance'] as const).map((filterType) => (
            <button
              key={filterType}
              onClick={() => setFilter(filterType)}
              className={`px-3 py-1 text-xs rounded capitalize ${
                filter === filterType
                  ? 'bg-gold-500 text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {filterType}
            </button>
          ))}
        </div>
        
        <div className="flex bg-dark-800 rounded-lg p-1">
          {(['week', 'month', 'year'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-3 py-1 text-xs rounded capitalize ${
                timeframe === tf
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse bg-dark-700/30 rounded-xl p-3 h-16" />
            ))}
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">No transactions found</p>
          </div>
        ) : (
          filteredTransactions.map((tx) => (
            <motion.div
              key={tx.id}
              className="flex items-center justify-between p-3 bg-dark-700/30 rounded-xl hover:bg-dark-600/30 transition-colors cursor-pointer"
              whileHover={{ scale: 1.01 }}
              onClick={() => window.open(`https://bscscan.com/tx/${tx.hash}`, '_blank')}
            >
              <div className="flex items-center gap-3">
                {getTransactionIcon(tx.type)}
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-white capitalize">
                      {tx.type.replace(/([A-Z])/g, ' $1').toLowerCase()}
                    </p>
                    {getStatusIcon(tx.status)}
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-400">
                      {tx.timestamp.toLocaleDateString()} {tx.timestamp.toLocaleTimeString()}
                    </p>
                    {tx.protocol && (
                      <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded">
                        {tx.protocol}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="text-right">
                <p className="text-sm font-semibold text-white">
                  {parseFloat(utils.formatEther(tx.amount)).toFixed(4)} BNB
                </p>
                <p className="text-xs text-gray-400">
                  ${tx.amountUSD.toFixed(2)}
                </p>
              </div>
              
              <ExternalLink className="w-4 h-4 text-gray-500" />
            </motion.div>
          ))
        )}
      </div>

      {/* Real-time indicator */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-gray-400">Real-time monitoring active</span>
          </div>
          <span className="text-gray-500">
            Showing {filteredTransactions.length} of {transactions.length} transactions
          </span>
        </div>
      </div>
    </Card>
  );
}