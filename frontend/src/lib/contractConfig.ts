// AIONVault ABI - Core vault functions
export const VAULT_ABI = [
  {
    inputs: [{ name: "user", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "user", type: "address" }],
    name: "sharesOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "user", type: "address" }],
    name: "principalOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalAssets",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalShares",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "currentAdapter",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "minDeposit",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "amount", type: "uint256" }],
    name: "deposit",
    outputs: [{ name: "shares", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "deposit",
    outputs: [{ name: "shares", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ name: "shares", type: "uint256" }],
    name: "withdrawShares",
    outputs: [{ name: "amount", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "amount", type: "uint256" }],
    name: "withdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "withdrawAll",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "_adapter", type: "address" }],
    name: "setCurrentAdapter",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "claimYield",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [{ name: "user", type: "address" }],
    name: "userYieldClaimed",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "accumulatedYield",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  }
] as const;

// Strategy Adapter ABI - Unified interface for all strategies
export const STRATEGY_ADAPTER_ABI = [
  {
    inputs: [],
    name: "name",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "protocolName",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalAssets",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalShares",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "estimatedAPY",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "riskLevel",
    outputs: [{ name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "isHealthy",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "lastUpdate",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "underlying",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "user", type: "address" }],
    name: "sharesOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "user", type: "address" }],
    name: "principalOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "user", type: "address" }],
    name: "userAccrued",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "protocolSnapshot",
    outputs: [
      {
        components: [
          { name: "apyBps", type: "uint256" },
          { name: "tvl", type: "uint256" },
          { name: "liquidity", type: "uint256" },
          { name: "utilization", type: "uint256" },
          { name: "lastUpdate", type: "uint256" },
          { name: "isHealthy", type: "bool" },
          { name: "protocolName", type: "string" },
        ],
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "amount", type: "uint256" }],
    name: "deposit",
    outputs: [{ name: "shares", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [{ name: "shares", type: "uint256" }],
    name: "withdraw",
    outputs: [{ name: "amount", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// Strategy Contract ABI - For legacy strategy contracts
export const STRATEGY_ABI = [
  {
    inputs: [],
    name: "strategyName",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "strategyType",
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "estimatedAPY",
    outputs: [{ name: "", type: "int256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalAssets",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "user", type: "address" }],
    name: "principalOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "user", type: "address" }],
    name: "getYield",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// Simple ABI for testing - includes minDeposit function
const SIMPLE_VAULT_ABI = [
  {
    "inputs": [],
    "name": "minDeposit",
    "outputs": [{"type": "uint256"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "deposit",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }
] as const;

// Contract Configuration - REAL DEPLOYED ADDRESSES
export const contractConfig = {
  vault: {
    address: import.meta.env.VITE_VAULT_ADDRESS_MAINNET as `0x${string}` || '0xB176c1FA7B3feC56cB23681B6E447A7AE60C5254', // ✅ REAL AIONVault Mainnet Address
    abi: VAULT_ABI
  },
  adapters: {
    venus: {
      address: import.meta.env.VITE_ADAPTER_VENUS as `0x${string}`,
      abi: STRATEGY_ADAPTER_ABI
    },
    beefy: {
      address: import.meta.env.VITE_ADAPTER_BEEFY as `0x${string}`,
      abi: STRATEGY_ADAPTER_ABI
    },
    pancakeswap: {
      address: import.meta.env.VITE_ADAPTER_PANCAKE as `0x${string}`,
      abi: STRATEGY_ADAPTER_ABI
    },
    aave: {
      address: import.meta.env.VITE_ADAPTER_AAVE as `0x${string}`,
      abi: STRATEGY_ADAPTER_ABI
    },
    compound: {
      address: import.meta.env.VITE_ADAPTER_COMPOUND as `0x${string}`,
      abi: STRATEGY_ADAPTER_ABI
    },
    uniswap: {
      address: import.meta.env.VITE_ADAPTER_UNISWAP as `0x${string}`,
      abi: STRATEGY_ADAPTER_ABI
    },
    wombat: {
      address: import.meta.env.VITE_ADAPTER_WOMBAT as `0x${string}`,
      abi: STRATEGY_ADAPTER_ABI
    },
    morpho: {
      address: import.meta.env.VITE_ADAPTER_MORPHO as `0x${string}`,
      abi: STRATEGY_ADAPTER_ABI
    }
  },
  strategies: {
    venus: {
      address: import.meta.env.VITE_STRATEGY_VENUS_MAINNET as `0x${string}` || '0x9D20A69E95CFEc37E5BC22c0D4218A705d90EdcB',
      abi: STRATEGY_ABI
    },
    beefy: {
      address: import.meta.env.VITE_STRATEGY_BEEFY_MAINNET as `0x${string}` || '0x3a5EB0C7c7Ae43598cd31A1e23Fd722e40ceF5F4',
      abi: STRATEGY_ABI
    },
    pancakeswap: {
      address: import.meta.env.VITE_STRATEGY_PANCAKE_MAINNET as `0x${string}` || '0xf2116eE783Be82ba51a6Eda9453dFD6A1723d205',
      abi: STRATEGY_ABI
    },
    aave: {
      address: import.meta.env.VITE_STRATEGY_AAVE_MAINNET as `0x${string}` || '0xd34A6Cbc0f9Aab0B2896aeFb957cB00485CD56Db',
      abi: STRATEGY_ABI
    },
    compound: {
      address: import.meta.env.VITE_STRATEGY_COMPOUND_MAINNET as `0x${string}` || '0x5B7575272cB12317EB5D8E8D9620A9A34A7a3dE4',
      abi: STRATEGY_ABI
    },
    uniswap: {
      address: import.meta.env.VITE_STRATEGY_UNISWAP_MAINNET as `0x${string}` || '0xBd992799d17991933316de4340135C5f240334E6',
      abi: STRATEGY_ABI
    },
    wombat: {
      address: import.meta.env.VITE_STRATEGY_WOMBAT_MAINNET as `0x${string}` || '0xF8C5804Bdf6875EBB6cCf70Fc7f3ee6745Cecd98',
      abi: STRATEGY_ABI
    },
    morpho: {
      address: import.meta.env.VITE_STRATEGY_MORPHO_MAINNET as `0x${string}` || '0x75B0EF811CB728aFdaF395a0b17341fb426c26dD',
      abi: STRATEGY_ABI
    }
  }
};

// Network Configuration
export const networkConfig = {
  bscTestnet: {
    chainId: 97,
    name: 'BSC Testnet',
    rpcUrl: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
    blockExplorer: 'https://testnet.bscscan.com'
  },
  bscMainnet: {
    chainId: 56,
    name: 'BSC Mainnet',
    rpcUrl: 'https://bsc-dataseed1.binance.org/',
    blockExplorer: 'https://bscscan.com'
  }
};

// Default network - Updated to Mainnet
export const DEFAULT_NETWORK = networkConfig.bscMainnet;

// Protocol Information
export const PROTOCOL_INFO = {
  venus: {
    name: 'Venus Protocol',
    description: 'BNBChain Native Lending Protocol',
    website: 'https://venus.io',
    logo: '🌟',
    riskLevel: 2,
    expectedAPY: 4.83
  },
  beefy: {
    name: 'Beefy Finance',
    description: 'Multi-Chain Yield Farming Aggregator',
    website: 'https://beefy.finance',
    logo: '🐄',
    riskLevel: 3,
    expectedAPY: 8.7
  },
  pancakeswap: {
    name: 'PancakeSwap',
    description: 'BNBChain DEX with Yield Farming',
    website: 'https://pancakeswap.finance',
    logo: '🥞',
    riskLevel: 3,
    expectedAPY: 12.4
  },
  aave: {
    name: 'Aave Protocol',
    description: 'Multi-Asset Lending Protocol',
    website: 'https://aave.com',
    logo: '🏛️',
    riskLevel: 2,
    expectedAPY: 6.2
  },
  compound: {
    name: 'Compound Protocol',
    description: 'Algorithmic Interest Rate Protocol',
    website: 'https://compound.finance',
    logo: '🏦',
    riskLevel: 2,
    expectedAPY: 7.0
  },
  uniswap: {
    name: 'Uniswap',
    description: 'Decentralized Exchange Protocol',
    website: 'https://uniswap.org',
    logo: '🦄',
    riskLevel: 3,
    expectedAPY: 12.0
  },
  wombat: {
    name: 'Wombat AMM',
    description: 'Stable Asset AMM with IL Protection',
    website: 'https://wombat.exchange',
    logo: '🦘',
    riskLevel: 2,
    expectedAPY: 11.0
  },
  morpho: {
    name: 'Morpho Protocol',
    description: 'Optimized Lending Protocol',
    website: 'https://morpho.org',
    logo: '🦋',
    riskLevel: 2,
    expectedAPY: 12.0
  }
};

// Export adapters separately for easier access
export const adapters = {
  venus:       { address: import.meta.env.VITE_ADAPTER_VENUS as `0x${string}`, abi: STRATEGY_ADAPTER_ABI },
  beefy:       { address: import.meta.env.VITE_ADAPTER_BEEFY as `0x${string}`, abi: STRATEGY_ADAPTER_ABI },
  pancakeswap: { address: import.meta.env.VITE_ADAPTER_PANCAKE as `0x${string}`, abi: STRATEGY_ADAPTER_ABI },
  aave:        { address: import.meta.env.VITE_ADAPTER_AAVE as `0x${string}`, abi: STRATEGY_ADAPTER_ABI },
  compound:    { address: import.meta.env.VITE_ADAPTER_COMPOUND as `0x${string}`, abi: STRATEGY_ADAPTER_ABI },
  uniswap:    { address: import.meta.env.VITE_ADAPTER_UNISWAP as `0x${string}`, abi: STRATEGY_ADAPTER_ABI },
  wombat:     { address: import.meta.env.VITE_ADAPTER_WOMBAT as `0x${string}`, abi: STRATEGY_ADAPTER_ABI },
  morpho:     { address: import.meta.env.VITE_ADAPTER_MORPHO as `0x${string}`, abi: STRATEGY_ADAPTER_ABI },
} as const;