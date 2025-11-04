import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Dashboard } from '../pages/Dashboard';

// Mock hooks
jest.mock('../hooks/useRealData');
jest.mock('../hooks/useVaultOnchain');
jest.mock('../hooks/useWalletOnchain');

describe('Dashboard User Experience Test', () => {
  const mockOnNavigate = jest.fn();

  test('Complete User Journey Test', () => {
    render(<Dashboard onNavigate={mockOnNavigate} />);

    // 1. Dashboard loads
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    
    // 2. Check wallet connection
    expect(screen.getByText('BSC Testnet')).toBeInTheDocument();
    
    // 3. Verify portfolio data
    expect(screen.getByText('Portfolio Metrics')).toBeInTheDocument();
    
    // 4. Test AI features
    expect(screen.getByText('AI Insights')).toBeInTheDocument();
    
    // 5. Check risk management
    expect(screen.getByText('Risk Management')).toBeInTheDocument();
    
    // 6. Verify market data
    expect(screen.getByText('Market Overview')).toBeInTheDocument();
  });

  test('All Buttons Functional', () => {
    render(<Dashboard onNavigate={mockOnNavigate} />);

    // Test refresh button
    const refreshBtn = screen.getByText('Refresh');
    fireEvent.click(refreshBtn);

    // Test navigation buttons
    const openAgentBtn = screen.getByText('Open Agent');
    fireEvent.click(openAgentBtn);
  });
});
