/**
 * Web3 Error Parser - Specialized parsing for blockchain and Web3 errors
 * Handles common error formats from wagmi, viem, ethers, and other Web3 libraries
 */

import {
  TransactionErrorType,
  TransactionErrorSeverity,
  ERROR_CODES,
  ErrorCode
} from './types';

/**
 * Interface for parsed Web3 error information
 */
export interface ParsedWeb3Error {
  type: TransactionErrorType;
  code: ErrorCode;
  severity: TransactionErrorSeverity;
  originalMessage: string;
  parsedMessage: string;
  revertReason?: string;
  errorData?: any;
  retryable: boolean;
}

/**
 * Web3 Error Parser class for handling blockchain-specific errors
 */
export class Web3ErrorParser {
  /**
   * Parses Web3/blockchain errors into structured format
   */
  public parseWeb3Error(error: any): ParsedWeb3Error {
    const originalMessage = this.extractMessage(error);
    
    // Handle wagmi/viem specific errors
    if (this.isWagmiError(error)) {
      return this.parseWagmiError(error);
    }

    // Handle ethers specific errors
    if (this.isEthersError(error)) {
      return this.parseEthersError(error);
    }

    // Handle RPC errors
    if (this.isRPCError(error)) {
      return this.parseRPCError(error);
    }

    // Handle contract revert errors
    if (this.isContractRevert(error)) {
      return this.parseContractRevert(error);
    }

    // Handle wallet errors
    if (this.isWalletError(error)) {
      return this.parseWalletError(error);
    }

    // Fallback parsing
    return this.parseGenericError(error);
  }

  /**
   * Checks if error is from wagmi/viem
   */
  private isWagmiError(error: any): boolean {
    return error?.name?.includes('Wagmi') || 
           error?.name?.includes('Viem') ||
           error?.shortMessage !== undefined;
  }

  /**
   * Parses wagmi/viem specific errors
   */
  private parseWagmiError(error: any): ParsedWeb3Error {
    const originalMessage = error.shortMessage || error.message || '';
    
    // Handle specific wagmi error types
    if (error.name === 'UserRejectedRequestError') {
      return {
        type: TransactionErrorType.USER,
        code: ERROR_CODES.USER_REJECTED,
        severity: TransactionErrorSeverity.LOW,
        originalMessage,
        parsedMessage: 'User rejected the transaction',
        retryable: false
      };
    }

    if (error.name === 'InsufficientFundsError') {
      return {
        type: TransactionErrorType.USER,
        code: ERROR_CODES.INSUFFICIENT_FUNDS,
        severity: TransactionErrorSeverity.MEDIUM,
        originalMessage,
        parsedMessage: 'Insufficient funds for transaction',
        retryable: false
      };
    }

    if (error.name === 'ContractFunctionExecutionError') {
      const revertReason = this.extractRevertReason(error);
      return {
        type: TransactionErrorType.CONTRACT,
        code: ERROR_CODES.CONTRACT_REVERT,
        severity: TransactionErrorSeverity.HIGH,
        originalMessage,
        parsedMessage: revertReason || 'Contract execution failed',
        revertReason,
        retryable: false
      };
    }

    if (error.name === 'EstimateGasExecutionError') {
      return {
        type: TransactionErrorType.GAS,
        code: ERROR_CODES.GAS_ESTIMATION_FAILED,
        severity: TransactionErrorSeverity.MEDIUM,
        originalMessage,
        parsedMessage: 'Gas estimation failed',
        retryable: true
      };
    }

    // Default wagmi error handling
    return this.parseGenericError(error);
  }

  /**
   * Checks if error is from ethers
   */
  private isEthersError(error: any): boolean {
    return error?.code !== undefined && 
           (error.code.toString().startsWith('CALL_EXCEPTION') ||
            error.code.toString().startsWith('UNPREDICTABLE_GAS_LIMIT') ||
            error.code.toString().startsWith('INSUFFICIENT_FUNDS'));
  }

