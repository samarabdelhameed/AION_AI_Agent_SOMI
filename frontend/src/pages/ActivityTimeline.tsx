import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { CheckCircle, Clock, AlertCircle, TrendingUp, ArrowUpRight, ArrowDownLeft, RefreshCw, Filter } from 'lucide-react';
import { Page } from '../App';
import { apiClient } from '../lib/api';
import { loadLocalActivities, LocalActivity } from '../lib/localTimeline';

type ActivityType = 'deposit' | 'withdraw' | 'rebalance' | 'yield' | 'decision';
type ActivityStatus = 'completed' | 'pending' | 'failed';

interface Activity {
  id: string;
  type: ActivityType;
  status: ActivityStatus;
  timestamp: Date;
  amount?: number;
  currency?: string;
  fromStrategy?: string;
  toStrategy?: string;
  txHash?: string;
  reason?: string;
  gasUsed?: number;
  description: string;
}

const FALLBACK_ACTIVITIES: Activity[] = [
  {
    id: '1',
    type: 'decision',
    status: 'completed',
    timestamp: new Date(Date.now() - 10 * 60000),
    description: 'AI recommended rebalancing from Venus to Beefy for higher yield',
    reason: 'Beefy APY increased to 12.8%, Venus at 8.45%. Risk profile matches user preference.',
  },
  {
    id: '2',
    type: 'rebalance',
    status: 'pending',
    timestamp: new Date(Date.now() - 5 * 60000),
    fromStrategy: 'Venus Protocol',
    toStrategy: 'Beefy Finance',
    amount: 1.5,
    currency: 'BNB',
    txHash: '0x123...abc',
    description: 'Rebalancing 1.5 BNB from Venus to Beefy',
  },
  {
    id: '3',
    type: 'deposit',
    status: 'completed',
    timestamp: new Date(Date.now() - 2 * 60 * 60000),
    amount: 0.5,
    currency: 'BNB',
    txHash: '0x456...def',
    gasUsed: 0.002,
    description: 'Deposited 0.5 BNB to Venus Protocol',
  },
  {
    id: '4',
    type: 'yield',
    status: 'completed',
    timestamp: new Date(Date.now() - 24 * 60 * 60000),
    amount: 12.45,
    currency: 'USDC',
    description: 'Earned yield from Venus Protocol',
  },
  {
    id: '5',
    type: 'decision',
    status: 'completed',
    timestamp: new Date(Date.now() - 25 * 60 * 60000),
    description: 'AI analyzed market conditions and recommended maintaining current allocation',
    reason: 'Market volatility detected. Current Venus allocation provides optimal risk-adjusted returns.',
  },
];

interface ActivityTimelineProps {
  onNavigate: (page: Page) => void;
}

