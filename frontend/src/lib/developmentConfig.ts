// Development Configuration and Helpers
// This file contains development-specific configurations and utilities

interface DevelopmentConfig {
  suppressErrors: boolean;
  mockDataEnabled: boolean;
  debugMode: boolean;
  skipMCPConnection: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
}

class DevelopmentConfigManager {
  private config: DevelopmentConfig;

  constructor() {
    this.config = this.loadDevelopmentConfig();
    this.applyDevelopmentSettings();
  }

  private loadDevelopmentConfig(): DevelopmentConfig {
    const isDev = import.meta.env.DEV;
    const isTest = import.meta.env.MODE === 'test';
    
    return {
      suppressErrors: isDev && !localStorage.getItem('show-all-errors'),
      mockDataEnabled: isDev || isTest,
      debugMode: localStorage.getItem('debug-mode') === 'true',
      skipMCPConnection: isDev && localStorage.getItem('skip-mcp') === 'true',
      logLevel: (localStorage.getItem('log-level') as any) || (isDev ? 'warn' : 'warn'), // Default to warn level to reduce noise
    };
  }

  private applyDevelopmentSettings(): void {
    if (!import.meta.env.DEV) return;

    // Add development helpers to window
    (window as any).devConfig = {
      showAllErrors: () => {
        localStorage.setItem('show-all-errors', 'true');
        console.log('🐛 All errors will now be shown. Refresh to apply.');
      },
      
      hideNonCriticalErrors: () => {
        localStorage.removeItem('show-all-errors');
        console.log('🔇 Non-critical errors will be suppressed. Refresh to apply.');
      },
      
      enableDebugMode: () => {
        localStorage.setItem('debug-mode', 'true');
        console.log('🐛 Debug mode enabled. Refresh to apply.');
      },
      
      disableDebugMode: () => {
        localStorage.removeItem('debug-mode');
        console.log('🔇 Debug mode disabled. Refresh to apply.');
      },
      
      skipMCP: () => {
        localStorage.setItem('skip-mcp', 'true');
        console.log('⏭️ MCP connection will be skipped. Refresh to apply.');
      },
      
      enableMCP: () => {
        localStorage.removeItem('skip-mcp');
        console.log('🔗 MCP connection enabled. Refresh to apply.');
      },
      
      setLogLevel: (level: 'error' | 'warn' | 'info' | 'debug') => {
        localStorage.setItem('log-level', level);
        console.log(`📝 Log level set to ${level}. Refresh to apply.`);
      },
      
      clearAllSettings: () => {
        localStorage.removeItem('show-all-errors');
        localStorage.removeItem('debug-mode');
        localStorage.removeItem('skip-mcp');
        localStorage.removeItem('log-level');
        console.log('🧹 All development settings cleared. Refresh to apply.');
      },
      
      showCurrentConfig: () => {
        console.log('⚙️ Current Development Configuration:', this.config);
      }
    };

    // Show available commands
    console.group('🛠️ Development Tools Available');
    console.log('devConfig.showAllErrors() - Show all errors including non-critical ones');
    console.log('devConfig.hideNonCriticalErrors() - Suppress non-critical errors (default)');
    console.log('devConfig.enableDebugMode() - Enable detailed debug logging');
    console.log('devConfig.disableDebugMode() - Disable debug logging');
    console.log('devConfig.skipMCP() - Skip MCP connection attempts');
    console.log('devConfig.enableMCP() - Enable MCP connection attempts');
    console.log('devConfig.setLogLevel(level) - Set log level (error/warn/info/debug)');
    console.log('devConfig.clearAllSettings() - Reset all development settings');
    console.log('devConfig.showCurrentConfig() - Show current configuration');
    console.groupEnd();

    // Apply console filtering based on log level
    this.setupConsoleFiltering();
  }

  private setupConsoleFiltering(): void {
    const originalWarn = console.warn;
    const originalInfo = console.info;
    const originalLog = console.log;
    
    if (this.config.logLevel === 'error') {
      // Only show errors
      console.warn = () => {};
      console.info = () => {};
      console.log = () => {};
    } else if (this.config.logLevel === 'warn') {
      // Show errors and warnings, but filter out noisy logs
      console.info = () => {};
      console.log = (...args) => {
        const message = args.join(' ');
        // Filter out noisy development messages
        if (message.includes('🔍 Health monitoring') || 
            message.includes('✅ Connection Manager') ||
            message.includes('🔄 Loading') ||
            message.includes('📦 Using cached')) {
          return;
        }
        originalLog(...args);
      };
    }
    
    // Store originals for restoration
    (console as any).originalWarn = originalWarn;
    (console as any).originalInfo = originalInfo;
    (console as any).originalLog = originalLog;
  }

  // Public getters
  shouldSuppressErrors(): boolean {
    return this.config.suppressErrors;
  }

  isMockDataEnabled(): boolean {
    return this.config.mockDataEnabled;
  }

  isDebugMode(): boolean {
    return this.config.debugMode;
  }

  shouldSkipMCP(): boolean {
    return this.config.skipMCPConnection;
  }

  getLogLevel(): string {
    return this.config.logLevel;
  }

  getConfig(): DevelopmentConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const devConfig = new DevelopmentConfigManager();

// Export utility functions
export const isDevelopment = () => import.meta.env.DEV;
export const isProduction = () => import.meta.env.PROD;
export const isTest = () => import.meta.env.MODE === 'test';

// Environment-specific console logging
export const devLog = {
  error: (...args: any[]) => {
    console.error(...args);
  },
  
  warn: (...args: any[]) => {
    if (devConfig.getLogLevel() !== 'error') {
      console.warn(...args);
    }
  },
  
  info: (...args: any[]) => {
    if (['info', 'debug'].includes(devConfig.getLogLevel())) {
      console.info(...args);
    }
  },
  
  debug: (...args: any[]) => {
    if (devConfig.getLogLevel() === 'debug') {
      console.log(...args);
    }
  }
};

// Performance monitoring for development
export const perfMonitor = {
  start: (label: string) => {
    if (isDevelopment()) {
      performance.mark(`${label}-start`);
    }
  },
  
  end: (label: string) => {
    if (isDevelopment()) {
      performance.mark(`${label}-end`);
      performance.measure(label, `${label}-start`, `${label}-end`);
      
      const measure = performance.getEntriesByName(label)[0];
      if (measure) {
        devLog.debug(`⏱️ ${label}: ${measure.duration.toFixed(2)}ms`);
      }
    }
  }
};