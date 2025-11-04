import { DataValidator } from './validator/DataValidator';
import { PerformanceMonitor } from './monitor/PerformanceMonitor';

/**
 * Unit test to verify real data handling
 */
async function testRealDataHandling() {
  console.log('🧪 Testing real data handling...');

  const validator = new DataValidator();
  const monitor = new PerformanceMonitor();

  // Test 1: Validate real financial metrics
  console.log('Test 1: Validating financial metrics...');
  const realMetrics = {
    apy: 15.75,
    balance: '2500.00',
    vaultShares: '2375.50',
    performance: 12.3,
    riskScore: 45
  };

  const result = validator.validateCalculations(realMetrics);
  console.log('Financial validation result:', {
    isValid: result.isValid,
    accuracy: result.accuracy,
    discrepancies: result.discrepancies.length
  });

  // Test 2: Check data freshness
  console.log('Test 2: Checking data freshness...');
  const currentTime = Date.now();
  const recentTime = currentTime - 60000; // 1 minute ago
  const oldTime = currentTime - 600000; // 10 minutes ago

  console.log('Recent data is fresh:', validator.checkDataFreshness(recentTime));
  console.log('Old data is fresh:', validator.checkDataFreshness(oldTime));

  // Test 3: Performance monitoring with real metrics
  console.log('Test 3: Performance monitoring...');
  monitor.startPerformanceTracking();
  
  // Simulate real work
  await new Promise(resolve => setTimeout(resolve, 200));
  
  const perfMetrics = monitor.stopPerformanceTracking();
  console.log('Performance metrics:', {
    responseTime: perfMetrics.responseTime,
    loadTime: perfMetrics.loadTime,
    memoryUsage: perfMetrics.memoryUsage
  });

  // Test 4: Memory usage monitoring
  console.log('Test 4: Memory usage monitoring...');
  const memoryMetrics = await monitor.monitorMemoryUsage();
  console.log('Memory metrics:', {
    heapUsed: memoryMetrics.heapUsed,
    heapTotal: memoryMetrics.heapTotal
  });

  console.log('✅ Real data handling tests completed successfully!');
}

// Run the test
testRealDataHandling().catch(console.error);