export function ActivityTimeline({ onNavigate }: ActivityTimelineProps) {
  const [selectedType, setSelectedType] = useState<ActivityType | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<ActivityStatus | 'all'>('all');
  const [showDetails, setShowDetails] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activities, setActivities] = useState<Activity[]>(FALLBACK_ACTIVITIES);

  // Function to determine transaction type based on data
  const determineTransactionType = (transaction: any): ActivityType => {
    // If type is explicitly provided, use it
    if (transaction.type && ['deposit', 'withdraw', 'rebalance', 'yield', 'decision'].includes(transaction.type)) {
      return transaction.type as ActivityType;
    }
    
    // Try to determine from function name or description
    if (transaction.functionName) {
      const funcName = transaction.functionName.toLowerCase();
      if (funcName.includes('deposit') || funcName.includes('mint')) return 'deposit';
      if (funcName.includes('withdraw') || funcName.includes('redeem')) return 'withdraw';
      if (funcName.includes('rebalance')) return 'rebalance';
      if (funcName.includes('claim') || funcName.includes('yield')) return 'yield';
    }
    
    // Try to determine from description
    if (transaction.description) {
      const desc = transaction.description.toLowerCase();
      if (desc.includes('deposit') || desc.includes('add')) return 'deposit';
      if (desc.includes('withdraw') || desc.includes('remove')) return 'withdraw';
      if (desc.includes('rebalance')) return 'rebalance';
      if (desc.includes('claim') || desc.includes('yield')) return 'yield';
    }
    
    // Try to determine from amount changes (positive = deposit, negative = withdraw)
    if (transaction.amount !== undefined) {
      const amount = parseFloat(transaction.amount);
      if (amount > 0) return 'deposit';
      if (amount < 0) return 'withdraw';
    }
    
    // Default fallback - try to be more intelligent
    return 'deposit'; // Keep as fallback but log for debugging
  };

  useEffect(() => {
    async function load() {
      setLoading(true); setError(null);
      const res = await apiClient.getTransactionHistory();
      if (res.success && Array.isArray(res.data)) {
        const mappedBackend: Activity[] = (res.data as any[]).map((t, idx) => ({
          id: String(idx + 1),
          type: determineTransactionType(t) as ActivityType,
          status: (t.status || 'completed') as ActivityStatus,
          timestamp: new Date(t.timestamp || Date.now()),
          amount: t.amount,
          currency: t.currency || 'BNB',
          fromStrategy: t.fromStrategy,
          toStrategy: t.toStrategy,
          txHash: t.txHash,
          gasUsed: t.gasUsed,
          description: t.description || 'User operation',
          reason: t.reason,
        }));
        const local: LocalActivity[] = loadLocalActivities();
        const mappedLocal: Activity[] = local.map((t) => ({
          id: `local-${t.id}`,
          type: t.type as ActivityType,
          status: t.status as ActivityStatus,
          timestamp: new Date(t.timestamp),
          amount: t.amount,
          currency: t.currency || 'BNB',
          fromStrategy: t.fromStrategy,
          toStrategy: t.toStrategy,
          txHash: t.txHash,
          gasUsed: t.gasUsed,
          description: t.description || 'User operation',
        }));
        const merged = [...mappedLocal, ...mappedBackend];
        setActivities(merged.length ? merged : FALLBACK_ACTIVITIES);
      } else {
        setError(res.error || 'Failed to load timeline');
        setActivities(FALLBACK_ACTIVITIES);
      }
      setLoading(false);
    }
    load();
  }, []);

  const filteredActivities = activities.filter(activity => {
    return (
      (selectedType === 'all' || activity.type === selectedType) &&
      (selectedStatus === 'all' || activity.status === selectedStatus)
    );
  });

  const getActivityIcon = (type: ActivityType, status: ActivityStatus) => {
    if (status === 'pending') return Clock;
    if (status === 'failed') return AlertCircle;
    
    switch (type) {
      case 'deposit': return ArrowUpRight;
      case 'withdraw': return ArrowDownLeft;
      case 'rebalance': return RefreshCw;
      case 'yield': return TrendingUp;
      case 'decision': return CheckCircle;
      default: return CheckCircle;
    }
  };

  const getActivityColor = (type: ActivityType, status: ActivityStatus) => {
    if (status === 'pending') return 'text-gold-500';
    if (status === 'failed') return 'text-red-400';
    if (status === 'completed') return 'text-green-400';
    return 'text-gray-400';
  };

  const getStatusBg = (status: ActivityStatus) => {
    switch (status) {
      case 'completed': return 'bg-green-500/20 border-green-500/30';
      case 'pending': return 'bg-gold-500/20 border-gold-500/30';
      case 'failed': return 'bg-red-500/20 border-red-500/30';
      default: return 'bg-gray-500/20 border-gray-500/30';
    }
  };

  return (
    <div className="pt-20 min-h-screen bg-dark-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-2">Activity Timeline</h1>
          <p className="text-gray-400">Detailed timeline of all operations and decisions</p>
        </motion.div>

        {/* Filters */}
        <Card className="mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Filter className="w-5 h-5 text-gold-500" />
            <h3 className="text-lg font-semibold text-white">Filters</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Activity Type</label>
              <select 
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value as ActivityType | 'all')}
                className="w-full px-3 py-2 bg-dark-700/50 border border-dark-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50"
              >
                <option value="all">All Types</option>
                <option value="deposit">Deposits</option>
                <option value="withdraw">Withdrawals</option>
                <option value="rebalance">Rebalancing</option>
                <option value="yield">Yield</option>
                <option value="decision">AI Decisions</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Status</label>
              <select 
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as ActivityStatus | 'all')}
                className="w-full px-3 py-2 bg-dark-700/50 border border-dark-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50"
              >
                <option value="all">All Status</option>
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            <div className="flex items-end">
              <Button 
                className="w-full"
                variant="secondary"
                onClick={() => {
                  setSelectedType('all');
                  setSelectedStatus('all');
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </Card>

        {/* Timeline */}
        <div className="space-y-6">
          {filteredActivities.map((activity, idx) => {
            const Icon = getActivityIcon(activity.type, activity.status);
            const iconColor = getActivityColor(activity.type, activity.status);
            const isExpanded = showDetails === activity.id;

            return (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="relative"
              >
                {/* Timeline Line */}
                {idx < filteredActivities.length - 1 && (
                  <div className="absolute left-6 top-16 w-px h-12 bg-dark-600" />
                )}

                <Card className="relative">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getStatusBg(activity.status)}`}>
                      <Icon className={`w-6 h-6 ${iconColor}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-white font-semibold capitalize">{activity.type}</h3>
                          <p className="text-sm text-gray-400">
                            {activity.timestamp.toLocaleString()}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            activity.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                            activity.status === 'pending' ? 'bg-gold-500/20 text-gold-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {activity.status}
                          </span>
                          
                          {(activity.reason || activity.txHash) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setShowDetails(isExpanded ? null : activity.id)}
                            >
                              {isExpanded ? 'Hide' : 'Details'}
                            </Button>
                          )}
                        </div>
                      </div>

                      <p className="text-gray-300 mb-3">{activity.description}</p>

                      {/* Quick Info */}
                      {(activity.amount || activity.fromStrategy) && (
                        <div className="flex flex-wrap gap-4 text-sm">
                          {activity.amount && (
                            <div className="flex items-center gap-1">
                              <span className="text-gray-400">Amount:</span>
                              <span className="text-white font-medium">
                                {activity.amount} {activity.currency}
                              </span>
                            </div>
                          )}
                          {activity.fromStrategy && (
                            <div className="flex items-center gap-1">
                              <span className="text-gray-400">From:</span>
                              <span className="text-white">{activity.fromStrategy}</span>
                              {activity.toStrategy && (
                                <>
                                  <span className="text-gray-400">→</span>
                                  <span className="text-white">{activity.toStrategy}</span>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Expanded Details */}
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 p-4 bg-dark-700/50 rounded-xl border border-dark-600"
                        >
                          {activity.reason && (
                            <div className="mb-3">
                              <h4 className="text-white font-medium mb-2">AI Reasoning</h4>
                              <p className="text-gray-400 text-sm">{activity.reason}</p>
                            </div>
                          )}
                          
                          {activity.txHash && (
                            <div className="mb-3">
                              <h4 className="text-white font-medium mb-2">Transaction Details</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-400">Hash:</span>
                                  <button 
                                    className="text-gold-500 hover:text-gold-400 font-mono"
                                    onClick={() => window.open(`https://testnet.bscscan.com/tx/${activity.txHash}`, '_blank')}
                                  >
                                    {activity.txHash}
                                  </button>
                                </div>
                                {activity.gasUsed && (
                                  <div className="flex justify-between">
                                    <span className="text-gray-400">Gas Used:</span>
                                    <span className="text-white">{activity.gasUsed} BNB</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredActivities.length === 0 && (
          <Card className="text-center py-12">
            <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Activities Found</h3>
            <p className="text-gray-400 mb-6">Try adjusting your filters or check back later.</p>
            <Button onClick={() => onNavigate('dashboard')}>
              Back to Dashboard
            </Button>
          </Card>
        )}

        {/* Load More */}
        {filteredActivities.length > 0 && (
          <div className="text-center mt-8">
            <Button variant="secondary">
              Load More Activities
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}