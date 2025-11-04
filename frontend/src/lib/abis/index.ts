// AIONVault ABI extracted from JSON
export const AION_VAULT_ABI = [
  {
    "type": "fallback",
    "stateMutability": "payable"
  },
  {
    "type": "receive",
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "balanceOf",
    "inputs": [
      {
        "name": "user",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "balances",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "deposit",
    "inputs": [],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "type": "function",
    "name": "withdraw",
    "inputs": [
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "event",
    "name": "Deposited",
    "inputs": [
      {
        "name": "user",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "Withdrawn",
    "inputs": [
      {
        "name": "user",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  }
];

// Strategy Adapter ABI (same as AION Vault for now)
export const STRATEGY_ADAPTER_ABI = AION_VAULT_ABI;

// Test contracts ABI
export const TEST_CONTRACTS_ABI = [
  {
    "type": "function",
    "name": "name",
    "outputs": [{"type": "string"}],
    "stateMutability": "view"
  },
  {
    "type": "function", 
    "name": "protocolName",
    "outputs": [{"type": "string"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "totalAssets", 
    "outputs": [{"type": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "estimatedAPY",
    "outputs": [{"type": "uint256"}], 
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "riskLevel",
    "outputs": [{"type": "uint256"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isHealthy",
    "outputs": [{"type": "bool"}],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "lastUpdate", 
    "outputs": [{"type": "uint256"}],
    "stateMutability": "view"
  }
];

// Export all ABIs
export const ABIS = {
  AION_VAULT: AION_VAULT_ABI,
  TEST_CONTRACTS: TEST_CONTRACTS_ABI,
  STRATEGY_ADAPTER: STRATEGY_ADAPTER_ABI,
};

export default ABIS;
