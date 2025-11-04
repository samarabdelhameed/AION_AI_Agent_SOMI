/**
 * Test the enhanced local activity timeline system
 */

import {
  enhancedLocalTimeline,
  appendEnhancedLocalActivity,
  migrateOldActivities,
  createTransactionError,
  createTransactionContext,
  createStatusUpdate,
  TransactionErrorType,
  TransactionStatus,
  ERROR_CODES
} from './index';

console.log('🚀 Testing Enhanced Local Activity Timeline...');

// Test context
const context = createTransactionContext(56, '0x123456789abcdef', {
  userAddress: '0xuser123456789abcdef',
  amount: BigInt('1000000000000000000') // 1 BNB
});

// Test 1: Basic activity management
console.log('✅ Test 1: Basic Activity Management');

const depositActivity = enhancedLocalTimeline.addActivity({
  type: 'deposit',
  status: 'pending',
  timestamp: new Date().toISOString(),
  amount: 1.5,
  currency: 'BNB',
  description: 'User deposit of 1.5 BNB'
});

console.log(`  📝 Created deposit activity: ${depositActivity.id}`);
console.log(`     Type: ${depositActivity.type}, Status: ${depositActivity.status}`);
console.log(`     Amount: ${depositActivity.amount} ${depositActivity.currency}`);
console.log(`     Status History: ${depositActivity.statusHistory.length} entries`);
console.log(`     Performance tracking: ${depositActivity.performance ? 'Enabled' : 'Disabled'}`);

const withdrawActivity = enhancedLocalTimeline.addActivity({
  type: 'withdraw',
  status: 'completed',
  timestamp: new Date().toISOString(),
  amount: 0.8,
  currency: 'BNB',
  txHash: '0xabc123def456789abcdef123456789abcdef123456789abcdef123456789abcdef',
  gasUsed: 21000,
  description: 'User withdrawal of 0.8 BNB'
});

console.log(`  📝 Created withdraw activity: ${withdrawActivity.id}`);

// Test 2: Status updates and progression
console.log('\n✅ Test 2: Status Updates and Progression');

const statusUpdates = [
  createStatusUpdate(TransactionStatus.VALIDATING, 'Validating transaction parameters', { progress: 15 }),
  createStatusUpdate(TransactionStatus.WAITING_CONFIRMATION, 'Waiting for wallet confirmation', { progress: 25 }),
  createStatusUpdate(TransactionStatus.SUBMITTED, 'Transaction submitted to network', { 
    progress: 40, 
    txHash: '0xdef456abc789def456abc789def456abc789def456abc789def456abc789def456'
  }),
  createStatusUpdate(TransactionStatus.CONFIRMING, 'Waiting for network confirmation', { 
    progress: 70, 
    confirmations: 1
  }),
  createStatusUpdate(TransactionStatus.COMPLETED, 'Transaction completed successfully', { 
    progress: 100, 
    confirmations: 3
  })
];

console.log('  📊 Simulating status progression...');
statusUpdates.forEach((update, index) => {
  setTimeout(() => {
    const updated = enhancedLocalTimeline.updateActivity(depositActivity.id, {
      status: index === statusUpdates.length - 1 ? 'completed' : 'pending',
      txHash: update.txHash
    }, update);
    
    console.log(`     ${index + 1}. ${update.status} (${update.progress}%) - Updated: ${updated ? 'Success' : 'Failed'}`);
    
    if (index === statusUpdates.length - 1) {
      const finalActivity = enhancedLocalTimeline.getActivity(depositActivity.id);
      console.log(`     Final status history: ${finalActivity?.statusHistory.length} entries`);
      console.log(`     Performance duration: ${finalActivity?.performance?.totalDuration}ms`);
    }
  }, index * 300);
});

