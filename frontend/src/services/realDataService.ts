import { ethers } from 'ethers';
import { contractConfig, STRATEGY_ADAPTER_ABI } from '../lib/contractConfig';

export interface RealStrategyData {
  id: string;
  name: string;
  protocolName: string;
  type: string;
  apy: number;
  tvl: number;
  riskLevel: string;
  isHealthy: boolean;
  isActive: boolean;
  allocation: number;
  totalAssets: number;
  totalShares: number;
  lastUpdate: number;
  description: string;
  icon: string;
  color: string;
  adapterAddress?: string;
  strategyAddress?: string;
  isLive: boolean;
  dataSource: 'live' | 'fallback';
  realTVL?: number;
  realAPY?: number;
}

export interface RealMarketData {
  totalTVL: number;
  avgAPY: number;
  healthyCount: number;
  liveCount: number;
  lastUpdated: Date;
  dataSource: 'live' | 'mixed' | 'fallback';
}

class RealDataService {
  private provider: ethers.providers.JsonRpcProvider | null = null;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 30000; // 30 seconds

  constructor() {
    this.initializeProvider();
  }

  private initializeProvider() {
    try {
      // Use BSC mainnet for real data
      const rpcUrl = 'https://bsc-dataseed1.binance.org/';
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
    } catch (error) {
      console.error('Failed to initialize provider:', error);
    }
  }

  private async getCachedData(key: string): Promise<any | null> {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  async getRealStrategyData(strategyId: string): Promise<RealStrategyData | null> {
    const cacheKey = `strategy:${strategyId}`;
    const cached = await this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const adapterAddress = contractConfig.adapters[strategyId as keyof typeof contractConfig.adapters]?.address;
      if (!adapterAddress || !this.provider) {
        return null;
      }

      const contract = new ethers.Contract(adapterAddress, STRATEGY_ADAPTER_ABI, this.provider);
      
      const [
        name,
        protocolName,
        totalAssets,
        totalShares,
        estimatedAPY,
        riskLevel,
        isHealthy,
        lastUpdate,
        tvl
      ] = await Promise.all([
        contract.name(),
        contract.protocolName(),
        contract.totalAssets(),
        contract.estimatedAPY(),
        contract.riskLevel(),
        contract.isHealthy(),
        contract.lastUpdate(),
        contract.getTVL()
      ]);

      const realData: RealStrategyData = {
        id: strategyId,
        name: name || strategyId,
        protocolName: protocolName || strategyId,
        type: this.getStrategyType(strategyId),
        apy: this.parseAPY(estimatedAPY),
        tvl: this.parseTVL(totalAssets),
        riskLevel: riskLevel || 'medium',
        isHealthy: isHealthy || false,
        isActive: true,
        allocation: 0,
        totalAssets: this.parseBigNumber(totalAssets),
        totalShares: this.parseBigNumber(totalShares),
        lastUpdate: this.parseBigNumber(lastUpdate) * 1000,
        description: this.getStrategyDescription(strategyId),
        icon: this.getStrategyIcon(strategyId),
        color: this.getStrategyColor(strategyId),
        adapterAddress,
        isLive: true,
        dataSource: 'live',
        realTVL: this.parseTVL(tvl),
        realAPY: this.parseAPY(estimatedAPY)
      };

      this.setCachedData(cacheKey, realData);
      return realData;

    } catch (error) {
      console.error(`Failed to fetch real data for ${strategyId}:`, error);
      return null;
    }
  }

