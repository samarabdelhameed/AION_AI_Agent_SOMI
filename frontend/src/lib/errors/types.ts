/**
 * Core error infrastructure and type definitions for transaction error handling
 * Implements comprehensive error categorization, severity levels, and context tracking
 */

/**
 * Enumeration of transaction error types for categorization
 */
export enum TransactionErrorType {
  NETWORK = 'network',
  CONTRACT = 'contract',
  USER = 'user',
  GAS = 'gas',
  VALIDATION = 'validation',
  SYSTEM = 'system'
}

/**
 * Error severity levels for prioritization and handling
 */
export enum TransactionErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Transaction status enumeration for progress tracking
 */
export enum TransactionStatus {
  PREPARING = 'preparing',
  VALIDATING = 'validating',
  WAITING_CONFIRMATION = 'waiting_confirmation',
  SUBMITTED = 'submitted',
  CONFIRMING = 'confirming',
  COMPLETED = 'completed',
  FAILED = 'failed',
  RETRYING = 'retrying'
}

/**
 * Transaction context interface containing all relevant transaction information
 */
export interface TransactionContext {
  /** Chain ID where the transaction is being executed */
  chainId: number;
  /** Vault contract address */
  vaultAddress: string;
  /** User's wallet address (optional) */
  userAddress?: string;
  /** Transaction amount in wei (optional) */
  amount?: bigint;
  /** Gas limit for the transaction (optional) */
  gasLimit?: bigint;
  /** Gas price in wei (optional) */
  gasPrice?: bigint;
  /** Transaction nonce (optional) */
  nonce?: number;
  /** Block number when error occurred (optional) */
  blockNumber?: number;
  /** Transaction hash if available (optional) */
  txHash?: string;
  /** Additional context data */
  metadata?: Record<string, any>;
}

/**
 * Comprehensive transaction error interface
 */
export interface TransactionError {
  /** Error type category */
  type: TransactionErrorType;
  /** Error severity level */
  severity: TransactionErrorSeverity;
  /** Unique error code for identification */
  code: string;
  /** Technical error message */
  message: string;
  /** User-friendly error message */
  userMessage: string;
  /** Detailed technical information */
  technicalDetails: Record<string, any>;
  /** Whether this error can be retried */
  retryable: boolean;
  /** Suggested actions for the user */
  suggestedActions: string[];
  /** Timestamp when error occurred */
  timestamp: string;
  /** Transaction context when error occurred */
  context: TransactionContext;
  /** Original error object if available */
  originalError?: any;
  /** Stack trace for debugging */
  stackTrace?: string;
}

/**
 * Transaction status update interface for progress tracking
 */
export interface TransactionStatusUpdate {
  /** Current transaction status */
  status: TransactionStatus;
  /** Status message */
  message: string;
  /** Progress percentage (0-100) */
  progress?: number;
  /** Transaction hash if available */
  txHash?: string;
  /** Number of confirmations received */
  confirmations?: number;
  /** Error information if status is failed */
  error?: TransactionError;
  /** Timestamp of the status update */
  timestamp: string;
  /** Additional status metadata */
  metadata?: Record<string, any>;
}

/**
 * Validation result interface
 */
export interface ValidationResult {
  /** Whether validation passed */
  isValid: boolean;
  /** Validation errors found */
  errors: TransactionError[];
  /** Validation warnings (non-blocking) */
  warnings: TransactionError[];
  /** Additional validation metadata */
  metadata?: Record<string, any>;
}

/**
 * Retry configuration interface
 */
export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxRetries: number;
  /** Base delay between retries in milliseconds */
  baseDelay: number;
  /** Maximum delay between retries in milliseconds */
  maxDelay: number;
  /** Multiplier for exponential backoff */
  backoffMultiplier: number;
  /** Error types that are retryable */
  retryableErrors: TransactionErrorType[];
  /** Whether to add jitter to retry delays */
  useJitter: boolean;
}

/**
 * Error statistics interface for analytics
 */
export interface ErrorStats {
  /** Total number of errors recorded */
  totalErrors: number;
  /** Error count by type */
  errorsByType: Record<TransactionErrorType, number>;
  /** Error count by severity */
  errorsBySeverity: Record<TransactionErrorSeverity, number>;
  /** Retry success rate percentage */
  retrySuccessRate: number;
  /** Average time to resolve errors in milliseconds */
  averageResolutionTime: number;
  /** Most common error codes */
  commonErrorCodes: Array<{ code: string; count: number }>;
}

/**
 * Error filters interface for querying error history
 */
export interface ErrorFilters {
  /** Filter by error type */
  type?: TransactionErrorType;
  /** Filter by error severity */
  severity?: TransactionErrorSeverity;
  /** Filter by chain ID */
  chainId?: number;
  /** Filter by user address */
  userAddress?: string;
  /** Filter by date range */
  dateRange?: {
    start: string;
    end: string;
  };
  /** Filter by error code */
  errorCode?: string;
  /** Limit number of results */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
}

/**
 * Network conditions interface for error context
 */
export interface NetworkConditions {
  /** Network latency in milliseconds */
  latency: number;
  /** Average block time in seconds */
  blockTime: number;
  /** Current gas price in wei */
  gasPrice: bigint;
  /** Network congestion level (0-1) */
  congestionLevel: number;
  /** Whether network is experiencing issues */
  hasNetworkIssues: boolean;
}