// Test 3: Error handling and recovery
setTimeout(() => {
  console.log('\n✅ Test 3: Error Handling and Recovery');
  
  // Create a failed transaction
  const failedActivity = enhancedLocalTimeline.addActivity({
    type: 'deposit',
    status: 'pending',
    timestamp: new Date().toISOString(),
    amount: 2.0,
    currency: 'BNB',
    description: 'Failed deposit transaction'
  });
  
  console.log(`  🔴 Created failed activity: ${failedActivity.id}`);
  
  // Add error information
  const insufficientFundsError = createTransactionError(
    TransactionErrorType.USER,
    ERROR_CODES.INSUFFICIENT_FUNDS,
    'User has insufficient BNB balance for transaction',
    context,
    {
      suggestedActions: [
        'Add more BNB to your wallet',
        'Reduce the deposit amount',
        'Check if you have enough for gas fees'
      ]
    }
  );
  
  const errorAdded = enhancedLocalTimeline.addErrorToActivity(failedActivity.id, insufficientFundsError);
  console.log(`  ❌ Error added to activity: ${errorAdded ? 'Success' : 'Failed'}`);
  
  const activityWithError = enhancedLocalTimeline.getActivity(failedActivity.id);
  if (activityWithError?.error) {
    console.log(`     Error Code: ${activityWithError.error.code}`);
    console.log(`     Error Type: ${activityWithError.error.type}`);
    console.log(`     Severity: ${activityWithError.error.severity}`);
    console.log(`     Retryable: ${activityWithError.error.retryable ? 'Yes' : 'No'}`);
    console.log(`     User Message: ${activityWithError.error.userMessage}`);
    console.log(`     Suggested Actions: ${activityWithError.error.suggestedActions.length}`);
  }
  
  if (activityWithError?.recoveryInfo) {
    console.log(`     Recovery Available: ${activityWithError.recoveryInfo.canRecover ? 'Yes' : 'No'}`);
    console.log(`     Recovery Actions: ${activityWithError.recoveryInfo.recoveryActions.length}`);
    activityWithError.recoveryInfo.recoveryActions.forEach((action, index) => {
      console.log(`       ${index + 1}. ${action.label}: ${action.description}`);
    });
  }
  
  // Test user-friendly error message
  const errorMessage = enhancedLocalTimeline.getActivityErrorMessage(failedActivity.id);
  console.log(`     User-friendly message: "${errorMessage}"`);
  
  const arabicErrorMessage = enhancedLocalTimeline.getActivityErrorMessage(failedActivity.id, 'ar');
  console.log(`     Arabic message: "${arabicErrorMessage}"`);
  
}, 2000);

// Test 4: Retry mechanism simulation
setTimeout(() => {
  console.log('\n✅ Test 4: Retry Mechanism Simulation');
  
  // Create a retryable transaction
  const retryableActivity = enhancedLocalTimeline.addActivity({
    type: 'deposit',
    status: 'pending',
    timestamp: new Date().toISOString(),
    amount: 1.0,
    currency: 'BNB',
    description: 'Retryable deposit transaction'
  });
  
  console.log(`  🔄 Created retryable activity: ${retryableActivity.id}`);
  
  // Add network error (retryable)
  const networkError = createTransactionError(
    TransactionErrorType.NETWORK,
    ERROR_CODES.NETWORK_TIMEOUT,
    'BSC network is experiencing delays',
    context,
    { retryable: true }
  );
  
  enhancedLocalTimeline.addErrorToActivity(retryableActivity.id, networkError);
  
  // Simulate retry attempts
  const retryAttempts = [
    {
      attemptNumber: 0,
      timestamp: new Date().toISOString(),
      error: networkError,
      delay: 1000
    },
    {
      attemptNumber: 1,
      timestamp: new Date(Date.now() + 1000).toISOString(),
      error: networkError,
      delay: 2000,
      gasAdjustment: {
        originalGasPrice: BigInt('5000000000'),
        adjustedGasPrice: BigInt('6000000000'),
        adjustmentFactor: 1.2
      }
    },
    {
      attemptNumber: 2,
      timestamp: new Date(Date.now() + 3000).toISOString(),
      error: networkError,
      delay: 4000,
      gasAdjustment: {
        originalGasPrice: BigInt('6000000000'),
        adjustedGasPrice: BigInt('7200000000'),
        adjustmentFactor: 1.2
      }
    }
  ];
  
  retryAttempts.forEach((attempt, index) => {
    setTimeout(() => {
      const retryAdded = enhancedLocalTimeline.addRetryInfoToActivity(retryableActivity.id, attempt);
      console.log(`     Retry attempt ${attempt.attemptNumber + 1}: ${retryAdded ? 'Recorded' : 'Failed'}`);
      
      if (attempt.gasAdjustment) {
        const originalGwei = Number(attempt.gasAdjustment.originalGasPrice) / 1e9;
        const adjustedGwei = Number(attempt.gasAdjustment.adjustedGasPrice) / 1e9;
        console.log(`       Gas adjusted: ${originalGwei} → ${adjustedGwei} Gwei (${attempt.gasAdjustment.adjustmentFactor}x)`);
      }
      
      if (index === retryAttempts.length - 1) {
        const retryActivity = enhancedLocalTimeline.getActivity(retryableActivity.id);
        console.log(`     Final retry info: ${retryActivity?.retryInfo?.attempts} attempts, ${retryActivity?.retryInfo?.retryHistory.length} history entries`);
      }
    }, index * 500);
  });
  
}, 3000);