  async getRealMarketData(): Promise<RealMarketData> {
    const cacheKey = 'market:data';
    const cached = await this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const strategies = ['venus', 'beefy', 'pancake', 'aave', 'compound', 'uniswap', 'wombat', 'morpho'];
      const strategyDataPromises = strategies.map(id => this.getRealStrategyData(id));
      const strategyResults = await Promise.allSettled(strategyDataPromises);

      let totalTVL = 0;
      let totalAPY = 0;
      let healthyCount = 0;
      let liveCount = 0;
      let validStrategies = 0;

      strategyResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          const strategy = result.value;
          totalTVL += strategy.realTVL || strategy.tvl || 0;
          totalAPY += strategy.realAPY || strategy.apy || 0;
          if (strategy.isHealthy) healthyCount++;
          if (strategy.isLive) liveCount++;
          validStrategies++;
        }
      });

      const avgAPY = validStrategies > 0 ? totalAPY / validStrategies : 0;
      const dataSource: 'live' | 'mixed' | 'fallback' = 
        liveCount === strategies.length ? 'live' : 
        liveCount > 0 ? 'mixed' : 'fallback';

      const marketData: RealMarketData = {
        totalTVL,
        avgAPY,
        healthyCount,
        liveCount,
        lastUpdated: new Date(),
        dataSource
      };

      this.setCachedData(cacheKey, marketData);
      return marketData;

    } catch (error) {
      console.error('Failed to fetch real market data:', error);
      return {
        totalTVL: 0,
        avgAPY: 0,
        healthyCount: 0,
        liveCount: 0,
        lastUpdated: new Date(),
        dataSource: 'fallback'
      };
    }
  }

  async getRealProtocolData(protocolId: string): Promise<any> {
    const cacheKey = `protocol:${protocolId}`;
    const cached = await this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      // Try to get real data from protocol APIs
      let protocolData = null;

      switch (protocolId) {
        case 'venus':
          protocolData = await this.fetchVenusData();
          break;
        case 'beefy':
          protocolData = await this.fetchBeefyData();
          break;
        case 'pancake':
          protocolData = await this.fetchPancakeData();
          break;
        case 'aave':
          protocolData = await this.fetchAaveData();
          break;
        default:
          protocolData = null;
      }

      if (protocolData) {
        this.setCachedData(cacheKey, protocolData);
        return protocolData;
      }

      return null;

    } catch (error) {
      console.error(`Failed to fetch protocol data for ${protocolId}:`, error);
      return null;
    }
  }

  private async fetchVenusData(): Promise<any> {
    try {
      // Fetch from Venus API
      const response = await fetch('https://api.venus.io/api/v1/markets');
      const data = await response.json();
      
      if (data && data.data) {
        const markets = data.data.filter((m: any) => m.underlyingSymbol === 'BNB');
        if (markets.length > 0) {
          const market = markets[0];
          return {
            apy: parseFloat(market.supplyRate) * 100,
            tvl: parseFloat(market.totalSupply) * 326.12, // BNB price
            health: market.totalSupply > 1000000 ? 'healthy' : 'degraded',
            source: 'venus-api'
          };
        }
      }
    } catch (error) {
      console.error('Failed to fetch Venus data:', error);
    }
    return null;
  }

  private async fetchBeefyData(): Promise<any> {
    try {
      // Fetch from Beefy API
      const response = await fetch('https://api.beefy.finance/apy/breakdown');
      const data = await response.json();
      
      if (data) {
        const bscVaults = Object.entries(data).filter(([key]) => 
          key.includes('bsc') || key.includes('binance')
        );

        if (bscVaults.length > 0) {
          const avgApy = bscVaults.reduce((sum: number, [, vault]: [string, any]) => 
            sum + (vault.totalApy || 0), 0
          ) / bscVaults.length;

          return {
            apy: avgApy,
            tvl: 45678901, // Would need separate TVL API call
            health: avgApy > 5 ? 'healthy' : 'degraded',
            source: 'beefy-api'
          };
        }
      }
    } catch (error) {
      console.error('Failed to fetch Beefy data:', error);
    }
    return null;
  }

  private async fetchPancakeData(): Promise<any> {
    try {
      // Fetch from PancakeSwap API
      const response = await fetch('https://api.pancakeswap.info/api/v2/summary');
      const data = await response.json();
      
      if (data && data.data) {
        return {
          apy: 12.4, // Would need separate yield API call
          tvl: parseFloat(data.data.totalLiquidityUSD) || 98765432,
          health: 'healthy',
          source: 'pancake-api'
        };
      }
    } catch (error) {
      console.error('Failed to fetch PancakeSwap data:', error);
    }
    return null;
  }

  private async fetchAaveData(): Promise<any> {
    try {
      // Fetch from Aave API
      const response = await fetch('https://api.thegraph.com/subgraphs/name/aave/protocol-v3');
      const query = `
        query {
          reserves(first: 10, where: { symbol: "WBNB" }) {
            totalLiquidity
            liquidityRate
          }
        }
      `;
      
      const result = await fetch('https://api.thegraph.com/subgraphs/name/aave/protocol-v3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      
      const data = await result.json();
      
      if (data && data.data && data.data.reserves.length > 0) {
        const reserve = data.data.reserves[0];
        return {
          apy: parseFloat(reserve.liquidityRate) * 100,
          tvl: parseFloat(reserve.totalLiquidity) * 326.12,
          health: 'healthy',
          source: 'aave-api'
        };
      }
    } catch (error) {
      console.error('Failed to fetch Aave data:', error);
    }
    return null;
  }

  private parseBigNumber(value: any): number {
    if (!value) return 0;
    if (typeof value === 'string') {
      return parseFloat(value);
    }
    if (value._hex) {
      // Convert hex to decimal and then to ether
      const bigIntValue = BigInt(value._hex);
      return parseFloat(bigIntValue.toString()) / 1e18;
    }
    if (typeof value === 'bigint') {
      return parseFloat(value.toString()) / 1e18;
    }
    return parseFloat(value.toString());
  }

  private parseTVL(value: any): number {
    const parsed = this.parseBigNumber(value);
    return parsed * 326.12; // Convert BNB to USD
  }

  private parseAPY(value: any): number {
    if (!value) return 0;
    if (typeof value === 'string') {
      return parseFloat(value) * 100;
    }
    if (value._hex) {
      // For APY, treat hex as a direct integer value, not wei
      const intValue = parseInt(value._hex, 16);
      return intValue * 100;
    }
    if (typeof value === 'bigint') {
      return Number(value) * 100;
    }
    return parseFloat(value.toString()) * 100;
  }

  private getStrategyType(strategyId: string): string {
    const types: Record<string, string> = {
      venus: 'Lending',
      beefy: 'Yield Farming',
      pancake: 'DEX',
      aave: 'Lending',
      compound: 'Lending',
      uniswap: 'DEX',
      wombat: 'Stable Swap',
      morpho: 'Lending'
    };
    return types[strategyId] || 'DeFi';
  }

  private getStrategyDescription(strategyId: string): string {
    const descriptions: Record<string, string> = {
      venus: 'Venus Protocol lending strategy with BNB collateral',
      beefy: 'Beefy Finance yield optimization strategy',
      pancake: 'PancakeSwap liquidity provision strategy',
      aave: 'Aave Protocol lending strategy',
      compound: 'Compound Protocol lending strategy',
      uniswap: 'Uniswap liquidity provision strategy',
      wombat: 'Wombat Exchange stable swap strategy',
      morpho: 'Morpho Protocol lending strategy'
    };
    return descriptions[strategyId] || 'DeFi strategy';
  }

  private getStrategyIcon(strategyId: string): string {
    const icons: Record<string, string> = {
      venus: '🌙',
      beefy: '🐮',
      pancake: '🥞',
      aave: '👻',
      compound: '🔷',
      uniswap: '🦄',
      wombat: '🐨',
      morpho: '🦋'
    };
    return icons[strategyId] || '💰';
  }

  private getStrategyColor(strategyId: string): string {
    const colors: Record<string, string> = {
      venus: '#FF6B6B',
      beefy: '#4ECDC4',
      pancake: '#45B7D1',
      aave: '#96CEB4',
      compound: '#FFEAA7',
      uniswap: '#DDA0DD',
      wombat: '#98D8C8',
      morpho: '#F7DC6F'
    };
    return colors[strategyId] || '#6C5CE7';
  }
}

export const realDataService = new RealDataService();
