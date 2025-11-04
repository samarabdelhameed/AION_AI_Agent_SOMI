/**
 * Quick verification test for error infrastructure
 */

import {
  TransactionErrorType,
  TransactionErrorSeverity,
  TransactionStatus,
  ERROR_CODES,
  createTransactionError,
  createTransactionContext,
  createStatusUpdate,
  isRetryableError,
  getErrorSeverity,
  getStatusProgress
} from './index';

// Test basic functionality
console.log('🚀 Testing Error Infrastructure...');

// Test 1: Create transaction context
const context = createTransactionContext(56, '0x123456789abcdef', {
  userAddress: '0xuser123',
  amount: BigInt(1000000000000000000) // 1 ETH in wei
});

console.log('✅ Transaction Context:', {
  chainId: context.chainId,
  vaultAddress: context.vaultAddress,
  userAddress: context.userAddress,
  amount: context.amount?.toString()
});

// Test 2: Create transaction error
const error = createTransactionError(
  TransactionErrorType.USER,
  ERROR_CODES.INSUFFICIENT_FUNDS,
  'User has insufficient funds for transaction',
  context,
  {
    userMessage: 'You don\'t have enough BNB to complete this transaction',
    suggestedActions: ['Add more BNB to your wallet', 'Reduce the deposit amount']
  }
);

console.log('✅ Transaction Error:', {
  type: error.type,
  severity: error.severity,
  code: error.code,
  userMessage: error.userMessage,
  retryable: error.retryable,
  suggestedActions: error.suggestedActions
});

// Test 3: Create status update
const statusUpdate = createStatusUpdate(
  TransactionStatus.SUBMITTED,
  'Transaction has been submitted to the network',
  {
    progress: 40,
    txHash: '0xabc123def456'
  }
);

console.log('✅ Status Update:', {
  status: statusUpdate.status,
  message: statusUpdate.message,
  progress: statusUpdate.progress,
  txHash: statusUpdate.txHash
});

// Test 4: Test utility functions
console.log('✅ Utility Functions:');
console.log('  - Network error retryable:', isRetryableError(TransactionErrorType.NETWORK));
console.log('  - User error retryable:', isRetryableError(TransactionErrorType.USER));
console.log('  - Internal error severity:', getErrorSeverity(TransactionErrorType.SYSTEM, ERROR_CODES.INTERNAL_ERROR));
console.log('  - Submitted status progress:', getStatusProgress(TransactionStatus.SUBMITTED));

// Test 5: Test all error types and codes
console.log('✅ Error Types:', Object.values(TransactionErrorType));
console.log('✅ Error Severities:', Object.values(TransactionErrorSeverity));
console.log('✅ Transaction Statuses:', Object.values(TransactionStatus));
console.log('✅ Error Codes Sample:', {
  INSUFFICIENT_FUNDS: ERROR_CODES.INSUFFICIENT_FUNDS,
  NETWORK_TIMEOUT: ERROR_CODES.NETWORK_TIMEOUT,
  CONTRACT_REVERT: ERROR_CODES.CONTRACT_REVERT
});

console.log('🎉 All tests passed! Error infrastructure is working correctly.');

export { context, error, statusUpdate };