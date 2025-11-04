import { portfolioMetricsService } from './portfolioMetricsService';
import { vaultService } from './vaultService';
import { ethers, BigNumber, utils } from '../utils/ethersCompat';

export interface AIRecommendation {
  id: string;
  type: 'rebalance' | 'deposit' | 'withdraw' | 'strategy_switch' | 'risk_adjustment' | 'yield_optimization';
  title: string;
  description: string;
  reasoning: string;
  confidence: number; // 0-100
  riskLevel: 'low' | 'medium' | 'high';
  expectedReturn: number;
  timeframe: string;
  action: RecommendationAction;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: Date;
  expiresAt: Date;
  status: 'pending' | 'executed' | 'dismissed' | 'expired';
}

export interface RecommendationAction {
  type: string;
  parameters: Record<string, any>;
  estimatedGas: BigNumber;
  estimatedCost: number;
}

export interface MarketAnalysis {
  bnbPrice: number;
  priceChange24h: number;
  marketTrend: 'bullish' | 'bearish' | 'neutral';
  volatility: number;
  protocolHealth: ProtocolHealth[];
  opportunities: MarketOpportunity[];
  risks: MarketRisk[];
  lastUpdated: Date;
}

export interface ProtocolHealth {
  protocol: string;
  healthScore: number;
  tvl: number;
  apy: number;
  utilization: number;
  status: 'healthy' | 'warning' | 'critical';
}

export interface MarketOpportunity {
  type: 'arbitrage' | 'yield_farming' | 'lending' | 'liquidity_provision';
  protocol: string;
  expectedReturn: number;
  riskLevel: 'low' | 'medium' | 'high';
  description: string;
  timeframe: string;
}

export interface MarketRisk {
  type: 'protocol' | 'market' | 'liquidity' | 'smart_contract';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedProtocols: string[];
  recommendation: string;
}

export interface RiskAssessment {
  overallRisk: number;
  riskFactors: RiskFactor[];
  recommendations: string[];
  maxRecommendedAllocation: number;
}

export interface RiskFactor {
  factor: string;
  impact: number;
  description: string;
  mitigation: string;
}

class AIRecommendationService {
  private recommendations: Map<string, AIRecommendation[]> = new Map();
  private marketAnalysis: MarketAnalysis | null = null;
  private updateInterval: NodeJS.Timeout | null = null;

  async getRecommendations(userAddress: string): Promise<AIRecommendation[]> {
    try {
      console.log('🤖 Generating AI recommendations for:', userAddress);

      // Get portfolio data
      const portfolioMetrics = await portfolioMetricsService.calculatePortfolioMetrics(userAddress);
      const riskMetrics = await portfolioMetricsService.calculateRiskMetrics(userAddress);
      const performanceAttribution = await portfolioMetricsService.getPerformanceAttribution(userAddress);

      // Generate recommendations based on portfolio analysis
      const recommendations = await this.generateRecommendations(
        userAddress,
        portfolioMetrics,
        riskMetrics,
        performanceAttribution
      );

      // Cache recommendations
      this.recommendations.set(userAddress, recommendations);

      console.log(`✅ Generated ${recommendations.length} AI recommendations`);
      return recommendations;
    } catch (error) {
      console.error('❌ Error generating AI recommendations:', error);
      return this.getMockRecommendations(userAddress);
    }
  }

