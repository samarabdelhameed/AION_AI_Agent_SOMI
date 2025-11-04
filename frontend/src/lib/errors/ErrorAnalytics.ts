/**
 * Error analytics and monitoring system for pattern detection and performance tracking
 */

import {
  TransactionError,
  TransactionErrorType,
  TransactionErrorSeverity,
  ErrorStats,
  ErrorFilters,
  AnalyticsData,
  errorLogger
} from './index';

/**
 * Performance metrics interface
 */
export interface PerformanceMetrics {
  errorRate: number;
  averageResolutionTime: number;
  retrySuccessRate: number;
  criticalErrorRate: number;
  userImpactScore: number;
  systemHealthScore: number;
  trendDirection: 'improving' | 'stable' | 'degrading';
}

/**
 * Alert threshold configuration
 */
export interface AlertThreshold {
  metric: keyof PerformanceMetrics;
  operator: 'greater_than' | 'less_than' | 'equals';
  value: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
}

/**
 * Alert notification
 */
export interface AlertNotification {
  id: string;
  timestamp: string;
  threshold: AlertThreshold;
  currentValue: number;
  message: string;
  acknowledged: boolean;
  resolvedAt?: string;
}

/**
 * Error pattern detection result
 */
export interface ErrorPattern {
  id: string;
  pattern: string;
  description: string;
  frequency: number;
  severity: TransactionErrorSeverity;
  firstSeen: string;
  lastSeen: string;
  affectedUsers: number;
  suggestedActions: string[];
  confidence: number; // 0-1 confidence score
}

/**
 * Monitoring dashboard data
 */
export interface DashboardData {
  overview: {
    totalErrors: number;
    errorRate: number;
    activeAlerts: number;
    systemHealth: number;
  };
  charts: {
    errorTrends: Array<{ timestamp: string; count: number; type: TransactionErrorType }>;
    severityDistribution: Record<TransactionErrorSeverity, number>;
    userImpact: Array<{ date: string; affectedUsers: number; totalUsers: number }>;
    performanceMetrics: Array<{ timestamp: string; metrics: PerformanceMetrics }>;
  };
  topErrors: Array<{
    code: string;
    count: number;
    trend: 'up' | 'down' | 'stable';
    impact: 'low' | 'medium' | 'high';
  }>;
  recentPatterns: ErrorPattern[];
}

/**
 * Analytics configuration
 */
export interface AnalyticsConfig {
  enablePatternDetection: boolean;
  enableAlerting: boolean;
  enablePerformanceTracking: boolean;
  patternDetectionWindow: number; // hours
  alertCheckInterval: number; // milliseconds
  retentionPeriod: number; // days
  minPatternOccurrences: number;
  confidenceThreshold: number;
}

/**
 * Error analytics and monitoring class
 */
export class ErrorAnalytics {
  private config: AnalyticsConfig;
  private alertThresholds: Map<string, AlertThreshold> = new Map();
  private activeAlerts: Map<string, AlertNotification> = new Map();
  private detectedPatterns: Map<string, ErrorPattern> = new Map();
  private performanceHistory: Array<{ timestamp: string; metrics: PerformanceMetrics }> = [];
  private alertCheckTimer?: NodeJS.Timeout;
  private nextAlertId = 1;
  private nextPatternId = 1;

  constructor(config: Partial<AnalyticsConfig> = {}) {
    this.config = {
      enablePatternDetection: true,
      enableAlerting: true,
      enablePerformanceTracking: true,
      patternDetectionWindow: 24, // 24 hours
      alertCheckInterval: 60000, // 1 minute
      retentionPeriod: 30, // 30 days
      minPatternOccurrences: 3,
      confidenceThreshold: 0.7,
      ...config
    };

    this.initializeDefaultThresholds();
    this.startMonitoring();
  }

