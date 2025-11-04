import { useState, useCallback } from 'react';
import { useReadContract, useWriteContract, useAccount, useChainId } from 'wagmi';
import { getContractAddress, isContractDeployed } from '../lib/web3Config';

interface ContractCallResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

interface ContractWriteResult {
  write: ((args?: any) => void) | null;
  loading: boolean;
  error: string | null;
  success: boolean;
  txHash: string | null;
}

// Safe contract read hook with error handling
export function useContractReadSafe<T>(
  contractName: string,
  functionName: string,
  args?: any[],
  abi?: any[]
): ContractCallResult<T> {
  const chainId = useChainId();
  const [error, setError] = useState<string | null>(null);

  // Check if contract is deployed
  const contractDeployed = isContractDeployed(chainId, contractName);
  
  let contractAddress: `0x${string}` | undefined;
  try {
    contractAddress = contractDeployed ? getContractAddress(chainId, contractName) : undefined;
  } catch (err) {
    setError(`Contract ${contractName} not available on chain ${chainId}`);
  }

  const {
    data,
    isLoading,
    error: contractError,
    refetch
  } = useReadContract({
    address: contractAddress,
    abi: abi || [], // You'll need to provide the ABI
    functionName,
    args: args || [],
    query: {
      enabled: !!contractAddress && contractDeployed,
      retry: 3,
      retryDelay: 1000,
    }
  });

  const handleRefetch = useCallback(() => {
    setError(null);
    refetch();
  }, [refetch]);

  return {
    data: data as T | null,
    loading: isLoading,
    error: error || (contractError?.message) || null,
    refetch: handleRefetch
  };
}

// Safe contract write hook with error handling
export function useContractWriteSafe(
  contractName: string,
  functionName: string,
  abi?: any[]
): ContractWriteResult {
  const chainId = useChainId();
  const { isConnected } = useAccount();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Check if contract is deployed
  const contractDeployed = isContractDeployed(chainId, contractName);
  
  let contractAddress: `0x${string}` | undefined;
  try {
    contractAddress = contractDeployed ? getContractAddress(chainId, contractName) : undefined;
  } catch (err) {
    setError(`Contract ${contractName} not available on chain ${chainId}`);
  }

  const {
    writeContract,
    isPending,
    error: contractError,
    data: writeData
  } = useWriteContract({
    mutation: {
      onSuccess: (data) => {
        setSuccess(true);
        setTxHash(data);
        setError(null);
      },
      onError: (error) => {
        setError(error.message);
        setSuccess(false);
      }
    }
  });

  const safeWrite = useCallback((args?: any) => {
    if (!isConnected) {
      setError('Wallet not connected');
      return;
    }

    if (!contractAddress) {
      setError(`Contract ${contractName} not available`);
      return;
    }

    if (!contractDeployed) {
      setError(`Contract ${contractName} not deployed on this network`);
      return;
    }

    setError(null);
    setSuccess(false);
    
    try {
      writeContract({
        address: contractAddress,
        abi: abi || [],
        functionName,
        args: args || []
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transaction failed');
    }
  }, [writeContract, contractAddress, contractDeployed, isConnected, contractName, functionName, abi]);

  return {
    write: contractAddress && contractDeployed ? safeWrite : null,
    loading: isPending,
    error: error || (contractError?.message) || null,
    success,
    txHash
  };
}

// Hook for checking contract deployment status
export function useContractStatus(contractName: string) {
  const chainId = useChainId();
  
  const deployed = isContractDeployed(chainId, contractName);
  let address: `0x${string}` | null = null;
  
  try {
    address = deployed ? getContractAddress(chainId, contractName) : null;
  } catch {
    // Contract not found
  }

  return {
    deployed,
    address,
    chainId,
    available: deployed && !!address
  };
}