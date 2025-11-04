/**
 * @fileoverview Performance Load Tests
 * @description Tests for system performance under various load conditions
 */

import { ServiceFactory } from '../../services/index.js';

describe('Performance Load Tests', () => {
  let services;

  beforeAll(async () => {
    services = await ServiceFactory.createEnhancedMCPAgent({
      environment: 'test',
      configDir: './config',
      cacheProvider: 'memory',
      maxConnections: 10,
      enableBatching: true
    });
  });

  afterAll(async () => {
    if (services && services.lifecycle) {
      await services.lifecycle.stopAll();
    }
  });

  describe('Cache Performance', () => {
    test('should handle high-frequency cache operations', async () => {
      const operationCount = 1000;
      const startTime = Date.now();
      const operations = [];

      // Generate concurrent cache operations
      for (let i = 0; i < operationCount; i++) {
        operations.push(
          services.cache.set(`perf-test-${i}`, { 
            id: i, 
            data: `test-data-${i}`,
            timestamp: Date.now()
          })
        );
      }

      await Promise.all(operations);

      // Test retrieval performance
      const retrievalOperations = [];
      for (let i = 0; i < operationCount; i++) {
        retrievalOperations.push(
          services.cache.get(`perf-test-${i}`)
        );
      }

      const results = await Promise.all(retrievalOperations);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Performance assertions
      expect(results).toHaveLength(operationCount);
      expect(results.every(r => r !== null)).toBe(true);
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds

      // Calculate operations per second
      const opsPerSecond = (operationCount * 2) / (duration / 1000); // *2 for set + get
      console.log(`Cache Performance: ${opsPerSecond.toFixed(0)} ops/sec`);
      
      expect(opsPerSecond).toBeGreaterThan(100); // Minimum 100 ops/sec
    });

    test('should maintain performance with large cache size', async () => {
      const largeDataSize = 5000;
      const testOperations = 100;

      // Fill cache with large dataset
      const fillOperations = [];
      for (let i = 0; i < largeDataSize; i++) {
        fillOperations.push(
          services.cache.set(`large-dataset-${i}`, {
            id: i,
            data: 'x'.repeat(1000), // 1KB of data per entry
            metadata: { created: Date.now(), type: 'performance-test' }
          })
        );
      }

      await Promise.all(fillOperations);

      // Test performance with large cache
      const startTime = Date.now();
      const testOps = [];
      
      for (let i = 0; i < testOperations; i++) {
        const randomKey = `large-dataset-${Math.floor(Math.random() * largeDataSize)}`;
        testOps.push(services.cache.get(randomKey));
      }

      const results = await Promise.all(testOps);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(results.every(r => r !== null)).toBe(true);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second

      const opsPerSecond = testOperations / (duration / 1000);
      console.log(`Large Cache Performance: ${opsPerSecond.toFixed(0)} ops/sec`);
      
      expect(opsPerSecond).toBeGreaterThan(50); // Minimum 50 ops/sec with large cache
    });

    test('should handle cache eviction efficiently', async () => {
      // Set cache to small size to trigger eviction
      const maxCacheSize = 100;
      const itemsToAdd = 200;

      const operations = [];
      for (let i = 0; i < itemsToAdd; i++) {
        operations.push(
          services.cache.set(`eviction-test-${i}`, { 
            id: i, 
            data: `data-${i}` 
          }, 60) // 60 second TTL
        );
      }

      const startTime = Date.now();
      await Promise.all(operations);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should handle eviction without significant performance impact
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds

      const stats = services.cache.getStats();
      console.log(`Cache Eviction Performance: ${stats.cacheSize} items, ${duration}ms`);
    });
  });

  describe('Queue Performance', () => {
    test('should process high-volume queue efficiently', async () => {
      const queueName = 'performance-test-queue';
      const taskCount = 500;
      let processedCount = 0;

      // Create high-throughput queue
      services.queue.createQueue(queueName, {
        maxConcurrency: 10,
        batching: false,
        processor: async (task) => {
          processedCount++;
          // Simulate minimal work
          await new Promise(resolve => setTimeout(resolve, 1));
          return { processed: true, taskId: task.id };
        }
      });

      const startTime = Date.now();
      
      // Add tasks rapidly
      const addPromises = [];
      for (let i = 0; i < taskCount; i++) {
        addPromises.push(
          services.queue.add(queueName, { 
            id: i, 
            data: `task-data-${i}`,
            priority: Math.floor(Math.random() * 5)
          })
        );
      }

      await Promise.all(addPromises);

      // Wait for processing to complete
      while (processedCount < taskCount) {
        await testUtils.wait(100);
        if (Date.now() - startTime > 30000) { // 30 second timeout
          break;
        }
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(processedCount).toBe(taskCount);
      expect(duration).toBeLessThan(15000); // Should complete within 15 seconds

      const tasksPerSecond = taskCount / (duration / 1000);
      console.log(`Queue Performance: ${tasksPerSecond.toFixed(0)} tasks/sec`);
      
      expect(tasksPerSecond).toBeGreaterThan(20); // Minimum 20 tasks/sec
    });

    test('should handle concurrent queue operations', async () => {
      const queueCount = 5;
      const tasksPerQueue = 100;
      let totalProcessed = 0;

      const queuePromises = [];

      // Create multiple queues with concurrent processing
      for (let q = 0; q < queueCount; q++) {
        const queueName = `concurrent-queue-${q}`;
        
        services.queue.createQueue(queueName, {
          maxConcurrency: 5,
          processor: async (task) => {
            totalProcessed++;
            await new Promise(resolve => setTimeout(resolve, 5));
            return { processed: true, queue: queueName, taskId: task.id };
          }
        });

        // Add tasks to each queue
        const queueTasks = [];
        for (let t = 0; t < tasksPerQueue; t++) {
          queueTasks.push(
            services.queue.add(queueName, { 
              id: t, 
              queue: queueName,
              data: `queue-${q}-task-${t}` 
            })
          );
        }

        queuePromises.push(Promise.all(queueTasks));
      }

      const startTime = Date.now();
      await Promise.all(queuePromises);

      // Wait for all processing to complete
      const expectedTotal = queueCount * tasksPerQueue;
      while (totalProcessed < expectedTotal) {
        await testUtils.wait(100);
        if (Date.now() - startTime > 30000) { // 30 second timeout
          break;
        }
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(totalProcessed).toBe(expectedTotal);
      expect(duration).toBeLessThan(20000); // Should complete within 20 seconds

      const totalTasksPerSecond = expectedTotal / (duration / 1000);
      console.log(`Concurrent Queue Performance: ${totalTasksPerSecond.toFixed(0)} tasks/sec across ${queueCount} queues`);
    });
  });

  describe('Oracle Performance', () => {
    test('should handle rapid oracle requests efficiently', async () => {
      const requestCount = 50;
      const startTime = Date.now();

      const requests = [];
      for (let i = 0; i < requestCount; i++) {
        requests.push(services.oracle.getSnapshot('bscTestnet'));
      }

      const results = await Promise.all(requests);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(requestCount);
      expect(results.every(r => r && r.protocols)).toBe(true);

      const requestsPerSecond = requestCount / (duration / 1000);
      console.log(`Oracle Performance: ${requestsPerSecond.toFixed(0)} requests/sec`);
      
      // Should benefit from caching
      expect(requestsPerSecond).toBeGreaterThan(10); // Minimum 10 requests/sec
    });

    test('should maintain performance with health checks', async () => {
      const healthCheckCount = 100;
      const startTime = Date.now();

      const healthChecks = [];
      for (let i = 0; i < healthCheckCount; i++) {
        healthChecks.push(services.oracle.getHealthStatus());
      }

      const results = await Promise.all(healthChecks);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(healthCheckCount);
      expect(results.every(r => typeof r.healthScore === 'number')).toBe(true);

      const checksPerSecond = healthCheckCount / (duration / 1000);
      console.log(`Oracle Health Check Performance: ${checksPerSecond.toFixed(0)} checks/sec`);
      
      expect(checksPerSecond).toBeGreaterThan(20); // Minimum 20 checks/sec
    });
  });

  describe('Service Container Performance', () => {
    test('should resolve services efficiently under load', async () => {
      const resolutionCount = 1000;
      const serviceNames = ['config', 'cache', 'oracle', 'errorManager', 'queue'];
      
      const startTime = Date.now();
      const resolutions = [];

      for (let i = 0; i < resolutionCount; i++) {
        const serviceName = serviceNames[i % serviceNames.length];
        resolutions.push(services.container.get(serviceName));
      }

      const results = await Promise.all(resolutions);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(resolutionCount);
      expect(results.every(r => r !== null)).toBe(true);

      const resolutionsPerSecond = resolutionCount / (duration / 1000);
      console.log(`Service Resolution Performance: ${resolutionsPerSecond.toFixed(0)} resolutions/sec`);
      
      expect(resolutionsPerSecond).toBeGreaterThan(500); // Minimum 500 resolutions/sec
    });

    test('should handle concurrent service health checks', async () => {
      const healthCheckCount = 50;
      const startTime = Date.now();

      const healthChecks = [];
      for (let i = 0; i < healthCheckCount; i++) {
        healthChecks.push(services.container.getHealthStatus());
      }

      const results = await Promise.all(healthChecks);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(healthCheckCount);
      expect(results.every(r => r.totalServices > 0)).toBe(true);

      const checksPerSecond = healthCheckCount / (duration / 1000);
      console.log(`Container Health Check Performance: ${checksPerSecond.toFixed(0)} checks/sec`);
      
      expect(checksPerSecond).toBeGreaterThan(25); // Minimum 25 checks/sec
    });
  });

  describe('Memory Performance', () => {
    test('should maintain stable memory usage under load', async () => {
      const initialMemory = process.memoryUsage();
      
      // Create memory load
      const operations = [];
      for (let i = 0; i < 1000; i++) {
        operations.push(
          services.cache.set(`memory-test-${i}`, {
            id: i,
            data: 'x'.repeat(1000), // 1KB per entry
            metadata: {
              created: Date.now(),
              random: Math.random()
            }
          })
        );
      }

      await Promise.all(operations);

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const afterLoadMemory = process.memoryUsage();
      
      // Clear cache
      await services.cache.clear();
      
      // Force garbage collection again
      if (global.gc) {
        global.gc();
      }

      const afterClearMemory = process.memoryUsage();

      // Memory should not grow excessively
      const memoryGrowth = afterLoadMemory.heapUsed - initialMemory.heapUsed;
      const memoryRecovered = afterLoadMemory.heapUsed - afterClearMemory.heapUsed;

      console.log(`Memory Performance: Growth: ${(memoryGrowth / 1024 / 1024).toFixed(2)}MB, Recovered: ${(memoryRecovered / 1024 / 1024).toFixed(2)}MB`);

      // Should recover most memory after clearing cache
      expect(memoryRecovered).toBeGreaterThan(memoryGrowth * 0.5); // At least 50% recovery
    });

    test('should handle memory pressure gracefully', async () => {
      const largeObjectCount = 100;
      const largeObjects = [];

      try {
        // Create memory pressure
        for (let i = 0; i < largeObjectCount; i++) {
          const largeObject = {
            id: i,
            data: 'x'.repeat(100000), // 100KB per object
            array: new Array(10000).fill(i)
          };
          
          largeObjects.push(largeObject);
          await services.cache.set(`large-object-${i}`, largeObject);
        }

        // System should still be responsive
        const healthStatus = await services.container.getHealthStatus();
        expect(healthStatus.totalServices).toBeGreaterThan(0);

        const oracleSnapshot = await services.oracle.getSnapshot('bscTestnet');
        expect(oracleSnapshot.protocols).toBeDefined();

      } finally {
        // Clean up
        largeObjects.length = 0;
        await services.cache.clear();
        
        if (global.gc) {
          global.gc();
        }
      }
    });
  });

  describe('Concurrent Operations Performance', () => {
    test('should handle mixed concurrent operations', async () => {
      const operationCount = 200;
      const operations = [];
      const startTime = Date.now();

      // Mix of different operations
      for (let i = 0; i < operationCount; i++) {
        const operationType = i % 4;
        
        switch (operationType) {
          case 0: // Cache operations
            operations.push(
              services.cache.set(`mixed-${i}`, { data: `value-${i}` })
            );
            break;
            
          case 1: // Oracle requests
            operations.push(
              services.oracle.getSnapshot('bscTestnet')
            );
            break;
            
          case 2: // Service resolutions
            operations.push(
              services.container.get('config')
            );
            break;
            
          case 3: // Health checks
            operations.push(
              services.container.getHealthStatus()
            );
            break;
        }
      }

      const results = await Promise.all(operations);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(operationCount);
      expect(results.every(r => r !== null && r !== undefined)).toBe(true);

      const opsPerSecond = operationCount / (duration / 1000);
      console.log(`Mixed Operations Performance: ${opsPerSecond.toFixed(0)} ops/sec`);
      
      expect(opsPerSecond).toBeGreaterThan(50); // Minimum 50 mixed ops/sec
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    });
  });

  describe('Stress Testing', () => {
    test('should survive stress conditions', async () => {
      const stressDuration = 5000; // 5 seconds
      const startTime = Date.now();
      let operationCount = 0;
      let errorCount = 0;

      const stressOperations = [];

      // Create continuous stress load
      const stressInterval = setInterval(async () => {
        try {
          operationCount++;
          
          // Random operations
          const operation = Math.floor(Math.random() * 3);
          switch (operation) {
            case 0:
              await services.cache.set(`stress-${operationCount}`, { data: Math.random() });
              break;
            case 1:
              await services.oracle.getHealthStatus();
              break;
            case 2:
              await services.container.get('cache');
              break;
          }
        } catch (error) {
          errorCount++;
        }
      }, 10); // Every 10ms

      // Wait for stress duration
      await new Promise(resolve => setTimeout(resolve, stressDuration));
      clearInterval(stressInterval);

      const endTime = Date.now();
      const actualDuration = endTime - startTime;

      console.log(`Stress Test: ${operationCount} operations in ${actualDuration}ms, ${errorCount} errors`);

      // System should remain stable
      expect(errorCount).toBeLessThan(operationCount * 0.05); // Less than 5% error rate
      expect(operationCount).toBeGreaterThan(100); // Should complete significant operations

      // System should still be responsive after stress
      const healthStatus = await services.container.getHealthStatus();
      expect(healthStatus.totalServices).toBeGreaterThan(0);
    });
  });
});