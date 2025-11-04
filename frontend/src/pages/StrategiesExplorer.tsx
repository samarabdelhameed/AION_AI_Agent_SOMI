import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { KpiCard } from '../components/dashboard/KpiCard';
import {
  Filter,
  Shield,
  Zap,
  ExternalLink,
  GitCompare as Compare,
  Activity,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Percent,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Info,
  RefreshCw,
  BarChart3,
  Globe,
  Lock,
  Unlock,
  Star,
  Award,
  Clock,
} from 'lucide-react';
import { StrategyCardSkeleton } from '../components/ui/LoadingStates';
import { Page } from '../App';
import { useStrategies, useMarketSummary } from '../hooks/useStrategies';

interface StrategiesExplorerProps {
  onNavigate: (page: Page) => void;
}

export function StrategiesExplorer({ onNavigate }: StrategiesExplorerProps) {
  const [selectedNetwork, setSelectedNetwork] = useState('all');
  const [selectedRisk, setSelectedRisk] = useState('all');
  const [selectedProtocol, setSelectedProtocol] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [compareList, setCompareList] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const [liveDataOnly, setLiveDataOnly] = useState(false);
  const [sortBy, setSortBy] = useState<'apy' | 'tvl' | 'name' | 'risk' | 'performance'>('apy');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showAdvancedMetrics, setShowAdvancedMetrics] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Use the strategies hook
  const { strategies: rawStrategies, loading, lastUpdated, refresh } = useStrategies();
  const marketSummary = useMarketSummary();

  // Manual refresh function
  const handleRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Convert StrategyData to display format with enhanced data
  const displayStrategies = useMemo(() => {
    return rawStrategies.map(strategy => ({
      ...strategy,
      risk: strategy.riskCategory,
      assets: `${(strategy.totalAssets / 1000000).toFixed(2)}M BNB`,
      dataSourceLabel: strategy.isLive ? 'Live API' : 'Cached Data',
      status: strategy.isHealthy ? 'active' : 'paused',
      performanceColor: strategy.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400',
      performanceIcon: strategy.priceChange24h >= 0 ? TrendingUp : TrendingDown,
    }));
  }, [rawStrategies]);

  // Advanced filtering with sorting
  const filteredStrategies = useMemo(() => {
    let filtered = displayStrategies.filter(strategy => {
      return (
        (selectedNetwork === 'all' || strategy.network.toLowerCase() === selectedNetwork) &&
        (selectedRisk === 'all' || strategy.risk === selectedRisk) &&
        (selectedProtocol === 'all' || strategy.protocolName.toLowerCase().includes(selectedProtocol.toLowerCase())) &&
        (selectedType === 'all' || strategy.type.toLowerCase() === selectedType.toLowerCase()) &&
        (!liveDataOnly || strategy.isLive)
      );
    });

    // Sort strategies
    filtered.sort((a, b) => {
      let aValue: number | string;
      let bValue: number | string;

      switch (sortBy) {
        case 'apy':
          aValue = a.apy;
          bValue = b.apy;
          break;
        case 'tvl':
          aValue = a.tvl;
          bValue = b.tvl;
          break;
        case 'risk':
          aValue = a.riskLevel;
          bValue = b.riskLevel;
          break;
        case 'performance':
          aValue = a.performance7d;
          bValue = b.performance7d;
          break;
        case 'name':
        default:
          aValue = a.name;
          bValue = b.name;
          break;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }

      const numA = Number(aValue);
      const numB = Number(bValue);
      return sortOrder === 'asc' ? numA - numB : numB - numA;
    });

    return filtered;
  }, [displayStrategies, selectedNetwork, selectedRisk, selectedProtocol, selectedType, liveDataOnly, sortBy, sortOrder]);

  const toggleCompare = (strategyId: string) => {
    setCompareList(prev => 
      prev.includes(strategyId) 
        ? prev.filter(id => id !== strategyId)
        : prev.length < 3 ? [...prev, strategyId] : prev
    );
  };

  const compareStrategies = displayStrategies.filter(s => compareList.includes(s.id));

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'high': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusIcon = (strategy: any) => {
    if (strategy.isHealthy) return <CheckCircle className="w-4 h-4 text-green-400" />;
    return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
  };

  const getAuditScoreColor = (score: number) => {
    if (score >= 95) return 'text-green-400';
    if (score >= 85) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="pt-20 min-h-screen bg-dark-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Strategies Explorer</h1>
              <p className="text-gray-400">
                Discover and compare all {rawStrategies.length} DeFi strategies with live data
                {marketSummary.topPerformer && (
                  <span className="ml-2 text-gold-500">
                    • Top performer: {marketSummary.topPerformer}
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                icon={refreshing ? RefreshCw : Activity}
                onClick={handleRefresh}
                disabled={refreshing}
                className={refreshing ? 'animate-spin' : ''}
              >
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-green-400">Live Data</span>
                <span className="text-gray-400">
                  Updated {lastUpdated?.toLocaleTimeString() || new Date().toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Enhanced KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <KpiCard
            title="Total TVL"
            value={marketSummary.totalTVL}
            format="currency"
            icon={DollarSign}
            change={15.4}
            delay={0}
            data-testid="kpi-total-tvl"
          />
          <KpiCard
            title="Avg APY"
            value={marketSummary.avgAPY}
            format="percentage"
            icon={Percent}
            change={2.8}
            delay={0.1}
            data-testid="kpi-avg-apy"
          />
          <KpiCard
            title="Healthy Protocols"
            value={marketSummary.healthyCount}
            format="number"
            icon={Shield}
            change={0}
            delay={0.2}
            data-testid="kpi-healthy-count"
          />
          <KpiCard
            title="Live Strategies"
            value={marketSummary.liveCount}
            format="number"
            icon={Activity}
            change={0}
            delay={0.3}
            data-testid="kpi-live-count"
          />
        </div>

        {/* Advanced Filters */}
        <Card className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Filter className="w-5 h-5 text-gold-500" />
              <h3 className="text-lg font-semibold text-white">Advanced Filters & Sorting</h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              icon={BarChart3}
              onClick={() => setShowAdvancedMetrics(!showAdvancedMetrics)}
            >
              {showAdvancedMetrics ? 'Hide' : 'Show'} Advanced Metrics
            </Button>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Network</label>
              <select 
                value={selectedNetwork}
                onChange={(e) => setSelectedNetwork(e.target.value)}
                className="w-full px-3 py-2 bg-dark-700/50 border border-dark-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50"
              >
                <option value="all">All Networks</option>
                <option value="bsc">BSC</option>
                <option value="ethereum">Ethereum</option>
                <option value="polygon">Polygon</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Risk Level</label>
              <select 
                value={selectedRisk}
                onChange={(e) => setSelectedRisk(e.target.value)}
                className="w-full px-3 py-2 bg-dark-700/50 border border-dark-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50"
              >
                <option value="all">All Risk Levels</option>
                <option value="low">Low Risk</option>
                <option value="medium">Medium Risk</option>
                <option value="high">High Risk</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Strategy Type</label>
              <select 
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-3 py-2 bg-dark-700/50 border border-dark-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50"
              >
                <option value="all">All Types</option>
                <option value="lending">Lending</option>
                <option value="yield farming">Yield Farming</option>
                <option value="amm">AMM</option>
                <option value="stable swap">Stable Swap</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Protocol</label>
              <select 
                value={selectedProtocol}
                onChange={(e) => setSelectedProtocol(e.target.value)}
                className="w-full px-3 py-2 bg-dark-700/50 border border-dark-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50"
              >
                <option value="all">All Protocols</option>
                <option value="venus">Venus</option>
                <option value="beefy">Beefy</option>
                <option value="pancake">PancakeSwap</option>
                <option value="aave">Aave</option>
                <option value="compound">Compound</option>
                <option value="uniswap">Uniswap</option>
                <option value="wombat">Wombat</option>
                <option value="morpho">Morpho</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Sort By</label>
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-3 py-2 bg-dark-700/50 border border-dark-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50"
              >
                <option value="apy">APY</option>
                <option value="tvl">TVL</option>
                <option value="risk">Risk Level</option>
                <option value="performance">7d Performance</option>
                <option value="name">Name</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Order</label>
              <select 
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="w-full px-3 py-2 bg-dark-700/50 border border-dark-600 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-gold-500/50"
              >
                <option value="desc">High to Low</option>
                <option value="asc">Low to High</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <motion.button
                onClick={() => setLiveDataOnly(!liveDataOnly)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all ${
                  liveDataOnly 
                    ? 'bg-gold-500 text-dark-900' 
                    : 'bg-dark-700/50 text-gray-400 hover:text-gold-500'
                }`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                  liveDataOnly ? 'border-dark-900 bg-dark-900' : 'border-gray-400'
                }`}>
                  {liveDataOnly && <CheckCircle className="w-3 h-3 text-gold-500" />}
                </div>
                Live data only
              </motion.button>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">
                Showing {filteredStrategies.length} of {rawStrategies.length} strategies
              </span>
              <Button 
                variant="secondary"
                icon={Compare}
                onClick={() => setShowCompare(!showCompare)}
                disabled={compareList.length === 0}
              >
                Compare ({compareList.length})
              </Button>
            </div>
          </div>
        </Card>

        {/* Compare Drawer */}
        {showCompare && compareList.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Card>
              <h3 className="text-lg font-semibold text-white mb-4">Strategy Comparison</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-dark-600">
                      <th className="text-left text-gray-400 pb-3">Strategy</th>
                      <th className="text-left text-gray-400 pb-3">APY</th>
                      <th className="text-left text-gray-400 pb-3">TVL</th>
                      <th className="text-left text-gray-400 pb-3">Risk</th>
                      <th className="text-left text-gray-400 pb-3">7d Performance</th>
                      <th className="text-left text-gray-400 pb-3">Audit Score</th>
                      <th className="text-left text-gray-400 pb-3">Fees</th>
                      <th className="text-left text-gray-400 pb-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compareStrategies.map((strategy) => (
                      <tr key={strategy.id} className="border-b border-dark-700/50">
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{strategy.icon}</span>
                            <div>
                              <p className="text-white font-medium">{strategy.name}</p>
                              <p className="text-sm text-gray-400">{strategy.protocolName} • {strategy.network}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4">
                          <span className="text-green-400 font-semibold">{strategy.apy.toFixed(2)}%</span>
                        </td>
                        <td className="py-4">
                          <span className="text-white">${(strategy.tvl / 1000000).toFixed(1)}M</span>
                        </td>
                        <td className="py-4">
                          <span className={`px-2 py-1 rounded-full text-xs border ${getRiskColor(strategy.risk)}`}>
                            {strategy.risk} ({strategy.riskLevel}/10)
                          </span>
                        </td>
                        <td className="py-4">
                          <div className="flex items-center gap-1">
                            <strategy.performanceIcon className="w-4 h-4" />
                            <span className={strategy.performanceColor}>
                              {strategy.performance7d > 0 ? '+' : ''}{strategy.performance7d.toFixed(2)}%
                            </span>
                          </div>
                        </td>
                        <td className="py-4">
                          <div className="flex items-center gap-1">
                            <Award className="w-4 h-4 text-gold-500" />
                            <span className={getAuditScoreColor(strategy.auditScore)}>
                              {strategy.auditScore}/100
                            </span>
                          </div>
                        </td>
                        <td className="py-4">
                          <span className="text-white">{strategy.fees}%</span>
                        </td>
                        <td className="py-4">
                          <Button 
                            size="sm"
                            onClick={() => onNavigate('execute')}
                          >
                            Execute
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Strategy Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredStrategies.map((strategy, idx) => (
            <motion.div
              key={strategy.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <Card className="relative overflow-hidden h-full" data-testid="strategy-card">
                <div className={`absolute inset-0 bg-gradient-to-br ${strategy.color} opacity-10`} />
                
                <div className="relative h-full flex flex-col">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="text-3xl">{strategy.icon}</div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{strategy.name}</h3>
                        <p className="text-sm text-gray-400">{strategy.protocolName} • {strategy.network}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(strategy)}
                      <motion.button
                        onClick={() => toggleCompare(strategy.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          compareList.includes(strategy.id)
                            ? 'bg-gold-500 text-dark-900'
                            : 'bg-dark-700/50 text-gray-400 hover:text-gold-500'
                        }`}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Compare size={16} />
                      </motion.button>
                    </div>
                  </div>

                  {/* Main Metrics */}
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-400 mb-1">APY</p>
                      <p className="text-xl font-bold text-green-400">{strategy.apy.toFixed(2)}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-400 mb-1">TVL</p>
                      <p className="text-xl font-bold text-white">
                        ${strategy.tvl > 1000000 
                          ? `${(strategy.tvl / 1000000).toFixed(1)}M`
                          : strategy.tvl > 1000
                          ? `${(strategy.tvl / 1000).toFixed(0)}K`
                          : `${strategy.tvl.toFixed(0)}`
                        }
                      </p>
                    </div>
                  </div>

                  {/* Performance Indicator */}
                  <div className="flex items-center justify-between mb-4 p-2 bg-dark-700/30 rounded-lg">
                    <span className="text-sm text-gray-400">24h Change</span>
                    <div className="flex items-center gap-1">
                      <strategy.performanceIcon className="w-4 h-4" />
                      <span className={`text-sm font-medium ${strategy.performanceColor}`}>
                        {strategy.priceChange24h > 0 ? '+' : ''}{strategy.priceChange24h.toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="space-y-3 mb-4 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Risk Level</span>
                      <span className={`px-2 py-1 rounded-full text-xs border ${getRiskColor(strategy.risk)}`}>
                        {strategy.risk} ({strategy.riskLevel}/10)
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Type</span>
                      <span className="text-white capitalize">{strategy.type}</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Fees</span>
                      <span className="text-white">{strategy.fees}%</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Lock Period</span>
                      <div className="flex items-center gap-1">
                        {strategy.lockPeriod === 'None' ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                        <span className="text-white">{strategy.lockPeriod}</span>
                      </div>
                    </div>

                    {showAdvancedMetrics && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Audit Score</span>
                          <div className="flex items-center gap-1">
                            <Award className="w-3 h-3 text-gold-500" />
                            <span className={getAuditScoreColor(strategy.auditScore)}>
                              {strategy.auditScore}/100
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Sharpe Ratio</span>
                          <span className="text-white">{strategy.sharpeRatio.toFixed(2)}</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">7d Performance</span>
                          <span className={strategy.performanceColor}>
                            {strategy.performance7d > 0 ? '+' : ''}{strategy.performance7d.toFixed(2)}%
                          </span>
                        </div>
                      </>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <span className="text-gray-400">Data Source</span>
                      <span className="text-neon-cyan text-sm flex items-center gap-1">
                        <Activity size={12} />
                        {strategy.dataSourceLabel}
                      </span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-400 mb-6">{strategy.description}</p>

                  {/* Actions */}
                  <div className="flex gap-2 mt-auto">
                    <Button 
                      className="flex-1" 
                      size="sm"
                      icon={Zap}
                      onClick={() => onNavigate('execute')}
                    >
                      Execute
                    </Button>
                    <Button 
                      size="sm"
                      variant="secondary"
                      icon={Sparkles}
                      onClick={() => onNavigate('agent')}
                    >
                      AI
                    </Button>
                    <Button 
                      size="sm"
                      variant="ghost"
                      icon={ExternalLink}
                      onClick={() => window.open(strategy.website, '_blank')}
                    >
                      <span className="sr-only">Details</span>
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {filteredStrategies.length === 0 && !loading && (
          <Card className="text-center py-12">
            <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No Strategies Found</h3>
            <p className="text-gray-400 mb-6">Try adjusting your filters to see more strategies.</p>
            <Button 
              onClick={() => {
                setSelectedNetwork('all');
                setSelectedRisk('all');
                setSelectedProtocol('all');
                setSelectedType('all');
                setLiveDataOnly(false);
              }}
            >
              Clear All Filters
            </Button>
          </Card>
        )}

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <StrategyCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Results Summary */}
        {filteredStrategies.length > 0 && (
          <div className="mt-8 text-center">
            <p className="text-gray-400">
              Showing {filteredStrategies.length} of {rawStrategies.length} strategies
              {compareList.length > 0 && ` • ${compareList.length} selected for comparison`}
              {marketSummary.topPerformer && (
                <span className="ml-2 text-gold-500">
                  • Best performer: {marketSummary.topPerformer}
                </span>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}