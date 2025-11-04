// Application Initializer with Error Suppression
import { errorSuppression, suppressCoinbaseErrors, suppressMCPErrors } from './errorSuppression';
import { connectionManager } from './connectionManager';
import { fallbackSystem } from './fallbackSystem';

interface InitializationResult {
  success: boolean;
  services: {
    mcp: 'available' | 'unavailable' | 'degraded';
    web3: 'available' | 'unavailable';
    analytics: 'available' | 'suppressed';
  };
  mode: 'full' | 'degraded' | 'offline';
  warnings: string[];
}

class AppInitializer {
  private initialized = false;
  private initResult: InitializationResult | null = null;

  async initialize(): Promise<InitializationResult> {
    if (this.initialized && this.initResult) {
      return this.initResult;
    }

    console.log('🚀 Initializing AION DeFi Platform...');

    const warnings: string[] = [];
    const services = {
      mcp: 'unavailable' as const,
      web3: 'available' as const, // Web3 is always available via RPC
      analytics: 'suppressed' as const,
    };

    // 1. Initialize error suppression first
    this.initializeErrorSuppression();

    // 2. Check MCP service availability
    try {
      await connectionManager.initialize();
      if (connectionManager.isHealthy()) {
        services.mcp = 'available';
        console.log('✅ MCP service is available');
      } else if (connectionManager.isDegraded()) {
        services.mcp = 'degraded';
        warnings.push('MCP service is degraded - using fallback data');
      } else {
        services.mcp = 'unavailable';
        warnings.push('MCP service is unavailable - using mock data');
      }
    } catch (error) {
      services.mcp = 'unavailable';
      warnings.push('MCP service initialization failed - using mock data');
    }

    // 3. Determine application mode
    let mode: 'full' | 'degraded' | 'offline' = 'full';
    
    if (services.mcp === 'unavailable') {
      mode = 'degraded';
      console.log('🟡 Running in degraded mode - some features may be limited');
    } else if (services.mcp === 'degraded') {
      mode = 'degraded';
      console.log('🟡 Running in degraded mode - using cached/fallback data');
    } else {
      console.log('🟢 Running in full mode - all services available');
    }

    // 4. Initialize fallback systems
    this.initializeFallbackSystems(mode);

    // 5. Show user-friendly status
    this.showInitializationStatus(mode, warnings);

    this.initResult = {
      success: true,
      services,
      mode,
      warnings,
    };

    this.initialized = true;
    return this.initResult;
  }

  private initializeErrorSuppression(): void {
    // Suppress Coinbase analytics errors
    suppressCoinbaseErrors();
    
    // Suppress MCP connection errors in development
    if (import.meta.env.DEV) {
      suppressMCPErrors();
      console.log('🔇 Development mode: Suppressing non-critical errors');
    }

    // Add global error handler for unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason;
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      
      // Suppress known non-critical errors
      if (this.isNonCriticalError(errorMessage)) {
        event.preventDefault(); // Prevent console error
        return;
      }
      
      // Log critical errors
      console.error('Unhandled promise rejection:', error);
    });

    // Add global error handler for JavaScript errors
    window.addEventListener('error', (event) => {
      const errorMessage = event.message || event.error?.message || 'Unknown error';
      
      if (this.isNonCriticalError(errorMessage)) {
        event.preventDefault(); // Prevent console error
        return;
      }
    });
  }

  private isNonCriticalError(errorMessage: string): boolean {
    const nonCriticalPatterns = [
      'coinbase.com',
      'cca-lite',
      'localhost:3003',
      'ERR_CONNECTION_REFUSED',
      'MCP health check',
      'Circuit breaker',
      'Failed to fetch',
      'NetworkError',
      'net::ERR_ABORTED 401'
    ];

    return nonCriticalPatterns.some(pattern => 
      errorMessage.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  private initializeFallbackSystems(mode: 'full' | 'degraded' | 'offline'): void {
    if (mode !== 'full') {
      // Pre-populate fallback cache with mock data
      fallbackSystem.cacheData('marketSnapshot', 
        fallbackSystem.getMarketSnapshot('bscTestnet'), 
        300000, // 5 minutes TTL
        'mock'
      );
      
      fallbackSystem.cacheData('vaultStats', 
        fallbackSystem.getVaultStats(), 
        300000,
        'mock'
      );

      console.log('🛡️ Fallback systems initialized');
    }
  }

  private showInitializationStatus(mode: 'full' | 'degraded' | 'offline', warnings: string[]): void {
    // Create a subtle notification for users
    const statusElement = document.createElement('div');
    statusElement.id = 'app-status-indicator';
    statusElement.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 10000;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 500;
      color: white;
      opacity: 0.9;
      transition: opacity 0.3s ease;
      pointer-events: none;
    `;

    if (mode === 'full') {
      statusElement.style.backgroundColor = '#10b981'; // Green
      statusElement.textContent = '🟢 All systems operational';
      
      // Auto-hide after 3 seconds
      setTimeout(() => {
        statusElement.style.opacity = '0';
        setTimeout(() => statusElement.remove(), 300);
      }, 3000);
    } else if (mode === 'degraded') {
      statusElement.style.backgroundColor = '#f59e0b'; // Yellow
      statusElement.textContent = '🟡 Limited mode - some data may be cached';
      
      // Auto-hide after 5 seconds
      setTimeout(() => {
        statusElement.style.opacity = '0';
        setTimeout(() => statusElement.remove(), 300);
      }, 5000);
    } else {
      statusElement.style.backgroundColor = '#ef4444'; // Red
      statusElement.textContent = '🔴 Offline mode - using cached data only';
    }

    document.body.appendChild(statusElement);

    // Add debug info to console
    if (warnings.length > 0) {
      console.group('⚠️ Initialization Warnings');
      warnings.forEach(warning => console.warn(warning));
      console.groupEnd();
    }

    // Add debug helper
    if (import.meta.env.DEV) {
      (window as any).debugMCP = () => {
        localStorage.setItem('debug-mcp', 'true');
        console.log('🐛 MCP debugging enabled. Refresh to see detailed logs.');
      };
      
      (window as any).disableDebugMCP = () => {
        localStorage.removeItem('debug-mcp');
        console.log('🔇 MCP debugging disabled.');
      };
      
      console.log('💡 Development helpers available: debugMCP(), disableDebugMCP()');
    }
  }

  // Public getters
  getInitializationResult(): InitializationResult | null {
    return this.initResult;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  getMode(): 'full' | 'degraded' | 'offline' | 'unknown' {
    return this.initResult?.mode || 'unknown';
  }

  // Reinitialize if needed
  async reinitialize(): Promise<InitializationResult> {
    this.initialized = false;
    this.initResult = null;
    return this.initialize();
  }
}

// Export singleton instance
export const appInitializer = new AppInitializer();

// Auto-initialize when module is imported
if (typeof window !== 'undefined') {
  // Initialize after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      appInitializer.initialize();
    });
  } else {
    // DOM is already ready
    setTimeout(() => appInitializer.initialize(), 0);
  }
}