// Automated Dashboard Testing System
// Entry point for the automated testing infrastructure

// Export interfaces first
export * from './interfaces';

// Export concrete implementations with specific names to avoid conflicts
export { TestOrchestrator } from './orchestrator';
export { UINavigator } from './navigator';
export { DataValidator } from './validator';
export { WorkflowSimulator } from './simulator';
export { PerformanceMonitor } from './monitor';

// Export configuration and utilities
export * from './config';
export * from './utils';
export * from './error-handling';
export * from './reporting';