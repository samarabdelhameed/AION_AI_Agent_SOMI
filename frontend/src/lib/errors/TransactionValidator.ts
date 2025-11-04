/**
 * Transaction validation system for comprehensive pre-transaction validation
 * Implements balance validation, contract existence checks, and parameter validation
 */

import { readContract, getBalance } from 'wagmi/actions';
import { config, CONTRACT_ADDRESSES } from '../web3Config';
import { VAULT_ABI } from '../contractConfig';
import {
  TransactionError,
  TransactionErrorType,
  TransactionErrorSeverity,
  TransactionContext,
  ValidationResult,
  ERROR_CODES,
  createTransactionError,
  createValidationResult
} from './types';

/**
 * Validation configuration interface
 */
export interface ValidationConfig {
  /** Whether to validate user balance */
  validateBalance: boolean;
  /** Whether to validate contract existence */
  validateContract: boolean;
  /** Whether to validate gas estimation */
  validateGas: boolean;
  /** Whether to validate minimum deposit amount */
  validateMinDeposit: boolean;
  /** Whether to validate chain configuration */
  validateChain: boolean;
  /** Gas buffer percentage for balance validation (default: 20%) */
  gasBufferPercent: number;
  /** Maximum gas limit allowed */
  maxGasLimit: bigint;
  /** Minimum gas limit required */
  minGasLimit: bigint;
}

/**
 * Default validation configuration
 */
export const DEFAULT_VALIDATION_CONFIG: ValidationConfig = {
  validateBalance: true,
  validateContract: true,
  validateGas: true,
  validateMinDeposit: true,
  validateChain: true,
  gasBufferPercent: 20,
  maxGasLimit: BigInt(500000),
  minGasLimit: BigInt(21000)
};

/**
 * Validation parameters interface
 */
export interface ValidationParams {
  /** Chain ID for the transaction */
  chainId: number;
  /** User's wallet address */
  userAddress: `0x${string}`;
  /** Vault contract address (optional, will use default if not provided) */
  vaultAddress?: `0x${string}`;
  /** Deposit amount in wei */
  amountWei: bigint;
  /** Estimated gas limit (optional) */
  gasLimit?: bigint;
  /** Gas price in wei (optional) */
  gasPrice?: bigint;
  /** Validation configuration (optional, will use defaults) */
  config?: Partial<ValidationConfig>;
}

/**
 * Balance validation result interface
 */
export interface BalanceValidationResult {
  /** User's current balance in wei */
  currentBalance: bigint;
  /** Required balance including gas fees */
  requiredBalance: bigint;
  /** Estimated gas cost in wei */
  estimatedGasCost: bigint;
  /** Whether user has sufficient balance */
  hasSufficientBalance: boolean;
  /** Amount short if insufficient */
  shortfallAmount?: bigint;
}

/**
 * Contract validation result interface
 */
export interface ContractValidationResult {
  /** Whether contract exists at the address */
  contractExists: boolean;
  /** Whether contract is accessible */
  contractAccessible: boolean;
  /** Contract code size (0 if no contract) */
  codeSize: number;
  /** Whether contract has required functions */
  hasRequiredFunctions: boolean;
}

/**
 * Gas validation result interface
 */
export interface GasValidationResult {
  /** Estimated gas limit */
  estimatedGasLimit: bigint;
  /** Current gas price */
  currentGasPrice: bigint;
  /** Total estimated gas cost */
  totalGasCost: bigint;
  /** Whether gas parameters are valid */
  isValidGas: boolean;
  /** Gas limit recommendation */
  recommendedGasLimit?: bigint;
}

/**
 * Comprehensive transaction validator class
 */
export class TransactionValidator {
  private config: ValidationConfig;

  constructor(config: Partial<ValidationConfig> = {}) {
    this.config = { ...DEFAULT_VALIDATION_CONFIG, ...config };
  }

