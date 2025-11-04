/**
 * @fileoverview Advanced Retry Manager
 * @description Transaction retry with exponential backoff, monitoring, and replacement strategies
 */

import { EventEmitter } from 'events';
import { ethers } from 'ethers';

export class RetryManager extends EventEmitter {
  constructor(connectionPool, gasOptimizer, options = {}) {
    super();
    
    this.connectionPool = connectionPool;
    this.gasOptimizer = gasOptimizer;
    
    // Configuration
    this.maxRetries = options.maxRetries || 5;
    this.baseDelay = options.baseDelay || 1000; // 1 second
    this.maxDelay = options.maxDelay || 60000; // 1 minute
    this.backoffMultiplier = options.backoffMultiplier || 2;
    this.jitterFactor = options.jitterFactor || 0.1;
    this.confirmationTimeout = options.confirmationTimeout || 300000; // 5 minutes
    this.replacementGasMultiplier = options.replacementGasMultiplier || 1.1; // 10% increase
    this.maxReplacementAttempts = options.maxReplacementAttempts || 3;
    
    // Transaction tracking
    this.pendingTransactions = new Map(); // txHash -> transaction data
    this.retryQueue = new Map(); // txHash -> retry data
    this.monitoringQueue = new Map(); // txHash -> monitoring data
    
    // Metrics
    this.metrics = {
      totalTransactions: 0,
      successfulTransactions: 0,
      failedTransactions: 0,
      retriedTransactions: 0,
      replacedTransactions: 0,
      averageConfirmationTime: 0,
      timeoutTransactions: 0
    };
    
    // Performance tracking
    this.confirmationTimes = [];
    this.maxConfirmationSamples = 100;
    
    // Start monitoring
    this.startTransactionMonitoring();
  }

  /**
   * Execute transaction with retry logic
   */
  async executeWithRetry(network, transaction, options = {}) {
    const txId = this.generateTransactionId();
    const retryOptions = {
      maxRetries: options.maxRetries || this.maxRetries,
      strategy: options.retryStrategy || 'exponential-backoff',
      gasStrategy: options.gasStrategy || 'adaptive',
      enableReplacement: options.enableReplacement !== false,
      confirmations: options.confirmations || 1,
      timeout: options.timeout || this.confirmationTimeout,
      ...options
    };

    this.metrics.totalTransactions++;

    const txData = {
      id: txId,
      network,
      transaction,
      options: retryOptions,
      attempts: 0,
      startTime: Date.now(),
      lastAttemptTime: null,
      status: 'pending',
      txHash: null,
      receipt: null,
      error: null
    };

    this.emit('transaction:started', { txId, network, transaction });

    try {
      const result = await this.attemptTransaction(txData);
      
      this.metrics.successfulTransactions++;
      this.updateConfirmationTime(Date.now() - txData.startTime);
      
      this.emit('transaction:completed', { 
        txId, 
        txHash: result.hash, 
        receipt: result.receipt,
        attempts: txData.attempts 
      });

      return result;

    } catch (error) {
      this.metrics.failedTransactions++;
      txData.status = 'failed';
      txData.error = error;

      this.emit('transaction:failed', { 
        txId, 
        error, 
        attempts: txData.attempts,
        totalTime: Date.now() - txData.startTime 
      });

      throw error;
    } finally {
      this.pendingTransactions.delete(txId);
      this.retryQueue.delete(txId);
    }
  }

