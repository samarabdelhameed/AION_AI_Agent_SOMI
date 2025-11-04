import { useState, useCallback, useRef } from 'react';

export interface OptimisticUpdate<T> {
  id: string;
  data: T;
  rollback: () => void;
  timestamp: Date;
}

export function useOptimisticUpdates<T>(initialData: T) {
  const [data, setData] = useState<T>(initialData);
  const [optimisticUpdates, setOptimisticUpdates] = useState<OptimisticUpdate<T>[]>([]);
  const originalDataRef = useRef<T>(initialData);

  // Update the original data (from successful API calls)
  const updateOriginalData = useCallback((newData: T) => {
    originalDataRef.current = newData;
    setData(newData);
    
    // Clear any optimistic updates since we have real data
    setOptimisticUpdates([]);
  }, []);

  // Apply an optimistic update
  const applyOptimisticUpdate = useCallback((
    updateFn: (current: T) => T,
    options?: {
      timeout?: number;
      onRollback?: () => void;
    }
  ): OptimisticUpdate<T> => {
    const id = `optimistic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date();
    
    // Apply the optimistic update
    const optimisticData = updateFn(data);
    setData(optimisticData);

    const rollback = () => {
      setData(originalDataRef.current);
      setOptimisticUpdates(prev => prev.filter(update => update.id !== id));
      options?.onRollback?.();
    };

    const update: OptimisticUpdate<T> = {
      id,
      data: optimisticData,
      rollback,
      timestamp,
    };

    setOptimisticUpdates(prev => [...prev, update]);

    // Auto-rollback after timeout if specified
    if (options?.timeout) {
      setTimeout(() => {
        rollback();
      }, options.timeout);
    }

    return update;
  }, [data]);

  // Confirm an optimistic update (when the real API call succeeds)
  const confirmOptimisticUpdate = useCallback((updateId: string, realData?: T) => {
    setOptimisticUpdates(prev => prev.filter(update => update.id !== updateId));
    
    if (realData) {
      updateOriginalData(realData);
    } else {
      // If no real data provided, make the optimistic data the new original
      originalDataRef.current = data;
    }
  }, [data, updateOriginalData]);

  // Rollback a specific optimistic update
  const rollbackOptimisticUpdate = useCallback((updateId: string) => {
    const update = optimisticUpdates.find(u => u.id === updateId);
    if (update) {
      update.rollback();
    }
  }, [optimisticUpdates]);

  // Rollback all optimistic updates
  const rollbackAllOptimisticUpdates = useCallback(() => {
    optimisticUpdates.forEach(update => update.rollback());
  }, [optimisticUpdates]);

  return {
    data,
    originalData: originalDataRef.current,
    optimisticUpdates,
    updateOriginalData,
    applyOptimisticUpdate,
    confirmOptimisticUpdate,
    rollbackOptimisticUpdate,
    rollbackAllOptimisticUpdates,
    hasOptimisticUpdates: optimisticUpdates.length > 0,
  };
}

// Hook for optimistic balance updates
export function useOptimisticBalance(initialBalance: number) {
  const {
    data: balance,
    applyOptimisticUpdate,
    confirmOptimisticUpdate,
    rollbackOptimisticUpdate,
    updateOriginalData,
    hasOptimisticUpdates,
  } = useOptimisticUpdates(initialBalance);

  const optimisticDeposit = useCallback((amount: number) => {
    return applyOptimisticUpdate(
      (currentBalance) => currentBalance + amount,
      { timeout: 30000 } // Auto-rollback after 30 seconds
    );
  }, [applyOptimisticUpdate]);

  const optimisticWithdraw = useCallback((amount: number) => {
    return applyOptimisticUpdate(
      (currentBalance) => Math.max(0, currentBalance - amount),
      { timeout: 30000 }
    );
  }, [applyOptimisticUpdate]);

  const optimisticYieldUpdate = useCallback((yieldAmount: number) => {
    return applyOptimisticUpdate(
      (currentBalance) => currentBalance + yieldAmount,
      { timeout: 60000 } // Longer timeout for yield updates
    );
  }, [applyOptimisticUpdate]);

  return {
    balance,
    optimisticDeposit,
    optimisticWithdraw,
    optimisticYieldUpdate,
    confirmUpdate: confirmOptimisticUpdate,
    rollbackUpdate: rollbackOptimisticUpdate,
    updateBalance: updateOriginalData,
    hasOptimisticUpdates,
  };
}

// Hook for optimistic transaction history
export function useOptimisticTransactions<T extends { id: string; timestamp: Date }>(
  initialTransactions: T[]
) {
  const {
    data: transactions,
    applyOptimisticUpdate,
    confirmOptimisticUpdate,
    updateOriginalData,
  } = useOptimisticUpdates(initialTransactions);

  const addOptimisticTransaction = useCallback((transaction: T) => {
    return applyOptimisticUpdate(
      (currentTransactions) => [transaction, ...currentTransactions],
      { timeout: 60000 }
    );
  }, [applyOptimisticUpdate]);

  const updateOptimisticTransaction = useCallback((
    transactionId: string, 
    updates: Partial<T>
  ) => {
    return applyOptimisticUpdate(
      (currentTransactions) => 
        currentTransactions.map(tx => 
          tx.id === transactionId ? { ...tx, ...updates } : tx
        ),
      { timeout: 30000 }
    );
  }, [applyOptimisticUpdate]);

  return {
    transactions,
    addOptimisticTransaction,
    updateOptimisticTransaction,
    confirmTransaction: confirmOptimisticUpdate,
    updateTransactions: updateOriginalData,
  };
}