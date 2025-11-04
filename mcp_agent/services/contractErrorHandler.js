/**
 * @fileoverview Contract Error Handler
 * @description Specialized error handling for smart contract interactions
 */

import { EventEmitter } from 'events';

export class ContractErrorHandler extends EventEmitter {
  constructor(errorManager, options = {}) {
    super();
    
    this.errorManager = errorManager;
    this.options = {
      enableRecovery: options.enableRecovery !== false,
      maxRecoveryAttempts: options.maxRecoveryAttempts || 3,
      recoveryDelay: options.recoveryDelay || 5000,
      ...options
    };
    
    // Error classification patterns
    this.errorPatterns = {
      // Network errors
      network: [
        /network error/i,
        /connection refused/i,
        /timeout/i,
        /network is unreachable/i,
        /socket hang up/i
      ],
      
      // Gas related errors
      gas: [
        /out of gas/i,
        /gas required exceeds allowance/i,
        /intrinsic gas too low/i,
        /gas price too low/i,
        /max fee per gas less than block base fee/i
      ],
      
      // Transaction errors
      transaction: [
        /nonce too low/i,
        /nonce too high/i,
        /replacement transaction underpriced/i,
        /transaction underpriced/i,
        /already known/i,
        /insufficient funds/i
      ],
      
      // Contract execution errors
      execution: [
        /execution reverted/i,
        /revert/i,
        /invalid opcode/i,
        /stack underflow/i,
        /stack overflow/i,
        /invalid jump destination/i
      ],
      
      // Access control errors
      access: [
        /access denied/i,
        /unauthorized/i,
        /forbidden/i,
        /not owner/i,
        /caller is not/i
      ],
      
      // State errors
      state: [
        /contract not deployed/i,
        /no code at address/i,
        /invalid address/i,
        /contract creation failed/i
      ]
    };
    
    // Recovery strategies
    this.recoveryStrategies = {
      network: this.recoverFromNetworkError.bind(this),
      gas: this.recoverFromGasError.bind(this),
      transaction: this.recoverFromTransactionError.bind(this),
      execution: this.recoverFromExecutionError.bind(this),
      access: this.recoverFromAccessError.bind(this),
      state: this.recoverFromStateError.bind(this)
    };
    
    // Error statistics
    this.stats = {
      totalErrors: 0,
      errorsByType: {},
      recoveryAttempts: 0,
      successfulRecoveries: 0,
      failedRecoveries: 0
    };
  }

  /**
   * Handle contract error with classification and recovery
   */
  async handleContractError(error, context, options = {}) {
    this.stats.totalErrors++;
    
    try {
      // Classify error
      const errorType = this.classifyError(error);
      
      // Update statistics
      this.stats.errorsByType[errorType] = (this.stats.errorsByType[errorType] || 0) + 1;
      
      // Create enhanced error context
      const enhancedContext = {
        ...context,
        errorType,
        originalError: error.message,
        timestamp: Date.now(),
        recoveryEnabled: this.options.enableRecovery && options.enableRecovery !== false
      };
      
      this.emit('error:classified', { errorType, context: enhancedContext });
      
      // Attempt recovery if enabled
      if (enhancedContext.recoveryEnabled) {
        const recoveryResult = await this.attemptRecovery(error, errorType, enhancedContext, options);
        
        if (recoveryResult.success) {
          this.emit('error:recovered', { errorType, context: enhancedContext, recovery: recoveryResult });
          return recoveryResult;
        } else {
          this.emit('error:recovery-failed', { errorType, context: enhancedContext, recovery: recoveryResult });
        }
      }
      
      // Create structured error response
      const structuredError = this.createStructuredError(error, errorType, enhancedContext);
      
      this.emit('error:handled', { error: structuredError, context: enhancedContext });
      
      throw structuredError;
      
    } catch (handlingError) {
      // If error handling itself fails, return original error
      this.emit('error:handling-failed', { originalError: error, handlingError });
      throw error;
    }
  }

