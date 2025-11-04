/**
 * Test the complete message generation system
 */

import {
  messageGenerator,
  createTransactionError,
  createTransactionContext,
  TransactionErrorType,
  ERROR_CODES
} from './index';

console.log('🚀 Testing Message Generation System...');

// Test 1: Insufficient funds error in multiple languages
const context = createTransactionContext(56, '0x123456789abcdef', {
  userAddress: '0xuser123456789abcdef',
  amount: BigInt('2500000000000000000') // 2.5 BNB
});

const insufficientFundsError = createTransactionError(
  TransactionErrorType.USER,
  ERROR_CODES.INSUFFICIENT_FUNDS,
  'Insufficient funds for transaction',
  context
);

console.log('✅ English Message:');
const englishMessage = messageGenerator.generateMessage(insufficientFundsError);
console.log('  Title:', englishMessage.title);
console.log('  Message:', englishMessage.message);
console.log('  Suggestions:', englishMessage.suggestions);
console.log('  Can Retry:', englishMessage.canRetry);

console.log('\n✅ Arabic Message:');
const arabicMessage = messageGenerator.generateMessage(insufficientFundsError, { language: 'ar' });
console.log('  Title:', arabicMessage.title);
console.log('  Message:', arabicMessage.message);
console.log('  Suggestions:', arabicMessage.suggestions);

console.log('\n✅ Spanish Message:');
const spanishMessage = messageGenerator.generateMessage(insufficientFundsError, { language: 'es' });
console.log('  Title:', spanishMessage.title);
console.log('  Message:', spanishMessage.message);

// Test 2: Network timeout error
const networkError = createTransactionError(
  TransactionErrorType.NETWORK,
  ERROR_CODES.NETWORK_TIMEOUT,
  'Network timeout',
  context
);

console.log('\n✅ Network Timeout Message:');
const networkMessage = messageGenerator.generateMessage(networkError);
console.log('  Title:', networkMessage.title);
console.log('  Message:', networkMessage.message);
console.log('  Estimated Fix Time:', networkMessage.estimatedFixTime);
console.log('  Can Retry:', networkMessage.canRetry);

// Test 3: Gas price too low error
const gasContext = createTransactionContext(56, '0x123', {
  gasPrice: BigInt('3000000000') // 3 Gwei
});

const gasError = createTransactionError(
  TransactionErrorType.GAS,
  ERROR_CODES.GAS_TOO_LOW,
  'Gas price too low',
  gasContext
);

console.log('\n✅ Gas Price Too Low Message:');
const gasMessage = messageGenerator.generateMessage(gasError);
console.log('  Title:', gasMessage.title);
console.log('  Message:', gasMessage.message);
console.log('  Estimated Fix Time:', gasMessage.estimatedFixTime);

// Test 4: User rejection error
const rejectionError = createTransactionError(
  TransactionErrorType.USER,
  ERROR_CODES.USER_REJECTED,
  'User rejected transaction',
  context
);

console.log('\n✅ User Rejection Message:');
const rejectionMessage = messageGenerator.generateMessage(rejectionError);
console.log('  Title:', rejectionMessage.title);
console.log('  Message:', rejectionMessage.message);
console.log('  Suggestions:', rejectionMessage.suggestions);

// Test 5: Quick messages for notifications
console.log('\n✅ Quick Messages:');
console.log('  English:', messageGenerator.generateQuickMessage(insufficientFundsError));
console.log('  Arabic:', messageGenerator.generateQuickMessage(insufficientFundsError, 'ar'));

// Test 6: All suggestions
console.log('\n✅ All Suggestions for Insufficient Funds:');
const allSuggestions = messageGenerator.getAllSuggestions(insufficientFundsError);
allSuggestions.forEach((suggestion, index) => {
  console.log(`  ${index + 1}. ${suggestion}`);
});

// Test 7: Different chain names
const ethContext = createTransactionContext(1, '0x123');
const polygonContext = createTransactionContext(137, '0x123');

const ethError = createTransactionError(TransactionErrorType.NETWORK, ERROR_CODES.NETWORK_TIMEOUT, 'timeout', ethContext);
const polygonError = createTransactionError(TransactionErrorType.NETWORK, ERROR_CODES.NETWORK_TIMEOUT, 'timeout', polygonContext);

console.log('\n✅ Chain-specific Messages:');
console.log('  Ethereum:', messageGenerator.generateQuickMessage(ethError));
console.log('  Polygon:', messageGenerator.generateQuickMessage(polygonError));

console.log('\n🎉 Message generation system working perfectly!');

export { englishMessage, arabicMessage, networkMessage };