/**
 * @fileoverview Advanced Gas Optimizer
 * @description Dynamic gas estimation and optimization with network congestion monitoring
 */

import { EventEmitter } from 'events';
import { ethers } from 'ethers';

export class GasOptimizer extends EventEmitter {
  constructor(connectionPool, options = {}) {
    super();
    
    this.connectionPool = connectionPool;
    this.updateInterval = options.updateInterval || 30000; // 30 seconds
    this.historySize = options.historySize || 100;
    this.safetyMultiplier = options.safetyMultiplier || 1.1;
    this.maxGasPrice = options.maxGasPrice || ethers.parseUnits('100', 'gwei');
    this.minGasPrice = options.minGasPrice || ethers.parseUnits('1', 'gwei');
    
    // Gas price history and analytics
    this.gasPriceHistory = new Map(); // network -> history
    this.networkCongestion = new Map(); // network -> congestion data
    this.gasEstimateCache = new Map(); // cacheKey -> estimate
    this.cacheTimeout = 60000; // 1 minute
    
    // Gas price strategies
    this.strategies = {
      'conservative': this.conservativeStrategy.bind(this),
      'standard': this.standardStrategy.bind(this),
      'fast': this.fastStrategy.bind(this),
      'aggressive': this.aggressiveStrategy.bind(this),
      'adaptive': this.adaptiveStrategy.bind(this)
    };
    
    this.defaultStrategy = options.defaultStrategy || 'adaptive';
    
    // Metrics
    this.metrics = {
      estimationsPerformed: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageEstimationTime: 0,
      gasOptimizationSavings: 0,
      failedTransactions: 0
    };
    
    // Performance tracking
    this.estimationTimes = [];
    this.maxEstimationSamples = 100;
    
    // Start monitoring
    this.startGasMonitoring();
  }

  /**
   * Start gas price monitoring
   */
  startGasMonitoring() {
    this.monitoringInterval = setInterval(async () => {
      await this.updateGasPrices();
      await this.analyzeNetworkCongestion();
    }, this.updateInterval);

    this.emit('gas:monitoring-started');
  }

  /**
   * Update gas prices for all networks
   */
  async updateGasPrices() {
    const networks = ['bscTestnet', 'bscMainnet']; // Add more networks as needed
    
    for (const network of networks) {
      try {
        const gasPrice = await this.getCurrentGasPrice(network);
        this.addGasPriceToHistory(network, gasPrice);
        
        this.emit('gas:price-updated', { network, gasPrice });
      } catch (error) {
        console.warn(`Failed to update gas price for ${network}:`, error.message);
      }
    }
  }

  /**
   * Get current gas price from network
   */
  async getCurrentGasPrice(network) {
    try {
      const result = await this.connectionPool.executeRequest(network, 'eth_gasPrice');
      return BigInt(result);
    } catch (error) {
      // Fallback to cached data or default
      const history = this.gasPriceHistory.get(network);
      if (history && history.length > 0) {
        return history[history.length - 1].gasPrice;
      }
      
      // Default gas prices by network
      const defaults = {
        'bscTestnet': ethers.parseUnits('10', 'gwei'),
        'bscMainnet': ethers.parseUnits('5', 'gwei')
      };
      
      return defaults[network] || ethers.parseUnits('20', 'gwei');
    }
  }

  /**
   * Add gas price to history
   */
  addGasPriceToHistory(network, gasPrice) {
    if (!this.gasPriceHistory.has(network)) {
      this.gasPriceHistory.set(network, []);
    }
    
    const history = this.gasPriceHistory.get(network);
    history.push({
      gasPrice,
      timestamp: Date.now(),
      blockNumber: null // Could be populated if needed
    });
    
    // Maintain history size
    if (history.length > this.historySize) {
      history.shift();
    }
  }