  /**
   * Classify error based on patterns
   */
  classifyError(error) {
    const errorMessage = error.message || error.toString();
    
    for (const [type, patterns] of Object.entries(this.errorPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(errorMessage)) {
          return type;
        }
      }
    }
    
    // Check error code if available
    if (error.code) {
      switch (error.code) {
        case 'NETWORK_ERROR':
        case 'TIMEOUT':
          return 'network';
        case 'INSUFFICIENT_FUNDS':
          return 'transaction';
        case 'UNPREDICTABLE_GAS_LIMIT':
          return 'gas';
        case 'CALL_EXCEPTION':
          return 'execution';
        default:
          break;
      }
    }
    
    return 'unknown';
  }

  /**
   * Attempt error recovery
   */
  async attemptRecovery(error, errorType, context, options) {
    this.stats.recoveryAttempts++;
    
    const recoveryStrategy = this.recoveryStrategies[errorType];
    
    if (!recoveryStrategy) {
      this.stats.failedRecoveries++;
      return {
        success: false,
        reason: 'No recovery strategy available',
        errorType
      };
    }
    
    try {
      const recoveryResult = await recoveryStrategy(error, context, options);
      
      if (recoveryResult.success) {
        this.stats.successfulRecoveries++;
      } else {
        this.stats.failedRecoveries++;
      }
      
      return recoveryResult;
      
    } catch (recoveryError) {
      this.stats.failedRecoveries++;
      
      return {
        success: false,
        reason: 'Recovery strategy failed',
        error: recoveryError.message,
        errorType
      };
    }
  }

  /**
   * Recover from network errors
   */
  async recoverFromNetworkError(error, context, options) {
    // Wait and retry with different network if available
    await new Promise(resolve => setTimeout(resolve, this.options.recoveryDelay));
    
    return {
      success: false,
      reason: 'Network error recovery requires external retry mechanism',
      suggestion: 'Retry with exponential backoff or switch network',
      errorType: 'network'
    };
  }

  /**
   * Recover from gas errors
   */
  async recoverFromGasError(error, context, options) {
    const suggestions = [];
    
    if (error.message.includes('out of gas')) {
      suggestions.push('Increase gas limit by 20-50%');
    }
    
    if (error.message.includes('gas price too low')) {
      suggestions.push('Increase gas price using fast or aggressive strategy');
    }
    
    if (error.message.includes('intrinsic gas too low')) {
      suggestions.push('Use minimum 21000 gas for transfers, 200000+ for contract calls');
    }
    
    return {
      success: false,
      reason: 'Gas error recovery requires transaction parameter adjustment',
      suggestions,
      errorType: 'gas'
    };
  }

  /**
   * Recover from transaction errors
   */
  async recoverFromTransactionError(error, context, options) {
    const suggestions = [];
    
    if (error.message.includes('nonce too low')) {
      suggestions.push('Get latest nonce from network');
    }
    
    if (error.message.includes('nonce too high')) {
      suggestions.push('Wait for pending transactions to confirm');
    }
    
    if (error.message.includes('insufficient funds')) {
      suggestions.push('Check account balance and ensure sufficient funds');
    }
    
    if (error.message.includes('underpriced')) {
      suggestions.push('Increase gas price for transaction replacement');
    }
    
    return {
      success: false,
      reason: 'Transaction error recovery requires parameter adjustment',
      suggestions,
      errorType: 'transaction'
    };
  }

  /**
   * Recover from execution errors
   */
  async recoverFromExecutionError(error, context, options) {
    const suggestions = [];
    
    if (error.message.includes('execution reverted')) {
      suggestions.push('Check contract state and function parameters');
      suggestions.push('Verify contract conditions are met');
    }
    
    if (error.message.includes('invalid opcode')) {
      suggestions.push('Contract may have a bug or be corrupted');
    }
    
    // Try to extract revert reason
    let revertReason = null;
    const revertMatch = error.message.match(/execution reverted: (.+)/);
    if (revertMatch) {
      revertReason = revertMatch[1];
    }
    
    return {
      success: false,
      reason: 'Contract execution failed',
      revertReason,
      suggestions,
      errorType: 'execution'
    };
  }

  /**
   * Recover from access control errors
   */
  async recoverFromAccessError(error, context, options) {
    return {
      success: false,
      reason: 'Access control error - insufficient permissions',
      suggestions: [
        'Check if caller has required permissions',
        'Verify contract ownership or role assignments',
        'Use correct account for transaction'
      ],
      errorType: 'access'
    };
  }

  /**
   * Recover from state errors
   */
  async recoverFromStateError(error, context, options) {
    const suggestions = [];
    
    if (error.message.includes('no code at address')) {
      suggestions.push('Verify contract is deployed at the specified address');
      suggestions.push('Check if using correct network');
    }
    
    if (error.message.includes('invalid address')) {
      suggestions.push('Verify address format and checksum');
    }
    
    return {
      success: false,
      reason: 'Contract state error',
      suggestions,
      errorType: 'state'
    };
  }

  /**
   * Create structured error with additional context
   */
  createStructuredError(originalError, errorType, context) {
    const structuredError = new Error(originalError.message);
    
    // Copy original error properties
    Object.assign(structuredError, originalError);
    
    // Add enhanced properties
    structuredError.type = errorType;
    structuredError.context = context;
    structuredError.timestamp = Date.now();
    structuredError.recoverable = this.isRecoverable(errorType);
    structuredError.severity = this.getSeverity(errorType);
    structuredError.userMessage = this.getUserMessage(errorType, originalError);
    
    return structuredError;
  }

  /**
   * Check if error type is recoverable
   */
  isRecoverable(errorType) {
    const recoverableTypes = ['network', 'gas', 'transaction'];
    return recoverableTypes.includes(errorType);
  }

  /**
   * Get error severity level
   */
  getSeverity(errorType) {
    const severityMap = {
      network: 'medium',
      gas: 'low',
      transaction: 'medium',
      execution: 'high',
      access: 'high',
      state: 'high',
      unknown: 'medium'
    };
    
    return severityMap[errorType] || 'medium';
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage(errorType, originalError) {
    const messageMap = {
      network: 'Network connection issue. Please check your internet connection and try again.',
      gas: 'Transaction gas settings need adjustment. The transaction may require more gas or higher gas price.',
      transaction: 'Transaction parameter issue. Please check your account balance and transaction settings.',
      execution: 'Smart contract execution failed. Please verify the contract state and function parameters.',
      access: 'Access denied. You may not have the required permissions for this operation.',
      state: 'Contract state issue. The contract may not be deployed or the address may be incorrect.',
      unknown: 'An unexpected error occurred. Please try again or contact support.'
    };
    
    return messageMap[errorType] || messageMap.unknown;
  }

  /**
   * Get error handling statistics
   */
  getStats() {
    const totalRecoveryAttempts = this.stats.recoveryAttempts;
    const recoverySuccessRate = totalRecoveryAttempts > 0 ? 
      (this.stats.successfulRecoveries / totalRecoveryAttempts) * 100 : 0;
    
    return {
      ...this.stats,
      recoverySuccessRate,
      errorTypes: Object.keys(this.errorPatterns),
      recoveryStrategies: Object.keys(this.recoveryStrategies)
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalErrors: 0,
      errorsByType: {},
      recoveryAttempts: 0,
      successfulRecoveries: 0,
      failedRecoveries: 0
    };
    
    this.emit('stats:reset');
  }

  /**
   * Add custom error pattern
   */
  addErrorPattern(type, pattern) {
    if (!this.errorPatterns[type]) {
      this.errorPatterns[type] = [];
    }
    
    this.errorPatterns[type].push(pattern);
    this.emit('pattern:added', { type, pattern });
  }

  /**
   * Add custom recovery strategy
   */
  addRecoveryStrategy(type, strategy) {
    this.recoveryStrategies[type] = strategy;
    this.emit('strategy:added', { type });
  }
}

export default ContractErrorHandler;