/**
 * @fileoverview Service Lifecycle Management System
 * @description Advanced lifecycle management with health checks, graceful shutdown, and monitoring
 */

import { EventEmitter } from 'events';

export class LifecycleManager extends EventEmitter {
  constructor(serviceContainer, configManager) {
    super();
    
    this.serviceContainer = serviceContainer;
    this.configManager = configManager;
    
    this.state = 'stopped'; // stopped, starting, running, stopping, error
    this.services = new Map();
    this.healthChecks = new Map();
    this.shutdownHooks = new Map();
    this.startupOrder = [];
    this.shutdownOrder = [];
    
    this.healthCheckInterval = null;
    this.healthCheckFrequency = 30000; // 30 seconds
    this.gracefulShutdownTimeout = 30000; // 30 seconds
    
    this.metrics = {
      startTime: null,
      uptime: 0,
      restarts: 0,
      healthCheckFailures: new Map(),
      lastHealthCheck: null
    };

    // Setup process signal handlers
    this.setupSignalHandlers();
  }

  /**
   * Initialize lifecycle manager
   */
  async initialize() {
    try {
      this.emit('lifecycle:initializing');
      
      // Load configuration
      if (this.configManager) {
        const lifecycleConfig = this.configManager.getSection('lifecycle') || {};
        this.healthCheckFrequency = lifecycleConfig.healthCheckFrequency || this.healthCheckFrequency;
        this.gracefulShutdownTimeout = lifecycleConfig.gracefulShutdownTimeout || this.gracefulShutdownTimeout;
      }

      // Register built-in services
      this.registerBuiltInServices();
      
      this.emit('lifecycle:initialized');
      
    } catch (error) {
      this.emit('lifecycle:error', error);
      throw error;
    }
  }

  /**
   * Register a service with lifecycle management
   */
  registerService(name, options = {}) {
    const serviceConfig = {
      name,
      priority: options.priority || 100, // Lower number = higher priority
      essential: options.essential !== false, // Default to essential
      healthCheck: options.healthCheck || null,
      startTimeout: options.startTimeout || 30000,
      stopTimeout: options.stopTimeout || 10000,
      restartPolicy: options.restartPolicy || 'on-failure', // never, on-failure, always
      maxRestarts: options.maxRestarts || 3,
      restartDelay: options.restartDelay || 5000,
      dependencies: options.dependencies || [],
      state: 'stopped',
      restartCount: 0,
      lastRestart: null,
      lastHealthCheck: null,
      healthStatus: 'unknown'
    };

    this.services.set(name, serviceConfig);
    
    // Register health check if provided
    if (serviceConfig.healthCheck) {
      this.healthChecks.set(name, serviceConfig.healthCheck);
    }

    this.emit('service:registered', { name, config: serviceConfig });
    
    return this;
  }

  /**
   * Start all services in dependency order
   */
  async startAll() {
    if (this.state !== 'stopped') {
      throw new Error(`Cannot start services in state: ${this.state}`);
    }

    try {
      this.state = 'starting';
      this.metrics.startTime = new Date();
      this.emit('lifecycle:starting');

      // Calculate startup order
      this.startupOrder = this.calculateStartupOrder();
      
      // Start services in order
      for (const serviceName of this.startupOrder) {
        await this.startService(serviceName);
      }

      // Start health monitoring
      this.startHealthMonitoring();

      this.state = 'running';
      this.emit('lifecycle:started');

    } catch (error) {
      this.state = 'error';
      this.emit('lifecycle:error', error);
      
      // Attempt to stop any started services
      await this.stopAll().catch(stopError => {
        console.error('Error during cleanup after failed start:', stopError);
      });
      
      throw error;
    }
  }

  /**
   * Start a specific service
   */
  async startService(serviceName) {
    const serviceConfig = this.services.get(serviceName);
    if (!serviceConfig) {
      throw new Error(`Service '${serviceName}' not registered`);
    }

    if (serviceConfig.state === 'running') {
      return; // Already running
    }

    try {
      serviceConfig.state = 'starting';
      this.emit('service:starting', { name: serviceName });

      // Start dependencies first
      for (const depName of serviceConfig.dependencies) {
        await this.startService(depName);
      }

      // Get service instance from container
      const serviceInstance = await this.serviceContainer.get(serviceName);
      
      // Call start lifecycle hook with timeout
      if (serviceInstance && typeof serviceInstance.start === 'function') {
        await this.withTimeout(
          serviceInstance.start(),
          serviceConfig.startTimeout,
          `Service '${serviceName}' start timeout`
        );
      }

      serviceConfig.state = 'running';
      this.emit('service:started', { name: serviceName });

    } catch (error) {
      serviceConfig.state = 'error';
      this.emit('service:error', { name: serviceName, error });
      
      if (serviceConfig.essential) {
        throw new Error(`Essential service '${serviceName}' failed to start: ${error.message}`);
      } else {
        console.warn(`Non-essential service '${serviceName}' failed to start:`, error.message);
      }
    }
  }

