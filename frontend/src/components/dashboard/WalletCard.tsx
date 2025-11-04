import React from 'react';
import { motion } from 'framer-motion';
import { Wallet, Copy, ExternalLink } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { formatCurrency, truncateAddress } from '../../lib/utils';
import { Page } from '../../App';

interface WalletCardProps {
  address: string;
  network: string;
  balance: {
    BNB?: number;
    ETH?: number;
    USDC?: number;
  };
  onNavigate: (page: Page) => void;
}

export function WalletCard({ address, network, balance, onNavigate }: WalletCardProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(address);
    // Toast notification here
  };

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-gold-500/5 to-neon-cyan/5" />
      
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-gold-500 to-neon-cyan rounded-xl flex items-center justify-center">
              <Wallet className="w-5 h-5 text-dark-900" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Wallet</h3>
              <p className="text-sm text-gray-400">{network}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleCopy}
              className="p-2 text-gray-400 hover:text-gold-500 transition-colors"
            >
              <Copy size={16} />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              className="p-2 text-gray-400 hover:text-gold-500 transition-colors"
            >
              <ExternalLink size={16} />
            </motion.button>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-400 mb-1">Address</p>
          <p className="text-white font-mono">{truncateAddress(address)}</p>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-400">Balance</h4>
          {Object.entries(balance).map(([currency, amount]) => (
            <motion.div
              key={currency}
              className="flex justify-between items-center"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <span className="text-white">{currency}</span>
              <span className="text-gold-500 font-semibold">
                {formatCurrency(amount || 0)}
              </span>
            </motion.div>
          ))}
        </div>

        <div className="mt-6 flex gap-3">
          <Button 
            size="sm" 
            className="flex-1"
            onClick={() => onNavigate('execute')}
          >
            Deposit
          </Button>
          <Button 
            size="sm" 
            variant="secondary" 
            className="flex-1"
            onClick={() => onNavigate('execute')}
          >
            Withdraw
          </Button>
        </div>
      </div>
    </Card>
  );
}