import { useState, useEffect, useCallback } from 'react';
import { BigNumber, ethers } from 'ethers';
import { 
  venusService, 
  VenusData, 
  UserVenusPosition, 
  VenusHealthData 
} from '../services/venusService';

interface UseVenusReturn {
  // Real Venus data
  venusStats: VenusData | null;
  userPosition: UserVenusPosition | null;
  healthData: VenusHealthData | null;
  
  // Loading states
  isLoading: boolean;
  isConnected: boolean;
  error: string | null;
  
  // Real Venus operations
  supplyBNB: (amount: string) => Promise<{ hash: string; success: boolean; error?: string }>;
  redeemBNB: (shares: string) => Promise<{ hash: string; success: boolean; error?: string }>;
  
  // Data fetching functions
  refreshData: () => Promise<void>;
  getUserYield: () => Promise<string>;
  getTotalYield: () => Promise<string>;
  getExchangeRate: () => Promise<string>;
  getSupplyRate: () => Promise<string>;
  
  // Analytics
  getAnalytics: () => Promise<any>;
  getMarketData: () => Promise<any>;
  getEvents: (fromBlock?: number) => Promise<any[]>;
  
  // Monitoring
  startMonitoring: () => void;
  stopMonitoring: () => void;
}

export const useVenus = (userAddress?: string): UseVenusReturn => {
  const [venusStats, setVenusStats] = useState<VenusData | null>(null);
  const [userPosition, setUserPosition] = useState<UserVenusPosition | null>(null);
  const [healthData, setHealthData] = useState<VenusHealthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize Venus service
  const initializeVenus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🌟 Initializing Venus service...');
      const initialized = await venusService.initialize();
      
      if (!initialized) {
        throw new Error('Failed to initialize Venus service');
      }

      setIsConnected(true);

      if (userAddress) {
        console.log('📊 Fetching real Venus data for:', userAddress);
        
        // Fetch all Venus data in parallel
        const [stats, position, health] = await Promise.all([
          venusService.getVenusStats(),
          venusService.getUserVenusPosition(userAddress),
          venusService.getVenusHealth()
        ]);

        setVenusStats(stats);
        setUserPosition(position);
        setHealthData(health);

        console.log('✅ Real Venus data loaded successfully');
      }
    } catch (err) {
      console.error('❌ Error initializing Venus:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, [userAddress]);

  // Initialize on mount and when user address changes
  useEffect(() => {
    initializeVenus();

    // Cleanup on unmount
    return () => {
      venusService.stopVenusMonitoring();
    };
  }, [initializeVenus]);

  // Real supply BNB function
  const supplyBNB = useCallback(async (amount: string): Promise<{ hash: string; success: boolean; error?: string }> => {
    try {
      setError(null);
      console.log('💰 Executing real Venus supply:', amount, 'BNB');
      
      const amountWei = utils.parseEther(amount);
      const result = await venusService.supplyBNB(amountWei);
      
      if (result.success) {
        console.log('✅ Venus supply successful:', result.hash);
        // Refresh data after successful transaction
        await refreshData();
      } else {
        setError(result.error || 'Venus supply failed');
      }
      
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Venus supply failed';
      setError(errorMsg);
      console.error('❌ Venus supply error:', err);
      return { hash: '', success: false, error: errorMsg };
    }
  }, []);

  // Real redeem BNB function
  const redeemBNB = useCallback(async (shares: string): Promise<{ hash: string; success: boolean; error?: string }> => {
    try {
      setError(null);
      console.log('💸 Executing real Venus redeem:', shares, 'shares');
      
      const sharesWei = utils.parseEther(shares);
      const result = await venusService.redeemBNB(sharesWei);
      
      if (result.success) {
        console.log('✅ Venus redeem successful:', result.hash);
        await refreshData();
      } else {
        setError(result.error || 'Venus redeem failed');
      }
      
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Venus redeem failed';
      setError(errorMsg);
      console.error('❌ Venus redeem error:', err);
      return { hash: '', success: false, error: errorMsg };
    }
  }, []);

  // Refresh all Venus data
  const refreshData = useCallback(async (): Promise<void> => {
    if (!userAddress || !isConnected) return;

    try {
      console.log('🔄 Refreshing real Venus data...');
      
      const [stats, position, health] = await Promise.all([
        venusService.getVenusStats(),
        venusService.getUserVenusPosition(userAddress),
        venusService.getVenusHealth()
      ]);

      setVenusStats(stats);
      setUserPosition(position);
      setHealthData(health);
      
      console.log('✅ Venus data refreshed');
    } catch (err) {
      console.error('❌ Error refreshing Venus data:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh Venus data');
    }
  }, [userAddress, isConnected]);

  // Get user yield
  const getUserYield = useCallback(async (): Promise<string> => {
    if (!userAddress) return '0';

    try {
      const yieldAmount = await venusService.getUserYield(userAddress);
      return utils.formatEther(yieldAmount);
    } catch (err) {
      console.error('❌ Error getting user yield:', err);
      return '0';
    }
  }, [userAddress]);

  // Get total yield
  const getTotalYield = useCallback(async (): Promise<string> => {
    try {
      const totalYield = await venusService.getTotalYield();
      return utils.formatEther(totalYield);
    } catch (err) {
      console.error('❌ Error getting total yield:', err);
      return '0';
    }
  }, []);

  // Get exchange rate
  const getExchangeRate = useCallback(async (): Promise<string> => {
    try {
      const exchangeRate = await venusService.getCurrentExchangeRate();
      return utils.formatEther(exchangeRate);
    } catch (err) {
      console.error('❌ Error getting exchange rate:', err);
      return '0';
    }
  }, []);

  // Get supply rate
  const getSupplyRate = useCallback(async (): Promise<string> => {
    try {
      const supplyRate = await venusService.getSupplyRatePerBlock();
      return supplyRate.toString();
    } catch (err) {
      console.error('❌ Error getting supply rate:', err);
      return '0';
    }
  }, []);

  // Get Venus analytics
  const getAnalytics = useCallback(async (): Promise<any> => {
    try {
      return await venusService.getVenusAnalytics();
    } catch (err) {
      console.error('❌ Error getting Venus analytics:', err);
      return null;
    }
  }, []);

  // Get Venus market data
  const getMarketData = useCallback(async (): Promise<any> => {
    try {
      return await venusService.getVenusMarketData();
    } catch (err) {
      console.error('❌ Error getting Venus market data:', err);
      return null;
    }
  }, []);

  // Get Venus events
  const getEvents = useCallback(async (fromBlock: number = 0): Promise<any[]> => {
    if (!userAddress) return [];

    try {
      return await venusService.getVenusEvents(userAddress, fromBlock);
    } catch (err) {
      console.error('❌ Error getting Venus events:', err);
      return [];
    }
  }, [userAddress]);

  // Start real-time monitoring
  const startMonitoring = useCallback((): void => {
    if (!userAddress) return;

    venusService.startVenusMonitoring(userAddress, (data) => {
      console.log('🔔 Real-time Venus update received');
      setVenusStats(data.venusStats);
      setUserPosition(data.userPosition);
      setHealthData(data.health);
    });
  }, [userAddress]);

  // Stop monitoring
  const stopMonitoring = useCallback((): void => {
    venusService.stopVenusMonitoring();
  }, []);

  return {
    venusStats,
    userPosition,
    healthData,
    isLoading,
    isConnected,
    error,
    supplyBNB,
    redeemBNB,
    refreshData,
    getUserYield,
    getTotalYield,
    getExchangeRate,
    getSupplyRate,
    getAnalytics,
    getMarketData,
    getEvents,
    startMonitoring,
    stopMonitoring
  };
};