/**
 * Notification and user feedback system for transaction error handling
 */

import {
  TransactionError,
  TransactionNotification,
  TransactionStatus,
  TransactionStatusUpdate,
  messageGenerator
} from './index';

/**
 * Notification queue entry
 */
export interface NotificationQueueEntry {
  notification: TransactionNotification;
  priority: number;
  createdAt: string;
  expiresAt?: string;
}

/**
 * Notification display options
 */
export interface NotificationDisplayOptions {
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  maxVisible: number;
  defaultTimeout: number;
  enableSound: boolean;
  enableAnimation: boolean;
  groupSimilar: boolean;
}

/**
 * Notification event types
 */
export type NotificationEvent = 'show' | 'hide' | 'click' | 'action' | 'expire';

/**
 * Notification event listener
 */
export type NotificationEventListener = (
  event: NotificationEvent,
  notification: TransactionNotification,
  data?: any
) => void;

/**
 * Notification template for different scenarios
 */
export interface NotificationTemplate {
  type: TransactionNotification['type'];
  title: string;
  message: string;
  timeout?: number;
  actions?: Array<{
    label: string;
    action: string;
    primary?: boolean;
  }>;
}

/**
 * Notification manager class for handling user notifications and alerts
 */
export class NotificationManager {
  private notifications: Map<string, TransactionNotification> = new Map();
  private queue: NotificationQueueEntry[] = [];
  private listeners: Map<string, NotificationEventListener> = new Map();
  private displayOptions: NotificationDisplayOptions;
  private nextNotificationId = 1;
  private activeTimeouts: Map<string, NodeJS.Timeout> = new Map();
  private maxQueueSize = 100;

  constructor(options: Partial<NotificationDisplayOptions> = {}) {
    this.displayOptions = {
      position: 'top-right',
      maxVisible: 5,
      defaultTimeout: 5000,
      enableSound: true,
      enableAnimation: true,
      groupSimilar: true,
      ...options
    };
  }

  /**
   * Show a notification
   */
  show(notification: Omit<TransactionNotification, 'id' | 'timestamp'>): string {
    const id = `notification_${this.nextNotificationId++}`;
    const timestamp = new Date().toISOString();

    const fullNotification: TransactionNotification = {
      id,
      timestamp,
      autoDismiss: notification.autoDismiss ?? true,
      timeout: notification.timeout ?? this.displayOptions.defaultTimeout,
      ...notification
    };

    // Check for similar notifications if grouping is enabled
    if (this.displayOptions.groupSimilar) {
      const similar = this.findSimilarNotification(fullNotification);
      if (similar) {
        this.updateNotification(similar.id, {
          message: `${similar.message} (${this.getSimilarCount(similar) + 1})`
        });
        return similar.id;
      }
    }

    this.notifications.set(id, fullNotification);
    this.addToQueue(fullNotification, this.getNotificationPriority(fullNotification));

    // Set auto-dismiss timeout
    if (fullNotification.autoDismiss && fullNotification.timeout) {
      const timeout = setTimeout(() => {
        this.hide(id);
      }, fullNotification.timeout);
      this.activeTimeouts.set(id, timeout);
    }

    this.processQueue();
    this.emitEvent('show', fullNotification);

    return id;
  }

  /**
   * Show error notification from TransactionError
   */
  showError(error: TransactionError, language?: string): string {
    const userMessage = messageGenerator.generateMessage(error, { language: language as any });
    
    return this.show({
      type: 'error',
      title: userMessage.title,
      message: userMessage.message,
      autoDismiss: !userMessage.canRetry, // Don't auto-dismiss if user can retry
      timeout: userMessage.canRetry ? 0 : 8000, // Longer timeout for errors
      actions: userMessage.canRetry ? [
        {
          label: 'Retry',
          action: () => this.emitEvent('action', this.notifications.get('') as any, { action: 'retry' }),
          primary: true
        },
        {
          label: 'Dismiss',
          action: () => this.hide(''),
          primary: false
        }
      ] : undefined,
      error
    });
  }

  /**
   * Show success notification
   */
  showSuccess(title: string, message: string, options: Partial<TransactionNotification> = {}): string {
    return this.show({
      type: 'success',
      title,
      message,
      autoDismiss: true,
      timeout: 4000,
      ...options
    });
  }

