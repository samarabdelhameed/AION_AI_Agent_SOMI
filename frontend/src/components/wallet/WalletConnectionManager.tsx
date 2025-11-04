import React, { useState, useCallback, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { Button } from '../ui/Button';
import { Wallet, AlertCircle, CheckCircle, Loader2, HelpCircle } from 'lucide-react';
import { WalletTroubleshooter, useWalletTroubleshooting } from './WalletTroubleshooter';

interface WalletConnectionManagerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'ghost';
}

export function WalletConnectionManager({ 
  className = '', 
  size = 'md',
  variant = 'primary' 
}: WalletConnectionManagerProps) {
  const { isConnected, address, isConnecting, isReconnecting } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastConnectionAttempt, setLastConnectionAttempt] = useState(0);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const { showTroubleshooter, openTroubleshooter, closeTroubleshooter } = useWalletTroubleshooting();

  // Prevent multiple connection attempts within 2 seconds
  const handleConnect = useCallback(async () => {
    const now = Date.now();
    if (now - lastConnectionAttempt < 2000) {
      console.log('⏳ Connection attempt too soon, please wait...');
      return;
    }

    setLastConnectionAttempt(now);
    setIsProcessing(true);
    setConnectionError(null);

    try {
      if (openConnectModal) {
        openConnectModal();
      } else {
        throw new Error('Connect modal not available');
      }
    } catch (error) {
      console.error('❌ Failed to open connect modal:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect wallet';
      setConnectionError(errorMessage);
    } finally {
      // Reset processing state after a delay
      setTimeout(() => setIsProcessing(false), 1000);
    }
  }, [openConnectModal, lastConnectionAttempt]);

  const handleDisconnect = useCallback(async () => {
    setIsProcessing(true);
    try {
      await disconnect();
    } catch (error) {
      console.error('❌ Failed to disconnect:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [disconnect]);

  // Reset processing state when connection state changes
  useEffect(() => {
    if (isConnected || (!isConnecting && !isReconnecting)) {
      setIsProcessing(false);
    }
  }, [isConnected, isConnecting, isReconnecting]);

  const getButtonText = () => {
    if (isProcessing || isConnecting || isReconnecting) {
      return 'Connecting...';
    }
    if (isConnected && address) {
      return `${address.slice(0, 6)}...${address.slice(-4)}`;
    }
    return 'Connect Wallet';
  };

  const getButtonIcon = () => {
    if (isProcessing || isConnecting || isReconnecting) {
      return <Loader2 className="w-4 h-4 animate-spin" />;
    }
    if (isConnected) {
      return <CheckCircle className="w-4 h-4 text-green-400" />;
    }
    return <Wallet className="w-4 h-4" />;
  };

  const isLoading = isProcessing || isConnecting || isReconnecting;

  return (
    <>
      <div className={`flex items-center gap-2 ${className}`}>
        {isConnected ? (
          <div className="flex items-center gap-2">
            <Button
              size={size}
              variant="ghost"
              onClick={handleDisconnect}
              disabled={isLoading}
              className="text-green-400 hover:text-green-300"
            >
              {getButtonIcon()}
              {getButtonText()}
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              size={size}
              variant={variant}
              onClick={handleConnect}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {getButtonIcon()}
              {getButtonText()}
            </Button>
            
            {/* Help button for connection issues */}
            {connectionError && (
              <Button
                size="sm"
                variant="ghost"
                onClick={openTroubleshooter}
                className="text-yellow-400 hover:text-yellow-300"
                title="Need help connecting?"
              >
                <HelpCircle className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
        
        {/* Connection Status Indicator */}
        {isConnected && (
          <div className="flex items-center gap-1 text-xs text-green-400">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            Connected
          </div>
        )}
        
        {/* Connection Error */}
        {connectionError && !isConnected && (
          <div className="flex items-center gap-1 text-xs text-red-400">
            <AlertCircle className="w-3 h-3" />
            Connection failed
          </div>
        )}
      </div>

      {/* Troubleshooter Modal */}
      <WalletTroubleshooter 
        isVisible={showTroubleshooter} 
        onClose={closeTroubleshooter} 
      />
    </>
  );
}

// Hook for wallet connection with error handling
export function useWalletConnection() {
  const { isConnected, address, isConnecting, isReconnecting } = useAccount();
  const { openConnectModal } = useConnectModal();
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const connectWallet = useCallback(async () => {
    setConnectionError(null);
    
    try {
      if (!openConnectModal) {
        throw new Error('Connect modal not available');
      }
      
      openConnectModal();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect wallet';
      setConnectionError(errorMessage);
      console.error('❌ Wallet connection error:', error);
    }
  }, [openConnectModal]);

  const clearError = useCallback(() => {
    setConnectionError(null);
  }, []);

  return {
    isConnected,
    address,
    isConnecting: isConnecting || isReconnecting,
    connectionError,
    connectWallet,
    clearError,
  };
}