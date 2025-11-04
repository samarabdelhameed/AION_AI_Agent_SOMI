/**
 * Utility functions for error handling infrastructure
 * Provides helper functions for creating, validating, and working with error types
 */

import {
  TransactionError,
  TransactionErrorType,
  TransactionErrorSeverity,
  TransactionContext,
  TransactionStatus,
  TransactionStatusUpdate,
  ValidationResult,
  ERROR_CODES,
  ErrorCode
} from './types';

/**
 * Creates a new TransactionError with default values
 */
export function createTransactionError(
  type: TransactionErrorType,
  code: ErrorCode,
  message: string,
  context: TransactionContext,
  options: Partial<TransactionError> = {}
): TransactionError {
  return {
    type,
    severity: options.severity || TransactionErrorSeverity.MEDIUM,
    code,
    message,
    userMessage: options.userMessage || message,
    technicalDetails: options.technicalDetails || {},
    retryable: options.retryable ?? isRetryableError(type),
    suggestedActions: options.suggestedActions || [],
    timestamp: new Date().toISOString(),
    context,
    originalError: options.originalError,
    stackTrace: options.stackTrace || new Error().stack,
    ...options
  };
}

/**
 * Creates a TransactionContext with default values
 */
export function createTransactionContext(
  chainId: number,
  vaultAddress: string,
  options: Partial<TransactionContext> = {}
): TransactionContext {
  return {
    chainId,
    vaultAddress,
    userAddress: options.userAddress,
    amount: options.amount,
    gasLimit: options.gasLimit,
    gasPrice: options.gasPrice,
    nonce: options.nonce,
    blockNumber: options.blockNumber,
    txHash: options.txHash,
    metadata: options.metadata || {}
  };
}

/**
 * Creates a TransactionStatusUpdate
 */
export function createStatusUpdate(
  status: TransactionStatus,
  message: string,
  options: Partial<TransactionStatusUpdate> = {}
): TransactionStatusUpdate {
  return {
    status,
    message,
    progress: options.progress,
    txHash: options.txHash,
    confirmations: options.confirmations,
    error: options.error,
    timestamp: new Date().toISOString(),
    metadata: options.metadata || {}
  };
}

/**
 * Creates a ValidationResult
 */
export function createValidationResult(
  isValid: boolean,
  errors: TransactionError[] = [],
  warnings: TransactionError[] = []
): ValidationResult {
  return {
    isValid,
    errors,
    warnings,
    metadata: {}
  };
}

/**
 * Determines if an error type is retryable by default
 */
export function isRetryableError(errorType: TransactionErrorType): boolean {
  switch (errorType) {
    case TransactionErrorType.NETWORK:
    case TransactionErrorType.GAS:
      return true;
    case TransactionErrorType.USER:
    case TransactionErrorType.VALIDATION:
      return false;
    case TransactionErrorType.CONTRACT:
    case TransactionErrorType.SYSTEM:
      return false; // These need case-by-case analysis
    default:
      return false;
  }
}

/**
 * Determines error severity based on error type and code
 */
export function getErrorSeverity(
  errorType: TransactionErrorType,
  errorCode: ErrorCode
): TransactionErrorSeverity {
  // Critical errors that require immediate attention
  if (errorCode === ERROR_CODES.INTERNAL_ERROR || 
      errorCode === ERROR_CODES.CONFIG_ERROR) {
    return TransactionErrorSeverity.CRITICAL;
  }

  // High severity errors
  if (errorType === TransactionErrorType.CONTRACT && 
      errorCode === ERROR_CODES.CONTRACT_NOT_FOUND) {
    return TransactionErrorSeverity.HIGH;
  }

  // Medium severity errors (most common)
  if (errorType === TransactionErrorType.USER ||
      errorType === TransactionErrorType.GAS ||
      errorType === TransactionErrorType.VALIDATION) {
    return TransactionErrorSeverity.MEDIUM;
  }

  // Low severity errors (usually temporary)
  if (errorType === TransactionErrorType.NETWORK) {
    return TransactionErrorSeverity.LOW;
  }

  return TransactionErrorSeverity.MEDIUM;
}

