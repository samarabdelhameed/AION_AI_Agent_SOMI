import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { AppError } from '../lib/errorManager';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  }>;
  duration?: number;
  persistent?: boolean;
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, 'id'>) => void;
  showError: (error: AppError) => void;
  showSuccess: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showInfo: (message: string, title?: string) => void;
  hideToast: (id: string) => void;
  clearAll: () => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newToast: Toast = {
      ...toast,
      id,
      duration: toast.duration ?? 5000,
    };

    setToasts(prev => [...prev, newToast]);

    // Auto-hide non-persistent toasts
    if (!newToast.persistent && newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        hideToast(id);
      }, newToast.duration);
    }
  };

  const showError = (error: AppError) => {
    showToast({
      type: 'error',
      title: 'Error',
      message: error.userMessage,
      actions: error.suggestedActions.slice(0, 2).map(action => ({
        label: action,
        onClick: () => {
          // Handle action based on the suggestion
          if (action.includes('refresh') || action.includes('Refresh')) {
            window.location.reload();
          } else if (action.includes('Try again')) {
            // You can implement retry logic here
            console.log('Retry action triggered');
          }
        },
        variant: 'secondary' as const,
      })),
      persistent: !error.recoverable,
    });
  };

  const showSuccess = (message: string, title = 'Success') => {
    showToast({
      type: 'success',
      title,
      message,
    });
  };

  const showWarning = (message: string, title = 'Warning') => {
    showToast({
      type: 'warning',
      title,
      message,
    });
  };

  const showInfo = (message: string, title = 'Info') => {
    showToast({
      type: 'info',
      title,
      message,
    });
  };

  const hideToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const clearAll = () => {
    setToasts([]);
  };

  return (
    <ToastContext.Provider value={{
      showToast,
      showError,
      showSuccess,
      showWarning,
      showInfo,
      hideToast,
      clearAll,
    }}>
      {children}
      <ToastContainer toasts={toasts} onHide={hideToast} />
    </ToastContext.Provider>
  );
}

interface ToastContainerProps {
  toasts: Toast[];
  onHide: (id: string) => void;
}

function ToastContainer({ toasts, onHide }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onHide={onHide} />
      ))}
    </div>
  );
}

interface ToastItemProps {
  toast: Toast;
  onHide: (id: string) => void;
}

function ToastItem({ toast, onHide }: ToastItemProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Trigger animation
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onHide(toast.id), 300);
  };

  const getToastStyles = () => {
    const baseStyles = "transform transition-all duration-300 ease-in-out";
    const visibleStyles = isVisible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0";
    
    const typeStyles = {
      success: "bg-green-900 border-green-700 text-green-100",
      error: "bg-red-900 border-red-700 text-red-100",
      warning: "bg-yellow-900 border-yellow-700 text-yellow-100",
      info: "bg-blue-900 border-blue-700 text-blue-100",
    };

    return `${baseStyles} ${visibleStyles} ${typeStyles[toast.type]} border rounded-lg p-4 shadow-lg`;
  };

  const getIcon = () => {
    const icons = {
      success: "✅",
      error: "❌",
      warning: "⚠️",
      info: "ℹ️",
    };
    return icons[toast.type];
  };

  return (
    <div className={getToastStyles()}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <span className="text-lg">{getIcon()}</span>
          <div className="flex-1">
            <h4 className="font-medium text-sm">{toast.title}</h4>
            <p className="text-sm opacity-90 mt-1">{toast.message}</p>
            
            {toast.actions && toast.actions.length > 0 && (
              <div className="flex space-x-2 mt-3">
                {toast.actions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      action.onClick();
                      handleClose();
                    }}
                    className={`text-xs px-3 py-1 rounded transition-colors ${
                      action.variant === 'primary'
                        ? 'bg-white text-gray-900 hover:bg-gray-100'
                        : 'border border-current hover:bg-white hover:bg-opacity-10'
                    }`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <button
          onClick={handleClose}
          className="text-lg opacity-70 hover:opacity-100 transition-opacity ml-2"
        >
          ×
        </button>
      </div>
    </div>
  );
}