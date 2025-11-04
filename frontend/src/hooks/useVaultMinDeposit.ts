import { useReadContract } from 'wagmi';
import { contractConfig } from '../lib/contractConfig';
import { useAccount } from 'wagmi';

export function useVaultMinDeposit() {
  const { chainId } = useAccount();
  
  const { data, isLoading, isError, refetch } = useReadContract({
    abi: contractConfig.vault.abi,
    address: contractConfig.vault.address,
    functionName: 'minDeposit',
    chainId,
  });

  return { 
    minDeposit: data ?? 0n, 
    isLoading, 
    isError, 
    refetch,
    chainId 
  };
}
