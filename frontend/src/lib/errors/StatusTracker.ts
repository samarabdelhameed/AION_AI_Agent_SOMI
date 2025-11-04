/**
 * Transaction status tracking system with real-time updates and progress tracking
 */

import {
  TransactionStatus,
  TransactionStatusUpdate,
  TransactionError,
  TransactionContext,
  createStatusUpdate,
  getStatusProgress,
  getStatusDescription
} from './types';

/**
 * Status subscription callback type
 */
export type StatusCallback = (update: TransactionStatusUpdate) => void;

/**
 * Status subscription interface
 */
export interface StatusSubscription {
  id: string;
  callback: StatusCallback;
  filter?: (update: TransactionStatusUpdate) => boolean;
}

/**
 * Transaction tracking entry
 */
export interface TransactionTrackingEntry {
  txHash: string;
  context: TransactionContext;
  status: TransactionStatus;
  startTime: string;
  lastUpdate: string;
  updates: TransactionStatusUpdate[];
  error?: TransactionError;
  confirmations: number;
  estimatedCompletion?: string;
}

/**
 * Status tracker configuration
 */
export interface StatusTrackerConfig {
  maxHistorySize: number;
  updateInterval: number;
  confirmationTarget: number;
  enableProgressCalculation: boolean;
  enableEstimatedCompletion: boolean;
}

/**
 * Status tracker class for real-time transaction monitoring
 */
export class StatusTracker {
  private subscriptions: Map<string, StatusSubscription> = new Map();
  private transactions: Map<string, TransactionTrackingEntry> = new Map();
  private config: StatusTrackerConfig;
  private updateIntervals: Map<string, NodeJS.Timeout> = new Map();
  private nextSubscriptionId = 1;

  constructor(config: Partial<StatusTrackerConfig> = {}) {
    this.config = {
      maxHistorySize: 100,
      updateInterval: 2000, // 2 seconds
      confirmationTarget: 3,
      enableProgressCalculation: true,
      enableEstimatedCompletion: true,
      ...config
    };
  }

  /**
   * Start tracking a transaction
   */
  startTracking(
    txHash: string,
    context: TransactionContext,
    initialStatus: TransactionStatus = TransactionStatus.SUBMITTED
  ): void {
    const now = new Date().toISOString();
    
    const entry: TransactionTrackingEntry = {
      txHash,
      context,
      status: initialStatus,
      startTime: now,
      lastUpdate: now,
      updates: [],
      confirmations: 0
    };

    this.transactions.set(txHash, entry);
    
    // Send initial status update
    const initialUpdate = createStatusUpdate(
      initialStatus,
      getStatusDescription(initialStatus),
      {
        txHash,
        progress: getStatusProgress(initialStatus),
        confirmations: 0
      }
    );

    this.addStatusUpdate(txHash, initialUpdate);
    this.notifySubscribers(initialUpdate);

    // Start monitoring if not completed or failed
    if (this.shouldContinueTracking(initialStatus)) {
      this.startMonitoring(txHash);
    }
  }

  /**
   * Update transaction status
   */
  updateStatus(
    txHash: string,
    status: TransactionStatus,
    message?: string,
    metadata?: Record<string, any>
  ): void {
    const entry = this.transactions.get(txHash);
    if (!entry) {
      console.warn(`Transaction ${txHash} not found for status update`);
      return;
    }

    entry.status = status;
    entry.lastUpdate = new Date().toISOString();

    const update = createStatusUpdate(
      status,
      message || getStatusDescription(status),
      {
        txHash,
        progress: this.config.enableProgressCalculation ? getStatusProgress(status) : undefined,
        confirmations: entry.confirmations,
        metadata
      }
    );

    this.addStatusUpdate(txHash, update);
    this.notifySubscribers(update);

    // Update estimated completion
    if (this.config.enableEstimatedCompletion) {
      entry.estimatedCompletion = this.calculateEstimatedCompletion(entry);
    }

    // Stop monitoring if transaction is complete or failed
    if (!this.shouldContinueTracking(status)) {
      this.stopMonitoring(txHash);
    }
  }