  /**
   * Analyze network congestion
   */
  async analyzeNetworkCongestion() {
    const networks = ['bscTestnet', 'bscMainnet'];
    
    for (const network of networks) {
      try {
        const congestionData = await this.calculateNetworkCongestion(network);
        this.networkCongestion.set(network, congestionData);
        
        this.emit('gas:congestion-updated', { network, congestion: congestionData });
      } catch (error) {
        console.warn(`Failed to analyze congestion for ${network}:`, error.message);
      }
    }
  }

  /**
   * Calculate network congestion metrics
   */
  async calculateNetworkCongestion(network) {
    try {
      // Get recent blocks to analyze congestion
      const latestBlockNumber = await this.connectionPool.executeRequest(network, 'eth_blockNumber');
      const latestBlock = parseInt(latestBlockNumber, 16);
      
      const blocks = [];
      const blockPromises = [];
      
      // Get last 5 blocks
      for (let i = 0; i < 5; i++) {
        const blockNumber = `0x${(latestBlock - i).toString(16)}`;
        blockPromises.push(
          this.connectionPool.executeRequest(network, 'eth_getBlockByNumber', [blockNumber, false])
        );
      }
      
      const blockResults = await Promise.all(blockPromises);
      
      // Analyze blocks
      let totalGasUsed = 0;
      let totalGasLimit = 0;
      let avgGasPrice = 0;
      
      for (const block of blockResults) {
        if (block) {
          totalGasUsed += parseInt(block.gasUsed, 16);
          totalGasLimit += parseInt(block.gasLimit, 16);
          
          // Estimate average gas price from transactions
          if (block.transactions && block.transactions.length > 0) {
            // This is simplified - in reality you'd need full transaction data
            avgGasPrice += parseInt(block.gasUsed, 16) / block.transactions.length;
          }
        }
      }
      
      const utilizationRate = totalGasLimit > 0 ? (totalGasUsed / totalGasLimit) : 0;
      const congestionLevel = this.calculateCongestionLevel(utilizationRate);
      
      return {
        utilizationRate,
        congestionLevel,
        avgGasPrice: avgGasPrice / blockResults.length,
        blockCount: blockResults.length,
        timestamp: Date.now()
      };
      
    } catch (error) {
      return {
        utilizationRate: 0.5, // Default moderate congestion
        congestionLevel: 'moderate',
        avgGasPrice: 0,
        blockCount: 0,
        timestamp: Date.now(),
        error: error.message
      };
    }
  }

  /**
   * Calculate congestion level from utilization rate
   */
  calculateCongestionLevel(utilizationRate) {
    if (utilizationRate < 0.3) return 'low';
    if (utilizationRate < 0.6) return 'moderate';
    if (utilizationRate < 0.8) return 'high';
    return 'extreme';
  }

