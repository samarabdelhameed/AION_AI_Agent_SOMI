/**
 * @fileoverview Jest Configuration for Mainnet Testing
 * @description Specialized Jest configuration for comprehensive mainnet testing
 * @author AION Team
 */

export default {
  // Test environment
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/tests/mainnet/**/*.test.js',
    '**/tests/mainnet/**/*.spec.js'
  ],
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/mainnet/setup.js'
  ],
  
  // Global setup and teardown
  globalSetup: '<rootDir>/tests/mainnet/setup.js',
  globalTeardown: '<rootDir>/tests/mainnet/setup.js',
  
  // Module settings for ES modules
  preset: 'es-jest',
  extensionsToTreatAsEsm: ['.js'],
  globals: {
    'ts-jest': {
      useESM: true
    }
  },
  transform: {
    '^.+\\.js$': ['babel-jest', { presets: [['@babel/preset-env', { targets: { node: 'current' } }]] }]
  },
  transformIgnorePatterns: [
    'node_modules/(?!(ethers)/)'
  ],
  
  // Test timeouts (longer for mainnet testing)
  testTimeout: 120000, // 2 minutes
  
  // Coverage settings
  collectCoverage: true,
  coverageDirectory: '<rootDir>/tests/mainnet/coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  collectCoverageFrom: [
    'services/**/*.js',
    'index.js',
    '!tests/**',
    '!node_modules/**'
  ],
  
  // Test execution settings
  maxWorkers: 1, // Run tests sequentially to avoid rate limiting
  verbose: true,
  detectOpenHandles: true,
  forceExit: true,
  
  // Reporter configuration
  reporters: [
    'default',
    ['jest-html-reporters', {
      publicPath: './tests/mainnet/reports',
      filename: 'mainnet-test-report.html',
      expand: true,
      hideIcon: false,
      pageTitle: 'AION MCP Agent - Mainnet Test Report'
    }]
  ],
  
  // Test result processor
  testResultsProcessor: '<rootDir>/tests/mainnet/utils/test-results-processor.js',
  
  // Module name mapping
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },
  
  // Test environment options
  testEnvironmentOptions: {
    NODE_ENV: 'mainnet-test'
  },
  
  // Retry configuration for flaky tests
  retry: 2,
  
  // Bail configuration
  bail: false, // Continue running tests even if some fail
  
  // Cache configuration
  cache: false, // Disable cache for mainnet testing to ensure fresh data
  
  // Watch mode configuration
  watchman: false,
  
  // Error handling
  errorOnDeprecated: true,
  
  // Custom test sequencer for ordered execution
  testSequencer: '<rootDir>/tests/mainnet/utils/test-sequencer.js'
};