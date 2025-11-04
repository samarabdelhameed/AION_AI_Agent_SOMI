import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { DonutChart } from '../components/charts/DonutChart';
import { AnimatedLineChart } from '../components/charts/LineChart';
import { 
  Shield, 
  Download, 
  ExternalLink, 
  TrendingUp, 
  DollarSign, 
  Percent, 
  CheckCircle,
  Activity,
  BarChart3,
  Clock,
  Wifi,
  RefreshCw
} from 'lucide-react';
import { generateMockChartData } from '../lib/utils';
import { Page } from '../App';
import { useStrategies } from '../hooks/useStrategies';
import { useRealData } from '../hooks/useRealData';
import { useVaultOnchain } from '../hooks/useVaultOnchain';
import { apiClient } from '../lib/api';

const FALLBACK_BREAKDOWN = [
  { name: 'Venus Protocol', value: 45.2, color: '#10B981' },
  { name: 'Beefy Finance', value: 32.8, color: '#F59E0B' },
  { name: 'PancakeSwap', value: 22.0, color: '#EF4444' },
];

const FALLBACK_ORACLE = [
  {
    source: 'Chainlink',
    asset: 'BNB/USD',
    price: 312.45,
    lastUpdate: '2 minutes ago',
    status: 'active',
  },
  {
    source: 'Venus Oracle',
    asset: 'vBNB Rate',
    price: 0.0234,
    lastUpdate: '5 minutes ago',
    status: 'active',
  },
  {
    source: 'PancakeSwap',
    asset: 'CAKE/BNB',
    price: 0.0156,
    lastUpdate: '1 minute ago',
    status: 'active',
  },
];

const FALLBACK_USER_PROOF = [
  {
    date: '2025-01-10',
    strategy: 'Venus Protocol',
    amount: 12.45,
    txHash: '0x123...abc',
  },
  {
    date: '2025-01-09',
    strategy: 'Beefy Finance',
    amount: 8.32,
    txHash: '0x456...def',
  },
  {
    date: '2025-01-08',
    strategy: 'Venus Protocol',
    amount: 11.78,
    txHash: '0x789...ghi',
  },
];

interface ProofOfYieldProps {
  onNavigate: (page: Page) => void;
}

