import { TestConfiguration, TestSuite, SchedulingOptions } from './test-config';

/**
 * Configuration management system for automated testing
 * Handles loading, validation, and updating of test configurations
 */
export class ConfigurationManager {
  private config: TestConfiguration;
  private configPath: string;
  private watchers: ((config: TestConfiguration) => void)[] = [];

  constructor(initialConfig?: TestConfiguration) {
    this.config = initialConfig || this.getDefaultConfiguration();
    this.configPath = './test-config.json';
  }

  /**
   * Load configuration from file or use default
   */
  async loadConfiguration(configPath?: string): Promise<TestConfiguration> {
    if (configPath) {
      this.configPath = configPath;
    }

    try {
      // In a real implementation, this would load from file
      // For now, use the default configuration
      console.log(`📁 Loading configuration from ${this.configPath}`);
      
      // Validate loaded configuration
      const isValid = await this.validateConfiguration(this.config);
      if (!isValid) {
        console.warn('⚠️ Configuration validation failed, using default configuration');
        this.config = this.getDefaultConfiguration();
      }

      console.log('✅ Configuration loaded successfully');
      return this.config;
    } catch (error) {
      console.error('❌ Failed to load configuration:', error);
      console.log('🔄 Using default configuration');
      this.config = this.getDefaultConfiguration();
      return this.config;
    }
  }

  /**
   * Save current configuration to file
   */
  async saveConfiguration(configPath?: string): Promise<void> {
    const path = configPath || this.configPath;
    
    try {
      console.log(`💾 Saving configuration to ${path}`);
      
      // In a real implementation, this would save to file
      // For now, just validate and log
      const isValid = await this.validateConfiguration(this.config);
      if (!isValid) {
        throw new Error('Cannot save invalid configuration');
      }

      console.log('✅ Configuration saved successfully');
    } catch (error) {
      console.error('❌ Failed to save configuration:', error);
      throw error;
    }
  }

  /**
   * Get current configuration
   */
  getConfiguration(): TestConfiguration {
    return { ...this.config };
  }

  /**
   * Update configuration with partial updates
   */
  updateConfiguration(updates: Partial<TestConfiguration>): void {
    console.log('🔧 Updating configuration...');
    
    this.config = {
      ...this.config,
      ...updates
    };

    // Notify watchers
    this.notifyWatchers();
    
    console.log('✅ Configuration updated successfully');
  }

  /**
   * Update specific test suite
   */
  updateTestSuite(suiteName: string, updates: Partial<TestSuite>): void {
    console.log(`🔧 Updating test suite: ${suiteName}`);
    
    const suiteIndex = this.config.testSuites.findIndex(suite => suite.name === suiteName);
    if (suiteIndex === -1) {
      throw new Error(`Test suite not found: ${suiteName}`);
    }

    this.config.testSuites[suiteIndex] = {
      ...this.config.testSuites[suiteIndex],
      ...updates
    };

    this.notifyWatchers();
    console.log('✅ Test suite updated successfully');
  }

  /**
   * Update scheduling options
   */
  updateSchedulingOptions(options: Partial<SchedulingOptions>): void {
    console.log('🔧 Updating scheduling options...');
    
    this.config.schedulingOptions = {
      ...this.config.schedulingOptions,
      ...options
    };

    this.notifyWatchers();
    console.log('✅ Scheduling options updated successfully');
  }

  /**
   * Validate configuration structure and values
   */
  async validateConfiguration(config: TestConfiguration): Promise<boolean> {
    try {
      console.log('🔍 Validating configuration...');

      // Check required fields
      if (!config.testSuites || !Array.isArray(config.testSuites)) {
        console.error('❌ Invalid configuration: testSuites must be an array');
        return false;
      }

      if (!config.environmentSettings) {
        console.error('❌ Invalid configuration: environmentSettings is required');
        return false;
      }

      if (!config.validationThresholds) {
        console.error('❌ Invalid configuration: validationThresholds is required');
        return false;
      }

      // Validate environment settings
      const env = config.environmentSettings;
      if (!env.baseUrl || typeof env.baseUrl !== 'string') {
        console.error('❌ Invalid configuration: baseUrl is required and must be a string');
        return false;
      }

      if (!env.timeout || env.timeout <= 0) {
        console.error('❌ Invalid configuration: timeout must be a positive number');
        return false;
      }

      if (env.retries < 0) {
        console.error('❌ Invalid configuration: retries cannot be negative');
        return false;
      }

      // Validate validation thresholds
      const thresholds = config.validationThresholds;
      if (thresholds.dataAccuracy < 0 || thresholds.dataAccuracy > 100) {
        console.error('❌ Invalid configuration: dataAccuracy must be between 0 and 100');
        return false;
      }

      if (thresholds.performanceScore < 0 || thresholds.performanceScore > 100) {
        console.error('❌ Invalid configuration: performanceScore must be between 0 and 100');
        return false;
      }

      if (thresholds.workflowSuccess < 0 || thresholds.workflowSuccess > 100) {
        console.error('❌ Invalid configuration: workflowSuccess must be between 0 and 100');
        return false;
      }

      // Validate test suites
      for (const suite of config.testSuites) {
        if (!suite.name || typeof suite.name !== 'string') {
          console.error('❌ Invalid configuration: test suite name is required');
          return false;
        }

        if (!Array.isArray(suite.components)) {
          console.error('❌ Invalid configuration: test suite components must be an array');
          return false;
        }

        if (!Array.isArray(suite.workflows)) {
          console.error('❌ Invalid configuration: test suite workflows must be an array');
          return false;
        }
      }

      // Validate scheduling options
      if (config.schedulingOptions) {
        const scheduling = config.schedulingOptions;
        if (scheduling.interval && scheduling.interval <= 0) {
          console.error('❌ Invalid configuration: scheduling interval must be positive');
          return false;
        }
      }

      console.log('✅ Configuration validation passed');
      return true;
    } catch (error) {
      console.error('❌ Configuration validation error:', error);
      return false;
    }
  }

