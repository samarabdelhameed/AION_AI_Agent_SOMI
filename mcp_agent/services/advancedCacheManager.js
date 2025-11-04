/**
 * @fileoverview Advanced Cache Manager
 * @description Enterprise-grade caching with TTL, LRU eviction, Redis support, compression, and advanced features
 */

import { EventEmitter } from 'events';
import { promisify } from 'util';
import { gzip, gunzip } from 'zlib';

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);

export class AdvancedCacheManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.maxSize = options.maxSize || 1000;
    this.defaultTTL = options.defaultTTL || 300000; // 5 minutes
    this.cleanupInterval = options.cleanupInterval || 60000; // 1 minute
    this.enableMetrics = options.enableMetrics !== false;
    this.enableCompression = options.enableCompression || false;
    this.compressionThreshold = options.compressionThreshold || 1024; // 1KB
    this.provider = options.provider || 'memory'; // memory, redis
    this.redisConfig = options.redisConfig || {};
    this.enableWarmup = options.enableWarmup || false;
    this.warmupKeys = options.warmupKeys || [];
    
    // Memory cache
    this.cache = new Map();
    this.accessOrder = new Map(); // For LRU
    this.timers = new Map(); // For TTL cleanup
    this.tags = new Map(); // For tag-based invalidation
    this.dependencies = new Map(); // For dependency-based invalidation
    this.locks = new Map(); // For preventing cache stampede
    
    // Redis client (if using Redis)
    this.redisClient = null;
    
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0,
      hitRate: 0,
      memoryUsage: 0,
      compressionRatio: 0,
      averageGetTime: 0,
      averageSetTime: 0,
      stampedePrevented: 0
    };
    
    // Performance tracking
    this.performanceStats = {
      getTimes: [],
      setTimes: [],
      maxSamples: 1000
    };
    
    // Cache strategies
    this.strategies = {
      'write-through': this.writeThrough.bind(this),
      'write-behind': this.writeBehind.bind(this),
      'write-around': this.writeAround.bind(this)
    };
    
    this.writeStrategy = options.writeStrategy || 'write-through';
    this.writeBehindQueue = [];
    this.writeBehindInterval = options.writeBehindInterval || 5000;
    
    // Start cleanup interval
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
    
    // Initialize provider
    this.initializeProvider();
  }

  /**
   * Initialize cache provider
   */
  async initializeProvider() {
    if (this.provider === 'redis') {
      await this.initializeRedis();
    }
    
    if (this.enableWarmup) {
      await this.warmupCache();
    }
    
    if (this.writeStrategy === 'write-behind') {
      this.startWriteBehindProcessor();
    }
    
    this.emit('cache:initialized', { provider: this.provider });
  }

  /**
   * Initialize Redis connection
   */
  async initializeRedis() {
    try {
      const { createClient } = await import('redis');
      
      this.redisClient = createClient({
        host: this.redisConfig.host || 'localhost',
        port: this.redisConfig.port || 6379,
        db: this.redisConfig.db || 0,
        password: this.redisConfig.password,
        ...this.redisConfig
      });

      await this.redisClient.connect();
      
      this.redisClient.on('error', (error) => {
        this.emit('cache:redis-error', error);
        console.error('Redis error:', error);
      });

      this.emit('cache:redis-connected');
      
    } catch (error) {
      console.warn('Redis not available, falling back to memory cache:', error.message);
      this.provider = 'memory';
    }
  }

  /**
   * Get value from cache with advanced features
   */
  async get(key, options = {}) {
    const startTime = Date.now();
    
    try {
      // Check for cache stampede protection
      if (this.locks.has(key)) {
        await this.locks.get(key);
      }

      let value = null;
      let fromMemory = false;

      // Try memory cache first (L1)
      if (this.cache.has(key)) {
        const entry = this.cache.get(key);
        if (entry.expiresAt > Date.now()) {
          value = entry.value;
          fromMemory = true;
          
          // Update LRU order
          this.updateAccessOrder(key);
        } else {
          // Expired, remove from memory
          this.delete(key);
        }
      }

      // Try Redis cache (L2) if not found in memory
      if (!value && this.provider === 'redis' && this.redisClient) {
        const redisValue = await this.redisClient.get(key);
        if (redisValue) {
          try {
            const parsed = JSON.parse(redisValue);
            if (parsed.expiresAt > Date.now()) {
              value = await this.deserializeValue(parsed.value, parsed.compressed);
              
              // Store in memory cache for faster access
              this.setMemoryCache(key, value, parsed.expiresAt - Date.now());
            } else {
              // Expired in Redis, remove
              await this.redisClient.del(key);
            }
          } catch (parseError) {
            console.warn('Failed to parse Redis value:', parseError);
          }
        }
      }

      // Update metrics
      const responseTime = Date.now() - startTime;
      this.updatePerformanceStats('get', responseTime);

      if (value !== null) {
        this.metrics.hits++;
        this.emit('cache:hit', { key, fromMemory, responseTime });
        return value;
      } else {
        this.metrics.misses++;
        this.emit('cache:miss', { key, responseTime });
        return options.defaultValue || null;
      }

    } catch (error) {
      this.emit('cache:error', { operation: 'get', key, error });
      return options.defaultValue || null;
    } finally {
      this.updateHitRate();
    }
  }

  /**
   * Set value in cache with advanced features
   */
  async set(key, value, options = {}) {
    const startTime = Date.now();
    const ttl = options.ttl || this.defaultTTL;
    const tags = options.tags || [];
    const dependencies = options.dependencies || [];
    
    try {
      // Serialize and compress if needed
      const serializedValue = await this.serializeValue(value);
      const expiresAt = Date.now() + ttl;

      // Store in memory cache
      this.setMemoryCache(key, value, ttl);

      // Store in Redis if enabled
      if (this.provider === 'redis' && this.redisClient) {
        const redisValue = JSON.stringify({
          value: serializedValue.data,
          compressed: serializedValue.compressed,
          expiresAt
        });
        
        await this.redisClient.setEx(key, Math.ceil(ttl / 1000), redisValue);
      }

      // Handle tags
      if (tags.length > 0) {
        this.setTags(key, tags);
      }

      // Handle dependencies
      if (dependencies.length > 0) {
        this.setDependencies(key, dependencies);
      }

      // Update metrics
      const responseTime = Date.now() - startTime;
      this.updatePerformanceStats('set', responseTime);
      this.metrics.sets++;

      this.emit('cache:set', { key, ttl, tags, dependencies, responseTime });

    } catch (error) {
      this.emit('cache:error', { operation: 'set', key, error });
      throw error;
    }
  }

  /**
   * Get or set pattern (cache-aside)
   */
  async getOrSet(key, factory, options = {}) {
    // Prevent cache stampede
    if (this.locks.has(key)) {
      await this.locks.get(key);
      // Try to get again after lock is released
      const value = await this.get(key);
      if (value !== null) {
        return value;
      }
    }

    let value = await this.get(key);
    
    if (value === null) {
      // Create lock to prevent stampede
      let resolveLock;
      const lockPromise = new Promise(resolve => {
        resolveLock = resolve;
      });
      this.locks.set(key, lockPromise);

      try {
        value = await factory();
        await this.set(key, value, options);
        this.metrics.stampedePrevented++;
      } finally {
        this.locks.delete(key);
        resolveLock();
      }
    }

    return value;
  }

  /**
   * Delete key from cache
   */
  async delete(key) {
    try {
      // Remove from memory
      if (this.cache.has(key)) {
        this.cache.delete(key);
        this.accessOrder.delete(key);
        
        if (this.timers.has(key)) {
          clearTimeout(this.timers.get(key));
          this.timers.delete(key);
        }
      }

      // Remove from Redis
      if (this.provider === 'redis' && this.redisClient) {
        await this.redisClient.del(key);
      }

      // Clean up tags and dependencies
      this.cleanupKeyReferences(key);

      this.metrics.deletes++;
      this.emit('cache:delete', { key });

    } catch (error) {
      this.emit('cache:error', { operation: 'delete', key, error });
    }
  }

  /**
   * Invalidate by tags
   */
  async invalidateByTags(tags) {
    const keysToInvalidate = new Set();

    for (const tag of tags) {
      const taggedKeys = this.tags.get(tag) || new Set();
      for (const key of taggedKeys) {
        keysToInvalidate.add(key);
      }
    }

    for (const key of keysToInvalidate) {
      await this.delete(key);
    }

    this.emit('cache:invalidated-by-tags', { tags, count: keysToInvalidate.size });
  }

  /**
   * Invalidate by dependencies
   */
  async invalidateByDependencies(dependencies) {
    const keysToInvalidate = new Set();

    for (const dependency of dependencies) {
      const dependentKeys = this.dependencies.get(dependency) || new Set();
      for (const key of dependentKeys) {
        keysToInvalidate.add(key);
      }
    }

    for (const key of keysToInvalidate) {
      await this.delete(key);
    }

    this.emit('cache:invalidated-by-dependencies', { dependencies, count: keysToInvalidate.size });
  }

  /**
   * Batch operations
   */
  async mget(keys) {
    const results = {};
    const promises = keys.map(async (key) => {
      results[key] = await this.get(key);
    });
    
    await Promise.all(promises);
    return results;
  }

  async mset(entries, options = {}) {
    const promises = Object.entries(entries).map(([key, value]) => 
      this.set(key, value, options)
    );
    
    await Promise.all(promises);
  }

  /**
   * Cache warming
   */
  async warmupCache() {
    if (!this.enableWarmup || this.warmupKeys.length === 0) {
      return;
    }

    this.emit('cache:warmup-started');

    for (const { key, factory, options } of this.warmupKeys) {
      try {
        const value = await factory();
        await this.set(key, value, options);
      } catch (error) {
        console.warn(`Failed to warm up cache for key ${key}:`, error.message);
      }
    }

    this.emit('cache:warmup-completed');
  }

  /**
   * Memory management
   */
  setMemoryCache(key, value, ttl) {
    // Check if we need to evict
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    const expiresAt = Date.now() + ttl;
    this.cache.set(key, { value, expiresAt });
    this.updateAccessOrder(key);

    // Set TTL timer
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }
    
    const timer = setTimeout(() => {
      this.delete(key);
    }, ttl);
    
    this.timers.set(key, timer);
  }

  /**
   * LRU eviction
   */
  evictLRU() {
    const oldestKey = this.accessOrder.keys().next().value;
    if (oldestKey) {
      this.delete(oldestKey);
      this.metrics.evictions++;
      this.emit('cache:evicted', { key: oldestKey, reason: 'lru' });
    }
  }

  /**
   * Update access order for LRU
   */
  updateAccessOrder(key) {
    if (this.accessOrder.has(key)) {
      this.accessOrder.delete(key);
    }
    this.accessOrder.set(key, Date.now());
  }

  /**
   * Serialize value with compression
   */
  async serializeValue(value) {
    const serialized = JSON.stringify(value);
    const size = Buffer.byteLength(serialized, 'utf8');

    if (this.enableCompression && size > this.compressionThreshold) {
      try {
        const compressed = await gzipAsync(serialized);
        const compressionRatio = compressed.length / size;
        
        this.metrics.compressionRatio = (this.metrics.compressionRatio + compressionRatio) / 2;
        
        return {
          data: compressed.toString('base64'),
          compressed: true
        };
      } catch (error) {
        console.warn('Compression failed:', error);
      }
    }

    return {
      data: serialized,
      compressed: false
    };
  }

  /**
   * Deserialize value with decompression
   */
  async deserializeValue(data, compressed) {
    if (compressed) {
      try {
        const buffer = Buffer.from(data, 'base64');
        const decompressed = await gunzipAsync(buffer);
        return JSON.parse(decompressed.toString());
      } catch (error) {
        console.warn('Decompression failed:', error);
        throw error;
      }
    }

    return JSON.parse(data);
  }

  /**
   * Tag management
   */
  setTags(key, tags) {
    for (const tag of tags) {
      if (!this.tags.has(tag)) {
        this.tags.set(tag, new Set());
      }
      this.tags.get(tag).add(key);
    }
  }

  /**
   * Dependency management
   */
  setDependencies(key, dependencies) {
    for (const dependency of dependencies) {
      if (!this.dependencies.has(dependency)) {
        this.dependencies.set(dependency, new Set());
      }
      this.dependencies.get(dependency).add(key);
    }
  }

  /**
   * Clean up key references
   */
  cleanupKeyReferences(key) {
    // Clean up tags
    for (const [tag, keys] of this.tags.entries()) {
      keys.delete(key);
      if (keys.size === 0) {
        this.tags.delete(tag);
      }
    }

    // Clean up dependencies
    for (const [dependency, keys] of this.dependencies.entries()) {
      keys.delete(key);
      if (keys.size === 0) {
        this.dependencies.delete(dependency);
      }
    }
  }

  /**
   * Write strategies
   */
  async writeThrough(key, value, options) {
    // Write to cache and backing store simultaneously
    await this.set(key, value, options);
    // In a real implementation, you'd also write to the backing store
  }

  async writeBehind(key, value, options) {
    // Write to cache immediately, queue for backing store
    await this.set(key, value, options);
    this.writeBehindQueue.push({ key, value, options, timestamp: Date.now() });
  }

  async writeAround(key, value, options) {
    // Write only to backing store, not to cache
    // In a real implementation, you'd write to the backing store
    // Cache will be populated on next read
  }

  /**
   * Start write-behind processor
   */
  startWriteBehindProcessor() {
    setInterval(() => {
      this.processWriteBehindQueue();
    }, this.writeBehindInterval);
  }

  /**
   * Process write-behind queue
   */
  async processWriteBehindQueue() {
    const batch = this.writeBehindQueue.splice(0, 100); // Process in batches
    
    for (const item of batch) {
      try {
        // In a real implementation, write to backing store
        this.emit('cache:write-behind', item);
      } catch (error) {
        console.error('Write-behind failed:', error);
        // Could implement retry logic here
      }
    }
  }

  /**
   * Performance tracking
   */
  updatePerformanceStats(operation, time) {
    const stats = this.performanceStats;
    const times = operation === 'get' ? stats.getTimes : stats.setTimes;
    
    times.push(time);
    if (times.length > stats.maxSamples) {
      times.shift();
    }

    // Update averages
    if (operation === 'get') {
      this.metrics.averageGetTime = times.reduce((a, b) => a + b, 0) / times.length;
    } else {
      this.metrics.averageSetTime = times.reduce((a, b) => a + b, 0) / times.length;
    }
  }

  /**
   * Update hit rate
   */
  updateHitRate() {
    const total = this.metrics.hits + this.metrics.misses;
    this.metrics.hitRate = total > 0 ? (this.metrics.hits / total) * 100 : 0;
  }

  /**
   * Cleanup expired entries
   */
  cleanup() {
    const now = Date.now();
    const expiredKeys = [];

    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.delete(key);
    }

    // Update memory usage estimate
    this.updateMemoryUsage();

    this.emit('cache:cleanup', { expiredKeys: expiredKeys.length });
  }

  /**
   * Update memory usage estimate
   */
  updateMemoryUsage() {
    let totalSize = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      totalSize += this.estimateSize(key) + this.estimateSize(entry.value);
    }
    
    this.metrics.memoryUsage = totalSize;
  }

  /**
   * Estimate object size in bytes
   */
  estimateSize(obj) {
    return JSON.stringify(obj).length * 2; // Rough estimate
  }

  /**
   * Get comprehensive statistics
   */
  getStats() {
    return {
      ...this.metrics,
      cacheSize: this.cache.size,
      maxSize: this.maxSize,
      provider: this.provider,
      memoryUsageFormatted: this.formatBytes(this.metrics.memoryUsage),
      uptime: process.uptime()
    };
  }

  /**
   * Format bytes for display
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Clear all cache
   */
  async clear() {
    // Clear memory cache
    this.cache.clear();
    this.accessOrder.clear();
    
    // Clear timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();

    // Clear Redis cache
    if (this.provider === 'redis' && this.redisClient) {
      await this.redisClient.flushDb();
    }

    // Clear tags and dependencies
    this.tags.clear();
    this.dependencies.clear();

    this.emit('cache:cleared');
  }

  /**
   * Shutdown cache manager
   */
  async shutdown() {
    // Clear cleanup timer
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    // Process remaining write-behind queue
    if (this.writeBehindQueue.length > 0) {
      await this.processWriteBehindQueue();
    }

    // Close Redis connection
    if (this.redisClient) {
      await this.redisClient.quit();
    }

    // Clear all data
    await this.clear();

    this.emit('cache:shutdown');
  }
}

export default AdvancedCacheManager;