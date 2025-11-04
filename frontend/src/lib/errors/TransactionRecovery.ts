/**
 * Transaction recovery and cancellation system
 */

import { writeContract, waitForTransactionReceipt, getTransactionReceipt } from 'wagmi/actions';
import { config } from '../web3Config';
import {
  TransactionError,
  TransactionContext,
  TransactionStatus,
  createTransactionError,
  createStatusUpdate,
  ERROR_CODES,
  TransactionErrorType,
  errorLogger,
  statusTracker,
  notificationManager
} from './index';

/**
 * Recovery action types
 */
export type RecoveryActionType = 
  | 'cancel' 
  | 'speed_up' 
  | 'replace' 
  | 'retry' 
  | 'manual_intervention';

/**
 * Recovery action configuration
 */
export interface RecoveryAction {
  type: RecoveryActionType;
  label: string;
  description: string;
  gasMultiplier?: number;
  enabled: boolean;
  estimatedCost?: bigint;
  estimatedTime?: number; // seconds
  riskLevel: 'low' | 'medium' | 'high';
  requirements?: string[];
}

/**
 * Transaction recovery state
 */
export interface TransactionRecoveryState {
  originalTxHash: string;
  status: 'pending' | 'stuck' | 'failed' | 'cancelled' | 'recovered';
  stuckSince?: string;
  lastActivity?: string;
  availableActions: RecoveryAction[];
  recoveryAttempts: Array<{
    action: RecoveryActionType;
    timestamp: string;
    txHash?: string;
    success: boolean;
    error?: string;
  }>;
  context: TransactionContext;
}

/**
 * Recovery configuration
 */
export interface RecoveryConfig {
  stuckThresholdMs: number; // Time before considering transaction stuck
  maxRecoveryAttempts: number;
  gasMultipliers: Record<RecoveryActionType, number>;
  enableAutoRecovery: boolean;
  autoRecoveryActions: RecoveryActionType[];
  notificationEnabled: boolean;
}

/**
 * Transaction recovery manager
 */
