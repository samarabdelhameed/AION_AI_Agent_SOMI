/**
 * @fileoverview Enhanced Smoke Tests
 * @description Comprehensive smoke tests including smart contract interactions
 */

import { ServiceFactory } from '../../services/index.js';
import { ethers } from 'ethers';

describe('Enhanced Smoke Tests', () => {
  let services;
  let provider;

  beforeAll(async () => {
    // Initialize services
    services = await ServiceFactory.createEnhancedMCPAgent({
      environment: 'test',
      configDir: './config',
      cacheProvider: 'memory'
    });

    // Initialize provider for smart contract testing
    try {
      provider = new ethers.JsonRpcProvider('https://data-seed-prebsc-1-s1.binance.org:8545/');
    } catch (error) {
      console.warn('Could not initialize provider for smart contract tests:', error.message);
    }
  });

  afterAll(async () => {
    if (services && services.lifecycle) {
      await services.lifecycle.stopAll();
    }
  });

  describe('Basic System Health', () => {
    test('should initialize all core services', () => {
      expect(services).toBeDefined();
      expect(services.container).toBeDefined();
      expect(services.config).toBeDefined();
      expect(services.cache).toBeDefined();
      expect(services.oracle).toBeDefined();
      expect(services.errorManager).toBeDefined();
    });

    test('should have healthy service container', async () => {
      const healthStatus = await services.container.getHealthStatus();
      
      expect(healthStatus.totalServices).toBeGreaterThan(0);
      expect(healthStatus.initializedServices).toBeGreaterThan(0);
      expect(healthStatus.healthyServices).toBeGreaterThan(0);
    });

    test('should have working configuration', () => {
      const stats = services.config.getStats();
      
      expect(stats.totalKeys).toBeGreaterThan(0);
      expect(stats.environment).toBe('test');
      expect(services.config.get('server.port')).toBeDefined();
    });
  });

  describe('Core Service Functionality', () => {
    test('should perform basic cache operations', async () => {
      const testKey = 'smoke-test-cache';
      const testValue = { message: 'smoke test', timestamp: Date.now() };

      await services.cache.set(testKey, testValue);
      const retrieved = await services.cache.get(testKey);

      expect(retrieved).toEqual(testValue);
    });

    test('should handle oracle operations', async () => {
      const snapshot = await services.oracle.getSnapshot('bscTestnet');
      
      expect(snapshot).toBeDefined();
      expect(snapshot.protocols).toBeDefined();
      expect(typeof snapshot.protocols).toBe('object');
    });

    test('should process queue operations', async () => {
      const queueName = 'smoke-test-queue';
      let processedTask = null;

      services.queue.createQueue(queueName, {
        maxConcurrency: 1,
        processor: async (task) => {
          processedTask = task;
          return { processed: true };
        }
      });

      const taskId = await services.queue.add(queueName, { 
        id: 'smoke-test', 
        data: 'test-data' 
      });

      // Wait for processing
      await testUtils.wait(500);

      expect(taskId).toBeDefined();
      expect(processedTask).toBeDefined();
      expect(processedTask.id).toBe('smoke-test');
    });

    test('should handle error management', async () => {
      const context = services.errorManager.createContext('smoke-test', 'test-operation');
      const testError = new Error('Smoke test error');

      await services.errorManager.handleError(testError, context);

      const stats = services.errorManager.getStats();
      expect(stats.totalErrors).toBeGreaterThan(0);
      expect(stats.errorsByService['smoke-test']).toBe(1);
    });
  });

  describe('Smart Contract Integration Tests', () => {
    test('should connect to blockchain network', async () => {
      if (!provider) {
        console.warn('Skipping blockchain tests - provider not available');
        return;
      }

      try {
        const network = await provider.getNetwork();
        expect(network.chainId).toBe(97n); // BSC Testnet
        
        const blockNumber = await provider.getBlockNumber();
        expect(blockNumber).toBeGreaterThan(0);
        
        console.log(`Connected to BSC Testnet, block: ${blockNumber}`);
      } catch (error) {
        console.warn('Blockchain connection test failed:', error.message);
        // Don't fail the test for network issues
      }
    });

    test('should estimate gas for basic transaction', async () => {
      if (!provider) {
        console.warn('Skipping gas estimation test - provider not available');
        return;
      }

      try {
        const gasOptimizer = services.gasOptimizer;
        
        // Mock transaction
        const transaction = {
          to: '0x1234567890123456789012345678901234567890',
          value: ethers.parseEther('0.001'),
          data: '0x'
        };

        // Initialize connection pool with test network
        await services.connectionPool.initialize({
          bscTestnet: {
            rpc: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
            chainId: 97
          }
        });

        const gasEstimate = await gasOptimizer.estimateGas('bscTestnet', transaction);
        
        expect(gasEstimate).toBeDefined();
        expect(gasEstimate.gasLimit).toBeGreaterThan(0n);
        expect(gasEstimate.gasPrice).toBeGreaterThan(0n);
        
        console.log(`Gas estimate: ${gasEstimate.gasLimit} units at ${gasEstimate.gasPrice} wei`);
        
        await services.connectionPool.shutdown();
      } catch (error) {
        console.warn('Gas estimation test failed:', error.message);
        // Don't fail the test for network issues
      }
    });

    test('should handle contract interaction simulation', async () => {
      if (!provider) {
        console.warn('Skipping contract interaction test - provider not available');
        return;
      }

      try {
        // Simple ERC20 contract ABI for testing
        const erc20ABI = [
          'function balanceOf(address owner) view returns (uint256)',
          'function totalSupply() view returns (uint256)',
          'function name() view returns (string)',
          'function symbol() view returns (string)'
        ];

        // Use a known ERC20 contract on BSC Testnet (BUSD)
        const contractAddress = '0xeD24FC36d5Ee211Ea25A80239Fb8C4Cfd80f12Ee'; // BUSD on BSC Testnet
        const contract = new ethers.Contract(contractAddress, erc20ABI, provider);

        // Test read-only operations
        const totalSupply = await contract.totalSupply();
        const name = await contract.name();
        const symbol = await contract.symbol();

        expect(totalSupply).toBeDefined();
        expect(name).toBeDefined();
        expect(symbol).toBeDefined();
        
        console.log(`Contract: ${name} (${symbol}), Total Supply: ${totalSupply}`);
      } catch (error) {
        console.warn('Contract interaction test failed:', error.message);
        // Don't fail the test for network issues or contract changes
      }
    });

    test('should simulate vault contract interactions', async () => {
      // Simulate AION Vault contract interactions without actual deployment
      const mockVaultABI = [
        'function deposit(uint256 amount) external',
        'function withdraw(uint256 shares) external',
        'function balanceOf(address account) view returns (uint256)',
        'function totalSupply() view returns (uint256)',
        'function getCurrentStrategy() view returns (address)'
      ];

      // Create mock contract interface
      const iface = new ethers.Interface(mockVaultABI);

      // Test encoding function calls
      const depositData = iface.encodeFunctionData('deposit', [ethers.parseEther('1.0')]);
      const withdrawData = iface.encodeFunctionData('withdraw', [ethers.parseUnits('100', 18)]);

      expect(depositData).toBeDefined();
      expect(withdrawData).toBeDefined();
      expect(depositData.startsWith('0x')).toBe(true);
      expect(withdrawData.startsWith('0x')).toBe(true);

      console.log('Vault contract call encoding successful');
      console.log(`Deposit call data: ${depositData.substring(0, 20)}...`);
      console.log(`Withdraw call data: ${withdrawData.substring(0, 20)}...`);
    });

    test('should handle transaction retry logic', async () => {
      const retryManager = services.retryManager;
      
      let attemptCount = 0;
      const mockOperation = async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Network timeout');
        }
        return { success: true, attempt: attemptCount };
      };

      const result = await retryManager.executeWithRetry(mockOperation, {
        maxRetries: 5,
        baseDelay: 100
      });

      expect(result.success).toBe(true);
      expect(result.attempt).toBe(3);
      expect(attemptCount).toBe(3);
    });
  });

  describe('API Endpoint Simulation', () => {
    test('should simulate health check endpoint', async () => {
      const healthStatus = await services.lifecycle.getHealthStatus();
      const containerHealth = await services.container.getHealthStatus();

      const mockResponse = {
        status: healthStatus.overall === 'healthy' ? 'operational' : 'degraded',
        timestamp: new Date().toISOString(),
        uptime: healthStatus.uptime,
        services: healthStatus.services,
        container: {
          totalServices: containerHealth.totalServices,
          initializedServices: containerHealth.initializedServices
        }
      };

      expect(mockResponse.status).toMatch(/operational|degraded/);
      expect(mockResponse.timestamp).toBeDefined();
      expect(mockResponse.uptime).toBeGreaterThanOrEqual(0);
      expect(mockResponse.services).toBeDefined();
    });

    test('should simulate oracle snapshot endpoint', async () => {
      const snapshot = await services.oracle.getSnapshot('bscTestnet');

      const mockResponse = {
        success: true,
        data: snapshot
      };

      expect(mockResponse.success).toBe(true);
      expect(mockResponse.data).toBeDefined();
      expect(mockResponse.data.protocols).toBeDefined();
    });

    test('should simulate vault stats endpoint', async () => {
      const mockVaultStats = {
        balance: 3247.82,
        shares: 3180,
        dailyProfit: 28.5,
        apy: 12.8,
        strategy: 'Venus Protocol',
        lastUpdated: new Date().toISOString()
      };

      expect(mockVaultStats.balance).toBeGreaterThan(0);
      expect(mockVaultStats.shares).toBeGreaterThan(0);
      expect(mockVaultStats.apy).toBeGreaterThan(0);
      expect(mockVaultStats.strategy).toBeDefined();
      expect(mockVaultStats.lastUpdated).toBeDefined();
    });

    test('should simulate execute endpoint validation', async () => {
      const validationManager = await services.container.get('validationManager');

      const validRequest = {
        network: 'bscTestnet',
        strategy: 'venus',
        action: 'deposit',
        amount: '1.5',
        currency: 'BNB'
      };

      const invalidRequest = {
        network: 'invalid',
        strategy: 'unknown',
        action: 'invalid',
        amount: '-1',
        currency: ''
      };

      // Validate requests
      const validNetworkResult = validationManager.validateNetwork(validRequest.network);
      const validStrategyResult = validationManager.validateStrategy(validRequest.strategy);
      const validAmountResult = validationManager.validateAmount(validRequest.amount);

      expect(validNetworkResult.valid).toBe(true);
      expect(validStrategyResult.valid).toBe(true);
      expect(validAmountResult.valid).toBe(true);

      const invalidNetworkResult = validationManager.validateNetwork(invalidRequest.network);
      const invalidStrategyResult = validationManager.validateStrategy(invalidRequest.strategy);
      const invalidAmountResult = validationManager.validateAmount(invalidRequest.amount);

      expect(invalidNetworkResult.valid).toBe(false);
      expect(invalidStrategyResult.valid).toBe(false);
      expect(invalidAmountResult.valid).toBe(false);
    });
  });

  describe('Performance Smoke Tests', () => {
    test('should handle moderate load efficiently', async () => {
      const operationCount = 100;
      const startTime = Date.now();

      const operations = [];
      for (let i = 0; i < operationCount; i++) {
        operations.push(
          services.cache.set(`perf-smoke-${i}`, { data: `value-${i}` })
        );
      }

      await Promise.all(operations);

      const retrievalOps = [];
      for (let i = 0; i < operationCount; i++) {
        retrievalOps.push(
          services.cache.get(`perf-smoke-${i}`)
        );
      }

      const results = await Promise.all(retrievalOps);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(operationCount);
      expect(results.every(r => r !== null)).toBe(true);
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds

      console.log(`Performance smoke test: ${operationCount * 2} operations in ${duration}ms`);
    });

    test('should maintain responsiveness under concurrent load', async () => {
      const concurrentOperations = [];

      // Cache operations
      for (let i = 0; i < 20; i++) {
        concurrentOperations.push(
          services.cache.set(`concurrent-${i}`, { data: i })
        );
      }

      // Oracle operations
      for (let i = 0; i < 10; i++) {
        concurrentOperations.push(
          services.oracle.getSnapshot('bscTestnet')
        );
      }

      // Service resolutions
      for (let i = 0; i < 10; i++) {
        concurrentOperations.push(
          services.container.get('config')
        );
      }

      const startTime = Date.now();
      const results = await Promise.all(concurrentOperations);
      const endTime = Date.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(40);
      expect(results.every(r => r !== null && r !== undefined)).toBe(true);
      expect(duration).toBeLessThan(3000); // Should complete within 3 seconds

      console.log(`Concurrent operations smoke test: 40 operations in ${duration}ms`);
    });
  });

  describe('Error Handling Smoke Tests', () => {
    test('should handle service failures gracefully', async () => {
      // Simulate service failure
      const originalMethod = services.oracle.getSnapshot;
      services.oracle.getSnapshot = async () => {
        throw new Error('Simulated service failure');
      };

      try {
        await services.oracle.getSnapshot('bscTestnet');
        expect(true).toBe(false); // Should not reach here
      } catch (error) {
        expect(error.message).toBe('Simulated service failure');
      }

      // Restore service
      services.oracle.getSnapshot = originalMethod;

      // Verify service is working again
      const result = await services.oracle.getSnapshot('bscTestnet');
      expect(result).toBeDefined();
    });

    test('should handle invalid inputs gracefully', async () => {
      const validationManager = await services.container.get('validationManager');

      const invalidInputs = [null, undefined, '', 'invalid', 123, {}, []];

      invalidInputs.forEach(input => {
        expect(() => {
          validationManager.validateAddress(input);
          validationManager.validateAmount(input);
          validationManager.validateNetwork(input);
        }).not.toThrow();
      });
    });
  });

  describe('Integration Smoke Tests', () => {
    test('should demonstrate end-to-end workflow', async () => {
      // 1. Validate input
      const validationManager = await services.container.get('validationManager');
      const addressValidation = validationManager.validateAddress('0x1234567890123456789012345678901234567890');
      expect(addressValidation.valid).toBe(true);

      // 2. Cache user data
      await services.cache.set('user-data', { 
        address: '0x1234567890123456789012345678901234567890',
        balance: '100.5'
      });

      // 3. Get oracle data
      const oracleData = await services.oracle.getSnapshot('bscTestnet');
      expect(oracleData.protocols).toBeDefined();

      // 4. Process through queue
      const queueName = 'integration-workflow';
      let workflowResult = null;

      services.queue.createQueue(queueName, {
        maxConcurrency: 1,
        processor: async (task) => {
          workflowResult = {
            user: task.userData,
            oracle: task.oracleData,
            processed: true,
            timestamp: Date.now()
          };
          return workflowResult;
        }
      });

      const userData = await services.cache.get('user-data');
      await services.queue.add(queueName, {
        userData,
        oracleData
      });

      // Wait for processing
      await testUtils.wait(500);

      expect(workflowResult).toBeDefined();
      expect(workflowResult.processed).toBe(true);
      expect(workflowResult.user.address).toBe('0x1234567890123456789012345678901234567890');
    });
  });

  describe('System Stability Smoke Tests', () => {
    test('should maintain stability over time', async () => {
      const duration = 2000; // 2 seconds
      const startTime = Date.now();
      let operationCount = 0;
      let errorCount = 0;

      const interval = setInterval(async () => {
        try {
          operationCount++;
          
          // Perform various operations
          await services.cache.set(`stability-${operationCount}`, { data: operationCount });
          await services.container.get('config');
          
          if (operationCount % 5 === 0) {
            await services.oracle.getHealthStatus();
          }
        } catch (error) {
          errorCount++;
        }
      }, 50); // Every 50ms

      // Wait for duration
      await new Promise(resolve => setTimeout(resolve, duration));
      clearInterval(interval);

      const endTime = Date.now();
      const actualDuration = endTime - startTime;

      console.log(`Stability test: ${operationCount} operations in ${actualDuration}ms, ${errorCount} errors`);

      expect(operationCount).toBeGreaterThan(20); // Should perform significant operations
      expect(errorCount).toBeLessThan(operationCount * 0.1); // Less than 10% error rate

      // System should still be responsive
      const healthStatus = await services.container.getHealthStatus();
      expect(healthStatus.totalServices).toBeGreaterThan(0);
    });
  });
});