  /**
   * Analyze error patterns and generate insights
   */
  async analyzeErrorPatterns(timeRange?: { start: string; end: string }): Promise<ErrorPattern[]> {
    if (!this.config.enablePatternDetection) {
      return [];
    }

    const analytics = await errorLogger.getAnalytics(timeRange);
    const patterns: ErrorPattern[] = [];

    // Analyze error patterns from analytics data
    for (const patternData of analytics.errorPatterns) {
      if (patternData.count >= this.config.minPatternOccurrences) {
        const pattern = this.createErrorPattern(patternData);
        if (pattern.confidence >= this.config.confidenceThreshold) {
          patterns.push(pattern);
          this.detectedPatterns.set(pattern.id, pattern);
        }
      }
    }

    // Detect temporal patterns
    const temporalPatterns = this.detectTemporalPatterns(analytics.timeSeriesData);
    patterns.push(...temporalPatterns);

    // Detect user impact patterns
    const userPatterns = this.detectUserImpactPatterns(analytics.userImpact);
    patterns.push(...userPatterns);

    return patterns.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Calculate current performance metrics
   */
  async calculatePerformanceMetrics(): Promise<PerformanceMetrics> {
    const stats = await errorLogger.getErrorStats();
    const analytics = await errorLogger.getAnalytics();

    const totalErrors = stats.totalErrors;
    const criticalErrors = stats.errorsBySeverity[TransactionErrorSeverity.CRITICAL] || 0;
    
    const errorRate = this.calculateErrorRate(totalErrors);
    const averageResolutionTime = stats.averageResolutionTime;
    const retrySuccessRate = stats.retrySuccessRate;
    const criticalErrorRate = totalErrors > 0 ? (criticalErrors / totalErrors) * 100 : 0;
    const userImpactScore = this.calculateUserImpactScore(analytics.userImpact);
    const systemHealthScore = this.calculateSystemHealthScore({
      errorRate,
      criticalErrorRate,
      retrySuccessRate,
      userImpactScore
    });

    const trendDirection = this.calculateTrendDirection();

    const metrics: PerformanceMetrics = {
      errorRate,
      averageResolutionTime,
      retrySuccessRate,
      criticalErrorRate,
      userImpactScore,
      systemHealthScore,
      trendDirection
    };

    // Store metrics for historical tracking
    if (this.config.enablePerformanceTracking) {
      this.performanceHistory.push({
        timestamp: new Date().toISOString(),
        metrics
      });

      // Maintain retention period
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.retentionPeriod);
      this.performanceHistory = this.performanceHistory.filter(
        entry => new Date(entry.timestamp) >= cutoffDate
      );
    }

    return metrics;
  }

  /**
   * Check alert thresholds and trigger notifications
   */
  async checkAlertThresholds(): Promise<AlertNotification[]> {
    if (!this.config.enableAlerting) {
      return [];
    }

    const metrics = await this.calculatePerformanceMetrics();
    const newAlerts: AlertNotification[] = [];

    for (const [thresholdId, threshold] of this.alertThresholds) {
      if (!threshold.enabled) continue;

      const currentValue = metrics[threshold.metric];
      const shouldAlert = this.evaluateThreshold(currentValue, threshold);

      if (shouldAlert && !this.activeAlerts.has(thresholdId)) {
        const alert = this.createAlert(thresholdId, threshold, currentValue);
        this.activeAlerts.set(alert.id, alert);
        newAlerts.push(alert);
      } else if (!shouldAlert && this.activeAlerts.has(thresholdId)) {
        // Resolve alert
        const alert = this.activeAlerts.get(thresholdId);
        if (alert) {
          alert.resolvedAt = new Date().toISOString();
          this.activeAlerts.delete(thresholdId);
        }
      }
    }

    return newAlerts;
  }

  /**
   * Generate dashboard data for monitoring UI
   */
  async generateDashboardData(): Promise<DashboardData> {
    const [stats, analytics, metrics, patterns] = await Promise.all([
      errorLogger.getErrorStats(),
      errorLogger.getAnalytics(),
      this.calculatePerformanceMetrics(),
      this.analyzeErrorPatterns()
    ]);

    return {
      overview: {
        totalErrors: stats.totalErrors,
        errorRate: metrics.errorRate,
        activeAlerts: this.activeAlerts.size,
        systemHealth: metrics.systemHealthScore
      },
      charts: {
        errorTrends: this.generateErrorTrends(analytics.timeSeriesData),
        severityDistribution: stats.errorsBySeverity,
        userImpact: this.generateUserImpactChart(analytics.userImpact),
        performanceMetrics: this.performanceHistory.slice(-24) // Last 24 data points
      },
      topErrors: this.generateTopErrors(stats.commonErrorCodes),
      recentPatterns: patterns.slice(0, 10)
    };
  }

