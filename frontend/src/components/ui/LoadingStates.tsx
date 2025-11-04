import React from 'react';
import { RefreshCw, Loader2, AlertCircle } from 'lucide-react';

// Basic loading spinner
export function LoadingSpinner({ size = 'md', className = '' }: { 
  size?: 'sm' | 'md' | 'lg' | 'xl'; 
  className?: string; 
}) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  return (
    <Loader2 
      className={`animate-spin text-gold-500 ${sizeClasses[size]} ${className}`} 
    />
  );
}

// Skeleton loading for cards
export function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-gray-900 border border-gray-800 rounded-lg p-6 animate-pulse ${className}`}>
      <div className="space-y-4">
        <div className="h-4 bg-gray-700 rounded w-3/4"></div>
        <div className="h-8 bg-gray-700 rounded w-1/2"></div>
        <div className="space-y-2">
          <div className="h-3 bg-gray-700 rounded"></div>
          <div className="h-3 bg-gray-700 rounded w-5/6"></div>
        </div>
      </div>
    </div>
  );
}

// Skeleton for data tables
export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex space-x-4">
          {Array.from({ length: cols }).map((_, j) => (
            <div 
              key={j} 
              className="h-4 bg-gray-700 rounded animate-pulse flex-1"
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// Loading overlay for full-screen operations
export function LoadingOverlay({ 
  message = 'Loading...', 
  submessage,
  progress,
  onCancel 
}: {
  message?: string;
  submessage?: string;
  progress?: number;
  onCancel?: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <LoadingSpinner size="xl" className="mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">{message}</h3>
          {submessage && (
            <p className="text-gray-400 mb-4">{submessage}</p>
          )}
          
          {progress !== undefined && (
            <div className="mb-4">
              <div className="bg-gray-700 rounded-full h-2 mb-2">
                <div 
                  className="bg-gold-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-gray-400">{progress}% complete</p>
            </div>
          )}
          
          {onCancel && (
            <button
              onClick={onCancel}
              className="mt-4 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Inline loading state for buttons
export function ButtonLoading({ 
  loading, 
  children, 
  loadingText = 'Loading...',
  ...props 
}: {
  loading: boolean;
  children: React.ReactNode;
  loadingText?: string;
  [key: string]: any;
}) {
  return (
    <button {...props} disabled={loading || props.disabled}>
      {loading ? (
        <div className="flex items-center gap-2">
          <LoadingSpinner size="sm" />
          <span>{loadingText}</span>
        </div>
      ) : (
        children
      )}
    </button>
  );
}

// Progress indicator for multi-step operations
export function ProgressIndicator({ 
  steps, 
  currentStep, 
  className = '' 
}: {
  steps: string[];
  currentStep: number;
  className?: string;
}) {
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center">
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
              ${index < currentStep 
                ? 'bg-green-500 text-white' 
                : index === currentStep 
                  ? 'bg-gold-500 text-black' 
                  : 'bg-gray-700 text-gray-400'
              }
            `}>
              {index < currentStep ? '✓' : index + 1}
            </div>
            {index < steps.length - 1 && (
              <div className={`
                w-16 h-0.5 mx-2
                ${index < currentStep ? 'bg-green-500' : 'bg-gray-700'}
              `} />
            )}
          </div>
        ))}
      </div>
      <div className="text-center">
        <p className="text-white font-medium">{steps[currentStep]}</p>
        <p className="text-gray-400 text-sm">Step {currentStep + 1} of {steps.length}</p>
      </div>
    </div>
  );
}

// Data loading state with retry
export function DataLoadingState({ 
  loading, 
  error, 
  onRetry, 
  emptyMessage = 'No data available',
  children 
}: {
  loading: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyMessage?: string;
  children: React.ReactNode;
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-400">Loading data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Failed to load data</h3>
          <p className="text-gray-400 mb-4">{error}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="px-4 py-2 bg-gold-600 hover:bg-gold-700 text-black font-medium rounded transition-colors"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

// Skeleton for dashboard cards
export function DashboardCardSkeleton() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-5 bg-gray-700 rounded w-32"></div>
        <div className="w-6 h-6 bg-gray-700 rounded"></div>
      </div>
      <div className="space-y-3">
        <div className="h-8 bg-gray-700 rounded w-24"></div>
        <div className="h-4 bg-gray-700 rounded w-48"></div>
        <div className="flex justify-between">
          <div className="h-3 bg-gray-700 rounded w-16"></div>
          <div className="h-3 bg-gray-700 rounded w-20"></div>
        </div>
      </div>
    </div>
  );
}

// Skeleton for strategy cards
export function StrategyCardSkeleton() {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="space-y-2">
          <div className="h-6 bg-gray-700 rounded w-32"></div>
          <div className="h-4 bg-gray-700 rounded w-48"></div>
        </div>
        <div className="w-12 h-12 bg-gray-700 rounded-lg"></div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="space-y-2">
          <div className="h-3 bg-gray-700 rounded w-16"></div>
          <div className="h-5 bg-gray-700 rounded w-20"></div>
        </div>
        <div className="space-y-2">
          <div className="h-3 bg-gray-700 rounded w-12"></div>
          <div className="h-5 bg-gray-700 rounded w-24"></div>
        </div>
      </div>
      
      <div className="h-10 bg-gray-700 rounded w-full"></div>
    </div>
  );
}

// Loading state for charts
export function ChartSkeleton({ height = 'h-64' }: { height?: string }) {
  return (
    <div className={`bg-gray-900 border border-gray-800 rounded-lg p-6 animate-pulse ${height}`}>
      <div className="h-4 bg-gray-700 rounded w-32 mb-4"></div>
      <div className="flex items-end space-x-2 h-full">
        {Array.from({ length: 12 }).map((_, i) => (
          <div 
            key={i}
            className="bg-gray-700 rounded-t flex-1"
            style={{ height: `${Math.random() * 60 + 20}%` }}
          />
        ))}
      </div>
    </div>
  );
}