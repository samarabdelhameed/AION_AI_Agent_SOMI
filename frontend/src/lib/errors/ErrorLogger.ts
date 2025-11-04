/**
 * Comprehensive error logging system with structured logging and analytics
 */

import {
  TransactionError,
  TransactionErrorType,
  TransactionErrorSeverity,
  ErrorStats,
  ErrorFilters,
  ErrorContext,
  formatErrorForLogging
} from './types';

/**
 * Log entry interface
 */
export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  category: string;
  message: string;
  error?: TransactionError;
  context?: Record<string, any>;
  sessionId?: string;
  userId?: string;
  tags?: string[];
}

/**
 * Log storage interface
 */
export interface LogStorage {
  store(entry: LogEntry): Promise<void>;
  retrieve(filters: ErrorFilters): Promise<LogEntry[]>;
  count(filters?: Partial<ErrorFilters>): Promise<number>;
  clear(olderThan?: string): Promise<number>;
}

/**
 * Analytics data interface
 */
export interface AnalyticsData {
  errorPatterns: Array<{
    pattern: string;
    count: number;
    lastSeen: string;
    severity: TransactionErrorSeverity;
  }>;
  timeSeriesData: Array<{
    timestamp: string;
    errorCount: number;
    errorsByType: Record<TransactionErrorType, number>;
  }>;
  userImpact: {
    affectedUsers: number;
    totalErrors: number;
    averageErrorsPerUser: number;
  };
  performanceMetrics: {
    averageResolutionTime: number;
    retrySuccessRate: number;
    criticalErrorRate: number;
  };
}

/**
 * Logger configuration
 */
export interface LoggerConfig {
  maxLogSize: number;
  retentionDays: number;
  enableAnalytics: boolean;
  enablePatternDetection: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error' | 'critical';
  batchSize: number;
  flushInterval: number;
}

/**
 * In-memory log storage implementation
 */
class MemoryLogStorage implements LogStorage {
  private logs: LogEntry[] = [];
  private maxSize: number;

  constructor(maxSize: number = 10000) {
    this.maxSize = maxSize;
  }

  async store(entry: LogEntry): Promise<void> {
    this.logs.push(entry);
    
    // Maintain size limit
    if (this.logs.length > this.maxSize) {
      this.logs = this.logs.slice(-this.maxSize);
    }
  }

  async retrieve(filters: ErrorFilters): Promise<LogEntry[]> {
    let filtered = [...this.logs];

    // Apply filters
    if (filters.type) {
      filtered = filtered.filter(log => 
        log.error?.type === filters.type
      );
    }

    if (filters.severity) {
      filtered = filtered.filter(log => 
        log.error?.severity === filters.severity
      );
    }

    if (filters.chainId) {
      filtered = filtered.filter(log => 
        log.error?.context.chainId === filters.chainId
      );
    }

    if (filters.userAddress) {
      filtered = filtered.filter(log => 
        log.error?.context.userAddress === filters.userAddress
      );
    }

    if (filters.errorCode) {
      filtered = filtered.filter(log => 
        log.error?.code === filters.errorCode
      );
    }

    if (filters.dateRange) {
      const start = new Date(filters.dateRange.start);
      const end = new Date(filters.dateRange.end);
      filtered = filtered.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate >= start && logDate <= end;
      });
    }

    // Apply pagination
    const offset = filters.offset || 0;
    const limit = filters.limit || filtered.length;
    
    return filtered
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(offset, offset + limit);
  }

  async count(filters?: Partial<ErrorFilters>): Promise<number> {
    if (!filters) return this.logs.length;
    
    const fullFilters: ErrorFilters = { ...filters } as ErrorFilters;
    const filtered = await this.retrieve(fullFilters);
    return filtered.length;
  }

  async clear(olderThan?: string): Promise<number> {
    const initialCount = this.logs.length;
    
    if (olderThan) {
      const cutoffDate = new Date(olderThan);
      this.logs = this.logs.filter(log => 
        new Date(log.timestamp) >= cutoffDate
      );
    } else {
      this.logs = [];
    }
    
    return initialCount - this.logs.length;
  }

  getAllLogs(): LogEntry[] {
    return [...this.logs];
  }
}

/**
 * Error logger class with comprehensive logging and analytics
 */
export class ErrorLogger {
  private storage: LogStorage;
  private config: LoggerConfig;
  private logQueue: LogEntry[] = [];
  private flushTimer?: NodeJS.Timeout;
  private nextLogId = 1;
  private sessionId: string;

  constructor(
    storage?: LogStorage,
    config: Partial<LoggerConfig> = {}
  ) {
    this.storage = storage || new MemoryLogStorage();
    this.config = {
      maxLogSize: 10000,
      retentionDays: 30,
      enableAnalytics: true,
      enablePatternDetection: true,
      logLevel: 'info',
      batchSize: 50,
      flushInterval: 5000,
      ...config
    };
    
    this.sessionId = this.generateSessionId();
    this.startFlushTimer();
  }

