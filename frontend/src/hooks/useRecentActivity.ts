import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { apiClient } from '../lib/api';
import { loadLocalActivities } from '../lib/localTimeline';

export type RecentItem = {
  id: string;
  type: 'deposit' | 'withdraw' | 'rebalance' | 'yield';
  amount?: number;
  currency?: string;
  status: 'completed' | 'pending' | 'failed';
  timestamp: string; // human readable or ISO
};

export function useRecentActivity(limit = 3) {
  const { address } = useAccount();
  const [items, setItems] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await apiClient.getTransactionHistory(address);
        const apiItems: RecentItem[] = (res.success && Array.isArray(res.data))
          ? (res.data as any[]).map((t, idx) => ({
              id: String(idx + 1),
              type: (t.type || 'deposit') as any,
              amount: t.amount,
              currency: t.currency || 'BNB',
              status: (t.status || 'completed') as any,
              timestamp: t.timestamp || new Date().toISOString(),
            }))
          : [];

        const local = loadLocalActivities().map((t) => ({
          id: `local-${t.id}`,
          type: t.type as any,
          amount: t.amount,
          currency: t.currency,
          status: t.status as any,
          timestamp: t.timestamp,
        }));

        const merged = [...local, ...apiItems]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, limit);
        if (!cancelled) setItems(merged);
      } catch {
        const local = loadLocalActivities().slice(0, limit).map((t) => ({
          id: `local-${t.id}`,
          type: t.type as any,
          amount: t.amount,
          currency: t.currency,
          status: t.status as any,
          timestamp: t.timestamp,
        }));
        if (!cancelled) setItems(local);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    // refresh on address change
    return () => { cancelled = true; };
  }, [address, limit]);

  return { items, loading };
}


