/**
 * @fileoverview Mainnet Testing Utilities and Helpers
 * @description Common utilities for mainnet testing with real data validation
 * @author AION Team
 */

import { ethers } from 'ethers';
import axios from 'axios';
import { MAINNET_TEST_CONFIG } from '../config/mainnet-test-config.js';

export class MainnetTestHelpers {
  constructor() {
    this.config = MAINNET_TEST_CONFIG;
    this.providers = new Map();
    this.metrics = {
      requests: 0,
      errors: 0,
      responseTime: [],
      startTime: Date.now()
    };
  }

  /**
   * Initialize blockchain providers for testing
   */
  async initializeProviders() {
    const networkConfig = this.config.networks.bscMainnet;
    
    for (let i = 0; i < networkConfig.rpcUrls.length; i++) {
      const rpcUrl = networkConfig.rpcUrls[i];
      try {
        const provider = new ethers.JsonRpcProvider(rpcUrl);
        
        // Test connection
        const blockNumber = await provider.getBlockNumber();
        if (blockNumber > 0) {
          this.providers.set(`provider_${i}`, provider);
          console.log(`✅ Provider ${i} connected: ${rpcUrl} (Block: ${blockNumber})`);
        }
      } catch (error) {
        console.warn(`⚠️ Provider ${i} failed: ${rpcUrl} - ${error.message}`);
      }
    }

    if (this.providers.size === 0) {
      throw new Error('❌ No RPC providers available for testing');
    }

    return this.providers;
  }

  /**
   * Get a working provider with failover
   */
  getProvider() {
    const providers = Array.from(this.providers.values());
    if (providers.length === 0) {
      throw new Error('No providers available');
    }
    return providers[0]; // Return first working provider
  }

  /**
   * Validate BNB price data
   */
  validateBNBPrice(price) {
    const validation = this.config.validation.bnbPrice;
    
    if (typeof price !== 'number') {
      throw new Error(`Invalid BNB price type: expected number, got ${typeof price}`);
    }
    
    if (price < validation.min || price > validation.max) {
      throw new Error(`BNB price out of range: ${price} (expected ${validation.min}-${validation.max})`);
    }
    
    return true;
  }

  /**
   * Validate APY data
   */
  validateAPY(apy) {
    const validation = this.config.validation.apy;
    
    if (typeof apy !== 'number') {
      throw new Error(`Invalid APY type: expected number, got ${typeof apy}`);
    }
    
    if (apy < validation.min || apy > validation.max) {
      throw new Error(`APY out of range: ${apy} (expected ${validation.min}-${validation.max})`);
    }
    
    return true;
  }

  /**
   * Validate TVL data
   */
  validateTVL(tvl) {
    const validation = this.config.validation.tvl;
    
    if (typeof tvl !== 'number') {
      throw new Error(`Invalid TVL type: expected number, got ${typeof tvl}`);
    }
    
    if (tvl < validation.min) {
      throw new Error(`TVL too low: ${tvl} (expected minimum ${validation.min})`);
    }
    
    return true;
  }

  /**
   * Validate timestamp freshness
   */
  validateTimestamp(timestamp) {
    const validation = this.config.validation.timestamp;
    
    if (!timestamp) {
      throw new Error('Timestamp is required');
    }
    
    const timestampMs = new Date(timestamp).getTime();
    const now = Date.now();
    const age = now - timestampMs;
    
    if (age > validation.maxAge) {
      throw new Error(`Data too old: ${age}ms (max age: ${validation.maxAge}ms)`);
    }
    
    return true;
  }

