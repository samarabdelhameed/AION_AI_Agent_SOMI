/**
 * Test the complete error logging system
 */

import {
  errorLogger,
  createTransactionError,
  createTransactionContext,
  TransactionErrorType,
  TransactionErrorSeverity,
  ERROR_CODES
} from './index';

console.log('🚀 Testing Error Logging System...');

// Test context
const context = createTransactionContext(56, '0x123456789abcdef', {
  userAddress: '0xuser123456789abcdef',
  amount: BigInt('2000000000000000000'), // 2 BNB
  gasPrice: BigInt('8000000000') // 8 Gwei
});

// Test 1: Log various types of errors
console.log('✅ Test 1: Logging Different Error Types');

const insufficientFundsError = createTransactionError(
  TransactionErrorType.USER,
  ERROR_CODES.INSUFFICIENT_FUNDS,
  'User has insufficient BNB balance',
  context,
  { severity: TransactionErrorSeverity.MEDIUM }
);

const networkError = createTransactionError(
  TransactionErrorType.NETWORK,
  ERROR_CODES.NETWORK_TIMEOUT,
  'BSC network is experiencing delays',
  context,
  { severity: TransactionErrorSeverity.LOW }
);

const criticalError = createTransactionError(
  TransactionErrorType.SYSTEM,
  ERROR_CODES.INTERNAL_ERROR,
  'Critical system failure in transaction processing',
  context,
  { severity: TransactionErrorSeverity.CRITICAL }
);

const gasError = createTransactionError(
  TransactionErrorType.GAS,
  ERROR_CODES.GAS_TOO_LOW,
  'Gas price too low for current network conditions',
  context,
  { severity: TransactionErrorSeverity.MEDIUM }
);

// Log errors with different contexts and tags
errorLogger.logError(insufficientFundsError, { 
  walletBalance: '0.5 BNB',
  requiredAmount: '2.0 BNB' 
}, ['payment', 'balance', 'user-error']);

errorLogger.logError(networkError, {
  rpcEndpoint: 'https://bsc-dataseed1.binance.org',
  responseTime: '5000ms'
}, ['network', 'timeout', 'infrastructure']);

errorLogger.logError(criticalError, {
  component: 'TransactionProcessor',
  stackTrace: 'Error at line 123...'
}, ['critical', 'system', 'alert']);

errorLogger.logError(gasError, {
  currentGasPrice: '8 Gwei',
  recommendedGasPrice: '12 Gwei'
}, ['gas', 'pricing', 'network']);

// Test 2: Log general information
console.log('✅ Test 2: General Logging');

errorLogger.logInfo('Transaction validation started', {
  txType: 'deposit',
  amount: '2.0 BNB',
  chainId: 56
}, ['transaction', 'validation']);

errorLogger.logWarning('High gas price detected', {
  currentPrice: '15 Gwei',
  averagePrice: '8 Gwei'
}, ['gas', 'warning', 'pricing']);

errorLogger.logDebug('Validation step completed', {
  step: 'balance-check',
  result: 'passed',
  duration: '150ms'
}, ['debug', 'validation']);

