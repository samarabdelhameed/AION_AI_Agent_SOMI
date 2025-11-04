/**
 * @fileoverview Jest Test Setup
 * @description Global test setup and utilities
 */

const dotenv = require('dotenv');
const path = require('path');

// Load test environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Set test environment
process.env.NODE_ENV = 'test';

// Global test utilities
global.testUtils = {
  // Mock Ethereum address
  mockAddress: '0x1234567890123456789012345678901234567890',
  
  // Mock transaction hash
  mockTxHash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
  
  // Create mock request object
  createMockRequest: (body = {}, query = {}, headers = {}) => ({
    body,
    query,
    headers,
    ip: '127.0.0.1',
    method: 'GET',
    url: '/test'
  }),
  
  // Create mock reply object
  createMockReply: () => {
    const reply = {
      statusCode: 200,
      headers: {},
      sent: false,
      payload: null
    };
    
    reply.status = (code) => {
      reply.statusCode = code;
      return reply;
    };
    
    reply.send = (payload) => {
      reply.payload = payload;
      reply.sent = true;
      return reply;
    };
    
    reply.header = (key, value) => {
      reply.headers[key] = value;
      return reply;
    };
    
    return reply;
  },
  
  // Wait for async operations
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  // Generate random test data
  randomString: (length = 10) => Math.random().toString(36).substring(2, length + 2),
  randomNumber: (min = 0, max = 100) => Math.floor(Math.random() * (max - min + 1)) + min,
  randomAddress: () => '0x' + Math.random().toString(16).substr(2, 40),
  randomHash: () => '0x' + Math.random().toString(16).substr(2, 64)
};

// Global test constants
global.testConstants = {
  NETWORKS: {
    BSC_TESTNET: 'bscTestnet',
    BSC_MAINNET: 'bscMainnet',
    ETHEREUM: 'ethereum'
  },
  
  STRATEGIES: {
    VENUS: 'venus',
    BEEFY: 'beefy',
    PANCAKE: 'pancake',
    AAVE: 'aave'
  },
  
  ACTIONS: {
    DEPOSIT: 'deposit',
    WITHDRAW: 'withdraw',
    REBALANCE: 'rebalance'
  }
};

// Mock console methods for cleaner test output
const originalConsole = { ...console };
global.mockConsole = () => {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
  console.info = jest.fn();
};

global.restoreConsole = () => {
  Object.assign(console, originalConsole);
};

// Global test cleanup
afterEach(() => {
  jest.clearAllMocks();
});