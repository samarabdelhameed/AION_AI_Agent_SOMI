/**
 * Intelligent retry mechanism with configurable strategies and automatic gas adjustment
 */

import {
  TransactionError,
  TransactionErrorType,
  TransactionContext,
  RetryConfig,
  DEFAULT_RETRY_CONFIG,
  ERROR_CODES,
  createTransactionError,
  isRetryableError
} from './types';

/**
 * Retry attempt information
 */
export interface RetryAttempt {
  attemptNumber: number;
  timestamp: string;
  error: TransactionError;
  delay: number;
  gasAdjustment?: {
    originalGasPrice: bigint;
    adjustedGasPrice: bigint;
    adjustmentFactor: number;
  };
}

/**
 * Retry strategy interface
 */
export interface RetryStrategy {
  name: string;
  shouldRetry: (error: TransactionError, attempt: number, config: RetryConfig) => boolean;
  calculateDelay: (attempt: number, config: RetryConfig) => number;
  adjustGasPrice?: (gasPrice: bigint, attempt: number, error: TransactionError) => bigint;
}

/**
 * Retry session tracking
 */
export interface RetrySession {
  id: string;
  originalContext: TransactionContext;
  currentContext: TransactionContext;
  config: RetryConfig;
  attempts: RetryAttempt[];
  startTime: string;
  lastAttemptTime: string;
  isActive: boolean;
  strategy: RetryStrategy;
}

/**
 * Retry callback types
 */
export type RetryCallback = (context: TransactionContext, attempt: number) => Promise<any>;
export type RetryProgressCallback = (session: RetrySession, attempt: RetryAttempt) => void;

/**
 * Retry manager class for intelligent transaction retry handling
 */
export class RetryManager {
  private sessions: Map<string, RetrySession> = new Map();
  private strategies: Map<string, RetryStrategy> = new Map();
  private nextSessionId = 1;

  constructor() {
    this.registerDefaultStrategies();
  }

  /**
   * Execute function with retry logic
   */
  async executeWithRetry<T>(
    fn: RetryCallback,
    context: TransactionContext,
    config: Partial<RetryConfig> = {},
    progressCallback?: RetryProgressCallback
  ): Promise<T> {
    const fullConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
    const sessionId = `retry_${this.nextSessionId++}`;
    const strategy = this.getStrategy('exponential-backoff');

    const session: RetrySession = {
      id: sessionId,
      originalContext: { ...context },
      currentContext: { ...context },
      config: fullConfig,
      attempts: [],
      startTime: new Date().toISOString(),
      lastAttemptTime: new Date().toISOString(),
      isActive: true,
      strategy
    };

    this.sessions.set(sessionId, session);

    try {
      return await this.executeRetryLoop(fn, session, progressCallback);
    } finally {
      session.isActive = false;
    }
  }

