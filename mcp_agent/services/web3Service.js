/**
 * @fileoverview Enhanced Web3 Service
 * @description Comprehensive Web3 service with gas optimization, retry logic, and transaction monitoring
 */

import { EventEmitter } from 'events';
import { ethers } from 'ethers';
import GasOptimizer from './gasOptimizer.js';
import RetryManager from './retryManager.js';
import ConnectionPool from './connectionPool.js';

export class Web3Service extends EventEmitter {
  constructor(configManager, errorManager, options = {}) {
    super();
    
    this.configManager = configManager;
    this.errorManager = errorManager;
    
    // Configuration
    this.networks = options.networks || ['bscTestnet', 'bscMainnet'];
    this.defaultNetwork = options.defaultNetwork || 'bscTestnet';
    this.confirmations = options.confirmations || 1;
    this.timeout = options.timeout || 300000; // 5 minutes
    
    // Core components
    this.connectionPool = null;
    this.gasOptimizer = null;
    this.retryManager = null;
    
    // Contract instances
    this.contracts = new Map(); // contractAddress -> contract instance
    this.contractABIs = new Map(); // contractAddress -> ABI
    
    // Transaction tracking
    this.pendingTransactions = new Map();
    this.transactionHistory = [];
    this.maxHistorySize = 1000;
    
    // Metrics
    this.metrics = {
      totalTransactions: 0,
      successfulTransactions: 0,
      failedTransactions: 0,
      totalGasUsed: 0n,
      totalGasCost: 0n,
      averageGasPrice: 0n,
      networkSwitches: 0,
      contractCalls: 0,
      contractDeployments: 0
    };
    
    // Performance tracking
    this.transactionTimes = [];
    this.maxTimeSamples = 100;
    
    this.initialized = false;
  }

  /**
   * Initialize Web3 service
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      // Initialize connection pool
      this.connectionPool = new ConnectionPool({
        networks: this.networks,
        maxConnections: 10,
        healthCheckInterval: 30000
      });
      await this.connectionPool.initialize();

      // Initialize gas optimizer
      this.gasOptimizer = new GasOptimizer(this.connectionPool, {
        updateInterval: 30000,
        defaultStrategy: 'adaptive',
        maxGasPrice: ethers.parseUnits('100', 'gwei'),
        minGasPrice: ethers.parseUnits('1', 'gwei')
      });

      // Initialize retry manager
      this.retryManager = new RetryManager(this.connectionPool, this.gasOptimizer, {
        maxRetries: 5,
        baseDelay: 1000,
        maxDelay: 60000,
        confirmationTimeout: this.timeout
      });

      // Set up event listeners
      this.setupEventListeners();

      this.initialized = true;
      this.emit('web3:initialized');

    } catch (error) {
      this.emit('web3:initialization-failed', error);
      throw new Error(`Web3Service initialization failed: ${error.message}`);
    }
  }

  /**
   * Set up event listeners for components
   */
  setupEventListeners() {
    // Gas optimizer events
    this.gasOptimizer.on('gas:price-updated', (data) => {
      this.emit('gas:price-updated', data);
    });

    this.gasOptimizer.on('gas:estimation-failed', (data) => {
      this.emit('gas:estimation-failed', data);
    });

    // Retry manager events
    this.retryManager.on('transaction:completed', (data) => {
      this.updateTransactionMetrics(data, 'success');
      this.emit('transaction:completed', data);
    });

    this.retryManager.on('transaction:failed', (data) => {
      this.updateTransactionMetrics(data, 'failed');
      this.emit('transaction:failed', data);
    });

    this.retryManager.on('transaction:replaced', (data) => {
      this.emit('transaction:replaced', data);
    });

    // Connection pool events
    this.connectionPool.on('connection:failed', (data) => {
      this.emit('connection:failed', data);
    });

    this.connectionPool.on('connection:recovered', (data) => {
      this.emit('connection:recovered', data);
    });
  }

  /**
   * Execute contract function with retry and gas optimization
   */
  async executeContractFunction(contractAddress, functionName, params = [], options = {}) {
    const context = this.errorManager.createContext('contract-execution', `${contractAddress}.${functionName}`);
    
    try {
      const network = options.network || this.defaultNetwork;
      const contract = await this.getContract(contractAddress, network);
      
      if (!contract[functionName]) {
        throw new Error(`Function ${functionName} not found in contract`);
      }

      // Prepare transaction
      const transaction = await contract[functionName].populateTransaction(...params);
      transaction.to = contractAddress;

      // Add sender if provided
      if (options.from) {
        transaction.from = options.from;
      }

      // Execute with retry logic
      const result = await this.retryManager.executeWithRetry(network, transaction, {
        gasStrategy: options.gasStrategy || 'adaptive',
        confirmations: options.confirmations || this.confirmations,
        timeout: options.timeout || this.timeout,
        enableReplacement: options.enableReplacement !== false
      });

      this.metrics.contractCalls++;
      
      // Add to history
      this.addToHistory({
        type: 'contract-call',
        contractAddress,
        functionName,
        params,
        network,
        txHash: result.hash,
        gasUsed: result.gasUsed,
        gasPrice: result.effectiveGasPrice,
        timestamp: Date.now()
      });

      return result;

    } catch (error) {
      const errorResponse = this.errorManager.createErrorResponse(error, context);
      this.emit('contract:execution-failed', { contractAddress, functionName, error: errorResponse });
      throw error;
    }
  }