  /**
   * Attempt transaction execution
   */
  async attemptTransaction(txData) {
    const { network, transaction, options } = txData;
    
    while (txData.attempts < options.maxRetries) {
      txData.attempts++;
      txData.lastAttemptTime = Date.now();

      try {
        // Get optimized gas parameters
        const gasEstimate = await this.gasOptimizer.estimateGas(
          network, 
          transaction, 
          { strategy: options.gasStrategy }
        );

        // Prepare transaction with gas parameters
        const txWithGas = {
          ...transaction,
          gasLimit: gasEstimate.gasLimit,
          gasPrice: gasEstimate.gasPrice,
          maxFeePerGas: gasEstimate.maxFeePerGas,
          maxPriorityFeePerGas: gasEstimate.maxPriorityFeePerGas
        };

        // Send transaction
        const txHash = await this.sendTransaction(network, txWithGas);
        txData.txHash = txHash;
        txData.status = 'sent';

        this.emit('transaction:sent', { 
          txId: txData.id, 
          txHash, 
          attempt: txData.attempts,
          gasPrice: gasEstimate.gasPrice 
        });

        // Start monitoring
        this.startTransactionMonitoring(txData);

        // Wait for confirmation
        const receipt = await this.waitForConfirmation(txData);
        
        txData.receipt = receipt;
        txData.status = 'confirmed';

        return {
          hash: txHash,
          receipt,
          gasUsed: receipt.gasUsed,
          effectiveGasPrice: receipt.effectiveGasPrice || gasEstimate.gasPrice
        };

      } catch (error) {
        this.emit('transaction:attempt-failed', { 
          txId: txData.id, 
          attempt: txData.attempts, 
          error: error.message 
        });

        // Check if we should retry
        if (!this.shouldRetry(error, txData.attempts, options.maxRetries)) {
          throw error;
        }

        // Handle stuck transaction
        if (this.isTransactionStuck(error) && options.enableReplacement && txData.txHash) {
          try {
            await this.replaceTransaction(txData);
            continue; // Try again with replacement
          } catch (replacementError) {
            console.warn('Transaction replacement failed:', replacementError.message);
          }
        }

        // Wait before retry
        await this.waitForRetry(txData.attempts, options.strategy);
        
        this.metrics.retriedTransactions++;
      }
    }

    throw new Error(`Transaction failed after ${options.maxRetries} attempts`);
  }

  /**
   * Send transaction to network
   */
  async sendTransaction(network, transaction) {
    try {
      const txHash = await this.connectionPool.executeRequest(
        network, 
        'eth_sendTransaction', 
        [transaction]
      );
      
      return txHash;
    } catch (error) {
      // Handle specific error types
      if (error.message.includes('nonce too low')) {
        throw new Error('NONCE_TOO_LOW');
      } else if (error.message.includes('insufficient funds')) {
        throw new Error('INSUFFICIENT_FUNDS');
      } else if (error.message.includes('gas price too low')) {
        throw new Error('GAS_PRICE_TOO_LOW');
      } else if (error.message.includes('already known')) {
        throw new Error('TRANSACTION_ALREADY_KNOWN');
      }
      
      throw error;
    }
  }

  /**
   * Start monitoring transaction
   */
  startTransactionMonitoring(txData) {
    const monitoringData = {
      txId: txData.id,
      txHash: txData.txHash,
      network: txData.network,
      startTime: Date.now(),
      lastCheck: Date.now(),
      checkCount: 0
    };

    this.monitoringQueue.set(txData.txHash, monitoringData);
    this.pendingTransactions.set(txData.id, txData);
  }

  /**
   * Wait for transaction confirmation
   */
  async waitForConfirmation(txData) {
    const { txHash, network, options } = txData;
    const startTime = Date.now();
    const timeout = options.timeout;
    const requiredConfirmations = options.confirmations;

    while (Date.now() - startTime < timeout) {
      try {
        // Get transaction receipt
        const receipt = await this.connectionPool.executeRequest(
          network, 
          'eth_getTransactionReceipt', 
          [txHash]
        );

        if (receipt) {
          // Check if transaction was successful
          if (receipt.status === '0x0') {
            throw new Error('Transaction reverted');
          }

          // Check confirmations
          const currentBlock = await this.connectionPool.executeRequest(
            network, 
            'eth_blockNumber'
          );
          
          const confirmations = parseInt(currentBlock, 16) - parseInt(receipt.blockNumber, 16) + 1;
          
          if (confirmations >= requiredConfirmations) {
            this.monitoringQueue.delete(txHash);
            return receipt;
          }

          this.emit('transaction:confirmation', { 
            txId: txData.id, 
            txHash, 
            confirmations, 
            required: requiredConfirmations 
          });
        }

        // Wait before next check
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 seconds

      } catch (error) {
        if (error.message === 'Transaction reverted') {
          throw error;
        }
        // Continue monitoring for other errors
      }
    }

    // Timeout reached
    this.metrics.timeoutTransactions++;
    this.monitoringQueue.delete(txHash);
    throw new Error(`Transaction confirmation timeout after ${timeout}ms`);
  }

