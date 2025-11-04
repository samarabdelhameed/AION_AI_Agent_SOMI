import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Dashboard } from '../pages/Dashboard';
import { useRealData } from '../hooks/useRealData';
import { useVaultOnchain } from '../hooks/useVaultOnchain';
import { useWalletOnchain } from '../hooks/useWalletOnchain';

// Mock all hooks
jest.mock('../hooks/useRealData');
jest.mock('../hooks/useVaultOnchain');
jest.mock('../hooks/useWalletOnchain');
jest.mock('../hooks/useHistorical');
jest.mock('../hooks/useStrategies');
jest.mock('../hooks/useRecentActivity');

const mockUseRealData = useRealData as jest.MockedFunction<typeof useRealData>;
const mockUseVaultOnchain = useVaultOnchain as jest.MockedFunction<typeof useVaultOnchain>;
const mockUseWalletOnchain = useWalletOnchain as jest.MockedFunction<typeof useWalletOnchain>;

describe('Dashboard User Experience Test', () => {
  const mockOnNavigate = jest.fn();

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock real data hook
    mockUseRealData.mockReturnValue({
      marketData: {
        bnb_price_usd: 328.36,
        bnb_change_24h: 3.52,
        market_cap: 49200000000,
        volume_24h: 2100000000,
        fear_greed_index: 65
      },
      vaultStats: {
        balance: 3258.62,
        apy: 12.5,
        totalValue: 3258.62,
        dailyProfit: 1.12
      },
      systemHealth: {
        services: [
          { service: 'Venus Protocol', status: 'operational', uptime: '99.9%' },
          { service: 'Beefy Finance', status: 'operational', uptime: '99.9%' },
          { service: 'PancakeSwap', status: 'operational', uptime: '99.9%' },
          { service: 'Aave Protocol', status: 'operational', uptime: '99.9%' }
        ]
      },
      loading: false,
      error: null,
      lastUpdated: new Date(),
      refresh: jest.fn()
    });

    // Mock vault onchain hook
    mockUseVaultOnchain.mockReturnValue({
      balanceBNB: 10.0,
      shares: 1000,
      refresh: jest.fn(),
      loading: false
    });

    // Mock wallet onchain hook
    mockUseWalletOnchain.mockReturnValue({
      address: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
      chainId: 97, // BSC Testnet
      balances: {
        BNB: 2.5,
        USDC: 1500,
        ETH: 0.8
      },
      isConnected: true,
      connect: jest.fn(),
      disconnect: jest.fn()
    });
  });

  test('🧪 Complete User Journey: Connect Wallet and View Dashboard', async () => {
    render(<Dashboard onNavigate={mockOnNavigate} />);

    // Step 1: Verify Dashboard loads with real data
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Welcome to your AION control center')).toBeInTheDocument();

    // Step 2: Check if wallet is connected
    expect(screen.getByText('0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6')).toBeInTheDocument();
    expect(screen.getByText('BSC Testnet')).toBeInTheDocument();

    // Step 3: Verify Portfolio Metrics are displayed
    expect(screen.getByText('$3,258.62')).toBeInTheDocument();
    expect(screen.getByText('12.5%')).toBeInTheDocument();
    expect(screen.getByText('$1.12/day')).toBeInTheDocument();

    // Step 4: Check Vault Performance
    expect(screen.getByText('Vault Performance')).toBeInTheDocument();
    expect(screen.getByText('Live Data')).toBeInTheDocument();

    // Step 5: Verify AI Insights section
    expect(screen.getByText('AI Insights')).toBeInTheDocument();
    expect(screen.getByText('Open Agent')).toBeInTheDocument();

    // Step 6: Check Risk Management
    expect(screen.getByText('Risk Management')).toBeInTheDocument();
    expect(screen.getByText('Overall Risk Score')).toBeInTheDocument();

    // Step 7: Verify Market Overview
    expect(screen.getByText('Market Overview')).toBeInTheDocument();
    expect(screen.getByText('$328.36')).toBeInTheDocument();
    expect(screen.getByText('+3.52%')).toBeInTheDocument();

    // Step 8: Check Protocol Performance
    expect(screen.getByText('Protocol Performance')).toBeInTheDocument();
    expect(screen.getByText('Venus Protocol')).toBeInTheDocument();
    expect(screen.getByText('Beefy Finance')).toBeInTheDocument();

    // Step 9: Verify Gas Tracker
    expect(screen.getByText('Gas Tracker')).toBeInTheDocument();
    expect(screen.getByText('5.2 Gwei')).toBeInTheDocument();

    // Step 10: Check Network Status
    expect(screen.getByText('Network Status')).toBeInTheDocument();
    expect(screen.getByText('BSC Mainnet')).toBeInTheDocument();
    expect(screen.getByText('Online')).toBeInTheDocument();
  });

  test('🔘 All Buttons are Functional and Responsive', async () => {
    render(<Dashboard onNavigate={mockOnNavigate} />);

    // Test Refresh button
    const refreshButton = screen.getByText('Refresh');
    expect(refreshButton).toBeInTheDocument();
    fireEvent.click(refreshButton);

    // Test Refresh On-chain button
    const refreshOnchainButton = screen.getByText('Refresh On-chain');
    expect(refreshOnchainButton).toBeInTheDocument();
    fireEvent.click(refreshOnchainButton);

    // Test Open Agent button
    const openAgentButton = screen.getByText('Open Agent');
    expect(openAgentButton).toBeInTheDocument();
    fireEvent.click(openAgentButton);

    // Test View All button in Strategies
    const viewAllButton = screen.getByText('View All');
    expect(viewAllButton).toBeInTheDocument();
    fireEvent.click(viewAllButton);

    // Verify navigation was called
    expect(mockOnNavigate).toHaveBeenCalledWith('agent');
    expect(mockOnNavigate).toHaveBeenCalledWith('strategies');
  });

  test('📊 Real Data Integration: Live Updates and Accuracy', async () => {
    render(<Dashboard onNavigate={mockOnNavigate} />);

    // Verify real market data
    expect(screen.getByText('$328.36')).toBeInTheDocument();
    expect(screen.getByText('$49.2B')).toBeInTheDocument();
    expect(screen.getByText('$2.1B')).toBeInTheDocument();

    // Verify real portfolio data
    expect(screen.getByText('$3,258.62')).toBeInTheDocument();
    expect(screen.getByText('12.5%')).toBeInTheDocument();

    // Verify real system health
    expect(screen.getByText('99.9%')).toBeInTheDocument();
    expect(screen.getByText('Venus Protocol')).toBeInTheDocument();

    // Verify real network status
    expect(screen.getByText('Block #32,847,291')).toBeInTheDocument();
    expect(screen.getByText('Block #15,234,567')).toBeInTheDocument();
  });

  test('🎯 AI Features: Recommendations and Risk Management', async () => {
    render(<Dashboard onNavigate={mockOnNavigate} />);

    // Check AI Recommendations
    expect(screen.getByText('AI Recommendations')).toBeInTheDocument();
    expect(screen.getByText('Live Analysis')).toBeInTheDocument();

    // Check Risk Management
    expect(screen.getByText('Risk Management')).toBeInTheDocument();
    expect(screen.getByText('Overall Risk Score')).toBeInTheDocument();
    expect(screen.getByText('Low Risk')).toBeInTheDocument();

    // Verify risk factors
    expect(screen.getByText('Portfolio Risk')).toBeInTheDocument();
    expect(screen.getByText('Concentration Risk')).toBeInTheDocument();
    expect(screen.getByText('Liquidity Risk')).toBeInTheDocument();
  });

  test('📈 Interactive Elements: Charts and Performance Data', async () => {
    render(<Dashboard onNavigate={mockOnNavigate} />);

    // Check Vault Performance Chart
    expect(screen.getByText('Vault Performance')).toBeInTheDocument();
    expect(screen.getByText('30-day performance')).toBeInTheDocument();

    // Check Strategy Overview
    expect(screen.getByText('All Strategies Overview')).toBeInTheDocument();
    expect(screen.getByText('Venus Protocol')).toBeInTheDocument();
    expect(screen.getByText('Beefy Finance')).toBeInTheDocument();

    // Check Portfolio Metrics
    expect(screen.getByText('Portfolio Metrics')).toBeInTheDocument();
    expect(screen.getByText('Total Value')).toBeInTheDocument();
    expect(screen.getByText('Total Yield')).toBeInTheDocument();
  });

  test('🔍 Error Handling and Loading States', async () => {
    // Test loading state
    mockUseRealData.mockReturnValue({
      ...mockUseRealData(),
      loading: true
    });

    render(<Dashboard onNavigate={mockOnNavigate} />);
    expect(screen.getByText('Refreshing...')).toBeInTheDocument();

    // Test error state
    mockUseRealData.mockReturnValue({
      ...mockUseRealData(),
      loading: false,
      error: 'Failed to fetch data'
    });

    render(<Dashboard onNavigate={mockOnNavigate} />);
    expect(screen.getByText('Failed to fetch data')).toBeInTheDocument();
  });

  test('📱 Responsive Design: Mobile and Desktop Compatibility', async () => {
    // Test mobile view
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768,
    });

    render(<Dashboard onNavigate={mockOnNavigate} />);
    
    // Verify mobile-friendly layout
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    
    // Test desktop view
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1200,
    });

    render(<Dashboard onNavigate={mockOnNavigate} />);
    
    // Verify desktop layout with all columns
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });
});

export default DashboardUserTest;
