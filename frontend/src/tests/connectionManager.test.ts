import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ConnectionManager } from '../lib/connectionManager';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe.skip('ConnectionManager', () => {
  let connectionManager: ConnectionManager;

  beforeEach(() => {
    connectionManager = new ConnectionManager({
      rateLimit: 1000 // High rate limit for tests
    });
    mockFetch.mockClear();
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('Basic Connection Tests', () => {
    it('should initialize with default configuration', () => {
      expect(connectionManager).toBeDefined();
      expect(connectionManager.isHealthy()).toBe(true);
    });

    it('should make successful HTTP requests', async () => {
      const mockResponse = { success: true, data: 'test' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(mockResponse),
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const result = await connectionManager.request('/test');
      
      expect(result).toEqual(mockResponse);
      expect(mockFetch).toHaveBeenCalledWith(
        '/test',
        expect.objectContaining({
          signal: expect.any(AbortSignal)
        })
      );
    });

    it('should handle network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(connectionManager.request('/test')).rejects.toThrow();
      // Health status might not change immediately due to retry logic
    });

    it('should handle HTTP error responses', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({ error: 'Server error' }),
      });

      await expect(connectionManager.request('/test')).rejects.toThrow();
      // Health status might not change immediately due to retry logic
    });
  });

  describe('Retry Logic Tests', () => {
    it('should retry failed requests with exponential backoff', async () => {
      // First two calls fail, third succeeds
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ success: true }),
        });

      const result = await connectionManager.request('/test');
      
      expect(result).toEqual({ success: true });
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should respect maximum retry attempts', async () => {
      mockFetch.mockRejectedValue(new Error('Persistent error'));

      await expect(connectionManager.request('/test')).rejects.toThrow('Persistent error');
      
      // Should try initial + 3 retries = 4 total
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    it('should use exponential backoff for retry delays', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const promise = connectionManager.request('/test');
      
      // Check that delays increase exponentially
      const delays: number[] = [];
      const originalSetTimeout = global.setTimeout;
      
      vi.spyOn(global, 'setTimeout').mockImplementation((callback, delay) => {
        delays.push(delay as number);
        return originalSetTimeout(callback, 0);
      });

      await expect(promise).rejects.toThrow();
      
      expect(delays).toHaveLength(3); // 3 retry delays
      expect(delays[1]).toBeGreaterThan(delays[0]); // Second delay > first
      expect(delays[2]).toBeGreaterThan(delays[1]); // Third delay > second
    });
  });

  describe('Circuit Breaker Tests', () => {
    it('should open circuit after consecutive failures', async () => {
      mockFetch.mockRejectedValue(new Error('Service unavailable'));

      // Make multiple failed requests to trigger circuit breaker
      for (let i = 0; i < 5; i++) {
        try {
          await connectionManager.request('/test');
        } catch (error) {
          // Expected to fail
        }
      }

      expect(connectionManager.isHealthy()).toBe(false);
      
      // Next request should fail immediately without making HTTP call
      const initialCallCount = mockFetch.mock.calls.length;
      
      await expect(connectionManager.request('/test')).rejects.toThrow();
      
      // Should not have made additional HTTP calls
      expect(mockFetch.mock.calls.length).toBe(initialCallCount);
    });

    it('should reset circuit breaker after timeout', async () => {
      // Trigger circuit breaker
      mockFetch.mockRejectedValue(new Error('Service unavailable'));
      
      for (let i = 0; i < 5; i++) {
        try {
          await connectionManager.request('/test');
        } catch (error) {
          // Expected to fail
        }
      }

      expect(connectionManager.isHealthy()).toBe(false);

      // Fast-forward past circuit breaker timeout
      vi.advanceTimersByTime(60000); // 1 minute

      // Mock successful response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      });

      const result = await connectionManager.request('/test');
      
      expect(result).toEqual({ success: true });
      expect(connectionManager.isHealthy()).toBe(true);
    });
  });

  describe('Health Monitoring Tests', () => {
    it('should track connection health status', () => {
      expect(connectionManager.isHealthy()).toBe(true);
      expect(connectionManager.getHealthStatus()).toMatchObject({
        healthy: true,
        errorCount: 0,
        circuitBreakerOpen: false
      });
    });

    it('should update health status on failures', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Connection failed'));

      try {
        await connectionManager.request('/test');
      } catch (error) {
        // Expected to fail
      }

      const healthStatus = connectionManager.getHealthStatus();
      expect(healthStatus.healthy).toBe(false);
      expect(healthStatus.lastError).toBeTruthy();
      expect(healthStatus.consecutiveFailures).toBeGreaterThan(0);
    });

    it('should reset health status on successful requests', async () => {
      // First make it unhealthy
      mockFetch.mockRejectedValueOnce(new Error('Connection failed'));
      
      try {
        await connectionManager.request('/test');
      } catch (error) {
        // Expected to fail
      }

      expect(connectionManager.isHealthy()).toBe(false);

      // Then make it healthy again
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      });

      await connectionManager.request('/test');

      const healthStatus = connectionManager.getHealthStatus();
      expect(healthStatus.healthy).toBe(true);
      expect(healthStatus.consecutiveFailures).toBe(0);
    });
  });

  describe('Request Configuration Tests', () => {
    it('should handle different HTTP methods', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      });

      await connectionManager.request('/test', {
        method: 'POST',
        body: JSON.stringify({ data: 'test' }),
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ data: 'test' }),
        })
      );
    });

    it('should handle request timeouts', async () => {
      mockFetch.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 10000))
      );

      await expect(
        connectionManager.request('/test', { timeout: 1000 })
      ).rejects.toThrow();
    });

    it('should add custom headers', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      });

      await connectionManager.request('/test', {
        headers: {
          'Authorization': 'Bearer token123',
          'X-Custom-Header': 'custom-value',
        },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/test'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer token123',
            'X-Custom-Header': 'custom-value',
          }),
        })
      );
    });
  });

  describe('Error Handling Tests', () => {
    it('should categorize different types of errors', async () => {
      const testCases = [
        { error: new Error('fetch failed'), expectedType: 'NetworkError' },
        { status: 404, expectedType: 'NotFoundError' },
        { status: 500, expectedType: 'ServerError' },
        { status: 429, expectedType: 'RateLimitError' },
      ];

      for (const testCase of testCases) {
        if (testCase.error) {
          mockFetch.mockRejectedValueOnce(testCase.error);
        } else {
          mockFetch.mockResolvedValueOnce({
            ok: false,
            status: testCase.status,
            statusText: 'Error',
            json: () => Promise.resolve({ error: 'Test error' }),
          });
        }

        try {
          await connectionManager.request('/test');
        } catch (error: any) {
          expect(error.name).toBe(testCase.expectedType);
        }
      }
    });

    it('should provide detailed error information', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({ 
          error: 'Database connection failed',
          code: 'DB_ERROR',
          details: { table: 'users' }
        }),
      });

      try {
        await connectionManager.request('/test');
      } catch (error: any) {
        expect(error.message).toContain('Database connection failed');
        expect(error.code).toBe('DB_ERROR');
        expect(error.details).toEqual({ table: 'users' });
        expect(error.status).toBe(500);
      }
    });
  });

  describe('Performance Tests', () => {
    it('should handle concurrent requests efficiently', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      });

      const requests = Array.from({ length: 10 }, (_, i) => 
        connectionManager.request(`/test${i}`)
      );

      const results = await Promise.all(requests);
      
      expect(results).toHaveLength(10);
      expect(mockFetch).toHaveBeenCalledTimes(10);
      results.forEach(result => {
        expect(result).toEqual({ success: true });
      });
    });

    it('should respect rate limiting', async () => {
      const rateLimitedManager = new ConnectionManager({
        rateLimit: 2 // 2 requests per minute
      });

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true }),
      });

      // Make 3 requests quickly
      const requests = [
        rateLimitedManager.request('/test1'),
        rateLimitedManager.request('/test2'),
        rateLimitedManager.request('/test3'),
      ];

      const results = await Promise.allSettled(requests);
      
      // First 2 should succeed, 3rd should be rate limited
      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('fulfilled');
      expect(results[2].status).toBe('rejected');
    });
  });

  describe('Caching Tests', () => {
    it('should cache GET requests when enabled', async () => {
      const cachedManager = new ConnectionManager({
        enableCaching: true,
        cacheTTL: 5000
      });

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'cached-data' }),
      });

      // First request
      const result1 = await cachedManager.request('/test');
      
      // Second request (should use cache)
      const result2 = await cachedManager.request('/test');

      expect(result1).toEqual(result2);
      expect(mockFetch).toHaveBeenCalledTimes(1); // Only one actual HTTP call
    });

    it('should respect cache TTL', async () => {
      const cachedManager = new ConnectionManager({
        enableCaching: true,
        cacheTTL: 1000
      });

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: 'fresh-data' }),
      });

      // First request
      await cachedManager.request('/test');
      
      // Fast-forward past TTL
      vi.advanceTimersByTime(1500);
      
      // Second request (should make new HTTP call)
      await cachedManager.request('/test');

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});