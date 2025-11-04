import { lazy } from 'react';

// Lazy load components for code splitting
export const LazyPortfolioAnalytics = lazy(() => 
  import('../pages/PortfolioAnalytics').then(module => ({ default: module.PortfolioAnalytics }))
);

export const LazyAIRecommendationCard = lazy(() => 
  import('../components/ai/AIRecommendationCard').then(module => ({ default: module.AIRecommendationCard }))
);

export const LazyRiskManagementDashboard = lazy(() => 
  import('../components/dashboard/RiskManagementDashboard').then(module => ({ default: module.RiskManagementDashboard }))
);

export const LazyTransactionHistoryCard = lazy(() => 
  import('../components/dashboard/TransactionHistoryCard').then(module => ({ default: module.TransactionHistoryCard }))
);

// Performance monitoring utilities
export class PerformanceMonitor {
  private static metrics: Map<string, number[]> = new Map();
  
  static startTiming(label: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (!this.metrics.has(label)) {
        this.metrics.set(label, []);
      }
      
      this.metrics.get(label)!.push(duration);
      
      // Keep only last 100 measurements
      const measurements = this.metrics.get(label)!;
      if (measurements.length > 100) {
        measurements.shift();
      }
      
      console.log(`⚡ ${label}: ${duration.toFixed(2)}ms`);
    };
  }
  
  static getAverageTime(label: string): number {
    const measurements = this.metrics.get(label);
    if (!measurements || measurements.length === 0) return 0;
    
    const sum = measurements.reduce((acc, val) => acc + val, 0);
    return sum / measurements.length;
  }
  
  static getMetrics(): Record<string, { avg: number; count: number; latest: number }> {
    const result: Record<string, { avg: number; count: number; latest: number }> = {};
    
    for (const [label, measurements] of this.metrics.entries()) {
      if (measurements.length > 0) {
        const sum = measurements.reduce((acc, val) => acc + val, 0);
        result[label] = {
          avg: sum / measurements.length,
          count: measurements.length,
          latest: measurements[measurements.length - 1]
        };
      }
    }
    
    return result;
  }
}

// Debounce utility for performance
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle utility for performance
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Memoization utility
export function memoize<T extends (...args: any[]) => any>(
  func: T,
  getKey?: (...args: Parameters<T>) => string
): T {
  const cache = new Map<string, ReturnType<T>>();
  
  return ((...args: Parameters<T>) => {
    const key = getKey ? getKey(...args) : JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = func(...args);
    cache.set(key, result);
    
    // Limit cache size
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
    
    return result;
  }) as T;
}

// Image optimization utility
export function optimizeImage(src: string, width?: number, height?: number): string {
  // In a real implementation, this would use a service like Cloudinary or similar
  if (width || height) {
    const params = new URLSearchParams();
    if (width) params.set('w', width.toString());
    if (height) params.set('h', height.toString());
    params.set('q', '80'); // Quality
    params.set('f', 'webp'); // Format
    
    return `${src}?${params.toString()}`;
  }
  
  return src;
}

// Bundle size analyzer
export class BundleAnalyzer {
  static logComponentSize(componentName: string, element: HTMLElement): void {
    const size = element.innerHTML.length;
    console.log(`📦 ${componentName} rendered size: ${(size / 1024).toFixed(2)}KB`);
  }
  
  static measureRenderTime(componentName: string, renderFn: () => void): void {
    const endTiming = PerformanceMonitor.startTiming(`${componentName}_render`);
    renderFn();
    endTiming();
  }
}

// Memory usage monitoring
export class MemoryMonitor {
  private static measurements: number[] = [];
  
