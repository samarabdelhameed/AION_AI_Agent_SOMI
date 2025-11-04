import { useState, useEffect, useCallback } from 'react';
import { 
  portfolioMetricsService, 
  PortfolioMetrics, 
  YieldBreakdown, 
  PerformanceAttribution,
  RiskMetrics 
} from '../services/portfolioMetricsService';

interface UsePortfolioMetricsReturn {
  // Core metrics
  portfolioMetrics: PortfolioMetrics | null;
  yieldBreakdown: YieldBreakdown | null;
  performanceAttribution: PerformanceAttribution | null;
  riskMetrics: RiskMetrics | null;
  
  // Loading states
  isLoading: boolean;
  isUpdating: boolean;
  error: string | null;
  
  // Actions
  refreshMetrics: () => Promise<void>;
  startRealTimeUpdates: () => void;
  stopRealTimeUpdates: () => void;
  
  // Utility functions
  getYieldProjection: (timeframe: 'daily' | 'weekly' | 'monthly' | 'yearly') => number;
  getRiskScore: () => number;
  getPerformanceScore: () => number;
}

export const usePortfolioMetrics = (userAddress?: string): UsePortfolioMetricsReturn => {
  const [portfolioMetrics, setPortfolioMetrics] = useState<PortfolioMetrics | null>(null);
  const [yieldBreakdown, setYieldBreakdown] = useState<YieldBreakdown | null>(null);
  const [performanceAttribution, setPerformanceAttribution] = useState<PerformanceAttribution | null>(null);
  const [riskMetrics, setRiskMetrics] = useState<RiskMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [realTimeActive, setRealTimeActive] = useState(false);

  // Load all portfolio metrics
  const loadPortfolioMetrics = useCallback(async () => {
    if (!userAddress) return;

    try {
      setIsLoading(true);
      setError(null);
      
      console.log('📊 Loading portfolio metrics for:', userAddress);

      // Load all metrics in parallel
      const [metrics, breakdown, attribution, risk] = await Promise.all([
        portfolioMetricsService.calculatePortfolioMetrics(userAddress),
        portfolioMetricsService.getYieldBreakdown(userAddress),
        portfolioMetricsService.getPerformanceAttribution(userAddress),
        portfolioMetricsService.calculateRiskMetrics(userAddress)
      ]);

      setPortfolioMetrics(metrics);
      setYieldBreakdown(breakdown);
      setPerformanceAttribution(attribution);
      setRiskMetrics(risk);

      console.log('✅ Portfolio metrics loaded successfully:', {
        totalValueUSD: metrics.totalValueUSD,
        totalYieldUSD: metrics.totalYieldUSD,
        currentAPY: metrics.currentAPY,
        riskScore: risk.overallRiskScore
      });

    } catch (err) {
      console.error('❌ Error loading portfolio metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to load portfolio metrics');
    } finally {
      setIsLoading(false);
    }
  }, [userAddress]);

  // Refresh metrics (for manual updates)
  const refreshMetrics = useCallback(async (): Promise<void> => {
    if (!userAddress) return;

    try {
      setIsUpdating(true);
      setError(null);
      
      console.log('🔄 Refreshing portfolio metrics...');

      // Refresh all metrics
      const [metrics, breakdown, attribution, risk] = await Promise.all([
        portfolioMetricsService.calculatePortfolioMetrics(userAddress),
        portfolioMetricsService.getYieldBreakdown(userAddress),
        portfolioMetricsService.getPerformanceAttribution(userAddress),
        portfolioMetricsService.calculateRiskMetrics(userAddress)
      ]);

      setPortfolioMetrics(metrics);
      setYieldBreakdown(breakdown);
      setPerformanceAttribution(attribution);
      setRiskMetrics(risk);

      console.log('✅ Portfolio metrics refreshed');

    } catch (err) {
      console.error('❌ Error refreshing portfolio metrics:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh portfolio metrics');
    } finally {
      setIsUpdating(false);
    }
  }, [userAddress]);

  // Start real-time updates
  const startRealTimeUpdates = useCallback(() => {
    if (!userAddress || realTimeActive) return;

    console.log('🔄 Starting real-time portfolio metrics updates');
    
    portfolioMetricsService.startRealTimeUpdates(userAddress, (updatedMetrics) => {
      console.log('🔔 Real-time portfolio metrics update received');
      setPortfolioMetrics(updatedMetrics);
      
      // Also refresh other metrics periodically
      if (Math.random() < 0.1) { // 10% chance to refresh other metrics
        refreshMetrics();
      }
    });

    setRealTimeActive(true);
  }, [userAddress, realTimeActive, refreshMetrics]);

  // Stop real-time updates
  const stopRealTimeUpdates = useCallback(() => {
    if (!userAddress || !realTimeActive) return;

    console.log('⏹️ Stopping real-time portfolio metrics updates');
    
    portfolioMetricsService.stopRealTimeUpdates(userAddress);
    setRealTimeActive(false);
  }, [userAddress, realTimeActive]);

  // Get yield projection for different timeframes
  const getYieldProjection = useCallback((timeframe: 'daily' | 'weekly' | 'monthly' | 'yearly'): number => {
    if (!portfolioMetrics) return 0;

    switch (timeframe) {
      case 'daily':
        return portfolioMetrics.dailyYield;
      case 'weekly':
        return portfolioMetrics.weeklyYield;
      case 'monthly':
        return portfolioMetrics.monthlyYield;
      case 'yearly':
        return portfolioMetrics.yearlyProjection;
      default:
        return 0;
    }
  }, [portfolioMetrics]);

  // Get overall risk score
  const getRiskScore = useCallback((): number => {
    return riskMetrics?.overallRiskScore || 0;
  }, [riskMetrics]);

  // Get performance score (combination of return and risk-adjusted metrics)
  const getPerformanceScore = useCallback((): number => {
    if (!performanceAttribution || !riskMetrics) return 0;

    // Calculate performance score based on Sharpe ratio and alpha
    const sharpeScore = Math.max(0, Math.min(100, (performanceAttribution.sharpeRatio + 1) * 50));
    const alphaScore = Math.max(0, Math.min(100, (performanceAttribution.alpha + 10) * 5));
    const riskAdjustment = Math.max(0, 100 - riskMetrics.overallRiskScore);

    return (sharpeScore * 0.4 + alphaScore * 0.4 + riskAdjustment * 0.2);
  }, [performanceAttribution, riskMetrics]);

  // Load metrics on mount and when user address changes
  useEffect(() => {
    loadPortfolioMetrics();
  }, [loadPortfolioMetrics]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (userAddress && realTimeActive) {
        portfolioMetricsService.stopRealTimeUpdates(userAddress);
      }
    };
  }, [userAddress, realTimeActive]);

  // Auto-start real-time updates when metrics are loaded
  useEffect(() => {
    if (portfolioMetrics && !realTimeActive && userAddress) {
      startRealTimeUpdates();
    }
  }, [portfolioMetrics, realTimeActive, userAddress, startRealTimeUpdates]);

  return {
    portfolioMetrics,
    yieldBreakdown,
    performanceAttribution,
    riskMetrics,
    isLoading,
    isUpdating,
    error,
    refreshMetrics,
    startRealTimeUpdates,
    stopRealTimeUpdates,
    getYieldProjection,
    getRiskScore,
    getPerformanceScore
  };
};