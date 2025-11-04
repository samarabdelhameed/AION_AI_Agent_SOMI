/**
 * Error handling infrastructure exports
 * Provides centralized access to all error-related types and utilities
 */

import { ErrorHandler } from './ErrorHandler';

import { ErrorHandler } from './ErrorHandler';

// Export all types and interfaces
export type {
  TransactionError,
  TransactionContext,
  TransactionStatusUpdate,
  ValidationResult,
  RetryConfig,
  ErrorStats,
  ErrorFilters,
  NetworkConditions,
  ErrorContext,
  TransactionNotification,
  EnhancedDepositParams,
  ErrorCode
} from './types';

// Export enums
export {
  TransactionErrorType,
  TransactionErrorSeverity,
  TransactionStatus
} from './types';

// Export constants
export {
  DEFAULT_RETRY_CONFIG,
  ERROR_CODES
} from './types';

// Export utility functions
export {
  createTransactionError,
  createTransactionContext,
  createStatusUpdate,
  createValidationResult,
  isRetryableError,
  getErrorSeverity,
  getStatusProgress,
  validateTransactionError,
  validateTransactionContext,
  sanitizeErrorForUser,
  formatErrorForLogging,
  isSameErrorType,
  getStatusDescription
} from './utils';

// Export message generator
export {
  MessageGenerator,
  messageGenerator
} from './MessageGenerator';

export type {
  LanguageCode,
  MessageTemplate,
  LocalizedMessages,
  MessageOptions,
  UserMessage
} from './MessageGenerator';

// Export status tracker
export {
  StatusTracker,
  statusTracker
} from './StatusTracker';

export type {
  StatusCallback,
  StatusSubscription,
  TransactionTrackingEntry,
  StatusTrackerConfig
} from './StatusTracker';

// Export retry manager
export {
  RetryManager,
  retryManager
} from './RetryManager';

export type {
  RetryAttempt,
  RetryStrategy,
  RetrySession,
  RetryCallback,
  RetryProgressCallback
} from './RetryManager';

// Export error logger
export {
  ErrorLogger,
  errorLogger
} from './ErrorLogger';

export type {
  LogEntry,
  LogStorage,
  AnalyticsData,
  LoggerConfig
} from './ErrorLogger';

// Export enhanced transaction executor
export {
  EnhancedTransactionExecutor,
  enhancedTransactionExecutor,
  depositWithWalletEnhanced,
  getMinDepositWeiEnhanced
} from './EnhancedTransactionExecutor';

export type {
  TransactionResult
} from './EnhancedTransactionExecutor';

// Export notification manager
export {
  NotificationManager,
  notificationManager
} from './NotificationManager';

export type {
  NotificationQueueEntry,
  NotificationDisplayOptions,
  NotificationEvent,
  NotificationEventListener,
  NotificationTemplate
} from './NotificationManager';

// Export error analytics
export {
  ErrorAnalytics,
  errorAnalytics
} from './ErrorAnalytics';

export type {
  PerformanceMetrics,
  AlertThreshold,
  AlertNotification,
  ErrorPattern,
  DashboardData,
  AnalyticsConfig
} from './ErrorAnalytics';

// Export enhanced local timeline
export {
  EnhancedLocalTimeline,
  enhancedLocalTimeline,
  appendEnhancedLocalActivity,
  migrateOldActivities
} from './EnhancedLocalTimeline';

export type {
  EnhancedLocalActivity,
  TimelineFilters,
  TimelineStats
} from './EnhancedLocalTimeline';

// Export error simulator
export {
  ErrorSimulator,
  errorSimulator
} from './ErrorSimulator';

export type {
  ErrorScenario,
  SimulationConfig,
  SimulationResult,
  MockErrorGenerator,
  PerformanceTestConfig,
  PerformanceTestResult
} from './ErrorSimulator';

// Export Web3 integration
export {
  Web3ErrorIntegration,
  web3ErrorIntegration
} from './Web3ErrorIntegration';

// Export transaction recovery
export {
  TransactionRecovery,
  transactionRecovery
} from './TransactionRecovery';

export type {
  RecoveryActionType,
  RecoveryAction,
  TransactionRecoveryState,
  RecoveryConfig
} from './TransactionRecovery';

// Export validation classes and utilities
export { TransactionValidator, DEFAULT_VALIDATION_CONFIG } from './TransactionValidator';
export type { ValidationConfig, ValidationParams, BalanceValidationResult, ContractValidationResult, GasValidationResult } from './TransactionValidator';

export {
  createValidationSummary,
  groupErrorsByType,
  filterErrorsByType,
  filterErrorsBySeverity,
  getRetryableErrors,
  getNonRetryableErrors,
  hasErrorCode,
  getErrorsByCode,
  canProceedWithWarnings,
  getErrorTypeName,
  getSeverityName,
  getSeverityClassName,
  getSimplifiedErrorMessage,
  formatValidationForLogging,
  mergeValidationResults,
  isTemporaryIssue,
  getRecommendedAction
} from './validationUtils';

export type { ValidationSummary, ErrorGroup } from './validationUtils';

// Export ErrorHandler class
export { ErrorHandler } from './ErrorHandler';

// Export Web3ErrorParser
export { Web3ErrorParser } from './web3ErrorParser';
export type { ParsedWeb3Error } from './web3ErrorParser';