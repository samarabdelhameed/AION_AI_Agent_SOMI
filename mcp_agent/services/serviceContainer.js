/**
 * @fileoverview Advanced Dependency Injection Container
 * @description Enterprise-grade service management with lifecycle hooks, scopes, and decorators
 */

class ServiceContainer {
  constructor() {
    this.services = new Map();
    this.singletons = new Map();
    this.transients = new Map();
    this.scopedInstances = new Map();
    this.dependencies = new Map();
    this.initialized = new Set();
    this.starting = new Set();
    this.decorators = new Map();
    this.interceptors = new Map();
    this.eventListeners = new Map();
    this.metrics = {
      creations: new Map(),
      resolutions: new Map(),
      errors: new Map()
    };
  }

  /**
   * Register a service with advanced options
   */
  register(name, factory, options = {}) {
    const serviceConfig = {
      name,
      factory,
      scope: options.scope || 'singleton', // singleton, transient, scoped
      dependencies: options.dependencies || [],
      lifecycle: options.lifecycle || {},
      decorators: options.decorators || [],
      interceptors: options.interceptors || [],
      tags: options.tags || [],
      metadata: options.metadata || {},
      lazy: options.lazy !== false, // Default to lazy loading
      initialized: false,
      createdAt: null,
      lastAccessed: null
    };

    // Validate scope
    if (!['singleton', 'transient', 'scoped'].includes(serviceConfig.scope)) {
      throw new Error(`Invalid scope '${serviceConfig.scope}' for service '${name}'`);
    }

    this.services.set(name, serviceConfig);
    this.dependencies.set(name, serviceConfig.dependencies);

    // Initialize metrics
    this.metrics.creations.set(name, 0);
    this.metrics.resolutions.set(name, 0);
    this.metrics.errors.set(name, 0);

    this.emit('service:registered', { name, config: serviceConfig });

    return this;
  }

  /**
   * Register a singleton service (shorthand)
   */
  singleton(name, factory, options = {}) {
    return this.register(name, factory, { ...options, scope: 'singleton' });
  }

  /**
   * Register a transient service (shorthand)
   */
  transient(name, factory, options = {}) {
    return this.register(name, factory, { ...options, scope: 'transient' });
  }

  /**
   * Register a scoped service (shorthand)
   */
  scoped(name, factory, options = {}) {
    return this.register(name, factory, { ...options, scope: 'scoped' });
  }

  /**
   * Get service instance with advanced resolution
   */
  async get(name, scope = null) {
    const serviceConfig = this.services.get(name);
    if (!serviceConfig) {
      throw new Error(`Service '${name}' not found. Available services: ${Array.from(this.services.keys()).join(', ')}`);
    }

    // Update metrics
    this.metrics.resolutions.set(name, this.metrics.resolutions.get(name) + 1);
    serviceConfig.lastAccessed = new Date();

    try {
      // Handle different scopes
      switch (serviceConfig.scope) {
        case 'singleton':
          return await this.getSingleton(name, serviceConfig);
        case 'transient':
          return await this.getTransient(name, serviceConfig);
        case 'scoped':
          return await this.getScoped(name, serviceConfig, scope);
        default:
          throw new Error(`Unknown scope '${serviceConfig.scope}' for service '${name}'`);
      }
    } catch (error) {
      this.metrics.errors.set(name, this.metrics.errors.get(name) + 1);
      this.emit('service:error', { name, error });
      throw error;
    }
  }

  /**
   * Get singleton instance
   */
  async getSingleton(name, serviceConfig) {
    if (this.singletons.has(name)) {
      return this.singletons.get(name);
    }

    const instance = await this.createServiceInstance(name, serviceConfig);
    this.singletons.set(name, instance);
    return instance;
  }

  /**
   * Get transient instance (always new)
   */
  async getTransient(name, serviceConfig) {
    return await this.createServiceInstance(name, serviceConfig);
  }

