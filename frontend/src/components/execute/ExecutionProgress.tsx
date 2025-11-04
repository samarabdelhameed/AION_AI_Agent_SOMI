import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Send, CheckCircle, AlertCircle } from 'lucide-react';
import { Card } from '../ui/Card';

type ExecutionStatus = 'pending' | 'sent' | 'confirmed' | 'failed';

interface ExecutionProgressProps {
  status: ExecutionStatus;
  txHash?: string;
  steps: Array<{
    id: string;
    title: string;
    description: string;
    status: 'completed' | 'current' | 'pending';
  }>;
}

const statusConfig = {
  pending: { icon: Clock, color: 'text-gold-500', bg: 'bg-gold-500/20' },
  sent: { icon: Send, color: 'text-blue-400', bg: 'bg-blue-500/20' },
  confirmed: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/20' },
  failed: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/20' },
};

export function ExecutionProgress({ status, txHash, steps }: ExecutionProgressProps) {
  const { icon: StatusIcon, color, bg } = statusConfig[status];

  return (
    <Card className="relative overflow-hidden">
      <div className={`absolute inset-0 ${bg} opacity-20`} />
      
      <div className="relative">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <motion.div
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${bg}`}
            animate={status === 'pending' ? { rotate: 360 } : {}}
            transition={{ duration: 2, repeat: status === 'pending' ? Infinity : 0 }}
          >
            <StatusIcon className={`w-6 h-6 ${color}`} />
          </motion.div>
          
          <div>
            <h3 className="text-lg font-semibold text-white capitalize">{status} Transaction</h3>
            {txHash && (
              <p className="text-sm text-gray-400 font-mono">
                {txHash.slice(0, 10)}...{txHash.slice(-8)}
              </p>
            )}
          </div>
        </div>

        {/* Progress Steps */}
        <div className="space-y-4">
          {steps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.2 }}
              className="flex items-start gap-4"
            >
              {/* Step Indicator */}
              <div className="relative">
                <motion.div
                  className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    step.status === 'completed' 
                      ? 'bg-green-500 text-white' 
                      : step.status === 'current'
                      ? 'bg-gold-500 text-dark-900 animate-pulse-glow'
                      : 'bg-dark-600 text-gray-400'
                  }`}
                  whileHover={{ scale: 1.1 }}
                >
                  {step.status === 'completed' ? (
                    <CheckCircle size={16} />
                  ) : (
                    <span className="text-xs font-bold">{index + 1}</span>
                  )}
                </motion.div>
                
                {/* Connecting line */}
                {index < steps.length - 1 && (
                  <div 
                    className={`absolute top-8 left-4 w-px h-6 ${
                      step.status === 'completed' ? 'bg-green-500' : 'bg-dark-600'
                    }`}
                  />
                )}
              </div>

              {/* Step Content */}
              <div className="flex-1 pb-6">
                <h4 className={`font-medium ${
                  step.status === 'completed' 
                    ? 'text-green-400' 
                    : step.status === 'current'
                    ? 'text-gold-500'
                    : 'text-gray-400'
                }`}>
                  {step.title}
                </h4>
                <p className="text-sm text-gray-500 mt-1">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Progress Bar */}
        <div className="mt-6">
          <div className="flex justify-between text-xs text-gray-400 mb-2">
            <span>Progress</span>
            <span>{Math.round((steps.filter(s => s.status === 'completed').length / steps.length) * 100)}%</span>
          </div>
          <div className="w-full bg-dark-600 rounded-full h-2">
            <motion.div
              className="bg-gradient-to-r from-gold-500 to-neon-cyan h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ 
                width: `${(steps.filter(s => s.status === 'completed').length / steps.length) * 100}%` 
              }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>
      </div>
    </Card>
  );
}