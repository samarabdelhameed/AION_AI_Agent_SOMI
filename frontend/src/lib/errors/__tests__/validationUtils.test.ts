/**
 * Tests for validation utility functions
 */

import { describe, it, expect } from 'vitest';
import {
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
  getSimplifiedErrorMessage,
  isTemporaryIssue,
  getRecommendedAction,
  mergeValidationResults
} from '../validationUtils';

import {
  TransactionErrorType,
  TransactionErrorSeverity,
  ERROR_CODES,
  ValidationResult,
  createTransactionError,
  createTransactionContext,
  createValidationResult
} from '../types';

describe('Validation Utils', () => {
  const mockContext = createTransactionContext(56, '0x123');

  const createMockError = (
    type: TransactionErrorType,
    severity: TransactionErrorSeverity,
    code: string,
    retryable: boolean = false
  ) => createTransactionError(type, code, `Test ${code}`, mockContext, {
    severity,
    retryable,
    userMessage: `User message for ${code}`,
    suggestedActions: [`Action for ${code}`]
  });

  describe('createValidationSummary', () => {
    it('should create summary for valid result with no errors', () => {
      const result = createValidationResult(true, [], []);
      const summary = createValidationSummary(result);

      expect(summary.isValid).toBe(true);
      expect(summary.errorCount).toBe(0);
      expect(summary.warningCount).toBe(0);
      expect(summary.highestSeverity).toBeNull();
      expect(summary.hasCriticalErrors).toBe(false);
      expect(summary.hasRetryableErrors).toBe(false);
    });

    it('should create summary for result with errors and warnings', () => {
      const errors = [
        createMockError(TransactionErrorType.USER, TransactionErrorSeverity.HIGH, ERROR_CODES.INSUFFICIENT_FUNDS),
        createMockError(TransactionErrorType.NETWORK, TransactionErrorSeverity.MEDIUM, ERROR_CODES.NETWORK_TIMEOUT, true)
      ];
      const warnings = [
        createMockError(TransactionErrorType.GAS, TransactionErrorSeverity.LOW, ERROR_CODES.GAS_TOO_LOW)
      ];

      const result = createValidationResult(false, errors, warnings);
      const summary = createValidationSummary(result);

      expect(summary.isValid).toBe(false);
      expect(summary.errorCount).toBe(2);
      expect(summary.warningCount).toBe(1);
      expect(summary.highestSeverity).toBe(TransactionErrorSeverity.HIGH);
      expect(summary.errorTypes).toContain(TransactionErrorType.USER);
      expect(summary.errorTypes).toContain(TransactionErrorType.NETWORK);
      expect(summary.errorTypes).toContain(TransactionErrorType.GAS);
      expect(summary.hasRetryableErrors).toBe(true);
      expect(summary.primaryErrorMessage).toBe('User message for INSUFFICIENT_FUNDS');
    });

    it('should identify critical errors', () => {
      const errors = [
        createMockError(TransactionErrorType.SYSTEM, TransactionErrorSeverity.CRITICAL, ERROR_CODES.INTERNAL_ERROR)
      ];

      const result = createValidationResult(false, errors, []);
      const summary = createValidationSummary(result);

      expect(summary.hasCriticalErrors).toBe(true);
      expect(summary.highestSeverity).toBe(TransactionErrorSeverity.CRITICAL);
    });

    it('should collect all suggested actions', () => {
      const errors = [
        createMockError(TransactionErrorType.USER, TransactionErrorSeverity.MEDIUM, ERROR_CODES.INSUFFICIENT_FUNDS),
        createMockError(TransactionErrorType.GAS, TransactionErrorSeverity.LOW, ERROR_CODES.GAS_TOO_LOW)
      ];

      const result = createValidationResult(false, errors, []);
      const summary = createValidationSummary(result);

      expect(summary.allSuggestedActions).toContain('Action for INSUFFICIENT_FUNDS');
      expect(summary.allSuggestedActions).toContain('Action for GAS_TOO_LOW');
    });
  });

  describe('groupErrorsByType', () => {
    it('should group errors by type correctly', () => {
      const errors = [
        createMockError(TransactionErrorType.USER, TransactionErrorSeverity.HIGH, ERROR_CODES.INSUFFICIENT_FUNDS),
        createMockError(TransactionErrorType.USER, TransactionErrorSeverity.MEDIUM, ERROR_CODES.USER_REJECTED),
        createMockError(TransactionErrorType.NETWORK, TransactionErrorSeverity.LOW, ERROR_CODES.NETWORK_TIMEOUT)
      ];

      const result = createValidationResult(false, errors, []);
      const groups = groupErrorsByType(result);

      expect(groups).toHaveLength(2);
      
      const userGroup = groups.find(g => g.type === TransactionErrorType.USER);
      const networkGroup = groups.find(g => g.type === TransactionErrorType.NETWORK);

      expect(userGroup?.errors).toHaveLength(2);
      expect(userGroup?.mostSevere?.severity).toBe(TransactionErrorSeverity.HIGH);
      expect(networkGroup?.errors).toHaveLength(1);
    });

    it('should sort groups by severity', () => {
      const errors = [
        createMockError(TransactionErrorType.NETWORK, TransactionErrorSeverity.LOW, ERROR_CODES.NETWORK_TIMEOUT),
        createMockError(TransactionErrorType.SYSTEM, TransactionErrorSeverity.CRITICAL, ERROR_CODES.INTERNAL_ERROR),
        createMockError(TransactionErrorType.USER, TransactionErrorSeverity.MEDIUM, ERROR_CODES.INSUFFICIENT_FUNDS)
      ];

      const result = createValidationResult(false, errors, []);
      const groups = groupErrorsByType(result);

      expect(groups[0].type).toBe(TransactionErrorType.SYSTEM); // Critical first
      expect(groups[1].type).toBe(TransactionErrorType.USER);   // Medium second
      expect(groups[2].type).toBe(TransactionErrorType.NETWORK); // Low last
    });
  });

  describe('filtering functions', () => {
    const errors = [
      createMockError(TransactionErrorType.USER, TransactionErrorSeverity.HIGH, ERROR_CODES.INSUFFICIENT_FUNDS),
      createMockError(TransactionErrorType.NETWORK, TransactionErrorSeverity.LOW, ERROR_CODES.NETWORK_TIMEOUT)
    ];
    const result = createValidationResult(false, errors, []);

    it('should filter errors by type', () => {
      const filtered = filterErrorsByType(result, TransactionErrorType.USER);
      expect(filtered.errors).toHaveLength(1);
      expect(filtered.errors[0].type).toBe(TransactionErrorType.USER);
    });

    it('should filter errors by severity', () => {
      const filtered = filterErrorsBySeverity(result, TransactionErrorSeverity.HIGH);
      expect(filtered.errors).toHaveLength(1);
      expect(filtered.errors[0].severity).toBe(TransactionErrorSeverity.HIGH);
    });
  });

  describe('retryable error functions', () => {
    const errors = [
      createMockError(TransactionErrorType.NETWORK, TransactionErrorSeverity.LOW, ERROR_CODES.NETWORK_TIMEOUT, true),
      createMockError(TransactionErrorType.USER, TransactionErrorSeverity.MEDIUM, ERROR_CODES.INSUFFICIENT_FUNDS, false)
    ];
    const result = createValidationResult(false, errors, []);

    it('should get retryable errors', () => {
      const retryable = getRetryableErrors(result);
      expect(retryable).toHaveLength(1);
      expect(retryable[0].retryable).toBe(true);
    });

    it('should get non-retryable errors', () => {
      const nonRetryable = getNonRetryableErrors(result);
      expect(nonRetryable).toHaveLength(1);
      expect(nonRetryable[0].retryable).toBe(false);
    });
  });

  describe('error code functions', () => {
    const errors = [
      createMockError(TransactionErrorType.USER, TransactionErrorSeverity.MEDIUM, ERROR_CODES.INSUFFICIENT_FUNDS),
      createMockError(TransactionErrorType.NETWORK, TransactionErrorSeverity.LOW, ERROR_CODES.NETWORK_TIMEOUT)
    ];
    const result = createValidationResult(false, errors, []);

    it('should check if error code exists', () => {
      expect(hasErrorCode(result, ERROR_CODES.INSUFFICIENT_FUNDS)).toBe(true);
      expect(hasErrorCode(result, ERROR_CODES.CONTRACT_REVERT)).toBe(false);
    });

    it('should get errors by code', () => {
      const byCode = getErrorsByCode(result, ERROR_CODES.INSUFFICIENT_FUNDS);
      expect(byCode).toHaveLength(1);
      expect(byCode[0].code).toBe(ERROR_CODES.INSUFFICIENT_FUNDS);
    });
  });

  describe('canProceedWithWarnings', () => {
    it('should return true for valid result with warnings', () => {
      const warnings = [
        createMockError(TransactionErrorType.GAS, TransactionErrorSeverity.LOW, ERROR_CODES.GAS_TOO_LOW)
      ];
      const result = createValidationResult(true, [], warnings);
      
      expect(canProceedWithWarnings(result)).toBe(true);
    });

    it('should return false for invalid result', () => {
      const errors = [
        createMockError(TransactionErrorType.USER, TransactionErrorSeverity.MEDIUM, ERROR_CODES.INSUFFICIENT_FUNDS)
      ];
      const result = createValidationResult(false, errors, []);
      
      expect(canProceedWithWarnings(result)).toBe(false);
    });
  });

  describe('name functions', () => {
    it('should get error type names', () => {
      expect(getErrorTypeName(TransactionErrorType.USER)).toBe('User Error');
      expect(getErrorTypeName(TransactionErrorType.NETWORK)).toBe('Network Error');
      expect(getErrorTypeName(TransactionErrorType.CONTRACT)).toBe('Contract Error');
    });

    it('should get severity names', () => {
      expect(getSeverityName(TransactionErrorSeverity.LOW)).toBe('Low');
      expect(getSeverityName(TransactionErrorSeverity.CRITICAL)).toBe('Critical');
    });
  });

  describe('getSimplifiedErrorMessage', () => {
    it('should return success message for valid result', () => {
      const result = createValidationResult(true, [], []);
      expect(getSimplifiedErrorMessage(result)).toBe('Validation passed');
    });

    it('should return warning message for valid result with warnings', () => {
      const warnings = [
        createMockError(TransactionErrorType.GAS, TransactionErrorSeverity.LOW, ERROR_CODES.GAS_TOO_LOW)
      ];
      const result = createValidationResult(true, [], warnings);
      expect(getSimplifiedErrorMessage(result)).toBe('Validation passed with 1 warning(s)');
    });

    it('should return single error message', () => {
      const errors = [
        createMockError(TransactionErrorType.USER, TransactionErrorSeverity.MEDIUM, ERROR_CODES.INSUFFICIENT_FUNDS)
      ];
      const result = createValidationResult(false, errors, []);
      expect(getSimplifiedErrorMessage(result)).toBe('User message for INSUFFICIENT_FUNDS');
    });

    it('should return multiple errors message', () => {
      const errors = [
        createMockError(TransactionErrorType.USER, TransactionErrorSeverity.MEDIUM, ERROR_CODES.INSUFFICIENT_FUNDS),
        createMockError(TransactionErrorType.GAS, TransactionErrorSeverity.LOW, ERROR_CODES.GAS_TOO_LOW)
      ];
      const result = createValidationResult(false, errors, []);
      expect(getSimplifiedErrorMessage(result)).toBe('Validation failed with 2 error(s)');
    });
  });

  describe('isTemporaryIssue', () => {
    it('should identify temporary network issues', () => {
      const errors = [
        createMockError(TransactionErrorType.NETWORK, TransactionErrorSeverity.LOW, ERROR_CODES.NETWORK_TIMEOUT, true)
      ];
      const result = createValidationResult(false, errors, []);
      
      expect(isTemporaryIssue(result)).toBe(true);
    });

    it('should not identify permanent issues as temporary', () => {
      const errors = [
        createMockError(TransactionErrorType.USER, TransactionErrorSeverity.MEDIUM, ERROR_CODES.INSUFFICIENT_FUNDS, false)
      ];
      const result = createValidationResult(false, errors, []);
      
      expect(isTemporaryIssue(result)).toBe(false);
    });
  });

  describe('getRecommendedAction', () => {
    it('should recommend proceeding for valid result', () => {
      const result = createValidationResult(true, [], []);
      expect(getRecommendedAction(result)).toBe('Proceed with transaction');
    });

    it('should recommend caution for valid result with warnings', () => {
      const warnings = [
        createMockError(TransactionErrorType.GAS, TransactionErrorSeverity.LOW, ERROR_CODES.GAS_TOO_LOW)
      ];
      const result = createValidationResult(true, [], warnings);
      expect(getRecommendedAction(result)).toBe('Proceed with caution - warnings detected');
    });

    it('should recommend support for critical errors', () => {
      const errors = [
        createMockError(TransactionErrorType.SYSTEM, TransactionErrorSeverity.CRITICAL, ERROR_CODES.INTERNAL_ERROR)
      ];
      const result = createValidationResult(false, errors, []);
      expect(getRecommendedAction(result)).toBe('Contact support - critical system error detected');
    });

    it('should recommend retry for retryable errors', () => {
      const errors = [
        createMockError(TransactionErrorType.NETWORK, TransactionErrorSeverity.LOW, ERROR_CODES.NETWORK_TIMEOUT, true)
      ];
      const result = createValidationResult(false, errors, []);
      expect(getRecommendedAction(result)).toBe('Retry transaction - temporary issue detected');
    });
  });

  describe('mergeValidationResults', () => {
    it('should merge multiple validation results', () => {
      const result1 = createValidationResult(false, [
        createMockError(TransactionErrorType.USER, TransactionErrorSeverity.MEDIUM, ERROR_CODES.INSUFFICIENT_FUNDS)
      ], []);

      const result2 = createValidationResult(true, [], [
        createMockError(TransactionErrorType.GAS, TransactionErrorSeverity.LOW, ERROR_CODES.GAS_TOO_LOW)
      ]);

      const merged = mergeValidationResults([result1, result2]);

      expect(merged.isValid).toBe(false); // Has errors
      expect(merged.errors).toHaveLength(1);
      expect(merged.warnings).toHaveLength(1);
    });

    it('should merge metadata from all results', () => {
      const result1 = createValidationResult(true, [], []);
      result1.metadata = { source: 'validator1' };

      const result2 = createValidationResult(true, [], []);
      result2.metadata = { timestamp: '2023-01-01' };

      const merged = mergeValidationResults([result1, result2]);

      expect(merged.metadata).toEqual({
        source: 'validator1',
        timestamp: '2023-01-01'
      });
    });
  });
});