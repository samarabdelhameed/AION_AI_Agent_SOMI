/**
 * @fileoverview Test Results Processor for Mainnet Testing
 * @description Process and format test results with performance metrics
 * @author AION Team
 */

import fs from 'fs';
import path from 'path';

/**
 * Process test results and generate comprehensive report
 */
export default function processTestResults(results) {
  const timestamp = new Date().toISOString();
  const reportDir = path.join(process.cwd(), 'tests/mainnet/reports');
  
  // Ensure reports directory exists
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  // Process results
  const processedResults = {
    timestamp,
    summary: {
      totalTests: results.numTotalTests,
      passedTests: results.numPassedTests,
      failedTests: results.numFailedTests,
      skippedTests: results.numPendingTests,
      successRate: results.numTotalTests > 0 ? (results.numPassedTests / results.numTotalTests) * 100 : 0,
      totalTime: results.testResults.reduce((acc, result) => acc + (result.perfStats?.end - result.perfStats?.start || 0), 0)
    },
    testSuites: results.testResults.map(processTestSuite),
    performance: calculatePerformanceMetrics(results),
    coverage: results.coverageMap ? processCoverage(results.coverageMap) : null
  };
  
  // Generate reports
  generateJSONReport(processedResults, reportDir);
  generateMarkdownReport(processedResults, reportDir);
  generateCSVReport(processedResults, reportDir);
  
  // Log summary
  logSummary(processedResults);
  
  return results;
}

/**
 * Process individual test suite
 */
function processTestSuite(testResult) {
  return {
    testFilePath: testResult.testFilePath,
    status: testResult.numFailingTests > 0 ? 'failed' : 'passed',
    duration: testResult.perfStats?.end - testResult.perfStats?.start || 0,
    tests: testResult.testResults.map(test => ({
      title: test.title,
      status: test.status,
      duration: test.duration || 0,
      error: test.failureMessages.length > 0 ? test.failureMessages[0] : null,
      location: test.location
    })),
    coverage: testResult.coverage,
    console: testResult.console
  };
}

/**
 * Calculate performance metrics
 */
function calculatePerformanceMetrics(results) {
  const durations = results.testResults
    .map(result => result.perfStats?.end - result.perfStats?.start || 0)
    .filter(duration => duration > 0);
  
  const totalDuration = durations.reduce((acc, duration) => acc + duration, 0);
  const avgDuration = durations.length > 0 ? totalDuration / durations.length : 0;
  const maxDuration = durations.length > 0 ? Math.max(...durations) : 0;
  const minDuration = durations.length > 0 ? Math.min(...durations) : 0;
  
  return {
    totalDuration,
    averageDuration: avgDuration,
    maxDuration,
    minDuration,
    testCount: durations.length
  };
}

/**
 * Process coverage information
 */
function processCoverage(coverageMap) {
  // This would process coverage data if available
  return {
    statements: { covered: 0, total: 0, percentage: 0 },
    branches: { covered: 0, total: 0, percentage: 0 },
    functions: { covered: 0, total: 0, percentage: 0 },
    lines: { covered: 0, total: 0, percentage: 0 }
  };
}

/**
 * Generate JSON report
 */
function generateJSONReport(results, reportDir) {
  const reportPath = path.join(reportDir, 'mainnet-test-results.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`📄 JSON report generated: ${reportPath}`);
}

/**
 * Generate Markdown report
 */
function generateMarkdownReport(results, reportDir) {
  const reportPath = path.join(reportDir, 'mainnet-test-report.md');
  
  const markdown = `# AION MCP Agent - Mainnet Test Report

## Test Summary
- **Timestamp:** ${results.timestamp}
- **Total Tests:** ${results.summary.totalTests}
- **Passed:** ${results.summary.passedTests} ✅
- **Failed:** ${results.summary.failedTests} ❌
- **Skipped:** ${results.summary.skippedTests} ⏭️
- **Success Rate:** ${results.summary.successRate.toFixed(2)}%
- **Total Time:** ${(results.summary.totalTime / 1000).toFixed(2)}s

## Performance Metrics
- **Average Duration:** ${(results.performance.averageDuration / 1000).toFixed(2)}s
- **Max Duration:** ${(results.performance.maxDuration / 1000).toFixed(2)}s
- **Min Duration:** ${(results.performance.minDuration / 1000).toFixed(2)}s

## Test Suites

${results.testSuites.map(suite => `
### ${path.basename(suite.testFilePath)}
- **Status:** ${suite.status === 'passed' ? '✅ Passed' : '❌ Failed'}
- **Duration:** ${(suite.duration / 1000).toFixed(2)}s
- **Tests:** ${suite.tests.length}

${suite.tests.map(test => `
#### ${test.title}
- **Status:** ${test.status === 'passed' ? '✅' : test.status === 'failed' ? '❌' : '⏭️'} ${test.status}
- **Duration:** ${test.duration}ms
${test.error ? `- **Error:** \`${test.error.split('\n')[0]}\`` : ''}
`).join('')}
`).join('')}

## Recommendations

${results.summary.successRate < 95 ? '⚠️ **Success rate below 95%** - Review failed tests and improve error handling.' : ''}
${results.performance.maxDuration > 30000 ? '⚠️ **Some tests taking longer than 30s** - Consider optimizing slow tests.' : ''}
${results.summary.failedTests > 0 ? '❌ **Failed tests detected** - Address failing tests before production deployment.' : '✅ **All tests passing** - System ready for production.'}
`;
  
  fs.writeFileSync(reportPath, markdown);
  console.log(`📄 Markdown report generated: ${reportPath}`);
}

/**
 * Generate CSV report
 */
function generateCSVReport(results, reportDir) {
  const reportPath = path.join(reportDir, 'mainnet-test-results.csv');
  
  const csvData = [
    ['Test Suite', 'Test Name', 'Status', 'Duration (ms)', 'Error'],
    ...results.testSuites.flatMap(suite =>
      suite.tests.map(test => [
        path.basename(suite.testFilePath),
        test.title,
        test.status,
        test.duration,
        test.error ? test.error.split('\n')[0] : ''
      ])
    )
  ];
  
  const csvContent = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  fs.writeFileSync(reportPath, csvContent);
  console.log(`📄 CSV report generated: ${reportPath}`);
}

/**
 * Log summary to console
 */
function logSummary(results) {
  console.log('\n📊 MAINNET TEST SUMMARY');
  console.log('========================');
  console.log(`✅ Passed: ${results.summary.passedTests}`);
  console.log(`❌ Failed: ${results.summary.failedTests}`);
  console.log(`⏭️ Skipped: ${results.summary.skippedTests}`);
  console.log(`📈 Success Rate: ${results.summary.successRate.toFixed(2)}%`);
  console.log(`⏱️ Total Time: ${(results.summary.totalTime / 1000).toFixed(2)}s`);
  console.log(`⚡ Avg Duration: ${(results.performance.averageDuration / 1000).toFixed(2)}s`);
  
  if (results.summary.failedTests > 0) {
    console.log('\n❌ FAILED TESTS:');
    results.testSuites.forEach(suite => {
      suite.tests.filter(test => test.status === 'failed').forEach(test => {
        console.log(`  - ${path.basename(suite.testFilePath)}: ${test.title}`);
      });
    });
  }
  
  console.log('\n========================\n');
}