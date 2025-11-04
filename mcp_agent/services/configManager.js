/**
 * @fileoverview Advanced Configuration Management System
 * @description Environment-specific configuration with validation, hot-reloading, and schema support
 */

import fs from 'fs/promises';
import path from 'path';
import { EventEmitter } from 'events';

export class ConfigManager extends EventEmitter {
  constructor(options = {}) {
    super();
    
    this.configDir = options.configDir || './config';
    this.environment = options.environment || process.env.NODE_ENV || 'development';
    this.enableHotReload = options.enableHotReload !== false;
    this.validateOnLoad = options.validateOnLoad !== false;
    
    this.config = new Map();
    this.schemas = new Map();
    this.watchers = new Map();
    this.loadedFiles = new Set();
    this.lastModified = new Map();
    
    // Default configuration
    this.defaults = {
      server: {
        port: 3000,
        host: 'localhost',
        timeout: 30000
      },
      database: {
        host: 'localhost',
        port: 5432,
        name: 'aion_mcp',
        pool: {
          min: 2,
          max: 10
        }
      },
      cache: {
        ttl: 300000, // 5 minutes
        maxSize: 1000
      },
      security: {
        jwtSecret: 'change-me-in-production',
        bcryptRounds: 12,
        rateLimitWindow: 60000,
        rateLimitMax: 100
      },
      logging: {
        level: 'info',
        format: 'json',
        file: './logs/app.log'
      }
    };
  }

