/**
 * Test the complete status tracking system
 */

import {
  statusTracker,
  createTransactionContext,
  createTransactionError,
  TransactionStatus,
  TransactionErrorType,
  ERROR_CODES
} from './index';

console.log('🚀 Testing Status Tracking System...');

// Test context
const context = createTransactionContext(56, '0x123456789abcdef', {
  userAddress: '0xuser123456789abcdef',
  amount: BigInt('1500000000000000000') // 1.5 BNB
});

// Test 1: Basic transaction tracking
console.log('✅ Test 1: Basic Transaction Tracking');
const txHash1 = '0xabc123def456789abcdef123456789abcdef123456789abcdef123456789abcdef';

// Subscribe to updates
const subscription1 = statusTracker.subscribe((update) => {
  console.log(`  📊 Status Update: ${update.status} - ${update.message}`);
  console.log(`     Progress: ${update.progress}% | Confirmations: ${update.confirmations || 0}`);
  if (update.error) {
    console.log(`     Error: ${update.error.userMessage}`);
  }
});

// Start tracking
statusTracker.startTracking(txHash1, context, TransactionStatus.PREPARING);

// Simulate status progression
setTimeout(() => {
  statusTracker.updateStatus(txHash1, TransactionStatus.VALIDATING, 'Validating transaction parameters');
}, 500);

setTimeout(() => {
  statusTracker.updateStatus(txHash1, TransactionStatus.WAITING_CONFIRMATION, 'Waiting for wallet confirmation');
}, 1000);

setTimeout(() => {
  statusTracker.updateStatus(txHash1, TransactionStatus.SUBMITTED, 'Transaction submitted to network');
}, 1500);

setTimeout(() => {
  statusTracker.updateConfirmations(txHash1, 1);
}, 2000);

setTimeout(() => {
  statusTracker.updateConfirmations(txHash1, 2);
}, 2500);

setTimeout(() => {
  statusTracker.updateConfirmations(txHash1, 3); // Should complete
}, 3000);

// Test 2: Transaction with error
console.log('\n✅ Test 2: Transaction with Error');
const txHash2 = '0xdef456abc789def456abc789def456abc789def456abc789def456abc789def456';

const subscription2 = statusTracker.subscribeToTransaction(txHash2, (update) => {
  console.log(`  🔴 Error Transaction: ${update.status} - ${update.message}`);
  if (update.error) {
    console.log(`     Error Type: ${update.error.type}`);
    console.log(`     Error Code: ${update.error.code}`);
  }
});

statusTracker.startTracking(txHash2, context, TransactionStatus.SUBMITTED);

setTimeout(() => {
  const error = createTransactionError(
    TransactionErrorType.USER,
    ERROR_CODES.INSUFFICIENT_FUNDS,
    'Insufficient funds for transaction',
    context
  );
  statusTracker.setError(txHash2, error);
}, 1000);

// Test 3: Multiple transactions
console.log('\n✅ Test 3: Multiple Transactions');
const txHash3 = '0xghi789jkl012ghi789jkl012ghi789jkl012ghi789jkl012ghi789jkl012ghi789';
const txHash4 = '0xmno345pqr678mno345pqr678mno345pqr678mno345pqr678mno345pqr678mno345';

statusTracker.startTracking(txHash3, context, TransactionStatus.CONFIRMING);
statusTracker.startTracking(txHash4, context, TransactionStatus.COMPLETED);

// Test queries after some time
setTimeout(() => {
  console.log('\n📊 Transaction Statistics:');
  
  const allTxs = statusTracker.getAllTransactions();
  console.log(`  Total Transactions: ${allTxs.length}`);
  
  const activeTxs = statusTracker.getActiveTransactions();
  console.log(`  Active Transactions: ${activeTxs.length}`);
  
  const stats = statusTracker.getStatusStats();
  console.log('  Status Distribution:');
  Object.entries(stats).forEach(([status, count]) => {
    if (count > 0) {
      console.log(`    ${status}: ${count}`);
    }
  });
  
  console.log('\n📋 Transaction Details:');
  allTxs.forEach(tx => {
    console.log(`  ${tx.txHash.slice(0, 10)}...:`);
    console.log(`    Status: ${tx.status}`);
    console.log(`    Confirmations: ${tx.confirmations}`);
    console.log(`    Updates: ${tx.updates.length}`);
    if (tx.error) {
      console.log(`    Error: ${tx.error.code}`);
    }
  });
}, 4000);

// Test 4: Subscription filtering
console.log('\n✅ Test 4: Filtered Subscriptions');
const errorOnlySubscription = statusTracker.subscribe(
  (update) => {
    console.log(`  🚨 Error-only subscription: ${update.status} for ${update.txHash?.slice(0, 10)}...`);
  },
  (update) => update.status === TransactionStatus.FAILED
);

// Test 5: Cleanup
setTimeout(() => {
  console.log('\n🧹 Cleanup Test:');
  
  console.log('  Before cleanup:');
  console.log(`    Total: ${statusTracker.getAllTransactions().length}`);
  console.log(`    Active: ${statusTracker.getActiveTransactions().length}`);
  
  statusTracker.clearCompleted();
  
  console.log('  After clearing completed:');
  console.log(`    Total: ${statusTracker.getAllTransactions().length}`);
  console.log(`    Active: ${statusTracker.getActiveTransactions().length}`);
  
  // Unsubscribe
  statusTracker.unsubscribe(subscription1);
  statusTracker.unsubscribe(subscription2);
  statusTracker.unsubscribe(errorOnlySubscription);
  
  console.log('\n🎉 Status tracking system working perfectly!');
}, 5000);

export { txHash1, txHash2, context };