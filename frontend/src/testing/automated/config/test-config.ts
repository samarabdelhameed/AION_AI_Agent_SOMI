/**
 * Test configuration for automated dashboard testing
 * Defines test suites, components, and validation rules
 */

import { 
  TestConfiguration, 
  DashboardComponent, 
  UserWorkflow, 
  ValidationRule,
  PerformanceThreshold 
} from '../interfaces';

// Dashboard components to test
export const DASHBOARD_COMPONENTS: DashboardComponent[] = [
  {
    name: 'Wallet Panel',
    selector: '[data-testid="wallet-panel"]',
    type: 'panel',
    expectedElements: [
      '[data-testid="wallet-balance"]',
      '[data-testid="wallet-address"]',
      '[data-testid="deposit-button"]',
      '[data-testid="withdraw-button"]'
    ],
    interactions: [
      { type: 'click', selector: '[data-testid="deposit-button"]', expectedBehavior: 'Opens deposit modal' },
      { type: 'click', selector: '[data-testid="withdraw-button"]', expectedBehavior: 'Opens withdraw modal' }
    ]
  },
  {
    name: 'Vault Performance',
    selector: '[data-testid="vault-performance"]',
    type: 'panel',
    expectedElements: [
      '[data-testid="vault-apy"]',
      '[data-testid="performance-chart"]',
      '[data-testid="vault-balance"]'
    ],
    interactions: [
      { type: 'hover', selector: '[data-testid="performance-chart"]', expectedBehavior: 'Shows tooltip with data' }
    ]
  },
  {
    name: 'Strategies Overview',
    selector: '[data-testid="strategies-overview"]',
    type: 'panel',
    expectedElements: [
      '[data-testid="strategy-venus"]',
      '[data-testid="strategy-beefy"]',
      '[data-testid="strategy-pancake"]',
      '[data-testid="strategy-aave"]'
    ],
    interactions: [
      { type: 'click', selector: '[data-testid="strategy-venus"]', expectedBehavior: 'Shows Venus strategy details' }
    ]
  },
  {
    name: 'Market Overview',
    selector: '[data-testid="market-overview"]',
    type: 'panel',
    expectedElements: [
      '[data-testid="bnb-price"]',
      '[data-testid="market-cap"]',
      '[data-testid="volume"]',
      '[data-testid="fear-greed-index"]'
    ],
    interactions: [
      { type: 'click', selector: '[data-testid="refresh-market-data"]', expectedBehavior: 'Refreshes market data' }
    ]
  },
  {
    name: 'AI Agent Panel',
    selector: '[data-testid="ai-agent-panel"]',
    type: 'panel',
    expectedElements: [
      '[data-testid="ai-recommendations"]',
      '[data-testid="ai-insights"]',
      '[data-testid="ai-chat"]'
    ],
    interactions: [
      { type: 'click', selector: '[data-testid="ai-chat"]', expectedBehavior: 'Opens AI chat interface' }
    ]
  },
  {
    name: 'Risk Management',
    selector: '[data-testid="risk-management"]',
    type: 'panel',
    expectedElements: [
      '[data-testid="risk-score"]',
      '[data-testid="risk-metrics"]',
      '[data-testid="risk-alerts"]'
    ],
    interactions: [
      { type: 'hover', selector: '[data-testid="risk-score"]', expectedBehavior: 'Shows risk breakdown' }
    ]
  }
];

// User workflows to test
export const USER_WORKFLOWS: UserWorkflow[] = [
  {
    name: 'Deposit Flow',
    steps: [
      {
        name: 'navigate_to_deposit',
        action: 'click',
        selector: '[data-testid="deposit-button"]',
        expectedResult: 'Deposit modal opens',
        timeout: 5000
      },
      {
        name: 'enter_amount',
        action: 'type',
        selector: '[data-testid="deposit-amount-input"]',
        expectedResult: 'Amount entered successfully',
        timeout: 3000
      },
      {
        name: 'confirm_deposit',
        action: 'click',
        selector: '[data-testid="confirm-deposit"]',
        expectedResult: 'Transaction initiated',
        timeout: 30000
      }
    ],
    expectedOutcome: 'Deposit completed successfully',
    validationRules: [
      { field: 'balance', rule: 'increased', tolerance: 0.01 },
      { field: 'transaction_status', rule: 'equals', expectedValue: 'success' }
    ]
  },
  {
    name: 'Strategy Selection Flow',
    steps: [
      {
        name: 'navigate_to_strategies',
        action: 'click',
        selector: '[data-testid="strategies-tab"]',
        expectedResult: 'Strategies page loads',
        timeout: 5000
      },
      {
        name: 'compare_strategies',
        action: 'hover',
        selector: '[data-testid="strategy-comparison"]',
        expectedResult: 'Strategy comparison data visible',
        timeout: 3000
      },
      {
        name: 'select_strategy',
        action: 'click',
        selector: '[data-testid="select-venus-strategy"]',
        expectedResult: 'Strategy selected',
        timeout: 5000
      }
    ],
    expectedOutcome: 'Strategy selected and allocated',
    validationRules: [
      { field: 'selected_strategy', rule: 'not_empty' },
      { field: 'allocation_percentage', rule: 'greater_than', expectedValue: 0 }
    ]
  }
];