  /**
   * Update confirmation count
   */
  updateConfirmations(txHash: string, confirmations: number): void {
    const entry = this.transactions.get(txHash);
    if (!entry) return;

    entry.confirmations = confirmations;
    entry.lastUpdate = new Date().toISOString();

    // Update status based on confirmations
    let status = entry.status;
    if (confirmations >= this.config.confirmationTarget && status === TransactionStatus.CONFIRMING) {
      status = TransactionStatus.COMPLETED;
    } else if (confirmations > 0 && status === TransactionStatus.SUBMITTED) {
      status = TransactionStatus.CONFIRMING;
    }

    if (status !== entry.status) {
      this.updateStatus(txHash, status, undefined, { confirmations });
    } else {
      // Just update confirmations without changing status
      const update = createStatusUpdate(
        status,
        `${getStatusDescription(status)} (${confirmations}/${this.config.confirmationTarget} confirmations)`,
        {
          txHash,
          progress: this.calculateProgressWithConfirmations(status, confirmations),
          confirmations
        }
      );

      this.addStatusUpdate(txHash, update);
      this.notifySubscribers(update);
    }
  }

  /**
   * Set transaction error
   */
  setError(txHash: string, error: TransactionError): void {
    const entry = this.transactions.get(txHash);
    if (!entry) return;

    entry.error = error;
    entry.status = TransactionStatus.FAILED;
    entry.lastUpdate = new Date().toISOString();

    const update = createStatusUpdate(
      TransactionStatus.FAILED,
      'Transaction failed',
      {
        txHash,
        progress: 0,
        confirmations: entry.confirmations,
        error
      }
    );

    this.addStatusUpdate(txHash, update);
    this.notifySubscribers(update);
    this.stopMonitoring(txHash);
  }

  /**
   * Subscribe to status updates
   */
  subscribe(
    callback: StatusCallback,
    filter?: (update: TransactionStatusUpdate) => boolean
  ): string {
    const id = `sub_${this.nextSubscriptionId++}`;
    
    this.subscriptions.set(id, {
      id,
      callback,
      filter
    });

    return id;
  }

  /**
   * Subscribe to specific transaction updates
   */
  subscribeToTransaction(txHash: string, callback: StatusCallback): string {
    return this.subscribe(callback, (update) => update.txHash === txHash);
  }

  /**
   * Unsubscribe from status updates
   */
  unsubscribe(subscriptionId: string): void {
    this.subscriptions.delete(subscriptionId);
  }

  /**
   * Get current status of a transaction
   */
  getTransactionStatus(txHash: string): TransactionTrackingEntry | undefined {
    return this.transactions.get(txHash);
  }

  /**
   * Get all tracked transactions
   */
  getAllTransactions(): TransactionTrackingEntry[] {
    return Array.from(this.transactions.values());
  }

  /**
   * Get transactions by status
   */
  getTransactionsByStatus(status: TransactionStatus): TransactionTrackingEntry[] {
    return Array.from(this.transactions.values()).filter(entry => entry.status === status);
  }

  /**
   * Get active (non-completed) transactions
   */
  getActiveTransactions(): TransactionTrackingEntry[] {
    return Array.from(this.transactions.values()).filter(entry => 
      this.shouldContinueTracking(entry.status)
    );
  }

  /**
   * Clear completed transactions from history
   */
  clearCompleted(): void {
    const completedTxs = Array.from(this.transactions.entries())
      .filter(([_, entry]) => !this.shouldContinueTracking(entry.status))
      .map(([txHash]) => txHash);

    completedTxs.forEach(txHash => {
      this.transactions.delete(txHash);
      this.stopMonitoring(txHash);
    });
  }

  /**
   * Clear all transaction history
   */
  clearAll(): void {
    // Stop all monitoring
    this.updateIntervals.forEach(interval => clearInterval(interval));
    this.updateIntervals.clear();
    
    // Clear transactions
    this.transactions.clear();
  }

  /**
   * Get status statistics
   */
  getStatusStats(): Record<TransactionStatus, number> {
    const stats: Record<TransactionStatus, number> = {} as any;
    
    // Initialize all statuses to 0
    Object.values(TransactionStatus).forEach(status => {
      stats[status] = 0;
    });

    // Count transactions by status
    this.transactions.forEach(entry => {
      stats[entry.status]++;
    });

    return stats;
  }

  /**
   * Dispose of the status tracker
   */
  dispose(): void {
    this.clearAll();
    this.subscriptions.clear();
  }

