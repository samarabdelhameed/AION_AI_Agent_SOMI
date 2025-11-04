/**
 * Basic usage examples for the transaction error handling system
 */

import {
  // Core functions
  depositWithWalletEnhanced,
  getMinDepositWeiEnhanced,
  
  // Error handling
  createTransactionError,
  createTransactionContext,
  TransactionErrorType,
  ERROR_CODES,
  
  // Components
  errorLogger,
  statusTracker,
  notificationManager,
  messageGenerator,
  
  // Types
  TransactionStatus,
  EnhancedDepositParams
} from '../index';

/**
 * Example 1: Basic Enhanced Deposit
 */
export async function basicDepositExample() {
  console.log('🚀 Example 1: Basic Enhanced Deposit');
  
  try {
    const result = await depositWithWalletEnhanced({
      chainId: 97, // BSC Testnet
      amountWei: BigInt('100000000000000000'), // 0.1 BNB
      statusCallback: (update) => {
        console.log(`📊 Status: ${update.status} - ${update.message}`);
        if (update.progress !== undefined) {
          console.log(`   Progress: ${update.progress}%`);
        }
      },
      errorCallback: (error) => {
        console.log(`❌ Error: ${error.userMessage}`);
        console.log(`   Suggestions: ${error.suggestedActions.join(', ')}`);
      }
    });

    if (result.success) {
      console.log(`✅ Transaction successful!`);
      console.log(`   TX Hash: ${result.txHash}`);
      console.log(`   Gas Used: ${result.gasUsed}`);
      console.log(`   Attempts: ${result.attempts}`);
      console.log(`   Total Time: ${result.totalTime}ms`);
    } else {
      console.log(`❌ Transaction failed: ${result.error?.userMessage}`);
    }
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

/**
 * Example 2: Advanced Deposit with Custom Configuration
 */
export async function advancedDepositExample() {
  console.log('\n🚀 Example 2: Advanced Deposit with Custom Configuration');
  
  const depositParams: EnhancedDepositParams = {
    chainId: 97,
    amountWei: BigInt('500000000000000000'), // 0.5 BNB
    validationLevel: 'strict',
    retryConfig: {
      maxRetries: 5,
      baseDelay: 2000,
      backoffMultiplier: 1.5,
      retryableErrors: [TransactionErrorType.NETWORK, TransactionErrorType.GAS],
      useJitter: true
    },
    statusCallback: (update) => {
      console.log(`📊 [${new Date().toLocaleTimeString()}] ${update.status}`);
      console.log(`   Message: ${update.message}`);
      if (update.confirmations) {
        console.log(`   Confirmations: ${update.confirmations}`);
      }
    },
    errorCallback: (error) => {
      console.log(`❌ Error occurred: ${error.code}`);
      console.log(`   Type: ${error.type}, Severity: ${error.severity}`);
      console.log(`   Retryable: ${error.retryable ? 'Yes' : 'No'}`);
      
      // Show user-friendly message in different languages
      const englishMsg = messageGenerator.generateQuickMessage(error, 'en');
      const arabicMsg = messageGenerator.generateQuickMessage(error, 'ar');
      
      console.log(`   English: ${englishMsg}`);
      console.log(`   Arabic: ${arabicMsg}`);
    },
    metadata: {
      source: 'advanced_example',
      userAgent: 'Example/1.0',
      timestamp: new Date().toISOString()
    }
  };

  try {
    const result = await depositWithWalletEnhanced(depositParams);
    
    if (result.success) {
      console.log(`✅ Advanced deposit successful!`);
      console.log(`   Final gas price: ${result.finalGasPrice} wei`);
    } else {
      console.log(`❌ Advanced deposit failed`);
      
      // Get detailed error information
      if (result.error) {
        const detailedInfo = messageGenerator.generateMessage(result.error);
        console.log(`   Title: ${detailedInfo.title}`);
        console.log(`   Can retry: ${detailedInfo.canRetry}`);
        console.log(`   Estimated fix time: ${detailedInfo.estimatedFixTime}`);
        console.log(`   Suggestions:`);
        detailedInfo.suggestions.forEach((suggestion, index) => {
          console.log(`     ${index + 1}. ${suggestion}`);
        });
      }
    }
  } catch (error) {
    console.error('Advanced deposit error:', error);
  }
}

/**
 * Example 3: Manual Error Handling
 */
export async function manualErrorHandlingExample() {
  console.log('\n🚀 Example 3: Manual Error Handling');
  
  // Create transaction context
  const context = createTransactionContext(97, '0x20F3880756be1BeA1aD4235692aCfbC97fAdfDa5', {
    userAddress: '0x1234567890123456789012345678901234567890',
    amount: BigInt('1000000000000000000'), // 1 BNB
    gasPrice: BigInt('5000000000') // 5 Gwei
  });

  // Create different types of errors
  const errors = [
    createTransactionError(
      TransactionErrorType.USER,
      ERROR_CODES.INSUFFICIENT_FUNDS,
      'User has insufficient BNB balance',
      context,
      {
        suggestedActions: [
          'Add more BNB to your wallet',
          'Reduce the deposit amount',
          'Check if you have enough for gas fees'
        ]
      }
    ),
    createTransactionError(
      TransactionErrorType.NETWORK,
      ERROR_CODES.NETWORK_TIMEOUT,
      'BSC network is experiencing delays',
      context,
      {
        retryable: true,
        suggestedActions: [
          'Wait a moment and try again',
          'Check your internet connection'
        ]
      }
    ),
    createTransactionError(
      TransactionErrorType.GAS,
      ERROR_CODES.GAS_TOO_LOW,
      'Gas price too low for current network conditions',
      context,
      {
        retryable: true,
        suggestedActions: [
          'Increase gas price to at least 10 Gwei',
          'Wait for network congestion to decrease'
        ]
      }
    )
  ];

  // Process each error
  for (const [index, error] of errors.entries()) {
    console.log(`\n📋 Error ${index + 1}: ${error.code}`);
    console.log(`   Type: ${error.type}`);
    console.log(`   Severity: ${error.severity}`);
    console.log(`   Retryable: ${error.retryable ? 'Yes' : 'No'}`);
    console.log(`   Message: ${error.userMessage}`);
    console.log(`   Suggestions: ${error.suggestedActions.join(', ')}`);
    
    // Log the error
    await errorLogger.logError(error, {
      example: 'manual_handling',
      errorIndex: index
    }, ['example', 'manual']);
    
    // Show notification
    notificationManager.showError(error);
    
    // Generate messages in multiple languages
    const languages = ['en', 'ar', 'es'] as const;
    console.log(`   Multilingual messages:`);
    languages.forEach(lang => {
      const message = messageGenerator.generateQuickMessage(error, lang);
      console.log(`     ${lang.toUpperCase()}: ${message}`);
    });
  }
}

/**
 * Example 4: Status Tracking
 */
export async function statusTrackingExample() {
  console.log('\n🚀 Example 4: Status Tracking');
  
  const context = createTransactionContext(97, '0x20F3880756be1BeA1aD4235692aCfbC97fAdfDa5');
  const txHash = '0xexample123456789abcdef123456789abcdef123456789abcdef123456789abcdef';
  
  // Subscribe to all status updates
  const allUpdatesSubscription = statusTracker.subscribe((update) => {
    console.log(`📊 Global update: ${update.status} - ${update.message}`);
  });
  
  // Subscribe to specific transaction updates
  const txSubscription = statusTracker.subscribeToTransaction(txHash, (update) => {
    console.log(`🎯 TX ${txHash.slice(0, 10)}... update: ${update.status}`);
    if (update.progress !== undefined) {
      console.log(`   Progress: ${update.progress}%`);
    }
    if (update.confirmations !== undefined) {
      console.log(`   Confirmations: ${update.confirmations}`);
    }
  });
  
  // Start tracking
  statusTracker.startTracking(txHash, context, TransactionStatus.PREPARING);
  
  // Simulate status progression
  const statuses = [
    { status: TransactionStatus.VALIDATING, message: 'Validating parameters', delay: 500 },
    { status: TransactionStatus.WAITING_CONFIRMATION, message: 'Waiting for wallet', delay: 1000 },
    { status: TransactionStatus.SUBMITTED, message: 'Submitted to network', delay: 1500 },
    { status: TransactionStatus.CONFIRMING, message: 'Confirming...', delay: 2000 },
    { status: TransactionStatus.COMPLETED, message: 'Completed!', delay: 2500 }
  ];
  
  for (const { status, message, delay } of statuses) {
    setTimeout(() => {
      statusTracker.updateStatus(txHash, status, message);
      
      // Update confirmations for confirming status
      if (status === TransactionStatus.CONFIRMING) {
        setTimeout(() => statusTracker.updateConfirmations(txHash, 1), 200);
        setTimeout(() => statusTracker.updateConfirmations(txHash, 2), 400);
        setTimeout(() => statusTracker.updateConfirmations(txHash, 3), 600);
      }
    }, delay);
  }
  
  // Clean up after example
  setTimeout(() => {
    statusTracker.unsubscribe(allUpdatesSubscription);
    statusTracker.unsubscribe(txSubscription);
    console.log('   Status tracking example completed');
  }, 3000);
}

/**
 * Example 5: Minimum Deposit Check
 */
export async function minDepositExample() {
  console.log('\n🚀 Example 5: Minimum Deposit Check');
  
  try {
    const result = await getMinDepositWeiEnhanced(97); // BSC Testnet
    
    if (result.value) {
      const minDepositBNB = Number(result.value) / 1e18;
      console.log(`✅ Minimum deposit: ${result.value} wei (${minDepositBNB} BNB)`);
      
      // Check if user's desired amount meets minimum
      const userAmount = BigInt('50000000000000000'); // 0.05 BNB
      if (userAmount < result.value) {
        console.log(`❌ User amount ${Number(userAmount) / 1e18} BNB is below minimum`);
        
        // Create validation error
        const context = createTransactionContext(97, '0x20F3880756be1BeA1aD4235692aCfbC97fAdfDa5');
        const error = createTransactionError(
          TransactionErrorType.VALIDATION,
          ERROR_CODES.BELOW_MIN_DEPOSIT,
          `Amount below minimum deposit of ${minDepositBNB} BNB`,
          context,
          {
            suggestedActions: [
              `Increase amount to at least ${minDepositBNB} BNB`,
              'Check minimum deposit requirements'
            ]
          }
        );
        
        // Show user-friendly error
        const userMessage = messageGenerator.generateMessage(error);
        console.log(`   Error: ${userMessage.title}`);
        console.log(`   Message: ${userMessage.message}`);
        console.log(`   Suggestions: ${userMessage.suggestions.join(', ')}`);
      } else {
        console.log(`✅ User amount ${Number(userAmount) / 1e18} BNB meets minimum requirement`);
      }
    } else if (result.error) {
      console.log(`❌ Failed to get minimum deposit: ${result.error.userMessage}`);
      
      // Log the error
      await errorLogger.logError(result.error, {
        operation: 'getMinDeposit',
        chainId: 97
      }, ['example', 'min_deposit']);
    }
  } catch (error) {
    console.error('Min deposit example error:', error);
  }
}

/**
 * Example 6: Notification System
 */
export async function notificationExample() {
  console.log('\n🚀 Example 6: Notification System');
  
  // Configure notification display
  notificationManager.updateDisplayOptions({
    position: 'top-right',
    maxVisible: 3,
    defaultTimeout: 3000,
    enableSound: false, // Disabled for example
    groupSimilar: true
  });
  
  // Subscribe to notification events
  const eventListener = notificationManager.addEventListener('show', (event, notification) => {
    console.log(`🔔 Notification shown: ${notification.title}`);
  });
  
  // Show different types of notifications
  const successId = notificationManager.showSuccess(
    'Transaction Successful',
    'Your deposit of 1.0 BNB has been processed successfully.',
    {
      actions: [{
        label: 'View Transaction',
        action: () => console.log('   🔗 Opening transaction in explorer...'),
        primary: true
      }]
    }
  );
  
  const warningId = notificationManager.showWarning(
    'High Gas Price',
    'Current gas price is 25 Gwei, which is higher than usual.',
    {
      actions: [
        {
          label: 'Continue Anyway',
          action: () => console.log('   ⚡ User chose to continue...'),
          primary: true
        },
        {
          label: 'Wait',
          action: () => console.log('   ⏳ User chose to wait...'),
          primary: false
        }
      ]
    }
  );
  
  const infoId = notificationManager.showInfo(
    'Network Status',
    'BSC network is operating normally. Average block time: 3 seconds.'
  );
  
  // Show error notification
  const context = createTransactionContext(97, '0x123');
  const error = createTransactionError(
    TransactionErrorType.USER,
    ERROR_CODES.INSUFFICIENT_FUNDS,
    'Insufficient funds',
    context
  );
  const errorId = notificationManager.showError(error);
  
  console.log(`   Created notifications: ${successId}, ${warningId}, ${infoId}, ${errorId}`);
  
  // Get notification statistics
  setTimeout(() => {
    const stats = notificationManager.getStats();
    console.log(`   📊 Notification stats: ${stats.total} total, ${stats.visible} visible`);
    console.log(`   By type: Success(${stats.byType.success}), Warning(${stats.byType.warning}), Info(${stats.byType.info}), Error(${stats.byType.error})`);
    
    // Clean up
    notificationManager.removeEventListener(eventListener);
    notificationManager.hideAll();
    console.log('   Notification example completed');
  }, 4000);
}

/**
 * Run all examples
 */
export async function runAllExamples() {
  console.log('🎯 Running Basic Usage Examples\n');
  
  await basicDepositExample();
  await advancedDepositExample();
  await manualErrorHandlingExample();
  await statusTrackingExample();
  await minDepositExample();
  await notificationExample();
  
  console.log('\n✅ All basic usage examples completed!');
}

// Export individual examples for selective running
export {
  basicDepositExample,
  advancedDepositExample,
  manualErrorHandlingExample,
  statusTrackingExample,
  minDepositExample,
  notificationExample
};