  /**
   * Parses ethers specific errors
   */
  private parseEthersError(error: any): ParsedWeb3Error {
    const originalMessage = error.message || '';
    
    if (error.code === 'CALL_EXCEPTION') {
      const revertReason = error.reason || this.extractRevertReason(error);
      return {
        type: TransactionErrorType.CONTRACT,
        code: ERROR_CODES.CONTRACT_REVERT,
        severity: TransactionErrorSeverity.HIGH,
        originalMessage,
        parsedMessage: revertReason || 'Contract call failed',
        revertReason,
        retryable: false
      };
    }

    if (error.code === 'INSUFFICIENT_FUNDS') {
      return {
        type: TransactionErrorType.USER,
        code: ERROR_CODES.INSUFFICIENT_FUNDS,
        severity: TransactionErrorSeverity.MEDIUM,
        originalMessage,
        parsedMessage: 'Insufficient funds for transaction',
        retryable: false
      };
    }

    if (error.code === 'UNPREDICTABLE_GAS_LIMIT') {
      return {
        type: TransactionErrorType.GAS,
        code: ERROR_CODES.GAS_ESTIMATION_FAILED,
        severity: TransactionErrorSeverity.MEDIUM,
        originalMessage,
        parsedMessage: 'Cannot estimate gas limit',
        retryable: true
      };
    }

    return this.parseGenericError(error);
  }

  /**
   * Checks if error is an RPC error
   */
  private isRPCError(error: any): boolean {
    return error?.code !== undefined && 
           (error.code === -32000 || 
            error.code === -32603 || 
            error.code === -32602 ||
            error.code === -32601);
  }

  /**
   * Parses RPC specific errors
   */
  private parseRPCError(error: any): ParsedWeb3Error {
    const originalMessage = error.message || '';
    
    switch (error.code) {
      case -32000: // Execution reverted
        const revertReason = this.extractRevertReason(error);
        return {
          type: TransactionErrorType.CONTRACT,
          code: ERROR_CODES.CONTRACT_REVERT,
          severity: TransactionErrorSeverity.HIGH,
          originalMessage,
          parsedMessage: revertReason || 'Transaction reverted',
          revertReason,
          retryable: false
        };

      case -32603: // Internal error
        return {
          type: TransactionErrorType.SYSTEM,
          code: ERROR_CODES.INTERNAL_ERROR,
          severity: TransactionErrorSeverity.CRITICAL,
          originalMessage,
          parsedMessage: 'Internal RPC error',
          retryable: false
        };

      case -32602: // Invalid params
        return {
          type: TransactionErrorType.VALIDATION,
          code: ERROR_CODES.INVALID_ADDRESS,
          severity: TransactionErrorSeverity.MEDIUM,
          originalMessage,
          parsedMessage: 'Invalid transaction parameters',
          retryable: false
        };

      case -32601: // Method not found
        return {
          type: TransactionErrorType.CONTRACT,
          code: ERROR_CODES.INVALID_FUNCTION,
          severity: TransactionErrorSeverity.HIGH,
          originalMessage,
          parsedMessage: 'Contract method not found',
          retryable: false
        };

      default:
        return this.parseGenericError(error);
    }
  }

  /**
   * Checks if error is a contract revert
   */
  private isContractRevert(error: any): boolean {
    const message = this.extractMessage(error).toLowerCase();
    return message.includes('revert') || 
           message.includes('execution reverted') ||
           error?.data?.startsWith('0x08c379a0'); // Error(string) selector
  }

  /**
   * Parses contract revert errors
   */
  private parseContractRevert(error: any): ParsedWeb3Error {
    const originalMessage = this.extractMessage(error);
    const revertReason = this.extractRevertReason(error);
    
    return {
      type: TransactionErrorType.CONTRACT,
      code: ERROR_CODES.CONTRACT_REVERT,
      severity: TransactionErrorSeverity.HIGH,
      originalMessage,
      parsedMessage: revertReason || 'Contract execution reverted',
      revertReason,
      errorData: error.data,
      retryable: false
    };
  }

  /**
   * Checks if error is from wallet
   */
  private isWalletError(error: any): boolean {
    return error?.code === 4001 || // User rejected
           error?.code === 4100 || // Unauthorized
           error?.code === 4200 || // Unsupported method
           this.extractMessage(error).toLowerCase().includes('user rejected');
  }

  /**
   * Parses wallet specific errors
   */
  private parseWalletError(error: any): ParsedWeb3Error {
    const originalMessage = this.extractMessage(error);
    
    if (error.code === 4001) {
      return {
        type: TransactionErrorType.USER,
        code: ERROR_CODES.USER_REJECTED,
        severity: TransactionErrorSeverity.LOW,
        originalMessage,
        parsedMessage: 'User rejected the transaction',
        retryable: false
      };
    }

    if (error.code === 4100) {
      return {
        type: TransactionErrorType.USER,
        code: ERROR_CODES.USER_REJECTED,
        severity: TransactionErrorSeverity.MEDIUM,
        originalMessage,
        parsedMessage: 'Wallet not authorized for this action',
        retryable: false
      };
    }

    return this.parseGenericError(error);
  }