// Validation rules for data accuracy
export const VALIDATION_RULES: ValidationRule[] = [
  { field: 'apy', rule: 'range', expectedValue: { min: 0, max: 1000 } },
  { field: 'balance', rule: 'format', expectedValue: 'decimal' },
  { field: 'price', rule: 'positive_number' },
  { field: 'timestamp', rule: 'recent', tolerance: 300000 } // 5 minutes
];

// Performance thresholds
export const PERFORMANCE_THRESHOLDS: PerformanceThreshold[] = [
  { metric: 'page_load', threshold: 3000, severity: 'medium' },
  { metric: 'api_response', threshold: 2000, severity: 'high' },
  { metric: 'component_render', threshold: 1000, severity: 'low' },
  { metric: 'memory_usage', threshold: 100 * 1024 * 1024, severity: 'medium' } // 100MB
];

// Main test configuration
export const TEST_CONFIG: TestConfiguration = {
  testSuites: [
    {
      name: 'Dashboard Components',
      components: DASHBOARD_COMPONENTS,
      workflows: [],
      validationRules: VALIDATION_RULES,
      performanceThresholds: PERFORMANCE_THRESHOLDS
    },
    {
      name: 'User Workflows',
      components: [],
      workflows: USER_WORKFLOWS,
      validationRules: VALIDATION_RULES,
      performanceThresholds: PERFORMANCE_THRESHOLDS
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
    exportFormats: ['html', 'json', 'pdf']
  },
  environmentSettings: {
    baseUrl: 'http://localhost:5173',
    timeout: 30000,
    retries: 2,
    parallel: true
  }
};

// Test configuration interface
export interface TestConfiguration {
  testSuites: TestSuite[];
  schedulingOptions: SchedulingOptions;
  validationThresholds: ValidationThresholds;
  reportingSettings: ReportingSettings;
  environmentSettings: EnvironmentSettings;
}

export interface TestSuite {
  name: string;
  components: DashboardComponent[];
  workflows: UserWorkflow[];
  validationRules: ValidationRule[];
  performanceThresholds: PerformanceThreshold[];
}

export interface SchedulingOptions {
  interval: number;
  enabled: boolean;
  triggers: string[];
}

export interface ValidationThresholds {
  dataAccuracy: number;
  performanceScore: number;
  workflowSuccess: number;
}

export interface ReportingSettings {
  generateScreenshots: boolean;
  includePerformanceMetrics: boolean;
  exportFormats: string[];
}

export interface EnvironmentSettings {
  baseUrl: string;
  timeout: number;
  retries: number;
  parallel: boolean;
}

export interface PerformanceThreshold {
  metric: string;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

// Test data selectors
export const TEST_SELECTORS = {
  // Wallet components
  WALLET_PANEL: '[data-testid="wallet-panel"]',
  WALLET_BALANCE: '[data-testid="wallet-balance"]',
  WALLET_ADDRESS: '[data-testid="wallet-address"]',
  DEPOSIT_BUTTON: '[data-testid="deposit-button"]',
  WITHDRAW_BUTTON: '[data-testid="withdraw-button"]',
  
  // Vault components
  VAULT_PERFORMANCE: '[data-testid="vault-performance"]',
  VAULT_APY: '[data-testid="vault-apy"]',
  VAULT_BALANCE: '[data-testid="vault-balance"]',
  PERFORMANCE_CHART: '[data-testid="performance-chart"]',
  
  // Strategy components
  STRATEGIES_OVERVIEW: '[data-testid="strategies-overview"]',
  STRATEGY_VENUS: '[data-testid="strategy-venus"]',
  STRATEGY_BEEFY: '[data-testid="strategy-beefy"]',
  STRATEGY_PANCAKE: '[data-testid="strategy-pancake"]',
  STRATEGY_AAVE: '[data-testid="strategy-aave"]',
  
  // Market components
  MARKET_OVERVIEW: '[data-testid="market-overview"]',
  BNB_PRICE: '[data-testid="bnb-price"]',
  MARKET_CAP: '[data-testid="market-cap"]',
  VOLUME: '[data-testid="volume"]',
  FEAR_GREED_INDEX: '[data-testid="fear-greed-index"]',
  
  // AI components
  AI_AGENT_PANEL: '[data-testid="ai-agent-panel"]',
  AI_RECOMMENDATIONS: '[data-testid="ai-recommendations"]',
  AI_INSIGHTS: '[data-testid="ai-insights"]',
  AI_CHAT: '[data-testid="ai-chat"]',
  
  // Risk management
  RISK_MANAGEMENT: '[data-testid="risk-management"]',
  RISK_SCORE: '[data-testid="risk-score"]',
  RISK_METRICS: '[data-testid="risk-metrics"]',
  RISK_ALERTS: '[data-testid="risk-alerts"]',
  
  // Common elements
  LOADING_SPINNER: '[data-testid="loading-spinner"]',
  ERROR_MESSAGE: '[data-testid="error-message"]',
  SUCCESS_MESSAGE: '[data-testid="success-message"]',
  REFRESH_BUTTON: '[data-testid="refresh-button"]'
};