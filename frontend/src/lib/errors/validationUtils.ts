/**
 * Utility functions for transaction validation
 * Provides helper functions for working with validation results and error handling
 */

import {
  ValidationResult,
  TransactionError,
  TransactionErrorType,
  TransactionErrorSeverity,
  ERROR_CODES
} from './types';

/**
 * Validation summary interface
 */
export interface ValidationSummary {
  /** Whether validation passed overall */
  isValid: boolean;
  /** Total number of errors */
  errorCount: number;
  /** Total number of warnings */
  warningCount: number;
  /** Most severe error level found */
  highestSeverity: TransactionErrorSeverity | null;
  /** Categories of errors found */
  errorTypes: TransactionErrorType[];
  /** Whether any critical errors were found */
  hasCriticalErrors: boolean;
  /** Whether any retryable errors were found */
  hasRetryableErrors: boolean;
  /** Primary error message for display */
  primaryErrorMessage?: string;
  /** Suggested actions from all errors */
  allSuggestedActions: string[];
}

/**
 * Error grouping interface
 */
export interface ErrorGroup {
  /** Error type category */
  type: TransactionErrorType;
  /** Errors in this category */
  errors: TransactionError[];
  /** Warnings in this category */
  warnings: TransactionError[];
  /** Most severe error in this group */
  mostSevere: TransactionError | null;
}

/**
 * Creates a comprehensive summary of validation results
 */
export function createValidationSummary(result: ValidationResult): ValidationSummary {
  const allErrors = [...result.errors, ...result.warnings];
  const errorTypes = [...new Set(allErrors.map(error => error.type))];
  
  // Find highest severity
  let highestSeverity: TransactionErrorSeverity | null = null;
  const severityOrder = [
    TransactionErrorSeverity.LOW,
    TransactionErrorSeverity.MEDIUM,
    TransactionErrorSeverity.HIGH,
    TransactionErrorSeverity.CRITICAL
  ];

  for (const error of allErrors) {
    if (!highestSeverity || 
        severityOrder.indexOf(error.severity) > severityOrder.indexOf(highestSeverity)) {
      highestSeverity = error.severity;
    }
  }

  // Check for critical and retryable errors
  const hasCriticalErrors = allErrors.some(
    error => error.severity === TransactionErrorSeverity.CRITICAL
  );
  const hasRetryableErrors = allErrors.some(error => error.retryable);

  // Get primary error message (most severe error)
  const primaryError = result.errors.length > 0 ? 
    result.errors.reduce((prev, current) => 
      severityOrder.indexOf(current.severity) > severityOrder.indexOf(prev.severity) ? 
        current : prev
    ) : null;

  // Collect all suggested actions
  const allSuggestedActions = [
    ...new Set(allErrors.flatMap(error => error.suggestedActions))
  ];

  return {
    isValid: result.isValid,
    errorCount: result.errors.length,
    warningCount: result.warnings.length,
    highestSeverity,
    errorTypes,
    hasCriticalErrors,
    hasRetryableErrors,
    primaryErrorMessage: primaryError?.userMessage,
    allSuggestedActions
  };
}

/**
 * Groups errors by type for organized display
 */
export function groupErrorsByType(result: ValidationResult): ErrorGroup[] {
  const groups = new Map<TransactionErrorType, ErrorGroup>();

  // Process errors
  for (const error of result.errors) {
    if (!groups.has(error.type)) {
      groups.set(error.type, {
        type: error.type,
        errors: [],
        warnings: [],
        mostSevere: null
      });
    }
    
    const group = groups.get(error.type)!;
    group.errors.push(error);
    
    // Update most severe error
    if (!group.mostSevere || 
        getSeverityWeight(error.severity) > getSeverityWeight(group.mostSevere.severity)) {
      group.mostSevere = error;
    }
  }

  // Process warnings
  for (const warning of result.warnings) {
    if (!groups.has(warning.type)) {
      groups.set(warning.type, {
        type: warning.type,
        errors: [],
        warnings: [],
        mostSevere: null
      });
    }
    
    const group = groups.get(warning.type)!;
    group.warnings.push(warning);
    
    // Update most severe if this warning is more severe than current
    if (!group.mostSevere || 
        getSeverityWeight(warning.severity) > getSeverityWeight(group.mostSevere.severity)) {
      group.mostSevere = warning;
    }
  }

  return Array.from(groups.values()).sort((a, b) => {
    // Sort by severity (most severe first)
    const aSeverity = a.mostSevere ? getSeverityWeight(a.mostSevere.severity) : 0;
    const bSeverity = b.mostSevere ? getSeverityWeight(b.mostSevere.severity) : 0;
    return bSeverity - aSeverity;
  });
}

/**
 * Gets numeric weight for severity comparison
 */
function getSeverityWeight(severity: TransactionErrorSeverity): number {
  switch (severity) {
    case TransactionErrorSeverity.LOW:
      return 1;
    case TransactionErrorSeverity.MEDIUM:
      return 2;
    case TransactionErrorSeverity.HIGH:
      return 3;
    case TransactionErrorSeverity.CRITICAL:
      return 4;
    default:
      return 0;
  }
}

/**
 * Filters validation results by error type
 */
export function filterErrorsByType(
  result: ValidationResult, 
  type: TransactionErrorType
): ValidationResult {
  return {
    isValid: result.isValid,
    errors: result.errors.filter(error => error.type === type),
    warnings: result.warnings.filter(warning => warning.type === type),
    metadata: result.metadata
  };
}

/**
 * Filters validation results by severity
 */