  /**
   * Add or update alert threshold
   */
  setAlertThreshold(threshold: Omit<AlertThreshold, 'enabled'> & { enabled?: boolean }): string {
    const id = `threshold_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullThreshold: AlertThreshold = {
      enabled: true,
      ...threshold
    };
    
    this.alertThresholds.set(id, fullThreshold);
    return id;
  }

  /**
   * Remove alert threshold
   */
  removeAlertThreshold(thresholdId: string): boolean {
    const removed = this.alertThresholds.delete(thresholdId);
    if (removed) {
      // Also remove any active alert for this threshold
      this.activeAlerts.delete(thresholdId);
    }
    return removed;
  }

  /**
   * Get all alert thresholds
   */
  getAlertThresholds(): Array<{ id: string; threshold: AlertThreshold }> {
    return Array.from(this.alertThresholds.entries()).map(([id, threshold]) => ({
      id,
      threshold
    }));
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): AlertNotification[] {
    return Array.from(this.activeAlerts.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  /**
   * Get detected error patterns
   */
  getDetectedPatterns(): ErrorPattern[] {
    return Array.from(this.detectedPatterns.values())
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get performance history
   */
  getPerformanceHistory(limit?: number): Array<{ timestamp: string; metrics: PerformanceMetrics }> {
    const history = [...this.performanceHistory].reverse();
    return limit ? history.slice(0, limit) : history;
  }

  /**
   * Export analytics data
   */
  async exportAnalyticsData(format: 'json' | 'csv' = 'json'): Promise<string> {
    const data = {
      metrics: await this.calculatePerformanceMetrics(),
      patterns: this.getDetectedPatterns(),
      alerts: this.getActiveAlerts(),
      performanceHistory: this.getPerformanceHistory(),
      thresholds: this.getAlertThresholds()
    };

    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    } else {
      // Simple CSV export for metrics
      const csvLines = ['timestamp,errorRate,systemHealth,criticalErrorRate'];
      this.performanceHistory.forEach(entry => {
        csvLines.push(
          `${entry.timestamp},${entry.metrics.errorRate},${entry.metrics.systemHealthScore},${entry.metrics.criticalErrorRate}`
        );
      });
      return csvLines.join('\n');
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AnalyticsConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart monitoring if intervals changed
    if (newConfig.alertCheckInterval !== undefined) {
      this.stopMonitoring();
      this.startMonitoring();
    }
  }

  /**
   * Dispose of the analytics system
   */
  dispose(): void {
    this.stopMonitoring();
    this.alertThresholds.clear();
    this.activeAlerts.clear();
    this.detectedPatterns.clear();
    this.performanceHistory = [];
  }

  /**
   * Initialize default alert thresholds
   */
  private initializeDefaultThresholds(): void {
    // High error rate threshold
    this.setAlertThreshold({
      metric: 'errorRate',
      operator: 'greater_than',
      value: 5, // 5% error rate
      severity: 'high'
    });

    // Critical error rate threshold
    this.setAlertThreshold({
      metric: 'criticalErrorRate',
      operator: 'greater_than',
      value: 1, // 1% critical error rate
      severity: 'critical'
    });

    // Low system health threshold
    this.setAlertThreshold({
      metric: 'systemHealthScore',
      operator: 'less_than',
      value: 70, // Below 70% health
      severity: 'medium'
    });

    // Low retry success rate threshold
    this.setAlertThreshold({
      metric: 'retrySuccessRate',
      operator: 'less_than',
      value: 50, // Below 50% retry success
      severity: 'medium'
    });
  }

  /**
   * Start monitoring and alert checking
   */
  private startMonitoring(): void {
    if (this.config.enableAlerting) {
      this.alertCheckTimer = setInterval(async () => {
        try {
          await this.checkAlertThresholds();
        } catch (error) {
          console.error('Error checking alert thresholds:', error);
        }
      }, this.config.alertCheckInterval);
    }
  }

  /**
   * Stop monitoring
   */
  private stopMonitoring(): void {
    if (this.alertCheckTimer) {
      clearInterval(this.alertCheckTimer);
      this.alertCheckTimer = undefined;
    }
  }

  /**
   * Create error pattern from analytics data
   */
  private createErrorPattern(patternData: any): ErrorPattern {
    const id = `pattern_${this.nextPatternId++}`;
    
    return {
      id,
      pattern: patternData.pattern,
      description: this.generatePatternDescription(patternData.pattern),
      frequency: patternData.count,
      severity: patternData.severity,
      firstSeen: patternData.lastSeen, // Simplified for demo
      lastSeen: patternData.lastSeen,
      affectedUsers: Math.ceil(patternData.count * 0.7), // Estimate
      suggestedActions: this.generateSuggestedActions(patternData.pattern),
      confidence: this.calculatePatternConfidence(patternData)
    };
  }

  /**
   * Detect temporal patterns in time series data
   */
  private detectTemporalPatterns(timeSeriesData: any[]): ErrorPattern[] {
    // Simplified temporal pattern detection
    const patterns: ErrorPattern[] = [];
    
    // Look for recurring spikes
    const spikes = timeSeriesData.filter(data => data.errorCount > 10);
    if (spikes.length >= 3) {
      patterns.push({
        id: `temporal_${this.nextPatternId++}`,
        pattern: 'recurring_error_spikes',
        description: 'Recurring error spikes detected in time series data',
        frequency: spikes.length,
        severity: TransactionErrorSeverity.MEDIUM,
        firstSeen: spikes[0]?.timestamp || new Date().toISOString(),
        lastSeen: spikes[spikes.length - 1]?.timestamp || new Date().toISOString(),
        affectedUsers: spikes.reduce((sum, spike) => sum + spike.errorCount, 0),
        suggestedActions: ['Investigate system load during spike times', 'Check for external dependencies'],
        confidence: 0.8
      });
    }

    return patterns;
  }

  /**
   * Detect user impact patterns
   */
  private detectUserImpactPatterns(userImpact: any): ErrorPattern[] {
    const patterns: ErrorPattern[] = [];
    
    if (userImpact.averageErrorsPerUser > 2) {
      patterns.push({
        id: `user_impact_${this.nextPatternId++}`,
        pattern: 'high_user_error_rate',
        description: 'High error rate per user detected',
        frequency: userImpact.totalErrors,
        severity: TransactionErrorSeverity.HIGH,
        firstSeen: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        affectedUsers: userImpact.affectedUsers,
        suggestedActions: ['Review user experience flow', 'Improve error prevention'],
        confidence: 0.75
      });
    }

    return patterns;
  }

  /**
   * Calculate error rate
   */
  private calculateErrorRate(totalErrors: number): number {
    // Simplified calculation - in real implementation, this would be
    // errors per total transactions over a time period
    const estimatedTransactions = totalErrors * 10; // Assume 10:1 ratio
    return totalErrors > 0 ? (totalErrors / estimatedTransactions) * 100 : 0;
  }

  /**
   * Calculate user impact score
   */
  private calculateUserImpactScore(userImpact: any): number {
    if (userImpact.totalErrors === 0) return 0;
    
    // Score based on affected users and error frequency
    const impactRatio = userImpact.affectedUsers / Math.max(userImpact.totalErrors, 1);
    return Math.min(impactRatio * userImpact.averageErrorsPerUser * 10, 100);
  }

  /**
   * Calculate system health score
   */
  private calculateSystemHealthScore(metrics: {
    errorRate: number;
    criticalErrorRate: number;
    retrySuccessRate: number;
    userImpactScore: number;
  }): number {
    // Weighted health score calculation
    const errorHealthScore = Math.max(0, 100 - (metrics.errorRate * 10));
    const criticalHealthScore = Math.max(0, 100 - (metrics.criticalErrorRate * 20));
    const retryHealthScore = metrics.retrySuccessRate;
    const userHealthScore = Math.max(0, 100 - metrics.userImpactScore);

    return (
      errorHealthScore * 0.3 +
      criticalHealthScore * 0.3 +
      retryHealthScore * 0.2 +
      userHealthScore * 0.2
    );
  }

  /**
   * Calculate trend direction
   */
  private calculateTrendDirection(): 'improving' | 'stable' | 'degrading' {
    if (this.performanceHistory.length < 2) return 'stable';
    
    const recent = this.performanceHistory.slice(-5);
    const older = this.performanceHistory.slice(-10, -5);
    
    if (recent.length === 0 || older.length === 0) return 'stable';
    
    const recentAvg = recent.reduce((sum, entry) => sum + entry.metrics.systemHealthScore, 0) / recent.length;
    const olderAvg = older.reduce((sum, entry) => sum + entry.metrics.systemHealthScore, 0) / older.length;
    
    const diff = recentAvg - olderAvg;
    
    if (diff > 5) return 'improving';
    if (diff < -5) return 'degrading';
    return 'stable';
  }

  /**
   * Evaluate alert threshold
   */
  private evaluateThreshold(currentValue: number, threshold: AlertThreshold): boolean {
    switch (threshold.operator) {
      case 'greater_than':
        return currentValue > threshold.value;
      case 'less_than':
        return currentValue < threshold.value;
      case 'equals':
        return Math.abs(currentValue - threshold.value) < 0.01;
      default:
        return false;
    }
  }

  /**
   * Create alert notification
   */
  private createAlert(
    thresholdId: string,
    threshold: AlertThreshold,
    currentValue: number
  ): AlertNotification {
    return {
      id: `alert_${this.nextAlertId++}`,
      timestamp: new Date().toISOString(),
      threshold,
      currentValue,
      message: `${threshold.metric} is ${currentValue.toFixed(2)} (threshold: ${threshold.operator.replace('_', ' ')} ${threshold.value})`,
      acknowledged: false
    };
  }

  /**
   * Generate pattern description
   */
  private generatePatternDescription(pattern: string): string {
    const descriptions: Record<string, string> = {
      'user:INSUFFICIENT_FUNDS': 'Users frequently encountering insufficient funds errors',
      'network:NETWORK_TIMEOUT': 'Network timeout errors occurring regularly',
      'gas:GAS_TOO_LOW': 'Gas price too low errors happening often',
      'contract:CONTRACT_REVERT': 'Smart contract reverting transactions frequently'
    };
    
    return descriptions[pattern] || `Pattern detected: ${pattern}`;
  }

  /**
   * Generate suggested actions for patterns
   */
  private generateSuggestedActions(pattern: string): string[] {
    const actions: Record<string, string[]> = {
      'user:INSUFFICIENT_FUNDS': [
        'Add balance validation before transaction',
        'Show clearer balance information to users',
        'Implement balance warnings'
      ],
      'network:NETWORK_TIMEOUT': [
        'Implement retry mechanism with exponential backoff',
        'Add network status monitoring',
        'Consider alternative RPC endpoints'
      ],
      'gas:GAS_TOO_LOW': [
        'Implement dynamic gas price estimation',
        'Add gas price recommendations',
        'Monitor network congestion'
      ]
    };
    
    return actions[pattern] || ['Investigate root cause', 'Monitor frequency', 'Consider preventive measures'];
  }

  /**
   * Calculate pattern confidence
   */
  private calculatePatternConfidence(patternData: any): number {
    // Simple confidence calculation based on frequency and recency
    const frequencyScore = Math.min(patternData.count / 10, 1);
    const recencyScore = 0.8; // Simplified - would check how recent the pattern is
    
    return (frequencyScore + recencyScore) / 2;
  }

  /**
   * Generate error trends for charts
   */
  private generateErrorTrends(timeSeriesData: any[]): Array<{ timestamp: string; count: number; type: TransactionErrorType }> {
    return timeSeriesData.flatMap(data => 
      Object.entries(data.errorsByType)
        .filter(([_, count]) => count > 0)
        .map(([type, count]) => ({
          timestamp: data.timestamp,
          count: count as number,
          type: type as TransactionErrorType
        }))
    );
  }

  /**
   * Generate user impact chart data
   */
  private generateUserImpactChart(userImpact: any): Array<{ date: string; affectedUsers: number; totalUsers: number }> {
    // Simplified - would normally have historical user data
    return [{
      date: new Date().toISOString().split('T')[0],
      affectedUsers: userImpact.affectedUsers,
      totalUsers: userImpact.affectedUsers * 5 // Estimate total users
    }];
  }

  /**
   * Generate top errors data
   */
  private generateTopErrors(commonErrorCodes: Array<{ code: string; count: number }>): Array<{
    code: string;
    count: number;
    trend: 'up' | 'down' | 'stable';
    impact: 'low' | 'medium' | 'high';
  }> {
    return commonErrorCodes.slice(0, 10).map(error => ({
      code: error.code,
      count: error.count,
      trend: 'stable' as const, // Simplified
      impact: error.count > 10 ? 'high' : error.count > 5 ? 'medium' : 'low'
    }));
  }
}

/**
 * Default error analytics instance
 */
export const errorAnalytics = new ErrorAnalytics();