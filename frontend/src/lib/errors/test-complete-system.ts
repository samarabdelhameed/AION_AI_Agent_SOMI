/**
 * Complete system test for error classification and detection
 */

import { 
  ErrorHandler, 
  Web3ErrorParser, 
  createTransactionContext,
  TransactionErrorType,
  ERROR_CODES 
} from './index';

console.log('🚀 Testing Complete Error Classification System...');

const errorHandler = new ErrorHandler();
const web3Parser = new Web3ErrorParser();
const context = createTransactionContext(56, '0x123456789abcdef', {
  userAddress: '0xuser123',
  amount: BigInt(1000000000000000000)
});

// Test cases covering all error types
const testCases = [
  // Network Errors
  {
    name: 'Network Timeout',
    error: { message: 'Network timeout occurred' },
    expectedType: TransactionErrorType.NETWORK,
    expectedCode: ERROR_CODES.NETWORK_TIMEOUT
  },
  {
    name: 'RPC Error',
    error: { message: 'RPC call failed' },
    expectedType: TransactionErrorType.NETWORK,
    expectedCode: ERROR_CODES.RPC_ERROR
  },

  // User Errors
  {
    name: 'Insufficient Funds',
    error: { message: 'Insufficient funds for transaction' },
    expectedType: TransactionErrorType.USER,
    expectedCode: ERROR_CODES.INSUFFICIENT_FUNDS
  },
  {
    name: 'User Rejection (Wagmi)',
    error: { 
      name: 'UserRejectedRequestError',
      shortMessage: 'User rejected the request' 
    },
    expectedType: TransactionErrorType.USER,
    expectedCode: ERROR_CODES.USER_REJECTED
  },
  {
    name: 'User Rejection (Wallet)',
    error: { code: 4001, message: 'User rejected the request' },
    expectedType: TransactionErrorType.USER,
    expectedCode: ERROR_CODES.USER_REJECTED
  },

  // Contract Errors
  {
    name: 'Contract Revert',
    error: { message: 'Transaction reverted without reason' },
    expectedType: TransactionErrorType.CONTRACT,
    expectedCode: ERROR_CODES.CONTRACT_REVERT
  },
  {
    name: 'Contract Revert (Wagmi)',
    error: { 
      name: 'ContractFunctionExecutionError',
      shortMessage: 'Contract execution failed',
      cause: { reason: 'Vault is paused' }
    },
    expectedType: TransactionErrorType.CONTRACT,
    expectedCode: ERROR_CODES.CONTRACT_REVERT
  },
  {
    name: 'Contract Not Found',
    error: { message: 'Contract not deployed on this network' },
    expectedType: TransactionErrorType.CONTRACT,
    expectedCode: ERROR_CODES.CONTRACT_NOT_FOUND
  },

  // Gas Errors
  {
    name: 'Gas Too Low',
    error: { message: 'Gas price too low for current network conditions' },
    expectedType: TransactionErrorType.GAS,
    expectedCode: ERROR_CODES.GAS_TOO_LOW
  },
  {
    name: 'Out of Gas',
    error: { message: 'Transaction ran out of gas' },
    expectedType: TransactionErrorType.GAS,
    expectedCode: ERROR_CODES.OUT_OF_GAS
  },
  {
    name: 'Gas Estimation Failed (Wagmi)',
    error: { 
      name: 'EstimateGasExecutionError',
      shortMessage: 'Gas estimation failed' 
    },
    expectedType: TransactionErrorType.GAS,
    expectedCode: ERROR_CODES.GAS_ESTIMATION_FAILED
  },

  // Validation Errors
  {
    name: 'Invalid Address',
    error: { message: 'Invalid address format provided' },
    expectedType: TransactionErrorType.VALIDATION,
    expectedCode: ERROR_CODES.INVALID_ADDRESS
  },
  {
    name: 'Wrong Network',
    error: { message: 'Connected to wrong network' },
    expectedType: TransactionErrorType.VALIDATION,
    expectedCode: ERROR_CODES.INVALID_CHAIN
  },
  {
    name: 'Below Minimum Deposit',
    error: { message: 'Amount below minimum deposit requirement' },
    expectedType: TransactionErrorType.VALIDATION,
    expectedCode: ERROR_CODES.BELOW_MIN_DEPOSIT
  },

  // System Errors
  {
    name: 'Configuration Error',
    error: { message: 'System configuration error detected' },
    expectedType: TransactionErrorType.SYSTEM,
    expectedCode: ERROR_CODES.CONFIG_ERROR
  },
  {
    name: 'Internal Error',
    error: { message: 'An internal error occurred' },
    expectedType: TransactionErrorType.SYSTEM,
    expectedCode: ERROR_CODES.INTERNAL_ERROR
  }
];

