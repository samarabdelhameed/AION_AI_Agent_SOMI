// Test utility for vault data updates
export const testVaultUpdate = {
  // Simulate a successful deposit transaction
  simulateDeposit: async (amount: string) => {
    console.log('🧪 Testing vault update after deposit:', amount);
    
    // Simulate transaction confirmation
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Simulate blockchain data update
    const mockUpdatedData = {
      balance: parseFloat(amount),
      shares: parseFloat(amount) * 1.0, // 1:1 ratio for simplicity
      principal: parseFloat(amount),
      totalAssets: parseFloat(amount),
      totalShares: parseFloat(amount) * 1.0,
      currentAdapter: 'Venus Protocol',
      minDeposit: 0.01,
      userYieldClaimed: 0,
      accumulatedYield: 0
    };
    
    console.log('✅ Mock vault data updated:', mockUpdatedData);
    
    // Emit refresh event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('vaultDataRefresh', {
        detail: { 
          timestamp: Date.now(),
          mockData: mockUpdatedData
        }
      }));
    }
    
    return mockUpdatedData;
  },
  
  // Test the refresh mechanism
  testRefresh: () => {
    console.log('🧪 Testing vault refresh mechanism...');
    
    // Simulate manual refresh
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('vaultDataRefresh', {
        detail: { timestamp: Date.now() }
      }));
    }
    
    console.log('✅ Refresh event dispatched');
  },
  
  // Monitor vault data changes
  monitorChanges: (callback: (data: any) => void) => {
    if (typeof window === 'undefined') return;
    
    const handleRefresh = (event: CustomEvent) => {
      console.log('🔍 Vault refresh event detected:', event.detail);
      callback(event.detail);
    };
    
    window.addEventListener('vaultDataRefresh', handleRefresh as EventListener);
    
    // Return cleanup function
    return () => {
      window.removeEventListener('vaultDataRefresh', handleRefresh as EventListener);
    };
  }
};
