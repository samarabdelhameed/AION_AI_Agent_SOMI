import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: any) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock wagmi hooks
vi.mock('wagmi', () => ({
  http: vi.fn((url: string) => ({ url, type: 'http' })),
  useAccount: vi.fn(() => ({
    isConnected: true,
    address: '0x1234567890123456789012345678901234567890' as `0x${string}`,
    chainId: 97
  })),
  useChainId: vi.fn(() => 97),
  useBalance: vi.fn(() => ({
    data: { formatted: '1.0', value: BigInt('1000000000000000000') },
    isLoading: false
  })),
  useReadContract: vi.fn(() => ({
    data: BigInt('1000000000000000000'),
    isLoading: false,
    isError: false,
    error: null
  })),
  useWriteContract: vi.fn(() => ({
    writeContract: vi.fn(),
    isPending: false,
    isError: false,
    error: null
  })),
  useWaitForTransactionReceipt: vi.fn(() => ({
    data: { status: 'success', transactionHash: '0xmockhash' },
    isLoading: false,
    isError: false,
    error: null
  })),
  useConnect: vi.fn(() => ({
    connect: vi.fn(),
    connectors: [{ id: 'mock', name: 'Mock Connector' }],
    isPending: false,
    isError: false,
    error: null
  })),
  useDisconnect: vi.fn(() => ({
    disconnect: vi.fn(),
    isPending: false
  })),
  useSwitchChain: vi.fn(() => ({
    switchChain: vi.fn(),
    isPending: false,
    isError: false,
    error: null
  })),
  usePublicClient: vi.fn(() => ({
    readContract: vi.fn().mockResolvedValue(BigInt('1000000000000000000')),
    getBalance: vi.fn().mockResolvedValue(BigInt('1000000000000000000')),
    getBlockNumber: vi.fn().mockResolvedValue(BigInt('12345678'))
  })),
  useWalletClient: vi.fn(() => ({
    data: {
      writeContract: vi.fn().mockResolvedValue('0xmockhash'),
      signMessage: vi.fn().mockResolvedValue('0xmocksignature')
    },
    isLoading: false,
    isError: false,
    error: null
  })),
  createConfig: vi.fn(() => ({})),
  getAccount: vi.fn(() => ({
    address: '0x1234567890123456789012345678901234567890',
    isConnected: true
  })),
  readContract: vi.fn(() => Promise.resolve(BigInt('100000000000000000'))),
  writeContract: vi.fn(() => Promise.resolve('0x123456789abcdef')),
  waitForTransactionReceipt: vi.fn(() => Promise.resolve({ transactionHash: '0x123456789abcdef' })),
  getBalance: vi.fn(() => Promise.resolve({ value: BigInt('1000000000000000000') }))
}));

// Mock @rainbow-me/rainbowkit
vi.mock('@rainbow-me/rainbowkit', () => ({
  useConnectModal: vi.fn(() => ({
    openConnectModal: vi.fn()
  }))
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: 'div',
    button: 'button',
    h1: 'h1',
    p: 'p'
  },
  AnimatePresence: ({ children }: any) => children
}));

// Mock ethers
vi.mock('ethers', () => ({
  ethers: {
    utils: {
      formatEther: (value: any) => {
        if (typeof value === 'string') return parseFloat(value) / 1e18;
        if (value._hex) return parseFloat(value._hex) / 1e18;
        return parseFloat(value.toString()) / 1e18;
      }
    }
  }
}));