  /**
   * Get scoped instance
   */
  async getScoped(name, serviceConfig, scope) {
    const scopeKey = scope || 'default';
    const scopedKey = `${name}:${scopeKey}`;

    if (this.scopedInstances.has(scopedKey)) {
      return this.scopedInstances.get(scopedKey);
    }

    const instance = await this.createServiceInstance(name, serviceConfig);
    this.scopedInstances.set(scopedKey, instance);
    return instance;
  }

  /**
   * Create service instance with full lifecycle
   */
  async createServiceInstance(name, serviceConfig) {
    // Check for circular dependencies
    if (this.starting.has(name)) {
      throw new Error(`Circular dependency detected for service '${name}'. Chain: ${Array.from(this.starting).join(' -> ')} -> ${name}`);
    }

    this.starting.add(name);

    try {
      // Resolve dependencies first
      const dependencies = await this.resolveDependencies(serviceConfig.dependencies);

      // Create service instance
      const instance = await this.createInstance(serviceConfig, dependencies);

      // Apply decorators
      const decoratedInstance = await this.applyDecorators(instance, serviceConfig.decorators);

      // Apply interceptors
      const interceptedInstance = await this.applyInterceptors(decoratedInstance, serviceConfig.interceptors);

      // Update metrics
      this.metrics.creations.set(name, this.metrics.creations.get(name) + 1);
      serviceConfig.createdAt = new Date();

      // Mark as initialized
      this.initialized.add(name);
      serviceConfig.initialized = true;

      this.emit('service:created', { name, instance: interceptedInstance });

      return interceptedInstance;
    } finally {
      this.starting.delete(name);
    }
  }

  /**
   * Create service instance
   */
  async createInstance(serviceConfig, dependencies) {
    const { factory, lifecycle } = serviceConfig;

    // Call factory function
    const instance = typeof factory === 'function' 
      ? await factory(dependencies, this)
      : factory;

    // Call lifecycle hooks
    if (lifecycle.onInitialize && typeof lifecycle.onInitialize === 'function') {
      await lifecycle.onInitialize(instance, dependencies);
    }

    return instance;
  }

  /**
   * Resolve dependencies
   */
  async resolveDependencies(dependencyNames) {
    const dependencies = {};
    
    for (const depName of dependencyNames) {
      dependencies[depName] = await this.get(depName);
    }

    return dependencies;
  }

  /**
   * Apply decorators to service instance
   */
  async applyDecorators(instance, decoratorNames) {
    let decoratedInstance = instance;

    for (const decoratorName of decoratorNames) {
      const decorator = this.decorators.get(decoratorName);
      if (decorator && typeof decorator === 'function') {
        decoratedInstance = await decorator(decoratedInstance, this);
      }
    }

    return decoratedInstance;
  }

  /**
   * Apply interceptors to service instance
   */
  async applyInterceptors(instance, interceptorNames) {
    let interceptedInstance = instance;

    for (const interceptorName of interceptorNames) {
      const interceptor = this.interceptors.get(interceptorName);
      if (interceptor && typeof interceptor === 'function') {
        interceptedInstance = await interceptor(interceptedInstance, this);
      }
    }

    return interceptedInstance;
  }

  /**
   * Register a decorator
   */
  registerDecorator(name, decorator) {
    if (typeof decorator !== 'function') {
      throw new Error(`Decorator '${name}' must be a function`);
    }
    this.decorators.set(name, decorator);
    return this;
  }

  /**
   * Register an interceptor
   */
  registerInterceptor(name, interceptor) {
    if (typeof interceptor !== 'function') {
      throw new Error(`Interceptor '${name}' must be a function`);
    }
    this.interceptors.set(name, interceptor);
    return this;
  }

  /**
   * Start all services
   */
  async startAll() {
    const startOrder = this.getStartupOrder();
    
    for (const serviceName of startOrder) {
      const serviceConfig = this.services.get(serviceName);
      
      if (serviceConfig.lifecycle.onStart) {
        const instance = await this.get(serviceName);
        await serviceConfig.lifecycle.onStart(instance);
      }
    }
  }

