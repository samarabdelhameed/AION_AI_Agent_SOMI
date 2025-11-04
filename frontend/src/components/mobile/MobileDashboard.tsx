import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { usePortfolioMetrics } from '../../hooks/usePortfolioMetrics';
import { useWalletOnchain } from '../../hooks/useWalletOnchain';
import { 
  DollarSign, 
  TrendingUp, 
  Shield, 
  Menu,
  X,
  Wallet,
  BarChart3,
  Settings,
  Bell,
  RefreshCw
} from 'lucide-react';

interface MobileDashboardProps {
  onNavigate: (page: string) => void;
}

export function MobileDashboard({ onNavigate }: MobileDashboardProps) {
  const wallet = useWalletOnchain();
  const { portfolioMetrics, riskMetrics, isLoading } = usePortfolioMetrics(wallet.address);
  const [showMenu, setShowMenu] = useState(false);

  const quickActions = [
    { label: 'Deposit', action: () => onNavigate('vault'), icon: DollarSign, color: 'bg-green-500' },
    { label: 'Strategies', action: () => onNavigate('strategies'), icon: BarChart3, color: 'bg-blue-500' },
    { label: 'Analytics', action: () => onNavigate('analytics'), icon: TrendingUp, color: 'bg-purple-500' },
    { label: 'Settings', action: () => onNavigate('settings'), icon: Settings, color: 'bg-gray-500' }
  ];

  return (
    <div className="min-h-screen bg-dark-900 pb-20">
      {/* Mobile Header */}
      <div className="sticky top-0 z-50 bg-dark-900/95 backdrop-blur-sm border-b border-gray-800">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-r from-gold-500 to-gold-600 rounded-lg flex items-center justify-center">
              <span className="text-black font-bold text-sm">A</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">AION Vault</h1>
              <p className="text-xs text-gray-400">
                {wallet.address ? `${wallet.address.slice(0, 6)}...${wallet.address.slice(-4)}` : 'Not Connected'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" icon={Bell}>
              <span className="sr-only">Notifications</span>
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              icon={showMenu ? X : Menu}
              onClick={() => setShowMenu(!showMenu)}
            >
              <span className="sr-only">Menu</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {showMenu && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 bg-black/50"
          onClick={() => setShowMenu(false)}
        >
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="absolute right-0 top-0 h-full w-80 bg-dark-800 p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white">Navigation</h3>
              {[
                { label: 'Dashboard', page: 'dashboard' },
                { label: 'Vault', page: 'vault' },
                { label: 'Strategies', page: 'strategies' },
                { label: 'Analytics', page: 'analytics' },
                { label: 'AI Agent', page: 'agent' },
                { label: 'Settings', page: 'settings' }
              ].map((item) => (
                <button
                  key={item.page}
                  onClick={() => {
                    onNavigate(item.page);
                    setShowMenu(false);
                  }}
                  className="block w-full text-left p-3 rounded-lg hover:bg-dark-700 text-white"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}

      <div className="p-4 space-y-6">
        {/* Portfolio Overview Cards */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-green-400" />
              <span className="text-xs text-gray-400">Total Value</span>
            </div>
            {isLoading ? (
              <div className="animate-pulse bg-gray-700 h-6 rounded"></div>
            ) : (
              <>
                <p className="text-lg font-bold text-white">
                  ${portfolioMetrics?.totalValueUSD.toFixed(0) || '0'}
                </p>
                <p className="text-xs text-green-400">
                  +{portfolioMetrics?.currentAPY.toFixed(1) || '0'}% APY
                </p>
              </>
            )}
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-gold-500" />
              <span className="text-xs text-gray-400">Daily Yield</span>
            </div>
            {isLoading ? (
              <div className="animate-pulse bg-gray-700 h-6 rounded"></div>
            ) : (
              <>
                <p className="text-lg font-bold text-white">
                  ${portfolioMetrics?.dailyYield.toFixed(2) || '0'}
                </p>
                <p className="text-xs text-gray-400">
                  ${(portfolioMetrics?.dailyYield || 0) * 30} monthly
                </p>
              </>
            )}
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-orange-400" />
              <span className="text-xs text-gray-400">Risk Score</span>
            </div>
            {isLoading ? (
              <div className="animate-pulse bg-gray-700 h-6 rounded"></div>
            ) : (
              <>
                <p className={`text-lg font-bold ${
                  (riskMetrics?.overallRiskScore || 0) < 30 ? 'text-green-400' :
                  (riskMetrics?.overallRiskScore || 0) < 60 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {riskMetrics?.overallRiskScore.toFixed(0) || '0'}/100
                </p>
                <p className="text-xs text-gray-400">
                  {(riskMetrics?.overallRiskScore || 0) < 30 ? 'Low Risk' :
                   (riskMetrics?.overallRiskScore || 0) < 60 ? 'Medium Risk' : 'High Risk'}
                </p>
              </>
            )}
          </Card>

          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Wallet className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-gray-400">BNB Balance</span>
            </div>
            <p className="text-lg font-bold text-white">
              {wallet.balances.BNB?.toFixed(4) || '0.0000'}
            </p>
            <p className="text-xs text-gray-400">
              ${((wallet.balances.BNB || 0) * 326.12).toFixed(2)}
            </p>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  onClick={action.action}
                  className="flex flex-col items-center gap-2 p-4 bg-dark-700/50 rounded-xl hover:bg-dark-600/50 transition-colors"
                >
                  <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm text-white">{action.label}</span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* Performance Chart Placeholder */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white">Performance</h3>
            <Button size="sm" variant="ghost" icon={RefreshCw}>
              <span className="sr-only">Refresh</span>
            </Button>
          </div>
          <div className="h-32 bg-dark-700/30 rounded-lg flex items-center justify-center">
            <p className="text-gray-400 text-sm">Chart placeholder</p>
          </div>
        </Card>

        {/* Recent Activity */}
        <Card className="p-4">
          <h3 className="text-sm font-semibold text-white mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {[
              { type: 'Deposit', amount: '1.5 BNB', time: '2h ago', status: 'confirmed' },
              { type: 'Yield Claim', amount: '0.08 BNB', time: '1d ago', status: 'confirmed' },
              { type: 'Rebalance', amount: '2.3 BNB', time: '3d ago', status: 'confirmed' }
            ].map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-dark-700/30 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-white">{activity.type}</p>
                  <p className="text-xs text-gray-400">{activity.time}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-white">{activity.amount}</p>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-400"></div>
                    <span className="text-xs text-green-400">{activity.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-dark-800 border-t border-gray-700 p-4">
        <div className="flex justify-around">
          {[
            { label: 'Dashboard', page: 'dashboard', icon: BarChart3 },
            { label: 'Vault', page: 'vault', icon: DollarSign },
            { label: 'Strategies', page: 'strategies', icon: TrendingUp },
            { label: 'AI', page: 'agent', icon: Shield }
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.page}
                onClick={() => onNavigate(item.page)}
                className="flex flex-col items-center gap-1 p-2"
              >
                <Icon className="w-5 h-5 text-gray-400" />
                <span className="text-xs text-gray-400">{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}