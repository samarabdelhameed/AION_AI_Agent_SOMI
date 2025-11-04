/**
 * @fileoverview Service Container Unit Tests
 * @description Comprehensive tests for dependency injection container
 */

import ServiceContainer from '../../../services/serviceContainer.js';

describe('ServiceContainer', () => {
  let container;

  beforeEach(() => {
    container = new ServiceContainer();
  });

  describe('Constructor', () => {
    test('should initialize empty container', () => {
      expect(container).toBeInstanceOf(ServiceContainer);
      expect(container.listServices()).toHaveLength(0);
    });
  });

  describe('Service Registration', () => {
    test('should register singleton services', () => {
      const mockService = { name: 'testService' };
      container.singleton('test', () => mockService);

      expect(container.listServices()).toContain('test');
      expect(container.has('test')).toBe(true);
    });

    test('should register transient services', () => {
      const mockFactory = () => ({ id: Math.random() });
      container.transient('test', mockFactory);

      expect(container.listServices()).toContain('test');
      expect(container.has('test')).toBe(true);
    });

    test('should register scoped services', () => {
      const mockFactory = () => ({ id: Math.random() });
      container.scoped('test', mockFactory);

      expect(container.listServices()).toContain('test');
      expect(container.has('test')).toBe(true);
    });

    test('should register services with dependencies', () => {
      container.register('test', () => ({}), {
        dependencies: ['dep1', 'dep2']
      });

      const config = container.getServiceConfig('test');
      expect(config.dependencies).toEqual(['dep1', 'dep2']);
    });
  });

  describe('Service Resolution', () => {
    test('should resolve singleton services', async () => {
      const mockService = { name: 'testService' };
      container.singleton('test', () => mockService);

      const resolved1 = await container.get('test');
      const resolved2 = await container.get('test');

      expect(resolved1).toBe(mockService);
      expect(resolved1).toBe(resolved2); // Same instance
    });

    test('should resolve transient services', async () => {
      let counter = 0;
      container.transient('test', () => ({ id: ++counter }));

      const resolved1 = await container.get('test');
      const resolved2 = await container.get('test');

      expect(resolved1.id).toBe(1);
      expect(resolved2.id).toBe(2);
      expect(resolved1).not.toBe(resolved2); // Different instances
    });

    test('should throw error for unregistered service', async () => {
      await expect(container.get('nonexistent')).rejects.toThrow(
        'Service \'nonexistent\' not found'
      );
    });
  });

  describe('Service Dependencies', () => {
    test('should resolve services with dependencies', async () => {
      // Register dependency
      container.singleton('database', () => ({ connection: 'mock-db' }));
      
      // Register service with dependency
      container.register('userService', (deps) => {
        return { db: deps.database, getUsers: () => ['user1', 'user2'] };
      }, { dependencies: ['database'] });

      const userService = await container.get('userService');
      expect(userService.db.connection).toBe('mock-db');
      expect(userService.getUsers()).toEqual(['user1', 'user2']);
    });

    test('should handle circular dependencies gracefully', async () => {
      container.register('serviceA', (deps) => {
        return { name: 'A', dependency: deps.serviceB };
      }, { dependencies: ['serviceB'] });

      container.register('serviceB', (deps) => {
        return { name: 'B', dependency: deps.serviceA };
      }, { dependencies: ['serviceA'] });

      // This should detect circular dependency
      await expect(container.get('serviceA')).rejects.toThrow('Circular dependency detected');
    });
  });

  describe('Service Lifecycle', () => {
    test('should start all services', async () => {
      let started = false;
      const mockService = { name: 'testService' };
      
      container.register('test', () => mockService, {
        lifecycle: {
          onStart: async () => { started = true; }
        }
      });

      await container.startAll();
      expect(started).toBe(true);
    });

    test('should stop all services', async () => {
      let stopped = false;
      const mockService = { name: 'testService' };
      
      container.register('test', () => mockService, {
        lifecycle: {
          onStop: async () => { stopped = true; }
        }
      });

      // Initialize the service first
      await container.get('test');
      await container.stopAll();
      expect(stopped).toBe(true);
    });

    test('should handle services without lifecycle methods', async () => {
      const mockService = { name: 'testService' };
      container.singleton('test', () => mockService);

      // Should not throw
      await expect(container.startAll()).resolves.not.toThrow();
      await expect(container.stopAll()).resolves.not.toThrow();
    });
  });

  describe('Service Health Checks', () => {
    test('should perform health checks on services', async () => {
      const mockService = {
        isHealthy: jest.fn().mockResolvedValue(true)
      };

      container.register('healthyService', () => mockService);
      await container.get('healthyService'); // Initialize the service
      
      const healthStatus = await container.getHealthStatus();
      
      expect(healthStatus.services.healthyService.healthy).toBe(true);
    });

    test('should handle services without health check method', async () => {
      const mockService = {};

      container.register('simpleService', () => mockService);
      await container.get('simpleService'); // Initialize the service
      
      const healthStatus = await container.getHealthStatus();
      
      expect(healthStatus.services.simpleService.healthy).toBeUndefined();
    });
  });

  describe('Service Metrics', () => {
    test('should provide container metrics', () => {
      container.singleton('service1', () => ({}));
      container.transient('service2', () => ({}));
      container.scoped('service3', () => ({}));

      const metrics = container.getMetrics();

      expect(metrics.totalServices).toBe(3);
      expect(metrics.initializedServices).toBe(0); // Not initialized yet
    });

    test('should track service resolution metrics', async () => {
      container.singleton('test', () => ({ name: 'test' }));

      await container.get('test');
      await container.get('test');

      const metrics = container.getMetrics();
      expect(metrics.resolutions.test).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Service Scoping', () => {
    test('should support scoped services', async () => {
      let instanceCount = 0;
      container.scoped('test', () => ({ id: ++instanceCount }));

      const instance1a = await container.get('test', 'scope1');
      const instance1b = await container.get('test', 'scope1');
      const instance2a = await container.get('test', 'scope2');

      expect(instance1a).toBe(instance1b); // Same within scope
      expect(instance1a).not.toBe(instance2a); // Different across scopes
      expect(instance1a.id).toBe(1);
      expect(instance2a.id).toBe(2);
    });

    test('should dispose scoped services', async () => {
      let disposed = false;
      const mockService = {
        name: 'test'
      };

      container.register('test', () => mockService, {
        scope: 'scoped',
        lifecycle: {
          onDispose: async () => { disposed = true; }
        }
      });
      
      await container.get('test', 'testScope');
      await container.disposeScope('testScope');

      expect(disposed).toBe(true);
    });
  });

  describe('Service Decorators', () => {
    test('should support service decorators', async () => {
      const originalService = { getValue: () => 'original' };
      
      container.registerDecorator('testDecorator', (service) => ({
        ...service,
        getValue: () => `decorated: ${service.getValue()}`
      }));

      container.register('test', () => originalService, {
        decorators: ['testDecorator']
      });

      const decoratedService = await container.get('test');
      expect(decoratedService.getValue()).toBe('decorated: original');
    });

    test('should support multiple decorators', async () => {
      const originalService = { getValue: () => 'original' };
      
      container.registerDecorator('firstDecorator', (service) => ({
        ...service,
        getValue: () => `first: ${service.getValue()}`
      }));

      container.registerDecorator('secondDecorator', (service) => ({
        ...service,
        getValue: () => `second: ${service.getValue()}`
      }));

      container.register('test', () => originalService, {
        decorators: ['firstDecorator', 'secondDecorator']
      });

      const decoratedService = await container.get('test');
      expect(decoratedService.getValue()).toBe('second: first: original');
    });
  });

  describe('Error Handling', () => {
    test('should handle factory errors gracefully', async () => {
      container.singleton('failing', () => {
        throw new Error('Factory failed');
      });

      await expect(container.get('failing')).rejects.toThrow('Factory failed');
    });

    test('should handle async factory errors', async () => {
      container.singleton('asyncFailing', async () => {
        throw new Error('Async factory failed');
      });

      await expect(container.get('asyncFailing')).rejects.toThrow('Async factory failed');
    });

    test('should provide error context in failures', async () => {
      container.singleton('contextError', () => {
        const error = new Error('Service creation failed');
        error.serviceName = 'contextError';
        throw error;
      });

      try {
        await container.get('contextError');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error.message).toContain('Service creation failed');
      }
    });
  });
});