/**
 * Error context storage interface for session tracking
 */
export interface ErrorContext {
  /** Unique session identifier */
  sessionId: string;
  /** User agent string */
  userAgent: string;
  /** Wallet type being used */
  walletType: string;
  /** Current network conditions */
  networkConditions: NetworkConditions;
  /** Previous errors in this session */
  previousErrors: TransactionError[];
  /** Session start timestamp */
  sessionStartTime: string;
  /** Additional session metadata */
  sessionMetadata?: Record<string, any>;
}

/**
 * Notification interface for user feedback
 */
export interface TransactionNotification {
  /** Notification ID */
  id: string;
  /** Notification type */
  type: 'success' | 'error' | 'warning' | 'info';
  /** Notification title */
  title: string;
  /** Notification message */
  message: string;
  /** Whether notification should auto-dismiss */
  autoDismiss: boolean;
  /** Auto-dismiss timeout in milliseconds */
  timeout?: number;
  /** Actions available for the notification */
  actions?: Array<{
    label: string;
    action: () => void;
    primary?: boolean;
  }>;
  /** Timestamp when notification was created */
  timestamp: string;
  /** Associated transaction error if applicable */
  error?: TransactionError;
}

/**
 * Enhanced deposit parameters with error handling configuration
 */
export interface EnhancedDepositParams {
  /** Chain ID for the transaction */
  chainId: number;
  /** Vault contract address (optional, will use default if not provided) */
  vaultAddress?: `0x${string}`;
  /** Deposit amount in wei */
  amountWei: bigint;
  /** Retry configuration (optional, will use defaults) */
  retryConfig?: Partial<RetryConfig>;
  /** Validation level to apply */
  validationLevel?: 'basic' | 'strict';
  /** Callback for status updates */
  statusCallback?: (update: TransactionStatusUpdate) => void;
  /** Callback for error notifications */
  errorCallback?: (error: TransactionError) => void;
  /** Additional transaction metadata */
  metadata?: Record<string, any>;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  retryableErrors: [
    TransactionErrorType.NETWORK,
    TransactionErrorType.GAS
  ],
  useJitter: true
};

/**
 * Error code constants for common transaction errors
 */
export const ERROR_CODES = {
  // Network errors
  NETWORK_TIMEOUT: 'NETWORK_TIMEOUT',
  RPC_ERROR: 'RPC_ERROR',
  CONNECTION_FAILED: 'CONNECTION_FAILED',
  
  // Contract errors
  CONTRACT_REVERT: 'CONTRACT_REVERT',
  CONTRACT_NOT_FOUND: 'CONTRACT_NOT_FOUND',
  INVALID_FUNCTION: 'INVALID_FUNCTION',
  
  // User errors
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  USER_REJECTED: 'USER_REJECTED',
  INVALID_AMOUNT: 'INVALID_AMOUNT',
  
  // Gas errors
  GAS_TOO_LOW: 'GAS_TOO_LOW',
  OUT_OF_GAS: 'OUT_OF_GAS',
  GAS_ESTIMATION_FAILED: 'GAS_ESTIMATION_FAILED',
  
  // Validation errors
  INVALID_ADDRESS: 'INVALID_ADDRESS',
  INVALID_CHAIN: 'INVALID_CHAIN',
  BELOW_MIN_DEPOSIT: 'BELOW_MIN_DEPOSIT',
  
  // System errors
  CONFIG_ERROR: 'CONFIG_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
} as const;

/**
 * Type for error codes
 */
export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];

/**
 * Creates a transaction error with proper structure and defaults
 */
export function createTransactionError(
  type: TransactionErrorType,
  code: ErrorCode,
  message: string,
  context: TransactionContext,
  options: {
    severity?: TransactionErrorSeverity;
    userMessage?: string;
    suggestedActions?: string[];
    technicalDetails?: Record<string, any>;
    retryable?: boolean;
    originalError?: any;
  } = {}
): TransactionError {
  const {
    severity = TransactionErrorSeverity.MEDIUM,
    userMessage = message,
    suggestedActions = [],
    technicalDetails = {},
    retryable = false,
    originalError
  } = options;

  return {
    type,
    severity,
    code,
    message,
    userMessage,
    technicalDetails,
    retryable,
    suggestedActions,
    timestamp: new Date().toISOString(),
    context,
    originalError,
    stackTrace: originalError?.stack || new Error().stack
  };
}

/**
 * Creates a transaction context with proper structure
 */
export function createTransactionContext(
  chainId: number,
  vaultAddress: string,
  options: {
    userAddress?: string;
    amount?: bigint;
    gasLimit?: bigint;
    gasPrice?: bigint;
    nonce?: number;
    blockNumber?: number;
    txHash?: string;
    metadata?: Record<string, any>;
  } = {}
): TransactionContext {
  return {
    chainId,
    vaultAddress,
    ...options
  };
}

/**
 * Creates a validation result with proper structure
 */
export function createValidationResult(
  isValid: boolean,
  errors: TransactionError[] = [],
  warnings: TransactionError[] = [],
  metadata: Record<string, any> = {}
): ValidationResult {
  return {
    isValid,
    errors,
    warnings,
    metadata: {
      ...metadata,
      validationTimestamp: new Date().toISOString(),
      errorCount: errors.length,
      warningCount: warnings.length
    }
  };
}