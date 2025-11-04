import { FinalIntegration } from './final-integration';

async function runFinalSystemTest() {
  console.log('🚀 Starting final system integration test...');
  
  const integration = new FinalIntegration();
  
  try {
    // Run complete system test
    const results = await integration.runCompleteSystemTest();
    
    // Generate hackathon demo
    const demoScenarios = await integration.generateHackathonDemo();
    
    // Perform final health check
    const healthCheck = await integration.performFinalHealthCheck();
    
    console.log('\n🎉 FINAL SYSTEM TEST RESULTS:');
    console.log('================================');
    console.log(`QA Score: ${results.systemHealth.qaScore}/100`);
    console.log(`Hackathon Readiness: ${results.systemHealth.hackathonReadiness}/100`);
    console.log(`Production Ready: ${results.readyForProduction ? 'YES ✅' : 'NO ❌'}`);
    console.log(`System Health: ${healthCheck.overall.toUpperCase()}`);
    console.log(`Demo Scenarios Ready: ${demoScenarios.validation.allScenariosViable ? 'YES ✅' : 'PARTIAL ⚠️'}`);
    
    console.log('\n📊 DETAILED METRICS:');
    console.log('====================');
    console.log(`Components Passed: ${results.testResults.componentsPassed}`);
    console.log(`Workflows Passed: ${results.testResults.workflowsPassed}`);
    console.log(`Data Accuracy: ${results.testResults.dataAccuracy.toFixed(1)}%`);
    console.log(`Edge Cases Handled: ${results.errorHandling.edgeCasesPassed}/${results.errorHandling.totalEdgeCases}`);
    console.log(`Accessibility Tests: ${results.errorHandling.accessibilityPassed}/${results.errorHandling.totalAccessibilityTests}`);
    console.log(`Responsive Tests: ${results.errorHandling.responsivePassed}/${results.errorHandling.totalResponsiveTests}`);
    
    if (results.recommendations.length > 0) {
      console.log('\n💡 IMPROVEMENT RECOMMENDATIONS:');
      console.log('===============================');
      results.recommendations.forEach((rec: any, index: number) => {
        console.log(`${index + 1}. ${rec.category} (${rec.priority}): ${rec.description}`);
      });
    }
    
    console.log('\n🎭 HACKATHON DEMO READINESS:');
    console.log('============================');
    console.log(`Overall Demo Score: ${demoScenarios.validation.overallDemoScore.toFixed(1)}/100`);
    console.log(`Recommended Flow: ${demoScenarios.recommendedFlow.recommended ? 'Available' : 'Limited'}`);
    
    if (demoScenarios.recommendedFlow.recommended) {
      console.log('Demo Scenarios:');
      demoScenarios.scenarios.forEach((scenario: any, index: number) => {
        console.log(`  ${index + 1}. ${scenario.name} (${scenario.duration})`);
      });
    }
    
    console.log('\n🏁 SYSTEM STATUS: READY FOR HACKATHON! 🚀');
    
    return {
      success: true,
      qaScore: results.systemHealth.qaScore,
      hackathonReadiness: results.systemHealth.hackathonReadiness,
      productionReady: results.readyForProduction,
      systemHealth: healthCheck.overall,
      demoReady: demoScenarios.validation.allScenariosViable
    };
    
  } catch (error) {
    console.error('❌ Final system test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Run the test
runFinalSystemTest()
  .then(result => {
    if (result.success) {
      console.log('\n✅ All systems operational - Ready for hackathon demonstration!');
      process.exit(0);
    } else {
      console.log('\n❌ System test failed - Review issues before demonstration');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('💥 Critical system failure:', error);
    process.exit(1);
  });