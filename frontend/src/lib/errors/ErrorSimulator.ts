/**
 * Error simulation and testing utilities for comprehensive error scenario testing
 */

import {
  TransactionError,
  TransactionErrorType,
  TransactionErrorSeverity,
  TransactionContext,
  TransactionStatus,
  ERROR_CODES,
  createTransactionError,
  createTransactionContext,
  createStatusUpdate
} from './types';

/**
 * Error scenario configuration
 */
export interface ErrorScenario {
  id: string;
  name: string;
  description: string;
  errorType: TransactionErrorType;
  errorCode: string;
  severity: TransactionErrorSeverity;
  retryable: boolean;
  probability: number; // 0-1 probability of occurrence
  delay?: number; // Delay before error occurs (ms)
  context?: Partial<TransactionContext>;
  metadata?: Record<string, any>;
}

/**
 * Simulation configuration
 */
export interface SimulationConfig {
  scenarios: ErrorScenario[];
  duration: number; // Simulation duration in ms
  frequency: number; // Error frequency (errors per second)
  randomSeed?: number;
  enableLogging: boolean;
  enableMetrics: boolean;
}

/**
 * Simulation result
 */
export interface SimulationResult {
  id: string;
  startTime: string;
  endTime: string;
  duration: number;
  totalErrors: number;
  errorsByType: Record<TransactionErrorType, number>;
  errorsBySeverity: Record<TransactionErrorSeverity, number>;
  scenariosTriggered: Array<{
    scenarioId: string;
    count: number;
    averageDelay: number;
  }>;
  performanceMetrics: {
    averageErrorGenerationTime: number;
    memoryUsage: number;
    cpuTime: number;
  };
  generatedErrors: TransactionError[];
}

/**
 * Mock error generator for specific error types
 */
export interface MockErrorGenerator {
  type: TransactionErrorType;
  generate: (context: TransactionContext, metadata?: Record<string, any>) => TransactionError;
}

/**
 * Performance test configuration
 */
export interface PerformanceTestConfig {
  errorCount: number;
  concurrency: number;
  errorTypes: TransactionErrorType[];
  measureMemory: boolean;
  measureTiming: boolean;
}

/**
 * Performance test result
 */
export interface PerformanceTestResult {
  totalTime: number;
  averageTimePerError: number;
  errorsPerSecond: number;
  memoryUsage: {
    initial: number;
    peak: number;
    final: number;
  };
  errorDistribution: Record<TransactionErrorType, number>;
  success: boolean;
  errors: string[];
}

/**
 * Error simulation and testing utility class
 */
export class ErrorSimulator {
  private mockGenerators: Map<TransactionErrorType, MockErrorGenerator> = new Map();
  private predefinedScenarios: ErrorScenario[] = [];
  private simulationResults: Map<string, SimulationResult> = new Map();
  private nextSimulationId = 1;

  constructor() {
    this.initializeMockGenerators();
    this.initializePredefinedScenarios();
  }

  /**
   * Generate a random error based on scenario probabilities
   */
  generateRandomError(
    context: TransactionContext,
    scenarios?: ErrorScenario[]
  ): TransactionError | null {
    const availableScenarios = scenarios || this.predefinedScenarios;
    const random = Math.random();
    let cumulativeProbability = 0;

    for (const scenario of availableScenarios) {
      cumulativeProbability += scenario.probability;
      if (random <= cumulativeProbability) {
        return this.generateErrorFromScenario(scenario, context);
      }
    }

    return null; // No error generated
  }

  /**
   * Generate error from specific scenario
   */
  generateErrorFromScenario(
    scenario: ErrorScenario,
    context: TransactionContext
  ): TransactionError {
    const enhancedContext = {
      ...context,
      ...scenario.context,
      metadata: {
        ...context.metadata,
        ...scenario.metadata,
        simulationScenario: scenario.id
      }
    };

    const generator = this.mockGenerators.get(scenario.errorType);
    if (generator) {
      return generator.generate(enhancedContext, scenario.metadata);
    }

    // Fallback to basic error creation
    return createTransactionError(
      scenario.errorType,
      scenario.errorCode as any,
      `Simulated ${scenario.name}`,
      enhancedContext,
      {
        severity: scenario.severity,
        retryable: scenario.retryable,
        suggestedActions: this.getSuggestedActionsForScenario(scenario)
      }
    );
  }

