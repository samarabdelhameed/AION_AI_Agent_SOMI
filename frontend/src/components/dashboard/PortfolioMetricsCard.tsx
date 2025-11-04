import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { usePortfolioMetrics } from '../../hooks/usePortfolioMetrics';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Percent, 
  Target, 
  Shield, 
  RefreshCw,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { ethers, BigNumber, utils } from '../../utils/ethersCompat';

interface PortfolioMetricsCardProps {
  userAddress?: string;
  className?: string;
}

export function PortfolioMetricsCard({ userAddress, className = '' }: PortfolioMetricsCardProps) {
  const {
    portfolioMetrics,
    yieldBreakdown,
    performanceAttribution,
    riskMetrics,
    isLoading,
    isUpdating,
    error,
    refreshMetrics,
    getYieldProjection,
    getRiskScore,
    getPerformanceScore
  } = usePortfolioMetrics(userAddress);

  const [showDetails, setShowDetails] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('daily');

  if (isLoading) {
    return (
      <Card className={`${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded mb-4"></div>
          <div className="space-y-3">
            <div className="h-4 bg-gray-700 rounded w-3/4"></div>
            <div className="h-4 bg-gray-700 rounded w-1/2"></div>
            <div className="h-4 bg-gray-700 rounded w-2/3"></div>
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`${className} border-red-500/30`}>
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          <h3 className="text-lg font-semibold text-white">Portfolio Metrics Error</h3>
        </div>
        <p className="text-red-400 text-sm mb-4">{error}</p>
        <Button size="sm" onClick={refreshMetrics} disabled={isUpdating}>
          {isUpdating ? 'Retrying...' : 'Retry'}
        </Button>
      </Card>
    );
  }

  if (!portfolioMetrics) {
    return (
      <Card className={`${className}`}>
        <div className="text-center py-8">
          <DollarSign className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400">No portfolio data available</p>
          <p className="text-gray-500 text-sm mt-2">Connect your wallet to view metrics</p>
        </div>
      </Card>
    );
  }

  const riskScore = getRiskScore();
  const performanceScore = getPerformanceScore();
  const yieldProjection = getYieldProjection(selectedTimeframe);

  const getRiskColor = (score: number) => {
    if (score < 30) return 'text-green-400';
    if (score < 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getPerformanceColor = (score: number) => {
    if (score > 70) return 'text-green-400';
    if (score > 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <Card className={`${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-gold-500" />
          <h3 className="text-lg font-semibold text-white">Portfolio Metrics</h3>
          {portfolioMetrics.lastUpdated && (
            <span className="text-xs text-gray-500">
              Updated {portfolioMetrics.lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            icon={showDetails ? EyeOff : Eye}
            onClick={() => setShowDetails(!showDetails)}
          >
            {showDetails ? 'Hide' : 'Details'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            icon={RefreshCw}
            onClick={refreshMetrics}
            disabled={isUpdating}
          >
            {isUpdating ? 'Updating...' : 'Refresh'}
          </Button>
        </div>
      </div>

      {/* Main Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <motion.div
          className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/30 rounded-xl p-4"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-gray-400">Total Value</span>
          </div>
          <p className="text-xl font-bold text-white">
            ${portfolioMetrics.totalValueUSD.toFixed(2)}
          </p>
          <p className="text-xs text-gray-400">
            {parseFloat(utils.formatEther(portfolioMetrics.totalValue)).toFixed(4)} BNB
          </p>
        </motion.div>

        <motion.div
          className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/30 rounded-xl p-4"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-green-400" />
            <span className="text-xs text-gray-400">Total Yield</span>
          </div>
          <p className="text-xl font-bold text-green-400">
            ${portfolioMetrics.totalYieldUSD.toFixed(2)}
          </p>
          <p className="text-xs text-gray-400">
            {parseFloat(utils.formatEther(portfolioMetrics.totalYield)).toFixed(4)} BNB
          </p>
        </motion.div>

        <motion.div
          className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 border border-purple-500/30 rounded-xl p-4"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Percent className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-gray-400">Current APY</span>
          </div>
          <p className="text-xl font-bold text-purple-400">
            {portfolioMetrics.currentAPY.toFixed(2)}%
          </p>
          <p className="text-xs text-gray-400">
            ${portfolioMetrics.dailyYield.toFixed(2)}/day
          </p>
        </motion.div>

        <motion.div
          className={`bg-gradient-to-br from-orange-500/10 to-orange-600/10 border border-orange-500/30 rounded-xl p-4`}
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-orange-400" />
            <span className="text-xs text-gray-400">Risk Score</span>
          </div>
          <p className={`text-xl font-bold ${getRiskColor(riskScore)}`}>
            {riskScore.toFixed(1)}/100
          </p>
          <p className="text-xs text-gray-400">
            {riskScore < 30 ? 'Low Risk' : riskScore < 60 ? 'Medium Risk' : 'High Risk'}
          </p>
        </motion.div>
      </div>

      {/* Yield Projections */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-white">Yield Projections</h4>
          <div className="flex gap-1">
            {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((timeframe) => (
              <button
                key={timeframe}
                onClick={() => setSelectedTimeframe(timeframe)}
                className={`px-2 py-1 text-xs rounded ${
                  selectedTimeframe === timeframe
                    ? 'bg-gold-500 text-black'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {timeframe.charAt(0).toUpperCase() + timeframe.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="bg-dark-700/50 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-400 capitalize">{selectedTimeframe} Projection:</span>
            <span className="text-green-400 font-semibold">
              ${yieldProjection.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Detailed Metrics */}
      {showDetails && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="space-y-4"
        >
          {/* Performance Attribution */}
          {performanceAttribution && (
            <div className="bg-dark-700/30 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-white mb-3">Performance Attribution</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs text-gray-400">Total Return</span>
                  <p className={`font-semibold ${getPerformanceColor(performanceScore)}`}>
                    {performanceAttribution.totalReturn.toFixed(2)}%
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-400">Alpha</span>
                  <p className={`font-semibold ${performanceAttribution.alpha >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {performanceAttribution.alpha.toFixed(2)}%
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-400">Sharpe Ratio</span>
                  <p className="font-semibold text-white">
                    {performanceAttribution.sharpeRatio.toFixed(2)}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-gray-400">Max Drawdown</span>
                  <p className="font-semibold text-red-400">
                    {performanceAttribution.maxDrawdown.toFixed(2)}%
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Risk Breakdown */}
          {riskMetrics && (
            <div className="bg-dark-700/30 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-white mb-3">Risk Analysis</h4>
              <div className="space-y-2">
                {[
                  { label: 'Portfolio Risk', value: riskMetrics.portfolioRisk },
                  { label: 'Concentration Risk', value: riskMetrics.concentrationRisk },
                  { label: 'Liquidity Risk', value: riskMetrics.liquidityRisk },
                  { label: 'Protocol Risk', value: riskMetrics.protocolRisk },
                  { label: 'Smart Contract Risk', value: riskMetrics.smartContractRisk }
                ].map((risk) => (
                  <div key={risk.label} className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{risk.label}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getRiskColor(risk.value).replace('text-', 'bg-')}`}
                          style={{ width: `${Math.min(risk.value, 100)}%` }}
                        />
                      </div>
                      <span className={`text-xs font-semibold ${getRiskColor(risk.value)}`}>
                        {risk.value.toFixed(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Yield Breakdown */}
          {yieldBreakdown && yieldBreakdown.protocolYields.length > 0 && (
            <div className="bg-dark-700/30 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-white mb-3">Yield Sources</h4>
              <div className="space-y-2">
                {yieldBreakdown.protocolYields.map((protocolYield, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${protocolYield.isActive ? 'bg-green-400' : 'bg-gray-500'}`} />
                      <span className="text-sm text-white">{protocolYield.protocol}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-green-400">
                        ${protocolYield.amountUSD.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {protocolYield.apy.toFixed(1)}% APY
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Proof of Yield */}
          {yieldBreakdown && yieldBreakdown.proofOfYield.length > 0 && (
            <div className="bg-dark-700/30 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-white mb-3">Proof of Yield</h4>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {yieldBreakdown.proofOfYield.slice(0, 5).map((proof, index) => (
                  <div key={index} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-green-400" />
                      <span className="text-gray-300">{proof.protocol}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-green-400">
                        {parseFloat(utils.formatEther(proof.yieldAmount)).toFixed(4)} BNB
                      </p>
                      <p className="text-gray-500">
                        Block #{proof.blockNumber}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* Real-time Status */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-gray-400">Real-time updates active</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3 text-gray-500" />
            <span className="text-gray-500">
              Last update: {portfolioMetrics.lastUpdated.toLocaleTimeString()}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}