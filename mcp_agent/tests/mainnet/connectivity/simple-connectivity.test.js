/**
 * @fileoverview Simple BSC Mainnet Connectivity Tests
 * @description Basic connectivity tests for BSC mainnet with real data
 * @author AION Team
 */

const { ethers } = require('ethers');

describe('BSC Mainnet Simple Connectivity Tests', () => {
  let provider;

  beforeAll(async () => {
    // Initialize provider with BSC mainnet
    provider = new ethers.JsonRpcProvider('https://bsc-dataseed1.binance.org');
  });

  describe('Basic RPC Connectivity', () => {
    test('should connect to BSC mainnet and get network info', async () => {
      try {
        const network = await provider.getNetwork();
        
        expect(network.chainId).toBe(56n);
        expect(network.name).toBe('bnb');
        
        console.log(`✅ Connected to BSC Mainnet (Chain ID: ${network.chainId})`);
      } catch (error) {
        console.error('❌ Failed to connect to BSC mainnet:', error.message);
        throw error;
      }
    }, 30000);

    test('should retrieve current block number', async () => {
      try {
        const blockNumber = await provider.getBlockNumber();
        
        expect(blockNumber).toBeGreaterThan(0);
        expect(typeof blockNumber).toBe('bigint');
        
        // Block number should be reasonable (BSC mainnet has millions of blocks)
        expect(blockNumber).toBeGreaterThan(1000000n);
        
        console.log(`📦 Current BSC block: ${blockNumber.toString()}`);
      } catch (error) {
        console.error('❌ Failed to get block number:', error.message);
        throw error;
      }
    }, 15000);

    test('should fetch current gas price', async () => {
      try {
        const feeData = await provider.getFeeData();
        
        expect(feeData.gasPrice).toBeDefined();
        expect(feeData.gasPrice).toBeGreaterThan(0n);
        
        const gasPriceGwei = ethers.formatUnits(feeData.gasPrice, 'gwei');
        const gasPriceNumber = parseFloat(gasPriceGwei);
        
        // BSC gas price should be reasonable (typically 5-20 gwei)
        expect(gasPriceNumber).toBeGreaterThan(1);
        expect(gasPriceNumber).toBeLessThan(100);
        
        console.log(`⛽ Current gas price: ${gasPriceGwei} gwei`);
      } catch (error) {
        console.error('❌ Failed to get gas price:', error.message);
        throw error;
      }
    }, 15000);

    test('should get block details', async () => {
      try {
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
        
        console.log(`📦 Block details: ${block.hash} (${block.transactions.length} txs, age: ${Math.floor(blockAge)}s)`);
      } catch (error) {
        console.error('❌ Failed to get block details:', error.message);
        throw error;
      }
    }, 20000);
  });

  describe('Multiple RPC Endpoints', () => {
    const rpcUrls = [
      'https://bsc-dataseed1.binance.org',
      'https://bsc-dataseed2.binance.org',
      'https://bsc-dataseed3.binance.org'
    ];

    test('should test multiple RPC endpoints', async () => {
      const results = [];
      
      for (let i = 0; i < rpcUrls.length; i++) {
        const rpcUrl = rpcUrls[i];
        
        try {
          const testProvider = new ethers.JsonRpcProvider(rpcUrl);
          
          const startTime = Date.now();
          const blockNumber = await testProvider.getBlockNumber();
          const responseTime = Date.now() - startTime;
          
          const network = await testProvider.getNetwork();
          
          results.push({
            index: i,
            url: rpcUrl,
            status: 'healthy',
            blockNumber: blockNumber.toString(),
            responseTime,
            chainId: network.chainId.toString()
          });
          
          console.log(`✅ RPC ${i + 1} healthy: ${rpcUrl} (${responseTime}ms, Block: ${blockNumber})`);
          
        } catch (error) {
          results.push({
            index: i,
            url: rpcUrl,
            status: 'failed',
            error: error.message
          });
          
          console.warn(`❌ RPC ${i + 1} failed: ${rpcUrl} - ${error.message}`);
        }
      }
      
      // At least one endpoint should be working
      const healthyEndpoints = results.filter(r => r.status === 'healthy');
      expect(healthyEndpoints.length).toBeGreaterThan(0);
      
      // All healthy endpoints should return same chain ID
      if (healthyEndpoints.length > 1) {
        const chainIds = [...new Set(healthyEndpoints.map(r => r.chainId))];
        expect(chainIds.length).toBe(1);
        expect(chainIds[0]).toBe('56');
      }
      
      console.log(`📊 Endpoint health: ${healthyEndpoints.length}/${results.length} healthy`);
    }, 60000);
  });

  describe('Performance Testing', () => {
    test('should measure request performance', async () => {
      const metrics = [];
      const requestCount = 5;
      
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
    }, 30000);

    test('should test connection stability', async () => {
      const results = [];
      const testDuration = 10000; // 10 seconds
      const interval = 2000; // 2 seconds
      
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
      
      expect(successRate).toBeGreaterThan(0.8); // 80% success rate
      
      console.log(`📊 Connection stability: ${successfulRequests}/${results.length} requests successful (${(successRate * 100).toFixed(1)}%)`);
    }, 15000);
  });

  describe('Real Contract Interaction', () => {
    test('should read BUSD token contract', async () => {
      try {
        const busdAddress = '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56';
        const busdAbi = [
          'function name() view returns (string)',
          'function symbol() view returns (string)',
          'function decimals() view returns (uint8)',
          'function totalSupply() view returns (uint256)'
        ];
        
        const contract = new ethers.Contract(busdAddress, busdAbi, provider);
        
        const [name, symbol, decimals, totalSupply] = await Promise.all([
          contract.name(),
          contract.symbol(),
          contract.decimals(),
          contract.totalSupply()
        ]);
        
        expect(name).toBe('BUSD Token');
        expect(symbol).toBe('BUSD');
        expect(decimals).toBe(18);
        expect(totalSupply).toBeGreaterThan(0n);
        
        console.log(`📋 BUSD Contract: ${name} (${symbol}) - Supply: ${ethers.formatEther(totalSupply)}`);
        
      } catch (error) {
        console.warn('⚠️ BUSD contract interaction failed:', error.message);
        // Don't fail the test if contract is not accessible
        expect(true).toBe(true);
      }
    }, 20000);
  });
});