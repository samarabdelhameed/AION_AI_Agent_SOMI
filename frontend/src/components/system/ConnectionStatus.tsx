import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wifi, WifiOff, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { connectionManager } from '../../lib/connectionManager';
import { appInitializer } from '../../lib/appInitializer';

interface ConnectionStatusProps {
  className?: string;
  showDetails?: boolean;
}

export function ConnectionStatus({ className = '', showDetails = false }: ConnectionStatusProps) {
  const [status, setStatus] = useState(connectionManager.getStatus());
  const [appMode, setAppMode] = useState(appInitializer.getMode());
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const unsubscribe = connectionManager.onStatusChange((newStatus) => {
      setStatus(newStatus);
      setAppMode(appInitializer.getMode());
    });

    return unsubscribe;
  }, []);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await connectionManager.forceHealthCheck();
      await appInitializer.reinitialize();
    } catch (error) {
      console.error('Failed to refresh connection:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusIcon = () => {
    if (isRefreshing) {
      return <RefreshCw className="w-4 h-4 animate-spin" />;
    }

    switch (appMode) {
      case 'full':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'degraded':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'offline':
        return <WifiOff className="w-4 h-4 text-red-400" />;
      default:
        return <Wifi className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = () => {
    switch (appMode) {
      case 'full':
        return 'All systems operational';
      case 'degraded':
        return 'Limited connectivity';
      case 'offline':
        return 'Offline mode';
      default:
        return 'Checking status...';
    }
  };

  const getStatusColor = () => {
    switch (appMode) {
      case 'full':
        return 'text-green-400';
      case 'degraded':
        return 'text-yellow-400';
      case 'offline':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  if (!showDetails && appMode === 'full') {
    // Don't show status indicator when everything is working
    return null;
  }

  return (
    <div className={`${className}`}>
      <motion.div
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {getStatusIcon()}
        <span className={`text-sm font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </span>
      </motion.div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 p-3 bg-dark-800/50 rounded-lg border border-dark-600"
          >
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">MCP Service:</span>
                <span className={`font-medium ${
                  status.mcp === 'connected' ? 'text-green-400' :
                  status.mcp === 'degraded' ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {status.mcp === 'connected' ? 'Online' :
                   status.mcp === 'degraded' ? 'Degraded' : 'Offline'}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Web3:</span>
                <span className="text-green-400 font-medium">Online</span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Data Source:</span>
                <span className={`font-medium ${
                  appMode === 'full' ? 'text-green-400' : 'text-yellow-400'
                }`}>
                  {appMode === 'full' ? 'Live' : 'Cached/Mock'}
                </span>
              </div>

              {status.circuitBreakerOpen && (
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Circuit Breaker:</span>
                  <span className="text-red-400 font-medium">Open</span>
                </div>
              )}

              <div className="flex justify-between items-center pt-2 border-t border-dark-600">
                <span className="text-gray-400">Last Check:</span>
                <span className="text-gray-300 font-medium">
                  {status.lastHealthCheck.toLocaleTimeString()}
                </span>
              </div>

              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="w-full mt-2 px-3 py-1 bg-dark-700 hover:bg-dark-600 rounded text-xs font-medium text-gray-300 transition-colors disabled:opacity-50"
              >
                {isRefreshing ? 'Refreshing...' : 'Refresh Status'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Compact version for header/navbar
export function ConnectionStatusCompact({ className = '' }: { className?: string }) {
  return (
    <ConnectionStatus 
      className={className}
      showDetails={false}
    />
  );
}

// Detailed version for settings/debug pages
export function ConnectionStatusDetailed({ className = '' }: { className?: string }) {
  return (
    <ConnectionStatus 
      className={className}
      showDetails={true}
    />
  );
}