  /**
   * Stop all services in reverse order
   */
  async stopAll() {
    if (this.state === 'stopped') {
      return; // Already stopped
    }

    try {
      this.state = 'stopping';
      this.emit('lifecycle:stopping');

      // Stop health monitoring
      this.stopHealthMonitoring();

      // Calculate shutdown order (reverse of startup)
      this.shutdownOrder = [...this.startupOrder].reverse();

      // Stop services in order
      for (const serviceName of this.shutdownOrder) {
        await this.stopService(serviceName);
      }

      this.state = 'stopped';
      this.emit('lifecycle:stopped');

    } catch (error) {
      this.state = 'error';
      this.emit('lifecycle:error', error);
      throw error;
    }
  }

  /**
   * Stop a specific service
   */
  async stopService(serviceName) {
    const serviceConfig = this.services.get(serviceName);
    if (!serviceConfig) {
      return; // Service not registered
    }

    if (serviceConfig.state === 'stopped') {
      return; // Already stopped
    }

    try {
      serviceConfig.state = 'stopping';
      this.emit('service:stopping', { name: serviceName });

      // Get service instance from container
      const serviceInstance = await this.serviceContainer.get(serviceName);
      
      // Call stop lifecycle hook with timeout
      if (serviceInstance && typeof serviceInstance.stop === 'function') {
        await this.withTimeout(
          serviceInstance.stop(),
          serviceConfig.stopTimeout,
          `Service '${serviceName}' stop timeout`
        );
      }

      serviceConfig.state = 'stopped';
      this.emit('service:stopped', { name: serviceName });

    } catch (error) {
      serviceConfig.state = 'error';
      this.emit('service:error', { name: serviceName, error });
      console.error(`Error stopping service '${serviceName}':`, error.message);
    }
  }

  /**
   * Restart a specific service
   */
  async restartService(serviceName) {
    const serviceConfig = this.services.get(serviceName);
    if (!serviceConfig) {
      throw new Error(`Service '${serviceName}' not registered`);
    }

    try {
      this.emit('service:restarting', { name: serviceName });

      await this.stopService(serviceName);
      
      // Wait for restart delay
      if (serviceConfig.restartDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, serviceConfig.restartDelay));
      }

      await this.startService(serviceName);

      serviceConfig.restartCount++;
      serviceConfig.lastRestart = new Date();
      this.metrics.restarts++;

