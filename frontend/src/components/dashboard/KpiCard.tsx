import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { Card } from '../ui/Card';
import { formatNumber, formatPercentage, formatCurrency } from '../../lib/utils';

interface KpiCardProps {
  title: string;
  value: number;
  change?: number;
  icon: LucideIcon;
  format?: 'currency' | 'number' | 'percentage';
  delay?: number;
  isLive?: boolean;
  'data-testid'?: string;
}

export function KpiCard({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  format = 'number',
  delay = 0,
  isLive = false,
  'data-testid': testId
}: KpiCardProps) {
  const formatValue = () => {
    switch (format) {
      case 'currency':
        return formatCurrency(value);
      case 'percentage':
        return formatPercentage(value);
      default:
        return formatNumber(value);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <Card className="relative overflow-hidden" data-testid={testId}>
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-gold-500/10 to-neon-cyan/10 opacity-50" />
        
        {/* Live indicator */}
        {isLive && (
          <div className="absolute top-3 right-3">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs text-green-400 font-medium">LIVE</span>
            </div>
          </div>
        )}
        
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400 mb-1">{title}</p>
            <motion.p 
              className="text-2xl font-bold text-white"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: delay + 0.2, type: 'spring' }}
            >
              {formatValue()}
            </motion.p>
            {change !== undefined && (
              <motion.p 
                className={`text-sm ${change >= 0 ? 'text-green-400' : 'text-red-400'}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: delay + 0.4 }}
              >
                {change >= 0 ? '+' : ''}{change.toFixed(2)}%
              </motion.p>
            )}
          </div>
          
          <motion.div
            className="w-12 h-12 bg-gradient-to-r from-gold-500 to-neon-cyan rounded-xl flex items-center justify-center"
            whileHover={{ scale: 1.1, rotate: 10 }}
            transition={{ type: 'spring' }}
          >
            <Icon className="w-6 h-6 text-dark-900" />
          </motion.div>
        </div>
      </Card>
    </motion.div>
  );
}