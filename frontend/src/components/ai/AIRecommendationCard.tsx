import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { 
  aiRecommendationService, 
  AIRecommendation, 
  MarketAnalysis 
} from '../../services/aiRecommendationService';
import { 
  Brain, 
  TrendingUp, 
  Shield, 
  Target, 
  Zap,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  DollarSign
} from 'lucide-react';

interface AIRecommendationCardProps {
  userAddress?: string;
  className?: string;
  maxRecommendations?: number;
}

export function AIRecommendationCard({ 
  userAddress, 
  className = '', 
  maxRecommendations = 5 
}: AIRecommendationCardProps) {
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [marketAnalysis, setMarketAnalysis] = useState<MarketAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [executingId, setExecutingId] = useState<string | null>(null);

  useEffect(() => {
    if (userAddress) {
      loadRecommendations();
      loadMarketAnalysis();
      
      // Start real-time analysis
      aiRecommendationService.startRealTimeAnalysis((analysis) => {
        setMarketAnalysis(analysis);
      });

      return () => {
        aiRecommendationService.stopRealTimeAnalysis();
      };
    }
  }, [userAddress]);

  const loadRecommendations = async () => {
    if (!userAddress) return;
    
    try {
      setIsLoading(true);
      const recs = await aiRecommendationService.getRecommendations(userAddress);
      setRecommendations(recs.slice(0, maxRecommendations));
    } catch (error) {
      console.error('Error loading recommendations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMarketAnalysis = async () => {
    try {
      const analysis = await aiRecommendationService.getMarketAnalysis();
      setMarketAnalysis(analysis);
    } catch (error) {
      console.error('Error loading market analysis:', error);
    }
  };

  const handleExecuteRecommendation = async (recommendationId: string) => {
    if (!userAddress) return;
    
    try {
      setExecutingId(recommendationId);
      const success = await aiRecommendationService.executeRecommendation(userAddress, recommendationId);
      
      if (success) {
        // Update recommendation status
        setRecommendations(prev => 
          prev.map(rec => 
            rec.id === recommendationId 
              ? { ...rec, status: 'executed' as const }
              : rec
          )
        );
      }
    } catch (error) {
      console.error('Error executing recommendation:', error);
    } finally {
      setExecutingId(null);
    }
  };

  const getRecommendationIcon = (type: AIRecommendation['type']) => {
    switch (type) {
      case 'rebalance':
        return <BarChart3 className="w-4 h-4 text-blue-400" />;
      case 'deposit':
        return <DollarSign className="w-4 h-4 text-green-400" />;
      case 'withdraw':
        return <TrendingUp className="w-4 h-4 text-red-400" />;
      case 'strategy_switch':
        return <Zap className="w-4 h-4 text-purple-400" />;
      case 'risk_adjustment':
        return <Shield className="w-4 h-4 text-orange-400" />;
      case 'yield_optimization':
        return <Target className="w-4 h-4 text-gold-500" />;
      default:
        return <Brain className="w-4 h-4 text-gray-400" />;
    }
  };

  const getPriorityColor = (priority: AIRecommendation['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'border-red-500 bg-red-500/10';
      case 'high':
        return 'border-orange-500 bg-orange-500/10';
      case 'medium':
        return 'border-yellow-500 bg-yellow-500/10';
      case 'low':
        return 'border-blue-500 bg-blue-500/10';
    }
  };

  const getRiskColor = (risk: AIRecommendation['riskLevel']) => {
    switch (risk) {
      case 'low':
        return 'text-green-400';
      case 'medium':
        return 'text-yellow-400';
      case 'high':
        return 'text-red-400';
    }
  };

  const getStatusIcon = (status: AIRecommendation['status']) => {
    switch (status) {
      case 'executed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'dismissed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      case 'expired':
        return <Clock className="w-4 h-4 text-gray-400" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-400" />;
    }
  };

  if (!userAddress) {
    return (
      <Card className={className}>
        <div className="text-center py-8">
          <Brain className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400">Connect wallet to get AI recommendations</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Brain className="w-5 h-5 text-gold-500" />
          <h3 className="text-lg font-semibold text-white">AI Recommendations</h3>
          {marketAnalysis && (
            <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-300">
              Live Analysis
            </span>
          )}
        </div>
        <Button
          size="sm"
          variant="ghost"
          icon={RefreshCw}
          onClick={loadRecommendations}
          disabled={isLoading}
        >
          Refresh
        </Button>
      </div>

      {/* Market Analysis Summary */}
      {marketAnalysis && (
        <div className="mb-6 p-4 bg-dark-700/30 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-semibold text-white">Market Analysis</h4>
            <span className={`text-xs px-2 py-1 rounded-full ${
              marketAnalysis.marketTrend === 'bullish' ? 'bg-green-500/20 text-green-300' :
              marketAnalysis.marketTrend === 'bearish' ? 'bg-red-500/20 text-red-300' :
              'bg-yellow-500/20 text-yellow-300'
            }`}>
              {marketAnalysis.marketTrend.toUpperCase()}
            </span>
          </div>
          
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-400">BNB Price</p>
              <p className="text-sm font-semibold text-white">
                ${marketAnalysis.bnbPrice.toFixed(2)}
              </p>
              <p className={`text-xs ${marketAnalysis.priceChange24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {marketAnalysis.priceChange24h >= 0 ? '+' : ''}{marketAnalysis.priceChange24h.toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Volatility</p>
              <p className="text-sm font-semibold text-white">
                {marketAnalysis.volatility.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-400">Opportunities</p>
              <p className="text-sm font-semibold text-gold-500">
                {marketAnalysis.opportunities.length}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Recommendations List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse bg-dark-700/30 rounded-xl p-4 h-24" />
            ))}
          </div>
        ) : recommendations.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">No recommendations available</p>
            <p className="text-gray-500 text-sm mt-1">Check back later for AI insights</p>
          </div>
        ) : (
          recommendations.map((recommendation) => (
            <motion.div
              key={recommendation.id}
              className={`border rounded-xl p-4 ${getPriorityColor(recommendation.priority)}`}
              whileHover={{ scale: 1.01 }}
              layout
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {getRecommendationIcon(recommendation.type)}
                  <div>
                    <h4 className="text-sm font-semibold text-white">
                      {recommendation.title}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs px-2 py-0.5 bg-gray-700 text-gray-300 rounded capitalize">
                        {recommendation.type.replace('_', ' ')}
                      </span>
                      <span className={`text-xs ${getRiskColor(recommendation.riskLevel)}`}>
                        {recommendation.riskLevel} risk
                      </span>
                      <span className="text-xs text-gray-400">
                        {recommendation.confidence}% confidence
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {getStatusIcon(recommendation.status)}
                  <span className="text-xs text-gray-400 capitalize">
                    {recommendation.priority}
                  </span>
                </div>
              </div>

              <p className="text-sm text-gray-300 mb-3">
                {recommendation.description}
              </p>

              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-xs text-gray-400">Expected Return</p>
                    <p className={`text-sm font-semibold ${
                      recommendation.expectedReturn >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {recommendation.expectedReturn >= 0 ? '+' : ''}{recommendation.expectedReturn.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Timeframe</p>
                    <p className="text-sm text-white">{recommendation.timeframe}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Est. Cost</p>
                    <p className="text-sm text-white">
                      ${recommendation.action.estimatedCost.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {recommendation.status === 'pending' && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleExecuteRecommendation(recommendation.id)}
                    disabled={executingId === recommendation.id}
                    className="flex-1"
                  >
                    {executingId === recommendation.id ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin mr-2" />
                        Executing...
                      </>
                    ) : (
                      <>
                        Execute
                        <ArrowRight className="w-3 h-3 ml-2" />
                      </>
                    )}
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setRecommendations(prev => 
                        prev.map(rec => 
                          rec.id === recommendation.id 
                            ? { ...rec, status: 'dismissed' as const }
                            : rec
                        )
                      );
                    }}
                  >
                    Dismiss
                  </Button>
                </div>
              )}

              {recommendation.status === 'executed' && (
                <div className="flex items-center gap-2 p-2 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-green-300">Recommendation executed successfully</span>
                </div>
              )}

              {/* Reasoning (expandable) */}
              <details className="mt-3">
                <summary className="text-xs text-gray-400 cursor-pointer hover:text-white">
                  View AI Reasoning
                </summary>
                <div className="mt-2 p-3 bg-dark-800/50 rounded-lg">
                  <p className="text-xs text-gray-300">{recommendation.reasoning}</p>
                </div>
              </details>
            </motion.div>
          ))
        )}
      </div>

      {/* Real-time indicator */}
      <div className="mt-4 pt-4 border-t border-gray-700">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-gray-400">AI analysis active</span>
          </div>
          {marketAnalysis && (
            <span className="text-gray-500">
              Updated {marketAnalysis.lastUpdated.toLocaleTimeString()}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}