  /**
   * Deploy contract with gas optimization
   */
  async deployContract(bytecode, abi, constructorParams = [], options = {}) {
    const context = this.errorManager.createContext('contract-deployment', 'deploy');
    
    try {
      const network = options.network || this.defaultNetwork;
      
      // Create contract factory
      const factory = new ethers.ContractFactory(abi, bytecode);
      
      // Prepare deployment transaction
      const deployTransaction = await factory.getDeployTransaction(...constructorParams);
      
      // Add sender if provided
      if (options.from) {
        deployTransaction.from = options.from;
      }

      // Execute deployment with retry logic
      const result = await this.retryManager.executeWithRetry(network, deployTransaction, {
        gasStrategy: options.gasStrategy || 'standard',
        confirmations: options.confirmations || this.confirmations,
        timeout: options.timeout || this.timeout * 2, // Longer timeout for deployments
        enableReplacement: options.enableReplacement !== false
      });

      // Calculate contract address
      const contractAddress = ethers.getCreateAddress({
        from: deployTransaction.from,
        nonce: deployTransaction.nonce
      });

      // Store contract ABI
      this.contractABIs.set(contractAddress, abi);

      this.metrics.contractDeployments++;
      
      // Add to history
      this.addToHistory({
        type: 'contract-deployment',
        contractAddress,
        network,
        txHash: result.hash,
        gasUsed: result.gasUsed,
        gasPrice: result.effectiveGasPrice,
        timestamp: Date.now()
      });

      return {
        ...result,
        contractAddress
      };

    } catch (error) {
      const errorResponse = this.errorManager.createErrorResponse(error, context);
      this.emit('contract:deployment-failed', { error: errorResponse });
      throw error;
    }
  }

  /**
   * Send native token transfer with optimization
   */
  async sendTransaction(to, value, options = {}) {
    const context = this.errorManager.createContext('token-transfer', `${to}`);
    
    try {
      const network = options.network || this.defaultNetwork;
      
      // Prepare transaction
      const transaction = {
        to,
        value: ethers.parseEther(value.toString()),
        data: options.data || '0x'
      };

      // Add sender if provided
      if (options.from) {
        transaction.from = options.from;
      }

      // Execute with retry logic
      const result = await this.retryManager.executeWithRetry(network, transaction, {
        gasStrategy: options.gasStrategy || 'standard',
        confirmations: options.confirmations || this.confirmations,
        timeout: options.timeout || this.timeout,
        enableReplacement: options.enableReplacement !== false
      });

      // Add to history
      this.addToHistory({
        type: 'token-transfer',
        to,
        value,
        network,
        txHash: result.hash,
        gasUsed: result.gasUsed,
        gasPrice: result.effectiveGasPrice,
        timestamp: Date.now()
      });

      return result;

    } catch (error) {
      const errorResponse = this.errorManager.createErrorResponse(error, context);
      this.emit('transaction:send-failed', { to, value, error: errorResponse });
      throw error;
    }
  }

  /**
   * Get contract instance
   */
  async getContract(contractAddress, network) {
    const key = `${network}:${contractAddress}`;
    
    if (this.contracts.has(key)) {
      return this.contracts.get(key);
    }

    // Get ABI
    const abi = this.contractABIs.get(contractAddress);
    if (!abi) {
      throw new Error(`ABI not found for contract ${contractAddress}`);
    }

    // Get provider
    const provider = await this.connectionPool.getConnection(network);
    
    // Create contract instance
    const contract = new ethers.Contract(contractAddress, abi, provider);
    
    // Cache contract
    this.contracts.set(key, contract);
    
    return contract;
  }

  /**
   * Register contract ABI
   */
  registerContract(contractAddress, abi) {
    this.contractABIs.set(contractAddress, abi);
    this.emit('contract:registered', { contractAddress });
  }

  /**
   * Estimate gas for transaction
   */
  async estimateGas(network, transaction, options = {}) {
    return await this.gasOptimizer.estimateGas(network, transaction, options);
  }

  /**
   * Get gas price recommendations
   */
  async getGasPriceRecommendations(network) {
    return await this.gasOptimizer.getGasPriceRecommendations(network);
  }

  /**
   * Get network congestion status
   */
  getNetworkCongestion(network) {
    return this.gasOptimizer.getNetworkCongestion(network);
  }

  /**
   * Get transaction status
   */
  getTransactionStatus(txId) {
    return this.retryManager.getTransactionStatus(txId);
  }

  /**
   * Get all pending transactions
   */
  getPendingTransactions() {
    return this.retryManager.getPendingTransactions();
  }

  /**
   * Cancel transaction
   */
  async cancelTransaction(txId) {
    return await this.retryManager.cancelTransaction(txId);
  }

