// Error Suppression and Graceful Degradation System
// This file handles non-critical errors that don't affect core functionality

import { devConfig, isDevelopment } from './developmentConfig';

interface ErrorSuppressionConfig {
  coinbaseAnalytics: boolean;
  mcpConnection: boolean;
  externalAPIs: boolean;
  developmentMode: boolean;
}

class ErrorSuppressionManager {
  private config: ErrorSuppressionConfig;
  private suppressedErrors: Set<string> = new Set();
  private errorCounts: Map<string, number> = new Map();

  constructor() {
    this.config = {
      coinbaseAnalytics: true, // Suppress Coinbase analytics errors
      mcpConnection: true, // Always suppress MCP connection errors in development
      externalAPIs: true, // Always suppress external API errors in development
      developmentMode: isDevelopment(),
    };

    this.initializeErrorSuppression();
  }

  private initializeErrorSuppression(): void {
    // Suppress Coinbase analytics errors
    if (this.config.coinbaseAnalytics) {
      this.suppressNetworkError('cca-lite.coinbase.com');
      this.suppressNetworkError('coinbase.com/metrics');
    }

    // Suppress MCP connection errors in development
    if (this.config.mcpConnection && this.config.developmentMode) {
      this.suppressNetworkError('localhost:3003');
      this.suppressConsoleMessage('MCP health check failed');
      this.suppressConsoleMessage('Circuit breaker opened');
      this.suppressConsoleMessage('ERR_CONNECTION_REFUSED');
    }

    // Suppress external API errors
    if (this.config.externalAPIs) {
      this.suppressNetworkError('api.oracle');
      this.suppressNetworkError('api.vault');
      this.suppressNetworkError('api.health');
    }

    console.log('🔇 Error suppression initialized for development');
  }

  private suppressNetworkError(urlPattern: string): void {
    // Override fetch to suppress specific network errors
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      try {
        return await originalFetch(...args);
      } catch (error) {
        const url = args[0]?.toString() || '';
        
        if (url.includes(urlPattern)) {
          // Suppress the error but log it once
          const errorKey = `network_${urlPattern}`;
          if (!this.suppressedErrors.has(errorKey)) {
            console.warn(`🔇 Suppressing network errors for: ${urlPattern}`);
            this.suppressedErrors.add(errorKey);
          }
          
          // Return a mock response for graceful degradation
          return new Response(JSON.stringify({ 
            error: 'Service unavailable',
            fallback: true 
          }), {
            status: 503,
            statusText: 'Service Unavailable'
          });
        }
        
        throw error;
      }
    };
  }

  private suppressConsoleMessage(messagePattern: string): void {
    // Override console methods to suppress specific messages
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    
    console.error = (...args) => {
      const message = args.join(' ');
      if (!message.includes(messagePattern)) {
        originalConsoleError(...args);
      } else {
        // Count suppressed errors
        const count = this.errorCounts.get(messagePattern) || 0;
        this.errorCounts.set(messagePattern, count + 1);
        
        // Log summary every 50 occurrences to reduce noise
        if (count % 50 === 0) {
          originalConsoleWarn(`🔇 Suppressed ${count + 1} instances of: ${messagePattern}`);
        }
      }
    };
    
    console.warn = (...args) => {
      const message = args.join(' ');
      if (!message.includes(messagePattern)) {
        originalConsoleWarn(...args);
      }
    };
  }

  // Public methods for manual error suppression
  suppressError(errorPattern: string): void {
    this.suppressedErrors.add(errorPattern);
  }

  unsuppressError(errorPattern: string): void {
    this.suppressedErrors.delete(errorPattern);
  }

  getSuppressionStats(): Record<string, number> {
    return Object.fromEntries(this.errorCounts);
  }

  // Graceful degradation helpers
  createMockResponse(data: any): Response {
    return new Response(JSON.stringify({
      ...data,
      _mock: true,
      _timestamp: new Date().toISOString()
    }), {
      status: 200,
      statusText: 'OK (Mock)',
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  // Check if service is available
  async isServiceAvailable(url: string, timeout = 5000): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Export singleton instance
export const errorSuppression = new ErrorSuppressionManager();

// Export utility functions
export const suppressCoinbaseErrors = () => {
  // Specifically suppress Coinbase analytics errors
  const originalFetch = window.fetch;
  
  window.fetch = async (...args) => {
    try {
      return await originalFetch(...args);
    } catch (error) {
      const url = args[0]?.toString() || '';
      
      if (url.includes('coinbase.com') || url.includes('cca-lite')) {
        // Return a mock successful response
        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          statusText: 'OK (Suppressed)'
        });
      }
      
      throw error;
    }
  };
};

export const suppressMCPErrors = () => {
  // Suppress MCP connection errors in development
  if (import.meta.env.DEV) {
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    
    console.error = (...args) => {
      const message = args.join(' ');
      if (!message.includes('localhost:3003') && 
          !message.includes('ERR_CONNECTION_REFUSED') &&
          !message.includes('MCP health check')) {
        originalConsoleError(...args);
      }
    };
    
    console.warn = (...args) => {
      const message = args.join(' ');
      if (!message.includes('localhost:3003') && 
          !message.includes('Circuit breaker') &&
          !message.includes('MCP health check')) {
        originalConsoleWarn(...args);
      }
    };
  }
};