import { 
  PerformanceMonitor as IPerformanceMonitor, 
  LoadingMetrics, 
  MemoryMetrics, 
  PerformanceReport,
  PerformanceMetrics 
} from '../interfaces';

/**
 * System performance and response time tracking
 * Monitors loading states, memory usage, and performance thresholds
 */
export class PerformanceMonitor implements IPerformanceMonitor {
  private performanceEntries: Map<string, number> = new Map();
  private isTracking: boolean = false;
  private trackingStartTime: number = 0;
  private memorySnapshots: MemoryMetrics[] = [];

  async measureResponseTime(action: string): Promise<number> {
    const startTime = performance.now();
    
    try {
      // This will be implemented with actual action execution in later tasks
      // For now, simulate measurement
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      this.performanceEntries.set(action, responseTime);
      return responseTime;
    } catch (error) {
      const endTime = performance.now();
      const responseTime = endTime - startTime;
      
      console.error(`Error measuring response time for ${action}:`, error);
      return responseTime;
    }
  }

  async trackLoadingStates(): Promise<LoadingMetrics> {
    try {
      const navigationTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      
      const metrics: LoadingMetrics = {
        initialLoad: navigationTiming ? navigationTiming.loadEventEnd - navigationTiming.navigationStart : 0,
        componentLoad: this.getComponentLoadTimes(),
        dataFetch: this.getDataFetchTimes(),
        totalLoadTime: 0
      };

      metrics.totalLoadTime = metrics.initialLoad + 
        Object.values(metrics.componentLoad).reduce((sum, time) => sum + time, 0) +
        Object.values(metrics.dataFetch).reduce((sum, time) => sum + time, 0);

      return metrics;
    } catch (error) {
      console.error('Error tracking loading states:', error);
      return {
        initialLoad: 0,
        componentLoad: {},
        dataFetch: {},
        totalLoadTime: 0
      };
    }
  }

