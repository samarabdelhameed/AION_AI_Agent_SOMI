import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { usePortfolioMetrics } from '../../hooks/usePortfolioMetrics';
import { 
  Shield, 
  AlertTriangle, 
  TrendingDown, 
  Target, 
  Activity,
  RefreshCw,
  Settings,
  Eye,
  EyeOff
} from 'lucide-react';

interface RiskManagementDashboardProps {
  userAddress?: string;
  className?: string;
}

export function RiskManagementDashboard({ userAddress, className = '' }: RiskManagementDashboardProps) {
  const { riskMetrics, portfolioMetrics, isLoading, refreshMetrics } = usePortfolioMetrics(userAddress);
  const [showDetails, setShowDetails] = useState(false);

  if (isLoading || !riskMetrics) {
    return (
      <Card className={className}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-700 rounded mb-4"></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="h-20 bg-gray-700 rounded"></div>
            <div className="h-20 bg-gray-700 rounded"></div>
          </div>
        </div>
      </Card>
    );
  }

  const getRiskColor = (score: number) => {
    if (score < 30) return { text: 'text-green-400', bg: 'bg-green-400' };
    if (score < 60) return { text: 'text-yellow-400', bg: 'bg-yellow-400' };
    return { text: 'text-red-400', bg: 'bg-red-400' };
  };

  const getRiskLevel = (score: number) => {
    if (score < 30) return 'Low Risk';
    if (score < 60) return 'Medium Risk';
    return 'High Risk';
  };

  const riskComponents = [
    { 
      label: 'Portfolio Risk', 
      value: riskMetrics.portfolioRisk, 
      description: 'Overall portfolio volatility and correlation',
      icon: Activity,
      weight: 30
    },
    { 
      label: 'Concentration Risk', 
      value: riskMetrics.concentrationRisk, 
      description: 'Risk from concentrated positions',
      icon: Target,
      weight: 20
    },
    { 
      label: 'Liquidity Risk', 
      value: riskMetrics.liquidityRisk, 
      description: 'Risk from illiquid assets',
      icon: TrendingDown,
      weight: 20
    },
    { 
      label: 'Protocol Risk', 
      value: riskMetrics.protocolRisk, 
      description: 'Risk from protocol failures',
      icon: Shield,
      weight: 15
    },
    { 
      label: 'Smart Contract Risk', 
      value: riskMetrics.smartContractRisk, 
      description: 'Risk from contract vulnerabilities',
      icon: AlertTriangle,
      weight: 15
    }
  ];

  return (
    <Card className={className}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-gold-500" />
          <h3 className="text-lg font-semibold text-white">Risk Management</h3>
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
          >
            Refresh
          </Button>
        </div>
      </div>

      {/* Overall Risk Score */}
      <div className="text-center mb-6">
        <div className={`text-6xl font-bold mb-2 ${getRiskColor(riskMetrics.overallRiskScore).text}`}>
          {riskMetrics.overallRiskScore.toFixed(0)}
        </div>
        <p className="text-gray-400 mb-1">Overall Risk Score</p>
        <p className={`text-sm font-medium ${getRiskColor(riskMetrics.overallRiskScore).text}`}>
          {getRiskLevel(riskMetrics.overallRiskScore)}
        </p>
      </div>

      {/* Risk Components Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {riskComponents.map((component) => {
          const Icon = component.icon;
          const colors = getRiskColor(component.value);
          
          return (
            <motion.div
              key={component.label}
              className="bg-dark-700/30 rounded-xl p-4"
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${colors.text}`} />
                  <span className="text-sm font-medium text-white">{component.label}</span>
                </div>
                <span className={`text-lg font-bold ${colors.text}`}>
                  {component.value.toFixed(1)}
                </span>
              </div>
              
              <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                <div
                  className={`h-2 rounded-full ${colors.bg}`}
                  style={{ width: `${Math.min(component.value, 100)}%` }}
                />
              </div>
              
              {showDetails && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-2"
                >
                  <p className="text-xs text-gray-400">{component.description}</p>
                  <p className="text-xs text-gray-500 mt-1">Weight: {component.weight}%</p>
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Risk Recommendations */}
      <div className="bg-dark-700/30 rounded-xl p-4">
        <h4 className="text-sm font-semibold text-white mb-3">Risk Recommendations</h4>
        <div className="space-y-2">
          {riskMetrics.overallRiskScore > 70 && (
            <div className="flex items-start gap-2 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5" />
              <div>
                <p className="text-sm text-red-300">High Risk Detected</p>
                <p className="text-xs text-red-400">Consider reducing position sizes or diversifying</p>
              </div>
            </div>
          )}
          
          {riskMetrics.concentrationRisk > 60 && (
            <div className="flex items-start gap-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <Target className="w-4 h-4 text-yellow-400 mt-0.5" />
              <div>
                <p className="text-sm text-yellow-300">High Concentration Risk</p>
                <p className="text-xs text-yellow-400">Diversify across more protocols</p>
              </div>
            </div>
          )}
          
          {riskMetrics.liquidityRisk > 50 && (
            <div className="flex items-start gap-2 p-2 bg-orange-500/10 border border-orange-500/30 rounded-lg">
              <TrendingDown className="w-4 h-4 text-orange-400 mt-0.5" />
              <div>
                <p className="text-sm text-orange-300">Liquidity Risk Warning</p>
                <p className="text-xs text-orange-400">Maintain liquid reserves for emergencies</p>
              </div>
            </div>
          )}
          
          {riskMetrics.overallRiskScore < 30 && (
            <div className="flex items-start gap-2 p-2 bg-green-500/10 border border-green-500/30 rounded-lg">
              <Shield className="w-4 h-4 text-green-400 mt-0.5" />
              <div>
                <p className="text-sm text-green-300">Low Risk Portfolio</p>
                <p className="text-xs text-green-400">Well-balanced risk profile</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}