  /**
   * Stop all services
   */
  async stopAll() {
    const stopOrder = this.getStartupOrder().reverse();
    
    for (const serviceName of stopOrder) {
      const serviceConfig = this.services.get(serviceName);
      
      if (serviceConfig.lifecycle.onStop && this.singletons.has(serviceName)) {
        const instance = this.singletons.get(serviceName);
        await serviceConfig.lifecycle.onStop(instance);
      }
    }

    // Clear all instances
    this.singletons.clear();
    this.initialized.clear();
  }

  /**
   * Get startup order based on dependencies
   */
  getStartupOrder() {
    const visited = new Set();
    const visiting = new Set();
    const order = [];

    const visit = (serviceName) => {
      if (visited.has(serviceName)) return;
      if (visiting.has(serviceName)) {
        throw new Error(`Circular dependency detected involving '${serviceName}'`);
      }

      visiting.add(serviceName);

      const deps = this.dependencies.get(serviceName) || [];
      for (const dep of deps) {
        visit(dep);
      }

      visiting.delete(serviceName);
      visited.add(serviceName);
      order.push(serviceName);
    };

    for (const serviceName of this.services.keys()) {
      visit(serviceName);
    }

    return order;
  }

  /**
   * Check if service exists
   */
  has(name) {
    return this.services.has(name);
  }

  /**
   * Check if service is initialized
   */
  isInitialized(name) {
    return this.initialized.has(name);
  }

  /**
   * Get service health status
   */
  async getHealthStatus() {
    const status = {
      totalServices: this.services.size,
      initializedServices: this.initialized.size,
      services: {}
    };

    for (const [name, config] of this.services.entries()) {
      status.services[name] = {
        initialized: this.initialized.has(name),
        singleton: config.singleton,
        dependencies: config.dependencies
      };

      // Check if service has health check
      if (this.singletons.has(name)) {
        const instance = this.singletons.get(name);
        if (instance && typeof instance.isHealthy === 'function') {
          try {
            status.services[name].healthy = await instance.isHealthy();
          } catch (error) {
            status.services[name].healthy = false;
            status.services[name].healthError = error.message;
          }
        }
      }
    }

    return status;
  }

  /**
   * Validate dependencies
   */
  validateDependencies() {
    const errors = [];

    for (const [serviceName, deps] of this.dependencies.entries()) {
      for (const dep of deps) {
        if (!this.services.has(dep)) {
          errors.push(`Service '${serviceName}' depends on '${dep}' which is not registered`);
        }
      }
    }

    if (errors.length > 0) {
      throw new Error(`Dependency validation failed:\n${errors.join('\n')}`);
    }
  }

  /**
   * Get service configuration
   */
  getServiceConfig(name) {
    return this.services.get(name);
  }

  /**
   * List all registered services
   */
  listServices() {
    return Array.from(this.services.keys());
  }

