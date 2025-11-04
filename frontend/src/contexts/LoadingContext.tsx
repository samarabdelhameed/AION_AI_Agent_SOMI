import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { LoadingOverlay } from '../components/ui/LoadingStates';

interface LoadingOperation {
  id: string;
  message: string;
  submessage?: string;
  progress?: number;
  cancellable?: boolean;
  onCancel?: () => void;
}

interface LoadingContextType {
  operations: LoadingOperation[];
  startOperation: (operation: Omit<LoadingOperation, 'id'>) => string;
  updateOperation: (id: string, updates: Partial<LoadingOperation>) => void;
  finishOperation: (id: string) => void;
  cancelOperation: (id: string) => void;
  isLoading: boolean;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export function LoadingProvider({ children }: { children: ReactNode }) {
  const [operations, setOperations] = useState<LoadingOperation[]>([]);

  const startOperation = useCallback((operation: Omit<LoadingOperation, 'id'>) => {
    const id = `loading-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newOperation: LoadingOperation = { ...operation, id };
    
    setOperations(prev => [...prev, newOperation]);
    return id;
  }, []);

  const updateOperation = useCallback((id: string, updates: Partial<LoadingOperation>) => {
    setOperations(prev => 
      prev.map(op => op.id === id ? { ...op, ...updates } : op)
    );
  }, []);

  const finishOperation = useCallback((id: string) => {
    setOperations(prev => prev.filter(op => op.id !== id));
  }, []);

  const cancelOperation = useCallback((id: string) => {
    const operation = operations.find(op => op.id === id);
    if (operation?.onCancel) {
      operation.onCancel();
    }
    finishOperation(id);
  }, [operations, finishOperation]);

  const isLoading = operations.length > 0;

  // Show the most recent operation in the overlay
  const currentOperation = operations[operations.length - 1];

  return (
    <LoadingContext.Provider value={{
      operations,
      startOperation,
      updateOperation,
      finishOperation,
      cancelOperation,
      isLoading,
    }}>
      {children}
      {currentOperation && (
        <LoadingOverlay
          message={currentOperation.message}
          submessage={currentOperation.submessage}
          progress={currentOperation.progress}
          onCancel={currentOperation.cancellable ? () => cancelOperation(currentOperation.id) : undefined}
        />
      )}
    </LoadingContext.Provider>
  );
}

export function useLoading() {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
}

// Hook for managing a single operation
export function useLoadingOperation() {
  const { startOperation, updateOperation, finishOperation } = useLoading();
  const [operationId, setOperationId] = useState<string | null>(null);

  const start = useCallback((operation: Omit<LoadingOperation, 'id'>) => {
    const id = startOperation(operation);
    setOperationId(id);
    return id;
  }, [startOperation]);

  const update = useCallback((updates: Partial<LoadingOperation>) => {
    if (operationId) {
      updateOperation(operationId, updates);
    }
  }, [operationId, updateOperation]);

  const finish = useCallback(() => {
    if (operationId) {
      finishOperation(operationId);
      setOperationId(null);
    }
  }, [operationId, finishOperation]);

  return {
    start,
    update,
    finish,
    isActive: operationId !== null,
  };
}

// Hook for transaction operations with progress tracking
export function useTransactionLoading() {
  const operation = useLoadingOperation();

  const executeTransaction = useCallback(async (
    transactionFn: () => Promise<any>,
    options: {
      message: string;
      steps?: string[];
      onProgress?: (step: number, total: number) => void;
    }
  ): Promise<any> => {
    const { message, steps = ['Preparing', 'Executing', 'Confirming'], onProgress } = options;

    const operationId = operation.start({
      message,
      submessage: steps[0],
      progress: 0,
      cancellable: false,
    });

    try {
      // Step 1: Preparing
      onProgress?.(0, steps.length);
      operation.update({
        submessage: steps[0],
        progress: 0,
      });

      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate preparation

      // Step 2: Executing
      onProgress?.(1, steps.length);
      operation.update({
        submessage: steps[1],
        progress: 33,
      });

      const result = await transactionFn();

      // Step 3: Confirming
      onProgress?.(2, steps.length);
      operation.update({
        submessage: steps[2],
        progress: 66,
      });

      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate confirmation

      // Complete
      operation.update({
        submessage: 'Complete',
        progress: 100,
      });

      await new Promise(resolve => setTimeout(resolve, 500)); // Show completion briefly

      operation.finish();
      return result;
    } catch (error) {
      operation.finish();
      throw error;
    }
  }, [operation]);

  return {
    executeTransaction,
    isLoading: operation.isActive,
  };
}