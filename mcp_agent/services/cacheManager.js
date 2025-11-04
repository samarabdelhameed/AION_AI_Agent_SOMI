/**
 * @fileoverview Cache Management System
 * @description Optimized caching with memory management and cleanup
 */

export class CacheManager {
  constructor(options = {}) {
    this.maxSize = options.maxSize || 1000;
    this.defaultTTL = options.defaultTTL || 300000; // 5 minutes
    this.cleanupInterval = options.cleanupInterval || 60000; // 1 minute
    this.cache = new Map();
    this.timers = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0
    };
    
    // Start cleanup timer
    this.startCleanupTimer();
  }

  /**
   * Set cache entry with TTL
   */
  set(key, value, ttl = null) {
    const actualTTL = ttl || this.defaultTTL;
    const expiresAt = Date.now() + actualTTL;
    
    // Check if we need to evict entries
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }
    
    // Clear existing timer if key exists
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
    }
    
    // Set cache entry
    this.cache.set(key, {
      value,
      expiresAt,
      createdAt: Date.now(),
      accessCount: 0
    });
    
    // Set expiration timer
    const timer = setTimeout(() => {
      this.delete(key);
    }, actualTTL);
    
    this.timers.set(key, timer);
    this.stats.sets++;
    
    return true;
  }

  /**
   * Get cache entry
   */
  get(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }
    
    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      this.stats.misses++;
      return null;
    }
    
    // Update access statistics
    entry.accessCount++;
    this.stats.hits++;
    
    return entry.value;
  }

  /**
   * Delete cache entry
   */
  delete(key) {
    const deleted = this.cache.delete(key);
    
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key));
      this.timers.delete(key);
    }
    
    if (deleted) {
      this.stats.deletes++;
    }
    
    return deleted;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key) {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }
    
    if (Date.now() > entry.expiresAt) {
      this.delete(key);
      return false;
    }
    
    return true;
  }

  /**
   * Clear all cache entries
   */
  clear() {
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    
    this.cache.clear();
    this.timers.clear();
    
    // Reset stats
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      evictions: 0
    };
  }

  /**
   * Evict oldest entry
   */
  evictOldest() {
    let oldestKey = null;
    let oldestTime = Infinity;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.createdAt < oldestTime) {
        oldestTime = entry.createdAt;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      this.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * Start cleanup timer for expired entries
   */
  startCleanupTimer() {
    setInterval(() => {
      this.cleanup();
    }, this.cleanupInterval);
  }

  /**
   * Clean up expired entries
   */
  cleanup() {
    const now = Date.now();
    const expiredKeys = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        expiredKeys.push(key);
      }
    }
    
    expiredKeys.forEach(key => this.delete(key));
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.stats.hits / (this.stats.hits + this.stats.misses) || 0;
    
    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100,
      size: this.cache.size,
      maxSize: this.maxSize,
      memoryUsage: this.getMemoryUsage()
    };
  }

  /**
   * Get memory usage estimation
   */
  getMemoryUsage() {
    let totalSize = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      totalSize += this.estimateSize(key) + this.estimateSize(entry);
    }
    
    return {
      estimated: totalSize,
      entries: this.cache.size,
      timers: this.timers.size
    };
  }

  /**
   * Estimate object size in bytes
   */
  estimateSize(obj) {
    const type = typeof obj;
    
    switch (type) {
      case 'string':
        return obj.length * 2; // UTF-16
      case 'number':
        return 8;
      case 'boolean':
        return 4;
      case 'object':
        if (obj === null) return 0;
        if (Array.isArray(obj)) {
          return obj.reduce((size, item) => size + this.estimateSize(item), 0);
        }
        return Object.entries(obj).reduce((size, [key, value]) => {
          return size + this.estimateSize(key) + this.estimateSize(value);
        }, 0);
      default:
        return 0;
    }
  }

  /**
   * Get cache keys
   */
  keys() {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache size
   */
  size() {
    return this.cache.size;
  }

  /**
   * Set cache with async function result
   */
  async getOrSet(key, asyncFn, ttl = null) {
    // Try to get from cache first
    const cached = this.get(key);
    if (cached !== null) {
      return cached;
    }
    
    // Execute async function and cache result
    try {
      const result = await asyncFn();
      this.set(key, result, ttl);
      return result;
    } catch (error) {
      // Don't cache errors
      throw error;
    }
  }
}

export default CacheManager;