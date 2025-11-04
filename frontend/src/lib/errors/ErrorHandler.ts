/**
 * ErrorHandler class for comprehensive error classification and detection
 * Handles categorization of different blockchain error types and provides user-friendly messaging
 */

import {
  TransactionError,
  TransactionErrorType,
  TransactionErrorSeverity,
  TransactionContext,
  ERROR_CODES,
  ErrorCode,
  createTransactionError,
  getErrorSeverity
} from './types';
import { Web3ErrorParser, ParsedWeb3Error } from './web3ErrorParser';

/**
 * Interface for error pattern matching
 */
interface ErrorPattern {
  pattern: RegExp | string;
  type: TransactionErrorType;
  code: ErrorCode;
  severity?: TransactionErrorSeverity;
  retryable?: boolean;
  userMessage: string;
  suggestedActions: string[];
}

/**
 * Comprehensive error handler for blockchain transactions
 */
export class ErrorHandler {
  private web3Parser: Web3ErrorParser;
  private errorPatterns: ErrorPattern[] = [
    // Network Errors
    {
      pattern: /network|timeout|connection|fetch/i,
      type: TransactionErrorType.NETWORK,
      code: ERROR_CODES.NETWORK_TIMEOUT,
      severity: TransactionErrorSeverity.LOW,
      retryable: true,
      userMessage: 'Network connection issue detected. Please check your internet connection.',
      suggestedActions: [
        'Check your internet connection',
        'Try again in a few moments',
        'Switch to a different network if available'
      ]
    },
    {
      pattern: /rpc|jsonrpc|provider/i,
      type: TransactionErrorType.NETWORK,
      code: ERROR_CODES.RPC_ERROR,
      severity: TransactionErrorSeverity.MEDIUM,
      retryable: true,
      userMessage: 'Blockchain network is experiencing issues. This is usually temporary.',
      suggestedActions: [
        'Wait a few minutes and try again',
        'Check if the network is experiencing high traffic',
        'Try using a different RPC endpoint if available'
      ]
    },
    {
      pattern: /failed to fetch|connection refused/i,
      type: TransactionErrorType.NETWORK,
      code: ERROR_CODES.CONNECTION_FAILED,
      severity: TransactionErrorSeverity.MEDIUM,
      retryable: true,
      userMessage: 'Unable to connect to the blockchain network.',
      suggestedActions: [
        'Check your internet connection',
        'Verify the network is not down',
        'Try refreshing the page'
      ]
    },

    // Contract Errors
    {
      pattern: /revert|reverted/i,
      type: TransactionErrorType.CONTRACT,
      code: ERROR_CODES.CONTRACT_REVERT,
      severity: TransactionErrorSeverity.HIGH,
      retryable: false,
      userMessage: 'The smart contract rejected your transaction.',
      suggestedActions: [
        'Check if you meet all requirements for this transaction',
        'Verify the contract parameters are correct',
        'Contact support if the issue persists'
      ]
    },
    {
      pattern: /contract not deployed|contract does not exist/i,
      type: TransactionErrorType.CONTRACT,
      code: ERROR_CODES.CONTRACT_NOT_FOUND,
      severity: TransactionErrorSeverity.CRITICAL,
      retryable: false,
      userMessage: 'The smart contract could not be found on this network.',
      suggestedActions: [
        'Verify you are connected to the correct network',
        'Check if the contract address is valid',
        'Contact support for assistance'
      ]
    },
    {
      pattern: /invalid function|function not found/i,
      type: TransactionErrorType.CONTRACT,
      code: ERROR_CODES.INVALID_FUNCTION,
      severity: TransactionErrorSeverity.HIGH,
      retryable: false,
      userMessage: 'Invalid contract function call.',
      suggestedActions: [
        'This appears to be a technical issue',
        'Please contact support',
        'Try refreshing the page'
      ]
    },

    // User Errors
    {
      pattern: /insufficient funds|insufficient balance/i,
      type: TransactionErrorType.USER,
      code: ERROR_CODES.INSUFFICIENT_FUNDS,
      severity: TransactionErrorSeverity.MEDIUM,
      retryable: false,
      userMessage: 'You don\'t have enough funds to complete this transaction.',
      suggestedActions: [
        'Add more funds to your wallet',
        'Reduce the transaction amount',
        'Check that you have enough for gas fees'
      ]
    },
    {
      pattern: /user rejected|user denied|user cancelled/i,
      type: TransactionErrorType.USER,
      code: ERROR_CODES.USER_REJECTED,
      severity: TransactionErrorSeverity.LOW,
      retryable: false,
      userMessage: 'Transaction was cancelled by user.',
      suggestedActions: [
        'Click "Confirm" in your wallet to proceed',
        'Make sure you want to complete this transaction',
        'Try the transaction again'
      ]
    },
    {
      pattern: /invalid amount|amount too small|amount too large/i,
      type: TransactionErrorType.USER,
      code: ERROR_CODES.INVALID_AMOUNT,
      severity: TransactionErrorSeverity.MEDIUM,
      retryable: false,
      userMessage: 'The transaction amount is invalid.',
      suggestedActions: [
        'Check the minimum and maximum deposit amounts',
        'Enter a valid amount',
        'Make sure the amount is greater than zero'
      ]
    },

    // Gas Errors
    {
      pattern: /gas too low|underpriced/i,
      type: TransactionErrorType.GAS,
      code: ERROR_CODES.GAS_TOO_LOW,
      severity: TransactionErrorSeverity.MEDIUM,
      retryable: true,
      userMessage: 'Transaction fee is too low for current network conditions.',
      suggestedActions: [
        'We\'ll automatically retry with higher fees',
        'Wait for network congestion to decrease',
        'Manually increase gas price if available'
      ]
    },
    {
      pattern: /out of gas|gas limit exceeded/i,
      type: TransactionErrorType.GAS,
      code: ERROR_CODES.OUT_OF_GAS,
      severity: TransactionErrorSeverity.HIGH,
      retryable: true,
      userMessage: 'Transaction ran out of gas during execution.',
      suggestedActions: [
        'We\'ll retry with higher gas limit',
        'This may indicate a contract issue',
        'Contact support if this continues'
      ]
    },
    {
      pattern: /gas estimation failed|cannot estimate gas/i,
      type: TransactionErrorType.GAS,
      code: ERROR_CODES.GAS_ESTIMATION_FAILED,
      severity: TransactionErrorSeverity.MEDIUM,
      retryable: true,
      userMessage: 'Unable to estimate transaction fees.',
      suggestedActions: [
        'Try again in a few moments',
        'Check if the transaction parameters are valid',
        'Network may be experiencing high traffic'
      ]
    },

    // Validation Errors
    {
      pattern: /invalid address|malformed address/i,
      type: TransactionErrorType.VALIDATION,
      code: ERROR_CODES.INVALID_ADDRESS,
      severity: TransactionErrorSeverity.MEDIUM,
      retryable: false,
      userMessage: 'Invalid wallet or contract address.',
      suggestedActions: [
        'Check that the address is correctly formatted',
        'Verify the address is for the correct network',
        'Make sure there are no typos in the address'
      ]
    },
    {
      pattern: /invalid chain|wrong network|unsupported chain/i,
      type: TransactionErrorType.VALIDATION,
      code: ERROR_CODES.INVALID_CHAIN,
      severity: TransactionErrorSeverity.HIGH,
      retryable: false,
      userMessage: 'You are connected to the wrong network.',
      suggestedActions: [
        'Switch to the correct network in your wallet',
        'Check the supported networks',
        'Refresh the page after switching networks'
      ]
    },
    {
      pattern: /below minimum|minimum deposit/i,
      type: TransactionErrorType.VALIDATION,
      code: ERROR_CODES.BELOW_MIN_DEPOSIT,
      severity: TransactionErrorSeverity.MEDIUM,
      retryable: false,
      userMessage: 'Deposit amount is below the minimum required.',
      suggestedActions: [
        'Increase your deposit amount',
        'Check the minimum deposit requirement',
        'Contact support if you need clarification'
      ]
    },

    // System Errors
    {
      pattern: /configuration|config/i,
      type: TransactionErrorType.SYSTEM,
      code: ERROR_CODES.CONFIG_ERROR,
      severity: TransactionErrorSeverity.CRITICAL,
      retryable: false,
      userMessage: 'System configuration error detected.',
      suggestedActions: [
        'This is a technical issue on our end',
        'Please contact support immediately',
        'Try refreshing the page'
      ]
    },
    {
      pattern: /internal error|unexpected error/i,
      type: TransactionErrorType.SYSTEM,
      code: ERROR_CODES.INTERNAL_ERROR,
      severity: TransactionErrorSeverity.CRITICAL,
      retryable: false,
      userMessage: 'An unexpected system error occurred.',
      suggestedActions: [
        'Please contact support',
        'Include details about what you were trying to do',
        'Try again later'
      ]
    }
  ];

