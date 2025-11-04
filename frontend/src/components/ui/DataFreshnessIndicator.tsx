import React from 'react';
import { Wifi, WifiOff, Clock, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

export type DataSource = 'live' | 'cached' | 'fallback' | 'optimistic';
export type DataQuality = 'excellent' | 'good' | 'stale' | 'degraded' | 'offline';

interface DataFreshnessProps {
  source: DataSource;
  lastUpdated?: Date;
  quality?: DataQuality;
  className?: string;
  showDetails?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
}

export function DataFreshnessIndicator({
  source,
  lastUpdated,
  quality,
  className = '',
  showDetails = true,
  onRefresh,
  refreshing = false,
}: DataFreshnessProps) {
  const getQualityFromAge = (lastUpdated: Date): DataQuality => {
    const ageMs = Date.now() - lastUpdated.getTime();
    const ageMinutes = ageMs / (1000 * 60);

    if (ageMinutes < 1) return 'excellent';
    if (ageMinutes < 5) return 'good';
    if (ageMinutes < 15) return 'stale';
    return 'degraded';
  };

  const actualQuality = quality || (lastUpdated ? getQualityFromAge(lastUpdated) : 'offline');

  const getIndicatorConfig = () => {
    switch (source) {
      case 'live':
        switch (actualQuality) {
          case 'excellent':
            return {
              icon: Wifi,
              color: 'text-green-400',
              bgColor: 'bg-green-400/10',
              label: 'Live Data',
              description: 'Real-time updates',
            };
          case 'good':
            return {
              icon: Wifi,
              color: 'text-green-400',
              bgColor: 'bg-green-400/10',
              label: 'Live Data',
              description: 'Recently updated',
            };
          case 'stale':
            return {
              icon: Clock,
              color: 'text-yellow-400',
              bgColor: 'bg-yellow-400/10',
              label: 'Live Data',
              description: 'Slightly outdated',
            };
          default:
            return {
              icon: AlertTriangle,
              color: 'text-orange-400',
              bgColor: 'bg-orange-400/10',
              label: 'Live Data',
              description: 'Connection issues',
            };
        }
      
      case 'cached':
        return {
          icon: Clock,
          color: 'text-blue-400',
          bgColor: 'bg-blue-400/10',
          label: 'Cached Data',
          description: 'From local cache',
        };
      
      case 'fallback':
        return {
          icon: WifiOff,
          color: 'text-gray-400',
          bgColor: 'bg-gray-400/10',
          label: 'Fallback Data',
          description: 'Mock/demo data',
        };
      
      case 'optimistic':
        return {
          icon: RefreshCw,
          color: 'text-purple-400',
          bgColor: 'bg-purple-400/10',
          label: 'Optimistic Update',
          description: 'Pending confirmation',
        };
      
      default:
        return {
          icon: WifiOff,
          color: 'text-red-400',
          bgColor: 'bg-red-400/10',
          label: 'Offline',
          description: 'No connection',
        };
    }
  };

  const config = getIndicatorConfig();
  const Icon = config.icon;

  const formatLastUpdated = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${config.bgColor}`}>
        <Icon 
          className={`w-3 h-3 ${config.color} ${refreshing ? 'animate-spin' : ''}`} 
        />
        {showDetails && (
          <span className={`text-xs font-medium ${config.color}`}>
            {config.label}
          </span>
        )}
      </div>
      
      {showDetails && lastUpdated && (
        <span className="text-xs text-gray-400">
          {formatLastUpdated(lastUpdated)}
        </span>
      )}
      
      {onRefresh && (
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="text-xs text-gray-400 hover:text-gray-300 transition-colors"
          title="Refresh data"
        >
          <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      )}
    </div>
  );
}

// Compact version for small spaces
export function CompactDataIndicator({
  source,
  quality,
  className = '',
}: {
  source: DataSource;
  quality?: DataQuality;
  className?: string;
}) {
  const getColor = () => {
    if (source === 'live' && (quality === 'excellent' || quality === 'good')) {
      return 'bg-green-400';
    }
    if (source === 'live' && quality === 'stale') {
      return 'bg-yellow-400';
    }
    if (source === 'cached') {
      return 'bg-blue-400';
    }
    if (source === 'optimistic') {
      return 'bg-purple-400';
    }
    return 'bg-gray-400';
  };

  return (
    <div 
      className={`w-2 h-2 rounded-full ${getColor()} ${className}`}
      title={`Data source: ${source}${quality ? ` (${quality})` : ''}`}
    />
  );
}

// Connection status banner
export function ConnectionStatusBanner({
  isOnline,
  lastOnline,
  onRetry,
  className = '',
}: {
  isOnline: boolean;
  lastOnline?: Date;
  onRetry?: () => void;
  className?: string;
}) {
  if (isOnline) return null;

  return (
    <div className={`bg-red-900/20 border border-red-500/20 rounded-lg p-3 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <WifiOff className="w-4 h-4 text-red-400" />
          <div>
            <p className="text-sm font-medium text-red-400">Connection Lost</p>
            {lastOnline && (
              <p className="text-xs text-gray-400">
                Last connected {formatLastUpdated(lastOnline)}
              </p>
            )}
          </div>
        </div>
        
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

function formatLastUpdated(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);

  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  return date.toLocaleDateString();
}