  /**
   * Initialize configuration manager
   */
  async initialize() {
    try {
      // Load configuration files
      await this.loadConfigurations();
      
      // Setup hot reloading if enabled
      if (this.enableHotReload) {
        await this.setupHotReload();
      }
      
      // Validate all configurations
      if (this.validateOnLoad) {
        this.validateAll();
      }
      
      this.emit('initialized');
      
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Load all configuration files
   */
  async loadConfigurations() {
    const configFiles = [
      'default.json',
      `${this.environment}.json`,
      'local.json' // Local overrides (should be in .gitignore)
    ];

    for (const filename of configFiles) {
      await this.loadConfigFile(filename);
    }

    // Load environment variables
    this.loadEnvironmentVariables();
  }

  /**
   * Load a specific configuration file
   */
  async loadConfigFile(filename) {
    const filePath = path.join(this.configDir, filename);
    
    try {
      const stats = await fs.stat(filePath);
      const content = await fs.readFile(filePath, 'utf8');
      const config = JSON.parse(content);
      
      // Merge with existing configuration
      this.mergeConfig(config);
      
      // Track file for hot reloading
      this.loadedFiles.add(filePath);
      this.lastModified.set(filePath, stats.mtime);
      
      this.emit('config:loaded', { filename, config });
      
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw new Error(`Failed to load config file ${filename}: ${error.message}`);
      }
      // File doesn't exist, which is okay for optional files
    }
  }

  /**
   * Load environment variables with prefix
   */
  loadEnvironmentVariables() {
    const envPrefix = 'AION_';
    const envConfig = {};
    
    for (const [key, value] of Object.entries(process.env)) {
      if (key.startsWith(envPrefix)) {
        const configKey = key.substring(envPrefix.length).toLowerCase();
        const configPath = configKey.split('_');
        
        // Convert to nested object
        let current = envConfig;
        for (let i = 0; i < configPath.length - 1; i++) {
          if (!current[configPath[i]]) {
            current[configPath[i]] = {};
          }
          current = current[configPath[i]];
        }
        
        // Parse value (try JSON, then string)
        let parsedValue = value;
        try {
          parsedValue = JSON.parse(value);
        } catch {
          // Keep as string
        }
        
        current[configPath[configPath.length - 1]] = parsedValue;
      }
    }
    
    if (Object.keys(envConfig).length > 0) {
      this.mergeConfig(envConfig);
      this.emit('config:env-loaded', envConfig);
    }
  }

  /**
   * Merge configuration object
   */
  mergeConfig(newConfig) {
    this.deepMerge(this.defaults, newConfig);
    
    // Store in config map for easy access
    this.flattenConfig(newConfig, '', this.config);
  }

  /**
   * Deep merge two objects
   */
  deepMerge(target, source) {
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key]) target[key] = {};
        this.deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }

  /**
   * Flatten configuration for easy access
   */
  flattenConfig(obj, prefix, target) {
    for (const key in obj) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
        this.flattenConfig(obj[key], fullKey, target);
      } else {
        target.set(fullKey, obj[key]);
      }
    }
  }

  /**
   * Get configuration value
   */
  get(key, defaultValue = undefined) {
    // Try flattened config first
    if (this.config.has(key)) {
      return this.config.get(key);
    }
    
    // Try nested access
    const keys = key.split('.');
    let current = this.defaults;
    
    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k];
      } else {
        return defaultValue;
      }
    }
    
    return current !== undefined ? current : defaultValue;
  }

  /**
   * Set configuration value
   */
  set(key, value) {
    this.config.set(key, value);
    
    // Update nested object as well
    const keys = key.split('.');
    let current = this.defaults;
    
    for (let i = 0; i < keys.length - 1; i++) {
      if (!current[keys[i]]) {
        current[keys[i]] = {};
      }
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    
    this.emit('config:changed', { key, value, oldValue: this.config.get(key) });
  }

  /**
   * Check if configuration key exists
   */
  has(key) {
    return this.config.has(key) || this.getNestedValue(key) !== undefined;
  }

  /**
   * Get nested value helper
   */
  getNestedValue(key) {
    const keys = key.split('.');
    let current = this.defaults;
    
    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k];
      } else {
        return undefined;
      }
    }
    
    return current;
  }

  /**
   * Get all configuration as object
   */
  getAll() {
    return { ...this.defaults };
  }

  /**
   * Get configuration for specific section
   */
  getSection(section) {
    return this.get(section, {});
  }

  /**
   * Register configuration schema for validation
   */
  registerSchema(name, schema) {
    this.schemas.set(name, schema);
    return this;
  }

  /**
   * Validate configuration against schema
   */
  validate(name, config = null) {
    const schema = this.schemas.get(name);
    if (!schema) {
      throw new Error(`Schema '${name}' not found`);
    }
    
    const configToValidate = config || this.getSection(name);
    const errors = this.validateAgainstSchema(configToValidate, schema, name);
    
    if (errors.length > 0) {
      throw new Error(`Configuration validation failed for '${name}':\n${errors.join('\n')}`);
    }
    
    return true;
  }

  /**
   * Validate all registered schemas
   */
  validateAll() {
    const errors = [];
    
    for (const [name, schema] of this.schemas.entries()) {
      try {
        this.validate(name);
      } catch (error) {
        errors.push(error.message);
      }
    }
    
    if (errors.length > 0) {
      throw new Error(`Configuration validation failed:\n${errors.join('\n')}`);
    }
    
    return true;
  }

  /**
   * Validate against schema (basic implementation)
   */
  validateAgainstSchema(config, schema, path = '') {
    const errors = [];
    
    // Check required fields
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in config)) {
          errors.push(`Missing required field: ${path}.${field}`);
        }
      }
    }
    
    // Check field types and constraints
    if (schema.properties) {
      for (const [field, fieldSchema] of Object.entries(schema.properties)) {
        if (field in config) {
          const value = config[field];
          const fieldPath = path ? `${path}.${field}` : field;
          
          // Type validation
          if (fieldSchema.type) {
            const actualType = Array.isArray(value) ? 'array' : typeof value;
            if (actualType !== fieldSchema.type) {
              errors.push(`Invalid type for ${fieldPath}: expected ${fieldSchema.type}, got ${actualType}`);
            }
          }
          
          // Range validation for numbers
          if (fieldSchema.type === 'number') {
            if (fieldSchema.min !== undefined && value < fieldSchema.min) {
              errors.push(`Value for ${fieldPath} is below minimum: ${value} < ${fieldSchema.min}`);
            }
            if (fieldSchema.max !== undefined && value > fieldSchema.max) {
              errors.push(`Value for ${fieldPath} is above maximum: ${value} > ${fieldSchema.max}`);
            }
          }
          
          // String length validation
          if (fieldSchema.type === 'string') {
            if (fieldSchema.minLength !== undefined && value.length < fieldSchema.minLength) {
              errors.push(`String ${fieldPath} is too short: ${value.length} < ${fieldSchema.minLength}`);
            }
            if (fieldSchema.maxLength !== undefined && value.length > fieldSchema.maxLength) {
              errors.push(`String ${fieldPath} is too long: ${value.length} > ${fieldSchema.maxLength}`);
            }
          }
          
          // Enum validation
          if (fieldSchema.enum && !fieldSchema.enum.includes(value)) {
            errors.push(`Invalid value for ${fieldPath}: ${value} not in [${fieldSchema.enum.join(', ')}]`);
          }
          
          // Nested object validation
          if (fieldSchema.type === 'object' && fieldSchema.properties) {
            errors.push(...this.validateAgainstSchema(value, fieldSchema, fieldPath));
          }
        }
      }
    }
    
    return errors;
  }

  /**
   * Setup hot reloading for configuration files
   */
  async setupHotReload() {
    if (!this.enableHotReload) return;
    
    for (const filePath of this.loadedFiles) {
      try {
        const { watch } = await import('fs');
        
        const watcher = watch(filePath, async (eventType) => {
          if (eventType === 'change') {
            try {
              await this.reloadConfigFile(filePath);
            } catch (error) {
              this.emit('reload:error', { filePath, error });
            }
          }
        });
        
        this.watchers.set(filePath, watcher);
        
      } catch (error) {
        console.warn(`Failed to setup hot reload for ${filePath}:`, error.message);
      }
    }
  }

  /**
   * Reload a specific configuration file
   */
  async reloadConfigFile(filePath) {
    try {
      const stats = await fs.stat(filePath);
      const lastMod = this.lastModified.get(filePath);
      
      // Check if file actually changed
      if (lastMod && stats.mtime <= lastMod) {
        return;
      }
      
      const content = await fs.readFile(filePath, 'utf8');
      const config = JSON.parse(content);
      
      // Clear current config and reload
      this.config.clear();
      this.mergeConfig(config);
      
      // Update last modified time
      this.lastModified.set(filePath, stats.mtime);
      
      // Validate if enabled
      if (this.validateOnLoad) {
        this.validateAll();
      }
      
      this.emit('config:reloaded', { filePath, config });
      
    } catch (error) {
      throw new Error(`Failed to reload config file ${filePath}: ${error.message}`);
    }
  }

  /**
   * Save current configuration to file
   */
  async saveConfig(filename = `${this.environment}.json`) {
    const filePath = path.join(this.configDir, filename);
    const config = this.getAll();
    
    try {
      await fs.mkdir(this.configDir, { recursive: true });
      await fs.writeFile(filePath, JSON.stringify(config, null, 2));
      
      this.emit('config:saved', { filename, config });
      
    } catch (error) {
      throw new Error(`Failed to save config to ${filename}: ${error.message}`);
    }
  }

  /**
   * Get configuration statistics
   */
  getStats() {
    return {
      environment: this.environment,
      configDir: this.configDir,
      loadedFiles: Array.from(this.loadedFiles),
      totalKeys: this.config.size,
      schemas: Array.from(this.schemas.keys()),
      hotReloadEnabled: this.enableHotReload,
      watchedFiles: Array.from(this.watchers.keys())
    };
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    // Close file watchers
    for (const watcher of this.watchers.values()) {
      watcher.close();
    }
    
    this.watchers.clear();
    this.removeAllListeners();
  }
}

export default ConfigManager;