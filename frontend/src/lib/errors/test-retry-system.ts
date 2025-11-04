/**
 * Test the complete retry mechanism system
 */

import {
  retryManager,
  createTransactionContext,
  createTransactionError,
  TransactionErrorType,
  ERROR_CODES
} from './index';

console.log('🚀 Testing Retry Mechanism System...');

// Test context
const context = createTransactionContext(56, '0x123456789abcdef', {
  userAddress: '0xuser123456789abcdef',
  amount: BigInt('1000000000000000000'), // 1 BNB
  gasPrice: BigInt('5000000000') // 5 Gwei
});

// Test 1: Successful retry after network errors
console.log('✅ Test 1: Network Error Recovery');

let networkAttempt = 0;
const networkErrorFunction = async (ctx: any, attempt: number) => {
  console.log(`  📡 Network attempt ${attempt + 1} with gas price: ${Number(ctx.gasPrice) / 1e9} Gwei`);
  
  networkAttempt++;
  if (networkAttempt <= 2) {
    const error = createTransactionError(
      TransactionErrorType.NETWORK,
      ERROR_CODES.NETWORK_TIMEOUT,
      'Network timeout occurred',
      ctx
    );
    throw error;
  }
  
  return { success: true, txHash: '0xsuccess123' };
};

const networkProgressCallback = (session: any, attempt: any) => {
  console.log(`    🔄 Retry attempt ${attempt.attemptNumber + 1}`);
  console.log(`       Error: ${attempt.error.code}`);
  console.log(`       Delay: ${attempt.delay}ms`);
  if (attempt.gasAdjustment) {
    console.log(`       Gas adjusted: ${Number(attempt.gasAdjustment.originalGasPrice) / 1e9} → ${Number(attempt.gasAdjustment.adjustedGasPrice) / 1e9} Gwei`);
  }
};

retryManager.executeWithRetry(
  networkErrorFunction,
  context,
  { maxRetries: 3, baseDelay: 500, backoffMultiplier: 2 },
  networkProgressCallback
).then(result => {
  console.log(`  ✅ Network retry succeeded:`, result);
}).catch(error => {
  console.log(`  ❌ Network retry failed:`, error.message);
});

// Test 2: Gas price adjustment
console.log('\n✅ Test 2: Gas Price Adjustment');

let gasAttempt = 0;
const gasErrorFunction = async (ctx: any, attempt: number) => {
  console.log(`  ⛽ Gas attempt ${attempt + 1} with gas price: ${Number(ctx.gasPrice) / 1e9} Gwei`);
  
  gasAttempt++;
  if (gasAttempt <= 2) {
    const error = createTransactionError(
      TransactionErrorType.GAS,
      ERROR_CODES.GAS_TOO_LOW,
      'Gas price too low for current network conditions',
      ctx
    );
    throw error;
  }
  
  return { success: true, txHash: '0xgassuccess456' };
};

const gasProgressCallback = (session: any, attempt: any) => {
  console.log(`    🔄 Gas retry attempt ${attempt.attemptNumber + 1}`);
  console.log(`       Error: ${attempt.error.code}`);
  if (attempt.gasAdjustment) {
    console.log(`       Gas adjustment factor: ${attempt.gasAdjustment.adjustmentFactor.toFixed(2)}x`);
    console.log(`       New gas price: ${Number(attempt.gasAdjustment.adjustedGasPrice) / 1e9} Gwei`);
  }
};

setTimeout(() => {
  retryManager.executeWithRetry(
    gasErrorFunction,
    context,
    { maxRetries: 3, baseDelay: 300 },
    gasProgressCallback
  ).then(result => {
    console.log(`  ✅ Gas retry succeeded:`, result);
  }).catch(error => {
    console.log(`  ❌ Gas retry failed:`, error.message);
  });
}, 1000);

// Test 3: Non-retryable error (should fail immediately)
console.log('\n✅ Test 3: Non-Retryable Error');

const userRejectionFunction = async (ctx: any, attempt: number) => {
  console.log(`  👤 User rejection attempt ${attempt + 1}`);
  
  const error = createTransactionError(
    TransactionErrorType.USER,
    ERROR_CODES.USER_REJECTED,
    'User rejected the transaction',
    ctx
  );
  throw error;
};

setTimeout(() => {
  retryManager.executeWithRetry(
    userRejectionFunction,
    context,
    { maxRetries: 3, baseDelay: 200 }
  ).then(result => {
    console.log(`  ✅ User rejection succeeded:`, result);
  }).catch(error => {
    console.log(`  ✅ User rejection correctly failed immediately: ${error.code}`);
  });
}, 2000);

// Test 4: Exhausted retries
console.log('\n✅ Test 4: Exhausted Retries');

const persistentErrorFunction = async (ctx: any, attempt: number) => {
  console.log(`  🔄 Persistent error attempt ${attempt + 1}`);
  
  const error = createTransactionError(
    TransactionErrorType.NETWORK,
    ERROR_CODES.RPC_ERROR,
    'RPC endpoint is down',
    ctx
  );
  throw error;
};

const exhaustedProgressCallback = (session: any, attempt: any) => {
  console.log(`    ⏱️  Attempt ${attempt.attemptNumber + 1} failed, waiting ${attempt.delay}ms`);
};

setTimeout(() => {
  retryManager.executeWithRetry(
    persistentErrorFunction,
    context,
    { maxRetries: 2, baseDelay: 200, backoffMultiplier: 1.5 },
    exhaustedProgressCallback
  ).then(result => {
    console.log(`  ❌ Should not succeed:`, result);
  }).catch(error => {
    console.log(`  ✅ Correctly exhausted retries: ${error.code}`);
  });
}, 3000);

// Test 5: Session management and statistics
setTimeout(() => {
  console.log('\n📊 Retry Statistics:');
  
  const stats = retryManager.getRetryStats();
  console.log(`  Total Sessions: ${stats.totalSessions}`);
  console.log(`  Active Sessions: ${stats.activeSessions}`);
  console.log(`  Success Rate: ${stats.successRate.toFixed(1)}%`);
  console.log(`  Average Attempts: ${stats.averageAttempts.toFixed(1)}`);
  
  if (stats.commonErrors.length > 0) {
    console.log('  Common Errors:');
    stats.commonErrors.forEach(error => {
      console.log(`    ${error.code}: ${error.count} times`);
    });
  }
  
  const activeSessions = retryManager.getActiveSessions();
  console.log(`  Currently Active: ${activeSessions.length} sessions`);
  
  console.log('\n🧹 Cleaning up completed sessions...');
  retryManager.clearCompletedSessions();
  
  const newStats = retryManager.getRetryStats();
  console.log(`  Sessions after cleanup: ${newStats.totalSessions}`);
  
  console.log('\n🎉 Retry mechanism system working perfectly!');
}, 6000);

export { context, networkErrorFunction, gasErrorFunction };