  /**
   * Run comprehensive error simulation
   */
  async runSimulation(config: SimulationConfig): Promise<SimulationResult> {
    const simulationId = `sim_${this.nextSimulationId++}`;
    const startTime = new Date();
    const result: SimulationResult = {
      id: simulationId,
      startTime: startTime.toISOString(),
      endTime: '',
      duration: 0,
      totalErrors: 0,
      errorsByType: {} as Record<TransactionErrorType, number>,
      errorsBySeverity: {} as Record<TransactionErrorSeverity, number>,
      scenariosTriggered: [],
      performanceMetrics: {
        averageErrorGenerationTime: 0,
        memoryUsage: 0,
        cpuTime: 0
      },
      generatedErrors: []
    };

    // Initialize counters
    Object.values(TransactionErrorType).forEach(type => {
      result.errorsByType[type] = 0;
    });
    Object.values(TransactionErrorSeverity).forEach(severity => {
      result.errorsBySeverity[severity] = 0;
    });

    const scenarioStats = new Map<string, { count: number; totalDelay: number }>();
    config.scenarios.forEach(scenario => {
      scenarioStats.set(scenario.id, { count: 0, totalDelay: 0 });
    });

    const context = createTransactionContext(56, '0x123456789abcdef');
    const errorInterval = 1000 / config.frequency; // ms between errors
    const totalErrors = Math.floor(config.duration / errorInterval);

    if (config.enableLogging) {
      console.log(`Starting simulation ${simulationId} for ${config.duration}ms`);
      console.log(`Target: ${totalErrors} errors at ${config.frequency} errors/second`);
    }

    const generationTimes: number[] = [];
    const initialMemory = this.getMemoryUsage();

    // Generate errors at specified frequency
    for (let i = 0; i < totalErrors; i++) {
      const errorStartTime = performance.now();
      
      const error = this.generateRandomError(context, config.scenarios);
      if (error) {
        result.totalErrors++;
        result.errorsByType[error.type]++;
        result.errorsBySeverity[error.severity]++;
        result.generatedErrors.push(error);

        // Track scenario statistics
        const scenarioId = error.context.metadata?.simulationScenario;
        if (scenarioId && scenarioStats.has(scenarioId)) {
          const stats = scenarioStats.get(scenarioId)!;
          stats.count++;
          scenarioStats.set(scenarioId, stats);
        }
      }

      const errorEndTime = performance.now();
      generationTimes.push(errorEndTime - errorStartTime);

      // Simulate delay between errors
      if (i < totalErrors - 1) {
        await this.delay(errorInterval);
      }
    }

    const endTime = new Date();
    result.endTime = endTime.toISOString();
    result.duration = endTime.getTime() - startTime.getTime();

    // Calculate performance metrics
    if (config.enableMetrics) {
      result.performanceMetrics.averageErrorGenerationTime = 
        generationTimes.reduce((sum, time) => sum + time, 0) / generationTimes.length;
      result.performanceMetrics.memoryUsage = this.getMemoryUsage() - initialMemory;
      result.performanceMetrics.cpuTime = result.duration; // Simplified
    }

    // Compile scenario statistics
    result.scenariosTriggered = Array.from(scenarioStats.entries()).map(([scenarioId, stats]) => ({
      scenarioId,
      count: stats.count,
      averageDelay: stats.count > 0 ? stats.totalDelay / stats.count : 0
    }));

    this.simulationResults.set(simulationId, result);

    if (config.enableLogging) {
      console.log(`Simulation ${simulationId} completed: ${result.totalErrors} errors generated`);
    }

    return result;
  }

  /**
   * Run performance tests on error handling system
   */
  async runPerformanceTest(config: PerformanceTestConfig): Promise<PerformanceTestResult> {
    const startTime = performance.now();
    const initialMemory = this.getMemoryUsage();
    let peakMemory = initialMemory;

    const result: PerformanceTestResult = {
      totalTime: 0,
      averageTimePerError: 0,
      errorsPerSecond: 0,
      memoryUsage: {
        initial: initialMemory,
        peak: initialMemory,
        final: initialMemory
      },
      errorDistribution: {} as Record<TransactionErrorType, number>,
      success: true,
      errors: []
    };

    // Initialize error distribution
    config.errorTypes.forEach(type => {
      result.errorDistribution[type] = 0;
    });

    try {
      const context = createTransactionContext(56, '0x123456789abcdef');
      const errorsPerBatch = Math.ceil(config.errorCount / config.concurrency);
      const batches: Promise<void>[] = [];

      // Create concurrent batches
      for (let batch = 0; batch < config.concurrency; batch++) {
        const batchPromise = this.runErrorGenerationBatch(
          errorsPerBatch,
          config.errorTypes,
          context,
          result
        );
        batches.push(batchPromise);
      }

      // Wait for all batches to complete
      await Promise.all(batches);

      const endTime = performance.now();
      result.totalTime = endTime - startTime;
      result.averageTimePerError = result.totalTime / config.errorCount;
      result.errorsPerSecond = (config.errorCount / result.totalTime) * 1000;

      if (config.measureMemory) {
        result.memoryUsage.final = this.getMemoryUsage();
        result.memoryUsage.peak = peakMemory;
      }

    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : String(error));
    }