  /**
   * Replace stuck transaction
   */
  async replaceTransaction(txData) {
    const { network, transaction, txHash } = txData;
    
    try {
      // Get current gas price
      const currentGasEstimate = await this.gasOptimizer.estimateGas(
        network, 
        transaction, 
        { strategy: 'fast' }
      );

      // Increase gas price for replacement
      const newGasPrice = BigInt(
        Math.floor(Number(currentGasEstimate.gasPrice) * this.replacementGasMultiplier)
      );

      // Create replacement transaction
      const replacementTx = {
        ...transaction,
        gasPrice: newGasPrice,
        maxFeePerGas: newGasPrice,
        maxPriorityFeePerGas: newGasPrice / 10n
      };

      // Send replacement
      const newTxHash = await this.sendTransaction(network, replacementTx);
      
      // Update transaction data
      txData.txHash = newTxHash;
      txData.status = 'replaced';
      
      this.metrics.replacedTransactions++;
      
      this.emit('transaction:replaced', { 
        txId: txData.id, 
        oldTxHash: txHash, 
        newTxHash, 
        newGasPrice 
      });

      return newTxHash;

    } catch (error) {
      throw new Error(`Transaction replacement failed: ${error.message}`);
    }
  }

  /**
   * Check if transaction should be retried
   */
  shouldRetry(error, attempt, maxRetries) {
    if (attempt >= maxRetries) {
      return false;
    }

    // Don't retry for certain error types
    const nonRetryableErrors = [
      'INSUFFICIENT_FUNDS',
      'INVALID_TRANSACTION',
      'NONCE_TOO_LOW'
    ];

    return !nonRetryableErrors.some(errorType => 
      error.message.includes(errorType)
    );
  }

  /**
   * Check if transaction is stuck
   */
  isTransactionStuck(error) {
    const stuckIndicators = [
      'transaction underpriced',
      'replacement transaction underpriced',
      'gas price too low'
    ];

    return stuckIndicators.some(indicator => 
      error.message.toLowerCase().includes(indicator)
    );
  }