  /**
   * Reset configuration to defaults
   */
  resetToDefaults(): void {
    console.log('🔄 Resetting configuration to defaults...');
    this.config = this.getDefaultConfiguration();
    this.notifyWatchers();
    console.log('✅ Configuration reset to defaults');
  }

  /**
   * Add configuration change watcher
   */
  addConfigurationWatcher(callback: (config: TestConfiguration) => void): void {
    this.watchers.push(callback);
  }

  /**
   * Remove configuration change watcher
   */
  removeConfigurationWatcher(callback: (config: TestConfiguration) => void): void {
    const index = this.watchers.indexOf(callback);
    if (index > -1) {
      this.watchers.splice(index, 1);
    }
  }

  /**
   * Get configuration summary for display
   */
  getConfigurationSummary(): any {
    return {
      testSuites: this.config.testSuites.length,
      components: this.config.testSuites.reduce((sum, suite) => sum + suite.components.length, 0),
      workflows: this.config.testSuites.reduce((sum, suite) => sum + suite.workflows.length, 0),
      schedulingEnabled: this.config.schedulingOptions.enabled,
      schedulingInterval: this.config.schedulingOptions.interval,
      baseUrl: this.config.environmentSettings.baseUrl,
      timeout: this.config.environmentSettings.timeout,
      retries: this.config.environmentSettings.retries,
      thresholds: this.config.validationThresholds
    };
  }

  /**
   * Export configuration as JSON
   */
  exportConfiguration(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Import configuration from JSON
   */
  async importConfiguration(configJson: string): Promise<void> {
    try {
      console.log('📥 Importing configuration from JSON...');
      
      const importedConfig = JSON.parse(configJson);
      
      // Validate imported configuration
      const isValid = await this.validateConfiguration(importedConfig);
      if (!isValid) {
        throw new Error('Imported configuration is invalid');
      }

      this.config = importedConfig;
      this.notifyWatchers();
      
      console.log('✅ Configuration imported successfully');
    } catch (error) {
      console.error('❌ Failed to import configuration:', error);
      throw error;
    }
  }

  /**
   * Get default configuration
   */
  private getDefaultConfiguration(): TestConfiguration {
    return {
      testSuites: [
        {
          name: 'Dashboard Components',
          components: [],
          workflows: [],
          validationRules: [],
          performanceThresholds: [
            { metric: 'page_load', threshold: 3000, severity: 'medium' },
            { metric: 'api_response', threshold: 2000, severity: 'high' },
            { metric: 'component_render', threshold: 1000, severity: 'low' }
          ]
        }
      ],
      schedulingOptions: {
        interval: 3600000, // 1 hour
        enabled: false,
        triggers: ['code_change', 'deployment']
      },
      validationThresholds: {
        dataAccuracy: 95,
        performanceScore: 80,
        workflowSuccess: 90
      },
      reportingSettings: {
        generateScreenshots: true,
        includePerformanceMetrics: true,
        exportFormats: ['html', 'json']
      },
      environmentSettings: {
        baseUrl: 'http://localhost:5173',
        timeout: 30000,
        retries: 2,
        parallel: true
      }
    };
  }

  /**
   * Notify all watchers of configuration changes
   */
  private notifyWatchers(): void {
    this.watchers.forEach(callback => {
      try {
        callback(this.config);
      } catch (error) {
        console.error('❌ Error in configuration watcher:', error);
      }
    });
  }
}