  /**
   * Validates all transaction parameters
   */
  async validateTransaction(params: ValidationParams): Promise<ValidationResult> {
    const errors: TransactionError[] = [];
    const warnings: TransactionError[] = [];
    const context = this.createValidationContext(params);

    try {
      // Validate chain configuration
      if (this.config.validateChain) {
        const chainValidation = await this.validateChainConfiguration(params, context);
        if (chainValidation.error) {
          errors.push(chainValidation.error);
        }
      }

      // Validate contract existence and accessibility
      if (this.config.validateContract && errors.length === 0) {
        const contractValidation = await this.validateContract(params, context);
        if (contractValidation.error) {
          errors.push(contractValidation.error);
        }
        if (contractValidation.warning) {
          warnings.push(contractValidation.warning);
        }
      }

      // Validate minimum deposit amount
      if (this.config.validateMinDeposit && errors.length === 0) {
        const minDepositValidation = await this.validateMinimumDeposit(params, context);
        if (minDepositValidation.error) {
          errors.push(minDepositValidation.error);
        }
      }

      // Validate gas parameters
      if (this.config.validateGas && errors.length === 0) {
        const gasValidation = await this.validateGasParameters(params, context);
        if (gasValidation.error) {
          errors.push(gasValidation.error);
        }
        if (gasValidation.warning) {
          warnings.push(gasValidation.warning);
        }
      }

      // Validate user balance (should be last as it depends on gas estimation)
      if (this.config.validateBalance && errors.length === 0) {
        const balanceValidation = await this.validateUserBalance(params, context);
        if (balanceValidation.error) {
          errors.push(balanceValidation.error);
        }
        if (balanceValidation.warning) {
          warnings.push(balanceValidation.warning);
        }
      }

    } catch (error) {
      // Handle unexpected validation errors
      const validationError = createTransactionError(
        TransactionErrorType.SYSTEM,
        ERROR_CODES.INTERNAL_ERROR,
        `Validation system error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context,
        {
          severity: TransactionErrorSeverity.CRITICAL,
          userMessage: 'An unexpected error occurred during validation. Please try again.',
          suggestedActions: ['Refresh the page and try again', 'Contact support if the issue persists'],
          originalError: error
        }
      );
      errors.push(validationError);
    }

    return createValidationResult(errors.length === 0, errors, warnings);
  }

  /**
   * Validates chain configuration
   */
  private async validateChainConfiguration(
    params: ValidationParams,
    context: TransactionContext
  ): Promise<{ error?: TransactionError }> {
    try {
      // Check if chain is supported
      const contractAddresses = CONTRACT_ADDRESSES as any;
      if (!contractAddresses[params.chainId]) {
        return {
          error: createTransactionError(
            TransactionErrorType.VALIDATION,
            ERROR_CODES.INVALID_CHAIN,
            `Chain ID ${params.chainId} is not supported`,
            context,
            {
              severity: TransactionErrorSeverity.HIGH,
              userMessage: `This network (Chain ID: ${params.chainId}) is not supported.`,
              suggestedActions: ['Switch to a supported network', 'Check network configuration']
            }
          )
        };
      }

      // Validate vault address
      const vaultAddress = params.vaultAddress || contractAddresses[params.chainId]?.AION_VAULT;
      if (!vaultAddress) {
        return {
          error: createTransactionError(
            TransactionErrorType.VALIDATION,
            ERROR_CODES.CONFIG_ERROR,
            `No vault address configured for chain ${params.chainId}`,
            context,
            {
              severity: TransactionErrorSeverity.CRITICAL,
              userMessage: 'Vault contract is not configured for this network.',
              suggestedActions: ['Contact support', 'Check network configuration']
            }
          )
        };
      }

      return {};
    } catch (error) {
      return {
        error: createTransactionError(
          TransactionErrorType.SYSTEM,
          ERROR_CODES.CONFIG_ERROR,
          `Chain validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          context,
          {
            severity: TransactionErrorSeverity.HIGH,
            userMessage: 'Failed to validate network configuration.',
            suggestedActions: ['Check network connection', 'Try again later'],
            originalError: error
          }
        )
      };
    }
  }

  /**
   * Validates contract existence and accessibility
   */
  private async validateContract(
    params: ValidationParams,
    context: TransactionContext
  ): Promise<{ error?: TransactionError; warning?: TransactionError }> {
    try {
      const vaultAddress = params.vaultAddress || 
        (CONTRACT_ADDRESSES as any)[params.chainId]?.AION_VAULT;

      if (!vaultAddress) {
        return {
          error: createTransactionError(
            TransactionErrorType.CONTRACT,
            ERROR_CODES.CONTRACT_NOT_FOUND,
            'Vault contract address not found',
            context,
            {
              severity: TransactionErrorSeverity.HIGH,
              userMessage: 'Vault contract is not available on this network.',
              suggestedActions: ['Switch to a supported network', 'Contact support']
            }
          )
        };
      }

      // Try to call a read function to verify contract exists and is accessible
      try {
        await readContract(config, {
          abi: VAULT_ABI as any,
          address: vaultAddress,
          functionName: 'minDeposit',
          chainId: params.chainId,
        });
      } catch (contractError) {
        return {
          error: createTransactionError(
            TransactionErrorType.CONTRACT,
            ERROR_CODES.CONTRACT_NOT_FOUND,
            `Contract not accessible: ${contractError instanceof Error ? contractError.message : 'Unknown error'}`,
            context,
            {
              severity: TransactionErrorSeverity.HIGH,
              userMessage: 'Unable to connect to the vault contract.',
              suggestedActions: [
                'Check your network connection',
                'Verify you are on the correct network',
                'Try again later'
              ],
              originalError: contractError
            }
          )
        };
      }

      return {};
    } catch (error) {
      return {
        error: createTransactionError(
          TransactionErrorType.SYSTEM,
          ERROR_CODES.INTERNAL_ERROR,
          `Contract validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          context,
          {
            severity: TransactionErrorSeverity.HIGH,
            userMessage: 'Failed to validate contract.',
            suggestedActions: ['Try again later', 'Contact support if the issue persists'],
            originalError: error
          }
        )
      };
    }
  }

  /**
   * Validates minimum deposit amount
   */
  private async validateMinimumDeposit(
    params: ValidationParams,
    context: TransactionContext
  ): Promise<{ error?: TransactionError }> {
    try {
      const vaultAddress = params.vaultAddress || 
        (CONTRACT_ADDRESSES as any)[params.chainId]?.AION_VAULT;

      const minDeposit: bigint = await readContract(config, {
        abi: VAULT_ABI as any,
        address: vaultAddress,
        functionName: 'minDeposit',
        chainId: params.chainId,
      });

      if (params.amountWei < minDeposit) {
        const minDepositEth = Number(minDeposit) / 1e18;
        const attemptedEth = Number(params.amountWei) / 1e18;

        return {
          error: createTransactionError(
            TransactionErrorType.VALIDATION,
            ERROR_CODES.BELOW_MIN_DEPOSIT,
            `Deposit amount ${attemptedEth} is below minimum ${minDepositEth}`,
            context,
            {
              severity: TransactionErrorSeverity.MEDIUM,
              userMessage: `Minimum deposit amount is ${minDepositEth.toFixed(6)} BNB. You tried to deposit ${attemptedEth.toFixed(6)} BNB.`,
              suggestedActions: [
                `Increase your deposit to at least ${minDepositEth.toFixed(6)} BNB`,
                'Check the minimum deposit requirements'
              ],
              technicalDetails: {
                minDepositWei: minDeposit.toString(),
                attemptedAmountWei: params.amountWei.toString(),
                shortfallWei: (minDeposit - params.amountWei).toString()
              }
            }
          )
        };
      }

      return {};
    } catch (error) {
      return {
        error: createTransactionError(
          TransactionErrorType.CONTRACT,
          ERROR_CODES.CONTRACT_REVERT,
          `Failed to get minimum deposit: ${error instanceof Error ? error.message : 'Unknown error'}`,
          context,
          {
            severity: TransactionErrorSeverity.MEDIUM,
            userMessage: 'Unable to verify minimum deposit amount.',
            suggestedActions: ['Try again later', 'Check network connection'],
            originalError: error
          }
        )
      };
    }
  }

  /**
   * Validates gas parameters
   */
  private async validateGasParameters(
    params: ValidationParams,
    context: TransactionContext
  ): Promise<{ error?: TransactionError; warning?: TransactionError }> {
    try {
      const gasLimit = params.gasLimit || this.config.minGasLimit;

      // Validate gas limit bounds
      if (gasLimit < this.config.minGasLimit) {
        return {
          error: createTransactionError(
            TransactionErrorType.GAS,
            ERROR_CODES.GAS_TOO_LOW,
            `Gas limit ${gasLimit} is below minimum ${this.config.minGasLimit}`,
            context,
            {
              severity: TransactionErrorSeverity.MEDIUM,
              userMessage: 'Gas limit is too low for this transaction.',
              suggestedActions: [
                `Increase gas limit to at least ${this.config.minGasLimit}`,
                'Use automatic gas estimation'
              ],
              technicalDetails: {
                providedGasLimit: gasLimit.toString(),
                minimumGasLimit: this.config.minGasLimit.toString()
              }
            }
          )
        };
      }

      if (gasLimit > this.config.maxGasLimit) {
        return {
          warning: createTransactionError(
            TransactionErrorType.GAS,
            ERROR_CODES.GAS_TOO_LOW,
            `Gas limit ${gasLimit} is above recommended maximum ${this.config.maxGasLimit}`,
            context,
            {
              severity: TransactionErrorSeverity.LOW,
              userMessage: 'Gas limit is higher than recommended.',
              suggestedActions: [
                'Consider reducing gas limit to save on fees',
                'Use automatic gas estimation'
              ],
              technicalDetails: {
                providedGasLimit: gasLimit.toString(),
                maximumGasLimit: this.config.maxGasLimit.toString()
              }
            }
          )
        };
      }

      return {};
    } catch (error) {
      return {
        error: createTransactionError(
          TransactionErrorType.SYSTEM,
          ERROR_CODES.GAS_ESTIMATION_FAILED,
          `Gas validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          context,
          {
            severity: TransactionErrorSeverity.MEDIUM,
            userMessage: 'Failed to validate gas parameters.',
            suggestedActions: ['Try again with automatic gas estimation', 'Check network connection'],
            originalError: error
          }
        )
      };
    }
  }

  /**
   * Validates user balance including gas fees
   */
  private async validateUserBalance(
    params: ValidationParams,
    context: TransactionContext
  ): Promise<{ error?: TransactionError; warning?: TransactionError }> {
    try {
      // Get user's current balance
      const balance = await getBalance(config, {
        address: params.userAddress,
        chainId: params.chainId,
      });

      // Estimate gas cost
      const gasLimit = params.gasLimit || this.config.minGasLimit;
      const gasPrice = params.gasPrice || BigInt(5000000000); // 5 gwei default
      const estimatedGasCost = gasLimit * gasPrice;
      
      // Add gas buffer
      const gasBuffer = (estimatedGasCost * BigInt(this.config.gasBufferPercent)) / BigInt(100);
      const totalGasCost = estimatedGasCost + gasBuffer;
      
      // Total required balance
      const requiredBalance = params.amountWei + totalGasCost;

      if (balance.value < requiredBalance) {
        const shortfall = requiredBalance - balance.value;
        const shortfallEth = Number(shortfall) / 1e18;
        const balanceEth = Number(balance.value) / 1e18;
        const requiredEth = Number(requiredBalance) / 1e18;

        return {
          error: createTransactionError(
            TransactionErrorType.USER,
            ERROR_CODES.INSUFFICIENT_FUNDS,
            `Insufficient balance: have ${balanceEth}, need ${requiredEth}`,
            context,
            {
              severity: TransactionErrorSeverity.MEDIUM,
              userMessage: `Insufficient BNB balance. You have ${balanceEth.toFixed(6)} BNB but need ${requiredEth.toFixed(6)} BNB (including gas fees).`,
              suggestedActions: [
                `Add at least ${shortfallEth.toFixed(6)} BNB to your wallet`,
                'Reduce the deposit amount',
                'Check gas price settings'
              ],
              technicalDetails: {
                currentBalance: balance.value.toString(),
                requiredBalance: requiredBalance.toString(),
                shortfall: shortfall.toString(),
                depositAmount: params.amountWei.toString(),
                estimatedGasCost: totalGasCost.toString()
              }
            }
          )
        };
      }

      // Warning if balance is close to required amount
      const warningThreshold = requiredBalance + (totalGasCost * BigInt(2)); // 2x gas cost buffer
      if (balance.value < warningThreshold) {
        return {
          warning: createTransactionError(
            TransactionErrorType.USER,
            ERROR_CODES.INSUFFICIENT_FUNDS,
            'Balance is close to minimum required',
            context,
            {
              severity: TransactionErrorSeverity.LOW,
              userMessage: 'Your balance is close to the minimum required. Consider adding more BNB for future transactions.',
              suggestedActions: ['Add more BNB to your wallet for future transactions'],
              technicalDetails: {
                currentBalance: balance.value.toString(),
                warningThreshold: warningThreshold.toString()
              }
            }
          )
        };
      }

      return {};
    } catch (error) {
      return {
        error: createTransactionError(
          TransactionErrorType.NETWORK,
          ERROR_CODES.RPC_ERROR,
          `Balance validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          context,
          {
            severity: TransactionErrorSeverity.MEDIUM,
            userMessage: 'Unable to check your balance.',
            suggestedActions: ['Check network connection', 'Try again later'],
            originalError: error
          }
        )
      };
    }
  }

  /**
   * Creates validation context from parameters
   */
  private createValidationContext(params: ValidationParams): TransactionContext {
    const vaultAddress = params.vaultAddress || 
      (CONTRACT_ADDRESSES as any)[params.chainId]?.AION_VAULT || '';

    return {
      chainId: params.chainId,
      vaultAddress,
      userAddress: params.userAddress,
      amount: params.amountWei,
      gasLimit: params.gasLimit,
      gasPrice: params.gasPrice,
      metadata: {
        validationConfig: this.config,
        validationTimestamp: new Date().toISOString()
      }
    };
  }

  /**
   * Updates validation configuration
   */
  updateConfig(newConfig: Partial<ValidationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Gets current validation configuration
   */
  getConfig(): ValidationConfig {
    return { ...this.config };
  }
}