console.log('\n📋 Running Error Classification Tests...\n');

let passedTests = 0;
let totalTests = testCases.length;

testCases.forEach((testCase, index) => {
  try {
    const result = errorHandler.handleError(testCase.error, context);
    
    const typeMatch = result.type === testCase.expectedType;
    const codeMatch = result.code === testCase.expectedCode;
    const hasUserMessage = result.userMessage && result.userMessage.length > 0;
    const hasSuggestedActions = result.suggestedActions && result.suggestedActions.length > 0;
    const hasTimestamp = result.timestamp && result.timestamp.length > 0;
    const hasContext = result.context === context;
    
    const allChecks = typeMatch && codeMatch && hasUserMessage && hasSuggestedActions && hasTimestamp && hasContext;
    
    if (allChecks) {
      passedTests++;
      console.log(`✅ ${index + 1}. ${testCase.name}`);
      console.log(`   Type: ${result.type} | Code: ${result.code} | Retryable: ${result.retryable}`);
      console.log(`   User Message: "${result.userMessage}"`);
      console.log(`   Actions: [${result.suggestedActions.join(', ')}]`);
    } else {
      console.log(`❌ ${index + 1}. ${testCase.name}`);
      console.log(`   Expected: ${testCase.expectedType}/${testCase.expectedCode}`);
      console.log(`   Got: ${result.type}/${result.code}`);
      console.log(`   Checks: Type=${typeMatch}, Code=${codeMatch}, UserMsg=${hasUserMessage}, Actions=${hasSuggestedActions}`);
    }
    console.log('');
  } catch (error) {
    console.log(`💥 ${index + 1}. ${testCase.name} - FAILED WITH EXCEPTION:`);
    console.log(`   Error: ${error}`);
    console.log('');
  }
});

console.log(`\n📊 Test Results: ${passedTests}/${totalTests} tests passed (${Math.round(passedTests/totalTests*100)}%)`);

// Test Web3 Parser directly
console.log('\n🔍 Testing Web3ErrorParser Directly...\n');

const web3TestCases = [
  {
    name: 'Wagmi User Rejection',
    error: { name: 'UserRejectedRequestError', shortMessage: 'User rejected' }
  },
  {
    name: 'Ethers Insufficient Funds',
    error: { code: 'INSUFFICIENT_FUNDS', message: 'insufficient funds' }
  },
  {
    name: 'RPC Execution Reverted',
    error: { code: -32000, message: 'execution reverted' }
  }
];

web3TestCases.forEach((testCase, index) => {
  try {
    const result = web3Parser.parseWeb3Error(testCase.error);
    console.log(`✅ ${index + 1}. ${testCase.name}`);
    console.log(`   Type: ${result.type} | Code: ${result.code}`);
    console.log(`   Parsed: "${result.parsedMessage}"`);
    console.log(`   Retryable: ${result.retryable}`);
    console.log('');
  } catch (error) {
    console.log(`❌ ${index + 1}. ${testCase.name} - FAILED: ${error}`);
    console.log('');
  }
});

// Test utility functions
console.log('🛠️ Testing Utility Functions...\n');

const utilityTests = [
  {
    name: 'Network Error Detection',
    test: () => web3Parser.isNetworkError({ message: 'network timeout' }),
    expected: true
  },
  {
    name: 'Gas Error Detection',
    test: () => web3Parser.isInsufficientGasError({ message: 'out of gas' }),
    expected: true
  },
  {
    name: 'User Rejection Detection',
    test: () => web3Parser.isUserRejectionError({ code: 4001 }),
    expected: true
  },
  {
    name: 'Gas Adjustment Suggestion',
    test: () => {
      const adjustment = web3Parser.getSuggestedGasAdjustment({ message: 'gas too low' });
      return adjustment.gasPrice === 1.2;
    },
    expected: true
  }
];

utilityTests.forEach((test, index) => {
  try {
    const result = test.test();
    const status = result === test.expected ? '✅' : '❌';
    console.log(`${status} ${index + 1}. ${test.name}: ${result}`);
  } catch (error) {
    console.log(`💥 ${index + 1}. ${test.name} - EXCEPTION: ${error}`);
  }
});

console.log('\n🎉 Error Classification and Detection System Testing Complete!');

export { errorHandler, web3Parser, context, testCases };