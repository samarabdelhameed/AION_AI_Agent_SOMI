/**
 * Fallback System for providing backup data when primary sources fail
 */

export interface FallbackData {
  success: boolean;
  data: any;
  source: 'fallback' | 'cache' | 'api';
  timestamp: Date;
}

export class FallbackSystem {
  private fallbackData: Map<string, any> = new Map();
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();

  constructor() {
    this.initializeFallbackData();
  }

  private initializeFallbackData(): void {
    // Initialize with basic fallback data
    this.fallbackData.set('market', {
      protocols: [
        { name: 'Venus', apy: 8.5, tvl: 1000000 },
        { name: 'PancakeSwap', apy: 12.3, tvl: 2000000 },
        { name: 'Aave', apy: 6.8, tvl: 1500000 }
      ],
      bnb_price_usd: 326.12,
      total_tvl: 4500000
    });

    this.fallbackData.set('vault', {
      totalValueLocked: 1000000,
      totalUsers: 150,
      currentStrategy: 'venus_lending',
      apy: 8.5
    });
  }

  async getMarketData(network: string): Promise<FallbackData> {
    // Try cache first
    const cached = this.getCachedData(`market-${network}`);
    if (cached) {
      return {
        success: true,
        data: cached,
        source: 'cache',
        timestamp: new Date()
      };
    }

    // Use fallback data
    const fallbackData = this.fallbackData.get('market');
    if (fallbackData) {
      // Validate fallback data before using it
      if (this.isValidMarketData(fallbackData)) {
        return {
          success: true,
          data: { ...fallbackData, source: 'fallback' },
          source: 'fallback',
          timestamp: new Date()
        };
      }
    }

    // Generate minimal fallback data
    const minimalData = this.generateMinimalMarketData();
    return {
      success: true,
      data: { ...minimalData, source: 'fallback' },
      source: 'fallback',
      timestamp: new Date()
    };
  }

  async getVaultStats(network: string): Promise<FallbackData> {
    const cached = this.getCachedData(`vault-${network}`);
    if (cached) {
      return {
        success: true,
        data: cached,
        source: 'cache',
        timestamp: new Date()
      };
    }

    const fallbackData = this.fallbackData.get('vault');
    if (fallbackData) {
      return {
        success: true,
        data: fallbackData,
        source: 'fallback',
        timestamp: new Date()
      };
    }

    return {
      success: true,
      data: this.generateMinimalVaultData(),
      source: 'fallback',
      timestamp: new Date()
    };
  }

  setFallbackData(key: string, data: any): void {
    this.fallbackData.set(key, data);
  }

  setCachedData(key: string, data: any, ttl: number = 300000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  getCachedData(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) {
      return null;
    }

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  clearCache(): void {
    this.cache.clear();
  }

  generateFallbackData(type: string): any {
    switch (type) {
      case 'market':
        return this.generateMinimalMarketData();
      case 'vault':
        return this.generateMinimalVaultData();
      default:
        return {};
    }
  }

  private generateMinimalMarketData(): any {
    return {
      protocols: [
        { name: 'Venus', apy: 8.0, tvl: 1000000 },
        { name: 'PancakeSwap', apy: 12.0, tvl: 2000000 }
      ],
      bnb_price_usd: 300.0,
      total_tvl: 3000000
    };
  }

  private generateMinimalVaultData(): any {
    return {
      totalValueLocked: 500000,
      totalUsers: 100,
      currentStrategy: 'default',
      apy: 8.0
    };
  }

  private isValidMarketData(data: any): boolean {
    return data && 
           Array.isArray(data.protocols) && 
           typeof data.bnb_price_usd === 'number' && 
           data.bnb_price_usd > 0;
  }

  // Additional methods for compatibility
  cacheData(key: string, data: any, ttl: number = 300000, source: string = 'api'): void {
    this.setCachedData(key, { ...data, source }, ttl);
  }

  getMarketSnapshot(network: string): any {
    return this.generateMinimalMarketData();
  }


}

// Create and export a default instance
export const fallbackSystem = new FallbackSystem();

// Also export as default for convenience
export default fallbackSystem;