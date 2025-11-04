import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { 
  Settings, 
  TrendingUp, 
  Shield, 
  Zap, 
  BarChart3, 
  Target,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Percent,
  Activity
} from 'lucide-react';
import { Page } from '../App';
import { advancedOperationsService, AutoRebalanceConfig, DCAConfig, RiskManagementConfig } from '../services/advancedOperationsService';
import { useStrategies } from '../hooks/useStrategies';
import { useRealData } from '../hooks/useRealData';

interface AdvancedOperationsPageProps {
  onNavigate: (page: Page) => void;
}

export function AdvancedOperationsPage({ onNavigate }: AdvancedOperationsPageProps) {
  const [activeTab, setActiveTab] = useState<'rebalance' | 'dca' | 'risk' | 'analytics'>('rebalance');
  const [loading, setLoading] = useState(false);
  const [alerts, setAlerts] = useState<Array<{
    type: string;
    message: string;
    severity: string;
    timestamp: Date;
  }>>([]);

  // Configurations
  const [autoRebalanceConfig, setAutoRebalanceConfig] = useState<AutoRebalanceConfig>({
    enabled: false,
    threshold: 5,
    targetAllocation: { venus: 25, beefy: 25, pancake: 25, aave: 25 },
    frequency: 'weekly'
  });

  const [dcaConfig, setDCAConfig] = useState<DCAConfig>({
    enabled: false,
    amount: 0.01,
    frequency: 'weekly',
    targetStrategy: 'venus',
    maxSlippage: 1
  });

  const [riskConfig, setRiskConfig] = useState<RiskManagementConfig>({
    stopLoss: { enabled: false, threshold: 10 },
    takeProfit: { enabled: false, threshold: 20 },
    maxDrawdown: { enabled: false, threshold: 15 }
  });

  const { strategies } = useStrategies();
  const { marketData } = useRealData();

  // Start monitoring for alerts
  useEffect(() => {
    const stopMonitoring = advancedOperationsService.startMonitoring((alert) => {
      setAlerts(prev => [...prev, { ...alert, timestamp: new Date() }].slice(-5));
    });

    return stopMonitoring;
  }, []);

  const handleSetupAutoRebalance = async () => {
    setLoading(true);
    try {
      const result = await advancedOperationsService.setupAutoRebalance(autoRebalanceConfig);
      if (result.success) {
        setAlerts(prev => [...prev, {
          type: 'success',
          message: 'Auto-rebalance configured successfully!',
          severity: 'low',
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('Auto-rebalance setup failed:', error);
    }
    setLoading(false);
  };

  const handleSetupDCA = async () => {
    setLoading(true);
    try {
      const result = await advancedOperationsService.setupDCA(dcaConfig);
      if (result.success) {
        setAlerts(prev => [...prev, {
          type: 'success',
          message: 'DCA strategy configured successfully!',
          severity: 'low',
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('DCA setup failed:', error);
    }
    setLoading(false);
  };

  const handleSetupRiskManagement = async () => {
    setLoading(true);
    try {
      const result = await advancedOperationsService.setupRiskManagement(riskConfig);
      if (result.success) {
        setAlerts(prev => [...prev, {
          type: 'success',
          message: 'Risk management configured successfully!',
          severity: 'low',
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('Risk management setup failed:', error);
    }
    setLoading(false);
  };

  const tabs = [
    { id: 'rebalance', label: 'Auto-Rebalance', icon: RefreshCw },
    { id: 'dca', label: 'DCA Strategy', icon: TrendingUp },
    { id: 'risk', label: 'Risk Management', icon: Shield },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  const renderAutoRebalanceTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white mb-2">Automated Portfolio Rebalancing</h3>
          <p className="text-gray-400">Let AI optimize your portfolio allocation automatically</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${autoRebalanceConfig.enabled ? 'bg-green-400' : 'bg-gray-500'}`}></div>
          <span className="text-sm text-gray-400">
            {autoRebalanceConfig.enabled ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h4 className="text-lg font-medium text-white mb-4">Configuration</h4>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Rebalance Threshold
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="1"
                  max="20"
                  value={autoRebalanceConfig.threshold}
                  onChange={(e) => setAutoRebalanceConfig(prev => ({
                    ...prev,
                    threshold: parseInt(e.target.value)
                  }))}
                  className="flex-1"
                />
                <span className="text-white font-medium w-12">
                  {autoRebalanceConfig.threshold}%
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Frequency
              </label>
              <select
                value={autoRebalanceConfig.frequency}
                onChange={(e) => setAutoRebalanceConfig(prev => ({
                  ...prev,
                  frequency: e.target.value as any
                }))}
                className="w-full px-3 py-2 bg-dark-700/50 border border-dark-600 rounded-xl text-white"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={autoRebalanceConfig.enabled}
                onChange={(e) => setAutoRebalanceConfig(prev => ({
                  ...prev,
                  enabled: e.target.checked
                }))}
                className="rounded"
              />
              <label className="text-sm text-gray-300">Enable Auto-Rebalancing</label>
            </div>
          </div>

          <Button
            className="w-full mt-6"
            onClick={handleSetupAutoRebalance}
            loading={loading}
            icon={Settings}
          >
            Configure Auto-Rebalance
          </Button>
        </Card>

        <Card>
          <h4 className="text-lg font-medium text-white mb-4">Target Allocation</h4>
          
          <div className="space-y-3">
            {strategies.slice(0, 4).map(strategy => (
              <div key={strategy.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{strategy.icon}</span>
                  <span className="text-white text-sm">{strategy.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={autoRebalanceConfig.targetAllocation[strategy.id] || 0}
                    onChange={(e) => setAutoRebalanceConfig(prev => ({
                      ...prev,
                      targetAllocation: {
                        ...prev.targetAllocation,
                        [strategy.id]: parseInt(e.target.value)
                      }
                    }))}
                    className="w-20"
                  />
                  <span className="text-white font-medium w-8 text-sm">
                    {autoRebalanceConfig.targetAllocation[strategy.id] || 0}%
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 p-3 bg-dark-700/30 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Total Allocation:</span>
              <span className="text-white font-medium">
                {Object.values(autoRebalanceConfig.targetAllocation).reduce((sum, val) => sum + val, 0)}%
              </span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );

  const renderDCATab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white mb-2">Dollar Cost Averaging</h3>
          <p className="text-gray-400">Invest fixed amounts regularly to reduce market timing risk</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${dcaConfig.enabled ? 'bg-green-400' : 'bg-gray-500'}`}></div>
          <span className="text-sm text-gray-400">
            {dcaConfig.enabled ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <h4 className="text-lg font-medium text-white mb-4">DCA Configuration</h4>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Investment Amount (BNB)
              </label>
              <input
                type="number"
                step="0.001"
                value={dcaConfig.amount}
                onChange={(e) => setDCAConfig(prev => ({
                  ...prev,
                  amount: parseFloat(e.target.value) || 0
                }))}
                className="w-full px-3 py-2 bg-dark-700/50 border border-dark-600 rounded-xl text-white"
                placeholder="0.01"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Frequency
              </label>
              <select
                value={dcaConfig.frequency}
                onChange={(e) => setDCAConfig(prev => ({
                  ...prev,
                  frequency: e.target.value as any
                }))}
                className="w-full px-3 py-2 bg-dark-700/50 border border-dark-600 rounded-xl text-white"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Target Strategy
              </label>
              <select
                value={dcaConfig.targetStrategy}
                onChange={(e) => setDCAConfig(prev => ({
                  ...prev,
                  targetStrategy: e.target.value
                }))}
                className="w-full px-3 py-2 bg-dark-700/50 border border-dark-600 rounded-xl text-white"
              >
                {strategies.map(strategy => (
                  <option key={strategy.id} value={strategy.id}>
                    {strategy.icon} {strategy.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={dcaConfig.enabled}
                onChange={(e) => setDCAConfig(prev => ({
                  ...prev,
                  enabled: e.target.checked
                }))}
                className="rounded"
              />
              <label className="text-sm text-gray-300">Enable DCA Strategy</label>
            </div>
          </div>

          <Button
            className="w-full mt-6"
            onClick={handleSetupDCA}
            loading={loading}
            icon={TrendingUp}
          >
            Setup DCA Strategy
          </Button>
        </Card>

        <Card>
          <h4 className="text-lg font-medium text-white mb-4">Projection</h4>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-dark-700/30 rounded-lg">
                <p className="text-xs text-gray-400 mb-1">Monthly Investment</p>
                <p className="text-lg font-semibold text-white">
                  {dcaConfig.frequency === 'daily' ? (dcaConfig.amount * 30).toFixed(3) :
                   dcaConfig.frequency === 'weekly' ? (dcaConfig.amount * 4).toFixed(3) :
                   dcaConfig.amount.toFixed(3)} BNB
                </p>
              </div>
              <div className="p-3 bg-dark-700/30 rounded-lg">
                <p className="text-xs text-gray-400 mb-1">Annual Investment</p>
                <p className="text-lg font-semibold text-white">
                  {dcaConfig.frequency === 'daily' ? (dcaConfig.amount * 365).toFixed(2) :
                   dcaConfig.frequency === 'weekly' ? (dcaConfig.amount * 52).toFixed(2) :
                   (dcaConfig.amount * 12).toFixed(2)} BNB
                </p>
              </div>
            </div>

            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
              <h5 className="text-green-400 font-medium mb-2">Projected Returns (1 Year)</h5>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">Total Invested:</span>
                  <span className="text-white">
                    ${((dcaConfig.frequency === 'daily' ? dcaConfig.amount * 365 :
                        dcaConfig.frequency === 'weekly' ? dcaConfig.amount * 52 :
                        dcaConfig.amount * 12) * (marketData?.bnb_price_usd || 326)).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Expected Value:</span>
                  <span className="text-green-400">
                    ${((dcaConfig.frequency === 'daily' ? dcaConfig.amount * 365 :
                        dcaConfig.frequency === 'weekly' ? dcaConfig.amount * 52 :
                        dcaConfig.amount * 12) * (marketData?.bnb_price_usd || 326) * 1.08).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Potential Profit:</span>
                  <span className="text-green-400">
                    +${((dcaConfig.frequency === 'daily' ? dcaConfig.amount * 365 :
                         dcaConfig.frequency === 'weekly' ? dcaConfig.amount * 52 :
                         dcaConfig.amount * 12) * (marketData?.bnb_price_usd || 326) * 0.08).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );

  const renderRiskTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-white mb-2">Risk Management</h3>
          <p className="text-gray-400">Protect your investments with automated risk controls</p>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-green-400" />
          <span className="text-sm text-green-400">Protection Active</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <h4 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            Stop Loss
          </h4>
          
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={riskConfig.stopLoss.enabled}
                onChange={(e) => setRiskConfig(prev => ({
                  ...prev,
                  stopLoss: { ...prev.stopLoss, enabled: e.target.checked }
                }))}
                className="rounded"
              />
              <label className="text-sm text-gray-300">Enable Stop Loss</label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Loss Threshold
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="5"
                  max="50"
                  value={riskConfig.stopLoss.threshold}
                  onChange={(e) => setRiskConfig(prev => ({
                    ...prev,
                    stopLoss: { ...prev.stopLoss, threshold: parseInt(e.target.value) }
                  }))}
                  className="flex-1"
                  disabled={!riskConfig.stopLoss.enabled}
                />
                <span className="text-white font-medium w-12">
                  {riskConfig.stopLoss.threshold}%
                </span>
              </div>
            </div>

            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-xs text-red-400 mb-1">Trigger Price</p>
              <p className="text-sm text-white">
                ${((marketData?.bnb_price_usd || 326) * (1 - riskConfig.stopLoss.threshold / 100)).toFixed(2)}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <h4 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-green-400" />
            Take Profit
          </h4>
          
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={riskConfig.takeProfit.enabled}
                onChange={(e) => setRiskConfig(prev => ({
                  ...prev,
                  takeProfit: { ...prev.takeProfit, enabled: e.target.checked }
                }))}
                className="rounded"
              />
              <label className="text-sm text-gray-300">Enable Take Profit</label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Profit Threshold
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={riskConfig.takeProfit.threshold}
                  onChange={(e) => setRiskConfig(prev => ({
                    ...prev,
                    takeProfit: { ...prev.takeProfit, threshold: parseInt(e.target.value) }
                  }))}
                  className="flex-1"
                  disabled={!riskConfig.takeProfit.enabled}
                />
                <span className="text-white font-medium w-12">
                  {riskConfig.takeProfit.threshold}%
                </span>
              </div>
            </div>

            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-xs text-green-400 mb-1">Target Price</p>
              <p className="text-sm text-white">
                ${((marketData?.bnb_price_usd || 326) * (1 + riskConfig.takeProfit.threshold / 100)).toFixed(2)}
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <h4 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-400" />
            Max Drawdown
          </h4>
          
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={riskConfig.maxDrawdown.enabled}
                onChange={(e) => setRiskConfig(prev => ({
                  ...prev,
                  maxDrawdown: { ...prev.maxDrawdown, enabled: e.target.checked }
                }))}
                className="rounded"
              />
              <label className="text-sm text-gray-300">Enable Max Drawdown</label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Drawdown Limit
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="5"
                  max="30"
                  value={riskConfig.maxDrawdown.threshold}
                  onChange={(e) => setRiskConfig(prev => ({
                    ...prev,
                    maxDrawdown: { ...prev.maxDrawdown, threshold: parseInt(e.target.value) }
                  }))}
                  className="flex-1"
                  disabled={!riskConfig.maxDrawdown.enabled}
                />
                <span className="text-white font-medium w-12">
                  {riskConfig.maxDrawdown.threshold}%
                </span>
              </div>
            </div>

            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-xs text-blue-400 mb-1">Protection Level</p>
              <p className="text-sm text-white">
                {riskConfig.stopLoss.enabled && riskConfig.takeProfit.enabled && riskConfig.maxDrawdown.enabled 
                  ? 'Maximum' : 'Partial'}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Button
        className="w-full"
        onClick={handleSetupRiskManagement}
        loading={loading}
        icon={Shield}
      >
        Configure Risk Management
      </Button>
    </div>
  );

  const renderAnalyticsTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-semibold text-white mb-2">Advanced Analytics</h3>
        <p className="text-gray-400">AI-powered insights and recommendations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Portfolio Performance</p>
              <p className="text-xl font-bold text-green-400">+12.4%</p>
            </div>
          </div>
          <p className="text-xs text-gray-400">Last 30 days</p>
        </Card>

        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Shield className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Risk Score</p>
              <p className="text-xl font-bold text-blue-400">6.2/10</p>
            </div>
          </div>
          <p className="text-xs text-gray-400">Medium risk</p>
        </Card>

        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <Zap className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Efficiency Score</p>
              <p className="text-xl font-bold text-yellow-400">8.7/10</p>
            </div>
          </div>
          <p className="text-xs text-gray-400">Highly optimized</p>
        </Card>

        <Card>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Activity className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-gray-400">Active Strategies</p>
              <p className="text-xl font-bold text-purple-400">{strategies.length}</p>
            </div>
          </div>
          <p className="text-xs text-gray-400">Diversified</p>
        </Card>
      </div>

      <Card>
        <h4 className="text-lg font-medium text-white mb-4">AI Recommendations</h4>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
            <CheckCircle className="w-5 h-5 text-green-400 mt-0.5" />
            <div>
              <p className="text-sm text-white font-medium">Rebalance Opportunity</p>
              <p className="text-xs text-gray-400">Consider moving 15% from Venus to Beefy for +2.3% APY improvement</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-yellow-400 mt-0.5" />
            <div>
              <p className="text-sm text-white font-medium">Risk Alert</p>
              <p className="text-xs text-gray-400">High concentration in single protocol detected - diversification recommended</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <TrendingUp className="w-5 h-5 text-blue-400 mt-0.5" />
            <div>
              <p className="text-sm text-white font-medium">Yield Optimization</p>
              <p className="text-xs text-gray-400">Enable auto-compounding to increase effective APY by 1.8%</p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  return (
    <div className="pt-20 min-h-screen bg-dark-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-2">Advanced Operations</h1>
          <p className="text-gray-400">Professional DeFi tools and automation</p>
        </motion.div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="mb-6 space-y-2">
            {alerts.slice(-3).map((alert, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`p-3 rounded-lg border ${
                  alert.severity === 'high' ? 'bg-red-500/10 border-red-500/30' :
                  alert.severity === 'medium' ? 'bg-yellow-500/10 border-yellow-500/30' :
                  'bg-green-500/10 border-green-500/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm text-white">{alert.message}</p>
                  <span className="text-xs text-gray-400">
                    {alert.timestamp.toLocaleTimeString()}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="flex space-x-1 mb-8 bg-dark-800 p-1 rounded-xl">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-gold-500 text-dark-900'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'rebalance' && renderAutoRebalanceTab()}
            {activeTab === 'dca' && renderDCATab()}
            {activeTab === 'risk' && renderRiskTab()}
            {activeTab === 'analytics' && renderAnalyticsTab()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}