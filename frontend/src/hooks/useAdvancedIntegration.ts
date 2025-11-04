import { useState, useEffect, useCallback } from 'react';
import { usePortfolioMetrics } from './usePortfolioMetrics';
import { useWalletOnchain } from './useWalletOnchain';
import { websocketService } from '../services/websocketService';
import { aiRecommendationService } from '../services/aiRecommendationService';
import { autoRebalancingService } from '../services/autoRebalancingService';
import { transactionHistoryService } from '../services/transactionHistoryService';
import { PerformanceMonitor } from '../utils/performanceOptimization';

export interface AdvancedIntegrationState {
  // Connection status
  isConnected: boolean;
  isWebSocketConnected: boolean;
  
  // Real-time data
  portfolioMetrics: any;
  marketData: any;
  aiRecommendations: any[];
  transactionHistory: any[];
  
  // Auto-rebalancing
  autoRebalanceEnabled: boolean;
  autoRebalanceConfig: any;
  
  // Performance metrics
  performanceMetrics: any;
  
  // Loading states
  isLoading: boolean;
  isInitializing: boolean;
  
  // Error handling
  errors: string[];
  warnings: string[];
}

export interface AdvancedIntegrationActions {
  // Connection management
  connect: () => Promise<void>;
  disconnect: () => void;
  
  // Data refresh
  refreshAll: () => Promise<void>;
  refreshPortfolio: () => Promise<void>;
  refreshMarketData: () => Promise<void>;
  
  // AI and automation
  enableAutoRebalance: (config: any) => Promise<void>;
  disableAutoRebalance: () => Promise<void>;
  executeAIRecommendation: (id: string) => Promise<void>;
  
  // Error management
  clearErrors: () => void;
  clearWarnings: () => void;
}