  /**
   * Log a transaction error
   */
  async logError(
    error: TransactionError,
    context?: Record<string, any>,
    tags?: string[]
  ): Promise<void> {
    const entry: LogEntry = {
      id: `log_${this.nextLogId++}`,
      timestamp: new Date().toISOString(),
      level: this.mapSeverityToLevel(error.severity),
      category: 'transaction_error',
      message: error.message,
      error,
      context: {
        ...formatErrorForLogging(error),
        ...context
      },
      sessionId: this.sessionId,
      tags: tags || []
    };

    await this.addToQueue(entry);
  }

  /**
   * Log general information
   */
  async logInfo(
    message: string,
    context?: Record<string, any>,
    tags?: string[]
  ): Promise<void> {
    if (!this.shouldLog('info')) return;

    const entry: LogEntry = {
      id: `log_${this.nextLogId++}`,
      timestamp: new Date().toISOString(),
      level: 'info',
      category: 'general',
      message,
      context,
      sessionId: this.sessionId,
      tags: tags || []
    };

    await this.addToQueue(entry);
  }

  /**
   * Log warning
   */
  async logWarning(
    message: string,
    context?: Record<string, any>,
    tags?: string[]
  ): Promise<void> {
    if (!this.shouldLog('warn')) return;

    const entry: LogEntry = {
      id: `log_${this.nextLogId++}`,
      timestamp: new Date().toISOString(),
      level: 'warn',
      category: 'warning',
      message,
      context,
      sessionId: this.sessionId,
      tags: tags || []
    };

    await this.addToQueue(entry);
  }

  /**
   * Log debug information
   */
  async logDebug(
    message: string,
    context?: Record<string, any>,
    tags?: string[]
  ): Promise<void> {
    if (!this.shouldLog('debug')) return;

    const entry: LogEntry = {
      id: `log_${this.nextLogId++}`,
      timestamp: new Date().toISOString(),
      level: 'debug',
      category: 'debug',
      message,
      context,
      sessionId: this.sessionId,
      tags: tags || []
    };

    await this.addToQueue(entry);
  }

