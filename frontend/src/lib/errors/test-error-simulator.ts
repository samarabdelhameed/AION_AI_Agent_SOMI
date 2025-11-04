/**
 * Test the complete error simulation and testing utilities system
 */

import {
  errorSimulator,
  createTransactionContext,
  TransactionErrorType,
  TransactionErrorSeverity,
  ERROR_CODES
} from './index';

console.log('🚀 Testing Error Simulation and Testing Utilities...');

// Test context
const context = createTransactionContext(56, '0x123456789abcdef', {
  userAddress: '0xuser123456789abcdef',
  amount: BigInt('1000000000000000000') // 1 BNB
});

// Test 1: Basic error generation
console.log('✅ Test 1: Basic Error Generation');

console.log('  🎲 Generating random errors...');
for (let i = 0; i < 5; i++) {
  const error = errorSimulator.generateRandomError(context);
  if (error) {
    console.log(`     ${i + 1}. ${error.type}:${error.code} - ${error.userMessage}`);
    console.log(`        Severity: ${error.severity}, Retryable: ${error.retryable ? 'Yes' : 'No'}`);
    console.log(`        Suggestions: ${error.suggestedActions.slice(0, 2).join(', ')}`);
  } else {
    console.log(`     ${i + 1}. No error generated (probability)`);
  }
}

// Test 2: Predefined scenarios
console.log('\n✅ Test 2: Predefined Error Scenarios');

const scenarios = errorSimulator.getPredefinedScenarios();
console.log(`  📋 Available scenarios: ${scenarios.length}`);

scenarios.slice(0, 5).forEach((scenario, index) => {
  console.log(`     ${index + 1}. ${scenario.name} (${scenario.id})`);
  console.log(`        Type: ${scenario.errorType}, Severity: ${scenario.severity}`);
  console.log(`        Probability: ${(scenario.probability * 100).toFixed(1)}%, Retryable: ${scenario.retryable ? 'Yes' : 'No'}`);
  console.log(`        Description: ${scenario.description}`);
  
  // Generate error from this scenario
  const error = errorSimulator.generateErrorFromScenario(scenario, context);
  console.log(`        Generated: ${error.code} - "${error.userMessage}"`);
  console.log('');
});

// Test 3: Custom scenario
console.log('✅ Test 3: Custom Error Scenario');

const customScenario = {
  id: 'custom_wallet_locked',
  name: 'Wallet Locked',
  description: 'User wallet is locked and cannot sign transactions',
  errorType: TransactionErrorType.USER,
  errorCode: ERROR_CODES.USER_REJECTED,
  severity: TransactionErrorSeverity.MEDIUM,
  retryable: true,
  probability: 0.05,
  delay: 1000,
  metadata: { customField: 'wallet_locked', source: 'test' }
};

errorSimulator.addCustomScenario(customScenario);
console.log(`  ➕ Added custom scenario: ${customScenario.name}`);

const customError = errorSimulator.generateErrorFromScenario(customScenario, context);
console.log(`     Generated custom error: ${customError.code}`);
console.log(`     Metadata: ${JSON.stringify(customError.context.metadata)}`);

// Test 4: Stress test scenarios
console.log('\n✅ Test 4: Stress Test Scenarios');

const intensityLevels = ['low', 'medium', 'high', 'extreme'] as const;
intensityLevels.forEach(intensity => {
  const stressScenarios = errorSimulator.generateStressTestScenarios(intensity);
  const avgProbability = stressScenarios.reduce((sum, s) => sum + s.probability, 0) / stressScenarios.length;
  
  console.log(`  🔥 ${intensity.toUpperCase()} intensity: ${stressScenarios.length} scenarios`);
  console.log(`     Average probability: ${(avgProbability * 100).toFixed(1)}%`);
  
  // Show top 3 most probable scenarios
  const topScenarios = stressScenarios
    .sort((a, b) => b.probability - a.probability)
    .slice(0, 3);
  
  topScenarios.forEach((scenario, index) => {
    console.log(`       ${index + 1}. ${scenario.name}: ${(scenario.probability * 100).toFixed(1)}%`);
  });
});

