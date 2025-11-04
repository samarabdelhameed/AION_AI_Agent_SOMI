import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Shield, Zap, AlertCircle } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { formatCurrency, formatPercentage } from '../../lib/utils';
import { Page } from '../../App';

interface VaultCardProps {
  balance: number;
  shares: number;
  dailyProfit: number;
  apy: number;
  strategy: string;
  onNavigate: (page: Page) => void;
  error?: string | null;
  loading?: boolean;
}

export function VaultCard({ 
  balance, 
  shares, 
  dailyProfit, 
  apy, 
  strategy, 
  onNavigate, 
  error, 
  loading = false 
}: VaultCardProps) {
  
  // Helper function to render value with error handling
  const renderValue = (value: number, label: string, isCurrency: boolean = false) => {
    if (loading) {
      return (
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded mb-1"></div>
          <div className="h-3 bg-gray-700 rounded w-16"></div>
        </div>
      );
    }
    
    if (error) {
      return (
        <div>
          <div className="flex items-center gap-2 text-red-400 mb-1">
            <AlertCircle size={16} />
            <span className="text-sm">Error loading data</span>
          </div>
          <p className="text-xs text-gray-500">Check connection</p>
        </div>
      );
    }
    
    if (value === 0 || isNaN(value)) {
      return (
        <div>
          <p className="text-lg font-semibold text-gray-400">No position</p>
          <p className="text-xs text-gray-500">Deposit to start earning</p>
        </div>
      );
    }
    
    return (
      <>
        <motion.p 
          className={`text-xl font-bold ${isCurrency ? 'text-white' : 'text-neon-cyan'}`}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring' }}
          title={isCurrency ? `${value.toFixed(6)} BNB` : `${value.toFixed(6)} shares`}
        >
          {isCurrency ? formatCurrency(value) : value.toLocaleString()}
        </motion.p>
        <p className="text-xs text-white/50 font-mono">
          {isCurrency ? `${value.toFixed(6)} BNB` : `${value.toFixed(6)} shares`}
        </p>
      </>
    );
  };

  // Helper function to render profit with proper formatting
  const renderProfit = (profit: number) => {
    if (loading) {
      return <div className="h-6 bg-gray-700 rounded animate-pulse"></div>;
    }
    
    if (error) {
      return (
        <div className="flex items-center gap-2 text-red-400">
          <AlertCircle size={16} />
          <span className="text-sm">Error</span>
        </div>
      );
    }
    
    if (profit === 0 || isNaN(profit)) {
      return <span className="text-gray-400">No yield yet</span>;
    }
    
    return (
      <span className={`text-lg font-semibold ${profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
        {profit >= 0 ? '+' : ''}{formatCurrency(profit)}
      </span>
    );
  };

  // Helper function to render APY
  const renderAPY = (apyValue: number) => {
    if (loading) {
      return <div className="h-4 bg-gray-700 rounded animate-pulse"></div>;
    }
    
    if (error || isNaN(apyValue)) {
      return <span className="text-gray-400">--</span>;
    }
    
    return (
      <span className="text-lg font-semibold text-gold-500">
        {formatPercentage(apyValue)}
      </span>
    );
  };

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/5 to-gold-500/5" />
      
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-neon-cyan to-gold-500 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-dark-900" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Vault Position</h3>
              <p className="text-sm text-gray-400">{strategy}</p>
            </div>
          </div>
          
          <motion.div
            className="flex items-center gap-1 text-green-400"
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <TrendingUp size={16} />
            <span className="text-sm font-medium">{renderAPY(apy)}</span>
          </motion.div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-sm text-gray-400 mb-1">Total Balance</p>
            {renderValue(balance, 'Total Balance', true)}
          </div>
          
          <div>
            <p className="text-sm text-gray-400 mb-1">Shares</p>
            {renderValue(shares, 'Shares', false)}
          </div>
          
          <div>
            <p className="text-sm text-gray-400 mb-1">Daily Profit</p>
            {renderProfit(dailyProfit)}
          </div>
          
          <div>
            <p className="text-sm text-gray-400 mb-1">Current APY</p>
            {renderAPY(apy)}
          </div>
        </div>

        <div className="flex gap-3">
          <Button 
            size="sm" 
            className="flex-1" 
            icon={Zap}
            onClick={() => onNavigate('execute')}
            disabled={loading}
          >
            Execute
          </Button>
          <Button 
            size="sm" 
            variant="secondary" 
            className="flex-1"
            onClick={() => onNavigate('agent')}
            disabled={loading}
          >
            Simulate
          </Button>
        </div>
      </div>
    </Card>
  );
}