  /**
   * Event system
   */
  on(event, listener) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(listener);
    return this;
  }

  emit(event, data) {
    const listeners = this.eventListeners.get(event) || [];
    for (const listener of listeners) {
      try {
        listener(data);
      } catch (error) {
        console.error(`Event listener error for '${event}':`, error);
      }
    }
  }

  /**
   * Find services by tag
   */
  findByTag(tag) {
    const services = [];
    for (const [name, config] of this.services.entries()) {
      if (config.tags.includes(tag)) {
        services.push(name);
      }
    }
    return services;
  }

  /**
   * Get all services implementing an interface
   */
  async getAllByInterface(interfaceName) {
    const services = this.findByTag(`implements:${interfaceName}`);
    const instances = [];
    
    for (const serviceName of services) {
      instances.push(await this.get(serviceName));
    }
    
    return instances;
  }

  /**
   * Create child container (scoped)
   */
  createScope(scopeName = 'default') {
    const childContainer = new ServiceContainer();
    
    // Copy service definitions
    for (const [name, config] of this.services.entries()) {
      childContainer.services.set(name, { ...config });
      childContainer.dependencies.set(name, [...config.dependencies]);
    }
    
    // Copy decorators and interceptors
    for (const [name, decorator] of this.decorators.entries()) {
      childContainer.decorators.set(name, decorator);
    }
    
    for (const [name, interceptor] of this.interceptors.entries()) {
      childContainer.interceptors.set(name, interceptor);
    }
    
    return childContainer;
  }

  /**
   * Get container metrics
   */
  getMetrics() {
    const totalServices = this.services.size;
    const initializedServices = this.initialized.size;
    const singletonInstances = this.singletons.size;
    const scopedInstances = this.scopedInstances.size;

    return {
      totalServices,
      initializedServices,
      singletonInstances,
      scopedInstances,
      initializationRate: totalServices > 0 ? (initializedServices / totalServices) * 100 : 0,
      creations: Object.fromEntries(this.metrics.creations),
      resolutions: Object.fromEntries(this.metrics.resolutions),
      errors: Object.fromEntries(this.metrics.errors),
      memoryUsage: {
        singletons: this.singletons.size,
        scoped: this.scopedInstances.size,
        transients: 0 // Transients are not stored
      }
    };
  }

  /**
   * Dispose scoped instances
   */
  async disposeScope(scopeName = 'default') {
    const scopedKeys = Array.from(this.scopedInstances.keys()).filter(key => 
      key.endsWith(`:${scopeName}`)
    );

    for (const key of scopedKeys) {
      const instance = this.scopedInstances.get(key);
      const serviceName = key.split(':')[0];
      const serviceConfig = this.services.get(serviceName);

      // Call dispose lifecycle hook
      if (serviceConfig?.lifecycle?.onDispose && typeof serviceConfig.lifecycle.onDispose === 'function') {
        try {
          await serviceConfig.lifecycle.onDispose(instance);
        } catch (error) {
          console.error(`Error disposing service '${serviceName}':`, error);
        }
      }

      this.scopedInstances.delete(key);
    }
  }

  /**
   * Validate container configuration
   */
  validate() {
    const errors = [];

    // Check for missing dependencies
    for (const [serviceName, deps] of this.dependencies.entries()) {
      for (const dep of deps) {
        if (!this.services.has(dep)) {
          errors.push(`Service '${serviceName}' depends on '${dep}' which is not registered`);
        }
      }
    }

    // Check for circular dependencies
    try {
      this.getStartupOrder();
    } catch (error) {
      errors.push(error.message);
    }

    // Check decorator references
    for (const [serviceName, config] of this.services.entries()) {
      for (const decoratorName of config.decorators) {
        if (!this.decorators.has(decoratorName)) {
          errors.push(`Service '${serviceName}' references decorator '${decoratorName}' which is not registered`);
        }
      }
    }

    // Check interceptor references
    for (const [serviceName, config] of this.services.entries()) {
      for (const interceptorName of config.interceptors) {
        if (!this.interceptors.has(interceptorName)) {
          errors.push(`Service '${serviceName}' references interceptor '${interceptorName}' which is not registered`);
        }
      }
    }

    if (errors.length > 0) {
      throw new Error(`Container validation failed:\n${errors.join('\n')}`);
    }

    return true;
  }

  /**
   * Clear all services (for testing)
   */
  clear() {
    this.services.clear();
    this.singletons.clear();
    this.transients.clear();
    this.scopedInstances.clear();
    this.dependencies.clear();
    this.initialized.clear();
    this.starting.clear();
    this.decorators.clear();
    this.interceptors.clear();
    this.eventListeners.clear();
    
    // Reset metrics
    this.metrics.creations.clear();
    this.metrics.resolutions.clear();
    this.metrics.errors.clear();
  }
}

export default ServiceContainer;