  /**
   * Estimate gas for transaction
   */
  async estimateGas(network, transaction, options = {}) {
    const startTime = Date.now();
    const strategy = options.strategy || this.defaultStrategy;
    const cacheKey = this.generateCacheKey(network, transaction, strategy);
    
    try {
      // Check cache first
      const cached = this.gasEstimateCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
        this.metrics.cacheHits++;
        return cached.estimate;
      }
      
      this.metrics.cacheMisses++;
      
      // Estimate gas limit
      const gasLimit = await this.estimateGasLimit(network, transaction);
      
      // Get optimized gas price
      const gasPrice = await this.getOptimizedGasPrice(network, strategy, options);
      
      const estimate = {
        gasLimit,
        gasPrice,
        maxFeePerGas: gasPrice, // For EIP-1559 compatibility
        maxPriorityFeePerGas: gasPrice / 10n, // 10% of max fee as priority
        estimatedCost: gasLimit * gasPrice,
        strategy,
        network,
        timestamp: Date.now()
      };
      
      // Cache the estimate
      this.gasEstimateCache.set(cacheKey, {
        estimate,
        timestamp: Date.now()
      });
      
      // Update metrics
      const estimationTime = Date.now() - startTime;
      this.updateEstimationTime(estimationTime);
      this.metrics.estimationsPerformed++;
      
      this.emit('gas:estimated', { network, strategy, estimate, estimationTime });
      
      return estimate;
      
    } catch (error) {
      this.emit('gas:estimation-failed', { network, transaction, error });
      throw error;
    }
  }

  /**
   * Estimate gas limit for transaction
   */
  async estimateGasLimit(network, transaction) {
    try {
      // Use eth_estimateGas
      const estimated = await this.connectionPool.executeRequest(
        network, 
        'eth_estimateGas', 
        [transaction]
      );
      
      const gasLimit = BigInt(estimated);
      
      // Apply safety multiplier
      const safeGasLimit = BigInt(Math.floor(Number(gasLimit) * this.safetyMultiplier));
      
      return safeGasLimit;
      
    } catch (error) {
      // Fallback to default gas limits based on transaction type
      return this.getDefaultGasLimit(transaction);
    }
  }

  /**
   * Get default gas limit based on transaction type
   */
  getDefaultGasLimit(transaction) {
    if (transaction.data && transaction.data !== '0x') {
      // Contract interaction
      if (transaction.data.length > 1000) {
        return 500000n; // Complex contract call
      } else {
        return 200000n; // Simple contract call
      }
    } else {
      // Simple transfer
      return 21000n;
    }
  }

  /**
   * Get optimized gas price using specified strategy
   */
  async getOptimizedGasPrice(network, strategy, options = {}) {
    const strategyFunction = this.strategies[strategy];
    if (!strategyFunction) {
      throw new Error(`Unknown gas price strategy: ${strategy}`);
    }
    
    return await strategyFunction(network, options);
  }

  /**
   * Conservative strategy - lowest safe gas price
   */
  async conservativeStrategy(network, options = {}) {
    const currentGasPrice = await this.getCurrentGasPrice(network);
    const history = this.gasPriceHistory.get(network) || [];
    
    if (history.length < 5) {
      return currentGasPrice;
    }
    
    // Use 25th percentile of recent prices
    const recentPrices = history.slice(-20).map(h => h.gasPrice).sort((a, b) => Number(a - b));
    const percentile25 = recentPrices[Math.floor(recentPrices.length * 0.25)];
    
    return this.clampGasPrice(percentile25);
  }

  /**
   * Standard strategy - median gas price
   */
  async standardStrategy(network, options = {}) {
    const currentGasPrice = await this.getCurrentGasPrice(network);
    const history = this.gasPriceHistory.get(network) || [];
    
    if (history.length < 5) {
      return currentGasPrice;
    }
    
    // Use median of recent prices
    const recentPrices = history.slice(-20).map(h => h.gasPrice).sort((a, b) => Number(a - b));
    const median = recentPrices[Math.floor(recentPrices.length / 2)];
    
    return this.clampGasPrice(median);
  }

  /**
   * Fast strategy - higher gas price for faster confirmation
   */
  async fastStrategy(network, options = {}) {
    const currentGasPrice = await this.getCurrentGasPrice(network);
    const history = this.gasPriceHistory.get(network) || [];
    
    if (history.length < 5) {
      return currentGasPrice * 12n / 10n; // 20% higher
    }
    
    // Use 75th percentile of recent prices
    const recentPrices = history.slice(-20).map(h => h.gasPrice).sort((a, b) => Number(a - b));
    const percentile75 = recentPrices[Math.floor(recentPrices.length * 0.75)];
    
    return this.clampGasPrice(percentile75 * 11n / 10n); // 10% higher than 75th percentile
  }

  /**
   * Aggressive strategy - highest gas price for immediate confirmation
   */
  async aggressiveStrategy(network, options = {}) {
    const currentGasPrice = await this.getCurrentGasPrice(network);
    const history = this.gasPriceHistory.get(network) || [];
    
    if (history.length < 5) {
      return currentGasPrice * 15n / 10n; // 50% higher
    }
    
    // Use 95th percentile of recent prices
    const recentPrices = history.slice(-20).map(h => h.gasPrice).sort((a, b) => Number(a - b));
    const percentile95 = recentPrices[Math.floor(recentPrices.length * 0.95)];
    
    return this.clampGasPrice(percentile95 * 12n / 10n); // 20% higher than 95th percentile
  }

  /**
   * Adaptive strategy - adjusts based on network congestion
   */
  async adaptiveStrategy(network, options = {}) {
    const currentGasPrice = await this.getCurrentGasPrice(network);
    const congestion = this.networkCongestion.get(network);
    
    if (!congestion) {
      return currentGasPrice;
    }
    
    // Adjust multiplier based on congestion
    let multiplier = 1.0;
    switch (congestion.congestionLevel) {
      case 'low':
        multiplier = 0.9;
        break;
      case 'moderate':
        multiplier = 1.0;
        break;
      case 'high':
        multiplier = 1.2;
        break;
      case 'extreme':
        multiplier = 1.5;
        break;
    }
    
    // Apply urgency modifier if specified
    if (options.urgency) {
      switch (options.urgency) {
        case 'low':
          multiplier *= 0.8;
          break;
        case 'high':
          multiplier *= 1.3;
          break;
        case 'critical':
          multiplier *= 1.6;
          break;
      }
    }
    
    const adjustedPrice = BigInt(Math.floor(Number(currentGasPrice) * multiplier));
    return this.clampGasPrice(adjustedPrice);
  }

  /**
   * Clamp gas price to min/max bounds
   */
  clampGasPrice(gasPrice) {
    if (gasPrice < this.minGasPrice) {
      return this.minGasPrice;
    }
    if (gasPrice > this.maxGasPrice) {
      return this.maxGasPrice;
    }
    return gasPrice;
  }

  /**
   * Generate cache key for gas estimate
   */
  generateCacheKey(network, transaction, strategy) {
    const txHash = JSON.stringify({
      to: transaction.to,
      data: transaction.data,
      value: transaction.value
    });
    
    return `${network}:${strategy}:${Buffer.from(txHash).toString('base64')}`;
  }

  /**
   * Update estimation time metrics
   */
  updateEstimationTime(time) {
    this.estimationTimes.push(time);
    
    if (this.estimationTimes.length > this.maxEstimationSamples) {
      this.estimationTimes.shift();
    }
    
    this.metrics.averageEstimationTime = 
      this.estimationTimes.reduce((a, b) => a + b, 0) / this.estimationTimes.length;
  }

  /**
   * Get gas price recommendations
   */
  async getGasPriceRecommendations(network) {
    const recommendations = {};
    
    for (const [strategy, func] of Object.entries(this.strategies)) {
      try {
        recommendations[strategy] = await func(network);
      } catch (error) {
        console.warn(`Failed to get ${strategy} recommendation:`, error.message);
      }
    }
    
    return recommendations;
  }

  /**
   * Get network congestion status
   */
  getNetworkCongestion(network) {
    return this.networkCongestion.get(network) || {
      utilizationRate: 0.5,
      congestionLevel: 'unknown',
      timestamp: Date.now()
    };
  }

  /**
   * Get gas price history
   */
  getGasPriceHistory(network, limit = 50) {
    const history = this.gasPriceHistory.get(network) || [];
    return history.slice(-limit);
  }

  /**
   * Get optimizer statistics
   */
  getStats() {
    const cacheSize = this.gasEstimateCache.size;
    const hitRate = this.metrics.cacheHits + this.metrics.cacheMisses > 0 ? 
      (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)) * 100 : 0;
    
    return {
      ...this.metrics,
      cacheSize,
      hitRate,
      networksMonitored: this.gasPriceHistory.size,
      strategies: Object.keys(this.strategies)
    };
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.gasEstimateCache.clear();
    this.emit('gas:cache-cleared');
  }

  /**
   * Shutdown gas optimizer
   */
  shutdown() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    this.clearCache();
    this.gasPriceHistory.clear();
    this.networkCongestion.clear();
    
    this.emit('gas:shutdown');
  }
}

export default GasOptimizer;