  private async generateRecommendations(
    userAddress: string,
    portfolioMetrics: any,
    riskMetrics: any,
    performanceAttribution: any
  ): Promise<AIRecommendation[]> {
    const recommendations: AIRecommendation[] = [];
    const now = new Date();

    // Risk-based recommendations
    if (riskMetrics.overallRiskScore > 70) {
      recommendations.push({
        id: `risk_${Date.now()}`,
        type: 'risk_adjustment',
        title: 'Reduce Portfolio Risk',
        description: 'Your portfolio risk score is high. Consider reducing exposure to volatile assets.',
        reasoning: `Risk score of ${riskMetrics.overallRiskScore.toFixed(1)} exceeds recommended threshold of 70. High concentration and protocol risks detected.`,
        confidence: 85,
        riskLevel: 'low',
        expectedReturn: -2.5,
        timeframe: '1-2 weeks',
        action: {
          type: 'rebalance',
          parameters: {
            reduceHighRiskAllocations: true,
            targetRiskScore: 50
          },
          estimatedGas: utils.parseUnits('150000', 'wei'),
          estimatedCost: 15.2
        },
        priority: 'high',
        createdAt: now,
        expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        status: 'pending'
      });
    }

    // Performance optimization recommendations
    if (performanceAttribution.totalReturn < 8) {
      recommendations.push({
        id: `perf_${Date.now()}`,
        type: 'yield_optimization',
        title: 'Optimize Yield Strategy',
        description: 'Switch to higher-yielding protocols to improve returns.',
        reasoning: `Current return of ${performanceAttribution.totalReturn.toFixed(2)}% is below market average. Venus and Beefy protocols showing higher APYs.`,
        confidence: 78,
        riskLevel: 'medium',
        expectedReturn: 4.2,
        timeframe: '2-4 weeks',
        action: {
          type: 'strategy_switch',
          parameters: {
            fromProtocol: 'current',
            toProtocol: 'Venus',
            percentage: 30
          },
          estimatedGas: utils.parseUnits('200000', 'wei'),
          estimatedCost: 20.5
        },
        priority: 'medium',
        createdAt: now,
        expiresAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
        status: 'pending'
      });
    }

    // Rebalancing recommendations
    if (riskMetrics.concentrationRisk > 60) {
      recommendations.push({
        id: `rebal_${Date.now()}`,
        type: 'rebalance',
        title: 'Diversify Portfolio',
        description: 'Rebalance to reduce concentration risk across protocols.',
        reasoning: `Concentration risk of ${riskMetrics.concentrationRisk.toFixed(1)} indicates over-allocation to specific protocols. Diversification recommended.`,
        confidence: 92,
        riskLevel: 'low',
        expectedReturn: 1.8,
        timeframe: '1 week',
        action: {
          type: 'rebalance',
          parameters: {
            targetAllocations: {
              'Venus': 25,
              'Beefy': 25,
              'PancakeSwap': 25,
              'Aave': 25
            }
          },
          estimatedGas: utils.parseUnits('300000', 'wei'),
          estimatedCost: 30.8
        },
        priority: 'medium',
        createdAt: now,
        expiresAt: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
        status: 'pending'
      });
    }

    // Market opportunity recommendations
    const marketAnalysis = await this.getMarketAnalysis();
    if (marketAnalysis.marketTrend === 'bullish') {
      recommendations.push({
        id: `market_${Date.now()}`,
        type: 'deposit',
        title: 'Increase Position Size',
        description: 'Market conditions are favorable for increasing DeFi exposure.',
        reasoning: `Bullish market trend detected with ${marketAnalysis.priceChange24h.toFixed(2)}% BNB price increase. Good entry opportunity.`,
        confidence: 72,
        riskLevel: 'medium',
        expectedReturn: 6.5,
        timeframe: '1-3 months',
        action: {
          type: 'deposit',
          parameters: {
            suggestedAmount: utils.parseEther('1'),
            protocols: ['Venus', 'Beefy']
          },
          estimatedGas: utils.parseUnits('100000', 'wei'),
          estimatedCost: 10.2
        },
        priority: 'low',
        createdAt: now,
        expiresAt: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
        status: 'pending'
      });
    }

    return recommendations.sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  private getMockRecommendations(userAddress: string): AIRecommendation[] {
    const now = new Date();
    
    return [
      {
        id: 'rec_1',
        type: 'rebalance',
        title: 'Optimize Portfolio Allocation',
        description: 'Rebalance your portfolio to improve risk-adjusted returns',
        reasoning: 'Current allocation shows high concentration in Venus protocol. Diversifying across Beefy and PancakeSwap could reduce risk while maintaining yield.',
        confidence: 87,
        riskLevel: 'low',
        expectedReturn: 2.3,
        timeframe: '1-2 weeks',
        action: {
          type: 'rebalance',
          parameters: {
            targetAllocations: { Venus: 40, Beefy: 35, PancakeSwap: 25 }
          },
          estimatedGas: utils.parseUnits('250000', 'wei'),
          estimatedCost: 25.5
        },
        priority: 'high',
        createdAt: now,
        expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        status: 'pending'
      },
      {
        id: 'rec_2',
        type: 'yield_optimization',
        title: 'Switch to Higher Yield Strategy',
        description: 'Move 30% allocation to Beefy for better APY',
        reasoning: 'Beefy protocol currently offers 12.8% APY compared to your current 8.5% average. Expected additional yield of $45/month.',
        confidence: 79,
        riskLevel: 'medium',
        expectedReturn: 4.3,
        timeframe: '2-4 weeks',
        action: {
          type: 'strategy_switch',
          parameters: {
            fromProtocol: 'Venus',
            toProtocol: 'Beefy',
            percentage: 30
          },
          estimatedGas: utils.parseUnits('180000', 'wei'),
          estimatedCost: 18.2
        },
        priority: 'medium',
        createdAt: now,
        expiresAt: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
        status: 'pending'
      }
    ];
  }

  async getMarketAnalysis(): Promise<MarketAnalysis> {
    try {
      if (this.marketAnalysis && 
          new Date().getTime() - this.marketAnalysis.lastUpdated.getTime() < 5 * 60 * 1000) {
        return this.marketAnalysis;
      }

      console.log('📊 Generating market analysis...');

      // Mock market data - in real implementation, fetch from APIs
      const analysis: MarketAnalysis = {
        bnbPrice: 326.12 + (Math.random() - 0.5) * 20,
        priceChange24h: (Math.random() - 0.5) * 10,
        marketTrend: Math.random() > 0.6 ? 'bullish' : Math.random() > 0.3 ? 'neutral' : 'bearish',
        volatility: Math.random() * 30 + 10,
        protocolHealth: [
          {
            protocol: 'Venus',
            healthScore: 85 + Math.random() * 10,
            tvl: 450000000,
            apy: 8.5 + Math.random() * 2,
            utilization: 75 + Math.random() * 15,
            status: 'healthy'
          },
          {
            protocol: 'Beefy',
            healthScore: 78 + Math.random() * 15,
            tvl: 320000000,
            apy: 12.3 + Math.random() * 3,
            utilization: 68 + Math.random() * 20,
            status: 'healthy'
          },
          {
            protocol: 'PancakeSwap',
            healthScore: 72 + Math.random() * 18,
            tvl: 890000000,
            apy: 15.7 + Math.random() * 5,
            utilization: 82 + Math.random() * 10,
            status: Math.random() > 0.8 ? 'warning' : 'healthy'
          }
        ],
        opportunities: [
          {
            type: 'yield_farming',
            protocol: 'Beefy',
            expectedReturn: 12.8,
            riskLevel: 'medium',
            description: 'High APY farming opportunity in BNB-BUSD pool',
            timeframe: '2-4 weeks'
          }
        ],
        risks: [
          {
            type: 'market',
            severity: 'medium',
            description: 'Increased market volatility detected',
            affectedProtocols: ['All'],
            recommendation: 'Consider reducing leverage and maintaining cash reserves'
          }
        ],
        lastUpdated: new Date()
      };

      this.marketAnalysis = analysis;
      return analysis;
    } catch (error) {
      console.error('❌ Error generating market analysis:', error);
      throw error;
    }
  }

  async executeRecommendation(userAddress: string, recommendationId: string): Promise<boolean> {
    try {
      console.log('⚡ Executing AI recommendation:', recommendationId);

      const recommendations = this.recommendations.get(userAddress) || [];
      const recommendation = recommendations.find(r => r.id === recommendationId);

      if (!recommendation) {
        throw new Error('Recommendation not found');
      }

      if (recommendation.status !== 'pending') {
        throw new Error('Recommendation already processed');
      }

      // Execute the recommendation action
      let success = false;
      
      switch (recommendation.action.type) {
        case 'rebalance':
          success = await this.executeRebalance(userAddress, recommendation.action.parameters);
          break;
        case 'strategy_switch':
          success = await this.executeStrategySwitch(userAddress, recommendation.action.parameters);
          break;
        case 'deposit':
          success = await this.executeDeposit(userAddress, recommendation.action.parameters);
          break;
        default:
          console.log('📝 Recommendation noted for manual execution');
          success = true;
      }

      // Update recommendation status
      recommendation.status = success ? 'executed' : 'pending';
      
      console.log(`✅ Recommendation ${success ? 'executed' : 'failed'}`);
      return success;
    } catch (error) {
      console.error('❌ Error executing recommendation:', error);
      return false;
    }
  }

  private async executeRebalance(userAddress: string, parameters: any): Promise<boolean> {
    // In real implementation, this would call smart contract functions
    console.log('🔄 Executing rebalance with parameters:', parameters);
    
    // Simulate execution delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return Math.random() > 0.1; // 90% success rate
  }

  private async executeStrategySwitch(userAddress: string, parameters: any): Promise<boolean> {
    console.log('🔀 Executing strategy switch:', parameters);
    
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    return Math.random() > 0.15; // 85% success rate
  }

  private async executeDeposit(userAddress: string, parameters: any): Promise<boolean> {
    console.log('💰 Executing deposit:', parameters);
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    return Math.random() > 0.05; // 95% success rate
  }

  async assessRisk(userAddress: string, action: any): Promise<RiskAssessment> {
    try {
      console.log('🛡️ Assessing risk for action:', action);

      const riskMetrics = await portfolioMetricsService.calculateRiskMetrics(userAddress);
      
      const riskFactors: RiskFactor[] = [
        {
          factor: 'Market Volatility',
          impact: Math.random() * 30 + 10,
          description: 'Current market conditions show increased volatility',
          mitigation: 'Consider smaller position sizes and gradual execution'
        },
        {
          factor: 'Protocol Risk',
          impact: Math.random() * 25 + 5,
          description: 'Smart contract and protocol-specific risks',
          mitigation: 'Diversify across multiple protocols'
        },
        {
          factor: 'Liquidity Risk',
          impact: Math.random() * 20 + 5,
          description: 'Potential difficulty in exiting positions',
          mitigation: 'Maintain emergency reserves'
        }
      ];

      const overallRisk = riskFactors.reduce((sum, rf) => sum + rf.impact, 0) / riskFactors.length;

      return {
        overallRisk,
        riskFactors,
        recommendations: [
          'Start with smaller amounts to test strategy',
          'Monitor positions closely for first 48 hours',
          'Set stop-loss levels if available'
        ],
        maxRecommendedAllocation: Math.max(10, 100 - overallRisk)
      };
    } catch (error) {
      console.error('❌ Error assessing risk:', error);
      throw error;
    }
  }

  startRealTimeAnalysis(callback: (analysis: MarketAnalysis) => void): void {
    console.log('🔄 Starting real-time market analysis...');
    
    this.updateInterval = setInterval(async () => {
      try {
        const analysis = await this.getMarketAnalysis();
        callback(analysis);
      } catch (error) {
        console.error('❌ Error in real-time analysis:', error);
      }
    }, 60000); // Update every minute
  }

  stopRealTimeAnalysis(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
      console.log('⏹️ Real-time analysis stopped');
    }
  }
}

export const aiRecommendationService = new AIRecommendationService();