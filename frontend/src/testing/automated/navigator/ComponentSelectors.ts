/**
 * Centralized component selectors for dashboard testing
 * All test selectors are defined here for easy maintenance
 */

export const COMPONENT_SELECTORS = {
  // Main dashboard
  DASHBOARD: '[data-testid="dashboard"]',
  LOADING_SPINNER: '[data-testid="loading-spinner"]',
  ERROR_MESSAGE: '[data-testid="error-message"]',

  // Wallet Panel
  WALLET_PANEL: '[data-testid="wallet-panel"]',
  WALLET_BALANCE: '[data-testid="wallet-balance"]',
  WALLET_ADDRESS: '[data-testid="wallet-address"]',
  DEPOSIT_BUTTON: '[data-testid="deposit-button"]',
  WITHDRAW_BUTTON: '[data-testid="withdraw-button"]',
  CONNECT_WALLET_BUTTON: '[data-testid="connect-wallet"]',

  // Vault Performance
  VAULT_PERFORMANCE: '[data-testid="vault-performance"]',
  VAULT_APY: '[data-testid="vault-apy"]',
  VAULT_BALANCE: '[data-testid="vault-balance"]',
  PERFORMANCE_CHART: '[data-testid="performance-chart"]',
  VAULT_SHARES: '[data-testid="vault-shares"]',

  // Strategies Overview
  STRATEGIES_OVERVIEW: '[data-testid="strategies-overview"]',
  STRATEGY_VENUS: '[data-testid="strategy-venus"]',
  STRATEGY_BEEFY: '[data-testid="strategy-beefy"]',
  STRATEGY_PANCAKE: '[data-testid="strategy-pancake"]',
  STRATEGY_AAVE: '[data-testid="strategy-aave"]',
  STRATEGY_COMPARISON: '[data-testid="strategy-comparison"]',

  // Market Overview
  MARKET_OVERVIEW: '[data-testid="market-overview"]',
  BNB_PRICE: '[data-testid="bnb-price"]',
  MARKET_CAP: '[data-testid="market-cap"]',
  VOLUME: '[data-testid="volume"]',
  FEAR_GREED_INDEX: '[data-testid="fear-greed-index"]',

  // AI Agent Panel
  AI_AGENT_PANEL: '[data-testid="ai-agent-panel"]',
  AI_RECOMMENDATIONS: '[data-testid="ai-recommendations"]',
  AI_INSIGHTS: '[data-testid="ai-insights"]',
  AI_CHAT: '[data-testid="ai-chat"]',

  // Risk Management
  RISK_MANAGEMENT: '[data-testid="risk-management"]',
  RISK_SCORE: '[data-testid="risk-score"]',
  RISK_METRICS: '[data-testid="risk-metrics"]',
  RISK_ALERTS: '[data-testid="risk-alerts"]',

  // Action Buttons
  EXECUTE_BUTTON: '[data-testid="execute-button"]',
  REFRESH_BUTTON: '[data-testid="refresh-button"]',
  SIMULATE_BUTTON: '[data-testid="simulate-button"]',
  VIEW_ALL_BUTTON: '[data-testid="view-all-button"]',

  // Forms and Inputs
  DEPOSIT_AMOUNT_INPUT: '[data-testid="deposit-amount-input"]',
  WITHDRAW_AMOUNT_INPUT: '[data-testid="withdraw-amount-input"]',
  CONFIRM_DEPOSIT: '[data-testid="confirm-deposit"]',
  CONFIRM_WITHDRAW: '[data-testid="confirm-withdraw"]',

  // Modals and Overlays
  DEPOSIT_MODAL: '[data-testid="deposit-modal"]',
  WITHDRAW_MODAL: '[data-testid="withdraw-modal"]',
  TRANSACTION_MODAL: '[data-testid="transaction-modal"]',
  CONFIRMATION_MODAL: '[data-testid="confirmation-modal"]',

  // Navigation
  STRATEGIES_TAB: '[data-testid="strategies-tab"]',
  PORTFOLIO_TAB: '[data-testid="portfolio-tab"]',
  ANALYTICS_TAB: '[data-testid="analytics-tab"]',

  // Status Indicators
  SUCCESS_MESSAGE: '[data-testid="success-message"]',
  WARNING_MESSAGE: '[data-testid="warning-message"]',
  TRANSACTION_STATUS: '[data-testid="transaction-status"]',
  CONNECTION_STATUS: '[data-testid="connection-status"]'
};

export const BUTTON_SELECTORS = {
  DEPOSIT: COMPONENT_SELECTORS.DEPOSIT_BUTTON,
  WITHDRAW: COMPONENT_SELECTORS.WITHDRAW_BUTTON,
  EXECUTE: COMPONENT_SELECTORS.EXECUTE_BUTTON,
  REFRESH: COMPONENT_SELECTORS.REFRESH_BUTTON,
  SIMULATE: COMPONENT_SELECTORS.SIMULATE_BUTTON,
  VIEW_ALL: COMPONENT_SELECTORS.VIEW_ALL_BUTTON,
  CONNECT_WALLET: COMPONENT_SELECTORS.CONNECT_WALLET_BUTTON
};

export const FORM_SELECTORS = {
  DEPOSIT_AMOUNT: COMPONENT_SELECTORS.DEPOSIT_AMOUNT_INPUT,
  WITHDRAW_AMOUNT: COMPONENT_SELECTORS.WITHDRAW_AMOUNT_INPUT,
  CONFIRM_DEPOSIT: COMPONENT_SELECTORS.CONFIRM_DEPOSIT,
  CONFIRM_WITHDRAW: COMPONENT_SELECTORS.CONFIRM_WITHDRAW
};

export const PANEL_SELECTORS = {
  WALLET: COMPONENT_SELECTORS.WALLET_PANEL,
  VAULT_PERFORMANCE: COMPONENT_SELECTORS.VAULT_PERFORMANCE,
  STRATEGIES: COMPONENT_SELECTORS.STRATEGIES_OVERVIEW,
  MARKET: COMPONENT_SELECTORS.MARKET_OVERVIEW,
  AI_AGENT: COMPONENT_SELECTORS.AI_AGENT_PANEL,
  RISK_MANAGEMENT: COMPONENT_SELECTORS.RISK_MANAGEMENT
};

// Helper function to get strategy selector by name
export function getStrategySelector(strategyName: string): string {
  const strategyMap: Record<string, string> = {
    venus: COMPONENT_SELECTORS.STRATEGY_VENUS,
    beefy: COMPONENT_SELECTORS.STRATEGY_BEEFY,
    pancake: COMPONENT_SELECTORS.STRATEGY_PANCAKE,
    aave: COMPONENT_SELECTORS.STRATEGY_AAVE
  };
  
  return strategyMap[strategyName.toLowerCase()] || `[data-testid="strategy-${strategyName.toLowerCase()}"]`;
}

// Helper function to get performance selector for strategy
export function getStrategyPerformanceSelector(strategyName: string): string {
  return `[data-testid="strategy-${strategyName.toLowerCase()}-performance"]`;
}

// Helper function to get APY selector for strategy
export function getStrategyAPYSelector(strategyName: string): string {
  return `[data-testid="strategy-${strategyName.toLowerCase()}-apy"]`;
}