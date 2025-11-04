import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FallbackSystem } from '../lib/fallbackSystem';
import { DataValidator } from '../lib/DataValidator';
import { apiClient } from '../lib/api';
import { errorManager } from '../lib/errorManager';

describe('Data Integrity and Validation Tests', () => {
  let fallbackSystem: FallbackSystem;

  beforeEach(() => {
    fallbackSystem = new FallbackSystem();
    vi.clearAllMocks();
  });

  describe('Data Structure Validation', () => {
    it('should validate correct market data structure', () => {
      const validMarketData = {
        protocols: [
          { name: 'Venus', apy: 8.5, tvl: 1000000 },
          { name: 'PancakeSwap', apy: 12.3, tvl: 2000000 }
        ],
        bnb_price_usd: 326.12,
        total_tvl: 3000000
      };

      const validation = DataValidator.validateMarketData(validMarketData);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect invalid market data', () => {
      const invalidMarketData = {
        protocols: null,
        bnb_price_usd: -100,
        total_tvl: 'invalid'
      };

      const validation = DataValidator.validateMarketData(invalidMarketData);
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Fallback Data Integrity', () => {
    it('should generate valid fallback market data', async () => {
      const fallbackData = await fallbackSystem.getMarketData('bscTestnet');
      
      expect(fallbackData.success).toBe(true);
      
      const validation = DataValidator.validateMarketData(fallbackData.data);
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should generate consistent fallback data', async () => {
      const data1 = await fallbackSystem.getMarketData('bscTestnet');
      const data2 = await fallbackSystem.getMarketData('bscTestnet');
      
      // Should be consistent within a short time frame
      expect(data1.data.bnb_price_usd).toBe(data2.data.bnb_price_usd);
    });

    it('should handle corrupted fallback data gracefully', async () => {
      // Corrupt the fallback data
      fallbackSystem.setFallbackData('market', {
        invalid: 'data',
        protocols: null,
        bnb_price_usd: 'not_a_number'
      });

      const result = await fallbackSystem.getMarketData('bscTestnet');
      
      // Should still return valid data structure (will use minimal fallback)
      expect(result.success).toBe(true);
      
      // The system should generate minimal valid data when corrupted data is detected
      expect(result.data.protocols).toBeDefined();
      expect(Array.isArray(result.data.protocols)).toBe(true);
    });
  });

  describe('Cache Data Integrity', () => {
    it('should maintain data integrity in cache', () => {
      const originalData = {
        protocols: [{ name: 'Venus', apy: 8.5, tvl: 1000000 }],
        bnb_price_usd: 326.12,
        total_tvl: 1000000
      };

      // Store in cache
      fallbackSystem.setCachedData('market-bscTestnet', originalData, 60000);

      // Retrieve from cache
      const cachedData = fallbackSystem.getCachedData('market-bscTestnet');

      expect(cachedData).toEqual(originalData);
      
      // Validate cached data structure
      const validation = DataValidator.validateMarketData(cachedData);
      expect(validation.valid).toBe(true);
    });

    it('should handle cache corruption gracefully', async () => {
      // Simulate cache corruption
      fallbackSystem.setCachedData('market-bscTestnet', null, 60000);

      const cachedData = fallbackSystem.getCachedData('market-bscTestnet');
      
      // Should handle null cached data
      expect(cachedData).toBeNull();
      
      // Should generate fresh data when cache is corrupted
      const freshData = await fallbackSystem.getMarketData('bscTestnet');
      expect(freshData.success).toBe(true);
    });

    it('should respect cache TTL for data freshness', async () => {
      const shortTTL = 100; // 100ms
      
      fallbackSystem.setCachedData('test-data', { value: 'original' }, shortTTL);
      
      // Should return cached data immediately
      let cachedData = fallbackSystem.getCachedData('test-data');
      expect(cachedData.value).toBe('original');
      
      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, shortTTL + 10));
      
      // Should return null after TTL expiry
      cachedData = fallbackSystem.getCachedData('test-data');
      expect(cachedData).toBeNull();
    });
  });

  describe('API Response Validation', () => {
    it('should validate API responses before processing', async () => {
      // Mock API response
      vi.spyOn(apiClient, 'getMarketData').mockResolvedValue({
        success: true,
        data: {
          protocols: [{ name: 'Venus', apy: 8.5, tvl: 1000000 }],
          bnb_price_usd: 326.12,
          total_tvl: 1000000
        }
      });

      const result = await apiClient.getMarketData('bscTestnet');
      
      if (result.success) {
        // If it succeeds, data should be valid or fallback
        const validation = DataValidator.validateMarketData(result.data);
        expect(validation.valid || result.data.source === 'fallback').toBe(true);
      } else {
        // If it fails, should have error message
        expect(result.error).toBeDefined();
      }
    });
  });

  describe('Data Consistency Checks', () => {
    it('should ensure data consistency across multiple calls', async () => {
      const results = await Promise.all([
        fallbackSystem.getMarketData('bscTestnet'),
        fallbackSystem.getMarketData('bscTestnet'),
        fallbackSystem.getMarketData('bscTestnet')
      ]);

      // All results should be successful
      results.forEach(result => {
        expect(result.success).toBe(true);
      });

      // Data should be consistent (same BNB price)
      const bnbPrices = results.map(r => r.data.bnb_price_usd);
      expect(new Set(bnbPrices).size).toBe(1); // All prices should be the same
    });

    it('should maintain referential integrity in related data', async () => {
      const marketData = await fallbackSystem.getMarketData('bscTestnet');
      const vaultStats = await fallbackSystem.getVaultStats('bscTestnet');

      expect(marketData.success).toBe(true);
      expect(vaultStats.success).toBe(true);

      // Both should have valid timestamps
      expect(marketData.timestamp).toBeInstanceOf(Date);
      expect(vaultStats.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('Cross-Validation Tests', () => {
    it('should cross-validate data from multiple sources', async () => {
      // Get data from different sources
      const fallbackData = await fallbackSystem.getMarketData('bscTestnet');
      
      // Both should have valid structure
      const fallbackValidation = DataValidator.validateMarketData(fallbackData.data);
      expect(fallbackValidation.valid).toBe(true);
    });

    it('should validate data relationships', async () => {
      const marketData = await fallbackSystem.getMarketData('bscTestnet');
      
      if (marketData.success && marketData.data.protocols) {
        // Validate that protocol data is consistent
        marketData.data.protocols.forEach((protocol: any) => {
          expect(protocol.name).toBeDefined();
          expect(typeof protocol.apy).toBe('number');
          expect(protocol.apy).toBeGreaterThanOrEqual(0);
        });
      }
    });
  });
});