// Environment configuration with validation
interface AppConfig {
  mcpUrl: string;
  environment: 'development' | 'production';
  walletConnectProjectId: string;
  bscTestnetRpc: string;
  bscMainnetRpc: string;
}

class ConfigManager {
  private config: AppConfig;

  constructor() {
    this.config = this.loadConfig();
    this.validateConfig();
  }

  private loadConfig(): AppConfig {
    // Load environment variables with proper fallbacks
    const mcpUrl = import.meta.env.VITE_MCP_URL || 
                   import.meta.env.MCP_URL || 
                   'http://localhost:3003';
    
    const environment = (import.meta.env.VITE_ENVIRONMENT || 
                        import.meta.env.NODE_ENV || 
                        'development') as 'development' | 'production';
    
    const walletConnectProjectId = import.meta.env.VITE_WALLET_CONNECT_PROJECT_ID || 
                                  import.meta.env.WALLET_CONNECT_PROJECT_ID || 
                                  '';
    
    const bscTestnetRpc = import.meta.env.VITE_BSC_TEST_RPC || 
                         import.meta.env.BSC_TEST_RPC || 
                         'https://data-seed-prebsc-1-s1.binance.org:8545/';
    
    const bscMainnetRpc = import.meta.env.VITE_BSC_MAIN_RPC || 
                         import.meta.env.BSC_MAIN_RPC || 
                         'https://bsc-dataseed.binance.org/';

    return {
      mcpUrl,
      environment,
      walletConnectProjectId,
      bscTestnetRpc,
      bscMainnetRpc,
    };
  }

  private validateConfig(): void {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate MCP URL
    if (!this.config.mcpUrl) {
      errors.push('VITE_MCP_URL is required');
    } else {
      try {
        const url = new URL(this.config.mcpUrl);
        
        // Check if using correct port for MCP Agent
        if (url.hostname === 'localhost' && url.port !== '3003') {
          warnings.push(`MCP URL port is ${url.port}, expected 3003 for MCP Agent`);
        }
        
        // Validate protocol
        if (!['http:', 'https:'].includes(url.protocol)) {
          errors.push('VITE_MCP_URL must use http or https protocol');
        }
      } catch {
        errors.push('VITE_MCP_URL must be a valid URL');
      }
    }

    // Validate WalletConnect Project ID for production
    if (this.config.environment === 'production' && !this.config.walletConnectProjectId) {
      warnings.push('VITE_WALLET_CONNECT_PROJECT_ID is recommended for production');
    }

    // Validate RPC URLs
    if (this.config.bscTestnetRpc) {
      try {
        new URL(this.config.bscTestnetRpc);
      } catch {
        warnings.push('VITE_BSC_TEST_RPC should be a valid URL');
      }
    }

    // Log warnings
    if (warnings.length > 0) {
      console.warn('Configuration warnings:', warnings);
    }

    // Throw on errors
    if (errors.length > 0) {
      console.error('Configuration errors:', errors);
      throw new Error(`Configuration validation failed: ${errors.join(', ')}`);
    }

    console.log('✅ Configuration validated successfully:', {
      mcpUrl: this.config.mcpUrl,
      environment: this.config.environment,
      hasWalletConnect: !!this.config.walletConnectProjectId,
      bscTestnetRpc: this.config.bscTestnetRpc
    });
  }

  getConfig(): AppConfig {
    return { ...this.config };
  }

  getMcpUrl(): string {
    return this.config.mcpUrl;
  }

  getEnvironment(): 'development' | 'production' {
    return this.config.environment;
  }

  isDevelopment(): boolean {
    return this.config.environment === 'development';
  }

  isProduction(): boolean {
    return this.config.environment === 'production';
  }

  // Validate configuration on startup
  static validateOnStartup(): void {
    try {
      const manager = new ConfigManager();
      console.log('🔧 Configuration validation completed successfully');
    } catch (error) {
      console.error('❌ Configuration validation failed:', error);
      throw error;
    }
  }

  // Get configuration summary for debugging
  getConfigSummary(): Record<string, any> {
    return {
      mcpUrl: this.config.mcpUrl,
      environment: this.config.environment,
      hasWalletConnect: !!this.config.walletConnectProjectId,
      bscTestnetRpc: this.config.bscTestnetRpc ? 'configured' : 'default',
      bscMainnetRpc: this.config.bscMainnetRpc ? 'configured' : 'default',
    };
  }
}

// Export singleton instance
export const configManager = new ConfigManager();
export const config = configManager.getConfig();