  constructor() {
    this.web3Parser = new Web3ErrorParser();
  }

  /**
   * Main error handling method that processes any error and returns a structured TransactionError
   */
  public handleError(error: any, context: TransactionContext): TransactionError {
    try {
      // First try Web3-specific parsing
      const web3ParsedError = this.web3Parser.parseWeb3Error(error);
      
      // If Web3 parser found a specific error type, use it
      if (web3ParsedError.type !== TransactionErrorType.SYSTEM || 
          web3ParsedError.code !== ERROR_CODES.UNKNOWN_ERROR) {
        
        const technicalDetails = this.extractTechnicalDetails(error);
        
        return createTransactionError(
          web3ParsedError.type,
          web3ParsedError.code,
          web3ParsedError.originalMessage,
          context,
          {
            severity: web3ParsedError.severity,
            userMessage: this.generateUserMessage(web3ParsedError.parsedMessage, web3ParsedError.type, web3ParsedError.code),
            technicalDetails: {
              ...technicalDetails,
              parsedMessage: web3ParsedError.parsedMessage,
              revertReason: web3ParsedError.revertReason,
              web3ErrorData: web3ParsedError.errorData
            },
            retryable: web3ParsedError.retryable,
            suggestedActions: this.getSuggestedActions(web3ParsedError.parsedMessage, web3ParsedError.type, web3ParsedError.code),
            originalError: error
          }
        );
      }

      // Fallback to pattern-based parsing
      const errorMessage = this.extractErrorMessage(error);
      const technicalDetails = this.extractTechnicalDetails(error);
      
      // Classify the error
      const errorType = this.categorizeError(error);
      const errorCode = this.getErrorCode(error, errorType);
      const severity = getErrorSeverity(errorType, errorCode);
      
      // Generate user-friendly message and actions
      const userMessage = this.generateUserMessage(errorMessage, errorType, errorCode);
      const suggestedActions = this.getSuggestedActions(errorMessage, errorType, errorCode);
      const retryable = this.shouldRetry(errorType, errorCode, error);

      return createTransactionError(
        errorType,
        errorCode,
        errorMessage,
        context,
        {
          severity,
          userMessage,
          technicalDetails,
          retryable,
          suggestedActions,
          originalError: error
        }
      );
    } catch (handlingError) {
      // Fallback error if error handling itself fails
      return createTransactionError(
        TransactionErrorType.SYSTEM,
        ERROR_CODES.INTERNAL_ERROR,
        'Error occurred while processing the original error',
        context,
        {
          severity: TransactionErrorSeverity.CRITICAL,
          userMessage: 'An unexpected error occurred. Please contact support.',
          technicalDetails: {
            originalError: error,
            handlingError: handlingError
          },
          retryable: false,
          suggestedActions: ['Contact support', 'Try refreshing the page'],
          originalError: error
        }
      );
    }
  }

