/**
 * @fileoverview Real Data Stress Tests
 * @description Performance testing under real data load conditions
 * @author AION Team
 */

import { ethers } from 'ethers';
import { ServiceFactory } from '../../services/index.js';

describe('Real Data Stress Tests', () => {
  let services;
  let oracleService;
  let web3Service;
  let cacheManager;

  // Performance thresholds
  const PERFORMANCE_THRESHOLDS = {
    SINGLE_REQUEST_MS: 2000,      // Single API request should complete within 2s
    CONCURRENT_10_MS: 5000,       // 10 concurrent requests within 5s
    CONCURRENT_50_MS: 15000,      // 50 concurrent requests within 15s
    CACHE_HIT_MS: 100,            // Cache hit should be under 100ms
    MEMORY_MB: 512,               // Memory usage should stay under 512MB
    ERROR_RATE: 0.1                // Error rate should be under 10%
  };

  beforeAll(async () => {
    console.log('🚀 Initializing Real Data Stress Tests...');
    
    // Initialize services with performance monitoring
    services = await ServiceFactory.createEnhancedMCPAgent({
      environment: 'test',
      configDir: './config',
      cacheProvider: 'memory',
      enableRealData: true,
      performanceMonitoring: true
    });

    // Get service instances
    oracleService = await services.container.get('oracleService');
    web3Service = await services.container.get('web3Service');
    cacheManager = await services.container.get('cacheManager');
    
    console.log('✅ Stress test environment initialized');
  }, 30000);

  afterAll(async () => {
    if (services && services.lifecycle) {
      await services.lifecycle.stopAll();
    }
    console.log('🧹 Stress test environment cleaned up');
  });

  describe('Single Request Performance', () => {
    test('should complete single market snapshot request within threshold', async () => {
      const startTime = Date.now();
      
      const snapshot = await oracleService.getSnapshot('bscMainnet');
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      
      expect(snapshot).toBeDefined();
      expect(snapshot.bnbPrice).toBeGreaterThan(0);
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.SINGLE_REQUEST_MS);
      
      console.log(`⚡ Single request completed in ${duration}ms (threshold: ${PERFORMANCE_THRESHOLDS.SINGLE_REQUEST_MS}ms)`);
    });

    test('should complete single historical data request within threshold', async () => {
      const startTime = Date.now();
      
      const historicalData = await oracleService.getHistoricalData('venus', '7d');
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      
      expect(historicalData).toBeDefined();
      expect(historicalData.protocol).toBe('venus');
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.SINGLE_REQUEST_MS);
      
      console.log(`⚡ Historical request completed in ${duration}ms (threshold: ${PERFORMANCE_THRESHOLDS.SINGLE_REQUEST_MS}ms)`);
    });
  });

  describe('Concurrent Request Performance', () => {
    test('should handle 10 concurrent requests within threshold', async () => {
      const startTime = Date.now();
      
      const requests = Array(10).fill().map(() => 
        oracleService.getSnapshot('bscMainnet')
      );
      
      const results = await Promise.all(requests);
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result.bnbPrice).toBeGreaterThan(0);
        expect(result.protocols).toBeDefined();
      });
      
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.CONCURRENT_10_MS);
      
      console.log(`⚡ 10 concurrent requests completed in ${duration}ms (threshold: ${PERFORMANCE_THRESHOLDS.CONCURRENT_10_MS}ms)`);
    });

    test('should handle 25 concurrent requests within threshold', async () => {
      const startTime = Date.now();
      
      const requests = Array(25).fill().map(() => 
        oracleService.getSnapshot('bscMainnet')
      );
      
      const results = await Promise.all(requests);
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      
      expect(results).toHaveLength(25);
      results.forEach(result => {
        expect(result.bnbPrice).toBeGreaterThan(0);
        expect(result.protocols).toBeDefined();
      });
      
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.CONCURRENT_10_MS * 2);
      
      console.log(`⚡ 25 concurrent requests completed in ${duration}ms`);
    });

    test('should handle 50 concurrent requests within threshold', async () => {
      const startTime = Date.now();
      
      const requests = Array(50).fill().map(() => 
        oracleService.getSnapshot('bscMainnet')
      );
      
      const results = await Promise.all(requests);
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      
      expect(results).toHaveLength(50);
      results.forEach(result => {
        expect(result.bnbPrice).toBeGreaterThan(0);
        expect(result.protocols).toBeDefined();
      });
      
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.CONCURRENT_50_MS);
      
      console.log(`⚡ 50 concurrent requests completed in ${duration}ms (threshold: ${PERFORMANCE_THRESHOLDS.CONCURRENT_50_MS}ms)`);
    });
  });

  describe('Cache Performance', () => {
    test('should provide fast cache hits', async () => {
      // First request to populate cache
      await oracleService.getSnapshot('bscMainnet');
      
      // Second request should hit cache
      const startTime = Date.now();
      await oracleService.getSnapshot('bscMainnet');
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(PERFORMANCE_THRESHOLDS.CACHE_HIT_MS);
      
      console.log(`⚡ Cache hit completed in ${duration}ms (threshold: ${PERFORMANCE_THRESHOLDS.CACHE_HIT_MS}ms)`);
    });

    test('should maintain cache performance under load', async () => {
      // Populate cache with multiple keys
      const cacheKeys = Array(100).fill().map((_, i) => `test:key:${i}`);
      const testData = { value: 'test', timestamp: Date.now() };
      
      // Set cache values
      const setStartTime = Date.now();
      await Promise.all(cacheKeys.map(key => cacheManager.set(key, testData, 60000)));
      const setEndTime = Date.now();
      
      // Read cache values
      const readStartTime = Date.now();
      const results = await Promise.all(cacheKeys.map(key => cacheManager.get(key)));
      const readEndTime = Date.now();
      
      const setDuration = setEndTime - setStartTime;
      const readDuration = readEndTime - readStartTime;
      
      expect(results).toHaveLength(100);
      expect(setDuration).toBeLessThan(1000); // Set 100 keys within 1s
      expect(readDuration).toBeLessThan(500);  // Read 100 keys within 500ms
      
      console.log(`⚡ Cache set: ${setDuration}ms, Cache read: ${readDuration}ms`);
    });
  });

  describe('Memory Usage Under Load', () => {
    test('should maintain stable memory usage during concurrent requests', async () => {
      const initialMemory = process.memoryUsage();
      
      // Make many concurrent requests
      const requests = Array(100).fill().map(() => 
        oracleService.getSnapshot('bscMainnet')
      );
      
      await Promise.all(requests);
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = memoryIncrease / 1024 / 1024;
      
      expect(memoryIncreaseMB).toBeLessThan(PERFORMANCE_THRESHOLDS.MEMORY_MB);
      
      console.log(`🧠 Memory increase: ${memoryIncreaseMB.toFixed(2)}MB (threshold: ${PERFORMANCE_THRESHOLDS.MEMORY_MB}MB)`);
      console.log(`🧠 Initial: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
      console.log(`🧠 Final: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    });

    test('should handle memory pressure gracefully', async () => {
      // Create large objects to simulate memory pressure
      const largeObjects = Array(50).fill().map(() => ({
        data: Array(1000).fill().map(() => Math.random()),
        timestamp: Date.now(),
        metadata: 'large-test-object'
      }));
      
      // Store in cache
      await Promise.all(largeObjects.map((obj, i) => 
        cacheManager.set(`large:${i}`, obj, 30000)
      ));
      
      // Make requests under memory pressure
      const startTime = Date.now();
      const requests = Array(20).fill().map(() => 
        oracleService.getSnapshot('bscMainnet')
      );
      
      const results = await Promise.all(requests);
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      
      expect(results).toHaveLength(20);
      expect(duration).toBeLessThan(10000); // Should still complete within 10s
      
      console.log(`⚡ Memory pressure test completed in ${duration}ms`);
      
      // Clean up large objects
      await Promise.all(largeObjects.map((_, i) => 
        cacheManager.delete(`large:${i}`)
      ));
    });
  });

  describe('Error Rate Under Load', () => {
    test('should maintain low error rate during high load', async () => {
      const totalRequests = 100;
      const requests = Array(totalRequests).fill().map((_, index) => 
        oracleService.getSnapshot('bscMainnet')
          .then(result => ({ index, success: true, result }))
          .catch(error => ({ index, success: false, error: error.message }))
      );
      
      const results = await Promise.allSettled(requests);
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failed = results.filter(r => r.status === 'rejected' || !r.value.success).length;
      
      const errorRate = failed / totalRequests;
      
      expect(errorRate).toBeLessThan(PERFORMANCE_THRESHOLDS.ERROR_RATE);
      expect(successful).toBeGreaterThan(totalRequests * 0.8); // At least 80% success
      
      console.log(`📊 Error rate: ${(errorRate * 100).toFixed(1)}% (threshold: ${PERFORMANCE_THRESHOLDS.ERROR_RATE * 100}%)`);
      console.log(`📊 Success: ${successful}, Failed: ${failed}`);
    });

    test('should handle network failures gracefully under load', async () => {
      // Simulate network instability by making many requests
      const requests = Array(200).fill().map((_, index) => 
        oracleService.getSnapshot('bscMainnet')
          .then(result => ({ index, success: true, result }))
          .catch(error => ({ index, success: false, error: error.message }))
      );
      
      const startTime = Date.now();
      const results = await Promise.allSettled(requests);
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failed = results.filter(r => r.status === 'rejected' || !r.value.success).length;
      
      const errorRate = failed / (successful + failed);
      
      expect(errorRate).toBeLessThan(PERFORMANCE_THRESHOLDS.ERROR_RATE);
      expect(duration).toBeLessThan(30000); // Should complete within 30s
      
      console.log(`📊 Network stress test: ${duration}ms, Error rate: ${(errorRate * 100).toFixed(1)}%`);
    });
  });

  describe('Mixed Workload Performance', () => {
    test('should handle mixed API and cache operations efficiently', async () => {
      const startTime = Date.now();
      
      // Mix of different operations
      const operations = [
        // API calls
        oracleService.getSnapshot('bscMainnet'),
        oracleService.getHistoricalData('venus', '7d'),
        oracleService.getSnapshot('bscTestnet'),
        
        // Cache operations
        cacheManager.set('test:mixed:1', { data: 'test1' }, 60000),
        cacheManager.get('test:mixed:1'),
        cacheManager.set('test:mixed:2', { data: 'test2' }, 60000),
        
        // More API calls
        oracleService.getSnapshot('bscMainnet'),
        oracleService.getHistoricalData('beefy', '24h'),
        
        // Cache cleanup
        cacheManager.delete('test:mixed:1'),
        cacheManager.delete('test:mixed:2')
      ];
      
      const results = await Promise.all(operations);
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      
      expect(results).toHaveLength(operations.length);
      expect(duration).toBeLessThan(10000); // Should complete within 10s
      
      console.log(`⚡ Mixed workload completed in ${duration}ms`);
    });

    test('should maintain performance during sustained load', async () => {
      const testDuration = 30000; // 30 seconds
      const requestInterval = 100; // Request every 100ms
      const startTime = Date.now();
      
      const requests = [];
      let requestCount = 0;
      
      // Start sustained load
      const interval = setInterval(() => {
        if (Date.now() - startTime < testDuration) {
          requests.push(
            oracleService.getSnapshot('bscMainnet')
              .then(result => ({ success: true, result }))
              .catch(error => ({ success: false, error: error.message }))
          );
          requestCount++;
        } else {
          clearInterval(interval);
        }
      }, requestInterval);
      
      // Wait for test duration
      await new Promise(resolve => setTimeout(resolve, testDuration + 1000));
      
      // Wait for all requests to complete
      const results = await Promise.allSettled(requests);
      const endTime = Date.now();
      
      const totalDuration = endTime - startTime;
      const successful = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
      const failed = results.filter(r => r.status === 'rejected' || !r.value.success).length;
      
      const errorRate = failed / (successful + failed);
      
      expect(errorRate).toBeLessThan(PERFORMANCE_THRESHOLDS.ERROR_RATE);
      expect(totalDuration).toBeGreaterThan(testDuration);
      
      console.log(`📊 Sustained load test: ${requestCount} requests over ${totalDuration}ms`);
      console.log(`📊 Success: ${successful}, Failed: ${failed}, Error rate: ${(errorRate * 100).toFixed(1)}%`);
    });
  });

  describe('Performance Regression Detection', () => {
    test('should detect performance degradation', async () => {
      // Baseline performance measurement
      const baselineRequests = Array(10).fill().map(() => 
        oracleService.getSnapshot('bscMainnet')
      );
      
      const baselineStart = Date.now();
      await Promise.all(baselineRequests);
      const baselineDuration = Date.now() - baselineStart;
      const baselineAvg = baselineDuration / 10;
      
      console.log(`📊 Baseline: ${baselineAvg.toFixed(2)}ms per request`);
      
      // Simulate some load to potentially trigger degradation
      const loadRequests = Array(50).fill().map(() => 
        oracleService.getSnapshot('bscMainnet')
      );
      
      await Promise.all(loadRequests);
      
      // Measure performance after load
      const postLoadRequests = Array(10).fill().map(() => 
        oracleService.getSnapshot('bscMainnet')
      );
      
      const postLoadStart = Date.now();
      await Promise.all(postLoadRequests);
      const postLoadDuration = Date.now() - postLoadStart;
      const postLoadAvg = postLoadDuration / 10;
      
      console.log(`📊 Post-load: ${postLoadAvg.toFixed(2)}ms per request`);
      
      // Performance should not degrade significantly (within 50% of baseline)
      const degradationRatio = postLoadAvg / baselineAvg;
      expect(degradationRatio).toBeLessThan(1.5);
      
      console.log(`📊 Performance ratio: ${degradationRatio.toFixed(2)} (threshold: <1.5)`);
    });
  });
});