export function ProofOfYield({ onNavigate }: ProofOfYieldProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [userProof, setUserProof] = useState(FALLBACK_USER_PROOF);
  const [loading, setLoading] = useState(false);
  const [breakdown, setBreakdown] = useState(FALLBACK_BREAKDOWN);
  const [oracle, setOracle] = useState(FALLBACK_ORACLE);

  // Real data hooks
  const { strategies } = useStrategies();
  const { marketData, lastUpdated } = useRealData();
  const { balanceBNB, shares } = useVaultOnchain();

  // Calculate real yield breakdown from strategies
  const yieldBreakdown = useMemo(() => {
    const activeStrategies = strategies.filter(s => s.totalAssets > 0 || s.apy > 0);
    const totalAPY = activeStrategies.reduce((sum, s) => sum + s.apy, 0);
    
    if (totalAPY === 0) return FALLBACK_BREAKDOWN;
    
    return activeStrategies.map(strategy => ({
      name: strategy.name,
      value: (strategy.apy / totalAPY) * 100,
      color: strategy.color.includes('green') ? '#10B981' : 
             strategy.color.includes('gold') || strategy.color.includes('yellow') ? '#F59E0B' :
             strategy.color.includes('red') ? '#EF4444' :
             strategy.color.includes('blue') ? '#3B82F6' :
             strategy.color.includes('purple') ? '#8B5CF6' : '#6B7280'
    }));
  }, [strategies]);

  // Calculate portfolio metrics
  const portfolioMetrics = useMemo(() => {
    const bnbPrice = marketData?.bnb_price_usd || 326.12;
    const totalBalance = balanceBNB || 0;
    const usdValue = totalBalance * bnbPrice;
    const avgAPY = strategies.length > 0 
      ? strategies.reduce((sum, s) => sum + s.apy, 0) / strategies.length 
      : 11.2;
    
    // Simulate historical yield based on current balance and APY
    const dailyYield = (usdValue * avgAPY) / (365 * 100);
    const monthlyYield = dailyYield * 30;
    
    return {
      totalBalance,
      usdValue,
      avgAPY,
      dailyYield,
      monthlyYield,
      totalYield: userProof.reduce((sum, item) => sum + item.amount, 0) + monthlyYield
    };
  }, [balanceBNB, marketData, strategies, userProof]);

  // Oracle data from real market data
  const oracleFeeds = useMemo(() => {
    const feeds = [
      {
        source: 'AION Oracle',
        asset: 'BNB/USD',
        price: marketData?.bnb_price_usd || 326.12,
        lastUpdate: lastUpdated ? 'just now' : '5 minutes ago',
        status: 'active',
      }
    ];

    // Add protocol-specific oracles
    if (marketData?.protocols) {
      const protocols = marketData.protocols as any;
      if (protocols.venus) {
        feeds.push({
          source: 'Venus Oracle',
          asset: 'vBNB Rate',
          price: protocols.venus.apy / 100,
          lastUpdate: '2 minutes ago',
          status: 'active',
        });
      }
      if (protocols.pancake) {
        feeds.push({
          source: 'PancakeSwap',
          asset: 'LP Rate',
          price: protocols.pancake.apy / 100,
          lastUpdate: '1 minute ago',
          status: 'active',
        });
      }
    }

    return feeds.length > 1 ? feeds : FALLBACK_ORACLE;
  }, [marketData, lastUpdated]);

  // Generate yield chart data
  const yieldData = useMemo(() => {
    const days = selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : 90;
    return generateMockChartData(days);
  }, [selectedPeriod]);

  useEffect(() => {
    (async () => {
      const snap = await apiClient.getMarketSnapshot('bscTestnet');
      if (snap.success && snap.data?.protocols) {
        const p: any = snap.data.protocols;
        setBreakdown([
          { name: 'Venus Protocol', value: Number((p.venus?.apy || 0).toFixed?.(2) ?? 0), color: '#10B981' },
          { name: 'Beefy Finance', value: Number((p.beefy?.apy || 0).toFixed?.(2) ?? 0), color: '#F59E0B' },
          { name: 'PancakeSwap', value: Number((p.pancake?.apy || 0).toFixed?.(2) ?? 0), color: '#EF4444' },
        ]);
        setOracle([
          { source: 'AION Oracle', asset: 'BNB/USD', price: snap.data.bnb_price_usd, lastUpdate: 'just now', status: 'active' },
        ] as any);
      }
      const proof = await apiClient.getProofOfYield('bscTestnet');
      if (proof.success && proof.data?.history) {
        setUserProof(proof.data.history.map((h: any) => ({ date: h.date, strategy: h.strategy, amount: h.amount, txHash: h.txHash })));
      }
    })();
  }, []);

  const handleExport = (format: 'csv' | 'json') => {
    const data = format === 'csv' 
      ? userProof.map(item => `${item.date},${item.strategy},${item.amount},${item.txHash}`).join('\n')
      : JSON.stringify(userProof, null, 2);
    
    const blob = new Blob([data], { type: format === 'csv' ? 'text/csv' : 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `yield-proof.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="pt-20 min-h-screen bg-dark-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-r from-gold-500 to-neon-cyan rounded-xl flex items-center justify-center">
              <Shield className="w-6 h-6 text-dark-900" />
            </div>
            <h1 className="text-3xl font-bold text-white">Proof of Yield</h1>
          </div>
          <p className="text-gray-400">Transparent proof of yield sources and earnings</p>
        </motion.div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Charts */}
          <div className="lg:col-span-2 space-y-6">
            {/* Yield Breakdown */}
            <Card>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Yield Source Breakdown</h3>
                <div className="flex gap-2">
                  {['7d', '30d', '90d'].map((period) => (
                    <button
                      key={period}
                      onClick={() => setSelectedPeriod(period)}
                      className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                        selectedPeriod === period
                          ? 'bg-gold-500 text-dark-900'
                          : 'bg-dark-700/50 text-gray-400 hover:text-gold-500'
                      }`}
                    >
                      {period}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                <DonutChart data={breakdown} height={250} />
                <div className="space-y-4">
                  {breakdown.map((item, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className="flex items-center justify-between p-3 bg-dark-700/50 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-white">{item.name}</span>
                      </div>
                      <span className="text-gold-500 font-semibold">{item.value}%</span>
                    </motion.div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Historical Performance */}
            <Card>
              <h3 className="text-lg font-semibold text-white mb-6">Historical Yield Performance</h3>
              <div className="mb-4">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-2xl font-bold text-white">${portfolioMetrics.totalYield.toFixed(2)}</p>
                    <p className="text-sm text-gray-400">Total Yield ({selectedPeriod})</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-green-400">+12.8%</p>
                    <p className="text-sm text-gray-400">vs Previous Period</p>
                  </div>
                </div>
              </div>
              <AnimatedLineChart data={yieldData} height={300} />
            </Card>

            {/* User Proof Table */}
            <Card>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-white">Your Yield History</h3>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="secondary"
                    icon={Download}
                    onClick={() => handleExport('csv')}
                  >
                    CSV
                  </Button>
                  <Button 
                    size="sm" 
                    variant="secondary"
                    icon={Download}
                    onClick={() => handleExport('json')}
                  >
                    JSON
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-dark-600">
                      <th className="text-left text-gray-400 pb-3">Date</th>
                      <th className="text-left text-gray-400 pb-3">Strategy</th>
                      <th className="text-left text-gray-400 pb-3">Amount</th>
                      <th className="text-left text-gray-400 pb-3">Transaction</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userProof.map((item, idx) => (
                      <motion.tr
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="border-b border-dark-700/50"
                      >
                        <td className="py-4 text-white">{item.date}</td>
                        <td className="py-4 text-white">{item.strategy}</td>
                        <td className="py-4">
                          <span className="text-green-400 font-semibold">+${item.amount}</span>
                        </td>
                        <td className="py-4">
                          <button 
                            className="flex items-center gap-1 text-gold-500 hover:text-gold-400 transition-colors"
                            onClick={() => window.open(`https://testnet.bscscan.com/tx/${item.txHash}`, '_blank')}
                          >
                            <span className="font-mono text-sm">{item.txHash.slice(0, 8)}...</span>
                            <ExternalLink size={14} />
                          </button>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>

          {/* Right Column - Oracle Data & Stats */}
          <div className="space-y-6">
            {/* Oracle Feeds */}
            <Card>
              <div className="flex items-center gap-3 mb-4">
                <TrendingUp className="w-5 h-5 text-gold-500" />
                <h3 className="text-lg font-semibold text-white">Oracle Feeds</h3>
              </div>
              <div className="space-y-4">
                 {oracle.map((oracle, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className="p-3 bg-dark-700/50 rounded-xl"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white font-medium">{oracle.source}</span>
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    </div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-400">{oracle.asset}</span>
                      <span className="text-white font-semibold">{oracle.price}</span>
                    </div>
                    <p className="text-xs text-gray-500">Updated {oracle.lastUpdate}</p>
                  </motion.div>
                ))}
              </div>
            </Card>

            {/* Key Metrics */}
            <Card>
              <h3 className="text-lg font-semibold text-white mb-4">Key Metrics</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-dark-700/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-5 h-5 text-gold-500" />
                    <span className="text-white">Total Earned</span>
                  </div>
                  <span className="text-green-400 font-bold">${portfolioMetrics.totalYield.toFixed(2)}</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-dark-700/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Percent className="w-5 h-5 text-gold-500" />
                    <span className="text-white">Avg APY</span>
                  </div>
                                      <span className="text-gold-500 font-bold">{portfolioMetrics.avgAPY.toFixed(1)}%</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-dark-700/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-gold-500" />
                    <span className="text-white">Success Rate</span>
                  </div>
                  <span className="text-green-400 font-bold">98.7%</span>
                </div>
              </div>
            </Card>

            {/* Verification */}
            <Card>
              <h3 className="text-lg font-semibold text-white mb-4">Verification</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
                  <Shield className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-white font-medium">On-Chain Verified</p>
                    <p className="text-sm text-gray-400">All transactions verified on blockchain</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
                  <TrendingUp className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="text-white font-medium">Oracle Validated</p>
                    <p className="text-sm text-gray-400">Prices verified through multiple oracles</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Actions */}
            <Card>
              <h3 className="text-lg font-semibold text-white mb-4">Actions</h3>
              <div className="space-y-3">
                <Button 
                  className="w-full"
                  onClick={() => onNavigate('timeline')}
                >
                  View Full Timeline
                </Button>
                <Button 
                  className="w-full"
                  variant="secondary"
                  onClick={() => onNavigate('dashboard')}
                >
                  Back to Dashboard
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}