  /**
   * Categorizes error based on error message and type
   */
  public categorizeError(error: any): TransactionErrorType {
    const errorMessage = this.extractErrorMessage(error);
    
    // Check against known patterns
    for (const pattern of this.errorPatterns) {
      if (this.matchesPattern(errorMessage, pattern.pattern)) {
        return pattern.type;
      }
    }

    // Check error object properties for additional classification
    if (error?.code) {
      switch (error.code) {
        case 4001: // User rejected
          return TransactionErrorType.USER;
        case -32000: // Execution reverted
          return TransactionErrorType.CONTRACT;
        case -32603: // Internal error
          return TransactionErrorType.SYSTEM;
        case -32602: // Invalid params
          return TransactionErrorType.VALIDATION;
        default:
          break;
      }
    }

    // Default to system error if no pattern matches
    return TransactionErrorType.SYSTEM;
  }

  /**
   * Generates user-friendly error message
   */
  public generateUserMessage(errorMessage: string, errorType: TransactionErrorType, errorCode: ErrorCode): string {
    // Find matching pattern for user message
    for (const pattern of this.errorPatterns) {
      if (pattern.type === errorType && pattern.code === errorCode) {
        return pattern.userMessage;
      }
    }

    // Fallback messages by type
    switch (errorType) {
      case TransactionErrorType.NETWORK:
        return 'Network connection issue. Please check your internet connection and try again.';
      case TransactionErrorType.CONTRACT:
        return 'Smart contract error. Please verify your transaction details.';
      case TransactionErrorType.USER:
        return 'Transaction cancelled or invalid parameters provided.';
      case TransactionErrorType.GAS:
        return 'Gas-related issue. We\'ll try to resolve this automatically.';
      case TransactionErrorType.VALIDATION:
        return 'Invalid transaction parameters. Please check your inputs.';
      case TransactionErrorType.SYSTEM:
        return 'System error occurred. Please contact support.';
      default:
        return 'An unexpected error occurred. Please try again or contact support.';
    }
  }

