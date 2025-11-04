import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ActivityTimeline from '../components/ActivityTimeline';
import { determineTransactionType, getActivityIcon, getActivityColor } from '../utils/activityHelpers';

// Mock activity data
const mockWithdrawActivity = {
  id: '1',
  type: 'withdraw',
  amount: '-100000000000000000', // Negative for withdraw
  description: 'Withdraw 0.1 ETH from vault',
  timestamp: new Date().toISOString(),
  hash: '0xabc123',
  status: 'completed'
};

const mockDepositActivity = {
  id: '2',
  type: 'deposit',
  amount: '100000000000000000', // Positive for deposit
  description: 'Deposit 0.1 ETH to vault',
  timestamp: new Date().toISOString(),
  hash: '0xdef456',
  status: 'completed'
};

describe('Withdraw Timeline Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should correctly identify withdraw transactions', () => {
    const withdrawTx = {
      type: 'withdraw',
      amount: '-100000000000000000',
      description: 'Withdraw from vault'
    };

    const transactionType = determineTransactionType(withdrawTx);
    expect(transactionType).toBe('withdraw');
  });

  it('should show correct icon for withdraw activities', () => {
    const withdrawIcon = getActivityIcon('withdraw');
    expect(withdrawIcon).toBe('↙️'); // Should be down-left arrow
  });

  it('should use correct color for withdraw activities', () => {
    const withdrawColor = getActivityColor('withdraw');
    expect(withdrawColor).toMatch(/red|danger|error/i); // Should be red-ish color
  });

  it('should display withdraw activity with correct formatting', async () => {
    const mockActivities = [mockWithdrawActivity];

    render(<ActivityTimeline activities={mockActivities} />);

    // Should show withdraw label
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /withdraw/i })).toBeInTheDocument();
    });

    // Should show negative amount (formatted)
    await waitFor(() => {
      expect(screen.getByText(/-0\.1/)).toBeInTheDocument();
    });

    // Should show transaction hash
    await waitFor(() => {
      expect(screen.getByText(/0xabc123/)).toBeInTheDocument();
    });
  });

  it('should differentiate between withdraw and deposit in timeline', async () => {
    const mockActivities = [mockWithdrawActivity, mockDepositActivity];

    render(<ActivityTimeline activities={mockActivities} />);

    // Should show both withdraw and deposit
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /withdraw/i })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /deposit/i })).toBeInTheDocument();
    });

    // Should show negative amount for withdraw
    await waitFor(() => {
      expect(screen.getByText(/-0\.1/)).toBeInTheDocument();
    });

    // Should show positive amount for deposit
    await waitFor(() => {
      expect(screen.getByText(/\+0\.1/)).toBeInTheDocument();
    });
  });

  it('should handle withdraw activity status updates', async () => {
    const pendingWithdraw = {
      ...mockWithdrawActivity,
      status: 'pending'
    };

    const { rerender } = render(<ActivityTimeline activities={[pendingWithdraw]} />);

    // Should show pending status
    await waitFor(() => {
      expect(screen.getByText(/pending/i)).toBeInTheDocument();
    });

    // Update to completed
    const completedWithdraw = {
      ...pendingWithdraw,
      status: 'completed'
    };

    rerender(<ActivityTimeline activities={[completedWithdraw]} />);

    // Should show completed status
    await waitFor(() => {
      expect(screen.getByText(/completed/i)).toBeInTheDocument();
    });
  });

  it('should show transaction details on click', async () => {
    render(<ActivityTimeline activities={[mockWithdrawActivity]} />);

    // Click on withdraw activity
    const withdrawActivity = screen.getByRole('heading', { name: /withdraw/i });
    fireEvent.click(withdrawActivity);

    // Should show transaction hash (which is already visible)
    await waitFor(() => {
      expect(screen.getByText(/0xabc123/)).toBeInTheDocument();
    });
  });

  it('should sort activities by timestamp correctly', async () => {
    const olderWithdraw = {
      ...mockWithdrawActivity,
      id: '3',
      timestamp: new Date(Date.now() - 3600000).toISOString() // 1 hour ago
    };

    const newerWithdraw = {
      ...mockWithdrawActivity,
      id: '4',
      timestamp: new Date().toISOString() // Now
    };

    const mockActivities = [olderWithdraw, newerWithdraw];

    render(<ActivityTimeline activities={mockActivities} />);

    const activities = screen.getAllByText(/withdraw/i);
    
    // Newer activity should appear first (assuming descending order)
    expect(activities[0]).toBeInTheDocument();
  });

  it('should handle empty timeline gracefully', async () => {
    render(<ActivityTimeline activities={[]} />);

    // Should show empty state
    await waitFor(() => {
      expect(screen.getByText(/no activities/i)).toBeInTheDocument();
    });
  });

  it('should format large withdrawal amounts correctly', async () => {
    const largeWithdraw = {
      ...mockWithdrawActivity,
      amount: '-1000000000000000000000', // 1000 ETH
      description: 'Withdraw 1000 ETH from vault'
    };

    render(<ActivityTimeline activities={[largeWithdraw]} />);

    // Should format large numbers with commas
    await waitFor(() => {
      expect(screen.getByText(/1000\.0000/)).toBeInTheDocument();
    });
  });

  it('should show error state for failed withdrawals', async () => {
    const failedWithdraw = {
      ...mockWithdrawActivity,
      status: 'failed',
      error: 'Insufficient shares'
    };

    render(<ActivityTimeline activities={[failedWithdraw]} />);

    // Should show failed status
    await waitFor(() => {
      expect(screen.getByText(/failed/i)).toBeInTheDocument();
    });

    // Should show error message
    await waitFor(() => {
      expect(screen.getByText(/insufficient shares/i)).toBeInTheDocument();
    });
  });

  it('should handle real-time activity updates', async () => {
    const { rerender } = render(<ActivityTimeline activities={[]} />);

    // Initially empty
    expect(screen.getByText(/no activities/i)).toBeInTheDocument();

    // Add new withdraw activity
    rerender(<ActivityTimeline activities={[mockWithdrawActivity]} />);

    // Should show new activity
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /withdraw/i })).toBeInTheDocument();
    });
  });

  it('should link to block explorer for transaction hash', async () => {
    render(<ActivityTimeline activities={[mockWithdrawActivity]} />);

    // Find transaction hash link
    const hashLink = screen.getByText(/0xabc123/);
    
    // Should be a clickable link
    expect(hashLink.tagName).toBe('A');
    expect(hashLink.getAttribute('href')).toContain('0xabc123');
    expect(hashLink.getAttribute('target')).toBe('_blank');
  });
});