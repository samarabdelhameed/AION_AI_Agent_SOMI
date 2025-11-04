/**
 * Enhanced local activity timeline with comprehensive error information and recovery status
 */

import {
  TransactionError,
  TransactionStatus,
  TransactionStatusUpdate,
  RetryAttempt,
  errorLogger,
  messageGenerator
} from './index';

/**
 * Enhanced local activity with error handling information
 */
export interface EnhancedLocalActivity {
  id: string;
  type: 'deposit' | 'withdraw' | 'rebalance' | 'yield' | 'decision';
  status: 'completed' | 'pending' | 'failed' | 'retrying' | 'cancelled';
  timestamp: string; // ISO
  amount?: number;
  currency?: string;
  fromStrategy?: string;
  toStrategy?: string;
  txHash?: string;
  gasUsed?: number;
  description?: string;
  
  // Enhanced error information
  error?: {
    code: string;
    type: string;
    severity: string;
    message: string;
    userMessage: string;
    retryable: boolean;
    suggestedActions: string[];
    timestamp: string;
    technicalDetails?: Record<string, any>;
  };
  
  // Retry information
  retryInfo?: {
    attempts: number;
    maxAttempts: number;
    lastAttemptTime: string;
    nextRetryTime?: string;
    retryHistory: Array<{
      attemptNumber: number;
      timestamp: string;
      error?: string;
      gasAdjustment?: {
        originalGasPrice: string;
        adjustedGasPrice: string;
        adjustmentFactor: number;
      };
    }>;
  };
  
  // Status progression
  statusHistory: Array<{
    status: TransactionStatus;
    timestamp: string;
    message: string;
    progress?: number;
    confirmations?: number;
    metadata?: Record<string, any>;
  }>;
  
  // Recovery information
  recoveryInfo?: {
    canRecover: boolean;
    recoveryActions: Array<{
      label: string;
      action: string;
      description: string;
      primary?: boolean;
    }>;
    recoveryAttempts: number;
    lastRecoveryTime?: string;
  };
  
  // Performance metrics
  performance?: {
    startTime: string;
    endTime?: string;
    totalDuration?: number;
    networkLatency?: number;
    gasEfficiency?: number;
    userExperienceScore?: number;
  };
  
  // User interaction tracking
  userInteractions?: Array<{
    action: string;
    timestamp: string;
    context?: Record<string, any>;
  }>;
}

/**
 * Timeline filter options
 */
export interface TimelineFilters {
  status?: EnhancedLocalActivity['status'][];
  type?: EnhancedLocalActivity['type'][];
  hasError?: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
  errorType?: string[];
  retryable?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Timeline statistics
 */
export interface TimelineStats {
  total: number;
  byStatus: Record<EnhancedLocalActivity['status'], number>;
  byType: Record<EnhancedLocalActivity['type'], number>;
  errorRate: number;
  retrySuccessRate: number;
  averageDuration: number;
  recentTrends: {
    successRate: number;
    errorRate: number;
    averageRetries: number;
  };
}

/**
 * Enhanced local timeline manager
 */
export class EnhancedLocalTimeline {
  private storageKey = 'aion.timeline.enhanced';
  private maxEntries = 500;
  private listeners: Map<string, (activity: EnhancedLocalActivity) => void> = new Map();
  private nextListenerId = 1;

  /**
   * Load all activities from storage
   */
  loadActivities(): EnhancedLocalActivity[] {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Error loading enhanced timeline activities:', error);
      return [];
    }
  }

  /**
   * Add new activity to timeline
   */
  addActivity(activity: Omit<EnhancedLocalActivity, 'id' | 'statusHistory'>): EnhancedLocalActivity {
    const activities = this.loadActivities();
    
    const enhancedActivity: EnhancedLocalActivity = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      statusHistory: [{
        status: this.mapStatusToTransactionStatus(activity.status),
        timestamp: activity.timestamp,
        message: activity.description || `${activity.type} ${activity.status}`,
        progress: this.getProgressForStatus(activity.status)
      }],
      performance: {
        startTime: activity.timestamp
      },
      userInteractions: [],
      ...activity
    };

    activities.unshift(enhancedActivity);
    this.saveActivities(activities.slice(0, this.maxEntries));
    
    // Notify listeners
    this.notifyListeners(enhancedActivity);
    
    // Log activity creation
    errorLogger.logInfo('Enhanced activity added to timeline', {
      activityId: enhancedActivity.id,
      type: enhancedActivity.type,
      status: enhancedActivity.status
    }, ['timeline', 'activity']);

