import { ethers, BigNumber, utils } from '../utils/ethersCompat';

export interface PortfolioMetrics {
  totalValue: BigNumber;
  totalValueUSD: number;
  totalYield: BigNumber;
  totalYieldUSD: number;
  realizedGains: BigNumber;
  unrealizedGains: BigNumber;
  principalAmount: BigNumber;
  currentAPY: number;
  dailyYield: number;
  weeklyYield: number;
  monthlyYield: number;
  yearlyProjection: number;
  lastUpdated: Date;
}

export interface YieldBreakdown {
  protocolYields: ProtocolYield[];
  totalYield: BigNumber;
  yieldSources: YieldSource[];
  proofOfYield: ProofOfYieldData[];
}

export interface ProtocolYield {
  protocol: string;
  amount: BigNumber;
  amountUSD: number;
  percentage: number;
  apy: number;
  isActive: boolean;
}

export interface YieldSource {
  source: string;
  type: 'lending' | 'farming' | 'staking' | 'liquidity';
  amount: BigNumber;
  timestamp: Date;
  transactionHash: string;
  blockNumber: number;
}

export interface ProofOfYieldData {
  protocol: string;
  yieldAmount: BigNumber;
  timestamp: Date;
  blockNumber: number;
  transactionHash: string;
  verified: boolean;
  exchangeRate?: BigNumber;
  pricePerShare?: BigNumber;
}

export interface PerformanceAttribution {
  strategyPerformance: StrategyPerformance[];
  totalReturn: number;
  benchmarkReturn: number;
  alpha: number;
  beta: number;
  sharpeRatio: number;
  maxDrawdown: number;
  volatility: number;
}

export interface StrategyPerformance {
  strategyName: string;
  allocation: number;
  return: number;
  contribution: number;
  risk: number;
  timeWeightedReturn: number;
}

export interface RiskMetrics {
  portfolioRisk: number;
  concentrationRisk: number;
  liquidityRisk: number;
  protocolRisk: number;
  smartContractRisk: number;
  overallRiskScore: number;
}

class PortfolioMetricsService {
  private bnbPriceUSD: number = 326.12;

  async calculatePortfolioMetrics(userAddress: string): Promise<PortfolioMetrics> {
    try {
      console.log('📊 Calculating portfolio metrics for:', userAddress);

      // Mock portfolio data
      const totalValue = utils.parseEther('10');
      const totalValueUSD = parseFloat(utils.formatEther(totalValue)) * this.bnbPriceUSD;
      const totalYield = utils.parseEther('1.2');
      const totalYieldUSD = parseFloat(utils.formatEther(totalYield)) * this.bnbPriceUSD;
      const principalAmount = utils.parseEther('8.8');
      const currentAPY = 12.5;
      const dailyYield = (totalValueUSD * currentAPY) / (365 * 100);

      const metrics: PortfolioMetrics = {
        totalValue,
        totalValueUSD,
        totalYield,
        totalYieldUSD,
        realizedGains: utils.parseEther('0.5'),
        unrealizedGains: utils.parseEther('0.7'),
        principalAmount,
        currentAPY,
        dailyYield,
        weeklyYield: dailyYield * 7,
        monthlyYield: dailyYield * 30,
        yearlyProjection: totalValueUSD * (currentAPY / 100),
        lastUpdated: new Date()
      };

      console.log('✅ Portfolio metrics calculated:', {
        totalValueUSD: metrics.totalValueUSD,
        currentAPY: metrics.currentAPY,
        dailyYield: metrics.dailyYield
      });

      return metrics;
    } catch (error) {
      console.error('❌ Error calculating portfolio metrics:', error);
      throw error;
    }
  }

