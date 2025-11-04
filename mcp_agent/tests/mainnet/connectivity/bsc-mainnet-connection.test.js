/**
 * @fileoverview BSC Mainnet Connection Tests
 * @description Test connectivity to BSC mainnet with real RPC endpoints
 * @author AION Team
 */

const { ethers } = require('ethers');
const { getTestHelpers, withTimeout, withRetry } = require('../setup.js');

// Simple config for testing
const MAINNET_TEST_CONFIG = {
  networks: {
    bscMainnet: {
      name: 'BSC Mainnet',
      chainId: 56,
      rpcUrls: [
        'https://bsc-dataseed1.binance.org',
        'https://bsc-dataseed2.binance.org',
        'https://bsc-dataseed3.binance.org',
        'https://bsc-dataseed4.binance.org'
      ]
    }
  },
  thresholds: {
    responseTime: {
      fast: 500,
      acceptable: 2000,
      slow: 5000
    }
  }
};

describe('BSC Mainnet Connection Tests', () => {
  let testHelpers;
  let provider;

  beforeAll(async () => {
    testHelpers = getTestHelpers();
    provider = testHelpers.getProvider();
  });

  // Helper function for timeout
  const testWithTimeout = (testFn, timeout = 30000) => {
    return async () => {
      return Promise.race([
        testFn(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error(`Test timeout after ${timeout}ms`)), timeout)
        )
      ]);
    };
  };

  describe('RPC Endpoint Connectivity', () => {
    test('should connect to BSC mainnet RPC endpoint', testWithTimeout(async () => {
      expect(provider).toBeDefined();
      
      // Test basic connection
      const network = await provider.getNetwork();
      
      expect(network.chainId).toBe(56n);
      expect(network.name).toBe('bnb');
      
      console.log(`✅ Connected to BSC Mainnet (Chain ID: ${network.chainId})`);
    }));

    test('should validate all configured RPC endpoints', withTimeout(async () => {
      const networkConfig = MAINNET_TEST_CONFIG.networks.bscMainnet;
      const results = [];
      
      for (let i = 0; i < networkConfig.rpcUrls.length; i++) {
        const rpcUrl = networkConfig.rpcUrls[i];
        
        try {
          const testProvider = new ethers.JsonRpcProvider(rpcUrl);
          const blockNumber = await testProvider.getBlockNumber();
          
          results.push({
            url: rpcUrl,
            status: 'connected',
            blockNumber: blockNumber.toString(),
            latency: Date.now() // This would be measured properly in real implementation
          });
          
          console.log(`✅ RPC ${i + 1} connected: ${rpcUrl} (Block: ${blockNumber})`);
          
        } catch (error) {
          results.push({
            url: rpcUrl,
            status: 'failed',
            error: error.message
          });
          
          console.warn(`⚠️ RPC ${i + 1} failed: ${rpcUrl} - ${error.message}`);
        }
      }
      
      // At least one RPC should be working
      const workingRPCs = results.filter(r => r.status === 'connected');
      expect(workingRPCs.length).toBeGreaterThan(0);
      
      console.log(`📊 RPC Status: ${workingRPCs.length}/${results.length} endpoints working`);
    }, 60000));

    test('should measure RPC endpoint latency', withTimeout(async () => {
      const networkConfig = MAINNET_TEST_CONFIG.networks.bscMainnet;
      const latencyResults = [];
      
      for (const rpcUrl of networkConfig.rpcUrls.slice(0, 3)) { // Test first 3 RPCs
        try {
          const testProvider = new ethers.JsonRpcProvider(rpcUrl);
          
          // Measure latency with multiple requests
          const latencies = [];
          for (let i = 0; i < 3; i++) {
            const startTime = Date.now();
            await testProvider.getBlockNumber();
            const latency = Date.now() - startTime;
            latencies.push(latency);
          }
          
          const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
          
          latencyResults.push({
            url: rpcUrl,
            averageLatency: avgLatency,
            latencies
          });
          
          console.log(`⚡ RPC latency: ${rpcUrl} - ${avgLatency.toFixed(2)}ms avg`);
          
        } catch (error) {
          console.warn(`⚠️ Latency test failed for ${rpcUrl}: ${error.message}`);
        }
      }
      
      expect(latencyResults.length).toBeGreaterThan(0);
      
      // Check that at least one RPC has reasonable latency
      const fastRPCs = latencyResults.filter(r => r.averageLatency < 2000);
      expect(fastRPCs.length).toBeGreaterThan(0);
    }, 30000));
  });

  describe('Block Number Retrieval', () => {
    test('should retrieve current block number', withTimeout(async () => {
      const blockNumber = await provider.getBlockNumber();
      
      expect(blockNumber).toBeGreaterThan(0);
      expect(typeof blockNumber).toBe('bigint');
      
      // Block number should be reasonable (BSC mainnet started around block 0)
      expect(blockNumber).toBeGreaterThan(1000000n);
      
      console.log(`📦 Current BSC block: ${blockNumber.toString()}`);
    }));

    test('should retrieve block details', withTimeout(async () => {
      const blockNumber = await provider.getBlockNumber();
      const block = await provider.getBlock(blockNumber);
      
      expect(block).toBeDefined();
      expect(block.number).toBe(blockNumber);
      expect(block.hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(block.timestamp).toBeGreaterThan(0);
      expect(block.transactions).toBeDefined();
      
      // Block should be recent (within last hour)
      const blockAge = Date.now() / 1000 - block.timestamp;
      expect(blockAge).toBeLessThan(3600); // 1 hour
      
      console.log(`📦 Block details: ${block.hash} (${block.transactions.length} txs)`);
    }));

    test('should validate block progression', withTimeout(async () => {
      const block1 = await provider.getBlockNumber();
      
      // Wait for next block (BSC has ~3 second block time)
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const block2 = await provider.getBlockNumber();
      
      expect(block2).toBeGreaterThanOrEqual(block1);
      
      const blockDiff = Number(block2 - block1);
      expect(blockDiff).toBeGreaterThanOrEqual(0);
      expect(blockDiff).toBeLessThan(10); // Should not advance too much in 5 seconds
      
      console.log(`📈 Block progression: ${block1} → ${block2} (+${blockDiff})`);
    }, 10000));
  });

  describe('Gas Price Fetching', () => {
    test('should fetch current gas price', withTimeout(async () => {
      const feeData = await provider.getFeeData();
      
      expect(feeData.gasPrice).toBeDefined();
      expect(feeData.gasPrice).toBeGreaterThan(0n);
      
      const gasPriceGwei = ethers.formatUnits(feeData.gasPrice, 'gwei');
      const gasPriceNumber = parseFloat(gasPriceGwei);
      
      // BSC gas price should be reasonable (typically 5-20 gwei)
      expect(gasPriceNumber).toBeGreaterThan(1);
      expect(gasPriceNumber).toBeLessThan(100);
      
      console.log(`⛽ Current gas price: ${gasPriceGwei} gwei`);
    }));

    test('should validate gas price consistency', withTimeout(async () => {
      const gasPrices = [];
      
      // Fetch gas price multiple times
      for (let i = 0; i < 3; i++) {
        const feeData = await provider.getFeeData();
        const gasPriceGwei = parseFloat(ethers.formatUnits(feeData.gasPrice, 'gwei'));
        gasPrices.push(gasPriceGwei);
        
        if (i < 2) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // Gas prices should be relatively stable
      const maxPrice = Math.max(...gasPrices);
      const minPrice = Math.min(...gasPrices);
      const variation = (maxPrice - minPrice) / minPrice;
      
      expect(variation).toBeLessThan(0.5); // Less than 50% variation
      
      console.log(`⛽ Gas price stability: ${minPrice.toFixed(2)} - ${maxPrice.toFixed(2)} gwei (${(variation * 100).toFixed(1)}% variation)`);
    }));

    test('should handle EIP-1559 fee data if available', withTimeout(async () => {
      const feeData = await provider.getFeeData();
      
      expect(feeData.gasPrice).toBeDefined();
      
      // Check if EIP-1559 is supported (maxFeePerGas and maxPriorityFeePerGas)
      if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
        expect(feeData.maxFeePerGas).toBeGreaterThan(0n);
        expect(feeData.maxPriorityFeePerGas).toBeGreaterThan(0n);
        expect(feeData.maxFeePerGas).toBeGreaterThanOrEqual(feeData.maxPriorityFeePerGas);
        
        console.log(`⛽ EIP-1559 supported - Max fee: ${ethers.formatUnits(feeData.maxFeePerGas, 'gwei')} gwei`);
      } else {
        console.log(`⛽ Legacy gas pricing - Gas price: ${ethers.formatUnits(feeData.gasPrice, 'gwei')} gwei`);
      }
    }));
  });

  describe('Network Information', () => {
    test('should retrieve network information', withTimeout(async () => {
      const network = await provider.getNetwork();
      
      expect(network.chainId).toBe(56n);
      expect(network.name).toBe('bnb');
      
      console.log(`🌐 Network: ${network.name} (Chain ID: ${network.chainId})`);
    }));

    test('should validate network configuration', withTimeout(async () => {
      const network = await provider.getNetwork();
      const expectedConfig = MAINNET_TEST_CONFIG.networks.bscMainnet;
      
      expect(Number(network.chainId)).toBe(expectedConfig.chainId);
      
      console.log(`✅ Network configuration validated`);
    }));
  });

  describe('Connection Stability', () => {
    test('should maintain stable connection over time', withTimeout(async () => {
      const results = [];
      const testDuration = 10000; // 10 seconds
      const interval = 1000; // 1 second
      
      const startTime = Date.now();
      
      while (Date.now() - startTime < testDuration) {
        try {
          const blockNumber = await provider.getBlockNumber();
          results.push({
            timestamp: Date.now(),
            blockNumber: blockNumber.toString(),
            success: true
          });
        } catch (error) {
          results.push({
            timestamp: Date.now(),
            error: error.message,
            success: false
          });
        }
        
        await new Promise(resolve => setTimeout(resolve, interval));
      }
      
      const successfulRequests = results.filter(r => r.success).length;
      const successRate = successfulRequests / results.length;
      
      expect(successRate).toBeGreaterThan(0.9); // 90% success rate
      
      console.log(`📊 Connection stability: ${successfulRequests}/${results.length} requests successful (${(successRate * 100).toFixed(1)}%)`);
    }, 15000));

    test('should handle connection errors gracefully', withRetry(async () => {
      // Test with invalid RPC URL to ensure error handling
      const invalidProvider = new ethers.JsonRpcProvider('https://invalid-rpc-url.com');
      
      try {
        await invalidProvider.getBlockNumber();
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.message).toBeDefined();
        
        console.log(`✅ Error handling working: ${error.message.substring(0, 50)}...`);
      }
    }));
  });

  describe('Performance Metrics', () => {
    test('should measure request performance', withTimeout(async () => {
      const metrics = [];
      const requestCount = 10;
      
      for (let i = 0; i < requestCount; i++) {
        const startTime = Date.now();
        
        try {
          await provider.getBlockNumber();
          const duration = Date.now() - startTime;
          metrics.push({ duration, success: true });
        } catch (error) {
          const duration = Date.now() - startTime;
          metrics.push({ duration, success: false, error: error.message });
        }
      }
      
      const successfulRequests = metrics.filter(m => m.success);
      const averageLatency = successfulRequests.reduce((acc, m) => acc + m.duration, 0) / successfulRequests.length;
      const maxLatency = Math.max(...successfulRequests.map(m => m.duration));
      const minLatency = Math.min(...successfulRequests.map(m => m.duration));
      
      expect(successfulRequests.length).toBeGreaterThan(requestCount * 0.8); // 80% success
      expect(averageLatency).toBeLessThan(5000); // Average under 5 seconds
      
      console.log(`📊 Performance metrics:`);
      console.log(`  - Average latency: ${averageLatency.toFixed(2)}ms`);
      console.log(`  - Min latency: ${minLatency}ms`);
      console.log(`  - Max latency: ${maxLatency}ms`);
      console.log(`  - Success rate: ${(successfulRequests.length / requestCount * 100).toFixed(1)}%`);
    }, 30000));
  });
});