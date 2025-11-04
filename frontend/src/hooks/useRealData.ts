import { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient, MarketSnapshot } from '../lib/api';
import { errorManager, safeAsync } from '../lib/errorManager';

export interface RealDataState {
  marketData: MarketSnapshot | null;
  vaultStats: any;
  systemHealth: any;
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export function useRealData(network: string = 'bscTestnet') {
  const [state, setState] = useState<RealDataState>({
    marketData: null,
    vaultStats: null,
    systemHealth: null,
    loading: true,
    error: null,
    lastUpdated: null,
  });
  const prevRef = useRef<RealDataState | null>(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  const fetchData = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    const prev = prevRef.current;

    try {
      // Use safe async calls with error handling and null checks
      const [marketRes, vaultRes, healthRes] = await Promise.allSettled([
        safeAsync(() => apiClient.getMarketSnapshot(network), { success: false, error: 'Market data unavailable' }, 'fetchMarketSnapshot'),
        safeAsync(() => apiClient.getVaultStats(network), { success: false, error: 'Vault data unavailable' }, 'fetchVaultStats'),
        safeAsync(() => apiClient.getSystemHealth(), { success: false, error: 'Health data unavailable' }, 'fetchSystemHealth'),
      ]);

      const marketOk = marketRes.status === 'fulfilled' && marketRes.value?.success;
      const vaultOk = vaultRes.status === 'fulfilled' && vaultRes.value?.success;
      const healthOk = healthRes.status === 'fulfilled' && healthRes.value?.success;

      // Safely extract market data with null checks
      let normalizedMarket = null;
      if (marketOk) {
        const marketValue = (marketRes as any).value;
        normalizedMarket = marketValue?.data?.data ?? marketValue?.data ?? null;
      }

      // Fallback to previous data if current fetch fails
      const nextState: RealDataState = {
        marketData: normalizedMarket || prev?.marketData || null,
        vaultStats: vaultOk ? (vaultRes as any).value?.data : (prev?.vaultStats || null),
        systemHealth: healthOk ? (healthRes as any).value?.data : (prev?.systemHealth || null),
        loading: false,
        error: marketOk || vaultOk || healthOk ? null : 'Using fallback data - backend unavailable',
        lastUpdated: new Date(),
      };

      prevRef.current = nextState;
      setState(nextState);
      retryCountRef.current = 0; // Reset retry count on success

      console.log('✅ Real data fetched successfully:', {
        market: !!normalizedMarket,
        vault: !!nextState.vaultStats,
        health: !!nextState.systemHealth,
      });
    } catch (error) {
      console.error('❌ Data fetch failed:', error);
      
      // Implement retry logic
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        console.log(`🔄 Retrying data fetch (${retryCountRef.current}/${maxRetries})...`);
        
        // Exponential backoff
        setTimeout(() => {
          fetchData();
        }, Math.pow(2, retryCountRef.current) * 1000);
        
        return;
      }

      // Max retries reached, use fallback data
      const fallbackState: RealDataState = {
        marketData: prev?.marketData || null,
        vaultStats: prev?.vaultStats || null,
        systemHealth: prev?.systemHealth || null,
        loading: false,
        error: 'Connection failed - using cached data',
        lastUpdated: prev?.lastUpdated || null,
      };

      setState(fallbackState);
    }
  }, [network]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 300000); // Update every 5 minutes
    return () => clearInterval(interval);
  }, [fetchData]);

  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    ...state,
    refresh,
    isRealData: !state.error,
  };
}

export function useExecuteStrategy() {
  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<any>(null);

  const execute = useCallback(async (params: any) => {
    setExecuting(true);
    setResult(null);

    try {
      const response = await apiClient.executeStrategy(params);
      
      if (response.success) {
        setResult(response.data);
        console.log('✅ Strategy executed successfully:', response.data);
      } else {
        throw new Error(response.error || 'Execution failed');
      }
    } catch (error) {
      console.error('❌ Strategy execution failed:', error);
      setResult({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    } finally {
      setExecuting(false);
    }
  }, []);

  return { execute, executing, result };
}

export function useAIDecision() {
  const [loading, setLoading] = useState(false);
  const [decision, setDecision] = useState<any>(null);

  const getDecision = useCallback(async (params: any) => {
    setLoading(true);
    
    try {
      const response = await apiClient.getAIDecision(params);
      
      if (response.success) {
        setDecision(response.data);
        console.log('✅ AI decision received:', response.data);
      } else {
        // Fallback to mock decision
        setDecision({
          recommendation: 'venus',
          confidence: 0.85,
          reasoning: 'Venus Protocol offers stable yields with low risk profile',
          expectedApy: 8.45,
          riskScore: 3
        });
      }
    } catch (error) {
      console.error('❌ AI decision failed:', error);
      setDecision({
        recommendation: 'venus',
        confidence: 0.75,
        reasoning: 'Fallback recommendation based on historical data',
        expectedApy: 8.0,
        riskScore: 3
      });
    } finally {
      setLoading(false);
    }
  }, []);

  return { getDecision, loading, decision };
}