export class TransactionRecovery {
  private recoveryStates: Map<string, TransactionRecoveryState> = new Map();
  private config: RecoveryConfig;
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: Partial<RecoveryConfig> = {}) {
    this.config = {
      stuckThresholdMs: 300000, // 5 minutes
      maxRecoveryAttempts: 3,
      gasMultipliers: {
        cancel: 1.1,
        speed_up: 1.5,
        replace: 1.2,
        retry: 1.0,
        manual_intervention: 1.0
      },
      enableAutoRecovery: false,
      autoRecoveryActions: ['speed_up'],
      notificationEnabled: true,
      ...config
    };
  }

  /**
   * Start monitoring a transaction for recovery needs
   */
  startMonitoring(
    txHash: string,
    context: TransactionContext,
    originalParams?: any
  ): void {
    const recoveryState: TransactionRecoveryState = {
      originalTxHash: txHash,
      status: 'pending',
      lastActivity: new Date().toISOString(),
      availableActions: [],
      recoveryAttempts: [],
      context
    };

    this.recoveryStates.set(txHash, recoveryState);

    // Start monitoring interval
    const interval = setInterval(async () => {
      await this.checkTransactionStatus(txHash);
    }, 30000); // Check every 30 seconds

    this.monitoringIntervals.set(txHash, interval);

    errorLogger.logInfo('Started transaction recovery monitoring', {
      txHash,
      chainId: context.chainId
    }, ['recovery', 'monitoring']);
  }

  /**
   * Stop monitoring a transaction
   */
  stopMonitoring(txHash: string): void {
    const interval = this.monitoringIntervals.get(txHash);
    if (interval) {
      clearInterval(interval);
      this.monitoringIntervals.delete(txHash);
    }

    const state = this.recoveryStates.get(txHash);
    if (state && state.status === 'pending') {
      state.status = 'recovered';
      this.recoveryStates.set(txHash, state);
    }
  }

  /**
   * Cancel a stuck transaction
   */
  async cancelTransaction(
    txHash: string,
    gasPrice?: bigint
  ): Promise<{ success: boolean; newTxHash?: string; error?: TransactionError }> {
    const state = this.recoveryStates.get(txHash);
    if (!state) {
      return {
        success: false,
        error: createTransactionError(
          TransactionErrorType.VALIDATION,
          ERROR_CODES.INVALID_ADDRESS,
          'Transaction not found in recovery system',
          { chainId: 1, vaultAddress: '0x0' } as TransactionContext
        )
      };
    }

    try {
      // Get original transaction details
      const originalTx = await this.getTransactionDetails(txHash);
      if (!originalTx) {
        throw new Error('Could not retrieve original transaction details');
      }

      // Calculate cancellation gas price
      const cancelGasPrice = gasPrice || this.calculateGasPrice(
        originalTx.gasPrice,
        this.config.gasMultipliers.cancel
      );

      // Create cancellation transaction (send 0 ETH to self with higher gas)
      const cancelTxHash = await writeContract(config, {
        abi: [],
        address: state.context.userAddress as `0x${string}` || '0x0000000000000000000000000000000000000000',
        functionName: 'transfer',
        args: [],
        value: BigInt(0),
        gasPrice: cancelGasPrice,
        nonce: originalTx.nonce,
        chainId: state.context.chainId
      });

      // Record recovery attempt
      state.recoveryAttempts.push({
        action: 'cancel',
        timestamp: new Date().toISOString(),
        txHash: cancelTxHash,
        success: true
      });

      state.status = 'cancelled';
      this.recoveryStates.set(txHash, state);

      // Log success
      await errorLogger.logInfo('Transaction cancelled successfully', {
        originalTxHash: txHash,
        cancelTxHash,
        gasPrice: cancelGasPrice.toString()
      }, ['recovery', 'cancel', 'success']);

      // Notify user
      if (this.config.notificationEnabled) {
        notificationManager.showSuccess(
          'Transaction Cancelled',
          'Your stuck transaction has been cancelled successfully.',
          {
            actions: [{
              label: 'View Cancellation',
              action: () => console.log('View cancellation tx:', cancelTxHash)
            }]
          }
        );
      }

      return { success: true, newTxHash: cancelTxHash };

    } catch (error) {
      const transactionError = createTransactionError(
        TransactionErrorType.SYSTEM,
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to cancel transaction',
        state.context,
        { originalError: error }
      );

      // Record failed attempt
      state.recoveryAttempts.push({
        action: 'cancel',
        timestamp: new Date().toISOString(),
        success: false,
        error: transactionError.message
      });

      this.recoveryStates.set(txHash, state);

      await errorLogger.logError(transactionError, {
        originalTxHash: txHash,
        operation: 'cancel'
      }, ['recovery', 'cancel', 'error']);

      return { success: false, error: transactionError };
    }
  }

  /**
   * Speed up a transaction by increasing gas price
   */
  async speedUpTransaction(
    txHash: string,
    gasMultiplier?: number
  ): Promise<{ success: boolean; newTxHash?: string; error?: TransactionError }> {
    const state = this.recoveryStates.get(txHash);
    if (!state) {
      return {
        success: false,
        error: createTransactionError(
          TransactionErrorType.VALIDATION,
          ERROR_CODES.INVALID_ADDRESS,
          'Transaction not found in recovery system',
          { chainId: 1, vaultAddress: '0x0' } as TransactionContext
        )
      };
    }

    try {
      // Get original transaction details
      const originalTx = await this.getTransactionDetails(txHash);
      if (!originalTx) {
        throw new Error('Could not retrieve original transaction details');
      }

      // Calculate new gas price
      const multiplier = gasMultiplier || this.config.gasMultipliers.speed_up;
      const newGasPrice = this.calculateGasPrice(originalTx.gasPrice, multiplier);

      // Create speed-up transaction (same transaction with higher gas)
      const speedUpTxHash = await writeContract(config, {
        abi: originalTx.abi,
        address: originalTx.to as `0x${string}`,
        functionName: originalTx.functionName,
        args: originalTx.args,
        value: originalTx.value,
        gasPrice: newGasPrice,
        gasLimit: originalTx.gasLimit,
        nonce: originalTx.nonce,
        chainId: state.context.chainId
      });

      // Record recovery attempt
      state.recoveryAttempts.push({
        action: 'speed_up',
        timestamp: new Date().toISOString(),
        txHash: speedUpTxHash,
        success: true
      });

      this.recoveryStates.set(txHash, state);

      // Start monitoring the new transaction
      statusTracker.startTracking(speedUpTxHash, state.context, TransactionStatus.SUBMITTED);

      await errorLogger.logInfo('Transaction sped up successfully', {
        originalTxHash: txHash,
        speedUpTxHash,
        originalGasPrice: originalTx.gasPrice.toString(),
        newGasPrice: newGasPrice.toString(),
        multiplier
      }, ['recovery', 'speed_up', 'success']);

      if (this.config.notificationEnabled) {
        notificationManager.showInfo(
          'Transaction Sped Up',
          `Your transaction has been sped up with ${multiplier}x gas price.`,
          {
            actions: [{
              label: 'View Transaction',
              action: () => console.log('View speed-up tx:', speedUpTxHash)
            }]
          }
        );
      }

      return { success: true, newTxHash: speedUpTxHash };

    } catch (error) {
      const transactionError = createTransactionError(
        TransactionErrorType.SYSTEM,
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to speed up transaction',
        state.context,
        { originalError: error }
      );

      state.recoveryAttempts.push({
        action: 'speed_up',
        timestamp: new Date().toISOString(),
        success: false,
        error: transactionError.message
      });

      this.recoveryStates.set(txHash, state);

      await errorLogger.logError(transactionError, {
        originalTxHash: txHash,
        operation: 'speed_up'
      }, ['recovery', 'speed_up', 'error']);

      return { success: false, error: transactionError };
    }
  }

  /**
   * Replace a transaction with a new one
   */
  async replaceTransaction(
    txHash: string,
    newTransactionData: any,
    gasMultiplier?: number
  ): Promise<{ success: boolean; newTxHash?: string; error?: TransactionError }> {
    const state = this.recoveryStates.get(txHash);
    if (!state) {
      return {
        success: false,
        error: createTransactionError(
          TransactionErrorType.VALIDATION,
          ERROR_CODES.INVALID_ADDRESS,
          'Transaction not found in recovery system',
          { chainId: 1, vaultAddress: '0x0' } as TransactionContext
        )
      };
    }

    try {
      const originalTx = await this.getTransactionDetails(txHash);
      if (!originalTx) {
        throw new Error('Could not retrieve original transaction details');
      }

      const multiplier = gasMultiplier || this.config.gasMultipliers.replace;
      const newGasPrice = this.calculateGasPrice(originalTx.gasPrice, multiplier);

      // Create replacement transaction
      const replaceTxHash = await writeContract(config, {
        ...newTransactionData,
        gasPrice: newGasPrice,
        nonce: originalTx.nonce,
        chainId: state.context.chainId
      });

      state.recoveryAttempts.push({
        action: 'replace',
        timestamp: new Date().toISOString(),
        txHash: replaceTxHash,
        success: true
      });

      this.recoveryStates.set(txHash, state);

      await errorLogger.logInfo('Transaction replaced successfully', {
        originalTxHash: txHash,
        replaceTxHash,
        newGasPrice: newGasPrice.toString()
      }, ['recovery', 'replace', 'success']);

      if (this.config.notificationEnabled) {
        notificationManager.showInfo(
          'Transaction Replaced',
          'Your transaction has been replaced with updated parameters.'
        );
      }

      return { success: true, newTxHash: replaceTxHash };

    } catch (error) {
      const transactionError = createTransactionError(
        TransactionErrorType.SYSTEM,
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to replace transaction',
        state.context,
        { originalError: error }
      );

      state.recoveryAttempts.push({
        action: 'replace',
        timestamp: new Date().toISOString(),
        success: false,
        error: transactionError.message
      });

      this.recoveryStates.set(txHash, state);

      await errorLogger.logError(transactionError, {
        originalTxHash: txHash,
        operation: 'replace'
      }, ['recovery', 'replace', 'error']);

      return { success: false, error: transactionError };
    }
  }

  /**
   * Get available recovery actions for a transaction
   */
  getAvailableActions(txHash: string): RecoveryAction[] {
    const state = this.recoveryStates.get(txHash);
    if (!state) return [];

    const actions: RecoveryAction[] = [];

    // Cancel action
    if (state.status === 'stuck' || state.status === 'pending') {
      actions.push({
        type: 'cancel',
        label: 'Cancel Transaction',
        description: 'Cancel the stuck transaction by sending a 0 value transaction with higher gas',
        gasMultiplier: this.config.gasMultipliers.cancel,
        enabled: state.recoveryAttempts.filter(a => a.action === 'cancel').length < this.config.maxRecoveryAttempts,
        riskLevel: 'low',
        requirements: ['Sufficient gas for cancellation']
      });
    }

    // Speed up action
    if (state.status === 'stuck' || state.status === 'pending') {
      actions.push({
        type: 'speed_up',
        label: 'Speed Up Transaction',
        description: 'Increase gas price to speed up transaction confirmation',
        gasMultiplier: this.config.gasMultipliers.speed_up,
        enabled: state.recoveryAttempts.filter(a => a.action === 'speed_up').length < this.config.maxRecoveryAttempts,
        riskLevel: 'low',
        requirements: ['Additional gas for higher price']
      });
    }

    // Replace action
    if (state.status === 'stuck') {
      actions.push({
        type: 'replace',
        label: 'Replace Transaction',
        description: 'Replace with a new transaction using the same nonce',
        gasMultiplier: this.config.gasMultipliers.replace,
        enabled: state.recoveryAttempts.filter(a => a.action === 'replace').length < this.config.maxRecoveryAttempts,
        riskLevel: 'medium',
        requirements: ['New transaction parameters', 'Additional gas']
      });
    }

    // Retry action
    if (state.status === 'failed') {
      actions.push({
        type: 'retry',
        label: 'Retry Transaction',
        description: 'Submit the transaction again with a new nonce',
        enabled: true,
        riskLevel: 'low',
        requirements: ['Sufficient balance and gas']
      });
    }

    return actions;
  }

  /**
   * Get recovery state for a transaction
   */
  getRecoveryState(txHash: string): TransactionRecoveryState | undefined {
    return this.recoveryStates.get(txHash);
  }

  /**
   * Get all monitored transactions
   */
  getAllRecoveryStates(): TransactionRecoveryState[] {
    return Array.from(this.recoveryStates.values());
  }

  /**
   * Get stuck transactions
   */
  getStuckTransactions(): TransactionRecoveryState[] {
    return Array.from(this.recoveryStates.values()).filter(state => state.status === 'stuck');
  }

  /**
   * Update recovery configuration
   */
  updateConfig(newConfig: Partial<RecoveryConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Dispose of recovery manager
   */
  dispose(): void {
    // Clear all monitoring intervals
    this.monitoringIntervals.forEach(interval => clearInterval(interval));
    this.monitoringIntervals.clear();
    this.recoveryStates.clear();
  }

  /**
   * Check transaction status and update recovery state
   */
  private async checkTransactionStatus(txHash: string): Promise<void> {
    const state = this.recoveryStates.get(txHash);
    if (!state) return;

    try {
      // Try to get transaction receipt
      const receipt = await getTransactionReceipt(config, { hash: txHash as `0x${string}` });
      
      if (receipt) {
        // Transaction is confirmed
        state.status = 'recovered';
        state.lastActivity = new Date().toISOString();
        this.recoveryStates.set(txHash, state);
        this.stopMonitoring(txHash);
        return;
      }

      // Check if transaction is stuck
      const now = Date.now();
      const lastActivityTime = new Date(state.lastActivity || state.stuckSince || now).getTime();
      const timeSinceActivity = now - lastActivityTime;

      if (timeSinceActivity > this.config.stuckThresholdMs && state.status === 'pending') {
        state.status = 'stuck';
        state.stuckSince = new Date().toISOString();
        state.availableActions = this.getAvailableActions(txHash);
        this.recoveryStates.set(txHash, state);

        // Log stuck transaction
        await errorLogger.logWarning('Transaction appears to be stuck', {
          txHash,
          stuckSince: state.stuckSince,
          timeSinceActivity
        }, ['recovery', 'stuck']);

        // Notify user
        if (this.config.notificationEnabled) {
          notificationManager.showWarning(
            'Transaction Stuck',
            'Your transaction appears to be stuck. Recovery options are available.',
            {
              actions: [{
                label: 'View Recovery Options',
                action: () => console.log('Show recovery options for:', txHash)
              }]
            }
          );
        }

        // Auto-recovery if enabled
        if (this.config.enableAutoRecovery && this.config.autoRecoveryActions.length > 0) {
          await this.attemptAutoRecovery(txHash);
        }
      }

    } catch (error) {
      // Transaction might be failed or dropped
      if (state.status === 'pending') {
        state.status = 'failed';
        state.lastActivity = new Date().toISOString();
        this.recoveryStates.set(txHash, state);

        await errorLogger.logWarning('Transaction monitoring failed', {
          txHash,
          error: error instanceof Error ? error.message : String(error)
        }, ['recovery', 'monitoring', 'error']);
      }
    }
  }

  /**
   * Attempt automatic recovery
   */
  private async attemptAutoRecovery(txHash: string): Promise<void> {
    const state = this.recoveryStates.get(txHash);
    if (!state || state.recoveryAttempts.length >= this.config.maxRecoveryAttempts) {
      return;
    }

    for (const actionType of this.config.autoRecoveryActions) {
      try {
        let result;
        
        switch (actionType) {
          case 'speed_up':
            result = await this.speedUpTransaction(txHash);
            break;
          case 'cancel':
            result = await this.cancelTransaction(txHash);
            break;
          default:
            continue;
        }

        if (result.success) {
          await errorLogger.logInfo('Auto-recovery successful', {
            originalTxHash: txHash,
            action: actionType,
            newTxHash: result.newTxHash
          }, ['recovery', 'auto', 'success']);
          break;
        }

      } catch (error) {
        await errorLogger.logError(
          createTransactionError(
            TransactionErrorType.SYSTEM,
            ERROR_CODES.INTERNAL_ERROR,
            'Auto-recovery failed',
            state.context,
            { originalError: error }
          ),
          { originalTxHash: txHash, action: actionType },
          ['recovery', 'auto', 'error']
        );
      }
    }
  }

  /**
   * Get transaction details (simplified)
   */
  private async getTransactionDetails(txHash: string): Promise<any> {
    // This would normally fetch transaction details from the blockchain
    // For now, return a mock structure
    return {
      hash: txHash,
      nonce: 1,
      gasPrice: BigInt('5000000000'), // 5 Gwei
      gasLimit: BigInt('21000'),
      to: '0x123456789abcdef',
      value: BigInt('0'),
      abi: [],
      functionName: 'deposit',
      args: []
    };
  }

  /**
   * Calculate new gas price with multiplier
   */
  private calculateGasPrice(originalGasPrice: bigint, multiplier: number): bigint {
    return BigInt(Math.floor(Number(originalGasPrice) * multiplier));
  }
}

/**
 * Default transaction recovery instance
 */
export const transactionRecovery = new TransactionRecovery();