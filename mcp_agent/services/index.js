/**
 * @fileoverview Enhanced Services Index
 * @description Export all enhanced services for easy import
 */

// Core Services
export { default as ServiceContainer } from './serviceContainer.js';
export { default as ConfigManager } from './configManager.js';
export { default as LifecycleManager } from './lifecycleManager.js';

// Enhanced Services
export { default as AdvancedCacheManager } from './advancedCacheManager.js';
export { default as ConnectionPool } from './connectionPool.js';
export { default as QueueManager } from './queueManager.js';
export { default as GasOptimizer } from './gasOptimizer.js';
export { default as RetryManager } from './retryManager.js';

// Existing Services (Enhanced)
export { default as OracleService } from './oracleService.js';
export { default as ErrorManager } from './errorManager.js';
export { default as SecurityManager } from './securityManager.js';
export { default as ValidationManager } from './validationManager.js';
export { default as CacheManager } from './cacheManager.js'; // Original cache manager
export { default as KeyManager } from './keyManager.js';
export { default as PythonBridge } from './pythonBridge.js';

// Import classes for ServiceFactory
import ServiceContainerClass from './serviceContainer.js';
import ConfigManagerClass from './configManager.js';
import LifecycleManagerClass from './lifecycleManager.js';
import AdvancedCacheManagerClass from './advancedCacheManager.js';
import ConnectionPoolClass from './connectionPool.js';
import QueueManagerClass from './queueManager.js';
import GasOptimizerClass from './gasOptimizer.js';
import RetryManagerClass from './retryManager.js';
import OracleServiceClass from './oracleService.js';
import ErrorManagerClass from './errorManager.js';
import ValidationManagerClass from './validationManager.js';
import SecurityManagerClass from './securityManager.js';

// Service Factory for easy initialization
export class ServiceFactory {
  static async createEnhancedMCPAgent(options = {}) {
    const services = {};
    
    // Initialize core services
    services.container = new ServiceContainerClass();
    services.config = new ConfigManagerClass({
      configDir: options.configDir || './config',
      environment: options.environment || 'development'
    });
    
    await services.config.initialize();
    
    // Initialize enhanced services
    services.cache = new AdvancedCacheManagerClass({
      provider: options.cacheProvider || 'memory',
      maxSize: options.cacheMaxSize || 1000,
      enableCompression: options.enableCompression || false
    });
    
    services.connectionPool = new ConnectionPoolClass({
      maxConnections: options.maxConnections || 10,
      minConnections: options.minConnections || 2
    });
    
    services.queue = new QueueManagerClass({
      maxConcurrency: options.maxConcurrency || 10,
      enableBatching: options.enableBatching || false
    });
    
    services.errorManager = new ErrorManagerClass();
    services.validationManager = new ValidationManagerClass();
    services.securityManager = new SecurityManagerClass();
    services.oracle = new OracleServiceClass(services.errorManager);
    services.oracleService = services.oracle; // Alias for backward compatibility
    
    services.gasOptimizer = new GasOptimizerClass(services.connectionPool, {
      defaultStrategy: options.gasStrategy || 'adaptive'
    });
    
    services.retryManager = new RetryManagerClass(
      services.connectionPool, 
      services.gasOptimizer,
      {
        maxRetries: options.maxRetries || 5
      }
    );
    
    services.lifecycle = new LifecycleManagerClass(services.container, services.config);
    
    // Register services in container
    services.container.singleton('config', () => services.config);
    services.container.singleton('cache', () => services.cache);
    services.container.singleton('cacheManager', () => services.cache); // Alias for backward compatibility
    services.container.singleton('connectionPool', () => services.connectionPool);
    services.container.singleton('queue', () => services.queue);
    services.container.singleton('errorManager', () => services.errorManager);
    services.container.singleton('validationManager', () => services.validationManager);
    services.container.singleton('securityManager', () => services.securityManager);
    services.container.singleton('oracle', () => services.oracle);
    services.container.singleton('oracleService', () => services.oracle); // Alias for backward compatibility
    services.container.singleton('gasOptimizer', () => services.gasOptimizer);
    services.container.singleton('retryManager', () => services.retryManager);
    services.container.singleton('lifecycle', () => services.lifecycle);
    
    // Initialize lifecycle manager
    await services.lifecycle.initialize();
    
    return services;
  }
}

// Default export
const services = {
  ServiceFactory
};

export default services;