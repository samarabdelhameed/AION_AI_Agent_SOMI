import { configManager } from './config';
import { ConnectionManager } from './connectionManager';
import { FallbackSystem } from './fallbackSystem';

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  warning?: string;
  source?: 'live' | 'cached' | 'fallback';
  timestamp?: string;
}

export interface MarketSnapshot {
  network: string;
  bnb_price_usd: number;
  protocols: {
    venus: { apy: number; tvl_usd: number; health: string };
    pancake: { apy: number; tvl_usd: number; health: string };
    beefy?: { apy: number; tvl_usd: number; health: string };
    aave?: { apy: number; tvl_usd: number; health: string };
  };
  last_updated: string;
  stale: boolean;
}

export interface ExecutionRequest {
  network: string;
  strategy: string;
  action: string;
  amount: string;
  currency: string;
}

export interface ExecutionResult {
  success: boolean;
  txHash?: string;
  gasUsed?: number;
  error?: string;
}

class ApiClient {
  private initialized: boolean = false;
  private connectionManager: ConnectionManager;
  private fallbackSystem: FallbackSystem;

  constructor() {
    this.connectionManager = new ConnectionManager();
    this.fallbackSystem = new FallbackSystem();
    console.log('🔗 API Client initialized');
  }

  async initialize(): Promise<void> {
    if (!this.initialized) {
      await this.connectionManager.initialize();
      this.initialized = true;
      console.log('✅ API Client ready');
    }
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    await this.initialize();
    
    const result = await this.connectionManager.makeRequest<T>(endpoint, options);
    
    if (result.success) {
      // Cache successful responses
      const cacheKey = `${endpoint}_${JSON.stringify(options?.body || {})}`;
      fallbackSystem.cacheData(cacheKey, result.data, 300000); // 5 minutes
      
      return {
        success: true,
        data: result.data,
        source: result.source,
        timestamp: new Date().toISOString()
      };
    } else {
      // Try fallback data
      return {
        success: false,
        error: result.error,
        source: result.source,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Get market snapshot with real data
  async getMarketSnapshot(network: string = 'bscTestnet'): Promise<ApiResponse<MarketSnapshot>> {
    const result = await this.request<MarketSnapshot>(`/api/oracle/snapshot?network=${network}`);
    
    if (!result.success) {
      // Use fallback data
      const fallbackData = fallbackSystem.getMarketSnapshot(network);
      return {
        success: true,
        data: fallbackData,
        source: 'fallback',
        warning: 'Using fallback data - API unavailable',
        timestamp: new Date().toISOString()
      };
    }
    
    return result;
  }

  // Get vault balance and stats
  async getVaultStats(network: string = 'bscTestnet'): Promise<ApiResponse<{ balance: number; shares: number; dailyProfit: number; apy: number; strategy: string; lastUpdated?: string }>> {
    const result = await this.request(`/api/vault/stats?network=${network}`);
    
    if (!result.success || !result.data) {
      // Use fallback data
      const fallbackData = fallbackSystem.getVaultStats();
      return {
        success: true,
        data: fallbackData,
        source: 'fallback',
        warning: 'Using fallback data - Vault API unavailable',
        timestamp: new Date().toISOString()
      };
    }
    
    return result;
  }

  // Execute strategy decision
  async executeStrategy(request: ExecutionRequest): Promise<ApiResponse<ExecutionResult>> {
    return this.request<ExecutionResult>('/api/execute', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Get AI decision recommendation
  async getAIDecision(params: Record<string, unknown>): Promise<ApiResponse<Record<string, unknown>>> {
    return this.request('/api/decide', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  // Get proof of yield data
  async getProofOfYield(network: string = 'bscTestnet'): Promise<ApiResponse<Record<string, unknown>>> {
    return this.request(`/api/proof-of-yield/snapshot?network=${network}`);
  }

  // Get historical series for a protocol
  async getHistorical(protocol: string, timeframe: '24h' | '30d' = '30d'): Promise<ApiResponse<Array<{ timestamp: number; value: number; date: string; source: string }>>> {
    return this.request(`/api/oracle/historical?protocol=${protocol}&timeframe=${timeframe}`);
  }

  // Get system health
  async getSystemHealth(): Promise<ApiResponse<Record<string, unknown>>> {
    const result = await this.request('/api/health');
    
    if (!result.success) {
      // Use fallback health data
      const fallbackData = fallbackSystem.getSystemHealth();
      return {
        success: true,
        data: fallbackData,
        source: 'fallback',
        warning: 'Using fallback data - Health API unavailable',
        timestamp: new Date().toISOString()
      };
    }
    
    return result;
  }

  // Get transaction history
  async getTransactionHistory(address?: string): Promise<ApiResponse<Array<Record<string, unknown>>>> {
    const query = address ? `?address=${address}` : '';
    return this.request(`/api/transactions${query}`);
  }

  // Get market data
  async getMarketData(network: string): Promise<ApiResponse<any>> {
    return this.request(`/api/market/${network}`);
  }
}

export const apiClient = new ApiClient();

// Utility functions for mock data fallback
export const getMockData = () => ({
  marketSnapshot: {
    network: 'bscTestnet',
    bnb_price_usd: 326.12,
    protocols: {
      venus: { apy: 4.83, tvl_usd: 123456789, health: "healthy" },
      pancake: { apy: 12.4, tvl_usd: 98765432, health: "healthy" },
      beefy: { apy: 8.7, tvl_usd: 45678901, health: "healthy" },
      aave: { apy: 6.2, tvl_usd: 78901234, health: "healthy" }
    },
    last_updated: new Date().toISOString(),
    stale: false
  },
  vaultStats: {
    balance: 3247.82,
    shares: 3180,
    dailyProfit: 28.5,
    apy: 12.8,
    strategy: 'Venus Protocol'
  }
});