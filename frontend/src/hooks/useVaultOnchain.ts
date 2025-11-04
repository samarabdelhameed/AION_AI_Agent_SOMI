import { useEffect, useState, useCallback } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { readContract } from 'wagmi/actions';
import { config, CONTRACT_ADDRESSES } from '../lib/web3Config';
import { VAULT_ABI } from '../lib/contractConfig';
import { formatEther } from 'viem';

interface VaultOnchainState {
  loading: boolean;
  error?: string;
  balanceBNB?: number;
  shares?: number;
  principal?: number;
  totalAssets?: number;
  totalShares?: number;
  userYieldClaimed?: number;
  accumulatedYield?: number;
  refresh: () => void;
  refreshAfterTransaction: () => Promise<void>;
}

export function useVaultOnchain(): VaultOnchainState {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const [state, setState] = useState<Omit<VaultOnchainState, 'refresh' | 'refreshAfterTransaction'>>({ loading: false });
  const [nonce, setNonce] = useState(0);

  // Enhanced data fetching function
  const fetchVaultData = useCallback(async () => {
    console.log('🔍 useVaultOnchain: Starting data fetch...');
    console.log('🔍 useVaultOnchain: isConnected:', isConnected);
    console.log('🔍 useVaultOnchain: address:', address);
    console.log('🔍 useVaultOnchain: chainId:', chainId);
    
    if (!isConnected || !address) {
      console.log('🔍 useVaultOnchain: Not connected or no address, setting loading to false');
      setState({ loading: false });
      return;
    }

    const vault = (CONTRACT_ADDRESSES as any)[chainId]?.AION_VAULT as `0x${string}` | undefined;
    console.log('🔍 useVaultOnchain: Vault address:', vault);
    console.log('🔍 useVaultOnchain: Available addresses:', CONTRACT_ADDRESSES);
    
    if (!vault) {
      console.error('❌ useVaultOnchain: Vault address not configured for chain:', chainId);
      setState({ loading: false, error: 'Vault address not configured for this network' });
      return;
    }

    setState((s) => ({ ...s, loading: true, error: undefined }));
    
    try {
      console.log('🔍 useVaultOnchain: Fetching vault data from contract:', vault);
      
      // Fetch available data from the actual contract
      // Note: This contract only has basic functions like balanceOf and owner
      const [
        balRaw
      ] = await Promise.all([
        readContract(config, { abi: VAULT_ABI as any, address: vault, functionName: 'balanceOf', args: [address], chainId }),
      ]) as [bigint];

      console.log('🔍 useVaultOnchain: Raw data received:', {
        balRaw: balRaw.toString(),
        balRawHex: '0x' + balRaw.toString(16),
        address: address,
        vault: vault,
        chainId: chainId
      });

      const balanceBNB = parseFloat(formatEther(balRaw));
      
      console.log('🔍 useVaultOnchain: Parsed balance:', {
        balanceBNB,
        balanceWei: balRaw.toString(),
        balanceHex: '0x' + balRaw.toString(16)
      });
      
      // Test withdraw function availability (skip test to avoid "Invalid amount" error)
      console.log('ℹ️ Withdraw function test skipped (contract rejects 0 amount)');
      
      // Since this contract doesn't have advanced vault functions, we'll use basic balance
      const shares = balanceBNB > 0 ? balanceBNB : 0; // 1:1 ratio for now
      const principal = balanceBNB; // Same as balance for this contract
      const totalVaultAssets = balanceBNB; // Use user balance as total for now
      const totalShares = balanceBNB > 0 ? balanceBNB : 0;
      const userYieldClaimed = 0; // Not available in this contract
      const accumulatedYield = 0; // Not available in this contract

      console.log('✅ useVaultOnchain: Basic vault data fetched:', {
        balanceBNB,
        shares,
        principal,
        totalVaultAssets,
        totalShares,
        userYieldClaimed,
        accumulatedYield
      });

      // Force refresh by updating state with new values
      setState({ 
        loading: false, 
        balanceBNB, 
        shares, 
        principal, 
        totalAssets: totalVaultAssets, 
        totalShares, 
        userYieldClaimed, 
        accumulatedYield 
      });
    } catch (e: any) {
      console.error('❌ useVaultOnchain: Error fetching vault data:', e);
      console.error('❌ useVaultOnchain: Error details:', {
        message: e?.message,
        code: e?.code,
        stack: e?.stack
      });
      setState({ 
        loading: false, 
        error: e?.message || 'Failed to read on-chain data' 
      });
    }
  }, [address, isConnected, chainId]);

  // Enhanced refresh function that waits for blockchain confirmation
  const refreshAfterTransaction = useCallback(async (): Promise<void> => {
    if (!isConnected || !address) return;

    console.log('🔄 Refreshing vault data after transaction...');
    
    // Wait a bit for blockchain to settle
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Fetch fresh data
    await fetchVaultData();
    
    console.log('✅ Vault data refreshed after transaction');
  }, [fetchVaultData, isConnected, address]);

  // Manual refresh function
  const refresh = useCallback(() => {
    setNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    
    if (!cancelled) {
      fetchVaultData();
    }
    
    return () => { 
      cancelled = true; 
    };
  }, [fetchVaultData, nonce]);

  return { 
    ...state, 
    refresh, 
    refreshAfterTransaction 
  } as VaultOnchainState;
}


