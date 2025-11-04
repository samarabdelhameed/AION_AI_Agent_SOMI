import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TestOrchestrator } from './TestOrchestrator';

/**
 * Unit tests for TestOrchestrator class
 * Tests configuration management, test execution lifecycle, and scheduling
 */
describe('TestOrchestrator', () => {
  let orchestrator: TestOrchestrator;

  beforeEach(() => {
    orchestrator = new TestOrchestrator();
    
    // Mock console methods to avoid noise in tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    orchestrator.stopTesting();
    vi.restoreAllMocks();
  });

  describe('Configuration Management', () => {
    it('should validate configuration successfully', async () => {
      const isValid = await orchestrator.validateConfiguration();
      expect(isValid).toBe(true);
    });

    it('should return current configuration', () => {
      const config = orchestrator.getConfiguration();
      expect(config).toBeDefined();
      expect(config.testSuites).toBeDefined();
      expect(config.environmentSettings).toBeDefined();
    });

    it('should update configuration', () => {
      const newConfig = {
        validationThresholds: {
          dataAccuracy: 99,
          performanceScore: 90,
          workflowSuccess: 95
        }
      };

      orchestrator.updateConfiguration(newConfig);
      const updatedConfig = orchestrator.getConfiguration();
      
      expect(updatedConfig.validationThresholds.dataAccuracy).toBe(99);
      expect(updatedConfig.validationThresholds.performanceScore).toBe(90);
      expect(updatedConfig.validationThresholds.workflowSuccess).toBe(95);
    });
  });

  describe('Test Status Management', () => {
    it('should return correct initial status', () => {
      const status = orchestrator.getTestStatus();
      
      expect(status.isRunning).toBe(false);
      expect(status.currentTest).toBeNull();
      expect(status.progress).toBe(0);
      expect(status.startTime).toBeNull();
    });

    it('should update status during test execution', async () => {
      // Mock the browser initialization to avoid actual browser launch
      const mockUINavigator = {
        initializeBrowser: vi.fn().mockResolvedValue(undefined),
        closeBrowser: vi.fn().mockResolvedValue(undefined)
      };
      
      // Replace the UI navigator with mock
      (orchestrator as any).uiNavigator = mockUINavigator;

      // Start testing (this will run in background)
      const testPromise = orchestrator.startAutomatedTesting();
      
      // Check status immediately after starting
      const runningStatus = orchestrator.getTestStatus();
      expect(runningStatus.isRunning).toBe(true);
      expect(runningStatus.currentTest).toBeDefined();
      expect(runningStatus.startTime).toBeDefined();

      // Wait for test to complete
      await testPromise;

      // Check final status
      const finalStatus = orchestrator.getTestStatus();
      expect(finalStatus.isRunning).toBe(false);
    });
  });

  describe('Test Execution', () => {
    it('should execute test suite and return results', async () => {
      // Mock dependencies to avoid actual browser operations
      const mockUINavigator = {
        initializeBrowser: vi.fn().mockResolvedValue(undefined),
        closeBrowser: vi.fn().mockResolvedValue(undefined)
      };
      
      const mockPerformanceMonitor = {
        startPerformanceTracking: vi.fn(),
        stopPerformanceTracking: vi.fn().mockReturnValue({
          responseTime: 1000,
          loadTime: 2000,
          memoryUsage: 50 * 1024 * 1024,
          cpuUsage: 0,
          networkRequests: []
        })
      };

      (orchestrator as any).uiNavigator = mockUINavigator;
      (orchestrator as any).performanceMonitor = mockPerformanceMonitor;

      const results = await orchestrator.startAutomatedTesting();

      expect(results).toBeDefined();
      expect(results.timestamp).toBeInstanceOf(Date);
      expect(results.duration).toBeGreaterThanOrEqual(0); // Allow 0 duration for fast tests
      expect(results.overallScore).toBeGreaterThanOrEqual(0);
      expect(results.overallScore).toBeLessThanOrEqual(100);
      expect(results.componentResults).toBeDefined();
      expect(results.workflowResults).toBeDefined();
      expect(results.performanceMetrics).toBeDefined();
    });

    it('should handle test execution errors gracefully', async () => {
      // Mock UI navigator to throw error
      const mockUINavigator = {
        initializeBrowser: vi.fn().mockRejectedValue(new Error('Browser initialization failed')),
        closeBrowser: vi.fn().mockResolvedValue(undefined)
      };

      (orchestrator as any).uiNavigator = mockUINavigator;

      await expect(orchestrator.startAutomatedTesting()).rejects.toThrow('Browser initialization failed');
      
      // Ensure status is reset after error
      const status = orchestrator.getTestStatus();
      expect(status.isRunning).toBe(false);
    });
  });

  describe('Scheduling', () => {
    it('should schedule periodic testing', async () => {
      const interval = 100; // 100ms for quick test
      
      // Mock the startAutomatedTesting method to avoid actual execution
      const mockStartTesting = vi.spyOn(orchestrator, 'startAutomatedTesting')
        .mockResolvedValue({} as any);

      orchestrator.schedulePeriodicTesting(interval);

      // Wait for at least one scheduled execution
      await new Promise(resolve => setTimeout(resolve, interval + 50));
      
      expect(mockStartTesting).toHaveBeenCalled();
      orchestrator.stopTesting();
    });

    it('should stop scheduled testing', () => {
      orchestrator.schedulePeriodicTesting(1000);
      orchestrator.stopTesting();
      
      const status = orchestrator.getTestStatus();
      expect(status.isRunning).toBe(false);
    });

    it('should not run scheduled test if already running', async () => {
      const interval = 50;
      
      // Mock a long-running test
      const mockStartTesting = vi.spyOn(orchestrator, 'startAutomatedTesting')
        .mockImplementation(() => new Promise(resolve => setTimeout(resolve, 200)));

      // Mock the isRunning status
      (orchestrator as any).isRunning = true;

      orchestrator.schedulePeriodicTesting(interval);

      // Wait and check that test wasn't called due to already running
      await new Promise(resolve => setTimeout(resolve, interval + 25));
      
      expect(mockStartTesting).not.toHaveBeenCalled();
      orchestrator.stopTesting();
    });
  });

  describe('Report Generation', () => {
    it('should generate comprehensive report', async () => {
      const report = await orchestrator.generateReport();

      expect(report).toBeDefined();
      expect(report.summary).toBeDefined();
      expect(report.detailedResults).toBeDefined();
      expect(report.qaScore).toBeGreaterThanOrEqual(0);
      expect(report.qaScore).toBeLessThanOrEqual(100);
      expect(report.hackathonReadiness).toBeDefined();
      expect(report.improvementSuggestions).toBeDefined();
    });

    it('should include hackathon readiness assessment', async () => {
      const report = await orchestrator.generateReport();
      const readiness = report.hackathonReadiness;

      expect(readiness.overall).toBeGreaterThanOrEqual(0);
      expect(readiness.presentation).toBeGreaterThanOrEqual(0);
      expect(readiness.functionality).toBeGreaterThanOrEqual(0);
      expect(readiness.dataAccuracy).toBeGreaterThanOrEqual(0);
      expect(readiness.userExperience).toBeGreaterThanOrEqual(0);
      expect(readiness.wowFactor).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Test History Management', () => {
    it('should maintain test history', async () => {
      // Mock dependencies
      const mockUINavigator = {
        initializeBrowser: vi.fn().mockResolvedValue(undefined),
        closeBrowser: vi.fn().mockResolvedValue(undefined)
      };
      
      const mockPerformanceMonitor = {
        startPerformanceTracking: vi.fn(),
        stopPerformanceTracking: vi.fn().mockReturnValue({
          responseTime: 1000,
          loadTime: 2000,
          memoryUsage: 50 * 1024 * 1024,
          cpuUsage: 0,
          networkRequests: []
        })
      };

      (orchestrator as any).uiNavigator = mockUINavigator;
      (orchestrator as any).performanceMonitor = mockPerformanceMonitor;

      // Run a test to generate history
      await orchestrator.startAutomatedTesting();

      // Schedule a test to add to history
      const mockStartTesting = vi.spyOn(orchestrator, 'startAutomatedTesting')
        .mockResolvedValue({
          overallScore: 85,
          passed: true,
          timestamp: new Date(),
          duration: 5000
        } as any);

      orchestrator.schedulePeriodicTesting(50);
      
      // Wait for scheduled test
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const history = orchestrator.getTestHistory();
      expect(history.length).toBeGreaterThan(0);
      
      orchestrator.stopTesting();
    });

    it('should clear test history', () => {
      orchestrator.clearTestHistory();
      const history = orchestrator.getTestHistory();
      expect(history.length).toBe(0);
    });
  });

  describe('Failure Handling', () => {
    it('should handle test failures appropriately', async () => {
      const failures = [
        {
          testName: 'Test Component',
          component: 'WalletPanel',
          error: new Error('Component not found'),
          severity: 'high' as const,
          timestamp: new Date()
        }
      ];

      // This should not throw
      await expect(orchestrator.handleTestFailures(failures)).resolves.toBeUndefined();
    });
  });
});