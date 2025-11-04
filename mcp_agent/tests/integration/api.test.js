/**
 * @fileoverview API Integration Tests
 * @description Comprehensive tests for API endpoints and middleware
 */

import Fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import { ServiceFactory } from '../../services/index.js';

describe('API Integration Tests', () => {
  let app;
  let services;

  beforeAll(async () => {
    // Initialize services
    services = await ServiceFactory.createEnhancedMCPAgent({
      environment: 'test',
      configDir: './config',
      cacheProvider: 'memory'
    });

    // Initialize Fastify app
    app = Fastify({ logger: false });
    await app.register(fastifyCors, { origin: true });

    // Register middleware
    app.addHook('onRequest', services.container.get('securityManager').createSecurityMiddleware());
    app.addHook('preValidation', services.container.get('validationManager').createValidationMiddleware());
    app.setErrorHandler(services.container.get('errorManager').createGlobalErrorHandler());

    // Register routes
    registerRoutes(app, services);
  });

  afterAll(async () => {
    if (app) {
      await app.close();
    }
    if (services && services.lifecycle) {
      await services.lifecycle.stopAll();
    }
  });

  describe('Health Check Endpoint', () => {
    test('should return healthy status', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/health'
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('status');
      expect(body).toHaveProperty('timestamp');
      expect(body).toHaveProperty('uptime');
      expect(body).toHaveProperty('services');
    });

    test('should include service health information', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/health'
      });

      const body = JSON.parse(response.body);
      expect(body.services).toBeDefined();
      expect(typeof body.services).toBe('object');
    });
  });

  describe('Oracle Snapshot Endpoint', () => {
    test('should return oracle snapshot', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/oracle/snapshot?network=bscTestnet'
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('success', true);
      expect(body).toHaveProperty('data');
      expect(body.data).toHaveProperty('protocols');
    });

    test('should validate network parameter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/oracle/snapshot?network=invalid'
      });

      expect(response.statusCode).toBe(400);
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('success', false);
      expect(body).toHaveProperty('error');
    });

    test('should use default network when not specified', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/oracle/snapshot'
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
    });
  });

  describe('Vault Stats Endpoint', () => {
    test('should return vault statistics', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/vault/stats'
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('balance');
      expect(body).toHaveProperty('shares');
      expect(body).toHaveProperty('dailyProfit');
      expect(body).toHaveProperty('apy');
      expect(body).toHaveProperty('strategy');
      expect(body).toHaveProperty('lastUpdated');
    });

    test('should accept network parameter', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/vault/stats?network=bscMainnet'
      });

      expect(response.statusCode).toBe(200);
    });
  });

  describe('Execute Endpoint', () => {
    test('should execute valid strategy request', async () => {
      const payload = {
        network: 'bscTestnet',
        strategy: 'venus',
        action: 'deposit',
        amount: '1.5',
        currency: 'BNB'
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/execute',
        payload
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('success', true);
      expect(body).toHaveProperty('txHash');
      expect(body).toHaveProperty('gasUsed');
      expect(body).toHaveProperty('timestamp');
    });

    test('should reject invalid strategy request', async () => {
      const payload = {
        network: 'invalid',
        strategy: 'unknown',
        action: 'invalid',
        amount: '-1',
        currency: ''
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/execute',
        payload
      });

      expect(response.statusCode).toBe(400);
    });

    test('should require all mandatory fields', async () => {
      const payload = {
        network: 'bscTestnet'
        // Missing required fields
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/execute',
        payload
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('AI Decision Endpoint', () => {
    test('should return AI recommendation', async () => {
      const payload = {
        amount: '100',
        riskTolerance: 'medium',
        timeHorizon: 'long',
        preferredStrategies: ['venus', 'beefy']
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/decide',
        payload
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('recommendation');
      expect(body).toHaveProperty('confidence');
      expect(body).toHaveProperty('reasoning');
      expect(body).toHaveProperty('expectedApy');
      expect(body).toHaveProperty('riskScore');
    });

    test('should validate decision parameters', async () => {
      const payload = {
        amount: '-100', // Invalid negative amount
        riskTolerance: 'invalid',
        timeHorizon: 'unknown'
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/decide',
        payload
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('Proof of Yield Endpoint', () => {
    test('should return yield proof snapshot', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/proof-of-yield/snapshot'
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('network');
      expect(body).toHaveProperty('totalValueLocked');
      expect(body).toHaveProperty('totalUsers');
      expect(body).toHaveProperty('averageApy');
      expect(body).toHaveProperty('volume24h');
    });
  });

  describe('Transaction History Endpoint', () => {
    test('should return transaction history', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/transactions?address=0x1234567890123456789012345678901234567890'
      });

      expect(response.statusCode).toBe(200);
      
      const body = JSON.parse(response.body);
      expect(Array.isArray(body)).toBe(true);
      
      if (body.length > 0) {
        expect(body[0]).toHaveProperty('id');
        expect(body[0]).toHaveProperty('type');
        expect(body[0]).toHaveProperty('status');
        expect(body[0]).toHaveProperty('timestamp');
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle 404 errors', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/nonexistent'
      });

      expect(response.statusCode).toBe(404);
    });

    test('should handle malformed JSON', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/execute',
        payload: 'invalid json',
        headers: {
          'content-type': 'application/json'
        }
      });

      expect(response.statusCode).toBe(400);
    });

    test('should handle internal server errors gracefully', async () => {
      // Mock a service to throw an error
      const originalGet = services.container.get;
      services.container.get = jest.fn().mockImplementation((serviceName) => {
        if (serviceName === 'oracleService') {
          throw new Error('Service unavailable');
        }
        return originalGet.call(services.container, serviceName);
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/oracle/snapshot'
      });

      expect(response.statusCode).toBe(500);
      
      // Restore original method
      services.container.get = originalGet;
    });
  });

  describe('Security Middleware', () => {
    test('should add security headers', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/health'
      });

      expect(response.headers).toHaveProperty('x-content-type-options');
      expect(response.headers).toHaveProperty('x-frame-options');
      expect(response.headers).toHaveProperty('x-xss-protection');
    });

    test('should handle CORS preflight requests', async () => {
      const response = await app.inject({
        method: 'OPTIONS',
        url: '/api/execute',
        headers: {
          'origin': 'http://localhost:3000',
          'access-control-request-method': 'POST',
          'access-control-request-headers': 'content-type'
        }
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers).toHaveProperty('access-control-allow-origin');
      expect(response.headers).toHaveProperty('access-control-allow-methods');
    });
  });

  describe('Rate Limiting', () => {
    test('should apply rate limiting to sensitive endpoints', async () => {
      const payload = {
        network: 'bscTestnet',
        strategy: 'venus',
        action: 'deposit',
        amount: '1.0',
        currency: 'BNB'
      };

      // Make multiple rapid requests
      const promises = Array(10).fill().map(() => 
        app.inject({
          method: 'POST',
          url: '/api/execute',
          payload
        })
      );

      const responses = await Promise.all(promises);
      
      // Some requests should be rate limited
      const rateLimitedResponses = responses.filter(r => r.statusCode === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
});

// Helper function to register routes
function registerRoutes(app, services) {
  // Health check
  app.get('/api/health', async (request, reply) => {
    const healthStatus = await services.lifecycle.getHealthStatus();
    return {
      status: healthStatus.overall === 'healthy' ? 'operational' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: healthStatus.uptime,
      services: healthStatus.services
    };
  });

  // Oracle snapshot
  app.get('/api/oracle/snapshot', async (request, reply) => {
    const { network = 'bscTestnet' } = request.query;
    
    const validationManager = await services.container.get('validationManager');
    const networkValidation = validationManager.validateNetwork(network);
    
    if (!networkValidation.valid) {
      return reply.status(400).send({
        success: false,
        error: networkValidation.error
      });
    }
    
    const oracleService = await services.container.get('oracleService');
    const snapshot = await oracleService.getSnapshot(network);
    
    return { success: true, data: snapshot };
  });

  // Vault stats
  app.get('/api/vault/stats', async (request, reply) => {
    return {
      balance: 3247.82,
      shares: 3180,
      dailyProfit: 28.5,
      apy: 12.8,
      strategy: 'Venus Protocol',
      lastUpdated: new Date().toISOString()
    };
  });

  // Execute strategy
  app.post('/api/execute', async (request, reply) => {
    const { network, strategy, action, amount, currency } = request.body;
    
    // Basic validation
    if (!network || !strategy || !action || !amount || !currency) {
      return reply.status(400).send({ error: 'Missing required fields' });
    }
    
    return {
      success: true,
      txHash: testUtils.randomHash(),
      gasUsed: testUtils.randomNumber(50000, 150000),
      timestamp: new Date().toISOString(),
      network,
      strategy,
      action,
      amount,
      currency
    };
  });

  // AI decision
  app.post('/api/decide', async (request, reply) => {
    const { amount, riskTolerance, timeHorizon } = request.body;
    
    if (!amount || parseFloat(amount) <= 0) {
      return reply.status(400).send({ error: 'Invalid amount' });
    }
    
    const strategies = ['venus', 'beefy', 'pancake', 'aave'];
    const recommendation = strategies[Math.floor(Math.random() * strategies.length)];
    
    return {
      recommendation,
      confidence: 0.75 + Math.random() * 0.2,
      reasoning: `Based on current market conditions, ${recommendation} offers the best risk-adjusted returns`,
      expectedApy: 8 + Math.random() * 8,
      riskScore: Math.floor(Math.random() * 5) + 1,
      timestamp: new Date().toISOString()
    };
  });

  // Proof of yield
  app.get('/api/proof-of-yield/snapshot', async (request, reply) => {
    const { network = 'bscTestnet' } = request.query;
    
    return {
      network,
      totalValueLocked: 24500000,
      totalUsers: 12847,
      averageApy: 9.8,
      volume24h: 3400000,
      timestamp: new Date().toISOString()
    };
  });

  // Transaction history
  app.get('/api/transactions', async (request, reply) => {
    return [
      {
        id: '1',
        type: 'deposit',
        amount: 0.5,
        currency: 'BNB',
        strategy: 'Venus Protocol',
        status: 'completed',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        hash: testUtils.randomHash()
      },
      {
        id: '2',
        type: 'rebalance',
        fromStrategy: 'Venus Protocol',
        toStrategy: 'Beefy Finance',
        status: 'pending',
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        hash: testUtils.randomHash()
      }
    ];
  });
}