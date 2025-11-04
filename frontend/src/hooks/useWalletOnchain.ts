import { useState, useEffect } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { readContract } from 'wagmi/actions';
import { config } from '../lib/web3Config';
import { erc20Abi, formatUnits } from 'viem';

export function useWalletOnchain() {
  const { address, isConnected, chainId } = useAccount();
  const { data: nativeBalance, isLoading } = useBalance({
    address,
    watch: true,
  });
  const [usdc, setUsdc] = useState<number | undefined>(undefined);
  const [eth, setEth] = useState<number | undefined>(undefined);

  // Read ERC20 balances when address/chain change
  useEffect(() => {
    let cancelled = false;
    async function loadTokens() {
      try {
        if (!address || !chainId) { setUsdc(undefined); setEth(undefined); return; }
        const usdcAddr = (import.meta.env.VITE_USDC_ADDRESS as `0x${string}` | undefined);
        const ethAddr = (import.meta.env.VITE_ETH_ADDRESS as `0x${string}` | undefined);
        const calls: Array<Promise<bigint | null>> = [];
        if (usdcAddr) {
          calls.push(readContract(config, { abi: erc20Abi, address: usdcAddr, functionName: 'balanceOf', args: [address], chainId }).catch(() => null));
        } else { calls.push(Promise.resolve(null)); }
        if (ethAddr) {
          calls.push(readContract(config, { abi: erc20Abi, address: ethAddr, functionName: 'balanceOf', args: [address], chainId }).catch(() => null));
        } else { calls.push(Promise.resolve(null)); }
        const [usdcRaw, ethRaw] = await Promise.all(calls);
        if (cancelled) return;
        if (usdcRaw != null) setUsdc(parseFloat(formatUnits(usdcRaw, 18)));
        else setUsdc(undefined);
        if (ethRaw != null) setEth(parseFloat(formatUnits(ethRaw, 18)));
        else setEth(undefined);
      } catch {
        if (!cancelled) { setUsdc(undefined); setEth(undefined); }
      }
    }
    loadTokens();
    return () => { cancelled = true; };
  }, [address, chainId]);

  return {
    address,
    isConnected,
    chainId,
    balances: {
      BNB: nativeBalance ? Number(nativeBalance.formatted) : undefined,
      USDC: usdc,
      ETH: eth,
    },
    loading: isLoading,
  };
}


