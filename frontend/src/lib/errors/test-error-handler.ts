/**
 * Quick test for ErrorHandler functionality
 */

import { ErrorHandler, createTransactionContext, TransactionErrorType, ERROR_CODES } from './index';

console.log('🚀 Testing ErrorHandler...');

const errorHandler = new ErrorHandler();
const context = createTransactionContext(56, '0x123456789abcdef', {
  userAddress: '0xuser123',
  amount: BigInt(1000000000000000000)
});

// Test 1: Network Error
console.log('\n✅ Test 1: Network Error');
const networkError = errorHandler.handleError(
  { message: 'Network timeout occurred' },
  context
);
console.log('Type:', networkError.type);
console.log('Code:', networkError.code);
console.log('User Message:', networkError.userMessage);
console.log('Retryable:', networkError.retryable);
console.log('Actions:', networkError.suggestedActions);

// Test 2: User Error (Insufficient Funds)
console.log('\n✅ Test 2: User Error (Insufficient Funds)');
const userError = errorHandler.handleError(
  { message: 'Insufficient funds for transaction' },
  context
);
console.log('Type:', userError.type);
console.log('Code:', userError.code);
console.log('User Message:', userError.userMessage);
console.log('Retryable:', userError.retryable);
console.log('Actions:', userError.suggestedActions);

// Test 3: Contract Error
console.log('\n✅ Test 3: Contract Error');
const contractError = errorHandler.handleError(
  { message: 'Transaction reverted without reason' },
  context
);
console.log('Type:', contractError.type);
console.log('Code:', contractError.code);
console.log('User Message:', contractError.userMessage);
console.log('Retryable:', contractError.retryable);

// Test 4: Gas Error
console.log('\n✅ Test 4: Gas Error');
const gasError = errorHandler.handleError(
  { message: 'Gas too low for current network conditions' },
  context
);
console.log('Type:', gasError.type);
console.log('Code:', gasError.code);
console.log('User Message:', gasError.userMessage);
console.log('Retryable:', gasError.retryable);

// Test 5: Error Classification
console.log('\n✅ Test 5: Error Classification');
const testErrors = [
  'Network timeout',
  'User rejected transaction',
  'Contract not deployed',
  'Gas estimation failed',
  'Invalid address format',
  'Configuration error'
];

testErrors.forEach(errorMsg => {
  const type = errorHandler.categorizeError({ message: errorMsg });
  console.log(`"${errorMsg}" -> ${type}`);
});

// Test 6: Retry Logic
console.log('\n✅ Test 6: Retry Logic');
const retryTests = [
  { type: TransactionErrorType.NETWORK, code: ERROR_CODES.NETWORK_TIMEOUT, expected: true },
  { type: TransactionErrorType.GAS, code: ERROR_CODES.GAS_TOO_LOW, expected: true },
  { type: TransactionErrorType.USER, code: ERROR_CODES.USER_REJECTED, expected: false },
  { type: TransactionErrorType.USER, code: ERROR_CODES.INSUFFICIENT_FUNDS, expected: false },
  { type: TransactionErrorType.VALIDATION, code: ERROR_CODES.INVALID_ADDRESS, expected: false }
];

retryTests.forEach(test => {
  const shouldRetry = errorHandler.shouldRetry(test.type, test.code, {});
  const status = shouldRetry === test.expected ? '✅' : '❌';
  console.log(`${status} ${test.type}/${test.code} -> Retry: ${shouldRetry}`);
});

console.log('\n🎉 ErrorHandler tests completed!');

export { errorHandler, context };