  /**
   * Register a custom retry strategy
   */
  registerStrategy(strategy: RetryStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  /**
   * Get retry session by ID
   */
  getSession(sessionId: string): RetrySession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get all active retry sessions
   */
  getActiveSessions(): RetrySession[] {
    return Array.from(this.sessions.values()).filter(session => session.isActive);
  }

  /**
   * Cancel a retry session
   */
  cancelSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.isActive = false;
    }
  }

  /**
   * Clear completed sessions
   */
  clearCompletedSessions(): void {
    const completedSessions = Array.from(this.sessions.entries())
      .filter(([_, session]) => !session.isActive)
      .map(([id]) => id);

    completedSessions.forEach(id => this.sessions.delete(id));
  }

  /**
   * Get retry statistics
   */
  getRetryStats(): {
    totalSessions: number;
    activeSessions: number;
    successRate: number;
    averageAttempts: number;
    commonErrors: Array<{ code: string; count: number }>;
  } {
    const allSessions = Array.from(this.sessions.values());
    const completedSessions = allSessions.filter(s => !s.isActive);
    
    const totalAttempts = allSessions.reduce((sum, s) => sum + s.attempts.length, 0);
    const successfulSessions = completedSessions.filter(s => 
      s.attempts.length > 0 && s.attempts.length <= s.config.maxRetries
    );

    // Count error codes
    const errorCounts: Record<string, number> = {};
    allSessions.forEach(session => {
      session.attempts.forEach(attempt => {
        const code = attempt.error.code;
        errorCounts[code] = (errorCounts[code] || 0) + 1;
      });
    });

    const commonErrors = Object.entries(errorCounts)
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalSessions: allSessions.length,
      activeSessions: allSessions.filter(s => s.isActive).length,
      successRate: completedSessions.length > 0 ? 
        (successfulSessions.length / completedSessions.length) * 100 : 0,
      averageAttempts: allSessions.length > 0 ? 
        totalAttempts / allSessions.length : 0,
      commonErrors
    };
  }

  /**
   * Execute the retry loop
   */
  private async executeRetryLoop<T>(
    fn: RetryCallback,
    session: RetrySession,
    progressCallback?: RetryProgressCallback
  ): Promise<T> {
    let lastError: TransactionError | null = null;

    for (let attempt = 0; attempt <= session.config.maxRetries; attempt++) {
      if (!session.isActive) {
        throw new Error('Retry session was cancelled');
      }

      try {
        // Execute the function
        const result = await fn(session.currentContext, attempt);
        return result;
      } catch (error) {
        lastError = this.normalizeError(error, session.currentContext);
        
        // Record the attempt
        const retryAttempt: RetryAttempt = {
          attemptNumber: attempt,
          timestamp: new Date().toISOString(),
          error: lastError,
          delay: 0
        };

        // Check if we should retry
        if (attempt >= session.config.maxRetries || 
            !session.strategy.shouldRetry(lastError, attempt, session.config)) {
          session.attempts.push(retryAttempt);
          break;
        }

        // Calculate delay and adjust gas if needed
        const delay = session.strategy.calculateDelay(attempt + 1, session.config);
        retryAttempt.delay = delay;

        // Adjust gas price for gas-related errors
        if (this.shouldAdjustGas(lastError) && session.strategy.adjustGasPrice) {
          const originalGasPrice = session.currentContext.gasPrice || BigInt(0);
          const adjustedGasPrice = session.strategy.adjustGasPrice(
            originalGasPrice, 
            attempt + 1, 
            lastError
          );
          
          retryAttempt.gasAdjustment = {
            originalGasPrice,
            adjustedGasPrice,
            adjustmentFactor: Number(adjustedGasPrice) / Number(originalGasPrice)
          };

          session.currentContext = {
            ...session.currentContext,
            gasPrice: adjustedGasPrice
          };
        }

        session.attempts.push(retryAttempt);
        session.lastAttemptTime = retryAttempt.timestamp;

        // Notify progress callback
        if (progressCallback) {
          progressCallback(session, retryAttempt);
        }

        // Wait before next attempt
        if (delay > 0) {
          await this.delay(delay);
        }
      }
    }

    // All retries exhausted
    throw lastError || new Error('Retry attempts exhausted');
  }

  /**
   * Normalize error to TransactionError format
   */
  private normalizeError(error: any, context: TransactionContext): TransactionError {
    if (error && typeof error === 'object' && error.type && error.code) {
      return error as TransactionError;
    }

    // Convert generic error to TransactionError
    return createTransactionError(
      TransactionErrorType.SYSTEM,
      ERROR_CODES.UNKNOWN_ERROR,
      error?.message || 'Unknown error occurred',
      context,
      {
        originalError: error,
        retryable: false
      }
    );
  }

  /**
   * Check if gas price should be adjusted for this error
   */
  private shouldAdjustGas(error: TransactionError): boolean {
    return error.type === TransactionErrorType.GAS && (
      error.code === ERROR_CODES.GAS_TOO_LOW ||
      error.code === ERROR_CODES.OUT_OF_GAS ||
      error.code === ERROR_CODES.GAS_ESTIMATION_FAILED
    );
  }

  /**
   * Get retry strategy by name
   */
  private getStrategy(name: string): RetryStrategy {
    const strategy = this.strategies.get(name);
    if (!strategy) {
      throw new Error(`Retry strategy '${name}' not found`);
    }
    return strategy;
  }

  /**
   * Delay execution for specified milliseconds
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Register default retry strategies
   */
  private registerDefaultStrategies(): void {
    // Exponential backoff strategy
    this.registerStrategy({
      name: 'exponential-backoff',
      shouldRetry: (error, attempt, config) => {
        return attempt < config.maxRetries && 
               config.retryableErrors.includes(error.type) &&
               error.retryable;
      },
      calculateDelay: (attempt, config) => {
        const baseDelay = config.baseDelay;
        const exponentialDelay = baseDelay * Math.pow(config.backoffMultiplier, attempt - 1);
        const cappedDelay = Math.min(exponentialDelay, config.maxDelay);
        
        // Add jitter if enabled
        if (config.useJitter) {
          const jitter = cappedDelay * 0.1 * Math.random();
          return cappedDelay + jitter;
        }
        
        return cappedDelay;
      },
      adjustGasPrice: (gasPrice, attempt, error) => {
        if (error.type === TransactionErrorType.GAS) {
          // Increase gas price by 20% per attempt
          const multiplier = 1 + (0.2 * attempt);
          return BigInt(Math.floor(Number(gasPrice) * multiplier));
        }
        return gasPrice;
      }
    });

    // Linear backoff strategy
    this.registerStrategy({
      name: 'linear-backoff',
      shouldRetry: (error, attempt, config) => {
        return attempt < config.maxRetries && 
               config.retryableErrors.includes(error.type) &&
               error.retryable;
      },
      calculateDelay: (attempt, config) => {
        const linearDelay = config.baseDelay * attempt;
        const cappedDelay = Math.min(linearDelay, config.maxDelay);
        
        if (config.useJitter) {
          const jitter = cappedDelay * 0.1 * Math.random();
          return cappedDelay + jitter;
        }
        
        return cappedDelay;
      },
      adjustGasPrice: (gasPrice, attempt, error) => {
        if (error.type === TransactionErrorType.GAS) {
          // Increase gas price by 15% per attempt (more conservative)
          const multiplier = 1 + (0.15 * attempt);
          return BigInt(Math.floor(Number(gasPrice) * multiplier));
        }
        return gasPrice;
      }
    });

    // Fixed delay strategy
    this.registerStrategy({
      name: 'fixed-delay',
      shouldRetry: (error, attempt, config) => {
        return attempt < config.maxRetries && 
               config.retryableErrors.includes(error.type) &&
               error.retryable;
      },
      calculateDelay: (attempt, config) => {
        return config.baseDelay;
      },
      adjustGasPrice: (gasPrice, attempt, error) => {
        if (error.type === TransactionErrorType.GAS) {
          // Increase gas price by 25% per attempt (aggressive)
          const multiplier = 1 + (0.25 * attempt);
          return BigInt(Math.floor(Number(gasPrice) * multiplier));
        }
        return gasPrice;
      }
    });

    // Immediate retry strategy (for testing)
    this.registerStrategy({
      name: 'immediate',
      shouldRetry: (error, attempt, config) => {
        return attempt < config.maxRetries && error.retryable;
      },
      calculateDelay: () => 0,
      adjustGasPrice: (gasPrice) => gasPrice
    });
  }
}

/**
 * Default retry manager instance
 */
export const retryManager = new RetryManager();