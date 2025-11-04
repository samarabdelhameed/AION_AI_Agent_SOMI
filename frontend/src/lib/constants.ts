export const COLORS = {
  dark: {
    900: '#0B0B0F',
    800: '#1A1A22',
    700: '#2A2A35',
    600: '#3A3A45',
  },
  gold: {
    500: '#F5B300',
    400: '#F7C94C',
    600: '#D19B00',
  },
  neon: {
    cyan: '#23F0C7',
    purple: '#8B5CF6',
    pink: '#F472B6',
  }
};

export const NETWORKS = [
  { id: 'bsc', name: 'BNB Chain', currency: 'BNB', rpc: 'https://bsc-dataseed.binance.org/' },
  { id: 'ethereum', name: 'Ethereum', currency: 'ETH', rpc: 'https://cloudflare-eth.com/' },
  { id: 'polygon', name: 'Polygon', currency: 'MATIC', rpc: 'https://polygon-rpc.com/' },
];

export const STRATEGIES = [
  { 
    id: 'venus', 
    name: 'Venus Protocol', 
    apy: 8.45, 
    tvl: 2300000, 
    risk: 'low',
    description: 'Lending protocol on BNB Chain'
  },
  { 
    id: 'beefy', 
    name: 'Beefy Finance', 
    apy: 12.8, 
    tvl: 1800000, 
    risk: 'medium',
    description: 'Auto-compounding yield optimizer'
  },
  { 
    id: 'pancakeswap', 
    name: 'PancakeSwap', 
    apy: 15.2, 
    tvl: 980000, 
    risk: 'high',
    description: 'Decentralized exchange LP farming'
  },
];

export const DEMO_TRANSACTIONS = [
  {
    id: '1',
    type: 'deposit',
    amount: 0.5,
    currency: 'BNB',
    strategy: 'Venus Protocol',
    status: 'completed',
    timestamp: new Date(Date.now() - 3600000),
    hash: '0x123...abc',
  },
  {
    id: '2',
    type: 'rebalance',
    fromStrategy: 'Venus Protocol',
    toStrategy: 'Beefy Finance',
    status: 'pending',
    timestamp: new Date(Date.now() - 1800000),
    hash: '0x456...def',
  },
];

export const KPI_DATA = {
  tvl: 24500000,
  users: 12847,
  apy: 9.8,
  volume24h: 3400000,
};