  static measure(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usage = {
        used: Math.round(memory.usedJSHeapSize / 1048576), // MB
        total: Math.round(memory.totalJSHeapSize / 1048576), // MB
        limit: Math.round(memory.jsHeapSizeLimit / 1048576) // MB
      };
      
      this.measurements.push(usage.used);
      
      // Keep only last 50 measurements
      if (this.measurements.length > 50) {
        this.measurements.shift();
      }
      
      console.log(`🧠 Memory usage: ${usage.used}MB / ${usage.total}MB (limit: ${usage.limit}MB)`);
      
      // Warn if memory usage is high
      if (usage.used > usage.limit * 0.8) {
        console.warn('⚠️ High memory usage detected');
      }
    }
  }
  
  static getAverageUsage(): number {
    if (this.measurements.length === 0) return 0;
    
    const sum = this.measurements.reduce((acc, val) => acc + val, 0);
    return sum / this.measurements.length;
  }
  
  static startMonitoring(interval: number = 30000): () => void {
    const intervalId = setInterval(() => {
      this.measure();
    }, interval);
    
    return () => clearInterval(intervalId);
  }
}

// Service Worker registration for caching
export async function registerServiceWorker(): Promise<void> {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('✅ Service Worker registered:', registration);
      
      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('🔄 New service worker available');
              // Notify user about update
            }
          });
        }
      });
    } catch (error) {
      console.error('❌ Service Worker registration failed:', error);
    }
  }
}

// Preload critical resources
export function preloadCriticalResources(): void {
  const criticalResources = [
    '/fonts/inter-var.woff2',
    '/images/logo.svg'
  ];
  
  criticalResources.forEach(resource => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = resource;
    
    if (resource.includes('.woff')) {
      link.as = 'font';
      link.type = 'font/woff2';
      link.crossOrigin = 'anonymous';
    } else if (resource.includes('.svg')) {
      link.as = 'image';
    }
    
    document.head.appendChild(link);
  });
}

// Intersection Observer for lazy loading
export function createIntersectionObserver(
  callback: (entries: IntersectionObserverEntry[]) => void,
  options?: IntersectionObserverInit
): IntersectionObserver {
  const defaultOptions: IntersectionObserverInit = {
    root: null,
    rootMargin: '50px',
    threshold: 0.1,
    ...options
  };
  
  return new IntersectionObserver(callback, defaultOptions);
}

// Virtual scrolling utility for large lists
export class VirtualScroller {
  private container: HTMLElement;
  private itemHeight: number;
  private visibleCount: number;
  private scrollTop = 0;
  
  constructor(container: HTMLElement, itemHeight: number) {
    this.container = container;
    this.itemHeight = itemHeight;
    this.visibleCount = Math.ceil(container.clientHeight / itemHeight) + 2; // Buffer
    
    this.container.addEventListener('scroll', this.handleScroll.bind(this));
  }
  
  private handleScroll(): void {
    this.scrollTop = this.container.scrollTop;
  }
  
  getVisibleRange(totalItems: number): { start: number; end: number } {
    const start = Math.floor(this.scrollTop / this.itemHeight);
    const end = Math.min(start + this.visibleCount, totalItems);
    
    return { start: Math.max(0, start), end };
  }
  
  getOffsetY(): number {
    const start = Math.floor(this.scrollTop / this.itemHeight);
    return start * this.itemHeight;
  }
}

// Performance optimization hooks
export function usePerformanceOptimization() {
  // Start memory monitoring
  const stopMemoryMonitoring = MemoryMonitor.startMonitoring();
  
  // Cleanup on unmount
  return () => {
    stopMemoryMonitoring();
  };
}

// Critical CSS inlining utility
export function inlineCriticalCSS(): void {
  const criticalCSS = `
    /* Critical CSS for above-the-fold content */
    .loading-skeleton {
      background: linear-gradient(90deg, #374151 25%, #4b5563 50%, #374151 75%);
      background-size: 200% 100%;
      animation: loading 1.5s infinite;
    }
    
    @keyframes loading {
      0% { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `;
  
  const style = document.createElement('style');
  style.textContent = criticalCSS;
  document.head.appendChild(style);
}

// Export all optimization utilities
export default {
  PerformanceMonitor,
  debounce,
  throttle,
  memoize,
  optimizeImage,
  BundleAnalyzer,
  MemoryMonitor,
  registerServiceWorker,
  preloadCriticalResources,
  createIntersectionObserver,
  VirtualScroller,
  usePerformanceOptimization,
  inlineCriticalCSS
};