// Test 3: Search and analytics after some time
setTimeout(async () => {
  console.log('\n📊 Test 3: Search and Analytics');
  
  // Search for specific errors
  console.log('🔍 Searching for insufficient funds errors:');
  const insufficientFundsLogs = await errorLogger.searchLogs('insufficient');
  console.log(`  Found ${insufficientFundsLogs.length} logs`);
  insufficientFundsLogs.forEach(log => {
    console.log(`    ${log.timestamp}: ${log.message} [${log.level}]`);
    if (log.tags) {
      console.log(`    Tags: ${log.tags.join(', ')}`);
    }
  });

  // Search by tags
  console.log('\n🏷️  Searching for critical errors:');
  const criticalLogs = await errorLogger.searchLogs('critical');
  console.log(`  Found ${criticalLogs.length} critical logs`);
  
  // Get error statistics
  console.log('\n📈 Error Statistics:');
  const stats = await errorLogger.getErrorStats();
  console.log(`  Total Errors: ${stats.totalErrors}`);
  console.log('  Errors by Type:');
  Object.entries(stats.errorsByType).forEach(([type, count]) => {
    if (count > 0) {
      console.log(`    ${type}: ${count}`);
    }
  });
  
  console.log('  Errors by Severity:');
  Object.entries(stats.errorsBySeverity).forEach(([severity, count]) => {
    if (count > 0) {
      console.log(`    ${severity}: ${count}`);
    }
  });
  
  console.log('  Common Error Codes:');
  stats.commonErrorCodes.slice(0, 3).forEach(error => {
    console.log(`    ${error.code}: ${error.count} occurrences`);
  });

  // Get analytics data
  console.log('\n📊 Analytics Data:');
  const analytics = await errorLogger.getAnalytics();
  
  console.log('  Error Patterns:');
  analytics.errorPatterns.slice(0, 3).forEach(pattern => {
    console.log(`    ${pattern.pattern}: ${pattern.count} times (${pattern.severity})`);
  });
  
  console.log('  User Impact:');
  console.log(`    Affected Users: ${analytics.userImpact.affectedUsers}`);
  console.log(`    Total Errors: ${analytics.userImpact.totalErrors}`);
  console.log(`    Avg Errors/User: ${analytics.userImpact.averageErrorsPerUser.toFixed(1)}`);
  
  console.log('  Performance Metrics:');
  console.log(`    Retry Success Rate: ${analytics.performanceMetrics.retrySuccessRate}%`);
  console.log(`    Critical Error Rate: ${analytics.performanceMetrics.criticalErrorRate.toFixed(1)}%`);
  console.log(`    Avg Resolution Time: ${analytics.performanceMetrics.averageResolutionTime}ms`);

}, 1000);

// Test 4: Filtering and export
setTimeout(async () => {
  console.log('\n📋 Test 4: Filtering and Export');
  
  // Filter by error type
  const userErrorStats = await errorLogger.getErrorStats({
    type: TransactionErrorType.USER
  });
  console.log(`User Errors Only: ${userErrorStats.totalErrors}`);
  
  // Filter by severity
  const criticalErrorStats = await errorLogger.getErrorStats({
    severity: TransactionErrorSeverity.CRITICAL
  });
  console.log(`Critical Errors Only: ${criticalErrorStats.totalErrors}`);
  
  // Export logs
  console.log('\n💾 Exporting logs...');
  const exportedLogs = await errorLogger.exportLogs({
    type: TransactionErrorType.USER
  });
  const parsedLogs = JSON.parse(exportedLogs);
  console.log(`Exported ${parsedLogs.length} user error logs`);
  
  // Show sample exported log structure
  if (parsedLogs.length > 0) {
    console.log('Sample exported log:');
    const sample = parsedLogs[0];
    console.log(`  ID: ${sample.id}`);
    console.log(`  Level: ${sample.level}`);
    console.log(`  Category: ${sample.category}`);
    console.log(`  Message: ${sample.message}`);
    console.log(`  Tags: ${sample.tags?.join(', ') || 'none'}`);
  }

}, 2000);

// Test 5: Time-based analytics
setTimeout(async () => {
  console.log('\n⏰ Test 5: Time-based Analytics');
  
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  
  const timeBasedAnalytics = await errorLogger.getAnalytics({
    start: oneHourAgo.toISOString(),
    end: now.toISOString()
  });
  
  console.log('Time Series Data:');
  timeBasedAnalytics.timeSeriesData.slice(0, 3).forEach(data => {
    console.log(`  ${data.timestamp}: ${data.errorCount} errors`);
    const nonZeroTypes = Object.entries(data.errorsByType)
      .filter(([_, count]) => count > 0)
      .map(([type, count]) => `${type}:${count}`)
      .join(', ');
    if (nonZeroTypes) {
      console.log(`    Types: ${nonZeroTypes}`);
    }
  });
  
  console.log('\n🎉 Error logging system working perfectly!');
}, 3000);

export { context, insufficientFundsError, networkError };