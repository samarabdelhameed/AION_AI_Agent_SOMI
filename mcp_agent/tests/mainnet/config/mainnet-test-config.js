/**
 * @fileoverview Mainnet Testing Configuration
 * @description Configuration for comprehensive mainnet testing with real data
 * @author AION Team
 */

export const MAINNET_TEST_CONFIG = {
  // Network configurations for BSC Mainnet
  networks: {
    bscMainnet: {
      name: 'BSC Mainnet',
      chainId: 56,
      rpcUrls: [
        'https://bsc-dataseed1.binance.org',
        'https://bsc-dataseed2.binance.org',
        'https://bsc-dataseed3.binance.org',
        'https://bsc-dataseed4.binance.org'
      ],
      blockExplorer: 'https://bscscan.com',
      nativeCurrency: {
        name: 'BNB',
        symbol: 'BNB',
        decimals: 18
      }
    }
  },

  // Real contract addresses on BSC Mainnet
  contracts: {
    // Venus Protocol Contracts
    venus: {
      comptroller: '0xfD36E2c2a6789Db23113685031d7F16329158384',
      vBNB: '0xA07c5b74C9B40447a954e1466938b865b6BBea36',
      vUSDT: '0xfD5840Cd36d94D7229439859C0112a4185BC0255',
      vBUSD: '0x95c78222B3D6e262426483D42CfA53685A67Ab9D',
      vETH: '0xf508fCD89b8bd15579dc79A6827cB4686A3592c8'
    },
    
    // PancakeSwap Contracts
    pancakeswap: {
      router: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
      factory: '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73',
      masterChef: '0xa5f8C5Dbd5F286960b9d90548680aE5ebFf07652'
    },
    
    // Common ERC20 tokens for testing
    tokens: {
      BUSD: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56',
      USDT: '0x55d398326f99059fF775485246999027B3197955',
      WBNB: '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c',
      CAKE: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82'
    }
  },

  // External API endpoints
  apis: {
    binance: {
      baseUrl: 'https://api.binance.com/api/v3',
      endpoints: {
        price: '/ticker/price',
        klines: '/klines',
        exchangeInfo: '/exchangeInfo'
      }
    },
    defillama: {
      baseUrl: 'https://api.llama.fi',
      endpoints: {
        protocols: '/protocols',
        tvl: '/tvl',
        yields: '/pools'
      }
    },
    venus: {
      baseUrl: 'https://api.venus.io/api',
      endpoints: {
        governance: '/governance/venus',
        markets: '/markets',
        vaults: '/vaults'
      }
    },
    coingecko: {
      baseUrl: 'https://api.coingecko.com/api/v3',
      endpoints: {
        price: '/simple/price',
        history: '/coins/{id}/market_chart'
      }
    }
  },

  // Performance thresholds for testing
  thresholds: {
    responseTime: {
      fast: 500,      // ms
      acceptable: 2000, // ms
      slow: 5000      // ms
    },
    successRate: {
      excellent: 0.99,
      good: 0.95,
      acceptable: 0.90
    },
    cache: {
      hitRatio: 0.80,
      ttl: 30000 // 30 seconds
    },
    memory: {
      maxUsage: 0.80, // 80% of available memory
      gcThreshold: 0.70
    },
    concurrent: {
      maxUsers: 100,
      maxRequests: 1000
    }
  },

  // Data validation rules
  validation: {
    bnbPrice: {
      min: 100,
      max: 10000,
      type: 'number'
    },
    apy: {
      min: 0,
      max: 1000,
      type: 'number'
    },
    tvl: {
      min: 100000,
      type: 'number'
    },
    timestamp: {
      maxAge: 300000, // 5 minutes in ms
      format: 'ISO'
    },
    gasPrice: {
      min: 1000000000, // 1 gwei in wei
      max: 100000000000, // 100 gwei in wei
      type: 'bigint'
    }
  },

  // Test timeouts
  timeouts: {
    unit: 10000,        // 10 seconds
    integration: 30000,  // 30 seconds
    performance: 120000, // 2 minutes
    endToEnd: 300000    // 5 minutes
  },

  // Retry configurations
  retry: {
    maxAttempts: 3,
    backoffMultiplier: 2,
    initialDelay: 1000
  },

  // Rate limiting configurations
  rateLimit: {
    binance: {
      requests: 1200,
      window: 60000 // 1 minute
    },
    defillama: {
      requests: 300,
      window: 60000
    },
    rpc: {
      requests: 100,
      window: 1000 // 1 second
    }
  },

  // Test data samples for validation
  testData: {
    validAddresses: [
      '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', // BUSD
      '0x55d398326f99059fF775485246999027B3197955', // USDT
      '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c'  // WBNB
    ],
    invalidAddresses: [
      '0x0000000000000000000000000000000000000000',
      '0x1234567890123456789012345678901234567890',
      'invalid-address'
    ],
    protocols: ['venus', 'pancakeswap', 'beefy', 'aave'],
    timeframes: ['1h', '24h', '7d', '30d']
  }
};

export default MAINNET_TEST_CONFIG;