  async monitorMemoryUsage(): Promise<MemoryMetrics> {
    try {
      // Use performance.memory if available (Chrome)
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        const metrics: MemoryMetrics = {
          heapUsed: memory.usedJSHeapSize,
          heapTotal: memory.totalJSHeapSize,
          external: 0, // Not available in browser
          rss: 0 // Not available in browser
        };

        this.memorySnapshots.push(metrics);
        return metrics;
      } else {
        // Fallback for browsers without performance.memory
        return {
          heapUsed: 0,
          heapTotal: 0,
          external: 0,
          rss: 0
        };
      }
    } catch (error) {
      console.error('Error monitoring memory usage:', error);
      return {
        heapUsed: 0,
        heapTotal: 0,
        external: 0,
        rss: 0
      };
    }
  }

  async validatePerformanceThresholds(): Promise<PerformanceReport> {
    try {
      const metrics = await this.getCurrentPerformanceMetrics();
      const thresholdViolations = [];
      const recommendations = [];

      // Define performance thresholds
      const thresholds = {
        responseTime: 2000, // 2 seconds
        loadTime: 5000, // 5 seconds
        memoryUsage: 100 * 1024 * 1024, // 100MB
        cpuUsage: 80 // 80%
      };

      // Check response time threshold
      if (metrics.responseTime > thresholds.responseTime) {
        thresholdViolations.push({
          metric: 'responseTime',
          threshold: thresholds.responseTime,
          actual: metrics.responseTime,
          severity: 'high'
        });
        recommendations.push({
          area: 'Response Time',
          issue: 'Slow response times detected',
          suggestion: 'Optimize API calls and reduce payload sizes',
          impact: 'significant'
        });
      }

      // Check load time threshold
      if (metrics.loadTime > thresholds.loadTime) {
        thresholdViolations.push({
          metric: 'loadTime',
          threshold: thresholds.loadTime,
          actual: metrics.loadTime,
          severity: 'medium'
        });
        recommendations.push({
          area: 'Load Time',
          issue: 'Slow page load times',
          suggestion: 'Implement code splitting and lazy loading',
          impact: 'moderate'
        });
      }

      // Check memory usage threshold
      if (metrics.memoryUsage > thresholds.memoryUsage) {
        thresholdViolations.push({
          metric: 'memoryUsage',
          threshold: thresholds.memoryUsage,
          actual: metrics.memoryUsage,
          severity: 'medium'
        });
        recommendations.push({
          area: 'Memory Usage',
          issue: 'High memory consumption',
          suggestion: 'Review memory leaks and optimize data structures',
          impact: 'moderate'
        });
      }

      // Calculate overall performance score
      const overallScore = this.calculatePerformanceScore(metrics, thresholds);

      return {
        overallScore,
        metrics,
        thresholdViolations,
        recommendations
      };
    } catch (error) {
      console.error('Error validating performance thresholds:', error);
      return {
        overallScore: 0,
        metrics: {
          responseTime: 0,
          loadTime: 0,
          memoryUsage: 0,
          cpuUsage: 0,
          networkRequests: []
        },
        thresholdViolations: [],
        recommendations: []
      };
    }
  }

  startPerformanceTracking(): void {
    this.isTracking = true;
    this.trackingStartTime = performance.now();
    this.performanceEntries.clear();
    this.memorySnapshots = [];
    
    // Start periodic memory monitoring
    const memoryInterval = setInterval(async () => {
      if (!this.isTracking) {
        clearInterval(memoryInterval);
        return;
      }
      await this.monitorMemoryUsage();
    }, 5000); // Monitor every 5 seconds
  }

  stopPerformanceTracking(): PerformanceMetrics {
    this.isTracking = false;
    const trackingDuration = performance.now() - this.trackingStartTime;

    // Calculate average response time
    const responseTimes = Array.from(this.performanceEntries.values());
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;

    // Calculate average memory usage
    const avgMemoryUsage = this.memorySnapshots.length > 0
      ? this.memorySnapshots.reduce((sum, snapshot) => sum + snapshot.heapUsed, 0) / this.memorySnapshots.length
      : 0;

    return {
      responseTime: avgResponseTime,
      loadTime: trackingDuration,
      memoryUsage: avgMemoryUsage,
      cpuUsage: 0, // CPU usage not available in browser
      networkRequests: this.getNetworkMetrics()
    };
  }

  // Helper methods
  private getComponentLoadTimes(): Record<string, number> {
    const componentTimes: Record<string, number> = {};
    
    // Get resource timing entries for components
    const resourceEntries = performance.getEntriesByType('resource');
    
    for (const entry of resourceEntries) {
      if (entry.name.includes('.js') || entry.name.includes('.css')) {
        const fileName = entry.name.split('/').pop() || entry.name;
        componentTimes[fileName] = entry.duration;
      }
    }

    return componentTimes;
  }

  private getDataFetchTimes(): Record<string, number> {
    const fetchTimes: Record<string, number> = {};
    
    // Get fetch timing from performance entries
    const resourceEntries = performance.getEntriesByType('resource');
    
    for (const entry of resourceEntries) {
      if (entry.name.includes('/api/') || entry.name.includes('rpc')) {
        const endpoint = this.extractEndpointName(entry.name);
        fetchTimes[endpoint] = entry.duration;
      }
    }

    return fetchTimes;
  }

  private extractEndpointName(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname.split('/').pop() || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  private async getCurrentPerformanceMetrics(): Promise<PerformanceMetrics> {
    const loadingMetrics = await this.trackLoadingStates();
    const memoryMetrics = await this.monitorMemoryUsage();
    
    const responseTimes = Array.from(this.performanceEntries.values());
    const avgResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;

    return {
      responseTime: avgResponseTime,
      loadTime: loadingMetrics.totalLoadTime,
      memoryUsage: memoryMetrics.heapUsed,
      cpuUsage: 0, // Not available in browser
      networkRequests: this.getNetworkMetrics()
    };
  }

  private getNetworkMetrics(): any[] {
    const networkMetrics = [];
    const resourceEntries = performance.getEntriesByType('resource');
    
    for (const entry of resourceEntries) {
      networkMetrics.push({
        url: entry.name,
        method: 'GET', // Default, actual method not available in resource timing
        responseTime: entry.duration,
        status: 200, // Default, actual status not available
        size: entry.transferSize || 0
      });
    }

    return networkMetrics;
  }

  private calculatePerformanceScore(metrics: PerformanceMetrics, thresholds: any): number {
    let score = 100;

    // Deduct points for threshold violations
    if (metrics.responseTime > thresholds.responseTime) {
      score -= 30;
    }
    if (metrics.loadTime > thresholds.loadTime) {
      score -= 25;
    }
    if (metrics.memoryUsage > thresholds.memoryUsage) {
      score -= 20;
    }

    // Additional deductions for very poor performance
    if (metrics.responseTime > thresholds.responseTime * 2) {
      score -= 20;
    }
    if (metrics.loadTime > thresholds.loadTime * 2) {
      score -= 15;
    }

    return Math.max(0, score);
  }
}