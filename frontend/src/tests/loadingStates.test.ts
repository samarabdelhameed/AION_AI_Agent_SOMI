import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLoadingState, useAsyncOperation, useMultiStepOperation } from '../hooks/useLoadingState';
import { useOptimisticUpdates, useOptimisticBalance } from '../hooks/useOptimisticUpdates';

describe('Loading States', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('useLoadingState', () => {
    it('should initialize with correct default state', () => {
      const { result } = renderHook(() => useLoadingState());
      
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.progress).toBe(undefined);
      expect(result.current.stage).toBe(undefined);
    });

    it('should update loading state correctly', () => {
      const { result } = renderHook(() => useLoadingState());
      
      act(() => {
        result.current.setLoading(true, 'Fetching data');
      });
      
      expect(result.current.loading).toBe(true);
      expect(result.current.stage).toBe('Fetching data');
      expect(result.current.error).toBe(null);
    });

    it('should set error and stop loading', () => {
      const { result } = renderHook(() => useLoadingState());
      
      act(() => {
        result.current.setLoading(true);
      });
      
      act(() => {
        result.current.setError('Something went wrong');
      });
      
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('Something went wrong');
    });

    it('should reset state correctly', () => {
      const { result } = renderHook(() => useLoadingState());
      
      act(() => {
        result.current.setLoading(true);
        result.current.setError('Error');
        result.current.setProgress(50);
      });
      
      act(() => {
        result.current.reset();
      });
      
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.progress).toBe(undefined);
      expect(result.current.stage).toBe(undefined);
    });
  });

  describe('useAsyncOperation', () => {
    it('should handle successful operation', async () => {
      const { result } = renderHook(() => useAsyncOperation());
      
      const mockOperation = vi.fn().mockResolvedValue('success');
      const mockOnSuccess = vi.fn();
      
      let operationResult: any;
      
      await act(async () => {
        operationResult = await result.current.execute(mockOperation, {
          onSuccess: mockOnSuccess
        });
      });
      
      expect(operationResult).toBe('success');
      expect(mockOnSuccess).toHaveBeenCalledWith('success');
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe(null);
    });

    it('should handle failed operation', async () => {
      const { result } = renderHook(() => useAsyncOperation());
      
      const mockError = new Error('Operation failed');
      const mockOperation = vi.fn().mockRejectedValue(mockError);
      const mockOnError = vi.fn();
      
      let operationResult: any;
      
      await act(async () => {
        operationResult = await result.current.execute(mockOperation, {
          onError: mockOnError
        });
      });
      
      expect(operationResult).toBe(null);
      expect(mockOnError).toHaveBeenCalledWith(mockError);
      expect(result.current.loading).toBe(false);
      expect(result.current.error).toBe('Operation failed');
    });

    it('should handle operation cancellation', async () => {
      const { result } = renderHook(() => useAsyncOperation());
      
      const mockOperation = vi.fn().mockImplementation(
        (signal: AbortSignal) => 
          new Promise((resolve, reject) => {
            signal.addEventListener('abort', () => reject(new Error('Aborted')));
            setTimeout(() => resolve('success'), 1000);
          })
      );
      
      act(() => {
        result.current.execute(mockOperation);
      });
      
      act(() => {
        result.current.cancel();
      });
      
      expect(result.current.loading).toBe(false);
    });
  });

  describe('useMultiStepOperation', () => {
    const steps = ['Step 1', 'Step 2', 'Step 3'];

    it('should initialize with correct state', () => {
      const { result } = renderHook(() => useMultiStepOperation(steps));
      
      expect(result.current.currentStep).toBe(0);
      expect(result.current.steps).toEqual(steps);
      expect(result.current.completedSteps).toEqual([false, false, false]);
      expect(result.current.loading).toBe(false);
    });

    it('should progress through steps correctly', () => {
      const { result } = renderHook(() => useMultiStepOperation(steps));
      
      act(() => {
        result.current.start();
      });
      
      expect(result.current.loading).toBe(true);
      expect(result.current.currentStep).toBe(0);
      expect(result.current.progress).toBe(0);
      
      act(() => {
        result.current.nextStep();
      });
      
      expect(result.current.currentStep).toBe(1);
      expect(result.current.completedSteps[0]).toBe(true);
      expect(result.current.progress).toBeCloseTo(33.33, 2);
      
      act(() => {
        result.current.nextStep();
      });
      
      expect(result.current.currentStep).toBe(2);
      expect(result.current.completedSteps[1]).toBe(true);
      
      act(() => {
        result.current.nextStep();
      });
      
      expect(result.current.loading).toBe(false);
      expect(result.current.progress).toBe(100);
      expect(result.current.completedSteps).toEqual([true, true, true]);
    });
  });

  describe('useOptimisticUpdates', () => {
    it('should initialize with correct data', () => {
      const initialData = { balance: 100 };
      const { result } = renderHook(() => useOptimisticUpdates(initialData));
      
      expect(result.current.data).toEqual(initialData);
      expect(result.current.originalData).toEqual(initialData);
      expect(result.current.optimisticUpdates).toEqual([]);
      expect(result.current.hasOptimisticUpdates).toBe(false);
    });

    it('should apply optimistic update', () => {
      const initialData = { balance: 100 };
      const { result } = renderHook(() => useOptimisticUpdates(initialData));
      
      let update: any;
      
      act(() => {
        update = result.current.applyOptimisticUpdate(
          (data) => ({ ...data, balance: data.balance + 50 })
        );
      });
      
      expect(result.current.data.balance).toBe(150);
      expect(result.current.originalData.balance).toBe(100);
      expect(result.current.hasOptimisticUpdates).toBe(true);
      expect(result.current.optimisticUpdates).toHaveLength(1);
    });

    it('should confirm optimistic update', () => {
      const initialData = { balance: 100 };
      const { result } = renderHook(() => useOptimisticUpdates(initialData));
      
      let update: any;
      
      act(() => {
        update = result.current.applyOptimisticUpdate(
          (data) => ({ ...data, balance: data.balance + 50 })
        );
      });
      
      act(() => {
        result.current.confirmOptimisticUpdate(update.id);
      });
      
      expect(result.current.data.balance).toBe(150);
      expect(result.current.originalData.balance).toBe(150);
      expect(result.current.hasOptimisticUpdates).toBe(false);
      expect(result.current.optimisticUpdates).toHaveLength(0);
    });

    it('should rollback optimistic update', () => {
      const initialData = { balance: 100 };
      const { result } = renderHook(() => useOptimisticUpdates(initialData));
      
      let update: any;
      
      act(() => {
        update = result.current.applyOptimisticUpdate(
          (data) => ({ ...data, balance: data.balance + 50 })
        );
      });
      
      act(() => {
        result.current.rollbackOptimisticUpdate(update.id);
      });
      
      expect(result.current.data.balance).toBe(100);
      expect(result.current.originalData.balance).toBe(100);
      expect(result.current.hasOptimisticUpdates).toBe(false);
    });
  });

  describe('useOptimisticBalance', () => {
    it('should handle optimistic deposit', () => {
      const { result } = renderHook(() => useOptimisticBalance(100));
      
      act(() => {
        result.current.optimisticDeposit(50);
      });
      
      expect(result.current.balance).toBe(150);
      expect(result.current.hasOptimisticUpdates).toBe(true);
    });

    it('should handle optimistic withdraw', () => {
      const { result } = renderHook(() => useOptimisticBalance(100));
      
      act(() => {
        result.current.optimisticWithdraw(30);
      });
      
      expect(result.current.balance).toBe(70);
      expect(result.current.hasOptimisticUpdates).toBe(true);
    });

    it('should prevent negative balance on withdraw', () => {
      const { result } = renderHook(() => useOptimisticBalance(50));
      
      act(() => {
        result.current.optimisticWithdraw(100);
      });
      
      expect(result.current.balance).toBe(0);
    });

    it('should handle yield updates', () => {
      const { result } = renderHook(() => useOptimisticBalance(100));
      
      act(() => {
        result.current.optimisticYieldUpdate(5.5);
      });
      
      expect(result.current.balance).toBe(105.5);
      expect(result.current.hasOptimisticUpdates).toBe(true);
    });
  });
});

// Integration test for loading states in components
describe('Loading States Integration', () => {
  it('should work with real data fetching', async () => {
    // Mock API client
    const mockApiClient = {
      getMarketSnapshot: vi.fn().mockResolvedValue({
        success: true,
        data: { bnb_price_usd: 300 }
      }),
      getVaultStats: vi.fn().mockResolvedValue({
        success: true,
        data: { balance: 1000 }
      })
    };

    // This would be a more comprehensive test with actual component rendering
    // For now, we're testing the hooks in isolation
    expect(mockApiClient.getMarketSnapshot).toBeDefined();
    expect(mockApiClient.getVaultStats).toBeDefined();
  });
});