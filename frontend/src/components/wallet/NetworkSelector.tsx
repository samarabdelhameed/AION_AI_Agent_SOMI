import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, AlertCircle, CheckCircle } from 'lucide-react';
import { useChainId, useSwitchChain } from 'wagmi';
import { bsc, bscTestnet } from 'wagmi/chains';
import { cn } from '../../lib/utils';

const supportedChains = [
  {
    id: bscTestnet.id,
    name: 'BSC Testnet',
    shortName: 'Testnet',
    color: 'bg-yellow-500',
    icon: '🧪'
  },
  {
    id: bsc.id,
    name: 'BNB Chain',
    shortName: 'Mainnet',
    color: 'bg-green-500',
    icon: '🌐'
  }
];

interface NetworkSelectorProps {
  className?: string;
  compact?: boolean;
}

export function NetworkSelector({ className = '', compact = false }: NetworkSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();

  const currentChain = supportedChains.find(chain => chain.id === chainId);
  const isUnsupportedChain = !currentChain;

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChainSwitch = async (targetChainId: number) => {
    if (targetChainId === chainId) {
      setIsOpen(false);
      return;
    }

    setIsLoading(true);
    try {
      await switchChain({ chainId: targetChainId });
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to switch chain:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getDisplayName = () => {
    if (isUnsupportedChain) return 'Unsupported';
    return compact ? currentChain.shortName : currentChain.name;
  };

  const getStatusColor = () => {
    if (isUnsupportedChain) return 'bg-red-500';
    return currentChain.color;
  };

  const getStatusIcon = () => {
    if (isLoading || isPending) {
      return <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />;
    }
    if (isUnsupportedChain) {
      return <AlertCircle className="w-3 h-3 text-red-400" />;
    }
    return <div className={`w-2 h-2 ${currentChain.color} rounded-full`} />;
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoading || isPending}
        className={cn(
          "flex items-center gap-2 px-3 py-2 bg-dark-700/50 rounded-xl border border-dark-600",
          "hover:bg-dark-600/50 transition-colors",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          isUnsupportedChain && "border-red-500/50 bg-red-500/10"
        )}
      >
        {getStatusIcon()}
        <span className={cn(
          "text-sm",
          isUnsupportedChain ? "text-red-300" : "text-gray-300"
        )}>
          {getDisplayName()}
        </span>
        <ChevronDown 
          className={cn(
            "w-4 h-4 text-gray-400 transition-transform",
            isOpen && "rotate-180"
          )} 
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-2 w-48 bg-dark-800/95 backdrop-blur-sm border border-dark-600 rounded-xl py-2 z-50 shadow-xl"
          >
            {supportedChains.map((chain) => {
              const isActive = chain.id === chainId;
              const isCurrentlyLoading = isLoading && chain.id !== chainId;

              return (
                <button
                  key={chain.id}
                  onClick={() => handleChainSwitch(chain.id)}
                  disabled={isCurrentlyLoading || isPending}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                    "hover:bg-dark-700/50 disabled:opacity-50 disabled:cursor-not-allowed",
                    isActive && "bg-dark-700/30"
                  )}
                >
                  <span className="text-lg">{chain.icon}</span>
                  <div className="flex-1">
                    <div className={cn(
                      "font-medium",
                      isActive ? "text-gold-400" : "text-gray-300"
                    )}>
                      {chain.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      Chain ID: {chain.id}
                    </div>
                  </div>
                  {isActive && (
                    <CheckCircle className="w-4 h-4 text-gold-400" />
                  )}
                </button>
              );
            })}
            
            {isUnsupportedChain && (
              <div className="px-4 py-3 border-t border-dark-600 mt-2">
                <div className="flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>Please switch to a supported network</span>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Hook for network management
export function useNetworkStatus() {
  const chainId = useChainId();
  const { switchChain, isPending } = useSwitchChain();

  const currentChain = supportedChains.find(chain => chain.id === chainId);
  const isSupported = !!currentChain;
  const isTestnet = chainId === bscTestnet.id;
  const isMainnet = chainId === bsc.id;

  const switchToTestnet = () => switchChain({ chainId: bscTestnet.id });
  const switchToMainnet = () => switchChain({ chainId: bsc.id });

  return {
    chainId,
    currentChain,
    isSupported,
    isTestnet,
    isMainnet,
    isPending,
    switchChain,
    switchToTestnet,
    switchToMainnet,
    supportedChains,
  };
}