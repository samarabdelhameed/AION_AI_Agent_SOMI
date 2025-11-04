/**
 * Web3 configuration integration with error handling system
 */

import { config, CONTRACT_ADDRESSES, getContractAddress, isChainSupported, getChainName } from '../web3Config';
import {
  TransactionError,
  TransactionErrorType,
  TransactionContext,
  ERROR_CODES,
  createTransactionError,
  createTransactionContext,
  errorLogger,
  errorAnalytics,
  notificationManager
} from './index';

/**
 * Web3 error handling configuration
 */
export interface Web3ErrorConfig {
  enableErrorLogging: boolean;
  enableAnalytics: boolean;
  enableNotifications: boolean;
  chainSpecificRules: Record<number, {
    maxRetries: number;
    retryDelay: number;
    gasMultiplier: number;
    timeoutMs: number;
  }>;
  rpcEndpoints: Record<number, {
    primary: string;
    fallbacks: string[];
    healthCheckInterval: number;
  }>;
}

/**
 * Chain-specific error handling rules
 */
export interface ChainErrorRules {
  maxRetries: number;
  retryDelay: number;
  gasMultiplier: number;
  timeoutMs: number;
  specificErrors: Record<string, {
    retryable: boolean;
    customMessage?: string;
    suggestedActions?: string[];
  }>;
}

/**
 * Web3 error integration class
 */
export class Web3ErrorIntegration {
  private config: Web3ErrorConfig;
  private chainRules: Map<number, ChainErrorRules> = new Map();
  private rpcHealthStatus: Map<number, { healthy: boolean; lastCheck: string }> = new Map();

  constructor(config: Partial<Web3ErrorConfig> = {}) {
    this.config = {
      enableErrorLogging: true,
      enableAnalytics: true,
      enableNotifications: true,
      chainSpecificRules: {
        56: { // BSC Mainnet
          maxRetries: 3,
          retryDelay: 2000,
          gasMultiplier: 1.2,
          timeoutMs: 30000
        },
        97: { // BSC Testnet
          maxRetries: 5,
          retryDelay: 1000,
          gasMultiplier: 1.1,
          timeoutMs: 20000
        }
      },
      rpcEndpoints: {
        56: {
          primary: 'https://bsc-dataseed.binance.org/',
          fallbacks: [
            'https://bsc-dataseed1.defibit.io/',
            'https://bsc-dataseed1.ninicoin.io/'
          ],
          healthCheckInterval: 60000
        },
        97: {
          primary: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
          fallbacks: [
            'https://data-seed-prebsc-2-s1.binance.org:8545/'
          ],
          healthCheckInterval: 30000
        }
      },
      ...config
    };

    this.initializeChainRules();
    this.startRpcHealthChecks();
  }

  /**
   * Create enhanced transaction context with Web3 information
   */
  createEnhancedContext(
    chainId: number,
    contractName?: string,
    additionalContext?: Partial<TransactionContext>
  ): TransactionContext {
    let vaultAddress: string;
    
    try {
      vaultAddress = contractName ? 
        getContractAddress(chainId, contractName) : 
        getContractAddress(chainId, 'AION_VAULT');
    } catch (error) {
      // Fallback to a default address if contract not found
      vaultAddress = '0x0000000000000000000000000000000000000000';
      
      if (this.config.enableErrorLogging) {
        errorLogger.logWarning('Contract address not found', {
          chainId,
          contractName,
          error: error instanceof Error ? error.message : String(error)
        }, ['web3', 'config', 'contract']);
      }
    }

    const context = createTransactionContext(chainId, vaultAddress, {
      ...additionalContext,
      metadata: {
        ...additionalContext?.metadata,
        chainName: getChainName(chainId),
        contractName,
        rpcEndpoint: this.config.rpcEndpoints[chainId]?.primary,
        web3ConfigVersion: '1.0.0'
      }
    });

    return context;
  }

  /**
   * Handle Web3-specific errors with chain context
   */
  async handleWeb3Error(
    error: any,
    context: TransactionContext,
    operation: string
  ): Promise<TransactionError> {
    const chainId = context.chainId;
    const chainRules = this.chainRules.get(chainId);
    
    // Classify the error
    const transactionError = this.classifyWeb3Error(error, context, operation);
    
    // Apply chain-specific rules
    if (chainRules) {
      const specificRule = chainRules.specificErrors[transactionError.code];
      if (specificRule) {
        transactionError.retryable = specificRule.retryable;
        if (specificRule.customMessage) {
          transactionError.userMessage = specificRule.customMessage;
        }
        if (specificRule.suggestedActions) {
          transactionError.suggestedActions = specificRule.suggestedActions;
        }
      }
    }

    // Log error if enabled
    if (this.config.enableErrorLogging) {
      await errorLogger.logError(transactionError, {
        operation,
        chainName: getChainName(chainId),
        rpcEndpoint: this.config.rpcEndpoints[chainId]?.primary
      }, ['web3', 'error', operation]);
    }

    // Send notification if enabled
    if (this.config.enableNotifications) {
      notificationManager.showError(transactionError);
    }

    return transactionError;
  }

