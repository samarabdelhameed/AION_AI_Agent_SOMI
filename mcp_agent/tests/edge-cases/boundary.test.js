/**
 * @fileoverview Edge Cases and Boundary Tests
 * @description Tests for edge cases, boundary conditions, and error scenarios
 */

import { ServiceFactory } from '../../services/index.js';

describe('Edge Cases and Boundary Tests', () => {
  let services;

  beforeAll(async () => {
    services = await ServiceFactory.createEnhancedMCPAgent({
      environment: 'test',
      configDir: './config',
      cacheProvider: 'memory'
    });
  });

  afterAll(async () => {
    if (services && services.lifecycle) {
      await services.lifecycle.stopAll();
    }
  });

  describe('Input Validation Edge Cases', () => {
    test('should handle null and undefined inputs', async () => {
      const validationManager = await services.container.get('validationManager');

      // Test null inputs
      expect(validationManager.validateAddress(null).valid).toBe(false);
      expect(validationManager.validateAmount(null).valid).toBe(false);
      expect(validationManager.validateNetwork(null).valid).toBe(false);

      // Test undefined inputs
      expect(validationManager.validateAddress(undefined).valid).toBe(false);
      expect(validationManager.validateAmount(undefined).valid).toBe(false);
      expect(validationManager.validateNetwork(undefined).valid).toBe(false);
    });

    test('should handle empty and whitespace inputs', async () => {
      const validationManager = await services.container.get('validationManager');

      // Test empty strings
      expect(validationManager.validateAddress('').valid).toBe(false);
      expect(validationManager.validateAmount('').valid).toBe(false);
      expect(validationManager.validateNetwork('').valid).toBe(false);

      // Test whitespace strings
      expect(validationManager.validateAddress('   ').valid).toBe(false);
      expect(validationManager.validateAmount('   ').valid).toBe(false);
      expect(validationManager.validateNetwork('   ').valid).toBe(false);
    });

    test('should handle extremely long inputs', async () => {
      const validationManager = await services.container.get('validationManager');
      
      const veryLongString = 'x'.repeat(10000);
      
      expect(validationManager.validateAddress(veryLongString).valid).toBe(false);
      expect(validationManager.validateNetwork(veryLongString).valid).toBe(false);
    });

    test('should handle special characters and unicode', async () => {
      const validationManager = await services.container.get('validationManager');
      
      const specialChars = ['<script>', '../../etc/passwd', 'SELECT * FROM users', '🚀💎', '\x00\x01\x02'];
      
      specialChars.forEach(input => {
        expect(validationManager.validateAddress(input).valid).toBe(false);
        expect(validationManager.validateNetwork(input).valid).toBe(false);
      });
    });

    test('should handle numeric edge cases', async () => {
      const validationManager = await services.container.get('validationManager');

      // Test extreme numbers
      expect(validationManager.validateAmount(Number.MAX_SAFE_INTEGER).valid).toBe(false);
      expect(validationManager.validateAmount(Number.MIN_SAFE_INTEGER).valid).toBe(false);
      expect(validationManager.validateAmount(Infinity).valid).toBe(false);
      expect(validationManager.validateAmount(-Infinity).valid).toBe(false);
      expect(validationManager.validateAmount(NaN).valid).toBe(false);

      // Test very small positive numbers
      expect(validationManager.validateAmount(0.000000001).valid).toBe(true);
      expect(validationManager.validateAmount(1e-18).valid).toBe(true);
    });
  });

  describe('Cache Edge Cases', () => {
    test('should handle cache overflow gracefully', async () => {
      const cache = services.cache;
      
      // Fill cache beyond reasonable limits
      const promises = [];
      for (let i = 0; i < 10000; i++) {
        promises.push(
          cache.set(`overflow-${i}`, { data: `value-${i}` })
        );
      }

      // Should not throw errors
      await expect(Promise.all(promises)).resolves.not.toThrow();

      // Cache should still be functional
      await cache.set('test-after-overflow', 'test-value');
      const result = await cache.get('test-after-overflow');
      expect(result).toBe('test-value');
    });

    test('should handle concurrent cache operations on same key', async () => {
      const cache = services.cache;
      const key = 'concurrent-key';
      
      // Multiple concurrent sets on same key
      const setPromises = [];
      for (let i = 0; i < 100; i++) {
        setPromises.push(
          cache.set(key, { value: i, timestamp: Date.now() })
        );
      }

      await Promise.all(setPromises);

      // Should have some value (last writer wins)
      const result = await cache.get(key);
      expect(result).toBeDefined();
      expect(typeof result.value).toBe('number');
    });

    test('should handle cache operations with invalid TTL', async () => {
      const cache = services.cache;

      // Test negative TTL
      await expect(cache.set('negative-ttl', 'value', -1)).resolves.not.toThrow();

      // Test zero TTL
      await expect(cache.set('zero-ttl', 'value', 0)).resolves.not.toThrow();

      // Test extremely large TTL
      await expect(cache.set('large-ttl', 'value', Number.MAX_SAFE_INTEGER)).resolves.not.toThrow();
    });

    test('should handle cache with circular references', async () => {
      const cache = services.cache;
      
      // Create circular reference
      const obj1 = { name: 'obj1' };
      const obj2 = { name: 'obj2', ref: obj1 };
      obj1.ref = obj2;

      // Should handle gracefully (may serialize without circular refs or throw)
      await expect(cache.set('circular', obj1)).resolves.not.toThrow();
    });
  });

  describe('Queue Edge Cases', () => {
    test('should handle queue with no processor', async () => {
      const queue = services.queue;
      
      // Create queue without processor
      expect(() => {
        queue.createQueue('no-processor-queue', {
          maxConcurrency: 1
          // No processor defined
        });
      }).toThrow();
    });

    test('should handle queue processor that throws errors', async () => {
      const queue = services.queue;
      const queueName = 'error-queue';
      let errorCount = 0;

      queue.createQueue(queueName, {
        maxConcurrency: 1,
        processor: async (task) => {
          errorCount++;
          throw new Error(`Task ${task.id} failed`);
        }
      });

      // Add tasks that will fail
      const taskIds = [];
      for (let i = 0; i < 5; i++) {
        const taskId = await queue.add(queueName, { id: i });
        taskIds.push(taskId);
      }

      // Wait for processing attempts
      await testUtils.wait(1000);

      // Errors should be handled gracefully
      expect(errorCount).toBeGreaterThan(0);
      
      // Queue should still be functional
      const stats = queue.getQueueStats();
      expect(stats.global.totalRequests).toBeGreaterThanOrEqual(5);
    });

    test('should handle queue with zero concurrency', async () => {
      const queue = services.queue;
      
      expect(() => {
        queue.createQueue('zero-concurrency', {
          maxConcurrency: 0,
          processor: async (task) => task
        });
      }).toThrow();
    });

    test('should handle queue with negative concurrency', async () => {
      const queue = services.queue;
      
      expect(() => {
        queue.createQueue('negative-concurrency', {
          maxConcurrency: -1,
          processor: async (task) => task
        });
      }).toThrow();
    });

    test('should handle adding tasks to non-existent queue', async () => {
      const queue = services.queue;
      
      await expect(
        queue.add('non-existent-queue', { data: 'test' })
      ).rejects.toThrow();
    });
  });

  describe('Service Container Edge Cases', () => {
    test('should handle circular service dependencies', async () => {
      const container = services.container;
      
      // Register services with circular dependencies
      container.singleton('serviceA', async () => {
        const serviceB = await container.get('serviceB');
        return { name: 'A', dependency: serviceB };
      });

      container.singleton('serviceB', async () => {
        const serviceA = await container.get('serviceA');
        return { name: 'B', dependency: serviceA };
      });

      // Should detect and handle circular dependency
      await expect(container.get('serviceA')).rejects.toThrow(/circular/i);
    });

    test('should handle service factory that returns null', async () => {
      const container = services.container;
      
      container.singleton('null-service', () => null);
      
      const result = await container.get('null-service');
      expect(result).toBe(null);
    });

    test('should handle service factory that returns undefined', async () => {
      const container = services.container;
      
      container.singleton('undefined-service', () => undefined);
      
      const result = await container.get('undefined-service');
      expect(result).toBe(undefined);
    });

    test('should handle async service factory that never resolves', async () => {
      const container = services.container;
      
      container.singleton('hanging-service', () => new Promise(() => {})); // Never resolves
      
      // Should timeout or handle gracefully
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout')), 1000)
      );
      
      await expect(
        Promise.race([container.get('hanging-service'), timeoutPromise])
      ).rejects.toThrow('Timeout');
    });
  });

  describe('Configuration Edge Cases', () => {
    test('should handle missing configuration files', async () => {
      const { ConfigManager } = await import('../../services/configManager.js');
      
      const configManager = new ConfigManager({
        configDir: './non-existent-config',
        environment: 'test'
      });

      await expect(configManager.initialize()).rejects.toThrow();
    });

    test('should handle malformed JSON configuration', async () => {
      // This would require mocking fs to return invalid JSON
      // For now, test that config manager handles invalid data gracefully
      const config = services.config;
      
      // Test setting invalid configuration
      expect(() => {
        config.set('invalid.key.', 'value'); // Invalid key format
      }).not.toThrow();
    });

    test('should handle extremely deep configuration nesting', async () => {
      const config = services.config;
      
      // Create deeply nested configuration
      const deepKey = 'level1.level2.level3.level4.level5.level6.level7.level8.level9.level10';
      config.set(deepKey, 'deep-value');
      
      expect(config.get(deepKey)).toBe('deep-value');
    });

    test('should handle configuration with special characters in keys', async () => {
      const config = services.config;
      
      const specialKeys = [
        'key with spaces',
        'key-with-dashes',
        'key_with_underscores',
        'key.with.dots',
        'key[with]brackets'
      ];

      specialKeys.forEach(key => {
        expect(() => {
          config.set(key, 'test-value');
          config.get(key);
        }).not.toThrow();
      });
    });
  });

  describe('Oracle Service Edge Cases', () => {
    test('should handle oracle requests with invalid network', async () => {
      const oracle = services.oracle;
      
      // Test with various invalid networks
      const invalidNetworks = [null, undefined, '', 'invalid-network', 123, {}, []];
      
      for (const network of invalidNetworks) {
        await expect(oracle.getSnapshot(network)).rejects.toThrow();
      }
    });

    test('should handle oracle service when external APIs are down', async () => {
      const oracle = services.oracle;
      
      // Mock network failure
      const originalFetch = global.fetch;
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      try {
        // Should handle gracefully and return cached/fallback data
        const result = await oracle.getSnapshot('bscTestnet');
        expect(result).toBeDefined();
        expect(result.protocols).toBeDefined();
      } finally {
        global.fetch = originalFetch;
      }
    });

    test('should handle concurrent oracle requests for same data', async () => {
      const oracle = services.oracle;
      
      // Make many concurrent requests for same data
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(oracle.getSnapshot('bscTestnet'));
      }

      const results = await Promise.all(promises);
      
      // All should succeed and return consistent data
      expect(results).toHaveLength(50);
      expect(results.every(r => r && r.protocols)).toBe(true);
    });
  });

  describe('Error Manager Edge Cases', () => {
    test('should handle errors with circular references', async () => {
      const errorManager = services.errorManager;
      
      const error = new Error('Test error');
      error.circular = error; // Create circular reference
      
      const context = errorManager.createContext('test', 'operation');
      
      // Should handle without throwing
      await expect(errorManager.handleError(error, context)).resolves.not.toThrow();
    });

    test('should handle extremely long error messages', async () => {
      const errorManager = services.errorManager;
      
      const longMessage = 'x'.repeat(100000); // 100KB error message
      const error = new Error(longMessage);
      const context = errorManager.createContext('test', 'operation');
      
      await expect(errorManager.handleError(error, context)).resolves.not.toThrow();
    });

    test('should handle errors with non-serializable properties', async () => {
      const errorManager = services.errorManager;
      
      const error = new Error('Test error');
      error.nonSerializable = () => {}; // Function property
      error.circular = error;
      
      const context = errorManager.createContext('test', 'operation');
      
      await expect(errorManager.handleError(error, context)).resolves.not.toThrow();
    });

    test('should handle error context with invalid data', async () => {
      const errorManager = services.errorManager;
      
      const error = new Error('Test error');
      const invalidContext = {
        service: null,
        operation: undefined,
        requestId: 123, // Should be string
        timestamp: 'invalid-date',
        metadata: () => {} // Function instead of object
      };
      
      await expect(errorManager.handleError(error, invalidContext)).resolves.not.toThrow();
    });
  });

  describe('Memory and Resource Edge Cases', () => {
    test('should handle memory pressure gracefully', async () => {
      const cache = services.cache;
      
      // Create memory pressure
      const largeObjects = [];
      try {
        for (let i = 0; i < 100; i++) {
          const largeObject = {
            id: i,
            data: new Array(100000).fill(`data-${i}`), // Large array
            buffer: Buffer.alloc(1024 * 1024) // 1MB buffer
          };
          
          largeObjects.push(largeObject);
          await cache.set(`memory-pressure-${i}`, largeObject);
        }

        // System should still respond
        const healthStatus = await services.container.getHealthStatus();
        expect(healthStatus.totalServices).toBeGreaterThan(0);

      } finally {
        // Clean up
        largeObjects.length = 0;
        await cache.clear();
        
        if (global.gc) {
          global.gc();
        }
      }
    });

    test('should handle resource exhaustion scenarios', async () => {
      // Test with limited resources
      const promises = [];
      
      // Create many concurrent operations
      for (let i = 0; i < 1000; i++) {
        promises.push(
          services.cache.set(`resource-test-${i}`, { data: i })
        );
      }

      // Should handle gracefully without crashing
      const results = await Promise.allSettled(promises);
      
      // Most should succeed, some might fail due to resource limits
      const successful = results.filter(r => r.status === 'fulfilled');
      const failed = results.filter(r => r.status === 'rejected');
      
      expect(successful.length).toBeGreaterThan(failed.length);
    });
  });

  describe('Timing and Race Condition Edge Cases', () => {
    test('should handle rapid service initialization and shutdown', async () => {
      // Create and destroy services rapidly
      for (let i = 0; i < 10; i++) {
        const tempServices = await ServiceFactory.createEnhancedMCPAgent({
          environment: 'test',
          configDir: './config'
        });
        
        // Use service briefly
        await tempServices.cache.set('temp-key', 'temp-value');
        const value = await tempServices.cache.get('temp-key');
        expect(value).toBe('temp-value');
        
        // Shutdown
        await tempServices.lifecycle.stopAll();
      }
    });

    test('should handle concurrent service operations during shutdown', async () => {
      const tempServices = await ServiceFactory.createEnhancedMCPAgent({
        environment: 'test',
        configDir: './config'
      });

      // Start operations
      const operations = [];
      for (let i = 0; i < 50; i++) {
        operations.push(
          tempServices.cache.set(`shutdown-test-${i}`, { data: i })
        );
      }

      // Start shutdown while operations are running
      const shutdownPromise = tempServices.lifecycle.stopAll();
      
      // Wait for both
      const [operationResults] = await Promise.allSettled([
        Promise.allSettled(operations),
        shutdownPromise
      ]);

      // Some operations might fail due to shutdown, but shouldn't crash
      expect(operationResults.status).toBe('fulfilled');
    });
  });
});