/**
 * @fileoverview Comprehensive Error Management System
 * @description Centralized error handling with categorization, logging, and recovery
 */

export class ErrorManager {
  constructor() {
    this.errorCategories = {
      VALIDATION: 'validation',
      NETWORK: 'network',
      BLOCKCHAIN: 'blockchain',
      AUTHENTICATION: 'authentication',
      RATE_LIMIT: 'rate_limit',
      INTERNAL: 'internal',
      EXTERNAL_API: 'external_api'
    };
    
    this.errorCounts = new Map();
    this.lastErrors = [];
    this.maxLastErrors = 100;
  }

  /**
   * Create error context for tracking
   */
  createContext(operation, path, metadata = {}) {
    return {
      operation,
      path,
      timestamp: new Date().toISOString(),
      metadata
    };
  }

  /**
   * Handle and categorize errors
   */
  handleError(error, context, category = null) {
    const errorInfo = {
      id: this.generateErrorId(),
      message: error.message,
      stack: error.stack,
      category: category || this.categorizeError(error),
      context,
      timestamp: new Date().toISOString(),
      severity: this.determineSeverity(error, category)
    };

    // Track error counts
    const key = `${errorInfo.category}:${errorInfo.context.operation}`;
    this.errorCounts.set(key, (this.errorCounts.get(key) || 0) + 1);

    // Store recent errors
    this.lastErrors.unshift(errorInfo);
    if (this.lastErrors.length > this.maxLastErrors) {
      this.lastErrors.pop();
    }

    // Log error
    this.logError(errorInfo);

    return errorInfo;
  }

  /**
   * Categorize error based on type and message
   */
  categorizeError(error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('validation') || message.includes('invalid')) {
      return this.errorCategories.VALIDATION;
    }
    if (message.includes('network') || message.includes('timeout')) {
      return this.errorCategories.NETWORK;
    }
    if (message.includes('gas') || message.includes('transaction')) {
      return this.errorCategories.BLOCKCHAIN;
    }
    if (message.includes('unauthorized') || message.includes('forbidden')) {
      return this.errorCategories.AUTHENTICATION;
    }
    if (message.includes('rate limit') || message.includes('too many')) {
      return this.errorCategories.RATE_LIMIT;
    }
    if (message.includes('api') || message.includes('external')) {
      return this.errorCategories.EXTERNAL_API;
    }
    
    return this.errorCategories.INTERNAL;
  }

  /**
   * Determine error severity
   */
  determineSeverity(error, category) {
    if (category === this.errorCategories.AUTHENTICATION) return 'high';
    if (category === this.errorCategories.BLOCKCHAIN) return 'high';
    if (category === this.errorCategories.VALIDATION) return 'medium';
    if (category === this.errorCategories.RATE_LIMIT) return 'low';
    
    return 'medium';
  }

  /**
   * Generate unique error ID
   */
  generateErrorId() {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log error with appropriate level
   */
  logError(errorInfo) {
    const logLevel = errorInfo.severity === 'high' ? 'error' : 
                    errorInfo.severity === 'medium' ? 'warn' : 'info';
    
    console[logLevel](`[${errorInfo.category.toUpperCase()}] ${errorInfo.message}`, {
      id: errorInfo.id,
      operation: errorInfo.context.operation,
      path: errorInfo.context.path,
      timestamp: errorInfo.timestamp
    });
  }

  /**
   * Get error statistics
   */
  getErrorStats() {
    const stats = {
      totalErrors: this.lastErrors.length,
      errorsByCategory: {},
      errorsByOperation: {},
      recentErrors: this.lastErrors.slice(0, 10)
    };

    // Count by category
    this.lastErrors.forEach(error => {
      stats.errorsByCategory[error.category] = 
        (stats.errorsByCategory[error.category] || 0) + 1;
      
      stats.errorsByOperation[error.context.operation] = 
        (stats.errorsByOperation[error.context.operation] || 0) + 1;
    });

    return stats;
  }

  /**
   * Create error response for API
   */
  createErrorResponse(error, context, statusCode = 500) {
    const errorInfo = this.handleError(error, context);
    
    return {
      success: false,
      error: {
        id: errorInfo.id,
        message: errorInfo.message,
        category: errorInfo.category,
        timestamp: errorInfo.timestamp
      },
      statusCode
    };
  }

  /**
   * Global error handler middleware
   */
  createGlobalErrorHandler() {
    return (error, request, reply) => {
      const context = this.createContext(
        request.method + ' ' + request.url,
        request.url,
        { 
          userAgent: request.headers['user-agent'],
          ip: request.ip 
        }
      );

      const errorResponse = this.createErrorResponse(error, context);
      reply.status(errorResponse.statusCode).send(errorResponse);
    };
  }
}

export default ErrorManager;