// Enhanced error management system
export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  CONTRACT_ERROR = 'CONTRACT_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  USER_ERROR = 'USER_ERROR',
}

export interface AppError {
  type: ErrorType;
  code: string;
  message: string;
  details?: any;
  recoverable: boolean;
  userMessage: string;
  suggestedActions: string[];
  timestamp: Date;
}

export class ErrorManager {
  private static instance: ErrorManager;
  private errorHistory: AppError[] = [];
  private maxHistorySize = 100;

  static getInstance(): ErrorManager {
    if (!ErrorManager.instance) {
      ErrorManager.instance = new ErrorManager();
    }
    return ErrorManager.instance;
  }

  handleError(error: any, context?: string): AppError {
    const appError = this.classifyError(error, context);
    this.logError(appError);
    return appError;
  }

  private classifyError(error: any, context?: string): AppError {
    const timestamp = new Date();

    // Network/API errors
    if (error.message?.includes('Failed to fetch') || error.message?.includes('fetch')) {
      return {
        type: ErrorType.NETWORK_ERROR,
        code: 'CONNECTION_FAILED',
        message: 'Failed to connect to backend services',
        details: { originalError: error.message, context },
        recoverable: true,
        userMessage: 'Unable to connect to the server. Please check your internet connection.',
        suggestedActions: [
          'Check your internet connection',
          'Try refreshing the page',
          'Wait a moment and try again'
        ],
        timestamp
      };
    }

    // Timeout errors
    if (error.name === 'AbortError' || error.message?.includes('timeout')) {
      return {
        type: ErrorType.TIMEOUT_ERROR,
        code: 'REQUEST_TIMEOUT',
        message: 'Request timed out',
        details: { originalError: error.message, context },
        recoverable: true,
        userMessage: 'The request took too long to complete.',
        suggestedActions: [
          'Try again',
          'Check your internet connection',
          'Contact support if the issue persists'
        ],
        timestamp
      };
    }

    // Web3/Contract errors
    if (error.message?.includes('config.getClient') || error.message?.includes('wagmi')) {
      return {
        type: ErrorType.CONTRACT_ERROR,
        code: 'WEB3_CONFIG_ERROR',
        message: 'Web3 configuration error',
        details: { originalError: error.message, context },
        recoverable: true,
        userMessage: 'There was an issue with the wallet connection.',
        suggestedActions: [
          'Disconnect and reconnect your wallet',
          'Refresh the page',
          'Switch to a supported network (BSC or BSC Testnet)'
        ],
        timestamp
      };
    }

    // User rejected transaction
    if (error.message?.includes('User rejected') || error.code === 4001) {
      return {
        type: ErrorType.USER_ERROR,
        code: 'USER_REJECTED',
        message: 'Transaction rejected by user',
        details: { originalError: error.message, context },
        recoverable: true,
        userMessage: 'Transaction was cancelled.',
        suggestedActions: [
          'Try the transaction again',
          'Check transaction details before confirming'
        ],
        timestamp
      };
    }

    // Insufficient funds
    if (error.message?.includes('insufficient funds') || error.message?.includes('balance')) {
      return {
        type: ErrorType.VALIDATION_ERROR,
        code: 'INSUFFICIENT_FUNDS',
        message: 'Insufficient funds for transaction',
        details: { originalError: error.message, context },
        recoverable: true,
        userMessage: 'You don\'t have enough funds for this transaction.',
        suggestedActions: [
          'Check your wallet balance',
          'Reduce the transaction amount',
          'Add more funds to your wallet'
        ],
        timestamp
      };
    }

    // Null/undefined data errors
    if (error.message?.includes('Cannot read properties of null') || 
        error.message?.includes('Cannot read properties of undefined')) {
      return {
        type: ErrorType.CONFIGURATION_ERROR,
        code: 'DATA_NOT_AVAILABLE',
        message: 'Required data is not available',
        details: { originalError: error.message, context },
        recoverable: true,
        userMessage: 'Some data is temporarily unavailable.',
        suggestedActions: [
          'Refresh the page',
          'Wait a moment for data to load',
          'Check your internet connection'
        ],
        timestamp
      };
    }

    // Generic error
    return {
      type: ErrorType.NETWORK_ERROR,
      code: 'UNKNOWN_ERROR',
      message: error.message || 'An unknown error occurred',
      details: { originalError: error, context },
      recoverable: true,
      userMessage: 'An unexpected error occurred.',
      suggestedActions: [
        'Try refreshing the page',
        'Contact support if the issue persists'
      ],
      timestamp
    };
  }

  private logError(error: AppError): void {
    // Add to history
    this.errorHistory.unshift(error);
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(0, this.maxHistorySize);
    }

    // Console logging with appropriate level
    if (error.type === ErrorType.USER_ERROR) {
      console.info('User action:', error.message);
    } else if (error.recoverable) {
      console.warn('Recoverable error:', error.message, error.details);
    } else {
      console.error('Critical error:', error.message, error.details);
    }

    // In production, you might want to send to error tracking service
    // Example: Sentry.captureException(new Error(error.message), { extra: error.details });
  }

  getErrorHistory(): AppError[] {
    return [...this.errorHistory];
  }

  clearErrorHistory(): void {
    this.errorHistory = [];
  }

  getRecoveryActions(errorCode: string): string[] {
    const error = this.errorHistory.find(e => e.code === errorCode);
    return error?.suggestedActions || [];
  }
}

// Singleton instance
export const errorManager = ErrorManager.getInstance();

// Utility functions
export function handleAsyncError<T>(
  promise: Promise<T>,
  context?: string
): Promise<[T | null, AppError | null]> {
  return promise
    .then<[T, null]>((data: T) => [data, null])
    .catch<[null, AppError]>((error: any) => [null, errorManager.handleError(error, context)]);
}

export function safeAsync<T>(
  fn: () => Promise<T>,
  fallback: T,
  context?: string
): Promise<T> {
  return fn().catch((error) => {
    errorManager.handleError(error, context);
    return fallback;
  });
}

// React hook for error handling
import { useState, useCallback } from 'react';

export function useErrorHandler() {
  const [lastError, setLastError] = useState<AppError | null>(null);

  const handleError = useCallback((error: any, context?: string) => {
    const appError = errorManager.handleError(error, context);
    setLastError(appError);
    return appError;
  }, []);

  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  return {
    lastError,
    handleError,
    clearError,
    errorHistory: errorManager.getErrorHistory(),
  };
}