    return result;
  }

  /**
   * Create mock network conditions for testing
   */
  createMockNetworkConditions(type: 'slow' | 'unstable' | 'congested' | 'offline'): {
    latency: number;
    packetLoss: number;
    bandwidth: number;
    errorRate: number;
  } {
    switch (type) {
      case 'slow':
        return { latency: 2000, packetLoss: 0.01, bandwidth: 1000, errorRate: 0.05 };
      case 'unstable':
        return { latency: 500, packetLoss: 0.1, bandwidth: 5000, errorRate: 0.15 };
      case 'congested':
        return { latency: 1000, packetLoss: 0.05, bandwidth: 2000, errorRate: 0.1 };
      case 'offline':
        return { latency: 0, packetLoss: 1.0, bandwidth: 0, errorRate: 1.0 };
      default:
        return { latency: 100, packetLoss: 0, bandwidth: 10000, errorRate: 0 };
    }
  }

  /**
   * Generate stress test scenarios
   */
  generateStressTestScenarios(intensity: 'low' | 'medium' | 'high' | 'extreme'): ErrorScenario[] {
    const baseScenarios = this.predefinedScenarios;
    const multipliers = {
      low: 0.1,
      medium: 0.3,
      high: 0.6,
      extreme: 0.9
    };

    const multiplier = multipliers[intensity];
    
    return baseScenarios.map(scenario => ({
      ...scenario,
      probability: Math.min(scenario.probability * (1 + multiplier), 0.95),
      delay: scenario.delay ? Math.max(scenario.delay * (1 - multiplier), 10) : undefined
    }));
  }

  /**
   * Get predefined error scenarios
   */
  getPredefinedScenarios(): ErrorScenario[] {
    return [...this.predefinedScenarios];
  }

  /**
   * Add custom error scenario
   */
  addCustomScenario(scenario: ErrorScenario): void {
    this.predefinedScenarios.push(scenario);
  }

  /**
   * Get simulation results
   */
  getSimulationResults(): SimulationResult[] {
    return Array.from(this.simulationResults.values());
  }

  /**
   * Get simulation result by ID
   */
  getSimulationResult(id: string): SimulationResult | undefined {
    return this.simulationResults.get(id);
  }

  /**
   * Clear simulation results
   */
  clearSimulationResults(): void {
    this.simulationResults.clear();
  }

  /**
   * Export simulation results
   */
  exportSimulationResults(format: 'json' | 'csv' = 'json'): string {
    const results = this.getSimulationResults();

    if (format === 'json') {
      return JSON.stringify(results, null, 2);
    } else {
      // CSV export
      const headers = [
        'id', 'startTime', 'duration', 'totalErrors', 'averageGenerationTime',
        'memoryUsage', 'userErrors', 'networkErrors', 'gasErrors', 'contractErrors'
      ];

      const rows = results.map(result => [
        result.id,
        result.startTime,
        result.duration,
        result.totalErrors,
        result.performanceMetrics.averageErrorGenerationTime.toFixed(2),
        result.performanceMetrics.memoryUsage,
        result.errorsByType.user || 0,
        result.errorsByType.network || 0,
        result.errorsByType.gas || 0,
        result.errorsByType.contract || 0
      ]);

      return [headers, ...rows].map(row => row.join(',')).join('\n');
    }
  }

  /**
   * Initialize mock error generators
   */
  private initializeMockGenerators(): void {
    // User error generator
    this.mockGenerators.set(TransactionErrorType.USER, {
      type: TransactionErrorType.USER,
      generate: (context, metadata) => {
        const userErrors = [
          ERROR_CODES.INSUFFICIENT_FUNDS,
          ERROR_CODES.USER_REJECTED,
          ERROR_CODES.INVALID_AMOUNT
        ];
        const errorCode = userErrors[Math.floor(Math.random() * userErrors.length)];
        
        return createTransactionError(
          TransactionErrorType.USER,
          errorCode as any,
          `Simulated user error: ${errorCode}`,
          context,
          {
            severity: TransactionErrorSeverity.MEDIUM,
            retryable: errorCode !== ERROR_CODES.USER_REJECTED,
            suggestedActions: this.getUserErrorSuggestions(errorCode)
          }
        );
      }
    });

    // Network error generator
    this.mockGenerators.set(TransactionErrorType.NETWORK, {
      type: TransactionErrorType.NETWORK,
      generate: (context, metadata) => {
        const networkErrors = [
          ERROR_CODES.NETWORK_TIMEOUT,
          ERROR_CODES.RPC_ERROR,
          ERROR_CODES.CONNECTION_FAILED
        ];
        const errorCode = networkErrors[Math.floor(Math.random() * networkErrors.length)];
        
        return createTransactionError(
          TransactionErrorType.NETWORK,
          errorCode as any,
          `Simulated network error: ${errorCode}`,
          context,
          {
            severity: TransactionErrorSeverity.LOW,
            retryable: true,
            suggestedActions: ['Wait and retry', 'Check network connection']
          }
        );
      }
    });

    // Gas error generator
    this.mockGenerators.set(TransactionErrorType.GAS, {
      type: TransactionErrorType.GAS,
      generate: (context, metadata) => {
        const gasErrors = [
          ERROR_CODES.GAS_TOO_LOW,
          ERROR_CODES.OUT_OF_GAS,
          ERROR_CODES.GAS_ESTIMATION_FAILED
        ];
        const errorCode = gasErrors[Math.floor(Math.random() * gasErrors.length)];
        
        return createTransactionError(
          TransactionErrorType.GAS,
          errorCode as any,
          `Simulated gas error: ${errorCode}`,
          context,
          {
            severity: TransactionErrorSeverity.MEDIUM,
            retryable: true,
            suggestedActions: ['Increase gas price', 'Retry with higher gas limit']
          }
        );
      }
    });

    // Contract error generator
    this.mockGenerators.set(TransactionErrorType.CONTRACT, {
      type: TransactionErrorType.CONTRACT,
      generate: (context, metadata) => {
        const contractErrors = [
          ERROR_CODES.CONTRACT_REVERT,
          ERROR_CODES.CONTRACT_NOT_FOUND,
          ERROR_CODES.INVALID_FUNCTION
        ];
        const errorCode = contractErrors[Math.floor(Math.random() * contractErrors.length)];
        
        return createTransactionError(
          TransactionErrorType.CONTRACT,
          errorCode as any,
          `Simulated contract error: ${errorCode}`,
          context,
          {
            severity: TransactionErrorSeverity.HIGH,
            retryable: errorCode === ERROR_CODES.CONTRACT_REVERT,
            suggestedActions: ['Check contract parameters', 'Verify contract address']
          }
        );
      }
    });

    // System error generator
    this.mockGenerators.set(TransactionErrorType.SYSTEM, {
      type: TransactionErrorType.SYSTEM,
      generate: (context, metadata) => {
        const systemErrors = [
          ERROR_CODES.INTERNAL_ERROR,
          ERROR_CODES.CONFIG_ERROR,
          ERROR_CODES.UNKNOWN_ERROR
        ];
        const errorCode = systemErrors[Math.floor(Math.random() * systemErrors.length)];
        
        return createTransactionError(
          TransactionErrorType.SYSTEM,
          errorCode as any,
          `Simulated system error: ${errorCode}`,
          context,
          {
            severity: TransactionErrorSeverity.CRITICAL,
            retryable: false,
            suggestedActions: ['Contact support', 'Check system status']
          }
        );
      }
    });

    // Validation error generator
    this.mockGenerators.set(TransactionErrorType.VALIDATION, {
      type: TransactionErrorType.VALIDATION,
      generate: (context, metadata) => {
        const validationErrors = [
          ERROR_CODES.INVALID_ADDRESS,
          ERROR_CODES.INVALID_CHAIN,
          ERROR_CODES.BELOW_MIN_DEPOSIT
        ];
        const errorCode = validationErrors[Math.floor(Math.random() * validationErrors.length)];
        
        return createTransactionError(
          TransactionErrorType.VALIDATION,
          errorCode as any,
          `Simulated validation error: ${errorCode}`,
          context,
          {
            severity: TransactionErrorSeverity.MEDIUM,
            retryable: false,
            suggestedActions: ['Check input parameters', 'Verify transaction details']
          }
        );
      }
    });
  }

  /**
   * Initialize predefined error scenarios
   */
  private initializePredefinedScenarios(): void {
    this.predefinedScenarios = [
      {
        id: 'insufficient_funds',
        name: 'Insufficient Funds',
        description: 'User has insufficient balance for transaction',
        errorType: TransactionErrorType.USER,
        errorCode: ERROR_CODES.INSUFFICIENT_FUNDS,
        severity: TransactionErrorSeverity.MEDIUM,
        retryable: false,
        probability: 0.15
      },
      {
        id: 'network_timeout',
        name: 'Network Timeout',
        description: 'Network request timed out',
        errorType: TransactionErrorType.NETWORK,
        errorCode: ERROR_CODES.NETWORK_TIMEOUT,
        severity: TransactionErrorSeverity.LOW,
        retryable: true,
        probability: 0.1,
        delay: 5000
      },
      {
        id: 'gas_too_low',
        name: 'Gas Price Too Low',
        description: 'Gas price is too low for current network conditions',
        errorType: TransactionErrorType.GAS,
        errorCode: ERROR_CODES.GAS_TOO_LOW,
        severity: TransactionErrorSeverity.MEDIUM,
        retryable: true,
        probability: 0.08
      },
      {
        id: 'user_rejection',
        name: 'User Rejection',
        description: 'User rejected the transaction in wallet',
        errorType: TransactionErrorType.USER,
        errorCode: ERROR_CODES.USER_REJECTED,
        severity: TransactionErrorSeverity.LOW,
        retryable: false,
        probability: 0.12
      },
      {
        id: 'contract_revert',
        name: 'Contract Revert',
        description: 'Smart contract execution reverted',
        errorType: TransactionErrorType.CONTRACT,
        errorCode: ERROR_CODES.CONTRACT_REVERT,
        severity: TransactionErrorSeverity.HIGH,
        retryable: false,
        probability: 0.05
      },
      {
        id: 'rpc_error',
        name: 'RPC Error',
        description: 'RPC endpoint returned an error',
        errorType: TransactionErrorType.NETWORK,
        errorCode: ERROR_CODES.RPC_ERROR,
        severity: TransactionErrorSeverity.MEDIUM,
        retryable: true,
        probability: 0.07
      },
      {
        id: 'internal_error',
        name: 'Internal System Error',
        description: 'Internal system error occurred',
        errorType: TransactionErrorType.SYSTEM,
        errorCode: ERROR_CODES.INTERNAL_ERROR,
        severity: TransactionErrorSeverity.CRITICAL,
        retryable: false,
        probability: 0.02
      }
    ];
  }

  /**
   * Run error generation batch for performance testing
   */
  private async runErrorGenerationBatch(
    count: number,
    errorTypes: TransactionErrorType[],
    context: TransactionContext,
    result: PerformanceTestResult
  ): Promise<void> {
    for (let i = 0; i < count; i++) {
      const errorType = errorTypes[Math.floor(Math.random() * errorTypes.length)];
      const generator = this.mockGenerators.get(errorType);
      
      if (generator) {
        const error = generator.generate(context);
        result.errorDistribution[errorType]++;
      }
    }
  }

  /**
   * Get suggested actions for scenario
   */
  private getSuggestedActionsForScenario(scenario: ErrorScenario): string[] {
    const actionMap: Record<string, string[]> = {
      [ERROR_CODES.INSUFFICIENT_FUNDS]: ['Add more funds', 'Reduce amount'],
      [ERROR_CODES.NETWORK_TIMEOUT]: ['Retry transaction', 'Check connection'],
      [ERROR_CODES.GAS_TOO_LOW]: ['Increase gas price', 'Wait for lower congestion'],
      [ERROR_CODES.USER_REJECTED]: ['Try again', 'Check transaction details'],
      [ERROR_CODES.CONTRACT_REVERT]: ['Check parameters', 'Contact support']
    };

    return actionMap[scenario.errorCode] || ['Retry transaction', 'Contact support'];
  }

  /**
   * Get user error suggestions
   */
  private getUserErrorSuggestions(errorCode: string): string[] {
    const suggestions: Record<string, string[]> = {
      [ERROR_CODES.INSUFFICIENT_FUNDS]: ['Add more funds to wallet', 'Reduce transaction amount'],
      [ERROR_CODES.USER_REJECTED]: ['Approve transaction in wallet', 'Check transaction details'],
      [ERROR_CODES.INVALID_AMOUNT]: ['Enter valid amount', 'Check minimum/maximum limits']
    };

    return suggestions[errorCode] || ['Try again', 'Contact support'];
  }

  /**
   * Get memory usage (simplified)
   */
  private getMemoryUsage(): number {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  /**
   * Delay execution
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Default error simulator instance
 */
export const errorSimulator = new ErrorSimulator();