export function filterErrorsBySeverity(
  result: ValidationResult, 
  severity: TransactionErrorSeverity
): ValidationResult {
  return {
    isValid: result.isValid,
    errors: result.errors.filter(error => error.severity === severity),
    warnings: result.warnings.filter(warning => warning.severity === severity),
    metadata: result.metadata
  };
}

/**
 * Gets only retryable errors from validation results
 */
export function getRetryableErrors(result: ValidationResult): TransactionError[] {
  return [...result.errors, ...result.warnings].filter(error => error.retryable);
}

/**
 * Gets only non-retryable errors from validation results
 */
export function getNonRetryableErrors(result: ValidationResult): TransactionError[] {
  return [...result.errors, ...result.warnings].filter(error => !error.retryable);
}

/**
 * Checks if validation result contains specific error code
 */
export function hasErrorCode(result: ValidationResult, code: string): boolean {
  return [...result.errors, ...result.warnings].some(error => error.code === code);
}

/**
 * Gets all errors with specific error code
 */
export function getErrorsByCode(result: ValidationResult, code: string): TransactionError[] {
  return [...result.errors, ...result.warnings].filter(error => error.code === code);
}

/**
 * Checks if validation can proceed despite warnings
 */
export function canProceedWithWarnings(result: ValidationResult): boolean {
  return result.isValid && result.errors.length === 0;
}

/**
 * Gets user-friendly error type name
 */
export function getErrorTypeName(type: TransactionErrorType): string {
  switch (type) {
    case TransactionErrorType.NETWORK:
      return 'Network Error';
    case TransactionErrorType.CONTRACT:
      return 'Contract Error';
    case TransactionErrorType.USER:
      return 'User Error';
    case TransactionErrorType.GAS:
      return 'Gas Error';
    case TransactionErrorType.VALIDATION:
      return 'Validation Error';
    case TransactionErrorType.SYSTEM:
      return 'System Error';
    default:
      return 'Unknown Error';
  }
}

/**
 * Gets user-friendly severity name
 */
export function getSeverityName(severity: TransactionErrorSeverity): string {
  switch (severity) {
    case TransactionErrorSeverity.LOW:
      return 'Low';
    case TransactionErrorSeverity.MEDIUM:
      return 'Medium';
    case TransactionErrorSeverity.HIGH:
      return 'High';
    case TransactionErrorSeverity.CRITICAL:
      return 'Critical';
    default:
      return 'Unknown';
  }
}

/**
 * Gets CSS class name for severity styling
 */
export function getSeverityClassName(severity: TransactionErrorSeverity): string {
  switch (severity) {
    case TransactionErrorSeverity.LOW:
      return 'severity-low';
    case TransactionErrorSeverity.MEDIUM:
      return 'severity-medium';
    case TransactionErrorSeverity.HIGH:
      return 'severity-high';
    case TransactionErrorSeverity.CRITICAL:
      return 'severity-critical';
    default:
      return 'severity-unknown';
  }
}

/**
 * Creates a simplified error message for quick display
 */
export function getSimplifiedErrorMessage(result: ValidationResult): string {
  if (result.isValid) {
    return result.warnings.length > 0 ? 
      `Validation passed with ${result.warnings.length} warning(s)` : 
      'Validation passed';
  }

  const summary = createValidationSummary(result);
  
  if (summary.errorCount === 1) {
    return summary.primaryErrorMessage || 'Validation failed';
  }

  return `Validation failed with ${summary.errorCount} error(s)`;
}

/**
 * Formats validation result for logging
 */
export function formatValidationForLogging(result: ValidationResult): Record<string, any> {
  const summary = createValidationSummary(result);
  
  return {
    isValid: result.isValid,
    summary,
    errors: result.errors.map(error => ({
      type: error.type,
      severity: error.severity,
      code: error.code,
      message: error.message,
      retryable: error.retryable,
      timestamp: error.timestamp
    })),
    warnings: result.warnings.map(warning => ({
      type: warning.type,
      severity: warning.severity,
      code: warning.code,
      message: warning.message,
      timestamp: warning.timestamp
    })),
    metadata: result.metadata
  };
}

/**
 * Merges multiple validation results into one
 */
export function mergeValidationResults(results: ValidationResult[]): ValidationResult {
  const allErrors: TransactionError[] = [];
  const allWarnings: TransactionError[] = [];
  const mergedMetadata: Record<string, any> = {};

  for (const result of results) {
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
    Object.assign(mergedMetadata, result.metadata);
  }

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
    metadata: mergedMetadata
  };
}

/**
 * Checks if validation result indicates a temporary issue that might resolve
 */
export function isTemporaryIssue(result: ValidationResult): boolean {
  const temporaryCodes = [
    ERROR_CODES.NETWORK_TIMEOUT,
    ERROR_CODES.RPC_ERROR,
    ERROR_CODES.CONNECTION_FAILED,
    ERROR_CODES.GAS_ESTIMATION_FAILED
  ];

  return [...result.errors, ...result.warnings].some(error => 
    temporaryCodes.includes(error.code as any) || error.retryable
  );
}

/**
 * Gets recommended next action based on validation results
 */
export function getRecommendedAction(result: ValidationResult): string {
  if (result.isValid) {
    return result.warnings.length > 0 ? 
      'Proceed with caution - warnings detected' : 
      'Proceed with transaction';
  }

  const summary = createValidationSummary(result);
  
  if (summary.hasCriticalErrors) {
    return 'Contact support - critical system error detected';
  }

  if (summary.hasRetryableErrors && !summary.hasCriticalErrors) {
    return 'Retry transaction - temporary issue detected';
  }

  if (summary.allSuggestedActions.length > 0) {
    return summary.allSuggestedActions[0]; // Return first suggested action
  }

  return 'Review and fix validation errors before proceeding';
}