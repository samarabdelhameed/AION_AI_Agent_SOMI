/**
 * Enhanced transaction executor with comprehensive error handling, validation, and retry mechanisms
 */

import { writeContract, waitForTransactionReceipt, readContract } from 'wagmi/actions';
import { config, CONTRACT_ADDRESSES } from '../web3Config';
import { VAULT_ABI } from '../contractConfig';
import { appendLocalActivity } from '../localTimeline';

import {
  TransactionError,
  TransactionErrorType,
  TransactionStatus,
  TransactionContext,
  EnhancedDepositParams,
  createTransactionError,
  createTransactionContext,
  createStatusUpdate,
  ERROR_CODES,
  DEFAULT_RETRY_CONFIG
} from './types';

import { ErrorHandler } from './ErrorHandler';
import { TransactionValidator } from './TransactionValidator';
import { StatusTracker } from './StatusTracker';
import { RetryManager } from './RetryManager';
import { ErrorLogger } from './ErrorLogger';
import { MessageGenerator } from './MessageGenerator';

/**
 * Transaction execution result
 */
export interface TransactionResult {
  success: boolean;
  txHash?: string;
  receipt?: any;
  error?: TransactionError;
  attempts: number;
  totalTime: number;
  gasUsed?: bigint;
  finalGasPrice?: bigint;
}

/**
 * Enhanced transaction executor with comprehensive error handling
 */
export class EnhancedTransactionExecutor {
  private errorHandler: ErrorHandler;
  private validator: TransactionValidator;
  private statusTracker: StatusTracker;
  private retryManager: RetryManager;
  private logger: ErrorLogger;
  private messageGenerator: MessageGenerator;

  constructor(
    errorHandler?: ErrorHandler,
    validator?: TransactionValidator,
    statusTracker?: StatusTracker,
    retryManager?: RetryManager,
    logger?: ErrorLogger,
    messageGenerator?: MessageGenerator
  ) {
    this.errorHandler = errorHandler || new ErrorHandler();
    this.validator = validator || new TransactionValidator();
    this.statusTracker = statusTracker || new StatusTracker();
    this.retryManager = retryManager || new RetryManager();
    this.logger = logger || new ErrorLogger();
    this.messageGenerator = messageGenerator || new MessageGenerator();
  }