  /**
   * Gets suggested actions for the error
   */
  public getSuggestedActions(errorMessage: string, errorType: TransactionErrorType, errorCode: ErrorCode): string[] {
    // Find matching pattern for suggested actions
    for (const pattern of this.errorPatterns) {
      if (pattern.type === errorType && pattern.code === errorCode) {
        return pattern.suggestedActions;
      }
    }

    // Fallback actions by type
    switch (errorType) {
      case TransactionErrorType.NETWORK:
        return ['Check internet connection', 'Try again in a few moments'];
      case TransactionErrorType.CONTRACT:
        return ['Verify transaction parameters', 'Contact support if issue persists'];
      case TransactionErrorType.USER:
        return ['Check wallet balance', 'Confirm transaction in wallet'];
      case TransactionErrorType.GAS:
        return ['Wait for automatic retry', 'Try again later'];
      case TransactionErrorType.VALIDATION:
        return ['Check input parameters', 'Verify network connection'];
      case TransactionErrorType.SYSTEM:
        return ['Contact support', 'Try refreshing the page'];
      default:
        return ['Try again', 'Contact support if issue persists'];
    }
  }

  /**
   * Determines if error should be retried
   */
  public shouldRetry(errorType: TransactionErrorType, errorCode: ErrorCode, originalError: any): boolean {
    // Check specific error codes that should not be retried
    const nonRetryableCodes = [
      ERROR_CODES.USER_REJECTED,
      ERROR_CODES.INSUFFICIENT_FUNDS,
      ERROR_CODES.INVALID_ADDRESS,
      ERROR_CODES.INVALID_CHAIN,
      ERROR_CODES.BELOW_MIN_DEPOSIT,
      ERROR_CODES.CONTRACT_NOT_FOUND,
      ERROR_CODES.CONFIG_ERROR
    ];

    if (nonRetryableCodes.includes(errorCode)) {
      return false;
    }

    // Check by error type
    switch (errorType) {
      case TransactionErrorType.NETWORK:
      case TransactionErrorType.GAS:
        return true;
      case TransactionErrorType.USER:
      case TransactionErrorType.VALIDATION:
        return false;
      case TransactionErrorType.CONTRACT:
        // Some contract errors can be retried (temporary issues)
        return errorCode !== ERROR_CODES.CONTRACT_REVERT;
      case TransactionErrorType.SYSTEM:
        // System errors generally shouldn't be retried
        return false;
      default:
        return false;
    }
  }