  /**
   * Show warning notification
   */
  showWarning(title: string, message: string, options: Partial<TransactionNotification> = {}): string {
    return this.show({
      type: 'warning',
      title,
      message,
      autoDismiss: true,
      timeout: 6000,
      ...options
    });
  }

  /**
   * Show info notification
   */
  showInfo(title: string, message: string, options: Partial<TransactionNotification> = {}): string {
    return this.show({
      type: 'info',
      title,
      message,
      autoDismiss: true,
      timeout: 5000,
      ...options
    });
  }

  /**
   * Show status update notification
   */
  showStatusUpdate(update: TransactionStatusUpdate): string {
    const getStatusInfo = (status: TransactionStatus) => {
      switch (status) {
        case TransactionStatus.SUBMITTED:
          return { type: 'info' as const, title: 'Transaction Submitted' };
        case TransactionStatus.CONFIRMING:
          return { type: 'info' as const, title: 'Confirming Transaction' };
        case TransactionStatus.COMPLETED:
          return { type: 'success' as const, title: 'Transaction Completed' };
        case TransactionStatus.FAILED:
          return { type: 'error' as const, title: 'Transaction Failed' };
        case TransactionStatus.RETRYING:
          return { type: 'warning' as const, title: 'Retrying Transaction' };
        default:
          return { type: 'info' as const, title: 'Transaction Update' };
      }
    };

    const statusInfo = getStatusInfo(update.status);
    
    return this.show({
      type: statusInfo.type,
      title: statusInfo.title,
      message: update.message,
      autoDismiss: update.status === TransactionStatus.COMPLETED,
      timeout: update.status === TransactionStatus.COMPLETED ? 4000 : 0,
      actions: update.txHash ? [
        {
          label: 'View Transaction',
          action: () => this.emitEvent('action', this.notifications.get('') as any, { 
            action: 'view-tx', 
            txHash: update.txHash 
          }),
          primary: false
        }
      ] : undefined
    });
  }

  /**
   * Hide a notification
   */
  hide(id: string): boolean {
    const notification = this.notifications.get(id);
    if (!notification) return false;

    // Clear timeout if exists
    const timeout = this.activeTimeouts.get(id);
    if (timeout) {
      clearTimeout(timeout);
      this.activeTimeouts.delete(id);
    }

    this.notifications.delete(id);
    this.removeFromQueue(id);
    this.emitEvent('hide', notification);

    return true;
  }

  /**
   * Hide all notifications
   */
  hideAll(): void {
    const ids = Array.from(this.notifications.keys());
    ids.forEach(id => this.hide(id));
  }

  /**
   * Hide notifications by type
   */
  hideByType(type: TransactionNotification['type']): number {
    let count = 0;
    const toHide = Array.from(this.notifications.values())
      .filter(n => n.type === type)
      .map(n => n.id);
    
    toHide.forEach(id => {
      if (this.hide(id)) count++;
    });

    return count;
  }

  /**
   * Update an existing notification
   */
  updateNotification(
    id: string, 
    updates: Partial<Omit<TransactionNotification, 'id' | 'timestamp'>>
  ): boolean {
    const notification = this.notifications.get(id);
    if (!notification) return false;

    const updatedNotification = { ...notification, ...updates };
    this.notifications.set(id, updatedNotification);
    this.emitEvent('show', updatedNotification); // Re-emit to update UI

    return true;
  }

  /**
   * Get a notification by ID
   */
  getNotification(id: string): TransactionNotification | undefined {
    return this.notifications.get(id);
  }

  /**
   * Get all visible notifications
   */
  getVisibleNotifications(): TransactionNotification[] {
    return Array.from(this.notifications.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, this.displayOptions.maxVisible);
  }