    return enhancedActivity;
  }

  /**
   * Update existing activity
   */
  updateActivity(
    activityId: string, 
    updates: Partial<EnhancedLocalActivity>,
    statusUpdate?: TransactionStatusUpdate
  ): boolean {
    const activities = this.loadActivities();
    const activityIndex = activities.findIndex(a => a.id === activityId);
    
    if (activityIndex === -1) return false;

    const activity = activities[activityIndex];
    const updatedActivity = { ...activity, ...updates };

    // Add status update to history if provided
    if (statusUpdate) {
      updatedActivity.statusHistory.push({
        status: statusUpdate.status,
        timestamp: statusUpdate.timestamp,
        message: statusUpdate.message,
        progress: statusUpdate.progress,
        confirmations: statusUpdate.confirmations,
        metadata: statusUpdate.metadata
      });
    }

    // Update performance metrics
    if (updatedActivity.performance) {
      if (updates.status === 'completed' || updates.status === 'failed') {
        updatedActivity.performance.endTime = new Date().toISOString();
        updatedActivity.performance.totalDuration = 
          new Date(updatedActivity.performance.endTime).getTime() - 
          new Date(updatedActivity.performance.startTime).getTime();
      }
    }

    activities[activityIndex] = updatedActivity;
    this.saveActivities(activities);
    
    // Notify listeners
    this.notifyListeners(updatedActivity);

    return true;
  }

  /**
   * Add error information to activity
   */
  addErrorToActivity(activityId: string, error: TransactionError): boolean {
    const activities = this.loadActivities();
    const activity = activities.find(a => a.id === activityId);
    
    if (!activity) return false;

    // Convert TransactionError to serializable format
    const errorInfo = {
      code: error.code,
      type: error.type,
      severity: error.severity,
      message: error.message,
      userMessage: error.userMessage,
      retryable: error.retryable,
      suggestedActions: error.suggestedActions,
      timestamp: error.timestamp,
      technicalDetails: error.technicalDetails
    };

    // Generate recovery actions if error is retryable
    const recoveryActions = error.retryable ? [
      {
        label: 'Retry Transaction',
        action: 'retry',
        description: 'Attempt the transaction again',
        primary: true
      },
      {
        label: 'Cancel',
        action: 'cancel',
        description: 'Cancel this transaction',
        primary: false
      }
    ] : [
      {
        label: 'Dismiss',
        action: 'dismiss',
        description: 'Remove this error from timeline',
        primary: true
      }
    ];

    const updates: Partial<EnhancedLocalActivity> = {
      status: 'failed',
      error: errorInfo,
      recoveryInfo: {
        canRecover: error.retryable,
        recoveryActions,
        recoveryAttempts: 0
      }
    };

    return this.updateActivity(activityId, updates);
  }

  /**
   * Add retry information to activity
   */
  addRetryInfoToActivity(activityId: string, retryAttempt: RetryAttempt): boolean {
    const activities = this.loadActivities();
    const activity = activities.find(a => a.id === activityId);
    
    if (!activity) return false;

    const retryHistory = activity.retryInfo?.retryHistory || [];
    retryHistory.push({
      attemptNumber: retryAttempt.attemptNumber,
      timestamp: retryAttempt.timestamp,
      error: retryAttempt.error.message,
      gasAdjustment: retryAttempt.gasAdjustment ? {
        originalGasPrice: retryAttempt.gasAdjustment.originalGasPrice.toString(),
        adjustedGasPrice: retryAttempt.gasAdjustment.adjustedGasPrice.toString(),
        adjustmentFactor: retryAttempt.gasAdjustment.adjustmentFactor
      } : undefined
    });

    const updates: Partial<EnhancedLocalActivity> = {
      status: 'retrying',
      retryInfo: {
        attempts: retryAttempt.attemptNumber + 1,
        maxAttempts: activity.retryInfo?.maxAttempts || 3,
        lastAttemptTime: retryAttempt.timestamp,
        nextRetryTime: retryAttempt.delay > 0 ? 
          new Date(Date.now() + retryAttempt.delay).toISOString() : undefined,
        retryHistory
      }
    };

    return this.updateActivity(activityId, updates);
  }

  /**
   * Record user interaction with activity
   */
  recordUserInteraction(
    activityId: string, 
    action: string, 
    context?: Record<string, any>
  ): boolean {
    const activities = this.loadActivities();
    const activity = activities.find(a => a.id === activityId);
    
    if (!activity) return false;

    const userInteractions = activity.userInteractions || [];
    userInteractions.push({
      action,
      timestamp: new Date().toISOString(),
      context
    });

    const updates: Partial<EnhancedLocalActivity> = {
      userInteractions
    };

    return this.updateActivity(activityId, updates);
  }

  /**
   * Get activities with filters
   */
  getActivities(filters?: TimelineFilters): EnhancedLocalActivity[] {
    let activities = this.loadActivities();

    if (!filters) return activities;

    // Apply filters
    if (filters.status) {
      activities = activities.filter(a => filters.status!.includes(a.status));
    }

    if (filters.type) {
      activities = activities.filter(a => filters.type!.includes(a.type));
    }

    if (filters.hasError !== undefined) {
      activities = activities.filter(a => filters.hasError ? !!a.error : !a.error);
    }

    if (filters.errorType) {
      activities = activities.filter(a => 
        a.error && filters.errorType!.includes(a.error.type)
      );
    }

    if (filters.retryable !== undefined) {
      activities = activities.filter(a => 
        a.error && a.error.retryable === filters.retryable
      );
    }

    if (filters.dateRange) {
      const start = new Date(filters.dateRange.start);
      const end = new Date(filters.dateRange.end);
      activities = activities.filter(a => {
        const activityDate = new Date(a.timestamp);
        return activityDate >= start && activityDate <= end;
      });
    }

    // Apply pagination
    const offset = filters.offset || 0;
    const limit = filters.limit || activities.length;
    
    return activities.slice(offset, offset + limit);
  }

  /**
   * Get activity by ID
   */
  getActivity(activityId: string): EnhancedLocalActivity | undefined {
    return this.loadActivities().find(a => a.id === activityId);
  }

  /**
   * Get timeline statistics
   */
  getStats(): TimelineStats {
    const activities = this.loadActivities();
    const total = activities.length;

    // Count by status
    const byStatus: Record<EnhancedLocalActivity['status'], number> = {
      completed: 0,
      pending: 0,
      failed: 0,
      retrying: 0,
      cancelled: 0
    };

    // Count by type
    const byType: Record<EnhancedLocalActivity['type'], number> = {
      deposit: 0,
      withdraw: 0,
      rebalance: 0,
      yield: 0,
      decision: 0
    };

    let totalDuration = 0;
    let completedCount = 0;
    let errorCount = 0;
    let retrySuccessCount = 0;
    let totalRetries = 0;

    activities.forEach(activity => {
      byStatus[activity.status]++;
      byType[activity.type]++;

      if (activity.error) errorCount++;
      
      if (activity.performance?.totalDuration) {
        totalDuration += activity.performance.totalDuration;
        completedCount++;
      }

      if (activity.retryInfo) {
        totalRetries += activity.retryInfo.attempts;
        if (activity.status === 'completed') {
          retrySuccessCount++;
        }
      }
    });

    const errorRate = total > 0 ? (errorCount / total) * 100 : 0;
    const retrySuccessRate = totalRetries > 0 ? (retrySuccessCount / totalRetries) * 100 : 0;
    const averageDuration = completedCount > 0 ? totalDuration / completedCount : 0;

    // Calculate recent trends (last 24 hours)
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentActivities = activities.filter(a => new Date(a.timestamp) >= oneDayAgo);
    
    const recentTotal = recentActivities.length;
    const recentErrors = recentActivities.filter(a => a.error).length;
    const recentRetries = recentActivities.reduce((sum, a) => sum + (a.retryInfo?.attempts || 0), 0);

    return {
      total,
      byStatus,
      byType,
      errorRate,
      retrySuccessRate,
      averageDuration,
      recentTrends: {
        successRate: recentTotal > 0 ? ((recentTotal - recentErrors) / recentTotal) * 100 : 100,
        errorRate: recentTotal > 0 ? (recentErrors / recentTotal) * 100 : 0,
        averageRetries: recentTotal > 0 ? recentRetries / recentTotal : 0
      }
    };
  }

  /**
   * Clear old activities
   */
  clearOldActivities(olderThanDays: number = 30): number {
    const activities = this.loadActivities();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const filteredActivities = activities.filter(a => 
      new Date(a.timestamp) >= cutoffDate
    );

    const removedCount = activities.length - filteredActivities.length;
    this.saveActivities(filteredActivities);

    return removedCount;
  }

  /**
   * Export timeline data
   */
  exportTimeline(format: 'json' | 'csv' = 'json'): string {
    const activities = this.loadActivities();

    if (format === 'json') {
      return JSON.stringify(activities, null, 2);
    } else {
      // CSV export
      const headers = [
        'id', 'type', 'status', 'timestamp', 'amount', 'currency',
        'txHash', 'hasError', 'errorCode', 'retryAttempts', 'duration'
      ];

      const rows = activities.map(activity => [
        activity.id,
        activity.type,
        activity.status,
        activity.timestamp,
        activity.amount || '',
        activity.currency || '',
        activity.txHash || '',
        activity.error ? 'Yes' : 'No',
        activity.error?.code || '',
        activity.retryInfo?.attempts || 0,
        activity.performance?.totalDuration || ''
      ]);

      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
  }

  /**
   * Add event listener for activity changes
   */
  addEventListener(callback: (activity: EnhancedLocalActivity) => void): string {
    const id = `listener_${this.nextListenerId++}`;
    this.listeners.set(id, callback);
    return id;
  }

  /**
   * Remove event listener
   */
  removeEventListener(listenerId: string): boolean {
    return this.listeners.delete(listenerId);
  }

  /**
   * Get user-friendly error message for activity
   */
  getActivityErrorMessage(activityId: string, language?: string): string | undefined {
    const activity = this.getActivity(activityId);
    if (!activity?.error) return undefined;

    // Reconstruct TransactionError for message generation
    const transactionError = {
      type: activity.error.type,
      code: activity.error.code,
      message: activity.error.message,
      userMessage: activity.error.userMessage,
      severity: activity.error.severity,
      retryable: activity.error.retryable,
      suggestedActions: activity.error.suggestedActions,
      timestamp: activity.error.timestamp,
      context: { chainId: 56, vaultAddress: '0x123' }, // Simplified
      technicalDetails: activity.error.technicalDetails || {}
    } as any;

    return messageGenerator.generateQuickMessage(transactionError, language as any);
  }

  /**
   * Save activities to storage
   */
  private saveActivities(activities: EnhancedLocalActivity[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(activities));
    } catch (error) {
      console.error('Error saving enhanced timeline activities:', error);
    }
  }

  /**
   * Notify all listeners of activity changes
   */
  private notifyListeners(activity: EnhancedLocalActivity): void {
    this.listeners.forEach(callback => {
      try {
        callback(activity);
      } catch (error) {
        console.error('Error in timeline listener:', error);
      }
    });
  }

  /**
   * Map activity status to transaction status
   */
  private mapStatusToTransactionStatus(status: EnhancedLocalActivity['status']): TransactionStatus {
    switch (status) {
      case 'pending':
        return TransactionStatus.PREPARING;
      case 'retrying':
        return TransactionStatus.RETRYING;
      case 'completed':
        return TransactionStatus.COMPLETED;
      case 'failed':
        return TransactionStatus.FAILED;
      case 'cancelled':
        return TransactionStatus.FAILED;
      default:
        return TransactionStatus.PREPARING;
    }
  }

  /**
   * Get progress percentage for status
   */
  private getProgressForStatus(status: EnhancedLocalActivity['status']): number {
    switch (status) {
      case 'pending':
        return 25;
      case 'retrying':
        return 50;
      case 'completed':
        return 100;
      case 'failed':
      case 'cancelled':
        return 0;
      default:
        return 0;
    }
  }
}