  /**
   * Add status update to transaction history
   */
  private addStatusUpdate(txHash: string, update: TransactionStatusUpdate): void {
    const entry = this.transactions.get(txHash);
    if (!entry) return;

    entry.updates.push(update);

    // Limit history size
    if (entry.updates.length > this.config.maxHistorySize) {
      entry.updates = entry.updates.slice(-this.config.maxHistorySize);
    }
  }

  /**
   * Notify all subscribers of status update
   */
  private notifySubscribers(update: TransactionStatusUpdate): void {
    this.subscriptions.forEach(subscription => {
      try {
        if (!subscription.filter || subscription.filter(update)) {
          subscription.callback(update);
        }
      } catch (error) {
        console.error('Error in status subscription callback:', error);
      }
    });
  }

  /**
   * Start monitoring a transaction
   */
  private startMonitoring(txHash: string): void {
    if (this.updateIntervals.has(txHash)) {
      return; // Already monitoring
    }

    const interval = setInterval(() => {
      this.checkTransactionStatus(txHash);
    }, this.config.updateInterval);

    this.updateIntervals.set(txHash, interval);
  }

  /**
   * Stop monitoring a transaction
   */
  private stopMonitoring(txHash: string): void {
    const interval = this.updateIntervals.get(txHash);
    if (interval) {
      clearInterval(interval);
      this.updateIntervals.delete(txHash);
    }
  }

  /**
   * Check if transaction should continue being tracked
   */
  private shouldContinueTracking(status: TransactionStatus): boolean {
    return status !== TransactionStatus.COMPLETED && status !== TransactionStatus.FAILED;
  }

  /**
   * Check transaction status (placeholder for actual blockchain queries)
   */
  private async checkTransactionStatus(txHash: string): Promise<void> {
    const entry = this.transactions.get(txHash);
    if (!entry) return;

    try {
      // This would normally query the blockchain for transaction status
      // For now, we'll simulate some status progression
      
      // Simulate confirmation progression
      if (entry.status === TransactionStatus.SUBMITTED && entry.confirmations === 0) {
        // Simulate first confirmation after some time
        const timeSinceSubmit = Date.now() - new Date(entry.startTime).getTime();
        if (timeSinceSubmit > 10000) { // 10 seconds
          this.updateConfirmations(txHash, 1);
        }
      } else if (entry.status === TransactionStatus.CONFIRMING) {
        // Simulate additional confirmations
        const timeSinceLastUpdate = Date.now() - new Date(entry.lastUpdate).getTime();
        if (timeSinceLastUpdate > 5000 && entry.confirmations < this.config.confirmationTarget) {
          this.updateConfirmations(txHash, entry.confirmations + 1);
        }
      }
    } catch (error) {
      console.error(`Error checking status for transaction ${txHash}:`, error);
    }
  }

  /**
   * Calculate progress including confirmation progress
   */
  private calculateProgressWithConfirmations(status: TransactionStatus, confirmations: number): number {
    const baseProgress = getStatusProgress(status);
    
    if (status === TransactionStatus.CONFIRMING) {
      // Add confirmation progress (from 70% to 100%)
      const confirmationProgress = (confirmations / this.config.confirmationTarget) * 30;
      return Math.min(baseProgress + confirmationProgress, 100);
    }
    
    return baseProgress;
  }

  /**
   * Calculate estimated completion time
   */
  private calculateEstimatedCompletion(entry: TransactionTrackingEntry): string | undefined {
    const now = new Date();
    const startTime = new Date(entry.startTime);
    const elapsed = now.getTime() - startTime.getTime();

    // Estimate based on current status and typical completion times
    let estimatedTotalTime: number;
    
    switch (entry.status) {
      case TransactionStatus.SUBMITTED:
        estimatedTotalTime = 60000; // 1 minute
        break;
      case TransactionStatus.CONFIRMING:
        const remainingConfirmations = this.config.confirmationTarget - entry.confirmations;
        estimatedTotalTime = elapsed + (remainingConfirmations * 15000); // 15 seconds per confirmation
        break;
      default:
        return undefined;
    }

    const estimatedCompletion = new Date(startTime.getTime() + estimatedTotalTime);
    return estimatedCompletion.toISOString();
  }
}

/**
 * Default status tracker instance
 */
export const statusTracker = new StatusTracker();