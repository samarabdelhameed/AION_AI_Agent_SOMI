import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { PortfolioMetricsCard } from '../components/dashboard/PortfolioMetricsCard';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ButtonLoading } from '../components/ui/LoadingStates';
import { AnimatedLineChart } from '../components/charts/LineChart';
import { usePortfolioMetrics } from '../hooks/usePortfolioMetrics';
import { useWalletOnchain } from '../hooks/useWalletOnchain';
import { 
  TrendingUp, 
  BarChart3, 
  PieChart, 
  Target, 
  Shield, 
  Download,
  Calendar,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  Percent
} from 'lucide-react';
import { ethers, BigNumber, utils } from '../utils/ethersCompat';

interface PortfolioAnalyticsProps {
  onNavigate?: (page: string) => void;
}

export function PortfolioAnalytics({ onNavigate }: PortfolioAnalyticsProps) {
  const wallet = useWalletOnchain();
  const {
    portfolioMetrics,
    yieldBreakdown,
    performanceAttribution,
    riskMetrics,
    isLoading,
    refreshMetrics
  } = usePortfolioMetrics(wallet.address);

  const [selectedTimeframe, setSelectedTimeframe] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [selectedView, setSelectedView] = useState<'overview' | 'performance' | 'risk' | 'yield'>('overview');

  // Generate historical data for charts based on current portfolio value
  const generateHistoricalData = (days: number) => {
    const data = [];
    const baseValue = portfolioMetrics?.totalValueUSD || 3200;
    
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Simulate realistic portfolio growth with volatility
      const growth = (days - i) / days * 0.15; // 15% growth over period
      const volatility = (Math.random() - 0.5) * 0.05; // ±2.5% daily volatility
      const value = baseValue * (1 + growth + volatility);
      
      data.push({
        date: date.toISOString().split('T')[0],
        value: Math.max(value, baseValue * 0.9) // Minimum 90% of base value
      });
    }
    
    return data;
  };

  const historicalData = generateHistoricalData(
    selectedTimeframe === '7d' ? 7 : 
    selectedTimeframe === '30d' ? 30 : 
    selectedTimeframe === '90d' ? 90 : 365
  );

  const timeframeOptions = [
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' },
    { value: '1y', label: '1 Year' }
  ];

  const viewOptions = [
    { value: 'overview', label: 'Overview', icon: BarChart3 },
    { value: 'performance', label: 'Performance', icon: TrendingUp },
    { value: 'risk', label: 'Risk Analysis', icon: Shield },
    { value: 'yield', label: 'Yield Tracking', icon: Target }
  ];

  if (!wallet.address) {
    return (
      <div className="pt-20 min-h-screen bg-dark-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-16">
            <BarChart3 className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Portfolio Analytics</h2>
            <p className="text-gray-400 mb-6">Connect your wallet to view detailed portfolio analytics</p>
            <Button onClick={() => onNavigate?.('dashboard')}>
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pt-20 min-h-screen bg-dark-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">Portfolio Analytics</h1>
              <p className="text-gray-400">Comprehensive analysis of your DeFi portfolio performance</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                size="sm"
                variant="secondary"
                icon={Download}
                onClick={() => {
                  // Export portfolio report functionality
                  const reportData = {
                    timestamp: new Date().toISOString(),
                    portfolio: 'AION Portfolio Report',
                    // Add actual report data here
                  };
                  console.log('Exporting portfolio report...', reportData);
                }}
              >
                Export Report
              </Button>
              <ButtonLoading
                size="sm"
                icon={Calendar}
                onClick={refreshMetrics}
                loading={isLoading}
                loadingText="Refreshing..."
              >
                Refresh Data
              </ButtonLoading>
            </div>
          </div>
        </motion.div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-4 mb-8">
          <div className="flex bg-dark-800 rounded-xl p-1">
            {viewOptions.map((option) => {
              const Icon = option.icon;
              return (
                <button
                  key={option.value}
                  onClick={() => setSelectedView(option.value as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedView === option.value
                      ? 'bg-gold-500 text-black'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {option.label}
                </button>
              );
            })}
          </div>
          
          <div className="flex bg-dark-800 rounded-xl p-1">
            {timeframeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setSelectedTimeframe(option.value as any)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedTimeframe === option.value
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Overview View */}
        {selectedView === 'overview' && (
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left Column - Main Metrics */}
            <div className="lg:col-span-2 space-y-6">
              {/* Portfolio Value Chart */}
              <Card>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Portfolio Value</h3>
                  <div className="flex items-center gap-2">
                    {portfolioMetrics && (
                      <>
                        <span className="text-2xl font-bold text-white">
                          ${portfolioMetrics.totalValueUSD.toFixed(2)}
                        </span>
                        <div className="flex items-center gap-1 text-green-400">
                          <ArrowUpRight className="w-4 h-4" />
                          <span className="text-sm">+{portfolioMetrics.currentAPY.toFixed(2)}%</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <AnimatedLineChart data={historicalData} height={300} />
              </Card>

              {/* Performance Metrics Grid */}
              {performanceAttribution && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="w-4 h-4 text-green-400" />
                      <span className="text-xs text-gray-400">Total Return</span>
                    </div>
                    <p className="text-xl font-bold text-green-400">
                      {performanceAttribution.totalReturn.toFixed(2)}%
                    </p>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-4 h-4 text-blue-400" />
                      <span className="text-xs text-gray-400">Alpha</span>
                    </div>
                    <p className={`text-xl font-bold ${performanceAttribution.alpha >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {performanceAttribution.alpha.toFixed(2)}%
                    </p>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3 className="w-4 h-4 text-purple-400" />
                      <span className="text-xs text-gray-400">Sharpe Ratio</span>
                    </div>
                    <p className="text-xl font-bold text-purple-400">
                      {performanceAttribution.sharpeRatio.toFixed(2)}
                    </p>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <ArrowDownRight className="w-4 h-4 text-red-400" />
                      <span className="text-xs text-gray-400">Max Drawdown</span>
                    </div>
                    <p className="text-xl font-bold text-red-400">
                      {performanceAttribution.maxDrawdown.toFixed(2)}%
                    </p>
                  </Card>
                </div>
              )}

              {/* Strategy Performance */}
              {performanceAttribution && (
                <Card>
                  <h3 className="text-lg font-semibold text-white mb-4">Strategy Performance</h3>
                  <div className="space-y-3">
                    {performanceAttribution.strategyPerformance.map((strategy, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-dark-700/50 rounded-xl">
                        <div>
                          <h4 className="text-white font-medium">{strategy.strategyName}</h4>
                          <p className="text-xs text-gray-400">
                            {strategy.allocation.toFixed(1)}% allocation
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${strategy.return >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {strategy.return.toFixed(2)}%
                          </p>
                          <p className="text-xs text-gray-400">
                            Contribution: {strategy.contribution.toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>

            {/* Right Column - Portfolio Metrics Card */}
            <div className="space-y-6">
              <PortfolioMetricsCard userAddress={wallet.address} />
            </div>
          </div>
        )}

        {/* Performance View */}
        {selectedView === 'performance' && performanceAttribution && (
          <div className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <h3 className="text-lg font-semibold text-white mb-4">Performance Attribution</h3>
                <div className="space-y-4">
                  {performanceAttribution.strategyPerformance.map((strategy, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-white">{strategy.strategyName}</span>
                        <span className={`font-semibold ${strategy.contribution >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {strategy.contribution.toFixed(2)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${strategy.contribution >= 0 ? 'bg-green-400' : 'bg-red-400'}`}
                          style={{ width: `${Math.abs(strategy.contribution) * 10}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <h3 className="text-lg font-semibold text-white mb-4">Risk-Adjusted Returns</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Sharpe Ratio</span>
                    <span className="text-white font-semibold">{performanceAttribution.sharpeRatio.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Beta</span>
                    <span className="text-white font-semibold">{performanceAttribution.beta.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Volatility</span>
                    <span className="text-white font-semibold">{performanceAttribution.volatility.toFixed(2)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Max Drawdown</span>
                    <span className="text-red-400 font-semibold">{performanceAttribution.maxDrawdown.toFixed(2)}%</span>
                  </div>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Risk View */}
        {selectedView === 'risk' && riskMetrics && (
          <div className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <h3 className="text-lg font-semibold text-white mb-4">Risk Breakdown</h3>
                <div className="space-y-4">
                  {[
                    { label: 'Portfolio Risk', value: riskMetrics.portfolioRisk, description: 'Overall portfolio volatility' },
                    { label: 'Concentration Risk', value: riskMetrics.concentrationRisk, description: 'Risk from asset concentration' },
                    { label: 'Liquidity Risk', value: riskMetrics.liquidityRisk, description: 'Risk from illiquid positions' },
                    { label: 'Protocol Risk', value: riskMetrics.protocolRisk, description: 'Risk from protocol failures' },
                    { label: 'Smart Contract Risk', value: riskMetrics.smartContractRisk, description: 'Risk from contract bugs' }
                  ].map((risk) => (
                    <div key={risk.label} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-white">{risk.label}</span>
                          <p className="text-xs text-gray-400">{risk.description}</p>
                        </div>
                        <span className={`font-semibold ${
                          risk.value < 30 ? 'text-green-400' : 
                          risk.value < 60 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {risk.value.toFixed(1)}/100
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            risk.value < 30 ? 'bg-green-400' : 
                            risk.value < 60 ? 'bg-yellow-400' : 'bg-red-400'
                          }`}
                          style={{ width: `${Math.min(risk.value, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <h3 className="text-lg font-semibold text-white mb-4">Risk Score</h3>
                <div className="text-center py-8">
                  <div className={`text-6xl font-bold mb-4 ${
                    riskMetrics.overallRiskScore < 30 ? 'text-green-400' : 
                    riskMetrics.overallRiskScore < 60 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {riskMetrics.overallRiskScore.toFixed(0)}
                  </div>
                  <p className="text-gray-400 mb-2">Overall Risk Score</p>
                  <p className={`text-sm ${
                    riskMetrics.overallRiskScore < 30 ? 'text-green-400' : 
                    riskMetrics.overallRiskScore < 60 ? 'text-yellow-400' : 'text-red-400'
                  }`}>
                    {riskMetrics.overallRiskScore < 30 ? 'Low Risk Portfolio' : 
                     riskMetrics.overallRiskScore < 60 ? 'Medium Risk Portfolio' : 'High Risk Portfolio'}
                  </p>
                </div>
              </Card>
            </div>
          </div>
        )}

        {/* Yield View */}
        {selectedView === 'yield' && yieldBreakdown && (
          <div className="space-y-6">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card>
                <h3 className="text-lg font-semibold text-white mb-4">Yield Sources</h3>
                <div className="space-y-3">
                  {yieldBreakdown.protocolYields.map((protocolYield, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-dark-700/50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${protocolYield.isActive ? 'bg-green-400' : 'bg-gray-500'}`} />
                        <div>
                          <h4 className="text-white font-medium">{protocolYield.protocol}</h4>
                          <p className="text-xs text-gray-400">{protocolYield.apy.toFixed(1)}% APY</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-green-400 font-semibold">
                          ${protocolYield.amountUSD.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-400">
                          {parseFloat(ethers.utils.formatEther(protocolYield.amount)).toFixed(4)} BNB
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <h3 className="text-lg font-semibold text-white mb-4">Proof of Yield</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {yieldBreakdown.proofOfYield.map((proof, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-dark-700/30 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-400" />
                        <span className="text-sm text-white">{proof.protocol}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-green-400">
                          {parseFloat(ethers.utils.formatEther(proof.yieldAmount)).toFixed(4)} BNB
                        </p>
                        <p className="text-xs text-gray-500">
                          Block #{proof.blockNumber}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}