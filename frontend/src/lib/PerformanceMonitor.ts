/**
 * Performance Monitor for tracking application performance metrics
 */

export interface PerformanceMetrics {
  duration: number;
  memoryUsage: number;
  cpuUsage: number;
  networkRequests: number;
}

export class PerformanceMonitor {
  private startTime: number = 0;
  private endTime: number = 0;

  start(): void {
    this.startTime = performance.now();
  }

  end(): void {
    this.endTime = performance.now();
  }

  getDuration(): number {
    return this.endTime - this.startTime;
  }

  getMetrics(): PerformanceMetrics {
    return {
      duration: this.getDuration(),
      memoryUsage: this.getMemoryUsage(),
      cpuUsage: this.getCpuUsage(),
      networkRequests: this.getNetworkRequests()
    };
  }

  private getMemoryUsage(): number {
    // Mock memory usage for tests
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize || 0;
    }
    return Math.random() * 50 * 1024 * 1024; // Mock 0-50MB
  }

  private getCpuUsage(): number {
    // Mock CPU usage for tests
    return Math.random() * 100; // Mock 0-100%
  }

  private getNetworkRequests(): number {
    // Mock network requests count
    return Math.floor(Math.random() * 10);
  }

  reset(): void {
    this.startTime = 0;
    this.endTime = 0;
  }
}