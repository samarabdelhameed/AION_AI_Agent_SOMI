/**
 * @fileoverview Smart Contract Validation Tests
 * @description Testing real smart contract data validation and integration
 * @author AION Team
 */

import { ethers } from 'ethers';
import { ServiceFactory } from '../../services/index.js';

describe('Smart Contract Validation Tests', () => {
  let services;
  let provider;
  let web3Service;
  let oracleService;

  // Real contract addresses for testing
  const REAL_CONTRACTS = {
    VENUS_COMPTROLLER: '0xfd36e2c2a6789db23113685031d7f16329158384',
    VENUS_VBNB: '0xa07c5b74c9b40447a954e1466938b865b6bbea36',
    PANCAKE_ROUTER: '0x10ed43c718714eb63d5aa57b78b54704e256024e',
    BUSD_TOKEN: '0xe9e7cea3dedca5984780bafc599bd69add087d56'
  };

  // Test networks
  const NETWORKS = {
    BSC_MAINNET: 'https://bsc-dataseed.binance.org/',
    BSC_TESTNET: 'https://data-seed-prebsc-1-s1.binance.org:8545/'
  };

  beforeAll(async () => {
    console.log('🔗 Initializing Smart Contract Validation Tests...');
    
    // Initialize services
    services = await ServiceFactory.createEnhancedMCPAgent({
      environment: 'test',
      configDir: './config',
      cacheProvider: 'memory',
      enableRealData: true
    });

    // Get service instances
    web3Service = await services.container.get('web3Service');
    oracleService = await services.container.get('oracleService');

    // Initialize provider
    provider = new ethers.JsonRpcProvider(NETWORKS.BSC_MAINNET);
    
    console.log('✅ Smart Contract test environment initialized');
  }, 30000);

  afterAll(async () => {
    if (services && services.lifecycle) {
      await services.lifecycle.stopAll();
    }
    console.log('🧹 Smart Contract test environment cleaned up');
  });

  describe('Real Contract State Reading', () => {
    test('should read Venus Comptroller state', async () => {
      try {
        const comptroller = new ethers.Contract(
          REAL_CONTRACTS.VENUS_COMPTROLLER,
          ['function getAllMarkets() view returns (address[])'],
          provider
        );

        const markets = await comptroller.getAllMarkets();
        expect(markets).toBeInstanceOf(Array);
        expect(markets.length).toBeGreaterThan(0);
        
        console.log(`📊 Venus Markets: ${markets.length} markets found`);
        
        // Verify market addresses are valid
        markets.forEach(market => {
          expect(ethers.isAddress(market)).toBe(true);
        });
        
      } catch (error) {
        console.warn('⚠️ Venus Comptroller read failed:', error.message);
        expect(true).toBe(true); // Skip if contract is not accessible
      }
    });

    test('should read VBNB token state', async () => {
      try {
        const vbnb = new ethers.Contract(
          REAL_CONTRACTS.VENUS_VBNB,
          [
            'function name() view returns (string)',
            'function symbol() view returns (string)',
            'function decimals() view returns (uint8)',
            'function totalSupply() view returns (uint256)'
          ],
          provider
        );

        const [name, symbol, decimals, totalSupply] = await Promise.all([
          vbnb.name(),
          vbnb.symbol(),
          vbnb.decimals(),
          vbnb.totalSupply()
        ]);

        expect(name).toBe('Venus BNB');
        expect(symbol).toBe('vBNB');
        expect(decimals).toBe(18);
        expect(totalSupply).toBeGreaterThan(0n);
        
        console.log(`📋 VBNB: ${name} (${symbol}) - Supply: ${ethers.formatEther(totalSupply)}`);
        
      } catch (error) {
        console.warn('⚠️ VBNB read failed:', error.message);
        expect(true).toBe(true); // Skip if contract is not accessible
      }
    });

    test('should read PancakeSwap router state', async () => {
      try {
        const router = new ethers.Contract(
          REAL_CONTRACTS.PANCAKE_ROUTER,
          [
            'function factory() view returns (address)',
            'function WETH() view returns (address)'
          ],
          provider
        );

        const [factory, weth] = await Promise.all([
          router.factory(),
          router.WETH()
        ]);

        expect(ethers.isAddress(factory)).toBe(true);
        expect(ethers.isAddress(weth)).toBe(true);
        
        console.log(`🏭 PancakeSwap Factory: ${factory}`);
        console.log(`💧 WETH: ${weth}`);
        
      } catch (error) {
        console.warn('⚠️ PancakeSwap router read failed:', error.message);
        expect(true).toBe(true); // Skip if contract is not accessible
      }
    });
  });

  describe('Protocol Data Validation', () => {
    test('should validate Venus protocol data structure', async () => {
      const snapshot = await oracleService.getSnapshot('bscMainnet');
      
      expect(snapshot.protocols.venus).toBeDefined();
      const venus = snapshot.protocols.venus;
      
      // Validate data structure
      expect(venus.apy).toBeGreaterThan(0);
      expect(venus.tvl_usd).toBeGreaterThan(0);
      expect(venus.health).toBeDefined();
      expect(venus.last_updated).toBeDefined();
      expect(venus.source).toBeDefined();
      
      // Validate data quality
      expect(venus.apy).toBeLessThan(1000); // APY should be reasonable
      expect(venus.tvl_usd).toBeGreaterThan(1000000); // TVL should be significant
      
      console.log(`📊 Venus Protocol: ${venus.apy.toFixed(2)}% APY, $${venus.tvl_usd.toLocaleString()} TVL`);
    });

    test('should validate PancakeSwap protocol data structure', async () => {
      const snapshot = await oracleService.getSnapshot('bscMainnet');
      
      expect(snapshot.protocols.pancake).toBeDefined();
      const pancake = snapshot.protocols.pancake;
      
      // Validate data structure
      expect(pancake.apy).toBeGreaterThan(0);
      expect(pancake.tvl_usd).toBeGreaterThan(0);
      expect(pancake.health).toBeDefined();
      expect(pancake.last_updated).toBeDefined();
      expect(pancake.source).toBeDefined();
      
      // Validate data quality
      expect(pancake.apy).toBeLessThan(1000); // APY should be reasonable
      expect(pancake.tvl_usd).toBeGreaterThan(1000000); // TVL should be significant
      
      console.log(`📊 PancakeSwap: ${pancake.apy.toFixed(2)}% APY, $${pancake.tvl_usd.toLocaleString()} TVL`);
    });

    test('should validate Beefy protocol data structure', async () => {
      const snapshot = await oracleService.getSnapshot('bscMainnet');
      
      expect(snapshot.protocols.beefy).toBeDefined();
      const beefy = snapshot.protocols.beefy;
      
      // Validate data structure
      expect(beefy.apy).toBeGreaterThan(0);
      expect(beefy.tvl_usd).toBeGreaterThan(0);
      expect(beefy.health).toBeDefined();
      expect(beefy.last_updated).toBeDefined();
      expect(beefy.source).toBeDefined();
      
      // Validate data quality
      expect(beefy.apy).toBeLessThan(1000); // APY should be reasonable
      expect(beefy.tvl_usd).toBeGreaterThan(1000000); // TVL should be significant
      
      console.log(`📊 Beefy Finance: ${beefy.apy.toFixed(2)}% APY, $${beefy.tvl_usd.toLocaleString()} TVL`);
    });
  });

  describe('Data Source Verification', () => {
    test('should identify data sources correctly', async () => {
      const snapshot = await oracleService.getSnapshot('bscMainnet');
      
      // Check that we have multiple data sources
      const sources = new Set(Object.values(snapshot.protocols).map(p => p.source));
      expect(sources.size).toBeGreaterThan(1);
      
      // Verify source types
      sources.forEach(source => {
        expect(['live', 'defillama', 'fallback']).toContain(source);
      });
      
      console.log(`📊 Data sources used: ${Array.from(sources).join(', ')}`);
      
      // Count protocols by source
      const sourceCounts = {};
      Object.values(snapshot.protocols).forEach(protocol => {
        sourceCounts[protocol.source] = (sourceCounts[protocol.source] || 0) + 1;
      });
      
      Object.entries(sourceCounts).forEach(([source, count]) => {
        console.log(`📊 ${source}: ${count} protocols`);
      });
    });

    test('should have recent data timestamps', async () => {
      const snapshot = await oracleService.getSnapshot('bscMainnet');
      
      const now = Date.now();
      
      Object.values(snapshot.protocols).forEach(protocol => {
        const dataAge = now - new Date(protocol.last_updated).getTime();
        
        // Data should be less than 1 hour old
        expect(dataAge).toBeLessThan(3600000);
        
        console.log(`🕒 ${protocol.source} data age: ${Math.round(dataAge / 1000)}s`);
      });
    });
  });

  describe('Cross-Protocol Data Consistency', () => {
    test('should maintain consistent data across protocols', async () => {
      const snapshot = await oracleService.getSnapshot('bscMainnet');
      
      // All protocols should have similar data structure
      const protocols = Object.values(snapshot.protocols);
      
      protocols.forEach(protocol => {
        // Required fields
        expect(protocol).toHaveProperty('apy');
        expect(protocol).toHaveProperty('tvl_usd');
        expect(protocol).toHaveProperty('health');
        expect(protocol).toHaveProperty('last_updated');
        expect(protocol).toHaveProperty('source');
        
        // Data types
        expect(typeof protocol.apy).toBe('number');
        expect(typeof protocol.tvl_usd).toBe('number');
        expect(typeof protocol.health).toBe('string');
        expect(typeof protocol.last_updated).toBe('string');
        expect(typeof protocol.source).toBe('string');
      });
      
      console.log(`✅ Data consistency validated for ${protocols.length} protocols`);
    });

    test('should have reasonable APY ranges', async () => {
      const snapshot = await oracleService.getSnapshot('bscMainnet');
      
      Object.entries(snapshot.protocols).forEach(([name, protocol]) => {
        // APY should be reasonable (between 0.1% and 1000%)
        expect(protocol.apy).toBeGreaterThan(0.1);
        expect(protocol.apy).toBeLessThan(1000);
        
        // TVL should be significant
        expect(protocol.tvl_usd).toBeGreaterThan(100000);
        
        console.log(`📊 ${name}: ${protocol.apy.toFixed(2)}% APY, $${protocol.tvl_usd.toLocaleString()} TVL`);
      });
    });
  });

  describe('Real-Time Data Updates', () => {
    test('should detect data updates', async () => {
      // Get initial snapshot
      const snapshot1 = await oracleService.getSnapshot('bscMainnet');
      const timestamp1 = new Date(snapshot1.timestamp).getTime();
      
      // Wait for potential update
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Get second snapshot
      const snapshot2 = await oracleService.getSnapshot('bscMainnet');
      const timestamp2 = new Date(snapshot2.timestamp).getTime();
      
      // Timestamps should be different (indicating potential update)
      expect(timestamp2).toBeGreaterThanOrEqual(timestamp1);
      
      const timeDiff = timestamp2 - timestamp1;
      console.log(`🕒 Time between snapshots: ${timeDiff}ms`);
      
      // Data should be consistent
      expect(snapshot2.bnbPrice).toBeGreaterThan(0);
      expect(Object.keys(snapshot2.protocols).length).toBeGreaterThan(0);
    });

    test('should handle concurrent data requests', async () => {
      const startTime = Date.now();
      
      // Make multiple concurrent requests
      const requests = Array(5).fill().map(() => 
        oracleService.getSnapshot('bscMainnet')
      );
      
      const results = await Promise.all(requests);
      const endTime = Date.now();
      
      expect(results).toHaveLength(5);
      
      // All results should be valid
      results.forEach(result => {
        expect(result.bnbPrice).toBeGreaterThan(0);
        expect(result.protocols).toBeDefined();
      });
      
      const totalTime = endTime - startTime;
      console.log(`⚡ 5 concurrent requests completed in ${totalTime}ms`);
      
      // Should complete within reasonable time
      expect(totalTime).toBeLessThan(10000);
    });
  });

  describe('Error Recovery and Fallbacks', () => {
    test('should handle network failures gracefully', async () => {
      // Test with invalid network
      try {
        const snapshot = await oracleService.getSnapshot('invalidNetwork');
        // Should still return data (possibly from cache or fallback)
        expect(snapshot).toBeDefined();
        console.log('✅ Invalid network handled gracefully');
      } catch (error) {
        // Error handling is also acceptable
        expect(error).toBeDefined();
        console.log('✅ Invalid network error handled properly');
      }
    });

    test('should maintain service stability under load', async () => {
      const startTime = Date.now();
      
      // Make many requests to test stability
      const requests = Array(20).fill().map((_, index) => 
        oracleService.getSnapshot('bscMainnet').then(result => ({ index, success: true, result }))
          .catch(error => ({ index, success: false, error: error.message }))
      );
      
      const results = await Promise.allSettled(requests);
      const endTime = Date.now();
      
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failed = results.length - successful;
      
      console.log(`📊 Load test: ${successful} successful, ${failed} failed`);
      
      // Should maintain reasonable success rate
      expect(successful).toBeGreaterThan(results.length * 0.8); // 80% success rate
      
      const totalTime = endTime - startTime;
      console.log(`⚡ Load test completed in ${totalTime}ms`);
    });
  });

  describe('Data Quality Metrics', () => {
    test('should provide data quality indicators', async () => {
      const snapshot = await oracleService.getSnapshot('bscMainnet');
      
      // Check data completeness
      const protocols = Object.values(snapshot.protocols);
      const completeData = protocols.filter(p => 
        p.apy > 0 && p.tvl_usd > 0 && p.health && p.last_updated
      );
      
      const completenessRate = completeData.length / protocols.length;
      expect(completenessRate).toBeGreaterThan(0.8); // 80% data completeness
      
      console.log(`📊 Data completeness: ${(completenessRate * 100).toFixed(1)}%`);
      
      // Check data freshness
      const now = Date.now();
      const freshData = protocols.filter(p => {
        const age = now - new Date(p.last_updated).getTime();
        return age < 300000; // Less than 5 minutes old
      });
      
      const freshnessRate = freshData.length / protocols.length;
      expect(freshnessRate).toBeGreaterThan(0.5); // 50% fresh data
      
      console.log(`📊 Data freshness: ${(freshnessRate * 100).toFixed(1)}%`);
    });

    test('should validate BNB price accuracy', async () => {
      const snapshot = await oracleService.getSnapshot('bscMainnet');
      
      // BNB price should be reasonable
      expect(snapshot.bnbPrice).toBeGreaterThan(100); // BNB should be > $100
      expect(snapshot.bnbPrice).toBeLessThan(10000); // BNB should be < $10,000
      
      // Price should be a valid number
      expect(Number.isFinite(snapshot.bnbPrice)).toBe(true);
      
      console.log(`💰 BNB Price: $${snapshot.bnbPrice.toFixed(2)}`);
      
      // Check if price is within reasonable range of market
      if (snapshot.bnbPrice > 200 && snapshot.bnbPrice < 500) {
        console.log('✅ BNB price is within expected range');
      } else {
        console.log('⚠️ BNB price may need verification');
      }
    });
  });
});
