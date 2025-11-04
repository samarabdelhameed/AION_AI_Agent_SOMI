import { useState, useEffect, useCallback } from 'react';
import { professionalDataService, type ProfessionalStrategyData } from '../services/professionalDataService';

export interface StrategyData {
  id: string;
  name: string;
  protocolName: string;
  type: string;
  apy: number;
  tvl: number;
  riskLevel: string;
  riskCategory: 'low' | 'medium' | 'high';
  isHealthy: boolean;
  isActive: boolean;
  allocation: number;
  totalAssets: number;
  totalShares: number;
  lastUpdate: number;
  description: string;
  icon: string;
  color: string;
  fees: number;
  lockPeriod: string;
  network: string;
  isLive: boolean;
  dataSource: 'live' | 'api' | 'fallback';
  
  // Professional metrics
  sharpeRatio: number;
  volatility: number;
  maxDrawdown: number;
  liquidityScore: number;
  auditScore: number;
  
  // Real-time data
  priceChange24h: number;
  volume24h: number;
  marketCap: number;
  
  // Additional info
  website: string;
  documentation: string;
  github: string;
  twitter: string;
  
  // Performance history
  performance7d: number;
  performance30d: number;
  performance90d: number;
  performance1y: number;
}

interface StrategiesState {
  strategies: StrategyData[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export function useStrategies() {
  const [state, setState] = useState<StrategiesState>({
    strategies: [],
    loading: true,
    error: null,
    lastUpdated: null,
  });

  const fetchStrategies = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      console.log('🔄 Loading professional strategies...');
      
      // Get strategies from professional service
      const professionalStrategies = await professionalDataService.fetchLiveData();
      
      // Convert to StrategyData format
      const strategies: StrategyData[] = professionalStrategies.map(strategy => ({
        ...strategy,
        riskLevel: strategy.riskLevel.toString(),
      }));

      console.log('✅ Professional strategies loaded:', strategies.length);
      
      setState({
        strategies,
        loading: false,
        error: null,
        lastUpdated: new Date(),
      });

    } catch (error) {
      console.error('❌ Failed to fetch strategies:', error);
      
      // Fallback to cached data
      const fallbackStrategies = professionalDataService.getAllStrategies().map(strategy => ({
        ...strategy,
        riskLevel: strategy.riskLevel.toString(),
        dataSource: 'fallback' as const,
      }));

      setState({
        strategies: fallbackStrategies,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load strategies',
        lastUpdated: new Date(),
      });
    }
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    console.log('🚀 Initializing strategies hook...');
    
    // Initial fetch
    fetchStrategies();
    
    // Subscribe to real-time updates
    const unsubscribe = professionalDataService.subscribe((updatedStrategies) => {
      console.log('📊 Real-time update received');
      const strategies: StrategyData[] = updatedStrategies.map(strategy => ({
        ...strategy,
        riskLevel: strategy.riskLevel.toString(),
      }));
      
      setState(prev => ({
        ...prev,
        strategies,
        lastUpdated: new Date(),
      }));
    });

    // Auto-refresh every 2 minutes
    const interval = setInterval(fetchStrategies, 120000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [fetchStrategies]);

  return {
    ...state,
    refresh: fetchStrategies,
  };
}

// Hook for getting a specific strategy
export function useStrategy(strategyId: string) {
  const { strategies, loading, error } = useStrategies();
  
  const strategy = strategies.find(s => s.id === strategyId);
  
  return {
    strategy,
    loading,
    error: strategy ? null : error || `Strategy ${strategyId} not found`,
  };
}

// Hook for getting strategies by type
export function useStrategiesByType(type?: string) {
  const { strategies, loading, error, refresh } = useStrategies();
  
  const filteredStrategies = type 
    ? strategies.filter(s => s.type.toLowerCase() === type.toLowerCase())
    : strategies;
  
  return {
    strategies: filteredStrategies,
    loading,
    error,
    refresh,
  };
}

// Hook for getting strategies by risk level
export function useStrategiesByRisk(risk?: 'low' | 'medium' | 'high') {
  const { strategies, loading, error, refresh } = useStrategies();
  
  const filteredStrategies = risk 
    ? strategies.filter(s => s.riskCategory === risk)
    : strategies;
  
  return {
    strategies: filteredStrategies,
    loading,
    error,
    refresh,
  };
}

// Hook for market summary
export function useMarketSummary() {
  const [summary, setSummary] = useState(professionalDataService.getMarketSummary());
  
  useEffect(() => {
    const updateSummary = () => {
      setSummary(professionalDataService.getMarketSummary());
    };
    
    const interval = setInterval(updateSummary, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, []);
  
  return summary;
}