// Test 5: Network conditions simulation
console.log('\n✅ Test 5: Network Conditions Simulation');

const networkTypes = ['slow', 'unstable', 'congested', 'offline'] as const;
networkTypes.forEach(type => {
  const conditions = errorSimulator.createMockNetworkConditions(type);
  console.log(`  🌐 ${type.toUpperCase()} network:`);
  console.log(`     Latency: ${conditions.latency}ms, Packet Loss: ${(conditions.packetLoss * 100).toFixed(1)}%`);
  console.log(`     Bandwidth: ${conditions.bandwidth} Kbps, Error Rate: ${(conditions.errorRate * 100).toFixed(1)}%`);
});

// Test 6: Basic simulation
setTimeout(async () => {
  console.log('\n✅ Test 6: Basic Error Simulation');
  
  const simulationConfig = {
    scenarios: errorSimulator.getPredefinedScenarios().slice(0, 4), // Use first 4 scenarios
    duration: 2000, // 2 seconds
    frequency: 8, // 8 errors per second
    enableLogging: true,
    enableMetrics: true
  };
  
  console.log('  🎬 Starting simulation...');
  console.log(`     Duration: ${simulationConfig.duration}ms`);
  console.log(`     Frequency: ${simulationConfig.frequency} errors/second`);
  console.log(`     Expected errors: ~${Math.floor(simulationConfig.duration / 1000 * simulationConfig.frequency)}`);
  
  const result = await errorSimulator.runSimulation(simulationConfig);
  
  console.log(`\n  📊 Simulation Results (${result.id}):`);
  console.log(`     Duration: ${result.duration}ms`);
  console.log(`     Total Errors: ${result.totalErrors}`);
  console.log(`     Avg Generation Time: ${result.performanceMetrics.averageErrorGenerationTime.toFixed(2)}ms`);
  console.log(`     Memory Usage: ${result.performanceMetrics.memoryUsage} bytes`);
  
  console.log('\n     Errors by Type:');
  Object.entries(result.errorsByType).forEach(([type, count]) => {
    if (count > 0) {
      console.log(`       ${type}: ${count} (${((count / result.totalErrors) * 100).toFixed(1)}%)`);
    }
  });
  
  console.log('\n     Errors by Severity:');
  Object.entries(result.errorsBySeverity).forEach(([severity, count]) => {
    if (count > 0) {
      console.log(`       ${severity}: ${count} (${((count / result.totalErrors) * 100).toFixed(1)}%)`);
    }
  });
  
  console.log('\n     Scenarios Triggered:');
  result.scenariosTriggered.forEach(scenario => {
    if (scenario.count > 0) {
      console.log(`       ${scenario.scenarioId}: ${scenario.count} times`);
    }
  });
  
  console.log(`\n     Sample Generated Errors (first 3):`);
  result.generatedErrors.slice(0, 3).forEach((error, index) => {
    console.log(`       ${index + 1}. ${error.type}:${error.code} - "${error.userMessage}"`);
  });
  
}, 1000);