/**
 * Default enhanced timeline instance
 */
export const enhancedLocalTimeline = new EnhancedLocalTimeline();

/**
 * Legacy compatibility function - enhanced version of appendLocalActivity
 */
export function appendEnhancedLocalActivity(
  activity: Omit<EnhancedLocalActivity, 'id' | 'statusHistory'>
): EnhancedLocalActivity {
  return enhancedLocalTimeline.addActivity(activity);
}

/**
 * Migration function to convert old activities to enhanced format
 */
export function migrateOldActivities(): number {
  try {
    const oldStorageKey = 'aion.timeline.local';
    const oldRaw = localStorage.getItem(oldStorageKey);
    
    if (!oldRaw) return 0;
    
    const oldActivities = JSON.parse(oldRaw);
    if (!Array.isArray(oldActivities)) return 0;

    let migratedCount = 0;
    const existingActivities = enhancedLocalTimeline.loadActivities();
    const existingIds = new Set(existingActivities.map(a => a.id));

    oldActivities.forEach((oldActivity: any) => {
      if (existingIds.has(oldActivity.id)) return; // Skip if already migrated

      const enhancedActivity: Omit<EnhancedLocalActivity, 'id' | 'statusHistory'> = {
        type: oldActivity.type || 'deposit',
        status: oldActivity.status || 'completed',
        timestamp: oldActivity.timestamp || new Date().toISOString(),
        amount: oldActivity.amount,
        currency: oldActivity.currency,
        fromStrategy: oldActivity.fromStrategy,
        toStrategy: oldActivity.toStrategy,
        txHash: oldActivity.txHash,
        gasUsed: oldActivity.gasUsed,
        description: oldActivity.description,
        performance: {
          startTime: oldActivity.timestamp || new Date().toISOString(),
          endTime: oldActivity.timestamp || new Date().toISOString(),
          totalDuration: 0
        },
        userInteractions: []
      };

      enhancedLocalTimeline.addActivity(enhancedActivity);
      migratedCount++;
    });

    return migratedCount;
  } catch (error) {
    console.error('Error migrating old activities:', error);
    return 0;
  }
}