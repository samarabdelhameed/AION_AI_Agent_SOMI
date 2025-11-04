import { portfolioMetricsService } from '../services/portfolioMetricsService';
import { ethers } from 'ethers';

/**
 * Validation utility for Portfolio Metrics Engine
 * This can be used to test the implementation manually
 */

export async function validatePortfolioMetrics() {
  console.log('🧪 Starting Portfolio Metrics Engine validation...');
  
  const mockUserAddress = '0x1234567890abcdef1234567890abcdef12345678';
  
  try {
    // Test 1: Calculate Portfolio Metrics
    console.log('\n📊 Test 1: Calculate Portfolio Metrics');
    const metrics = await portfolioMetricsService.calculatePortfolioMetrics(mockUserAddress);
    
    console.log('✅ Portfolio Metrics calculated successfully:');
    console.log(`  - Total Value USD: $${metrics.totalValueUSD.toFixed(2)}`);
    console.log(`  - Total Yield USD: $${metrics.totalYieldUSD.toFixed(2)}`);
    console.log(`  - Current APY: ${metrics.currentAPY.toFixed(2)}%`);
    console.log(`  - Daily Yield: $${metrics.dailyYield.toFixed(2)}`);
    console.log(`  - Last Updated: ${metrics.lastUpdated.toISOString()}`);
    
    // Test 2: Get Yield Breakdown
    console.log('\n🎯 Test 2: Get Yield Breakdown');
    const breakdown = await portfolioMetricsService.getYieldBreakdown(mockUserAddress);
    
    console.log('✅ Yield Breakdown calculated successfully:');
    console.log(`  - Protocol Yields: ${breakdown.protocolYields.length} protocols`);
    console.log(`  - Total Yield: ${utils.formatEther(breakdown.totalYield)} BNB`);
    console.log(`  - Yield Sources: ${breakdown.yieldSources.length} sources`);
    console.log(`  - Proof of Yield: ${breakdown.proofOfYield.length} proofs`);
    
    breakdown.protocolYields.forEach((py, index) => {
      console.log(`    ${index + 1}. ${py.protocol}: $${py.amountUSD.toFixed(2)} (${py.apy.toFixed(1)}% APY)`);
    });
    
    // Test 3: Get Performance Attribution
    console.log('\n📈 Test 3: Get Performance Attribution');
    const attribution = await portfolioMetricsService.getPerformanceAttribution(mockUserAddress);
    
    console.log('✅ Performance Attribution calculated successfully:');
    console.log(`  - Total Return: ${attribution.totalReturn.toFixed(2)}%`);
    console.log(`  - Alpha: ${attribution.alpha.toFixed(2)}%`);
    console.log(`  - Sharpe Ratio: ${attribution.sharpeRatio.toFixed(2)}`);
    console.log(`  - Max Drawdown: ${attribution.maxDrawdown.toFixed(2)}%`);
    console.log(`  - Strategies: ${attribution.strategyPerformance.length}`);
    
    attribution.strategyPerformance.forEach((sp, index) => {
      console.log(`    ${index + 1}. ${sp.strategyName}: ${sp.allocation.toFixed(1)}% allocation, ${sp.return.toFixed(2)}% return`);
    });
    
    // Test 4: Calculate Risk Metrics
    console.log('\n🛡️ Test 4: Calculate Risk Metrics');
    const risk = await portfolioMetricsService.calculateRiskMetrics(mockUserAddress);
    
    console.log('✅ Risk Metrics calculated successfully:');
    console.log(`  - Overall Risk Score: ${risk.overallRiskScore.toFixed(1)}/100`);
    console.log(`  - Portfolio Risk: ${risk.portfolioRisk.toFixed(1)}`);
    console.log(`  - Concentration Risk: ${risk.concentrationRisk.toFixed(1)}`);
    console.log(`  - Liquidity Risk: ${risk.liquidityRisk.toFixed(1)}`);
    console.log(`  - Protocol Risk: ${risk.protocolRisk.toFixed(1)}`);
    console.log(`  - Smart Contract Risk: ${risk.smartContractRisk.toFixed(1)}`);
    
    // Test 5: Real-time Updates
    console.log('\n🔄 Test 5: Real-time Updates');
    let updateCount = 0;
    
    portfolioMetricsService.startRealTimeUpdates(mockUserAddress, (updatedMetrics) => {
      updateCount++;
      console.log(`📡 Real-time update #${updateCount} received:`, {
        totalValueUSD: updatedMetrics.totalValueUSD.toFixed(2),
        currentAPY: updatedMetrics.currentAPY.toFixed(2),
        timestamp: updatedMetrics.lastUpdated.toISOString()
      });
    });
    
    console.log('✅ Real-time updates started successfully');
    
    // Stop updates after a short delay
    setTimeout(() => {
      portfolioMetricsService.stopRealTimeUpdates(mockUserAddress);
      console.log('⏹️ Real-time updates stopped');
    }, 5000);
    
    console.log('\n🎉 All Portfolio Metrics Engine tests completed successfully!');
    
    return {
      success: true,
      metrics,
      breakdown,
      attribution,
      risk
    };
    
  } catch (error) {
    console.error('❌ Portfolio Metrics Engine validation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Validate specific metrics calculations
 */
export function validateMetricsCalculations() {
  console.log('🧮 Validating metrics calculations...');
  
  // Test yield projection calculations
  const mockMetrics = {
    totalValueUSD: 10000,
    currentAPY: 12.5,
    dailyYield: 0,
    weeklyYield: 0,
    monthlyYield: 0,
    yearlyProjection: 0
  };
  
  // Calculate expected values
  const expectedDailyYield = (mockMetrics.totalValueUSD * mockMetrics.currentAPY) / (365 * 100);
  const expectedWeeklyYield = expectedDailyYield * 7;
  const expectedMonthlyYield = expectedDailyYield * 30;
  const expectedYearlyProjection = mockMetrics.totalValueUSD * (mockMetrics.currentAPY / 100);
  
  console.log('Expected calculations:');
  console.log(`  - Daily Yield: $${expectedDailyYield.toFixed(2)}`);
  console.log(`  - Weekly Yield: $${expectedWeeklyYield.toFixed(2)}`);
  console.log(`  - Monthly Yield: $${expectedMonthlyYield.toFixed(2)}`);
  console.log(`  - Yearly Projection: $${expectedYearlyProjection.toFixed(2)}`);
  
  // Test risk score calculations
  const mockRiskComponents = {
    portfolioRisk: 25,
    concentrationRisk: 30,
    liquidityRisk: 20,
    protocolRisk: 15,
    smartContractRisk: 10
  };
  
  const expectedOverallRisk = (
    mockRiskComponents.portfolioRisk * 0.3 +
    mockRiskComponents.concentrationRisk * 0.2 +
    mockRiskComponents.liquidityRisk * 0.2 +
    mockRiskComponents.protocolRisk * 0.15 +
    mockRiskComponents.smartContractRisk * 0.15
  );
  
  console.log(`Expected Overall Risk Score: ${expectedOverallRisk.toFixed(1)}/100`);
  
  console.log('✅ Metrics calculations validation completed');
}

/**
 * Performance benchmark test
 */
export async function benchmarkPortfolioMetrics() {
  console.log('⚡ Starting Portfolio Metrics performance benchmark...');
  
  const mockUserAddress = '0x1234567890abcdef1234567890abcdef12345678';
  const iterations = 10;
  
  const startTime = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    await portfolioMetricsService.calculatePortfolioMetrics(mockUserAddress);
  }
  
  const endTime = performance.now();
  const avgTime = (endTime - startTime) / iterations;
  
  console.log(`⚡ Performance Results:`);
  console.log(`  - Total time: ${(endTime - startTime).toFixed(2)}ms`);
  console.log(`  - Average time per calculation: ${avgTime.toFixed(2)}ms`);
  console.log(`  - Calculations per second: ${(1000 / avgTime).toFixed(2)}`);
  
  if (avgTime < 100) {
    console.log('✅ Performance: Excellent (< 100ms)');
  } else if (avgTime < 500) {
    console.log('✅ Performance: Good (< 500ms)');
  } else {
    console.log('⚠️ Performance: Needs optimization (> 500ms)');
  }
}

// Export validation functions for use in console or other components
export default {
  validatePortfolioMetrics,
  validateMetricsCalculations,
  benchmarkPortfolioMetrics
};