export function useAdvancedIntegration(): [AdvancedIntegrationState, AdvancedIntegrationActions] {
  const wallet = useWalletOnchain();
  const { 
    portfolioMetrics, 
    riskMetrics, 
    isLoading: portfolioLoading,
    refreshMetrics 
  } = usePortfolioMetrics(wallet.address);

  const [state, setState] = useState<AdvancedIntegrationState>({
    isConnected: false,
    isWebSocketConnected: false,
    portfolioMetrics: null,
    marketData: null,
    aiRecommendations: [],
    transactionHistory: [],
    autoRebalanceEnabled: false,
    autoRebalanceConfig: null,
    performanceMetrics: null,
    isLoading: false,
    isInitializing: true,
    errors: [],
    warnings: []
  });

  // Initialize all services
  const initialize = useCallback(async () => {
    if (!wallet.address) return;

    const endTiming = PerformanceMonitor.startTiming('advanced_integration_init');
    
    try {
      setState(prev => ({ ...prev, isInitializing: true, isLoading: true }));

      // Connect WebSocket
      await websocketService.connect(wallet.address);
      
      // Load initial data in parallel
      const [
        aiRecommendations,
        transactionHistory,
        autoRebalanceConfig,
        marketAnalysis
      ] = await Promise.all([
        aiRecommendationService.getRecommendations(wallet.address),
        transactionHistoryService.getTransactionHistory(wallet.address, 20),
        autoRebalancingService.getConfig(wallet.address),
        aiRecommendationService.getMarketAnalysis()
      ]);

      // Set up real-time subscriptions
      websocketService.subscribeToPortfolioUpdates((data) => {
        setState(prev => ({ 
          ...prev, 
          portfolioMetrics: { ...prev.portfolioMetrics, ...data }
        }));
      });

      websocketService.subscribeToMarketData((data) => {
        setState(prev => ({ ...prev, marketData: data }));
      });

      websocketService.subscribeToTransactionUpdates((data) => {
        setState(prev => ({
          ...prev,
          transactionHistory: [data, ...prev.transactionHistory.slice(0, 19)]
        }));
      });

      // Start AI real-time analysis
      aiRecommendationService.startRealTimeAnalysis((analysis) => {
        setState(prev => ({ ...prev, marketData: analysis }));
      });

      // Start auto-rebalancing monitoring if enabled
      if (autoRebalanceConfig.enabled) {
        autoRebalancingService.startMonitoring();
      }

      setState(prev => ({
        ...prev,
        isConnected: true,
        isWebSocketConnected: websocketService.getConnectionStatus(),
        aiRecommendations,
        transactionHistory,
        autoRebalanceEnabled: autoRebalanceConfig.enabled,
        autoRebalanceConfig,
        marketData: marketAnalysis,
        isInitializing: false,
        isLoading: false
      }));

      console.log('✅ Advanced integration initialized successfully');
      
    } catch (error) {
      console.error('❌ Advanced integration initialization failed:', error);
      setState(prev => ({
        ...prev,
        errors: [...prev.errors, `Initialization failed: ${error.message}`],
        isInitializing: false,
        isLoading: false
      }));
    } finally {
      endTiming();
    }
  }, [wallet.address]);

  // Connect function
  const connect = useCallback(async () => {
    await initialize();
  }, [initialize]);

  // Disconnect function
  const disconnect = useCallback(() => {
    websocketService.disconnect();
    aiRecommendationService.stopRealTimeAnalysis();
    autoRebalancingService.stopMonitoring();
    
    setState(prev => ({
      ...prev,
      isConnected: false,
      isWebSocketConnected: false
    }));
    
    console.log('🔌 Advanced integration disconnected');
  }, []);

  // Refresh all data
  const refreshAll = useCallback(async () => {
    if (!wallet.address) return;

    const endTiming = PerformanceMonitor.startTiming('refresh_all_data');
    
    try {
      setState(prev => ({ ...prev, isLoading: true }));

      await Promise.all([
        refreshMetrics(),
        aiRecommendationService.getRecommendations(wallet.address).then(recs => 
          setState(prev => ({ ...prev, aiRecommendations: recs }))
        ),
        transactionHistoryService.refreshTransactionHistory(wallet.address).then(() =>
          transactionHistoryService.getTransactionHistory(wallet.address, 20)
        ).then(history => 
          setState(prev => ({ ...prev, transactionHistory: history }))
        )
      ]);

      setState(prev => ({ ...prev, isLoading: false }));
      console.log('✅ All data refreshed');
      
    } catch (error) {
      console.error('❌ Error refreshing data:', error);
      setState(prev => ({
        ...prev,
        errors: [...prev.errors, `Refresh failed: ${error.message}`],
        isLoading: false
      }));
    } finally {
      endTiming();
    }
  }, [wallet.address, refreshMetrics]);

  // Refresh portfolio data only
  const refreshPortfolio = useCallback(async () => {
    await refreshMetrics();
  }, [refreshMetrics]);

  // Refresh market data only
  const refreshMarketData = useCallback(async () => {
    try {
      const marketAnalysis = await aiRecommendationService.getMarketAnalysis();
      setState(prev => ({ ...prev, marketData: marketAnalysis }));
    } catch (error) {
      console.error('❌ Error refreshing market data:', error);
    }
  }, []);

  // Enable auto-rebalancing
  const enableAutoRebalance = useCallback(async (config: any) => {
    if (!wallet.address) return;

    try {
      await autoRebalancingService.updateConfig(wallet.address, { ...config, enabled: true });
      autoRebalancingService.startMonitoring();
      
      setState(prev => ({
        ...prev,
        autoRebalanceEnabled: true,
        autoRebalanceConfig: { ...config, enabled: true }
      }));
      
      console.log('✅ Auto-rebalancing enabled');
    } catch (error) {
      console.error('❌ Error enabling auto-rebalancing:', error);
      setState(prev => ({
        ...prev,
        errors: [...prev.errors, `Auto-rebalancing failed: ${error.message}`]
      }));
    }
  }, [wallet.address]);

  // Disable auto-rebalancing
  const disableAutoRebalance = useCallback(async () => {
    if (!wallet.address) return;

    try {
      await autoRebalancingService.updateConfig(wallet.address, { enabled: false });
      autoRebalancingService.stopMonitoring();
      
      setState(prev => ({
        ...prev,
        autoRebalanceEnabled: false,
        autoRebalanceConfig: { ...prev.autoRebalanceConfig, enabled: false }
      }));
      
      console.log('⏹️ Auto-rebalancing disabled');
    } catch (error) {
      console.error('❌ Error disabling auto-rebalancing:', error);
    }
  }, [wallet.address]);

  // Execute AI recommendation
  const executeAIRecommendation = useCallback(async (id: string) => {
    if (!wallet.address) return;

    try {
      const success = await aiRecommendationService.executeRecommendation(wallet.address, id);
      
      if (success) {
        // Update recommendation status
        setState(prev => ({
          ...prev,
          aiRecommendations: prev.aiRecommendations.map(rec =>
            rec.id === id ? { ...rec, status: 'executed' } : rec
          )
        }));
        
        // Refresh portfolio data after execution
        await refreshPortfolio();
        
        console.log('✅ AI recommendation executed successfully');
      }
    } catch (error) {
      console.error('❌ Error executing AI recommendation:', error);
      setState(prev => ({
        ...prev,
        errors: [...prev.errors, `Recommendation execution failed: ${error.message}`]
      }));
    }
  }, [wallet.address, refreshPortfolio]);

  // Clear errors
  const clearErrors = useCallback(() => {
    setState(prev => ({ ...prev, errors: [] }));
  }, []);

  // Clear warnings
  const clearWarnings = useCallback(() => {
    setState(prev => ({ ...prev, warnings: [] }));
  }, []);

  // Initialize on wallet connection
  useEffect(() => {
    if (wallet.address && !state.isConnected) {
      initialize();
    } else if (!wallet.address && state.isConnected) {
      disconnect();
    }
  }, [wallet.address, state.isConnected, initialize, disconnect]);

  // Update portfolio metrics in state
  useEffect(() => {
    if (portfolioMetrics) {
      setState(prev => ({ ...prev, portfolioMetrics }));
    }
  }, [portfolioMetrics]);

  // Performance monitoring
  useEffect(() => {
    const performanceMetrics = PerformanceMonitor.getMetrics();
    setState(prev => ({ ...prev, performanceMetrics }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  const actions: AdvancedIntegrationActions = {
    connect,
    disconnect,
    refreshAll,
    refreshPortfolio,
    refreshMarketData,
    enableAutoRebalance,
    disableAutoRebalance,
    executeAIRecommendation,
    clearErrors,
    clearWarnings
  };

  return [state, actions];
}