  /**
   * Generic error parsing fallback
   */
  private parseGenericError(error: any): ParsedWeb3Error {
    const originalMessage = this.extractMessage(error);
    
    return {
      type: TransactionErrorType.SYSTEM,
      code: ERROR_CODES.UNKNOWN_ERROR,
      severity: TransactionErrorSeverity.MEDIUM,
      originalMessage,
      parsedMessage: originalMessage || 'Unknown error occurred',
      retryable: false
    };
  }

  /**
   * Extracts error message from various error formats
   */
  private extractMessage(error: any): string {
    if (typeof error === 'string') {
      return error;
    }

    // Try different message properties
    const messagePaths = [
      'shortMessage',
      'message',
      'reason',
      'data.message',
      'error.message',
      'details'
    ];

    for (const path of messagePaths) {
      const value = this.getNestedProperty(error, path);
      if (value && typeof value === 'string') {
        return value;
      }
    }

    return JSON.stringify(error);
  }

  /**
   * Extracts revert reason from error data
   */
  private extractRevertReason(error: any): string | undefined {
    // Try to get reason from error object
    if (error?.reason && typeof error.reason === 'string') {
      return error.reason;
    }

    // Try to extract from error data
    if (error?.data && typeof error.data === 'string') {
      return this.decodeRevertReason(error.data);
    }

    // Try to extract from nested error
    if (error?.cause?.data && typeof error.cause.data === 'string') {
      return this.decodeRevertReason(error.cause.data);
    }

    // Try to extract from message
    const message = this.extractMessage(error);
    const revertMatch = message.match(/revert (.+?)(?:\n|$)/i);
    if (revertMatch) {
      return revertMatch[1].trim();
    }

    return undefined;
  }

  /**
   * Decodes revert reason from hex data
   */
  private decodeRevertReason(data: string): string | undefined {
    try {
      // Remove 0x prefix
      const cleanData = data.startsWith('0x') ? data.slice(2) : data;
      
      // Check if it's an Error(string) - selector 0x08c379a0
      if (cleanData.startsWith('08c379a0')) {
        // Skip selector (8 chars) and offset (64 chars)
        const reasonHex = cleanData.slice(72);
        
        // Get length (next 64 chars)
        const lengthHex = reasonHex.slice(0, 64);
        const length = parseInt(lengthHex, 16);
        
        // Get reason string
        const reasonDataHex = reasonHex.slice(64, 64 + length * 2);
        
        // Convert hex to string
        let reason = '';
        for (let i = 0; i < reasonDataHex.length; i += 2) {
          const byte = parseInt(reasonDataHex.substr(i, 2), 16);
          if (byte > 0) {
            reason += String.fromCharCode(byte);
          }
        }
        
        return reason.trim() || undefined;
      }
      
      // Try simple hex to string conversion
      let reason = '';
      for (let i = 0; i < cleanData.length; i += 2) {
        const byte = parseInt(cleanData.substr(i, 2), 16);
        if (byte > 31 && byte < 127) { // Printable ASCII
          reason += String.fromCharCode(byte);
        }
      }
      
      return reason.trim() || undefined;
    } catch (e) {
      return undefined;
    }
  }

  /**
   * Gets nested property from object using dot notation
   */
  private getNestedProperty(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  }

  /**
   * Checks if error indicates insufficient gas
   */
  public isInsufficientGasError(error: any): boolean {
    const message = this.extractMessage(error).toLowerCase();
    return message.includes('out of gas') ||
           message.includes('gas limit') ||
           message.includes('gas too low') ||
           message.includes('underpriced');
  }

  /**
   * Checks if error indicates network issues
   */
  public isNetworkError(error: any): boolean {
    const message = this.extractMessage(error).toLowerCase();
    return message.includes('network') ||
           message.includes('timeout') ||
           message.includes('connection') ||
           message.includes('fetch failed');
  }

  /**
   * Checks if error indicates user rejection
   */
  public isUserRejectionError(error: any): boolean {
    return error?.code === 4001 ||
           this.extractMessage(error).toLowerCase().includes('user rejected');
  }

  /**
   * Gets suggested gas adjustment for gas-related errors
   */
  public getSuggestedGasAdjustment(error: any): { gasLimit?: number; gasPrice?: number } {
    const message = this.extractMessage(error).toLowerCase();
    
    if (message.includes('out of gas') || message.includes('gas limit')) {
      return { gasLimit: 1.5 }; // Increase gas limit by 50%
    }
    
    if (message.includes('gas too low') || message.includes('underpriced')) {
      return { gasPrice: 1.2 }; // Increase gas price by 20%
    }
    
    return {};
  }
}