  async getYieldBreakdown(userAddress: string): Promise<YieldBreakdown> {
    try {
      console.log('🎯 Getting yield breakdown for:', userAddress);

      const protocolYields: ProtocolYield[] = [
        {
          protocol: 'Venus',
          amount: utils.parseEther('0.5'),
          amountUSD: 0.5 * this.bnbPriceUSD,
          percentage: 41.7,
          apy: 8.5,
          isActive: true
        },
        {
          protocol: 'Beefy',
          amount: utils.parseEther('0.4'),
          amountUSD: 0.4 * this.bnbPriceUSD,
          percentage: 33.3,
          apy: 12.3,
          isActive: true
        },
        {
          protocol: 'PancakeSwap',
          amount: utils.parseEther('0.3'),
          amountUSD: 0.3 * this.bnbPriceUSD,
          percentage: 25.0,
          apy: 15.7,
          isActive: true
        }
      ];

      const yieldSources: YieldSource[] = [
        {
          source: 'Venus',
          type: 'lending',
          amount: utils.parseEther('0.5'),
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
          transactionHash: '0x' + Math.random().toString(16).substr(2, 64),
          blockNumber: 12345678
        }
      ];

      const proofOfYield: ProofOfYieldData[] = [
        {
          protocol: 'Venus',
          yieldAmount: utils.parseEther('0.1'),
          timestamp: new Date(),
          blockNumber: 12345679,
          transactionHash: '0x' + Math.random().toString(16).substr(2, 64),
          verified: true,
          exchangeRate: utils.parseEther('1.05')
        }
      ];

      return {
        protocolYields,
        totalYield: utils.parseEther('1.2'),
        yieldSources,
        proofOfYield
      };
    } catch (error) {
      console.error('❌ Error getting yield breakdown:', error);
      throw error;
    }
  }

  async getPerformanceAttribution(userAddress: string): Promise<PerformanceAttribution> {
    try {
      console.log('📈 Getting performance attribution for:', userAddress);

      const strategyPerformance: StrategyPerformance[] = [
        {
          strategyName: 'Venus',
          allocation: 40,
          return: 8.5,
          contribution: 3.4,
          risk: 3,
          timeWeightedReturn: 8.2
        },
        {
          strategyName: 'Beefy',
          allocation: 35,
          return: 12.3,
          contribution: 4.3,
          risk: 4,
          timeWeightedReturn: 12.1
        },
        {
          strategyName: 'PancakeSwap',
          allocation: 25,
          return: 15.7,
          contribution: 3.9,
          risk: 5,
          timeWeightedReturn: 15.2
        }
      ];

      const totalReturn = strategyPerformance.reduce((sum, s) => sum + s.contribution, 0);
      const benchmarkReturn = 5.2;

      return {
        strategyPerformance,
        totalReturn,
        benchmarkReturn,
        alpha: totalReturn - benchmarkReturn,
        beta: 1.2,
        sharpeRatio: 1.8,
        maxDrawdown: -5.2,
        volatility: 12.5
      };
    } catch (error) {
      console.error('❌ Error getting performance attribution:', error);
      throw error;
    }
  }

  async calculateRiskMetrics(userAddress: string): Promise<RiskMetrics> {
    try {
      console.log('🛡️ Calculating risk metrics for:', userAddress);

      const portfolioRisk = 35;
      const concentrationRisk = 25;
      const liquidityRisk = 20;
      const protocolRisk = 15;
      const smartContractRisk = 10;

      const overallRiskScore = (
        portfolioRisk * 0.3 +
        concentrationRisk * 0.2 +
        liquidityRisk * 0.2 +
        protocolRisk * 0.15 +
        smartContractRisk * 0.15
      );

      return {
        portfolioRisk,
        concentrationRisk,
        liquidityRisk,
        protocolRisk,
        smartContractRisk,
        overallRiskScore
      };
    } catch (error) {
      console.error('❌ Error calculating risk metrics:', error);
      throw error;
    }
  }

  startRealTimeUpdates(userAddress: string, callback: (metrics: PortfolioMetrics) => void): void {
    console.log('🔄 Starting real-time updates for:', userAddress);
    
    // Update every 2 minutes with very small variations
    const interval = setInterval(async () => {
      try {
        const metrics = await this.calculatePortfolioMetrics(userAddress);
        // Add very small random variations (max 0.5%)
        metrics.totalValueUSD *= (1 + (Math.random() - 0.5) * 0.005);
        metrics.currentAPY *= (1 + (Math.random() - 0.5) * 0.01);
        callback(metrics);
      } catch (error) {
        console.error('❌ Error in real-time update:', error);
      }
    }, 120000); // Update every 2 minutes instead of 30 seconds

    (this as any).updateInterval = interval;
  }

  stopRealTimeUpdates(userAddress: string): void {
    if ((this as any).updateInterval) {
      clearInterval((this as any).updateInterval);
      (this as any).updateInterval = null;
      console.log('⏹️ Real-time updates stopped');
    }
  }
}

export const portfolioMetricsService = new PortfolioMetricsService();