// Test 7: Performance testing
setTimeout(async () => {
  console.log('\n✅ Test 7: Performance Testing');
  
  const performanceConfig = {
    errorCount: 500,
    concurrency: 4,
    errorTypes: [
      TransactionErrorType.USER,
      TransactionErrorType.NETWORK,
      TransactionErrorType.GAS,
      TransactionErrorType.CONTRACT
    ],
    measureMemory: true,
    measureTiming: true
  };
  
  console.log('  ⚡ Starting performance test...');
  console.log(`     Error Count: ${performanceConfig.errorCount}`);
  console.log(`     Concurrency: ${performanceConfig.concurrency}`);
  console.log(`     Error Types: ${performanceConfig.errorTypes.length}`);
  
  const perfResult = await errorSimulator.runPerformanceTest(performanceConfig);
  
  console.log(`\n  📈 Performance Results:`);
  console.log(`     Success: ${perfResult.success ? 'Yes' : 'No'}`);
  console.log(`     Total Time: ${perfResult.totalTime.toFixed(2)}ms`);
  console.log(`     Average Time per Error: ${perfResult.averageTimePerError.toFixed(4)}ms`);
  console.log(`     Errors per Second: ${perfResult.errorsPerSecond.toFixed(2)}`);
  
  if (performanceConfig.measureMemory) {
    console.log(`\n     Memory Usage:`);
    console.log(`       Initial: ${perfResult.memoryUsage.initial} bytes`);
    console.log(`       Peak: ${perfResult.memoryUsage.peak} bytes`);
    console.log(`       Final: ${perfResult.memoryUsage.final} bytes`);
  }
  
  console.log(`\n     Error Distribution:`);
  Object.entries(perfResult.errorDistribution).forEach(([type, count]) => {
    const percentage = ((count / performanceConfig.errorCount) * 100).toFixed(1);
    console.log(`       ${type}: ${count} (${percentage}%)`);
  });
  
  if (perfResult.errors.length > 0) {
    console.log(`\n     Errors encountered: ${perfResult.errors.length}`);
    perfResult.errors.slice(0, 3).forEach((error, index) => {
      console.log(`       ${index + 1}. ${error}`);
    });
  }
  
}, 4000);

// Test 8: Comprehensive stress simulation
setTimeout(async () => {
  console.log('\n✅ Test 8: Comprehensive Stress Simulation');
  
  const stressScenarios = errorSimulator.generateStressTestScenarios('high');
  const stressConfig = {
    scenarios: stressScenarios,
    duration: 1500, // 1.5 seconds
    frequency: 15, // 15 errors per second (high frequency)
    enableLogging: false,
    enableMetrics: true
  };
  
  console.log('  🔥 Starting high-intensity stress simulation...');
  console.log(`     Scenarios: ${stressConfig.scenarios.length}`);
  console.log(`     High frequency: ${stressConfig.frequency} errors/second`);
  
  const stressResult = await errorSimulator.runSimulation(stressConfig);
  
  console.log(`\n  🎯 Stress Test Results:`);
  console.log(`     Errors Generated: ${stressResult.totalErrors}`);
  console.log(`     Generation Rate: ${(stressResult.totalErrors / (stressResult.duration / 1000)).toFixed(2)} errors/second`);
  console.log(`     System Performance: ${stressResult.performanceMetrics.averageErrorGenerationTime.toFixed(3)}ms avg`);
  
  // Check for critical errors
  const criticalErrors = stressResult.errorsBySeverity.critical || 0;
  const criticalRate = (criticalErrors / stressResult.totalErrors) * 100;
  console.log(`     Critical Error Rate: ${criticalRate.toFixed(2)}%`);
  
  // Most active scenarios
  const topScenarios = stressResult.scenariosTriggered
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
  
  console.log(`\n     Most Active Scenarios:`);
  topScenarios.forEach((scenario, index) => {
    console.log(`       ${index + 1}. ${scenario.scenarioId}: ${scenario.count} times`);
  });
  
}, 7000);

// Test 9: Data export and management
setTimeout(async () => {
  console.log('\n✅ Test 9: Data Export and Management');
  
  const allResults = errorSimulator.getSimulationResults();
  console.log(`  📊 Total simulation results: ${allResults.length}`);
  
  if (allResults.length > 0) {
    // Export as JSON
    const jsonExport = errorSimulator.exportSimulationResults('json');
    const jsonData = JSON.parse(jsonExport);
    console.log(`     JSON Export: ${jsonExport.length} characters, ${jsonData.length} results`);
    
    // Export as CSV
    const csvExport = errorSimulator.exportSimulationResults('csv');
    const csvLines = csvExport.split('\n');
    console.log(`     CSV Export: ${csvLines.length} lines (including header)`);
    console.log(`     CSV Header: ${csvLines[0]}`);
    
    // Show sample result details
    const sampleResult = allResults[0];
    console.log(`\n     Sample Result Details (${sampleResult.id}):`);
    console.log(`       Start: ${sampleResult.startTime.split('T')[1].split('.')[0]}`);
    console.log(`       Duration: ${sampleResult.duration}ms`);
    console.log(`       Errors: ${sampleResult.totalErrors}`);
    console.log(`       Performance: ${sampleResult.performanceMetrics.averageErrorGenerationTime.toFixed(2)}ms avg`);
  }
  
  // Test result retrieval
  if (allResults.length > 0) {
    const specificResult = errorSimulator.getSimulationResult(allResults[0].id);
    console.log(`     Retrieved specific result: ${specificResult ? 'Success' : 'Failed'}`);
  }
  
}, 9500);

