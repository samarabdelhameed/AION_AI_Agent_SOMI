/**
 * Utility functions for activity timeline processing
 */

export function determineTransactionType(transaction: any): string {
  if (transaction.type) {
    return transaction.type;
  }
  
  if (transaction.functionName) {
    const funcName = transaction.functionName.toLowerCase();
    if (funcName.includes('deposit')) return 'deposit';
    if (funcName.includes('withdraw')) return 'withdraw';
    if (funcName.includes('transfer')) return 'transfer';
  }
  
  if (transaction.amount) {
    const amount = parseFloat(transaction.amount);
    return amount < 0 ? 'withdraw' : 'deposit';
  }
  
  return 'unknown';
}

export function getActivityIcon(type: string): string {
  switch (type) {
    case 'deposit':
      return '↗️'; // Up-right arrow
    case 'withdraw':
      return '↙️'; // Down-left arrow
    case 'transfer':
      return '↔️'; // Left-right arrow
    case 'swap':
      return '🔄'; // Refresh
    default:
      return '📝'; // Document
  }
}

export function getActivityColor(type: string): string {
  switch (type) {
    case 'deposit':
      return 'text-green-600';
    case 'withdraw':
      return 'text-red-600';
    case 'transfer':
      return 'text-blue-600';
    case 'swap':
      return 'text-purple-600';
    default:
      return 'text-gray-600';
  }
}

export function formatAmount(amount: string | number, decimals: number = 18): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  const formatted = (Math.abs(num) / Math.pow(10, decimals)).toFixed(6);
  return num < 0 ? `-${formatted}` : `+${formatted}`;
}

export function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString();
}