  /**
   * Switch network
   */
  async switchNetwork(network) {
    if (!this.networks.includes(network)) {
      throw new Error(`Unsupported network: ${network}`);
    }

    this.defaultNetwork = network;
    this.metrics.networkSwitches++;
    
    this.emit('network:switched', { network });
  }

  /**
   * Get network status
   */
  async getNetworkStatus(network) {
    try {
      const connection = await this.connectionPool.getConnection(network);
      const blockNumber = await connection.getBlockNumber();
      const gasPrice = await connection.getFeeData();
      
      return {
        network,
        connected: true,
        blockNumber,
        gasPrice: gasPrice.gasPrice,
        maxFeePerGas: gasPrice.maxFeePerGas,
        maxPriorityFeePerGas: gasPrice.maxPriorityFeePerGas,
        timestamp: Date.now()
      };
    } catch (error) {
      return {
        network,
        connected: false,
        error: error.message,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Get all network statuses
   */
  async getAllNetworkStatuses() {
    const statuses = {};
    
    for (const network of this.networks) {
      statuses[network] = await this.getNetworkStatus(network);
    }
    
    return statuses;
  }

  /**
   * Update transaction metrics
   */
  updateTransactionMetrics(data, status) {
    this.metrics.totalTransactions++;
    
    if (status === 'success') {
      this.metrics.successfulTransactions++;
      
      if (data.receipt) {
        this.metrics.totalGasUsed += BigInt(data.receipt.gasUsed || 0);
        this.metrics.totalGasCost += BigInt(data.receipt.gasUsed || 0) * BigInt(data.receipt.effectiveGasPrice || 0);
        
        // Update average gas price
        if (this.metrics.successfulTransactions > 0) {
          this.metrics.averageGasPrice = this.metrics.totalGasCost / this.metrics.totalGasUsed;
        }
      }
    } else {
      this.metrics.failedTransactions++;
    }

    // Update transaction time
    if (data.totalTime) {
      this.transactionTimes.push(data.totalTime);
      
      if (this.transactionTimes.length > this.maxTimeSamples) {
        this.transactionTimes.shift();
      }
    }
  }

  /**
   * Add transaction to history
   */
  addToHistory(transaction) {
    this.transactionHistory.push(transaction);
    
    if (this.transactionHistory.length > this.maxHistorySize) {
      this.transactionHistory.shift();
    }
  }

  /**
   * Get transaction history
   */
  getTransactionHistory(limit = 50) {
    return this.transactionHistory.slice(-limit);
  }

  /**
   * Get service statistics
   */
  getStats() {
    const successRate = this.metrics.totalTransactions > 0 ? 
      (this.metrics.successfulTransactions / this.metrics.totalTransactions) * 100 : 0;
    
    const averageTransactionTime = this.transactionTimes.length > 0 ?
      this.transactionTimes.reduce((a, b) => a + b, 0) / this.transactionTimes.length : 0;

    return {
      ...this.metrics,
      successRate,
      averageTransactionTime,
      averageGasPriceGwei: this.metrics.averageGasPrice > 0n ? 
        Number(ethers.formatUnits(this.metrics.averageGasPrice, 'gwei')) : 0,
      totalGasCostEth: Number(ethers.formatEther(this.metrics.totalGasCost)),
      registeredContracts: this.contractABIs.size,
      cachedContracts: this.contracts.size,
      transactionHistorySize: this.transactionHistory.length,
      supportedNetworks: this.networks,
      defaultNetwork: this.defaultNetwork,
      gasOptimizer: this.gasOptimizer?.getStats(),
      retryManager: this.retryManager?.getStats(),
      connectionPool: this.connectionPool?.getStats()
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      if (!this.initialized) {
        return { healthy: false, message: 'Service not initialized' };
      }

      // Check connection pool
      const poolHealth = await this.connectionPool.healthCheck();
      if (!poolHealth.healthy) {
        return { healthy: false, message: 'Connection pool unhealthy', details: poolHealth };
      }

      // Check at least one network connection
      const networkStatuses = await this.getAllNetworkStatuses();
      const connectedNetworks = Object.values(networkStatuses).filter(status => status.connected);
      
      if (connectedNetworks.length === 0) {
        return { healthy: false, message: 'No network connections available' };
      }

      return {
        healthy: true,
        message: `Connected to ${connectedNetworks.length}/${this.networks.length} networks`,
        details: {
          networks: networkStatuses,
          metrics: this.getStats()
        }
      };

    } catch (error) {
      return {
        healthy: false,
        message: 'Health check failed',
        error: error.message
      };
    }
  }

  /**
   * Shutdown service
   */
  async shutdown() {
    try {
      // Shutdown components
      if (this.gasOptimizer) {
        this.gasOptimizer.shutdown();
      }
      
      if (this.retryManager) {
        this.retryManager.shutdown();
      }
      
      if (this.connectionPool) {
        await this.connectionPool.shutdown();
      }

      // Clear caches
      this.contracts.clear();
      this.contractABIs.clear();
      this.pendingTransactions.clear();
      this.transactionHistory.length = 0;

      this.initialized = false;
      this.emit('web3:shutdown');

    } catch (error) {
      this.emit('web3:shutdown-failed', error);
      throw error;
    }
  }
}

export default Web3Service;