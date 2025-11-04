import { useState, useEffect, useCallback } from 'react';
import { ethers, BigNumber, utils } from '../utils/ethersCompat';
import { vaultService, VaultData, TransactionResult, AdapterInfo } from '../services/vaultService';
import { useVaultOnchain } from './useVaultOnchain';

interface UseVaultReturn {
  // Real vault data from smart contracts
  vaultData: VaultData | null;
  adapters: AdapterInfo[];
  isLoading: boolean;
  isConnected: boolean;
  error: string | null;
  
  // Real transaction functions
  deposit: (amount: string) => Promise<TransactionResult>;
  withdraw: (amount: string) => Promise<TransactionResult>;
  withdrawShares: (shares: string) => Promise<TransactionResult>;
  claimYield: () => Promise<TransactionResult>;
  emergencyWithdraw: () => Promise<TransactionResult>;
  
  // Utility functions
  calculateShares: (amount: string) => Promise<string>;
  calculateAssets: (shares: string) => Promise<string>;
  refreshData: () => Promise<void>;
  
  // Connection management
  connect: () => Promise<boolean>;
  disconnect: () => void;
}

export const useVault = (userAddress?: string): UseVaultReturn => {
  const [vaultData, setVaultData] = useState<VaultData | null>(null);
  const [adapters, setAdapters] = useState<AdapterInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get onchain refresh function
  const { refreshAfterTransaction } = useVaultOnchain();

  // Initialize vault service and fetch real data
  const initializeVault = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('🚀 Initializing vault service...');
      const initialized = await vaultService.initialize();
      
      if (!initialized) {
        throw new Error('Failed to initialize vault service');
      }

      const connected = await vaultService.checkConnection();
      setIsConnected(connected);

      if (connected && userAddress) {
        console.log('📊 Fetching real vault data for:', userAddress);
        
        // Fetch real data from smart contracts
        const [realVaultData, realAdapters] = await Promise.all([
          vaultService.getVaultData(userAddress),
          vaultService.getAllAdapters()
        ]);

        setVaultData(realVaultData);
        setAdapters(realAdapters);

        // Start real-time event listening
        vaultService.startEventListening(userAddress, (updatedData) => {
          console.log('🔔 Real-time vault data update received');
          setVaultData(updatedData);
        });

        console.log('✅ Real vault data loaded successfully');
      }
    } catch (err) {
      console.error('❌ Error initializing vault:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, [userAddress]);

  // Initialize on mount and when user address changes
  useEffect(() => {
    initializeVault();

    // Cleanup on unmount
    return () => {
      vaultService.stopEventListening();
    };
  }, [initializeVault]);

  // Enhanced refresh function that updates both local and onchain data
  const refreshData = useCallback(async (): Promise<void> => {
    if (!userAddress || !isConnected) return;

    try {
      console.log('🔄 Refreshing vault data...');
      
      // Refresh both local vault data and onchain data
      const [realVaultData, realAdapters] = await Promise.all([
        vaultService.getVaultData(userAddress),
        vaultService.getAllAdapters()
      ]);

      setVaultData(realVaultData);
      setAdapters(realAdapters);
      
      // Also refresh onchain data
      await refreshAfterTransaction();
      
      console.log('✅ Vault data refreshed completely');
    } catch (err) {
      console.error('❌ Error refreshing data:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh data');
    }
  }, [userAddress, isConnected, refreshAfterTransaction]);

  // Real deposit function with enhanced refresh
  const deposit = useCallback(async (amount: string): Promise<TransactionResult> => {
    try {
      setError(null);
      console.log('💰 Executing real deposit:', amount, 'BNB');
      
      const amountWei = utils.parseEther(amount);
      const result = await vaultService.deposit(amountWei);
      
      if (result.success) {
        console.log('✅ Deposit successful:', result.hash);
        // Enhanced refresh after successful transaction
        await refreshData();
      } else {
        setError(result.error || 'Deposit failed');
      }
      
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Deposit failed';
      setError(errorMsg);
      console.error('❌ Deposit error:', err);
      return { hash: '', success: false, error: errorMsg };
    }
  }, [refreshData]);

  // Real withdraw function with enhanced refresh
  const withdraw = useCallback(async (amount: string): Promise<TransactionResult> => {
    try {
      setError(null);
      console.log('💸 Executing real withdraw:', amount, 'BNB');
      
      const amountWei = utils.parseEther(amount);
      const result = await vaultService.withdraw(amountWei);
      
      if (result.success) {
        console.log('✅ Withdraw successful:', result.hash);
        await refreshData();
      } else {
        setError(result.error || 'Withdraw failed');
      }
      
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Withdraw failed';
      setError(errorMsg);
      console.error('❌ Withdraw error:', err);
      return { hash: '', success: false, error: errorMsg };
    }
  }, [refreshData]);

  // Real withdraw shares function with enhanced refresh
  const withdrawShares = useCallback(async (shares: string): Promise<TransactionResult> => {
    try {
      setError(null);
      console.log('📊 Executing real withdrawShares:', shares);
      
      const sharesWei = utils.parseEther(shares);
      const result = await vaultService.withdrawShares(sharesWei);
      
      if (result.success) {
        console.log('✅ WithdrawShares successful:', result.hash);
        await refreshData();
      } else {
        setError(result.error || 'WithdrawShares failed');
      }
      
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'WithdrawShares failed';
      setError(errorMsg);
      console.error('❌ WithdrawShares error:', err);
      return { hash: '', success: false, error: errorMsg };
    }
  }, [refreshData]);

  // Real claim yield function with enhanced refresh
  const claimYield = useCallback(async (): Promise<TransactionResult> => {
    try {
      setError(null);
      console.log('🎯 Executing real claimYield...');
      
      const result = await vaultService.claimYield();
      
      if (result.success) {
        console.log('✅ ClaimYield successful:', result.hash);
        await refreshData();
      } else {
        setError(result.error || 'ClaimYield failed');
      }
      
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'ClaimYield failed';
      setError(errorMsg);
      console.error('❌ ClaimYield error:', err);
      return { hash: '', success: false, error: errorMsg };
    }
  }, [refreshData]);

  // Real emergency withdraw function with enhanced refresh
  const emergencyWithdraw = useCallback(async (): Promise<TransactionResult> => {
    try {
      setError(null);
      console.log('🚨 Executing EMERGENCY withdraw...');
      
      const result = await vaultService.emergencyWithdraw();
      
      if (result.success) {
        console.log('✅ Emergency withdraw successful:', result.hash);
        await refreshData();
      } else {
        setError(result.error || 'Emergency withdraw failed');
      }
      
      return result;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Emergency withdraw failed';
      setError(errorMsg);
      console.error('❌ Emergency withdraw error:', err);
      return { hash: '', success: false, error: errorMsg };
    }
  }, [refreshData]);

  // Calculate shares for deposit amount
  const calculateShares = useCallback(async (amount: string): Promise<string> => {
    try {
      const amountWei = utils.parseEther(amount);
      const sharesWei = await vaultService.calculateSharesForDeposit(amountWei);
      return utils.formatEther(sharesWei);
    } catch (err) {
      console.error('❌ Error calculating shares:', err);
      return '0';
    }
  }, []);

  // Calculate assets for shares amount
  const calculateAssets = useCallback(async (shares: string): Promise<string> => {
    try {
      const sharesWei = utils.parseEther(shares);
      const assetsWei = await vaultService.calculateAssetsForShares(sharesWei);
      return utils.formatEther(assetsWei);
    } catch (err) {
      console.error('❌ Error calculating assets:', err);
      return '0';
    }
  }, []);

  // Connect to wallet
  const connect = useCallback(async (): Promise<boolean> => {
    try {
      const connected = await vaultService.checkConnection();
      setIsConnected(connected);
      
      if (connected) {
        await initializeVault();
      }
      
      return connected;
    } catch (err) {
      console.error('❌ Connection error:', err);
      setError(err instanceof Error ? err.message : 'Connection failed');
      return false;
    }
  }, [initializeVault]);

  // Disconnect wallet
  const disconnect = useCallback((): void => {
    vaultService.cleanup();
    setVaultData(null);
    setAdapters([]);
    setIsConnected(false);
    setError(null);
    console.log('🔌 Disconnected from vault');
  }, []);

  return {
    vaultData,
    adapters,
    isLoading,
    isConnected,
    error,
    deposit,
    withdraw,
    withdrawShares,
    claimYield,
    emergencyWithdraw,
    calculateShares,
    calculateAssets,
    refreshData,
    connect,
    disconnect
  };
};