  /**
   * Extracts error message from various error formats
   */
  private extractErrorMessage(error: any): string {
    if (typeof error === 'string') {
      return error;
    }

    if (error?.message) {
      return error.message;
    }

    if (error?.reason) {
      return error.reason;
    }

    if (error?.data?.message) {
      return error.data.message;
    }

    if (error?.error?.message) {
      return error.error.message;
    }

    // Try to extract revert reason from contract errors
    if (error?.data && typeof error.data === 'string') {
      const revertReason = this.extractRevertReason(error.data);
      if (revertReason) {
        return revertReason;
      }
    }

    return JSON.stringify(error);
  }

  /**
   * Extracts technical details from error object
   */
  private extractTechnicalDetails(error: any): Record<string, any> {
    const details: Record<string, any> = {};

    if (error?.code) details.code = error.code;
    if (error?.data) details.data = error.data;
    if (error?.stack) details.stack = error.stack;
    if (error?.name) details.name = error.name;
    if (error?.transaction) details.transaction = error.transaction;
    if (error?.receipt) details.receipt = error.receipt;
    if (error?.reason) details.reason = error.reason;

    return details;
  }

  /**
   * Gets appropriate error code based on error and type
   */
  private getErrorCode(error: any, errorType: TransactionErrorType): ErrorCode {
    const errorMessage = this.extractErrorMessage(error);

    // Find matching pattern
    for (const pattern of this.errorPatterns) {
      if (pattern.type === errorType && this.matchesPattern(errorMessage, pattern.pattern)) {
        return pattern.code;
      }
    }

    // Fallback codes by type
    switch (errorType) {
      case TransactionErrorType.NETWORK:
        return ERROR_CODES.NETWORK_TIMEOUT;
      case TransactionErrorType.CONTRACT:
        return ERROR_CODES.CONTRACT_REVERT;
      case TransactionErrorType.USER:
        return ERROR_CODES.USER_REJECTED;
      case TransactionErrorType.GAS:
        return ERROR_CODES.GAS_TOO_LOW;
      case TransactionErrorType.VALIDATION:
        return ERROR_CODES.INVALID_ADDRESS;
      case TransactionErrorType.SYSTEM:
        return ERROR_CODES.INTERNAL_ERROR;
      default:
        return ERROR_CODES.UNKNOWN_ERROR;
    }
  }

  /**
   * Checks if error message matches a pattern
   */
  private matchesPattern(message: string, pattern: RegExp | string): boolean {
    if (pattern instanceof RegExp) {
      return pattern.test(message);
    }
    return message.toLowerCase().includes(pattern.toLowerCase());
  }

  /**
   * Extracts revert reason from contract error data
   */
  private extractRevertReason(data: string): string | null {
    try {
      // Remove 0x prefix if present
      const cleanData = data.startsWith('0x') ? data.slice(2) : data;
      
      // Try to decode as UTF-8 string
      if (cleanData.length > 8) {
        // Skip function selector (first 4 bytes = 8 hex chars)
        const reasonHex = cleanData.slice(8);
        
        // Convert hex to string
        let reason = '';
        for (let i = 0; i < reasonHex.length; i += 2) {
          const byte = parseInt(reasonHex.substr(i, 2), 16);
          if (byte > 0) {
            reason += String.fromCharCode(byte);
          }
        }
        
        return reason.trim() || null;
      }
    } catch (e) {
      // Ignore decoding errors
    }
    
    return null;
  }

  /**
   * Adds a custom error pattern for specific error handling
   */
  public addErrorPattern(pattern: ErrorPattern): void {
    this.errorPatterns.unshift(pattern); // Add to beginning for priority
  }

  /**
   * Gets all registered error patterns
   */
  public getErrorPatterns(): ErrorPattern[] {
    return [...this.errorPatterns];
  }
}