      this.emit('service:restarted', { name: serviceName });

    } catch (error) {
      this.emit('service:restart-failed', { name: serviceName, error });
      throw error;
    }
  }

  /**
   * Start health monitoring
   */
  startHealthMonitoring() {
    if (this.healthCheckInterval) {
      return; // Already running
    }

    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, this.healthCheckFrequency);

    this.emit('health:monitoring-started');
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
      this.emit('health:monitoring-stopped');
    }
  }

  /**
   * Perform health checks on all services
   */
  async performHealthChecks() {
    this.metrics.lastHealthCheck = new Date();
    const healthResults = new Map();

    for (const [serviceName, healthCheck] of this.healthChecks.entries()) {
      try {
        const serviceConfig = this.services.get(serviceName);
        if (serviceConfig && serviceConfig.state === 'running') {
          
          const isHealthy = await this.withTimeout(
            healthCheck(),
            5000, // 5 second timeout for health checks
            `Health check timeout for service '${serviceName}'`
          );

          healthResults.set(serviceName, {
            healthy: !!isHealthy,
            timestamp: new Date(),
            error: null
          });

          serviceConfig.healthStatus = isHealthy ? 'healthy' : 'unhealthy';
          serviceConfig.lastHealthCheck = new Date();

          // Handle unhealthy service
          if (!isHealthy) {
            await this.handleUnhealthyService(serviceName, serviceConfig);
          }

        }
      } catch (error) {
        healthResults.set(serviceName, {
          healthy: false,
          timestamp: new Date(),
          error: error.message
        });

        const serviceConfig = this.services.get(serviceName);
        if (serviceConfig) {
          serviceConfig.healthStatus = 'error';
          await this.handleUnhealthyService(serviceName, serviceConfig, error);
        }
      }
    }

    this.emit('health:check-completed', healthResults);
  }

  /**
   * Handle unhealthy service
   */
  async handleUnhealthyService(serviceName, serviceConfig, error = null) {
    // Track failure
    if (!this.metrics.healthCheckFailures.has(serviceName)) {
      this.metrics.healthCheckFailures.set(serviceName, 0);
    }
    this.metrics.healthCheckFailures.set(
      serviceName, 
      this.metrics.healthCheckFailures.get(serviceName) + 1
    );

    this.emit('service:unhealthy', { name: serviceName, error });

    // Apply restart policy
    if (serviceConfig.restartPolicy !== 'never' && 
        serviceConfig.restartCount < serviceConfig.maxRestarts) {
      
      if (serviceConfig.restartPolicy === 'always' || 
          (serviceConfig.restartPolicy === 'on-failure' && error)) {
        
        try {
          console.warn(`Restarting unhealthy service '${serviceName}'`);
          await this.restartService(serviceName);
        } catch (restartError) {
          console.error(`Failed to restart service '${serviceName}':`, restartError.message);
        }
      }
    }
  }

  /**
   * Get system health status
   */
  async getHealthStatus() {
    const services = {};
    let healthyCount = 0;
    let totalCount = 0;

    for (const [name, config] of this.services.entries()) {
      totalCount++;
      const isHealthy = config.healthStatus === 'healthy';
      if (isHealthy) healthyCount++;

      services[name] = {
        state: config.state,
        healthStatus: config.healthStatus,
        restartCount: config.restartCount,
        lastRestart: config.lastRestart,
        lastHealthCheck: config.lastHealthCheck,
        essential: config.essential
      };
    }

    return {
      overall: healthyCount === totalCount ? 'healthy' : 'degraded',
      healthyServices: healthyCount,
      totalServices: totalCount,
      healthScore: totalCount > 0 ? (healthyCount / totalCount) * 100 : 0,
      uptime: this.getUptime(),
      state: this.state,
      services,
      lastHealthCheck: this.metrics.lastHealthCheck
    };
  }

  /**
   * Get system metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      uptime: this.getUptime(),
      state: this.state,
      servicesCount: this.services.size,
      healthChecksCount: this.healthChecks.size
    };
  }

  /**
   * Get uptime in seconds
   */
  getUptime() {
    if (!this.metrics.startTime) return 0;
    return Math.floor((Date.now() - this.metrics.startTime.getTime()) / 1000);
  }

  /**
   * Calculate startup order based on dependencies
   */
  calculateStartupOrder() {
    const visited = new Set();
    const visiting = new Set();
    const order = [];

    const visit = (serviceName) => {
      if (visited.has(serviceName)) return;
      if (visiting.has(serviceName)) {
        throw new Error(`Circular dependency detected involving '${serviceName}'`);
      }

      const serviceConfig = this.services.get(serviceName);
      if (!serviceConfig) return;

      visiting.add(serviceName);

      // Visit dependencies first
      for (const dep of serviceConfig.dependencies) {
        visit(dep);
      }

      visiting.delete(serviceName);
      visited.add(serviceName);
      order.push(serviceName);
    };

    // Sort services by priority first
    const servicesByPriority = Array.from(this.services.entries())
      .sort(([, a], [, b]) => a.priority - b.priority)
      .map(([name]) => name);

    for (const serviceName of servicesByPriority) {
      visit(serviceName);
    }

    return order;
  }

  /**
   * Setup process signal handlers
   */
  setupSignalHandlers() {
    const gracefulShutdown = async (signal) => {
      console.log(`Received ${signal}, starting graceful shutdown...`);
      
      try {
        await Promise.race([
          this.stopAll(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Graceful shutdown timeout')), 
            this.gracefulShutdownTimeout)
          )
        ]);
        
        console.log('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        console.error('Graceful shutdown failed:', error.message);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught exception:', error);
      this.emit('lifecycle:uncaught-exception', error);
      gracefulShutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled rejection at:', promise, 'reason:', reason);
      this.emit('lifecycle:unhandled-rejection', { reason, promise });
    });
  }

  /**
   * Register built-in services
   */
  registerBuiltInServices() {
    // Register config manager if available
    if (this.configManager) {
      this.registerService('configManager', {
        priority: 1, // Highest priority
        essential: true,
        healthCheck: () => this.configManager.getStats().totalKeys > 0
      });
    }

    // Note: ServiceContainer is not registered as a service within itself
    // to avoid circular dependencies and management issues
  }

  /**
   * Utility: Execute with timeout
   */
  async withTimeout(promise, timeoutMs, errorMessage) {
    return Promise.race([
      promise,
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
      )
    ]);
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    this.stopHealthMonitoring();
    await this.stopAll();
    this.removeAllListeners();
  }
}

export default LifecycleManager;