  /**
   * Get all notifications
   */
  getAllNotifications(): TransactionNotification[] {
    return Array.from(this.notifications.values())
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Get notifications by type
   */
  getNotificationsByType(type: TransactionNotification['type']): TransactionNotification[] {
    return Array.from(this.notifications.values())
      .filter(n => n.type === type)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  /**
   * Add event listener
   */
  addEventListener(event: NotificationEvent, listener: NotificationEventListener): string {
    const id = `listener_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.listeners.set(id, listener);
    return id;
  }

  /**
   * Remove event listener
   */
  removeEventListener(listenerId: string): boolean {
    return this.listeners.delete(listenerId);
  }

  /**
   * Update display options
   */
  updateDisplayOptions(options: Partial<NotificationDisplayOptions>): void {
    this.displayOptions = { ...this.displayOptions, ...options };
    this.processQueue(); // Reprocess queue with new options
  }

  /**
   * Get current display options
   */
  getDisplayOptions(): NotificationDisplayOptions {
    return { ...this.displayOptions };
  }

  /**
   * Clear expired notifications
   */
  clearExpired(): number {
    const now = new Date();
    let cleared = 0;

    const expired = Array.from(this.notifications.values())
      .filter(n => {
        if (!n.autoDismiss || !n.timeout) return false;
        const expiryTime = new Date(n.timestamp);
        expiryTime.setMilliseconds(expiryTime.getMilliseconds() + n.timeout);
        return now > expiryTime;
      });

    expired.forEach(notification => {
      if (this.hide(notification.id)) {
        cleared++;
        this.emitEvent('expire', notification);
      }
    });

    return cleared;
  }

  /**
   * Get notification statistics
   */
  getStats(): {
    total: number;
    byType: Record<TransactionNotification['type'], number>;
    visible: number;
    queued: number;
  } {
    const all = this.getAllNotifications();
    const byType: Record<TransactionNotification['type'], number> = {
      success: 0,
      error: 0,
      warning: 0,
      info: 0
    };

    all.forEach(n => byType[n.type]++);

    return {
      total: all.length,
      byType,
      visible: this.getVisibleNotifications().length,
      queued: this.queue.length
    };
  }

  /**
   * Dispose of the notification manager
   */
  dispose(): void {
    // Clear all timeouts
    this.activeTimeouts.forEach(timeout => clearTimeout(timeout));
    this.activeTimeouts.clear();

    // Clear all data
    this.notifications.clear();
    this.queue = [];
    this.listeners.clear();
  }

  /**
   * Add notification to queue
   */
  private addToQueue(notification: TransactionNotification, priority: number): void {
    const entry: NotificationQueueEntry = {
      notification,
      priority,
      createdAt: new Date().toISOString()
    };

    this.queue.push(entry);
    this.queue.sort((a, b) => b.priority - a.priority);

    // Maintain queue size
    if (this.queue.length > this.maxQueueSize) {
      this.queue = this.queue.slice(0, this.maxQueueSize);
    }
  }

  /**
   * Remove notification from queue
   */
  private removeFromQueue(id: string): void {
    this.queue = this.queue.filter(entry => entry.notification.id !== id);
  }

  /**
   * Process notification queue
   */
  private processQueue(): void {
    const visible = this.getVisibleNotifications();
    const availableSlots = this.displayOptions.maxVisible - visible.length;

    if (availableSlots > 0 && this.queue.length > 0) {
      // Show highest priority notifications that aren't already visible
      const toShow = this.queue
        .filter(entry => !visible.find(v => v.id === entry.notification.id))
        .slice(0, availableSlots);

      toShow.forEach(entry => {
        this.removeFromQueue(entry.notification.id);
      });
    }
  }

  /**
   * Get notification priority
   */
  private getNotificationPriority(notification: TransactionNotification): number {
    switch (notification.type) {
      case 'error':
        return 100;
      case 'warning':
        return 75;
      case 'success':
        return 50;
      case 'info':
        return 25;
      default:
        return 0;
    }
  }

  /**
   * Find similar notification for grouping
   */
  private findSimilarNotification(notification: TransactionNotification): TransactionNotification | undefined {
    return Array.from(this.notifications.values()).find(existing => 
      existing.type === notification.type &&
      existing.title === notification.title &&
      existing.id !== notification.id
    );
  }

  /**
   * Get count of similar notifications
   */
  private getSimilarCount(notification: TransactionNotification): number {
    return Array.from(this.notifications.values()).filter(n => 
      n.type === notification.type &&
      n.title === notification.title
    ).length;
  }

  /**
   * Emit notification event
   */
  private emitEvent(
    event: NotificationEvent, 
    notification: TransactionNotification, 
    data?: any
  ): void {
    this.listeners.forEach(listener => {
      try {
        listener(event, notification, data);
      } catch (error) {
        console.error('Error in notification event listener:', error);
      }
    });
  }
}

/**
 * Default notification manager instance
 */
export const notificationManager = new NotificationManager();