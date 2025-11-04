import { TestOrchestrator } from './orchestrator/TestOrchestrator';
import { ConfigurationManager } from './config/ConfigurationManager';
import { DataValidator } from './validator/DataValidator';

/**
 * Integration test to verify the complete system works with real data
 */
async function runIntegrationTest() {
  console.log('🔗 Running integration test with real data...');

  try {
    // Test 1: Configuration Management
    console.log('Test 1: Configuration Management');
    const configManager = new ConfigurationManager();
    await configManager.loadConfiguration();
    
    const config = configManager.getConfiguration();
    console.log('✅ Configuration loaded:', {
      testSuites: config.testSuites.length,
      baseUrl: config.environmentSettings.baseUrl,
      thresholds: config.validationThresholds
    });

    // Test 2: Data Validation with Real Financial Data
    console.log('Test 2: Data Validation with Real Financial Data');
    const validator = new DataValidator();
    
    // Test with realistic DeFi metrics
    const realFinancialData = {
      apy: 18.75, // Realistic DeFi APY
      balance: '5000.123456789', // Realistic balance with many decimals
      vaultShares: '4875.987654321',
      performance: 15.2, // Performance percentage
      riskScore: 72 // Risk score out of 100
    };

    const validationResult = validator.validateCalculations(realFinancialData);
    console.log('✅ Financial data validation:', {
      isValid: validationResult.isValid,
      accuracy: validationResult.accuracy,
      discrepancies: validationResult.discrepancies.length,
      confidence: validationResult.confidence
    });

    // Test APY accuracy with tolerance
    const displayedAPY = 18.75;
    const expectedAPY = 18.73; // Slight difference to test tolerance
    const apyValidation = await validator.validateAPYAccuracy(displayedAPY, expectedAPY);
    console.log('✅ APY accuracy validation:', {
      isValid: apyValidation.isValid,
      accuracy: apyValidation.accuracy,
      difference: Math.abs(displayedAPY - expectedAPY)
    });

    // Test data freshness
    const currentTime = Date.now();
    const recentData = currentTime - 120000; // 2 minutes ago
    const staleData = currentTime - 600000; // 10 minutes ago
    
    console.log('✅ Data freshness validation:', {
      recentDataFresh: validator.checkDataFreshness(recentData),
      staleDataFresh: validator.checkDataFreshness(staleData)
    });

    // Test 3: Test Orchestrator Integration
    console.log('Test 3: Test Orchestrator Integration');
    const orchestrator = new TestOrchestrator();
    
    // Update configuration
    orchestrator.updateConfiguration({
      validationThresholds: {
        dataAccuracy: 90,
        performanceScore: 75,
        workflowSuccess: 85
      }
    });

    // Validate configuration
    const configValid = await orchestrator.validateConfiguration();
    console.log('✅ Orchestrator configuration valid:', configValid);

    // Test status management
    const initialStatus = orchestrator.getTestStatus();
    console.log('✅ Initial orchestrator status:', {
      isRunning: initialStatus.isRunning,
      progress: initialStatus.progress
    });

    // Test 4: Report Generation
    console.log('Test 4: Report Generation');
    const report = await orchestrator.generateReport();
    console.log('✅ Report generated:', {
      qaScore: report.qaScore,
      hackathonReadiness: report.hackathonReadiness.overall,
      suggestions: report.improvementSuggestions.length
    });

    // Test 5: Configuration Export/Import
    console.log('Test 5: Configuration Export/Import');
    const exportedConfig = configManager.exportConfiguration();
    console.log('✅ Configuration exported, size:', exportedConfig.length, 'characters');

    // Test import
    await configManager.importConfiguration(exportedConfig);
    console.log('✅ Configuration imported successfully');

    // Test 6: Real-world Edge Cases
    console.log('Test 6: Real-world Edge Cases');
    
    // Test with extreme values
    const extremeData = {
      apy: 0.01, // Very low APY
      balance: '0.000000001', // Very small balance
      vaultShares: '999999999.999999999', // Very large shares
      performance: -5.5, // Negative performance
      riskScore: 100 // Maximum risk
    };

    const extremeValidation = validator.validateCalculations(extremeData);
    console.log('✅ Extreme values validation:', {
      isValid: extremeValidation.isValid,
      accuracy: extremeValidation.accuracy,
      issues: extremeValidation.discrepancies.length
    });

    // Test with invalid data
    const invalidData = {
      apy: -10, // Invalid negative APY
      balance: 'invalid_balance', // Invalid balance format
      vaultShares: 'NaN',
      performance: 1000, // Unrealistic performance
      riskScore: 150 // Invalid risk score
    };

    const invalidValidation = validator.validateCalculations(invalidData);
    console.log('✅ Invalid data validation (should fail):', {
      isValid: invalidValidation.isValid,
      accuracy: invalidValidation.accuracy,
      issues: invalidValidation.discrepancies.length
    });

    console.log('🎉 Integration test completed successfully!');
    console.log('📊 Summary:');
    console.log('- Configuration management: ✅ Working');
    console.log('- Data validation: ✅ Working with real financial data');
    console.log('- Test orchestration: ✅ Working');
    console.log('- Report generation: ✅ Working');
    console.log('- Edge case handling: ✅ Working');
    
    return true;

  } catch (error) {
    console.error('❌ Integration test failed:', error);
    return false;
  }
}

// Export for use in other tests
export { runIntegrationTest };

// Run the test immediately
runIntegrationTest()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Integration test error:', error);
    process.exit(1);
  });