  /**
   * Make HTTP request with retry logic
   */
  async makeRequest(url, options = {}) {
    const startTime = Date.now();
    let lastError;
    
    for (let attempt = 1; attempt <= this.config.retry.maxAttempts; attempt++) {
      try {
        this.metrics.requests++;
        
        const response = await axios({
          url,
          timeout: this.config.timeouts.integration,
          ...options
        });
        
        const responseTime = Date.now() - startTime;
        this.metrics.responseTime.push(responseTime);
        
        return response;
        
      } catch (error) {
        lastError = error;
        this.metrics.errors++;
        
        if (attempt < this.config.retry.maxAttempts) {
          const delay = this.config.retry.initialDelay * Math.pow(this.config.retry.backoffMultiplier, attempt - 1);
          console.warn(`⚠️ Request failed (attempt ${attempt}), retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Fetch real BNB price from Binance
   */
  async fetchRealBNBPrice() {
    const url = `${this.config.apis.binance.baseUrl}${this.config.apis.binance.endpoints.price}?symbol=BNBUSDT`;
    
    try {
      const response = await this.makeRequest(url);
      const price = parseFloat(response.data.price);
      
      this.validateBNBPrice(price);
      
      return {
        price,
        source: 'binance',
        timestamp: new Date().toISOString(),
        symbol: 'BNBUSDT'
      };
    } catch (error) {
      throw new Error(`Failed to fetch BNB price: ${error.message}`);
    }
  }

  /**
   * Fetch real protocol data from DeFiLlama
   */
  async fetchProtocolData(protocolName) {
    const url = `${this.config.apis.defillama.baseUrl}${this.config.apis.defillama.endpoints.protocols}`;
    
    try {
      const response = await this.makeRequest(url);
      const protocols = response.data;
      
      const protocol = protocols.find(p => 
        p.name.toLowerCase().includes(protocolName.toLowerCase()) &&
        p.chains && p.chains.includes('BSC')
      );
      
      if (!protocol) {
        throw new Error(`Protocol ${protocolName} not found on BSC`);
      }
      
      this.validateTVL(protocol.tvl);
      
      return {
        name: protocol.name,
        tvl: protocol.tvl,
        category: protocol.category,
        chains: protocol.chains,
        source: 'defillama',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to fetch protocol data: ${error.message}`);
    }
  }

  /**
   * Read contract data from mainnet
   */
  async readContractData(contractAddress, abi, methodName, params = []) {
    try {
      const provider = this.getProvider();
      const contract = new ethers.Contract(contractAddress, abi, provider);
      
      const result = await contract[methodName](...params);
      
      return {
        contractAddress,
        methodName,
        result,
        blockNumber: await provider.getBlockNumber(),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to read contract data: ${error.message}`);
    }
  }

  /**
   * Estimate gas for transaction
   */
  async estimateGas(transaction) {
    try {
      const provider = this.getProvider();
      const gasEstimate = await provider.estimateGas(transaction);
      
      return {
        gasEstimate: gasEstimate.toString(),
        transaction,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to estimate gas: ${error.message}`);
    }
  }

  /**
   * Get current gas price
   */
  async getCurrentGasPrice() {
    try {
      const provider = this.getProvider();
      const feeData = await provider.getFeeData();
      
      const gasPrice = feeData.gasPrice;
      const validation = this.config.validation.gasPrice;
      
      if (gasPrice < validation.min || gasPrice > validation.max) {
        console.warn(`⚠️ Gas price out of expected range: ${ethers.formatUnits(gasPrice, 'gwei')} gwei`);
      }
      
      return {
        gasPrice: gasPrice.toString(),
        gasPriceGwei: ethers.formatUnits(gasPrice, 'gwei'),
        maxFeePerGas: feeData.maxFeePerGas?.toString(),
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas?.toString(),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to get gas price: ${error.message}`);
    }
  }

  /**
   * Validate protocol health data
   */
  validateProtocolHealth(healthData) {
    const validStatuses = ['healthy', 'warning', 'critical'];
    
    if (!healthData.status || !validStatuses.includes(healthData.status)) {
      throw new Error(`Invalid health status: ${healthData.status}`);
    }
    
    if (healthData.apy !== undefined) {
      this.validateAPY(healthData.apy);
    }
    
    if (healthData.tvl !== undefined) {
      this.validateTVL(healthData.tvl);
    }
    
    return true;
  }

  /**
   * Measure performance metrics
   */
  measurePerformance(fn) {
    return async (...args) => {
      const startTime = Date.now();
      const startMemory = process.memoryUsage();
      
      try {
        const result = await fn(...args);
        const endTime = Date.now();
        const endMemory = process.memoryUsage();
        
        const metrics = {
          duration: endTime - startTime,
          memoryDelta: {
            rss: endMemory.rss - startMemory.rss,
            heapUsed: endMemory.heapUsed - startMemory.heapUsed,
            heapTotal: endMemory.heapTotal - startMemory.heapTotal
          },
          success: true
        };
        
        return { result, metrics };
      } catch (error) {
        const endTime = Date.now();
        
        const metrics = {
          duration: endTime - startTime,
          success: false,
          error: error.message
        };
        
        return { error, metrics };
      }
    };
  }

  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get test metrics
   */
  getMetrics() {
    const avgResponseTime = this.metrics.responseTime.length > 0 
      ? this.metrics.responseTime.reduce((a, b) => a + b, 0) / this.metrics.responseTime.length 
      : 0;
    
    return {
      totalRequests: this.metrics.requests,
      totalErrors: this.metrics.errors,
      errorRate: this.metrics.requests > 0 ? this.metrics.errors / this.metrics.requests : 0,
      averageResponseTime: avgResponseTime,
      uptime: Date.now() - this.metrics.startTime,
      providersAvailable: this.providers.size
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics() {
    this.metrics = {
      requests: 0,
      errors: 0,
      responseTime: [],
      startTime: Date.now()
    };
  }
}

export default MainnetTestHelpers;