  /**
   * Wait for retry with backoff strategy
   */
  async waitForRetry(attempt, strategy) {
    let delay;

    switch (strategy) {
      case 'linear':
        delay = this.baseDelay * attempt;
        break;
      case 'exponential-backoff':
      default:
        delay = Math.min(
          this.baseDelay * Math.pow(this.backoffMultiplier, attempt - 1),
          this.maxDelay
        );
        break;
    }

    // Add jitter to prevent thundering herd
    const jitter = delay * this.jitterFactor * Math.random();
    delay += jitter;

    this.emit('transaction:retry-delay', { attempt, delay });

    return new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Start transaction monitoring loop
   */
  startTransactionMonitoring() {
    this.monitoringInterval = setInterval(async () => {
      await this.checkPendingTransactions();
    }, 10000); // Check every 10 seconds

    this.emit('monitoring:started');
  }

  /**
   * Check all pending transactions
   */
  async checkPendingTransactions() {
    const now = Date.now();
    const stuckThreshold = 120000; // 2 minutes

    for (const [txHash, monitoringData] of this.monitoringQueue.entries()) {
      try {
        monitoringData.checkCount++;
        monitoringData.lastCheck = now;

        // Check if transaction is stuck
        const timeSinceStart = now - monitoringData.startTime;
        if (timeSinceStart > stuckThreshold) {
          this.emit('transaction:stuck', { 
            txId: monitoringData.txId, 
            txHash, 
            timeSinceStart 
          });
        }

        // Get transaction status
        const receipt = await this.connectionPool.executeRequest(
          monitoringData.network, 
          'eth_getTransactionReceipt', 
          [txHash]
        );

        if (receipt) {
          this.emit('transaction:receipt-found', { 
            txId: monitoringData.txId, 
            txHash, 
            receipt 
          });
        }

      } catch (error) {
        console.warn(`Error monitoring transaction ${txHash}:`, error.message);
      }
    }
  }

  /**
   * Generate unique transaction ID
   */
  generateTransactionId() {
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Update confirmation time metrics
   */
  updateConfirmationTime(time) {
    this.confirmationTimes.push(time);
    
    if (this.confirmationTimes.length > this.maxConfirmationSamples) {
      this.confirmationTimes.shift();
    }
    
    this.metrics.averageConfirmationTime = 
      this.confirmationTimes.reduce((a, b) => a + b, 0) / this.confirmationTimes.length;
  }

  /**
   * Get transaction status
   */
  getTransactionStatus(txId) {
    const txData = this.pendingTransactions.get(txId);
    if (!txData) {
      return null;
    }

    return {
      id: txData.id,
      status: txData.status,
      txHash: txData.txHash,
      attempts: txData.attempts,
      startTime: txData.startTime,
      lastAttemptTime: txData.lastAttemptTime,
      error: txData.error?.message
    };
  }

  /**
   * Get all pending transactions
   */
  getPendingTransactions() {
    const pending = [];
    
    for (const [txId, txData] of this.pendingTransactions.entries()) {
      pending.push(this.getTransactionStatus(txId));
    }
    
    return pending;
  }

  /**
   * Get retry manager statistics
   */
  getStats() {
    const successRate = this.metrics.totalTransactions > 0 ? 
      (this.metrics.successfulTransactions / this.metrics.totalTransactions) * 100 : 0;
    
    const retryRate = this.metrics.totalTransactions > 0 ? 
      (this.metrics.retriedTransactions / this.metrics.totalTransactions) * 100 : 0;

    return {
      ...this.metrics,
      successRate,
      retryRate,
      pendingTransactions: this.pendingTransactions.size,
      monitoringQueue: this.monitoringQueue.size,
      averageConfirmationTimeFormatted: this.formatTime(this.metrics.averageConfirmationTime)
    };
  }

  /**
   * Format time for display
   */
  formatTime(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }

  /**
   * Cancel transaction (if possible)
   */
  async cancelTransaction(txId) {
    const txData = this.pendingTransactions.get(txId);
    if (!txData || !txData.txHash) {
      throw new Error('Transaction not found or not sent');
    }

    try {
      // Send a replacement transaction with 0 value to same address
      const cancelTx = {
        to: txData.transaction.from, // Send to self
        value: '0x0',
        gasPrice: BigInt(
          Math.floor(Number(txData.transaction.gasPrice || 0) * this.replacementGasMultiplier)
        ),
        nonce: txData.transaction.nonce
      };

      const cancelTxHash = await this.sendTransaction(txData.network, cancelTx);
      
      this.emit('transaction:cancelled', { 
        txId, 
        originalTxHash: txData.txHash, 
        cancelTxHash 
      });

      return cancelTxHash;

    } catch (error) {
      throw new Error(`Transaction cancellation failed: ${error.message}`);
    }
  }

  /**
   * Shutdown retry manager
   */
  shutdown() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    // Clear all pending operations
    this.pendingTransactions.clear();
    this.retryQueue.clear();
    this.monitoringQueue.clear();

    this.emit('retry-manager:shutdown');
  }
}

export default RetryManager;