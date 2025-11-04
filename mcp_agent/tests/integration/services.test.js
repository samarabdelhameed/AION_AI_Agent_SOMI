/**
 * @fileoverview Services Integration Tests
 * @description Tests for service interactions and dependencies
 */

import { ServiceFactory } from '../../services/index.js';

describe('Services Integration Tests', () => {
  let services;

  beforeAll(async () => {
    services = await ServiceFactory.createEnhancedMCPAgent({
      environment: 'test',
      configDir: './config',
      cacheProvider: 'memory',
      maxConnections: 5
    });
  });

  afterAll(async () => {
    if (services && services.lifecycle) {
      await services.lifecycle.stopAll();
    }
  });

  describe('Service Factory', () => {
    test('should create all required services', () => {
      expect(services).toHaveProperty('container');
      expect(services).toHaveProperty('config');
      expect(services).toHaveProperty('cache');
      expect(services).toHaveProperty('connectionPool');
      expect(services).toHaveProperty('queue');
      expect(services).toHaveProperty('errorManager');
      expect(services).toHaveProperty('oracle');
      expect(services).toHaveProperty('gasOptimizer');
      expect(services).toHaveProperty('retryManager');
      expect(services).toHaveProperty('lifecycle');
    });

    test('should register services in container', async () => {
      const containerServices = services.container.listServices();
      
      expect(containerServices).toContain('config');
      expect(containerServices).toContain('cache');
      expect(containerServices).toContain('connectionPool');
      expect(containerServices).toContain('queue');
      expect(containerServices).toContain('errorManager');
      expect(containerServices).toContain('oracle');
      expect(containerServices).toContain('gasOptimizer');
      expect(containerServices).toContain('retryManager');
      expect(containerServices).toContain('lifecycle');
    });

    test('should resolve services from container', async () => {
      const config = await services.container.get('config');
      const cache = await services.container.get('cache');
      const oracle = await services.container.get('oracle');

      expect(config).toBe(services.config);
      expect(cache).toBe(services.cache);
      expect(oracle).toBe(services.oracle);
    });
  });

  describe('Configuration Integration', () => {
    test('should load configuration successfully', () => {
      expect(services.config.get('server.port')).toBeDefined();
      expect(services.config.get('database.name')).toBeDefined();
    });

    test('should provide configuration to other services', async () => {
      const configFromContainer = await services.container.get('config');
      
      expect(configFromContainer.get('server.port')).toBe(services.config.get('server.port'));
    });

    test('should validate configuration', () => {
      const stats = services.config.getStats();
      expect(stats.totalKeys).toBeGreaterThan(0);
    });
  });

  describe('Cache Integration', () => {
    test('should cache and retrieve data', async () => {
      const testKey = 'integration-test-key';
      const testData = { message: 'integration test', timestamp: Date.now() };

      await services.cache.set(testKey, testData);
      const retrieved = await services.cache.get(testKey);

      expect(retrieved).toEqual(testData);
    });

    test('should support cache-aside pattern', async () => {
      const computedKey = 'computed-integration-test';
      let computationCalled = false;

      const result = await services.cache.getOrSet(computedKey, async () => {
        computationCalled = true;
        return { computed: true, value: 'test-result' };
      });

      expect(computationCalled).toBe(true);
      expect(result.computed).toBe(true);

      // Second call should use cache
      computationCalled = false;
      const cachedResult = await services.cache.getOrSet(computedKey, async () => {
        computationCalled = true;
        return { computed: true, value: 'different-result' };
      });

      expect(computationCalled).toBe(false);
      expect(cachedResult).toEqual(result);
    });

    test('should provide cache statistics', () => {
      const stats = services.cache.getStats();
      
      expect(stats).toHaveProperty('hits');
      expect(stats).toHaveProperty('misses');
      expect(stats).toHaveProperty('cacheSize');
      expect(stats).toHaveProperty('hitRate');
    });
  });

  describe('Queue Integration', () => {
    test('should create and process queues', async () => {
      const queueName = 'integration-test-queue';
      let processedTasks = [];

      services.queue.createQueue(queueName, {
        maxConcurrency: 2,
        processor: async (task) => {
          processedTasks.push(task);
          return { processed: true, task };
        }
      });

      // Add tasks
      const taskIds = [];
      for (let i = 0; i < 3; i++) {
        const taskId = await services.queue.add(queueName, { id: i, data: `task-${i}` });
        taskIds.push(taskId);
      }

      // Wait for processing
      await testUtils.wait(500);

      expect(processedTasks).toHaveLength(3);
      expect(processedTasks.map(t => t.id)).toEqual([0, 1, 2]);
    });

    test('should provide queue statistics', () => {
      const stats = services.queue.getQueueStats();
      
      expect(stats).toHaveProperty('global');
      expect(stats.global).toHaveProperty('totalRequests');
      expect(stats.global).toHaveProperty('completedRequests');
    });
  });

  describe('Oracle Integration', () => {
    test('should provide oracle snapshot', async () => {
      const snapshot = await services.oracle.getSnapshot('bscTestnet');
      
      expect(snapshot).toHaveProperty('protocols');
      expect(snapshot).toHaveProperty('last_updated'); // The actual property name
      expect(typeof snapshot.protocols).toBe('object');
    });

    test('should provide health status', async () => {
      const healthStatus = await services.oracle.getHealthStatus();
      
      expect(healthStatus).toHaveProperty('healthScore');
      expect(healthStatus).toHaveProperty('totalSources');
      expect(healthStatus).toHaveProperty('workingSources');
      expect(typeof healthStatus.healthScore).toBe('number');
    });

    test('should provide metrics', async () => {
      const metrics = await services.oracle.getMetrics();
      
      expect(metrics).toHaveProperty('uptime');
      expect(metrics).toHaveProperty('timestamp'); // The actual property name
      expect(typeof metrics.uptime).toBe('number');
    });
  });

  describe('Error Manager Integration', () => {
    test('should handle errors across services', async () => {
      const context = services.errorManager.createContext('integration-test', 'test-operation');
      const testError = new Error('Integration test error');

      await services.errorManager.handleError(testError, context);

      const stats = services.errorManager.getErrorStats();
      expect(stats.totalErrors).toBeGreaterThan(0);
      expect(stats.errorsByOperation['integration-test']).toBe(1);
    });

    test('should create error responses', () => {
      const context = services.errorManager.createContext('test', 'operation');
      const error = new Error('Test error');
      
      const response = services.errorManager.createErrorResponse(error, context);
      
      expect(response).toHaveProperty('success', false);
      expect(response).toHaveProperty('error');
      expect(response).toHaveProperty('statusCode');
    });
  });

  describe('Lifecycle Management', () => {
    test('should provide system health status', async () => {
      const healthStatus = await services.lifecycle.getHealthStatus();
      
      expect(healthStatus).toHaveProperty('overall');
      expect(healthStatus).toHaveProperty('totalServices');
      expect(healthStatus).toHaveProperty('healthyServices');
      expect(healthStatus).toHaveProperty('services');
      expect(healthStatus.overall).toMatch(/healthy|degraded|unhealthy/);
    });

    test('should provide system metrics', () => {
      const metrics = services.lifecycle.getMetrics();
      
      expect(metrics).toHaveProperty('uptime');
      expect(metrics).toHaveProperty('startTime');
      expect(typeof metrics.uptime).toBe('number');
    });

    test('should manage service lifecycle', async () => {
      // Test service registration
      services.lifecycle.registerService('test-service', {
        priority: 10,
        essential: false,
        healthCheck: () => ({ healthy: true, message: 'Test service OK' })
      });

      const healthStatus = await services.lifecycle.getHealthStatus();
      expect(healthStatus).toHaveProperty('services');
      expect(typeof healthStatus.services).toBe('object');
    });
  });

  describe('Service Dependencies', () => {
    test('should resolve service dependencies correctly', async () => {
      // Gas optimizer depends on connection pool
      expect(services.gasOptimizer).toBeDefined();
      expect(services.connectionPool).toBeDefined();

      // Retry manager depends on connection pool and gas optimizer
      expect(services.retryManager).toBeDefined();

      // Oracle service depends on error manager
      expect(services.oracle).toBeDefined();
      expect(services.errorManager).toBeDefined();
    });

    test('should handle service interactions', async () => {
      // Test cache and oracle interaction
      const cacheKey = 'oracle-test-data';
      const testData = { protocols: { venus: { apy: 5.5 } } };

      await services.cache.set(cacheKey, testData);
      const cachedData = await services.cache.get(cacheKey);

      expect(cachedData).toEqual(testData);

      // Test error manager and oracle interaction
      const context = services.errorManager.createContext('oracle', 'fetchData');
      expect(context.operation).toBe('oracle');
    });
  });

  describe('Performance Integration', () => {
    test('should handle concurrent operations', async () => {
      const operations = [];

      // Concurrent cache operations
      for (let i = 0; i < 10; i++) {
        operations.push(
          services.cache.set(`concurrent-${i}`, { value: i })
        );
      }

      // Concurrent oracle requests
      for (let i = 0; i < 5; i++) {
        operations.push(
          services.oracle.getSnapshot('bscTestnet')
        );
      }

      // All operations should complete without errors
      const results = await Promise.allSettled(operations);
      const failures = results.filter(r => r.status === 'rejected');
      
      expect(failures.length).toBe(0);
    });

    test('should maintain performance under load', async () => {
      const startTime = Date.now();
      const operations = [];

      // Create load
      for (let i = 0; i < 50; i++) {
        operations.push(
          services.cache.getOrSet(`load-test-${i}`, async () => {
            await testUtils.wait(10); // Simulate work
            return { computed: true, value: i };
          })
        );
      }

      await Promise.all(operations);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(5000); // 5 seconds
    });
  });

  describe('Error Recovery Integration', () => {
    test('should recover from service failures', async () => {
      // Simulate service failure and recovery
      const originalMethod = services.oracle.getSnapshot;
      let failureCount = 0;

      services.oracle.getSnapshot = async (network) => {
        failureCount++;
        if (failureCount <= 2) {
          throw new Error('Simulated service failure');
        }
        return originalMethod.call(services.oracle, network);
      };

      // Should eventually succeed after failures
      let result;
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          result = await services.oracle.getSnapshot('bscTestnet');
          break;
        } catch (error) {
          if (attempt === 4) throw error;
          await testUtils.wait(100);
        }
      }

      expect(result).toBeDefined();
      expect(result.protocols).toBeDefined();

      // Restore original method
      services.oracle.getSnapshot = originalMethod;
    });
  });

  describe('Resource Management', () => {
    test('should manage resources efficiently', async () => {
      const initialStats = services.cache.getStats();
      
      // Create and clean up resources
      for (let i = 0; i < 100; i++) {
        await services.cache.set(`resource-test-${i}`, { data: 'test' });
      }

      const afterCreationStats = services.cache.getStats();
      expect(afterCreationStats.cacheSize).toBeGreaterThan(initialStats.cacheSize);

      // Clear cache
      await services.cache.clear();
      
      const afterClearStats = services.cache.getStats();
      expect(afterClearStats.cacheSize).toBe(0);
    });
  });
});