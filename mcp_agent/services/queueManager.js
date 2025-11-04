/**
 * @fileoverview Advanced Queue Manager
 * @description High-performance request queuing with prioritization, load balancing, and batch processing
 */

import { EventEmitter } from 'events';

export class QueueManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.maxConcurrency = options.maxConcurrency || 10;
    this.maxQueueSize = options.maxQueueSize || 1000;
    this.defaultTimeout = options.defaultTimeout || 30000;
    this.batchSize = options.batchSize || 5;
    this.batchTimeout = options.batchTimeout || 1000;
    this.enablePriority = options.enablePriority !== false;
    this.enableBatching = options.enableBatching || false;
    this.retryAttempts = options.retryAttempts || 3;
    this.retryDelay = options.retryDelay || 1000;
    
    // Queue management
    this.queues = new Map(); // queueName -> queue
    this.workers = new Map(); // queueName -> workers
    this.activeRequests = new Map(); // requestId -> request
    this.batchQueues = new Map(); // queueName -> batch queue
    this.batchTimers = new Map(); // queueName -> timer
    
    // Metrics
    this.metrics = {
      totalRequests: 0,
      completedRequests: 0,
      failedRequests: 0,
      averageProcessingTime: 0,
      queueSizes: new Map(),
      throughput: 0,
      lastThroughputCheck: Date.now()
    };
    
    // Performance tracking
    this.processingTimes = [];
    this.maxProcessingTimeSamples = 1000;
    
    // Start metrics collection
    this.startMetricsCollection();
  }

  /**
   * Create a new queue
   */
  createQueue(name, options = {}) {
    const queueConfig = {
      name,
      maxConcurrency: options.maxConcurrency || this.maxConcurrency,
      maxSize: options.maxSize || this.maxQueueSize,
      priority: options.priority || false,
      batching: options.batching || false,
      batchSize: options.batchSize || this.batchSize,
      batchTimeout: options.batchTimeout || this.batchTimeout,
      processor: options.processor || null,
      retryAttempts: options.retryAttempts || this.retryAttempts,
      retryDelay: options.retryDelay || this.retryDelay
    };

    // Create priority queue or regular queue
    const queue = queueConfig.priority ? 
      new PriorityQueue() : 
      [];

    this.queues.set(name, {
      config: queueConfig,
      queue,
      processing: 0,
      paused: false
    });

    // Initialize workers
    this.workers.set(name, new Set());

    // Initialize batch queue if batching is enabled
    if (queueConfig.batching) {
      this.batchQueues.set(name, []);
    }

    // Initialize metrics
    this.metrics.queueSizes.set(name, 0);

    this.emit('queue:created', { name, config: queueConfig });

    return this;
  }

  /**
   * Add request to queue
   */
  async add(queueName, task, options = {}) {
    const queueData = this.queues.get(queueName);
    if (!queueData) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    const { config, queue } = queueData;

    // Check queue size limit
    if (this.getQueueSize(queueName) >= config.maxSize) {
      throw new Error(`Queue '${queueName}' is full`);
    }

    const request = {
      id: this.generateRequestId(),
      queueName,
      task,
      priority: options.priority || 0,
      timeout: options.timeout || this.defaultTimeout,
      retryCount: 0,
      maxRetries: options.retryAttempts || config.retryAttempts,
      retryDelay: options.retryDelay || config.retryDelay,
      createdAt: Date.now(),
      tags: options.tags || [],
      metadata: options.metadata || {}
    };

    // Add to appropriate queue
    if (config.batching) {
      await this.addToBatchQueue(queueName, request);
    } else {
      this.addToQueue(queue, request, config.priority);
    }

    this.metrics.totalRequests++;
    this.updateQueueSize(queueName);

    this.emit('request:queued', { queueName, requestId: request.id });

    // Process queue
    this.processQueue(queueName);

    return request.id;
  }

  /**
   * Add request to regular queue
   */
  addToQueue(queue, request, isPriority) {
    if (isPriority) {
      queue.enqueue(request, request.priority);
    } else {
      queue.push(request);
    }
  }

  /**
   * Add request to batch queue
   */
  async addToBatchQueue(queueName, request) {
    const batchQueue = this.batchQueues.get(queueName);
    const queueData = this.queues.get(queueName);
    
    batchQueue.push(request);

    // Check if batch is ready
    if (batchQueue.length >= queueData.config.batchSize) {
      await this.processBatch(queueName);
    } else {
      // Set timer for batch timeout
      this.setBatchTimer(queueName);
    }
  }

  /**
   * Set batch timer
   */
  setBatchTimer(queueName) {
    if (this.batchTimers.has(queueName)) {
      return; // Timer already set
    }

    const queueData = this.queues.get(queueName);
    const timer = setTimeout(async () => {
      this.batchTimers.delete(queueName);
      await this.processBatch(queueName);
    }, queueData.config.batchTimeout);

    this.batchTimers.set(queueName, timer);
  }

  /**
   * Process batch
   */
  async processBatch(queueName) {
    const batchQueue = this.batchQueues.get(queueName);
    const queueData = this.queues.get(queueName);
    
    if (batchQueue.length === 0) {
      return;
    }

    // Clear timer
    if (this.batchTimers.has(queueName)) {
      clearTimeout(this.batchTimers.get(queueName));
      this.batchTimers.delete(queueName);
    }

    // Extract batch
    const batch = batchQueue.splice(0, queueData.config.batchSize);
    
    // Create batch request
    const batchRequest = {
      id: this.generateRequestId(),
      queueName,
      type: 'batch',
      requests: batch,
      createdAt: Date.now()
    };

    // Add to regular queue for processing
    this.addToQueue(queueData.queue, batchRequest, queueData.config.priority);
    this.updateQueueSize(queueName);
    
    this.emit('batch:created', { queueName, batchId: batchRequest.id, size: batch.length });
  }

  /**
   * Process queue
   */
  async processQueue(queueName) {
    const queueData = this.queues.get(queueName);
    if (!queueData || queueData.paused) {
      return;
    }

    const { config, queue } = queueData;

    // Check if we can process more requests
    if (queueData.processing >= config.maxConcurrency) {
      return;
    }

    // Get next request
    const request = this.getNextRequest(queue, config.priority);
    if (!request) {
      return;
    }

    // Start processing
    queueData.processing++;
    this.activeRequests.set(request.id, request);
    
    this.emit('request:processing', { queueName, requestId: request.id });

    try {
      await this.processRequest(request);
    } catch (error) {
      this.emit('request:error', { queueName, requestId: request.id, error });
    } finally {
      queueData.processing--;
      this.activeRequests.delete(request.id);
      this.updateQueueSize(queueName);
      
      // Process next request
      setImmediate(() => this.processQueue(queueName));
    }
  }

  /**
   * Get next request from queue
   */
  getNextRequest(queue, isPriority) {
    if (isPriority) {
      return queue.dequeue();
    } else {
      return queue.shift();
    }
  }

  /**
   * Process individual request
   */
  async processRequest(request) {
    const startTime = Date.now();
    const queueData = this.queues.get(request.queueName);
    
    try {
      let result;

      if (request.type === 'batch') {
        result = await this.processBatchRequest(request);
      } else {
        // Set timeout
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Request timeout')), request.timeout);
        });

        // Process with timeout
        const processor = queueData.config.processor;
        if (!processor) {
          throw new Error(`No processor defined for queue '${request.queueName}'`);
        }

        result = await Promise.race([
          processor(request.task, request.metadata),
          timeoutPromise
        ]);
      }

      // Success
      const processingTime = Date.now() - startTime;
      this.updateProcessingTime(processingTime);
      this.metrics.completedRequests++;

      this.emit('request:completed', { 
        queueName: request.queueName, 
        requestId: request.id, 
        processingTime,
        result 
      });

      return result;

    } catch (error) {
      // Handle retry
      if (request.retryCount < request.maxRetries) {
        request.retryCount++;
        
        this.emit('request:retry', { 
          queueName: request.queueName, 
          requestId: request.id, 
          attempt: request.retryCount,
          error 
        });

        // Add delay before retry
        setTimeout(() => {
          const queueData = this.queues.get(request.queueName);
          this.addToQueue(queueData.queue, request, queueData.config.priority);
          this.processQueue(request.queueName);
        }, request.retryDelay * Math.pow(2, request.retryCount - 1)); // Exponential backoff

        return;
      }

      // Max retries reached
      this.metrics.failedRequests++;
      
      this.emit('request:failed', { 
        queueName: request.queueName, 
        requestId: request.id, 
        error,
        retryCount: request.retryCount 
      });

      throw error;
    }
  }

  /**
   * Process batch request
   */
  async processBatchRequest(batchRequest) {
    const queueData = this.queues.get(batchRequest.queueName);
    const processor = queueData.config.processor;
    
    if (!processor) {
      throw new Error(`No processor defined for queue '${batchRequest.queueName}'`);
    }

    // Extract tasks from batch
    const tasks = batchRequest.requests.map(req => req.task);
    const metadata = {
      batchId: batchRequest.id,
      batchSize: tasks.length,
      requests: batchRequest.requests
    };

    // Process batch
    const results = await processor(tasks, metadata);

    this.emit('batch:completed', { 
      queueName: batchRequest.queueName, 
      batchId: batchRequest.id, 
      size: tasks.length,
      results 
    });

    return results;
  }

  /**
   * Pause queue
   */
  pauseQueue(queueName) {
    const queueData = this.queues.get(queueName);
    if (queueData) {
      queueData.paused = true;
      this.emit('queue:paused', { queueName });
    }
  }

  /**
   * Resume queue
   */
  resumeQueue(queueName) {
    const queueData = this.queues.get(queueName);
    if (queueData) {
      queueData.paused = false;
      this.emit('queue:resumed', { queueName });
      this.processQueue(queueName);
    }
  }

  /**
   * Get queue size
   */
  getQueueSize(queueName) {
    const queueData = this.queues.get(queueName);
    if (!queueData) return 0;

    const { queue, config } = queueData;
    let size = config.priority ? queue.size() : queue.length;

    // Add batch queue size
    if (config.batching) {
      const batchQueue = this.batchQueues.get(queueName);
      size += batchQueue ? batchQueue.length : 0;
    }

    return size;
  }

  /**
   * Update queue size metrics
   */
  updateQueueSize(queueName) {
    this.metrics.queueSizes.set(queueName, this.getQueueSize(queueName));
  }

  /**
   * Update processing time metrics
   */
  updateProcessingTime(time) {
    this.processingTimes.push(time);
    
    if (this.processingTimes.length > this.maxProcessingTimeSamples) {
      this.processingTimes.shift();
    }

    this.metrics.averageProcessingTime = 
      this.processingTimes.reduce((a, b) => a + b, 0) / this.processingTimes.length;
  }

  /**
   * Start metrics collection
   */
  startMetricsCollection() {
    setInterval(() => {
      this.updateThroughput();
    }, 5000); // Update every 5 seconds
  }

  /**
   * Update throughput metrics
   */
  updateThroughput() {
    const now = Date.now();
    const timeDiff = (now - this.metrics.lastThroughputCheck) / 1000; // seconds
    
    if (timeDiff > 0) {
      this.metrics.throughput = this.metrics.completedRequests / timeDiff;
      this.metrics.lastThroughputCheck = now;
    }
  }

  /**
   * Get queue statistics
   */
  getQueueStats(queueName = null) {
    if (queueName) {
      const queueData = this.queues.get(queueName);
      if (!queueData) return null;

      return {
        name: queueName,
        size: this.getQueueSize(queueName),
        processing: queueData.processing,
        paused: queueData.paused,
        config: queueData.config
      };
    }

    // Return stats for all queues
    const stats = {};
    for (const name of this.queues.keys()) {
      stats[name] = this.getQueueStats(name);
    }

    return {
      global: this.metrics,
      queues: stats
    };
  }

  /**
   * Generate unique request ID
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear queue
   */
  clearQueue(queueName) {
    const queueData = this.queues.get(queueName);
    if (!queueData) return;

    const { queue, config } = queueData;
    
    if (config.priority) {
      queue.clear();
    } else {
      queue.length = 0;
    }

    // Clear batch queue
    if (config.batching) {
      const batchQueue = this.batchQueues.get(queueName);
      if (batchQueue) {
        batchQueue.length = 0;
      }
    }

    this.updateQueueSize(queueName);
    this.emit('queue:cleared', { queueName });
  }

  /**
   * Remove queue
   */
  removeQueue(queueName) {
    this.clearQueue(queueName);
    
    this.queues.delete(queueName);
    this.workers.delete(queueName);
    this.batchQueues.delete(queueName);
    this.metrics.queueSizes.delete(queueName);
    
    // Clear batch timer
    if (this.batchTimers.has(queueName)) {
      clearTimeout(this.batchTimers.get(queueName));
      this.batchTimers.delete(queueName);
    }

    this.emit('queue:removed', { queueName });
  }

  /**
   * Shutdown queue manager
   */
  async shutdown() {
    this.emit('queue:shutting-down');

    // Clear all batch timers
    for (const timer of this.batchTimers.values()) {
      clearTimeout(timer);
    }
    this.batchTimers.clear();

    // Wait for active requests to complete (with timeout)
    const shutdownTimeout = 30000; // 30 seconds
    const startTime = Date.now();

    while (this.activeRequests.size > 0 && (Date.now() - startTime) < shutdownTimeout) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Clear all queues
    for (const queueName of this.queues.keys()) {
      this.removeQueue(queueName);
    }

    this.emit('queue:shutdown');
  }
}

/**
 * Priority Queue implementation
 */
class PriorityQueue {
  constructor() {
    this.items = [];
  }

  enqueue(item, priority) {
    const queueElement = { item, priority };
    let added = false;

    for (let i = 0; i < this.items.length; i++) {
      if (queueElement.priority > this.items[i].priority) {
        this.items.splice(i, 0, queueElement);
        added = true;
        break;
      }
    }

    if (!added) {
      this.items.push(queueElement);
    }
  }

  dequeue() {
    if (this.isEmpty()) {
      return null;
    }
    return this.items.shift().item;
  }

  size() {
    return this.items.length;
  }

  isEmpty() {
    return this.items.length === 0;
  }

  clear() {
    this.items = [];
  }
}

export default QueueManager;