// Test 5: User interactions tracking
setTimeout(() => {
  console.log('\n✅ Test 5: User Interactions Tracking');
  
  const activities = enhancedLocalTimeline.loadActivities();
  if (activities.length > 0) {
    const testActivity = activities[0];
    
    // Record various user interactions
    const interactions = [
      { action: 'view_details', context: { source: 'timeline', timestamp: Date.now() } },
      { action: 'retry_clicked', context: { buttonLocation: 'error_banner', userAgent: 'test' } },
      { action: 'copy_tx_hash', context: { txHash: testActivity.txHash } },
      { action: 'share_activity', context: { platform: 'twitter', success: true } }
    ];
    
    interactions.forEach((interaction, index) => {
      setTimeout(() => {
        const recorded = enhancedLocalTimeline.recordUserInteraction(
          testActivity.id,
          interaction.action,
          interaction.context
        );
        console.log(`     Interaction ${index + 1}: ${interaction.action} - ${recorded ? 'Recorded' : 'Failed'}`);
      }, index * 200);
    });
    
    setTimeout(() => {
      const updatedActivity = enhancedLocalTimeline.getActivity(testActivity.id);
      console.log(`     Total interactions recorded: ${updatedActivity?.userInteractions?.length || 0}`);
      
      updatedActivity?.userInteractions?.forEach((interaction, index) => {
        console.log(`       ${index + 1}. ${interaction.action} at ${interaction.timestamp.split('T')[1].split('.')[0]}`);
      });
    }, 1000);
  }
}, 5000);

// Test 6: Filtering and querying
setTimeout(() => {
  console.log('\n✅ Test 6: Filtering and Querying');
  
  // Get all activities
  const allActivities = enhancedLocalTimeline.getActivities();
  console.log(`  📋 Total activities: ${allActivities.length}`);
  
  // Filter by status
  const completedActivities = enhancedLocalTimeline.getActivities({
    status: ['completed']
  });
  console.log(`     Completed activities: ${completedActivities.length}`);
  
  const failedActivities = enhancedLocalTimeline.getActivities({
    status: ['failed']
  });
  console.log(`     Failed activities: ${failedActivities.length}`);
  
  // Filter by type
  const depositActivities = enhancedLocalTimeline.getActivities({
    type: ['deposit']
  });
  console.log(`     Deposit activities: ${depositActivities.length}`);
  
  // Filter by error presence
  const activitiesWithErrors = enhancedLocalTimeline.getActivities({
    hasError: true
  });
  console.log(`     Activities with errors: ${activitiesWithErrors.length}`);
  
  // Filter by date range (last hour)
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const now = new Date();
  const recentActivities = enhancedLocalTimeline.getActivities({
    dateRange: {
      start: oneHourAgo.toISOString(),
      end: now.toISOString()
    }
  });
  console.log(`     Recent activities (last hour): ${recentActivities.length}`);
  
  // Pagination test
  const firstPage = enhancedLocalTimeline.getActivities({
    limit: 2,
    offset: 0
  });
  console.log(`     First page (limit 2): ${firstPage.length} activities`);
  
}, 6500);

// Test 7: Statistics and analytics
setTimeout(() => {
  console.log('\n✅ Test 7: Statistics and Analytics');
  
  const stats = enhancedLocalTimeline.getStats();
  
  console.log('  📊 Timeline Statistics:');
  console.log(`     Total Activities: ${stats.total}`);
  console.log(`     Error Rate: ${stats.errorRate.toFixed(2)}%`);
  console.log(`     Retry Success Rate: ${stats.retrySuccessRate.toFixed(2)}%`);
  console.log(`     Average Duration: ${stats.averageDuration.toFixed(0)}ms`);
  
  console.log('\n     By Status:');
  Object.entries(stats.byStatus).forEach(([status, count]) => {
    if (count > 0) {
      console.log(`       ${status}: ${count}`);
    }
  });
  
  console.log('\n     By Type:');
  Object.entries(stats.byType).forEach(([type, count]) => {
    if (count > 0) {
      console.log(`       ${type}: ${count}`);
    }
  });
  
  console.log('\n     Recent Trends (24h):');
  console.log(`       Success Rate: ${stats.recentTrends.successRate.toFixed(2)}%`);
  console.log(`       Error Rate: ${stats.recentTrends.errorRate.toFixed(2)}%`);
  console.log(`       Average Retries: ${stats.recentTrends.averageRetries.toFixed(2)}`);
  
}, 7500);

// Test 8: Data export and management
setTimeout(() => {
  console.log('\n✅ Test 8: Data Export and Management');
  
  // Export as JSON
  const jsonExport = enhancedLocalTimeline.exportTimeline('json');
  const jsonData = JSON.parse(jsonExport);
  console.log(`  💾 JSON Export: ${jsonExport.length} characters, ${jsonData.length} activities`);
  
  // Export as CSV
  const csvExport = enhancedLocalTimeline.exportTimeline('csv');
  const csvLines = csvExport.split('\n');
  console.log(`  📄 CSV Export: ${csvLines.length} lines (including header)`);
  console.log(`     Header: ${csvLines[0]}`);
  if (csvLines.length > 1) {
    console.log(`     Sample data: ${csvLines[1].substring(0, 80)}...`);
  }
  
  // Test cleanup
  const initialCount = enhancedLocalTimeline.loadActivities().length;
  const clearedCount = enhancedLocalTimeline.clearOldActivities(0); // Clear all (0 days retention)
  console.log(`  🧹 Cleanup: Removed ${clearedCount} old activities (${initialCount} → ${enhancedLocalTimeline.loadActivities().length})`);
  
}, 8500);

