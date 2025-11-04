/**
 * @fileoverview Advanced Connection Pool for Blockchain Networks
 * @description High-performance connection pooling with health monitoring, load balancing, and automatic recovery
 */

import { EventEmitter } from 'events';
import { ethers } from 'ethers';

export class ConnectionPool extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.maxConnections = options.maxConnections || 10;
    this.minConnections = options.minConnections || 2;
    this.connectionTimeout = options.connectionTimeout || 30000;
    this.idleTimeout = options.idleTimeout || 300000; // 5 minutes
    this.healthCheckInterval = options.healthCheckInterval || 60000; // 1 minute
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 1000;
    this.loadBalancingStrategy = options.loadBalancingStrategy || 'round-robin'; // round-robin, least-connections, random
    
    this.pools = new Map(); // network -> pool
    this.connections = new Map(); // connectionId -> connection
    this.connectionStats = new Map(); // connectionId -> stats
    this.networkConfigs = new Map(); // network -> config
    this.healthCheckTimers = new Map(); // network -> timer
    
    this.metrics = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      failedConnections: 0,
      requestsServed: 0,
      averageResponseTime: 0,
      connectionErrors: new Map()
    };
  }

  /**
   * Initialize connection pool
   */
  async initialize(networkConfigs) {
    try {
      this.emit('pool:initializing');
      
      // Store network configurations
      for (const [network, config] of Object.entries(networkConfigs)) {
        this.networkConfigs.set(network, {
          ...config,
          providers: Array.isArray(config.rpc) ? config.rpc : [config.rpc]
        });
      }
      
      // Create initial connections for each network
      for (const [network, config] of this.networkConfigs.entries()) {
        await this.createNetworkPool(network, config);
      }
      
      // Start health monitoring
      this.startHealthMonitoring();
      
      this.emit('pool:initialized');
      
    } catch (error) {
      this.emit('pool:error', error);
      throw error;
    }
  }

  /**
   * Create connection pool for a specific network
   */
  async createNetworkPool(network, config) {
    const pool = {
      network,
      config,
      connections: new Set(),
      availableConnections: [],
      busyConnections: new Set(),
      roundRobinIndex: 0,
      totalRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0
    };

    this.pools.set(network, pool);
    
    // Create minimum connections
    for (let i = 0; i < this.minConnections; i++) {
      try {
        await this.createConnection(network, i);
      } catch (error) {
        console.warn(`Failed to create initial connection ${i} for ${network}:`, error.message);
      }
    }

    this.emit('pool:network-created', { network, pool });
  }

  /**
   * Create a new connection
   */
  async createConnection(network, index = 0) {
    const config = this.networkConfigs.get(network);
    if (!config) {
      throw new Error(`Network configuration not found: ${network}`);
    }

    const pool = this.pools.get(network);
    const providerUrl = config.providers[index % config.providers.length];
    const connectionId = `${network}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      // Create ethers provider with timeout
      const provider = new ethers.JsonRpcProvider(providerUrl, {
        chainId: config.chainId,
        name: network
      });

      // Test connection
      await Promise.race([
        provider.getNetwork(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout')), this.connectionTimeout)
        )
      ]);

      const connection = {
        id: connectionId,
        network,
        provider,
        providerUrl,
        created: new Date(),
        lastUsed: new Date(),
        inUse: false,
        healthy: true,
        requestCount: 0,
        errorCount: 0,
        totalResponseTime: 0
      };

      // Store connection
      this.connections.set(connectionId, connection);
      pool.connections.add(connectionId);
      pool.availableConnections.push(connectionId);
      
      // Update metrics
      this.metrics.totalConnections++;
      this.metrics.idleConnections++;

      // Store connection stats
      this.connectionStats.set(connectionId, {
        created: connection.created,
        requests: 0,
        errors: 0,
        averageResponseTime: 0,
        lastError: null
      });

      this.emit('connection:created', { connectionId, network, providerUrl });
      
      return connection;

    } catch (error) {
      this.metrics.failedConnections++;
      this.emit('connection:failed', { network, providerUrl, error });
      throw error;
    }
  }

  /**
   * Get a connection from the pool
   */
  async getConnection(network) {
    const pool = this.pools.get(network);
    if (!pool) {
      throw new Error(`Network pool not found: ${network}`);
    }

    let connection = null;
    let attempts = 0;
    const maxAttempts = this.retryAttempts;

    while (!connection && attempts < maxAttempts) {
      try {
        connection = await this.acquireConnection(pool);
        break;
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          throw error;
        }
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
      }
    }

    if (!connection) {
      throw new Error(`Failed to acquire connection for ${network} after ${maxAttempts} attempts`);
    }

    return connection;
  }

  /**
   * Acquire connection using load balancing strategy
   */
  async acquireConnection(pool) {
    // Try to get an available connection
    let connectionId = null;

    switch (this.loadBalancingStrategy) {
      case 'round-robin':
        connectionId = this.getRoundRobinConnection(pool);
        break;
      case 'least-connections':
        connectionId = this.getLeastConnectionsConnection(pool);
        break;
      case 'random':
        connectionId = this.getRandomConnection(pool);
        break;
      default:
        connectionId = this.getRoundRobinConnection(pool);
    }

    if (!connectionId) {
      // Try to create a new connection if under max limit
      if (pool.connections.size < this.maxConnections) {
        const newConnection = await this.createConnection(pool.network);
        connectionId = newConnection.id;
      } else {
        throw new Error(`Connection pool exhausted for ${pool.network}`);
      }
    }

    const connection = this.connections.get(connectionId);
    if (!connection) {
      throw new Error(`Connection not found: ${connectionId}`);
    }

    // Mark as in use
    connection.inUse = true;
    connection.lastUsed = new Date();
    
    // Move from available to busy
    const availableIndex = pool.availableConnections.indexOf(connectionId);
    if (availableIndex > -1) {
      pool.availableConnections.splice(availableIndex, 1);
    }
    pool.busyConnections.add(connectionId);

    // Update metrics
    this.metrics.activeConnections++;
    this.metrics.idleConnections--;

    this.emit('connection:acquired', { connectionId, network: pool.network });

    return connection;
  }

  /**
   * Release connection back to pool
   */
  releaseConnection(connectionId) {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return;
    }

    const pool = this.pools.get(connection.network);
    if (!pool) {
      return;
    }

    // Mark as available
    connection.inUse = false;
    connection.lastUsed = new Date();

    // Move from busy to available
    pool.busyConnections.delete(connectionId);
    pool.availableConnections.push(connectionId);

    // Update metrics
    this.metrics.activeConnections--;
    this.metrics.idleConnections++;

    this.emit('connection:released', { connectionId, network: connection.network });
  }

  /**
   * Execute request with connection pooling
   */
  async executeRequest(network, method, params = []) {
    const startTime = Date.now();
    let connection = null;

    try {
      connection = await this.getConnection(network);
      
      // Execute the request
      const result = await connection.provider.send(method, params);
      
      // Update connection stats
      const responseTime = Date.now() - startTime;
      connection.requestCount++;
      connection.totalResponseTime += responseTime;
      
      const stats = this.connectionStats.get(connection.id);
      if (stats) {
        stats.requests++;
        stats.averageResponseTime = connection.totalResponseTime / connection.requestCount;
      }

      // Update pool stats
      const pool = this.pools.get(network);
      if (pool) {
        pool.totalRequests++;
        pool.averageResponseTime = (pool.averageResponseTime * (pool.totalRequests - 1) + responseTime) / pool.totalRequests;
      }

      // Update global metrics
      this.metrics.requestsServed++;
      this.metrics.averageResponseTime = (this.metrics.averageResponseTime * (this.metrics.requestsServed - 1) + responseTime) / this.metrics.requestsServed;

      this.emit('request:completed', { 
        network, 
        method, 
        responseTime, 
        connectionId: connection.id 
      });

      return result;

    } catch (error) {
      // Update error stats
      if (connection) {
        connection.errorCount++;
        const stats = this.connectionStats.get(connection.id);
        if (stats) {
          stats.errors++;
          stats.lastError = error.message;
        }
      }

      const pool = this.pools.get(network);
      if (pool) {
        pool.failedRequests++;
      }

      // Track error by network
      if (!this.metrics.connectionErrors.has(network)) {
        this.metrics.connectionErrors.set(network, 0);
      }
      this.metrics.connectionErrors.set(network, this.metrics.connectionErrors.get(network) + 1);

      this.emit('request:failed', { 
        network, 
        method, 
        error, 
        connectionId: connection?.id 
      });

      throw error;

    } finally {
      if (connection) {
        this.releaseConnection(connection.id);
      }
    }
  }

  /**
   * Get round-robin connection
   */
  getRoundRobinConnection(pool) {
    if (pool.availableConnections.length === 0) {
      return null;
    }

    const connectionId = pool.availableConnections[pool.roundRobinIndex % pool.availableConnections.length];
    pool.roundRobinIndex = (pool.roundRobinIndex + 1) % pool.availableConnections.length;
    
    return connectionId;
  }

  /**
   * Get least connections connection
   */
  getLeastConnectionsConnection(pool) {
    if (pool.availableConnections.length === 0) {
      return null;
    }

    let leastConnectionId = null;
    let leastRequests = Infinity;

    for (const connectionId of pool.availableConnections) {
      const connection = this.connections.get(connectionId);
      if (connection && connection.requestCount < leastRequests) {
        leastRequests = connection.requestCount;
        leastConnectionId = connectionId;
      }
    }

    return leastConnectionId;
  }

  /**
   * Get random connection
   */
  getRandomConnection(pool) {
    if (pool.availableConnections.length === 0) {
      return null;
    }

    const randomIndex = Math.floor(Math.random() * pool.availableConnections.length);
    return pool.availableConnections[randomIndex];
  }

  /**
   * Start health monitoring
   */
  startHealthMonitoring() {
    for (const network of this.pools.keys()) {
      const timer = setInterval(async () => {
        await this.performHealthCheck(network);
      }, this.healthCheckInterval);
      
      this.healthCheckTimers.set(network, timer);
    }

    // Start idle connection cleanup
    setInterval(() => {
      this.cleanupIdleConnections();
    }, this.idleTimeout / 2);

    this.emit('health:monitoring-started');
  }

  /**
   * Perform health check for network
   */
  async performHealthCheck(network) {
    const pool = this.pools.get(network);
    if (!pool) return;

    const healthyConnections = [];
    const unhealthyConnections = [];

    for (const connectionId of pool.connections) {
      const connection = this.connections.get(connectionId);
      if (!connection) continue;

      try {
        // Test connection with a simple call
        await Promise.race([
          connection.provider.getBlockNumber(),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Health check timeout')), 5000)
          )
        ]);

        connection.healthy = true;
        healthyConnections.push(connectionId);

      } catch (error) {
        connection.healthy = false;
        unhealthyConnections.push(connectionId);
        
        this.emit('connection:unhealthy', { 
          connectionId, 
          network, 
          error: error.message 
        });
      }
    }

    // Remove unhealthy connections
    for (const connectionId of unhealthyConnections) {
      await this.removeConnection(connectionId);
    }

    // Ensure minimum connections
    const currentHealthy = healthyConnections.length;
    if (currentHealthy < this.minConnections) {
      const needed = this.minConnections - currentHealthy;
      for (let i = 0; i < needed; i++) {
        try {
          await this.createConnection(network);
        } catch (error) {
          console.warn(`Failed to create replacement connection for ${network}:`, error.message);
        }
      }
    }

    this.emit('health:check-completed', { 
      network, 
      healthy: healthyConnections.length, 
      unhealthy: unhealthyConnections.length 
    });
  }

  /**
   * Clean up idle connections
   */
  cleanupIdleConnections() {
    const now = Date.now();

    for (const [connectionId, connection] of this.connections.entries()) {
      if (!connection.inUse && 
          (now - connection.lastUsed.getTime()) > this.idleTimeout) {
        
        const pool = this.pools.get(connection.network);
        if (pool && pool.connections.size > this.minConnections) {
          this.removeConnection(connectionId);
        }
      }
    }
  }

  /**
   * Remove connection from pool
   */
  async removeConnection(connectionId) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    const pool = this.pools.get(connection.network);
    if (pool) {
      pool.connections.delete(connectionId);
      pool.busyConnections.delete(connectionId);
      
      const availableIndex = pool.availableConnections.indexOf(connectionId);
      if (availableIndex > -1) {
        pool.availableConnections.splice(availableIndex, 1);
      }
    }

    // Clean up
    this.connections.delete(connectionId);
    this.connectionStats.delete(connectionId);

    // Update metrics
    this.metrics.totalConnections--;
    if (connection.inUse) {
      this.metrics.activeConnections--;
    } else {
      this.metrics.idleConnections--;
    }

    this.emit('connection:removed', { connectionId, network: connection.network });
  }

  /**
   * Get pool statistics
   */
  getPoolStats(network = null) {
    if (network) {
      const pool = this.pools.get(network);
      if (!pool) return null;

      return {
        network,
        totalConnections: pool.connections.size,
        availableConnections: pool.availableConnections.length,
        busyConnections: pool.busyConnections.size,
        totalRequests: pool.totalRequests,
        failedRequests: pool.failedRequests,
        averageResponseTime: pool.averageResponseTime,
        successRate: pool.totalRequests > 0 ? 
          ((pool.totalRequests - pool.failedRequests) / pool.totalRequests) * 100 : 0
      };
    }

    // Return stats for all networks
    const stats = {};
    for (const network of this.pools.keys()) {
      stats[network] = this.getPoolStats(network);
    }

    return {
      global: this.metrics,
      networks: stats
    };
  }

  /**
   * Get connection details
   */
  getConnectionDetails(connectionId) {
    const connection = this.connections.get(connectionId);
    const stats = this.connectionStats.get(connectionId);
    
    if (!connection || !stats) return null;

    return {
      id: connection.id,
      network: connection.network,
      providerUrl: connection.providerUrl,
      created: connection.created,
      lastUsed: connection.lastUsed,
      inUse: connection.inUse,
      healthy: connection.healthy,
      requestCount: connection.requestCount,
      errorCount: connection.errorCount,
      averageResponseTime: connection.requestCount > 0 ? 
        connection.totalResponseTime / connection.requestCount : 0,
      stats
    };
  }

  /**
   * Shutdown connection pool
   */
  async shutdown() {
    this.emit('pool:shutting-down');

    // Stop health monitoring
    for (const timer of this.healthCheckTimers.values()) {
      clearInterval(timer);
    }
    this.healthCheckTimers.clear();

    // Close all connections
    for (const connectionId of this.connections.keys()) {
      await this.removeConnection(connectionId);
    }

    // Clear all data
    this.pools.clear();
    this.connections.clear();
    this.connectionStats.clear();
    this.networkConfigs.clear();

    this.emit('pool:shutdown');
  }
}

export default ConnectionPool;