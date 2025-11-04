/**
 * Connection Manager for handling HTTP requests with retry logic, circuit breaker, and caching
 */

export interface ConnectionConfig {
  baseUrl?: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  circuitBreakerThreshold?: number;
  circuitBreakerTimeout?: number;
  enableCaching?: boolean;
  cacheSize?: number;
  cacheTTL?: number;
  rateLimit?: number;
}

export interface HealthStatus {
  healthy: boolean;
  lastError?: Error;
  errorCount: number;
  lastSuccessTime?: Date;
  circuitBreakerOpen: boolean;
}

export class ConnectionManager {
  private config: Required<ConnectionConfig>;
  private healthStatus: HealthStatus;
  private cache: Map<string, { data: any; timestamp: number; ttl: number }>;
  private circuitBreakerOpenTime?: number;
  private requestQueue: Array<{ timestamp: number }> = [];

  constructor(config: ConnectionConfig = {}) {
    this.config = {
      baseUrl: config.baseUrl || '',
      timeout: config.timeout || 10000,
      retries: config.retries || 3,
      retryDelay: config.retryDelay || 1000,
      circuitBreakerThreshold: config.circuitBreakerThreshold || 5,
      circuitBreakerTimeout: config.circuitBreakerTimeout || 30000,
      enableCaching: config.enableCaching || false,
      cacheSize: config.cacheSize || 100,
      cacheTTL: config.cacheTTL || 300000, // 5 minutes
      rateLimit: config.rateLimit || 100 // requests per minute
    };

    this.healthStatus = {
      healthy: true,
      errorCount: 0,
      circuitBreakerOpen: false
    };

    this.cache = new Map();
  }

  isHealthy(): boolean {
    return this.healthStatus.healthy && !this.healthStatus.circuitBreakerOpen;
  }

  getHealthStatus(): HealthStatus {
    return { ...this.healthStatus };
  }

  async request(url: string, options: RequestInit & { timeout?: number } = {}): Promise<any> {
    // Check circuit breaker
    if (this.isCircuitBreakerOpen()) {
      throw new Error('Circuit breaker is open');
    }

    // Check rate limit
    if (!this.checkRateLimit()) {
      throw new Error('Rate limit exceeded');
    }

    // Check cache for GET requests
    if (this.config.enableCaching && (!options.method || options.method === 'GET')) {
      const cached = this.getFromCache(url);
      if (cached) {
        return cached;
      }
    }

    const fullUrl = this.config.baseUrl + url;
    const timeout = options.timeout || this.config.timeout;

    let lastError: Error;
    
    for (let attempt = 0; attempt <= this.config.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(fullUrl, {
          ...options,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Update health status on success
        this.updateHealthStatus(true);
        
        // Cache successful GET requests
        if (this.config.enableCaching && (!options.method || options.method === 'GET')) {
          this.setCache(url, data);
        }

        return data;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.config.retries) {
          // Exponential backoff
          const delay = this.config.retryDelay * Math.pow(2, attempt);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // Update health status on failure
    this.updateHealthStatus(false, lastError!);
    throw lastError!;
  }

  private isCircuitBreakerOpen(): boolean {
    if (!this.healthStatus.circuitBreakerOpen) {
      return false;
    }

    // Check if circuit breaker timeout has passed
    if (this.circuitBreakerOpenTime && 
        Date.now() - this.circuitBreakerOpenTime > this.config.circuitBreakerTimeout) {
      this.healthStatus.circuitBreakerOpen = false;
      this.circuitBreakerOpenTime = undefined;
      return false;
    }

    return true;
  }

  private checkRateLimit(): boolean {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Remove old requests
    this.requestQueue = this.requestQueue.filter(req => req.timestamp > oneMinuteAgo);
    
    if (this.requestQueue.length >= this.config.rateLimit) {
      return false;
    }

    this.requestQueue.push({ timestamp: now });
    return true;
  }

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) {
      return null;
    }

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(key: string, data: any): void {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.config.cacheSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: this.config.cacheTTL
    });
  }

  private updateHealthStatus(success: boolean, error?: Error): void {
    if (success) {
      this.healthStatus.healthy = true;
      this.healthStatus.errorCount = 0;
      this.healthStatus.lastSuccessTime = new Date();
      this.healthStatus.lastError = undefined;
    } else {
      this.healthStatus.healthy = false;
      this.healthStatus.errorCount++;
      this.healthStatus.lastError = error;

      // Open circuit breaker if threshold reached
      if (this.healthStatus.errorCount >= this.config.circuitBreakerThreshold) {
        this.healthStatus.circuitBreakerOpen = true;
        this.circuitBreakerOpenTime = Date.now();
      }
    }
  }

  // Reset circuit breaker manually
  resetCircuitBreaker(): void {
    this.healthStatus.circuitBreakerOpen = false;
    this.circuitBreakerOpenTime = undefined;
    this.healthStatus.errorCount = 0;
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
  }

  // Get cache stats
  getCacheStats(): { size: number; maxSize: number; hitRate?: number } {
    return {
      size: this.cache.size,
      maxSize: this.config.cacheSize
    };
  }

  // Initialize method for compatibility
  async initialize(): Promise<void> {
    // Connection manager is ready immediately
    return Promise.resolve();
  }

  // Make request method for compatibility
  async makeRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request(endpoint, options);
  }

  // Additional methods for compatibility
  isDegraded(): boolean {
    return this.healthStatus.errorCount > 0 && this.healthStatus.errorCount < this.config.circuitBreakerThreshold;
  }

  getStatus(): HealthStatus {
    return this.getHealthStatus();
  }

  onStatusChange(callback: (status: HealthStatus) => void): () => void {
    // Simple implementation - in a real app you'd want proper event emitters
    const interval = setInterval(() => {
      callback(this.getHealthStatus());
    }, 1000);
    
    return () => clearInterval(interval);
  }

  async forceHealthCheck(): Promise<void> {
    try {
      // Make a simple health check request
      await this.request('/health');
    } catch (error) {
      // Health check failed, but that's okay - status is updated automatically
    }
  }
}

// Create and export a default instance
export const connectionManager = new ConnectionManager({
  baseUrl: 'http://localhost:3003',
  timeout: 10000,
  retries: 3,
  retryDelay: 1000,
  circuitBreakerThreshold: 5,
  circuitBreakerTimeout: 30000,
  enableCaching: true,
  cacheSize: 100,
  cacheTTL: 300000,
  rateLimit: 100
});

// Also export as default for convenience
export default connectionManager;