  /**
   * Execute deposit transaction with comprehensive error handling
   */
  async executeDeposit(params: EnhancedDepositParams): Promise<TransactionResult> {
    const startTime = Date.now();
    let attempts = 0;
    let txHash: string | undefined;
    
    // Build transaction context
    const vaultAddress = params.vaultAddress || (CONTRACT_ADDRESSES as any)[params.chainId]?.AION_VAULT;
    if (!vaultAddress) {
      const error = createTransactionError(
        TransactionErrorType.VALIDATION,
        ERROR_CODES.CONFIG_ERROR,
        'Vault address not configured for this network',
        createTransactionContext(params.chainId, ''),
        { retryable: false }
      );
      
      await this.logger.logError(error, { chainId: params.chainId });
      return this.createFailureResult(error, attempts, Date.now() - startTime);
    }

    const context = createTransactionContext(params.chainId, vaultAddress, {
      amount: params.amountWei,
      metadata: params.metadata
    });

    try {
      // Log transaction start
      await this.logger.logInfo('Starting deposit transaction', {
        chainId: params.chainId,
        amount: params.amountWei.toString(),
        vaultAddress
      }, ['transaction', 'deposit', 'start']);

      // Start status tracking
      const trackingId = `deposit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      this.statusTracker.startTracking(trackingId, context, TransactionStatus.PREPARING);

      // Update status callback wrapper
      const statusCallback = (status: TransactionStatus, message?: string, metadata?: any) => {
        this.statusTracker.updateStatus(trackingId, status, message, metadata);
        if (params.statusCallback) {
          params.statusCallback(createStatusUpdate(status, message || '', { 
            txHash, 
            metadata 
          }));
        }
      };

      // Phase 1: Validation
      statusCallback(TransactionStatus.VALIDATING, 'Validating transaction parameters');
      
      const validationResult = await this.validator.validateDeposit({
        chainId: params.chainId,
        vaultAddress,
        amountWei: params.amountWei,
        validationLevel: params.validationLevel || 'basic'
      });

      if (!validationResult.isValid) {
        const validationError = validationResult.errors[0];
        await this.logger.logError(validationError, { validationResult });
        
        if (params.errorCallback) {
          params.errorCallback(validationError);
        }
        
        this.statusTracker.setError(trackingId, validationError);
        return this.createFailureResult(validationError, attempts, Date.now() - startTime);
      }

      // Log validation warnings if any
      if (validationResult.warnings.length > 0) {
        for (const warning of validationResult.warnings) {
          await this.logger.logWarning(warning.message, { warning });
        }
      }

      // Phase 2: Execute with retry mechanism
      const retryConfig = { ...DEFAULT_RETRY_CONFIG, ...params.retryConfig };
      
      const result = await this.retryManager.executeWithRetry(
        async (currentContext, attempt) => {
          attempts = attempt + 1;
          
          statusCallback(
            TransactionStatus.WAITING_CONFIRMATION, 
            'Waiting for wallet confirmation',
            { attempt: attempts }
          );

          // Execute the actual transaction
          const hash = await writeContract(config, {
            abi: VAULT_ABI as any,
            address: currentContext.vaultAddress as `0x${string}`,
            functionName: 'deposit',
            chainId: currentContext.chainId,
            value: currentContext.amount,
            args: [],
            gas: currentContext.gasLimit,
            gasPrice: currentContext.gasPrice
          });

          txHash = hash;
          
          statusCallback(
            TransactionStatus.SUBMITTED, 
            'Transaction submitted to network',
            { txHash: hash, attempt: attempts }
          );

          // Wait for receipt
          statusCallback(TransactionStatus.CONFIRMING, 'Waiting for network confirmation');
          
          const receipt = await waitForTransactionReceipt(config, { 
            hash, 
            confirmations: 1 
          });

          statusCallback(
            TransactionStatus.COMPLETED, 
            'Transaction completed successfully',
            { receipt, gasUsed: receipt.gasUsed }
          );

          return { hash, receipt };
        },
        context,
        retryConfig,
        (session, attempt) => {
          // Progress callback for retry attempts
          this.logger.logWarning(`Transaction attempt ${attempt.attemptNumber + 1} failed`, {
            error: attempt.error,
            delay: attempt.delay,
            gasAdjustment: attempt.gasAdjustment
          }, ['retry', 'attempt']);

          if (params.errorCallback) {
            params.errorCallback(attempt.error);
          }

          if (attempt.gasAdjustment) {
            statusCallback(
              TransactionStatus.RETRYING,
              `Retrying with adjusted gas price: ${Number(attempt.gasAdjustment.adjustedGasPrice) / 1e9} Gwei`,
              { gasAdjustment: attempt.gasAdjustment }
            );
          } else {
            statusCallback(
              TransactionStatus.RETRYING,
              `Retrying transaction (attempt ${attempt.attemptNumber + 1})`,
              { attempt: attempt.attemptNumber + 1 }
            );
          }
        }
      );

      // Success - update local activity
      try {
        appendLocalActivity({
          type: 'deposit',
          status: 'completed',
          timestamp: new Date().toISOString(),
          amount: Number(params.amountWei) / 1e18,
          currency: 'BNB',
          txHash: result.receipt.transactionHash,
          description: 'Enhanced deposit with error handling',
        });
      } catch (activityError) {
        // Don't fail the transaction if activity logging fails
        await this.logger.logWarning('Failed to update local activity', { 
          error: activityError,
          txHash: result.hash 
        });
      }

      // Log successful transaction
      await this.logger.logInfo('Deposit transaction completed successfully', {
        txHash: result.hash,
        gasUsed: result.receipt.gasUsed?.toString(),
        attempts,
        totalTime: Date.now() - startTime
      }, ['transaction', 'deposit', 'success']);

      return {
        success: true,
        txHash: result.hash,
        receipt: result.receipt,
        attempts,
        totalTime: Date.now() - startTime,
        gasUsed: result.receipt.gasUsed,
        finalGasPrice: context.gasPrice
      };

    } catch (error: any) {
      // Handle and classify the error
      const transactionError = await this.errorHandler.handleError(error, context);
      
      // Log the error
      await this.logger.logError(transactionError, {
        attempts,
        totalTime: Date.now() - startTime,
        originalError: error
      }, ['transaction', 'deposit', 'error']);

      // Notify error callback
      if (params.errorCallback) {
        params.errorCallback(transactionError);
      }

      // Update status tracker
      if (txHash) {
        this.statusTracker.setError(txHash, transactionError);
      }

      return this.createFailureResult(transactionError, attempts, Date.now() - startTime);
    }
  }

  /**
   * Get minimum deposit amount with error handling
   */
  async getMinDepositWei(
    chainId: number, 
    vaultAddress?: `0x${string}`
  ): Promise<{ value?: bigint; error?: TransactionError }> {
    const targetVault = vaultAddress || (CONTRACT_ADDRESSES as any)[chainId]?.AION_VAULT;
    
    if (!targetVault) {
      const error = createTransactionError(
        TransactionErrorType.VALIDATION,
        ERROR_CODES.CONFIG_ERROR,
        'Vault address not configured for this network',
        createTransactionContext(chainId, ''),
        { retryable: false }
      );
      
      await this.logger.logError(error, { chainId });
      return { error };
    }

    const context = createTransactionContext(chainId, targetVault);

    try {
      const min: bigint = await readContract(config, {
        abi: VAULT_ABI as any,
        address: targetVault,
        functionName: 'minDeposit',
        chainId,
      });

      await this.logger.logDebug('Retrieved minimum deposit amount', {
        chainId,
        vaultAddress: targetVault,
        minDeposit: min.toString()
      }, ['contract', 'query', 'min-deposit']);

      return { value: min };

    } catch (error: any) {
      const transactionError = await this.errorHandler.handleError(error, context);
      
      await this.logger.logError(transactionError, {
        operation: 'getMinDepositWei',
        chainId,
        vaultAddress: targetVault
      }, ['contract', 'query', 'error']);

      return { error: transactionError };
    }
  }

  /**
   * Validate deposit parameters
   */
  async validateDepositParams(params: EnhancedDepositParams): Promise<{
    isValid: boolean;
    errors: TransactionError[];
    warnings: TransactionError[];
  }> {
    const vaultAddress = params.vaultAddress || (CONTRACT_ADDRESSES as any)[params.chainId]?.AION_VAULT;
    
    if (!vaultAddress) {
      const error = createTransactionError(
        TransactionErrorType.VALIDATION,
        ERROR_CODES.CONFIG_ERROR,
        'Vault address not configured for this network',
        createTransactionContext(params.chainId, ''),
        { retryable: false }
      );
      
      return {
        isValid: false,
        errors: [error],
        warnings: []
      };
    }

    return await this.validator.validateDeposit({
      chainId: params.chainId,
      vaultAddress,
      amountWei: params.amountWei,
      validationLevel: params.validationLevel || 'basic'
    });
  }

  /**
   * Get user-friendly error message
   */
  getUserFriendlyErrorMessage(error: TransactionError, language?: string): string {
    return this.messageGenerator.generateQuickMessage(error, language as any);
  }

  /**
   * Get detailed error information for user
   */
  getDetailedErrorInfo(error: TransactionError, language?: string) {
    return this.messageGenerator.generateMessage(error, { language: language as any });
  }

  /**
   * Create failure result
   */
  private createFailureResult(
    error: TransactionError, 
    attempts: number, 
    totalTime: number
  ): TransactionResult {
    return {
      success: false,
      error,
      attempts,
      totalTime
    };
  }

  /**
   * Dispose of resources
   */
  async dispose(): Promise<void> {
    this.statusTracker.dispose();
    await this.logger.dispose();
  }
}

/**
 * Default enhanced transaction executor instance
 */
export const enhancedTransactionExecutor = new EnhancedTransactionExecutor();

/**
 * Enhanced deposit function that replaces the original depositWithWallet
 */
export async function depositWithWalletEnhanced(
  params: EnhancedDepositParams
): Promise<TransactionResult> {
  return await enhancedTransactionExecutor.executeDeposit(params);
}

/**
 * Enhanced minimum deposit getter
 */
export async function getMinDepositWeiEnhanced(
  chainId: number,
  vaultAddress?: `0x${string}`
): Promise<{ value?: bigint; error?: TransactionError }> {
  return await enhancedTransactionExecutor.getMinDepositWei(chainId, vaultAddress);
}