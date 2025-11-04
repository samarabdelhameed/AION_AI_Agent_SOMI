import { describe, it, expect, vi, beforeEach } from 'vitest';
import { realDataService } from '../services/realDataService';

// Mock fetch globally
global.fetch = vi.fn();

describe('RealDataService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any) = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({})
    });
  });

  describe('getRealMarketData', () => {
    it('should return market data with live source when successful', async () => {
      // Mock successful responses
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({
          data: [
            {
              underlyingSymbol: 'BNB',
              totalSupply: '1000000000000000000000', // 1000 BNB
              supplyRate: '0.0483' // 4.83%
            }
          ]
        })
      });

      const result = await realDataService.getRealMarketData();
      
      expect(result).toHaveProperty('totalTVL');
      expect(result).toHaveProperty('avgAPY');
      expect(result).toHaveProperty('healthyCount');
      expect(result).toHaveProperty('liveCount');
      expect(result).toHaveProperty('lastUpdated');
      expect(result).toHaveProperty('dataSource');
    });

    it('should return fallback data when APIs fail', async () => {
      // Mock failed responses
      (global.fetch as any).mockRejectedValueOnce(new Error('API Error'));

      const result = await realDataService.getRealMarketData();
      
      expect(result.dataSource).toBe('fallback');
      expect(result.totalTVL).toBe(0);
      expect(result.avgAPY).toBe(0);
    });
  });

  describe('getRealStrategyData', () => {
    it('should return strategy data for valid strategy ID', async () => {
      const result = await realDataService.getRealStrategyData('venus');
      
      // Should return null if no provider or contract addresses
      expect(result).toBeNull();
    });

    it('should handle invalid strategy ID gracefully', async () => {
      const result = await realDataService.getRealStrategyData('invalid');
      
      expect(result).toBeNull();
    });
  });

  describe('getRealProtocolData', () => {
    it('should fetch Venus data successfully', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({
          data: [
            {
              underlyingSymbol: 'BNB',
              totalSupply: '1000000000000000000000',
              supplyRate: '0.0483'
            }
          ]
        })
      });

      const result = await realDataService.getRealProtocolData('venus');
      
      expect(result).toHaveProperty('apy');
      expect(result).toHaveProperty('tvl');
      expect(result).toHaveProperty('health');
      expect(result).toHaveProperty('source');
    });

    it('should fetch Beefy data successfully', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          'bsc-vault-1': { totalApy: 8.7 },
          'bsc-vault-2': { totalApy: 9.2 }
        })
      });

      const result = await realDataService.getRealProtocolData('beefy');
      
      expect(result).not.toBeNull();
      if (result) {
        expect(result).toHaveProperty('apy');
        expect(result).toHaveProperty('tvl');
        expect(result).toHaveProperty('health');
        expect(result).toHaveProperty('source');
      }
    });

    it('should fetch PancakeSwap data successfully', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        json: async () => ({
          data: {
            totalLiquidityUSD: '98765432'
          }
        })
      });

      const result = await realDataService.getRealProtocolData('pancake');
      
      expect(result).toHaveProperty('apy');
      expect(result).toHaveProperty('tvl');
      expect(result).toHaveProperty('health');
      expect(result).toHaveProperty('source');
    });

    it('should handle API errors gracefully', async () => {
      (global.fetch as any).mockRejectedValue(new Error('Network Error'));

      const result = await realDataService.getRealProtocolData('nonexistent');
      
      expect(result).toBeNull();
    });
  });

  describe('Data parsing', () => {
    it('should parse BigNumber values correctly', () => {
      const mockValue = { _hex: '0xde0b6b3a7640000' }; // 1 ETH in wei
      const result = (realDataService as any).parseBigNumber(mockValue);
      
      expect(result).toBe(1);
    });

    it('should parse TVL values correctly', () => {
      const mockValue = { _hex: '0xde0b6b3a7640000' }; // 1 ETH in wei
      const result = (realDataService as any).parseTVL(mockValue);
      
      expect(result).toBe(326.12); // 1 ETH * 326.12 USD
    });

    it('should parse APY values correctly', () => {
      const mockValue = { _hex: '0x2c' }; // 44 in decimal
      const result = (realDataService as any).parseAPY(mockValue);
      
      expect(result).toBe(4400); // 44 * 100
    });
  });

  describe('Strategy metadata', () => {
    it('should return correct strategy types', () => {
      const venusType = (realDataService as any).getStrategyType('venus');
      const beefyType = (realDataService as any).getStrategyType('beefy');
      const pancakeType = (realDataService as any).getStrategyType('pancake');
      
      expect(venusType).toBe('Lending');
      expect(beefyType).toBe('Yield Farming');
      expect(pancakeType).toBe('DEX');
    });

    it('should return correct strategy descriptions', () => {
      const venusDesc = (realDataService as any).getStrategyDescription('venus');
      const beefyDesc = (realDataService as any).getStrategyDescription('beefy');
      
      expect(venusDesc).toContain('Venus Protocol');
      expect(beefyDesc).toContain('Beefy Finance');
    });

    it('should return correct strategy icons', () => {
      const venusIcon = (realDataService as any).getStrategyIcon('venus');
      const beefyIcon = (realDataService as any).getStrategyIcon('beefy');
      
      expect(venusIcon).toBe('🌙');
      expect(beefyIcon).toBe('🐮');
    });

    it('should return correct strategy colors', () => {
      const venusColor = (realDataService as any).getStrategyColor('venus');
      const beefyColor = (realDataService as any).getStrategyColor('beefy');
      
      expect(venusColor).toBe('#FF6B6B');
      expect(beefyColor).toBe('#4ECDC4');
    });
  });
});
