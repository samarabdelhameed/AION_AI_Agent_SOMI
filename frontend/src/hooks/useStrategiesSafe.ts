import { useState, useEffect, useCallback } from 'react';
import { useChainId } from 'wagmi';
import { CONTRACT_ADDRESSES, STRATEGY_METADATA } from '../lib/web3Config';
import { apiClient } from '../lib/api';

export interface StrategyData {
  id: string;
  name: string;
  protocolName: string;
  type: string;
  apy: number;
  tvl: number;
  riskLevel: number;
  isHealthy: boolean;
  isActive: boolean;
  allocation: number;
  totalAssets: number;
  totalShares: number;
  lastUpdate: number;
  
  // UI metadata
  description: string;
  icon: string;
  color: string;
  
  // Contract addresses
  adapterAddress?: `0x${string}`;
  strategyAddress?: `0x${string}`;
  
  // Real-time data
  isLive: boolean;
  dataSource: 'contract' | 'api' | 'fallback';
}

interface StrategiesState {
  strategies: StrategyData[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => void;
}

export function useStrategiesSafe(): StrategiesState {
  const chainId = useChainId();
  const [state, setState] = useState<Omit<StrategiesState, 'refresh'>>({
    strategies: [],
    loading: true,
    error: null,
    lastUpdated: null,
  });

  const loadStrategies = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Get contract addresses for current chain
      const addresses = CONTRACT_ADDRESSES[chainId as keyof typeof CONTRACT_ADDRESSES];
      
      if (!addresses) {
        throw new Error(`No contract addresses configured for chain ${chainId}`);
      }

      // Create strategies from metadata and addresses
      const strategies: StrategyData[] = [];

      // Get market data from API for real APYs
      let marketData: Record<string, unknown> | null = null;
      try {
        const marketResponse = await apiClient.getMarketSnapshot();
        if (marketResponse.success && marketResponse.data) {
          marketData = marketResponse.data as unknown as Record<string, unknown>;
        }
      } catch (error) {
        console.warn('Failed to fetch market data, using fallback:', error);
      }

      // Process each strategy
      for (const [strategyId, metadata] of Object.entries(STRATEGY_METADATA)) {
        const adapterKey = `${strategyId.toUpperCase()}_ADAPTER` as keyof typeof addresses;
        const strategyKey = `STRATEGY_${strategyId.toUpperCase()}` as keyof typeof addresses;
        
        const adapterAddress = addresses[adapterKey];
        const strategyAddress = addresses[strategyKey];

        // Get real APY from market data if available
        let realApy = 0;
        let realTvl = 0;
        let isHealthy = true;
        let dataSource: 'api' | 'fallback' = 'fallback';

        if (marketData?.protocols && typeof marketData.protocols === 'object') {
          const protocols = marketData.protocols as Record<string, unknown>;
          const protocolData = protocols[strategyId];
          if (protocolData && typeof protocolData === 'object') {
            const data = protocolData as Record<string, unknown>;
            realApy = (data.apy as number) || 0;
            realTvl = (data.tvl_usd as number) || 0;
            isHealthy = (data.health as string) === 'healthy';
            dataSource = 'api';
          }
        }

        // ✅ New: We keep the truth even if 0 and inform the UI about it
        if (realApy === 0 || Number.isNaN(realApy)) {
          console.warn(`[APY] No live APY for ${strategyId} — showing "—" in UI`);
        }

        // Fallback TVL values if no real data (keeping this for UI display)
        if (realTvl === 0) {
          const fallbackTVLs: Record<string, number> = {
            venus: 125000000,
            beefy: 45000000,
            pancake: 101000000,
            aave: 37200000000,
            compound: 15000000,
            uniswap: 25000000,
            wombat: 67000000,
            morpho: 8000000,
          };
          realTvl = fallbackTVLs[strategyId] || 50000000;
        }

        // Create strategy data
        const strategyData: StrategyData = {
          id: strategyId,
          name: metadata.name,
          protocolName: metadata.name,
          type: metadata.type,
          apy: realApy,
          tvl: realTvl,
          riskLevel: metadata.riskLevel,
          isHealthy,
          isActive: true,
          allocation: 0, // Will be updated from vault data
          totalAssets: realTvl,
          totalShares: 0,
          lastUpdate: Date.now(),
          
          // UI metadata
          description: metadata.description,
          icon: metadata.icon,
          color: metadata.color,
          
          // Contract addresses
          adapterAddress,
          strategyAddress,
          
          // Real-time data
          isLive: dataSource === 'api',
          dataSource,
        };

        strategies.push(strategyData);
      }

      setState(prev => ({
        ...prev,
        strategies,
        loading: false,
        error: null,
        lastUpdated: new Date(),
      }));

    } catch (error) {
      console.error('Failed to load strategies:', error);
      
      // Fallback to basic strategy data with realistic values
      const fallbackStrategies: StrategyData[] = Object.entries(STRATEGY_METADATA).map(([id, metadata]) => {
        // ✅ We do not use fixed APY - we show "—" in UI
        console.warn(`[APY] Using fallback data for ${id} — no live APY available`);
        
        const fallbackTVLs: Record<string, number> = {
          venus: 125000000,
          beefy: 45000000,
          pancake: 101000000,
          aave: 37200000000,
          compound: 15000000,
          uniswap: 25000000,
          wombat: 67000000,
          morpho: 8000000,
        };

        return {
          id,
          name: metadata.name,
          protocolName: metadata.name,
          type: metadata.type,
          apy: 0, // ✅ We do not use fixed APY - we show "—" in UI
          tvl: fallbackTVLs[id] || 50000000,
          riskLevel: metadata.riskLevel,
          isHealthy: true,
          isActive: true,
          allocation: 0,
          totalAssets: fallbackTVLs[id] || 50000000,
          totalShares: 0,
          lastUpdate: Date.now(),
          description: metadata.description,
          icon: metadata.icon,
          color: metadata.color,
          isLive: false,
          dataSource: 'fallback',
        };
      });

      setState(prev => ({
        ...prev,
        strategies: fallbackStrategies,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load strategies',
        lastUpdated: new Date(),
      }));
    }
  }, [chainId]);

  const refresh = useCallback(() => {
    loadStrategies();
  }, [loadStrategies]);

  // Load strategies on mount and when chain changes
  useEffect(() => {
    loadStrategies();
  }, [loadStrategies]);

  return {
    ...state,
    refresh,
  };
}

// Helper function to get strategy by ID
export function useStrategy(strategyId: string): StrategyData | null {
  const { strategies } = useStrategiesSafe();
  return strategies.find(s => s.id === strategyId) || null;
}

// Helper function to get strategies by type
export function useStrategiesByType(type: string): StrategyData[] {
  const { strategies } = useStrategiesSafe();
  return strategies.filter(s => s.type === type);
}