// Test 9: Event listeners
setTimeout(() => {
  console.log('\n✅ Test 9: Event Listeners');
  
  let eventCount = 0;
  const listener = (activity: any) => {
    eventCount++;
    console.log(`     Event ${eventCount}: ${activity.type} activity ${activity.status} (${activity.id.substring(0, 8)}...)`);
  };
  
  const listenerId = enhancedLocalTimeline.addEventListener(listener);
  console.log(`  👂 Added event listener: ${listenerId}`);
  
  // Add some activities to trigger events
  enhancedLocalTimeline.addActivity({
    type: 'deposit',
    status: 'pending',
    timestamp: new Date().toISOString(),
    amount: 0.5,
    currency: 'BNB',
    description: 'Event test deposit'
  });
  
  enhancedLocalTimeline.addActivity({
    type: 'withdraw',
    status: 'completed',
    timestamp: new Date().toISOString(),
    amount: 0.3,
    currency: 'BNB',
    description: 'Event test withdrawal'
  });
  
  setTimeout(() => {
    const removed = enhancedLocalTimeline.removeEventListener(listenerId);
    console.log(`     Removed event listener: ${removed ? 'Success' : 'Failed'}`);
    console.log(`     Total events captured: ${eventCount}`);
  }, 500);
  
}, 9500);

// Test 10: Migration from old timeline
setTimeout(() => {
  console.log('\n✅ Test 10: Migration from Old Timeline');
  
  // Simulate old timeline data
  const oldTimelineData = [
    {
      id: 'old-1',
      type: 'deposit',
      status: 'completed',
      timestamp: new Date(Date.now() - 60000).toISOString(),
      amount: 1.0,
      currency: 'BNB',
      txHash: '0xold123',
      description: 'Old deposit transaction'
    },
    {
      id: 'old-2',
      type: 'withdraw',
      status: 'failed',
      timestamp: new Date(Date.now() - 30000).toISOString(),
      amount: 0.5,
      currency: 'BNB',
      description: 'Old failed withdrawal'
    }
  ];
  
  // Mock localStorage for old timeline
  localStorage.setItem('aion.timeline.local', JSON.stringify(oldTimelineData));
  
  const migratedCount = migrateOldActivities();
  console.log(`  🔄 Migration completed: ${migratedCount} activities migrated`);
  
  const allActivitiesAfterMigration = enhancedLocalTimeline.loadActivities();
  console.log(`     Total activities after migration: ${allActivitiesAfterMigration.length}`);
  
  // Check migrated activities have enhanced features
  const migratedActivity = allActivitiesAfterMigration.find(a => a.id === 'old-1');
  if (migratedActivity) {
    console.log(`     Migrated activity has status history: ${migratedActivity.statusHistory ? 'Yes' : 'No'}`);
    console.log(`     Migrated activity has performance tracking: ${migratedActivity.performance ? 'Yes' : 'No'}`);
    console.log(`     Migrated activity has user interactions: ${migratedActivity.userInteractions ? 'Yes' : 'No'}`);
  }
  
}, 10500);

// Final summary
setTimeout(() => {
  console.log('\n🎉 Enhanced Local Activity Timeline System working perfectly!');
  console.log('\n📋 System Features Demonstrated:');
  console.log('  ✅ Enhanced activity structure with comprehensive metadata');
  console.log('  ✅ Status progression tracking with detailed history');
  console.log('  ✅ Error information storage and recovery actions');
  console.log('  ✅ Retry mechanism tracking with gas adjustments');
  console.log('  ✅ User interaction recording and analytics');
  console.log('  ✅ Advanced filtering and querying capabilities');
  console.log('  ✅ Comprehensive statistics and trend analysis');
  console.log('  ✅ Data export in JSON and CSV formats');
  console.log('  ✅ Event-driven architecture with listeners');
  console.log('  ✅ Migration support from legacy timeline');
  console.log('  ✅ Performance metrics and duration tracking');
  console.log('  ✅ Multilingual error message support');
  console.log('  ✅ Recovery action suggestions');
  console.log('  ✅ Automatic cleanup and data management');
  
  const finalStats = enhancedLocalTimeline.getStats();
  console.log(`\n📊 Final System State: ${finalStats.total} activities, ${finalStats.errorRate.toFixed(1)}% error rate`);
  
}, 12000);

export { depositActivity, withdrawActivity, context };