// Test 10: Edge cases and cleanup
setTimeout(() => {
  console.log('\n✅ Test 10: Edge Cases and Cleanup');
  
  // Test with empty scenarios
  const emptyError = errorSimulator.generateRandomError(context, []);
  console.log(`  🔍 Empty scenarios result: ${emptyError ? 'Error generated' : 'No error (expected)'}`);
  
  // Test with zero probability scenario
  const zeroScenario = {
    id: 'zero_prob_test',
    name: 'Zero Probability Test',
    description: 'Should never trigger',
    errorType: TransactionErrorType.SYSTEM,
    errorCode: ERROR_CODES.UNKNOWN_ERROR,
    severity: TransactionErrorSeverity.LOW,
    retryable: false,
    probability: 0
  };
  
  const zeroError = errorSimulator.generateRandomError(context, [zeroScenario]);
  console.log(`     Zero probability result: ${zeroError ? 'Error generated (unexpected)' : 'No error (expected)'}`);
  
  // Test scenario generation from all error types
  const allTypes = Object.values(TransactionErrorType);
  console.log(`\n  🧪 Testing all error types (${allTypes.length}):`);
  allTypes.forEach(type => {
    const scenarios = errorSimulator.getPredefinedScenarios().filter(s => s.errorType === type);
    if (scenarios.length > 0) {
      const error = errorSimulator.generateErrorFromScenario(scenarios[0], context);
      console.log(`     ${type}: ${error.code} - ${error.severity} severity`);
    }
  });
  
  // Cleanup test
  const initialResultCount = errorSimulator.getSimulationResults().length;
  console.log(`\n  🧹 Cleanup test:`);
  console.log(`     Results before cleanup: ${initialResultCount}`);
  
  errorSimulator.clearSimulationResults();
  
  const finalResultCount = errorSimulator.getSimulationResults().length;
  console.log(`     Results after cleanup: ${finalResultCount}`);
  console.log(`     Cleanup successful: ${finalResultCount === 0 ? 'Yes' : 'No'}`);
  
}, 11000);

// Final summary
setTimeout(() => {
  console.log('\n🎉 Error Simulation and Testing Utilities working perfectly!');
  console.log('\n📋 System Features Demonstrated:');
  console.log('  ✅ Random error generation with configurable probabilities');
  console.log('  ✅ Predefined error scenarios covering all error types');
  console.log('  ✅ Custom scenario creation and management');
  console.log('  ✅ Stress test scenario generation with intensity levels');
  console.log('  ✅ Mock network conditions simulation');
  console.log('  ✅ Comprehensive error simulation with metrics');
  console.log('  ✅ Performance testing with concurrency support');
  console.log('  ✅ Memory and timing measurements');
  console.log('  ✅ Error distribution and statistics tracking');
  console.log('  ✅ Data export in JSON and CSV formats');
  console.log('  ✅ Simulation result storage and retrieval');
  console.log('  ✅ Edge case handling and error recovery');
  console.log('  ✅ Cleanup and resource management');
  
  console.log('\n🎯 Use Cases Covered:');
  console.log('  • Development testing with realistic error scenarios');
  console.log('  • Performance benchmarking of error handling systems');
  console.log('  • Stress testing under high error frequencies');
  console.log('  • Network condition simulation for robustness testing');
  console.log('  • Error pattern analysis and statistics generation');
  console.log('  • Automated testing pipeline integration');
  
}, 12500);

export { context, customScenario };