/**
 * Calculates progress percentage based on transaction status
 */
export function getStatusProgress(status: TransactionStatus): number {
  switch (status) {
    case TransactionStatus.PREPARING:
      return 5;
    case TransactionStatus.VALIDATING:
      return 15;
    case TransactionStatus.WAITING_CONFIRMATION:
      return 25;
    case TransactionStatus.SUBMITTED:
      return 40;
    case TransactionStatus.CONFIRMING:
      return 70;
    case TransactionStatus.COMPLETED:
      return 100;
    case TransactionStatus.FAILED:
      return 0;
    case TransactionStatus.RETRYING:
      return 30;
    default:
      return 0;
  }
}

/**
 * Validates that a TransactionError object is properly formed
 */
export function validateTransactionError(error: any): error is TransactionError {
  return (
    error &&
    typeof error === 'object' &&
    typeof error.type === 'string' &&
    Object.values(TransactionErrorType).includes(error.type) &&
    typeof error.severity === 'string' &&
    Object.values(TransactionErrorSeverity).includes(error.severity) &&
    typeof error.code === 'string' &&
    typeof error.message === 'string' &&
    typeof error.userMessage === 'string' &&
    typeof error.retryable === 'boolean' &&
    Array.isArray(error.suggestedActions) &&
    typeof error.timestamp === 'string' &&
    error.context &&
    typeof error.context === 'object'
  );
}

/**
 * Validates that a TransactionContext object is properly formed
 */
export function validateTransactionContext(context: any): context is TransactionContext {
  return (
    context &&
    typeof context === 'object' &&
    typeof context.chainId === 'number' &&
    typeof context.vaultAddress === 'string'
  );
}

/**
 * Sanitizes error details for user display (removes sensitive information)
 */
export function sanitizeErrorForUser(error: TransactionError): Partial<TransactionError> {
  return {
    type: error.type,
    severity: error.severity,
    code: error.code,
    userMessage: error.userMessage,
    suggestedActions: error.suggestedActions,
    timestamp: error.timestamp,
    retryable: error.retryable
  };
}

/**
 * Formats error for logging (includes all technical details)
 */
export function formatErrorForLogging(error: TransactionError): Record<string, any> {
  return {
    type: error.type,
    severity: error.severity,
    code: error.code,
    message: error.message,
    technicalDetails: error.technicalDetails,
    context: error.context,
    timestamp: error.timestamp,
    stackTrace: error.stackTrace,
    originalError: error.originalError ? {
      name: error.originalError.name,
      message: error.originalError.message,
      stack: error.originalError.stack
    } : undefined
  };
}

/**
 * Checks if two errors are the same type and code
 */
export function isSameErrorType(error1: TransactionError, error2: TransactionError): boolean {
  return error1.type === error2.type && error1.code === error2.code;
}

/**
 * Gets a human-readable description of the transaction status
 */
export function getStatusDescription(status: TransactionStatus): string {
  switch (status) {
    case TransactionStatus.PREPARING:
      return 'Preparing transaction...';
    case TransactionStatus.VALIDATING:
      return 'Validating transaction parameters...';
    case TransactionStatus.WAITING_CONFIRMATION:
      return 'Waiting for wallet confirmation...';
    case TransactionStatus.SUBMITTED:
      return 'Transaction submitted to network...';
    case TransactionStatus.CONFIRMING:
      return 'Waiting for network confirmation...';
    case TransactionStatus.COMPLETED:
      return 'Transaction completed successfully';
    case TransactionStatus.FAILED:
      return 'Transaction failed';
    case TransactionStatus.RETRYING:
      return 'Retrying transaction...';
    default:
      return 'Unknown status';
  }
}