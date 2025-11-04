import { useState, useCallback, useRef } from 'react';

export interface LoadingState {
  loading: boolean;
  error: string | null;
  progress?: number;
  stage?: string;
}

export interface OptimisticUpdate<T> {
  optimisticData: T;
  rollback: () => void;
}

export function useLoadingState(initialLoading = false) {
  const [state, setState] = useState<LoadingState>({
    loading: initialLoading,
    error: null,
    progress: undefined,
    stage: undefined,
  });

  const setLoading = useCallback((loading: boolean, stage?: string) => {
    setState(prev => ({ ...prev, loading, stage, error: loading ? null : prev.error }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error, loading: false }));
  }, []);

  const setProgress = useCallback((progress: number, stage?: string) => {
    setState(prev => ({ ...prev, progress, stage }));
  }, []);

  const reset = useCallback(() => {
    setState({ loading: false, error: null, progress: undefined, stage: undefined });
  }, []);

  return {
    ...state,
    setLoading,
    setError,
    setProgress,
    reset,
  };
}

export function useAsyncOperation<T>() {
  const loadingState = useLoadingState();
  const abortControllerRef = useRef<AbortController | null>(null);

  const execute = useCallback(async (
    operation: (signal: AbortSignal) => Promise<T>,
    options?: {
      onSuccess?: (data: T) => void;
      onError?: (error: Error) => void;
      optimisticUpdate?: OptimisticUpdate<T>;
    }
  ): Promise<T | null> => {
    // Cancel any existing operation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    loadingState.setLoading(true);
    loadingState.setError(null);

    try {
      // Apply optimistic update if provided
      if (options?.optimisticUpdate) {
        // Optimistic update is handled by the caller
      }

      const result = await operation(signal);
      
      if (!signal.aborted) {
        loadingState.setLoading(false);
        options?.onSuccess?.(result);
        return result;
      }
      
      return null;
    } catch (error) {
      if (!signal.aborted) {
        const errorMessage = error instanceof Error ? error.message : 'Operation failed';
        loadingState.setError(errorMessage);
        
        // Rollback optimistic update if it failed
        if (options?.optimisticUpdate) {
          options.optimisticUpdate.rollback();
        }
        
        options?.onError?.(error instanceof Error ? error : new Error(errorMessage));
      }
      return null;
    }
  }, [loadingState]);

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      loadingState.reset();
    }
  }, [loadingState]);

  return {
    ...loadingState,
    execute,
    cancel,
  };
}

export function useMultiStepOperation(steps: string[]) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<boolean[]>(new Array(steps.length).fill(false));
  const loadingState = useLoadingState();

  const nextStep = useCallback(() => {
    setCompletedSteps(prev => {
      const next = [...prev];
      next[currentStep] = true;
      return next;
    });
    
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
      loadingState.setProgress(((currentStep + 1) / steps.length) * 100, steps[currentStep + 1]);
    } else {
      loadingState.setLoading(false);
      loadingState.setProgress(100, 'Complete');
    }
  }, [currentStep, steps, loadingState]);

  const start = useCallback(() => {
    setCurrentStep(0);
    setCompletedSteps(new Array(steps.length).fill(false));
    loadingState.setLoading(true);
    loadingState.setProgress(0, steps[0]);
  }, [steps, loadingState]);

  const reset = useCallback(() => {
    setCurrentStep(0);
    setCompletedSteps(new Array(steps.length).fill(false));
    loadingState.reset();
  }, [steps, loadingState]);

  return {
    ...loadingState,
    currentStep,
    completedSteps,
    steps,
    nextStep,
    start,
    reset,
  };
}

// Hook for managing data fetching with caching and optimistic updates
export function useDataFetching<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: {
    cacheTime?: number;
    staleTime?: number;
    refetchOnWindowFocus?: boolean;
  }
) {
  const [data, setData] = useState<T | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const loadingState = useLoadingState();
  const cacheRef = useRef<Map<string, { data: T; timestamp: Date }>>(new Map());

  const isStale = useCallback(() => {
    if (!lastFetch || !options?.staleTime) return true;
    return Date.now() - lastFetch.getTime() > options.staleTime;
  }, [lastFetch, options?.staleTime]);

  const getCachedData = useCallback(() => {
    const cached = cacheRef.current.get(key);
    if (!cached || !options?.cacheTime) return null;
    
    const age = Date.now() - cached.timestamp.getTime();
    if (age > options.cacheTime) {
      cacheRef.current.delete(key);
      return null;
    }
    
    return cached.data;
  }, [key, options?.cacheTime]);

  const fetch = useCallback(async (force = false) => {
    // Return cached data if available and not stale
    if (!force && !isStale()) {
      const cached = getCachedData();
      if (cached) {
        setData(cached);
        return cached;
      }
    }

    loadingState.setLoading(true);
    
    try {
      const result = await fetcher();
      setData(result);
      setLastFetch(new Date());
      
      // Cache the result
      cacheRef.current.set(key, { data: result, timestamp: new Date() });
      
      loadingState.setLoading(false);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch data';
      loadingState.setError(errorMessage);
      
      // Try to return cached data as fallback
      const cached = getCachedData();
      if (cached) {
        setData(cached);
        return cached;
      }
      
      throw error;
    }
  }, [key, fetcher, isStale, getCachedData, loadingState]);

  const mutate = useCallback((newData: T | ((prev: T | null) => T)) => {
    const updatedData = typeof newData === 'function' ? newData(data) : newData;
    setData(updatedData);
    
    // Update cache
    cacheRef.current.set(key, { data: updatedData, timestamp: new Date() });
  }, [key, data]);

  return {
    data,
    ...loadingState,
    fetch,
    mutate,
    isStale: isStale(),
    lastFetch,
  };
}