  /**
   * Validate chain configuration
   */
  validateChainConfig(chainId: number): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check if chain is supported
    if (!isChainSupported(chainId)) {
      errors.push(`Chain ${chainId} is not supported`);
      return { isValid: false, errors, warnings };
    }

    // Check contract addresses
    try {
      const vaultAddress = getContractAddress(chainId, 'AION_VAULT');
      if (vaultAddress === '0x0000000000000000000000000000000000000000') {
        warnings.push(`Vault address for chain ${chainId} appears to be a placeholder`);
      }
    } catch (error) {
      errors.push(`Vault address not configured for chain ${chainId}`);
    }

    // Check RPC configuration
    const rpcConfig = this.config.rpcEndpoints[chainId];
    if (!rpcConfig) {
      warnings.push(`No RPC configuration found for chain ${chainId}`);
    } else {
      if (!rpcConfig.primary) {
        errors.push(`Primary RPC endpoint not configured for chain ${chainId}`);
      }
      if (!rpcConfig.fallbacks || rpcConfig.fallbacks.length === 0) {
        warnings.push(`No fallback RPC endpoints configured for chain ${chainId}`);
      }
    }

    // Check chain-specific rules
    const chainRules = this.config.chainSpecificRules[chainId];
    if (!chainRules) {
      warnings.push(`No chain-specific error handling rules for chain ${chainId}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Get chain-specific error handling configuration
   */
  getChainConfig(chainId: number): ChainErrorRules | undefined {
    return this.chainRules.get(chainId);
  }

  /**
   * Update chain-specific configuration
   */
  updateChainConfig(chainId: number, rules: Partial<ChainErrorRules>): void {
    const existingRules = this.chainRules.get(chainId) || this.getDefaultChainRules();
    const updatedRules = { ...existingRules, ...rules };
    this.chainRules.set(chainId, updatedRules);
  }

  /**
   * Get RPC health status
   */
  getRpcHealthStatus(chainId: number): { healthy: boolean; lastCheck: string } | undefined {
    return this.rpcHealthStatus.get(chainId);
  }

  /**
   * Check if RPC endpoint is healthy
   */
  async checkRpcHealth(chainId: number): Promise<boolean> {
    const rpcConfig = this.config.rpcEndpoints[chainId];
    if (!rpcConfig) return false;

    try {
      // Simple health check - try to get latest block number
      const response = await fetch(rpcConfig.primary, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_blockNumber',
          params: [],
          id: 1
        })
      });

      const data = await response.json();
      const isHealthy = response.ok && data.result;

      this.rpcHealthStatus.set(chainId, {
        healthy: isHealthy,
        lastCheck: new Date().toISOString()
      });

      return isHealthy;
    } catch (error) {
      this.rpcHealthStatus.set(chainId, {
        healthy: false,
        lastCheck: new Date().toISOString()
      });

      if (this.config.enableErrorLogging) {
        errorLogger.logWarning('RPC health check failed', {
          chainId,
          endpoint: rpcConfig.primary,
          error: error instanceof Error ? error.message : String(error)
        }, ['web3', 'rpc', 'health']);
      }

      return false;
    }
  }

  /**
   * Get configuration summary
   */
  getConfigSummary(): {
    supportedChains: number[];
    errorHandlingEnabled: boolean;
    analyticsEnabled: boolean;
    notificationsEnabled: boolean;
    rpcEndpoints: Record<number, string>;
    chainRules: Record<number, ChainErrorRules>;
  } {
    const supportedChains = Object.keys(CONTRACT_ADDRESSES).map(Number);
    const rpcEndpoints: Record<number, string> = {};
    const chainRules: Record<number, ChainErrorRules> = {};

    supportedChains.forEach(chainId => {
      const rpcConfig = this.config.rpcEndpoints[chainId];
      if (rpcConfig) {
        rpcEndpoints[chainId] = rpcConfig.primary;
      }

      const rules = this.chainRules.get(chainId);
      if (rules) {
        chainRules[chainId] = rules;
      }
    });

    return {
      supportedChains,
      errorHandlingEnabled: this.config.enableErrorLogging,
      analyticsEnabled: this.config.enableAnalytics,
      notificationsEnabled: this.config.enableNotifications,
      rpcEndpoints,
      chainRules
    };
  }

  /**
   * Initialize chain-specific rules
   */
  private initializeChainRules(): void {
    // BSC Mainnet rules
    this.chainRules.set(56, {
      maxRetries: 3,
      retryDelay: 2000,
      gasMultiplier: 1.2,
      timeoutMs: 30000,
      specificErrors: {
        [ERROR_CODES.GAS_TOO_LOW]: {
          retryable: true,
          customMessage: 'Gas price too low for BSC network conditions',
          suggestedActions: ['Increase gas price to at least 5 Gwei', 'Wait for network congestion to decrease']
        },
        [ERROR_CODES.NETWORK_TIMEOUT]: {
          retryable: true,
          customMessage: 'BSC network is experiencing delays',
          suggestedActions: ['Wait a moment and try again', 'Check BSC network status']
        },
        [ERROR_CODES.RPC_ERROR]: {
          retryable: true,
          customMessage: 'BSC RPC endpoint error',
          suggestedActions: ['Retry with different RPC endpoint', 'Check network connection']
        }
      }
    });

    // BSC Testnet rules
    this.chainRules.set(97, {
      maxRetries: 5,
      retryDelay: 1000,
      gasMultiplier: 1.1,
      timeoutMs: 20000,
      specificErrors: {
        [ERROR_CODES.GAS_TOO_LOW]: {
          retryable: true,
          customMessage: 'Gas price too low for BSC testnet',
          suggestedActions: ['Increase gas price', 'Get testnet BNB from faucet for gas']
        },
        [ERROR_CODES.INSUFFICIENT_FUNDS]: {
          retryable: false,
          customMessage: 'Insufficient testnet BNB balance',
          suggestedActions: ['Get testnet BNB from BSC faucet', 'Reduce transaction amount']
        }
      }
    });
  }

  /**
   * Classify Web3-specific errors
   */
  private classifyWeb3Error(error: any, context: TransactionContext, operation: string): TransactionError {
    let errorType = TransactionErrorType.SYSTEM;
    let errorCode = ERROR_CODES.UNKNOWN_ERROR;
    let message = 'Unknown Web3 error occurred';
    let retryable = false;
    let suggestedActions: string[] = [];

    // Parse error message and code
    const errorMessage = error?.message || error?.reason || String(error);
    const errorCodeFromError = error?.code || error?.error?.code;

    // Network/RPC errors
    if (errorMessage.includes('network') || errorMessage.includes('timeout') || errorCodeFromError === -32603) {
      errorType = TransactionErrorType.NETWORK;
      errorCode = ERROR_CODES.NETWORK_TIMEOUT;
      message = 'Network request timed out';
      retryable = true;
      suggestedActions = ['Check internet connection', 'Try again in a moment'];
    }
    // Gas errors
    else if (errorMessage.includes('gas') || errorMessage.includes('intrinsic gas too low')) {
      errorType = TransactionErrorType.GAS;
      errorCode = ERROR_CODES.GAS_TOO_LOW;
      message = 'Gas price or limit too low';
      retryable = true;
      suggestedActions = ['Increase gas price', 'Increase gas limit'];
    }
    // User rejection
    else if (errorMessage.includes('rejected') || errorMessage.includes('denied') || errorCodeFromError === 4001) {
      errorType = TransactionErrorType.USER;
      errorCode = ERROR_CODES.USER_REJECTED;
      message = 'Transaction rejected by user';
      retryable = false;
      suggestedActions = ['Approve the transaction in your wallet'];
    }
    // Insufficient funds
    else if (errorMessage.includes('insufficient funds') || errorMessage.includes('insufficient balance')) {
      errorType = TransactionErrorType.USER;
      errorCode = ERROR_CODES.INSUFFICIENT_FUNDS;
      message = 'Insufficient funds for transaction';
      retryable = false;
      suggestedActions = ['Add more funds to your wallet', 'Reduce transaction amount'];
    }
    // Contract errors
    else if (errorMessage.includes('revert') || errorMessage.includes('execution reverted')) {
      errorType = TransactionErrorType.CONTRACT;
      errorCode = ERROR_CODES.CONTRACT_REVERT;
      message = 'Smart contract execution reverted';
      retryable = false;
      suggestedActions = ['Check transaction parameters', 'Contact support'];
    }
    // RPC errors
    else if (errorCodeFromError && (errorCodeFromError < -32000 && errorCodeFromError > -32099)) {
      errorType = TransactionErrorType.NETWORK;
      errorCode = ERROR_CODES.RPC_ERROR;
      message = 'RPC endpoint error';
      retryable = true;
      suggestedActions = ['Try again', 'Switch to different RPC endpoint'];
    }

    return createTransactionError(
      errorType,
      errorCode,
      message,
      context,
      {
        retryable,
        suggestedActions,
        originalError: error,
        technicalDetails: {
          operation,
          errorCode: errorCodeFromError,
          errorMessage,
          chainId: context.chainId,
          chainName: getChainName(context.chainId)
        }
      }
    );
  }

  /**
   * Get default chain rules
   */
  private getDefaultChainRules(): ChainErrorRules {
    return {
      maxRetries: 3,
      retryDelay: 1500,
      gasMultiplier: 1.15,
      timeoutMs: 25000,
      specificErrors: {}
    };
  }

  /**
   * Start RPC health checks
   */
  private startRpcHealthChecks(): void {
    Object.keys(this.config.rpcEndpoints).forEach(chainIdStr => {
      const chainId = parseInt(chainIdStr);
      const rpcConfig = this.config.rpcEndpoints[chainId];
      
      if (rpcConfig && rpcConfig.healthCheckInterval > 0) {
        // Initial health check
        this.checkRpcHealth(chainId);
        
        // Periodic health checks
        setInterval(() => {
          this.checkRpcHealth(chainId);
        }, rpcConfig.healthCheckInterval);
      }
    });
  }
}

/**
 * Default Web3 error integration instance
 */
export const web3ErrorIntegration = new Web3ErrorIntegration();