  /**
   * Get error statistics
   */
  async getErrorStats(filters?: Partial<ErrorFilters>): Promise<ErrorStats> {
    const logs = await this.storage.retrieve(filters as ErrorFilters || {});
    const errorLogs = logs.filter(log => log.error);

    const totalErrors = errorLogs.length;
    const errorsByType: Record<TransactionErrorType, number> = {} as any;
    const errorsBySeverity: Record<TransactionErrorSeverity, number> = {} as any;
    const errorCounts: Record<string, number> = {};

    // Initialize counters
    Object.values(TransactionErrorType).forEach(type => {
      errorsByType[type] = 0;
    });
    Object.values(TransactionErrorSeverity).forEach(severity => {
      errorsBySeverity[severity] = 0;
    });

    // Count errors
    errorLogs.forEach(log => {
      if (log.error) {
        errorsByType[log.error.type]++;
        errorsBySeverity[log.error.severity]++;
        errorCounts[log.error.code] = (errorCounts[log.error.code] || 0) + 1;
      }
    });

    const commonErrorCodes = Object.entries(errorCounts)
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalErrors,
      errorsByType,
      errorsBySeverity,
      retrySuccessRate: this.calculateRetrySuccessRate(errorLogs),
      averageResolutionTime: this.calculateAverageResolutionTime(errorLogs),
      commonErrorCodes
    };
  }

  /**
   * Get analytics data
   */
  async getAnalytics(timeRange?: { start: string; end: string }): Promise<AnalyticsData> {
    const filters: ErrorFilters = timeRange ? { dateRange: timeRange } : {};
    const logs = await this.storage.retrieve(filters);
    const errorLogs = logs.filter(log => log.error);

    return {
      errorPatterns: this.detectErrorPatterns(errorLogs),
      timeSeriesData: this.generateTimeSeriesData(errorLogs),
      userImpact: this.calculateUserImpact(errorLogs),
      performanceMetrics: this.calculatePerformanceMetrics(errorLogs)
    };
  }

  /**
   * Search logs by text
   */
  async searchLogs(
    query: string,
    filters?: Partial<ErrorFilters>
  ): Promise<LogEntry[]> {
    const logs = await this.storage.retrieve(filters as ErrorFilters || {});
    const lowerQuery = query.toLowerCase();

    return logs.filter(log => 
      log.message.toLowerCase().includes(lowerQuery) ||
      log.category.toLowerCase().includes(lowerQuery) ||
      (log.error?.code.toLowerCase().includes(lowerQuery)) ||
      (log.tags?.some(tag => tag.toLowerCase().includes(lowerQuery)))
    );
  }

  /**
   * Export logs as JSON
   */
  async exportLogs(filters?: Partial<ErrorFilters>): Promise<string> {
    const logs = await this.storage.retrieve(filters as ErrorFilters || {});
    return JSON.stringify(logs, null, 2);
  }

  /**
   * Clear old logs
   */
  async clearOldLogs(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionDays);
    return await this.storage.clear(cutoffDate.toISOString());
  }

  /**
   * Flush pending logs immediately
   */
  async flush(): Promise<void> {
    if (this.logQueue.length === 0) return;

    const logsToFlush = [...this.logQueue];
    this.logQueue = [];

    for (const entry of logsToFlush) {
      await this.storage.store(entry);
    }
  }

  /**
   * Dispose of the logger
   */
  async dispose(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    await this.flush();
  }

  /**
   * Add log entry to queue
   */
  private async addToQueue(entry: LogEntry): Promise<void> {
    this.logQueue.push(entry);

    if (this.logQueue.length >= this.config.batchSize) {
      await this.flush();
    }
  }

  /**
   * Check if log level should be logged
   */
  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error', 'critical'];
    const configLevelIndex = levels.indexOf(this.config.logLevel);
    const logLevelIndex = levels.indexOf(level);
    return logLevelIndex >= configLevelIndex;
  }

  /**
   * Map error severity to log level
   */
  private mapSeverityToLevel(severity: TransactionErrorSeverity): 'debug' | 'info' | 'warn' | 'error' | 'critical' {
    switch (severity) {
      case TransactionErrorSeverity.LOW:
        return 'info';
      case TransactionErrorSeverity.MEDIUM:
        return 'warn';
      case TransactionErrorSeverity.HIGH:
        return 'error';
      case TransactionErrorSeverity.CRITICAL:
        return 'critical';
      default:
        return 'error';
    }
  }

  /**
   * Start flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(async () => {
      await this.flush();
    }, this.config.flushInterval);
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Calculate retry success rate
   */
  private calculateRetrySuccessRate(errorLogs: LogEntry[]): number {
    // This would need more sophisticated tracking of retry attempts
    // For now, return a placeholder
    return 75.0;
  }

  /**
   * Calculate average resolution time
   */
  private calculateAverageResolutionTime(errorLogs: LogEntry[]): number {
    // This would need tracking of error resolution
    // For now, return a placeholder in milliseconds
    return 30000; // 30 seconds
  }

  /**
   * Detect error patterns
   */
  private detectErrorPatterns(errorLogs: LogEntry[]): AnalyticsData['errorPatterns'] {
    const patterns: Record<string, { count: number; lastSeen: string; severity: TransactionErrorSeverity }> = {};

    errorLogs.forEach(log => {
      if (log.error) {
        const pattern = `${log.error.type}:${log.error.code}`;
        if (!patterns[pattern]) {
          patterns[pattern] = {
            count: 0,
            lastSeen: log.timestamp,
            severity: log.error.severity
          };
        }
        patterns[pattern].count++;
        if (new Date(log.timestamp) > new Date(patterns[pattern].lastSeen)) {
          patterns[pattern].lastSeen = log.timestamp;
        }
      }
    });

    return Object.entries(patterns)
      .map(([pattern, data]) => ({ pattern, ...data }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Generate time series data
   */
  private generateTimeSeriesData(errorLogs: LogEntry[]): AnalyticsData['timeSeriesData'] {
    const timeSlots: Record<string, { errorCount: number; errorsByType: Record<TransactionErrorType, number> }> = {};

    errorLogs.forEach(log => {
      const hour = new Date(log.timestamp).toISOString().slice(0, 13) + ':00:00.000Z';
      
      if (!timeSlots[hour]) {
        timeSlots[hour] = {
          errorCount: 0,
          errorsByType: {} as Record<TransactionErrorType, number>
        };
        Object.values(TransactionErrorType).forEach(type => {
          timeSlots[hour].errorsByType[type] = 0;
        });
      }

      timeSlots[hour].errorCount++;
      if (log.error) {
        timeSlots[hour].errorsByType[log.error.type]++;
      }
    });

    return Object.entries(timeSlots)
      .map(([timestamp, data]) => ({ timestamp, ...data }))
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  /**
   * Calculate user impact
   */
  private calculateUserImpact(errorLogs: LogEntry[]): AnalyticsData['userImpact'] {
    const uniqueUsers = new Set<string>();
    
    errorLogs.forEach(log => {
      if (log.error?.context.userAddress) {
        uniqueUsers.add(log.error.context.userAddress);
      }
    });

    return {
      affectedUsers: uniqueUsers.size,
      totalErrors: errorLogs.length,
      averageErrorsPerUser: uniqueUsers.size > 0 ? errorLogs.length / uniqueUsers.size : 0
    };
  }

  /**
   * Calculate performance metrics
   */
  private calculatePerformanceMetrics(errorLogs: LogEntry[]): AnalyticsData['performanceMetrics'] {
    const criticalErrors = errorLogs.filter(log => 
      log.error?.severity === TransactionErrorSeverity.CRITICAL
    );

    return {
      averageResolutionTime: 30000, // Placeholder
      retrySuccessRate: 75.0, // Placeholder
      criticalErrorRate: errorLogs.length > 0 ? (criticalErrors.length / errorLogs.length) * 100 : 0
    };
  }
}

/**
 * Default error logger instance
 */
export const errorLogger = new ErrorLogger();