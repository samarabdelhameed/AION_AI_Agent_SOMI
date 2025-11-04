/**
 * @fileoverview Test Sequencer for Mainnet Testing
 * @description Custom test sequencer to run tests in optimal order
 * @author AION Team
 */

import { TestSequencer } from '@jest/test-sequencer';

export default class MainnetTestSequencer extends TestSequencer {
  /**
   * Sort tests in optimal order for mainnet testing
   */
  sort(tests) {
    // Define test execution order based on dependencies and importance
    const testOrder = [
      // 1. Infrastructure and connectivity tests first
      'connectivity',
      'setup',
      
      // 2. Basic functionality tests
      'market-data',
      'smart-contracts',
      
      // 3. API endpoint tests
      'api-endpoints',
      
      // 4. Data quality and validation tests
      'data-quality',
      'security',
      
      // 5. Performance and load tests
      'performance',
      'error-handling',
      
      // 6. Monitoring and metrics tests
      'monitoring',
      
      // 7. End-to-end tests last
      'end-to-end'
    ];
    
    // Sort tests based on the defined order
    return tests.sort((testA, testB) => {
      const pathA = testA.path;
      const pathB = testB.path;
      
      // Get priority based on test type
      const priorityA = this.getTestPriority(pathA, testOrder);
      const priorityB = this.getTestPriority(pathB, testOrder);
      
      // Sort by priority first
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      
      // If same priority, sort alphabetically
      return pathA.localeCompare(pathB);
    });
  }
  
  /**
   * Get test priority based on path
   */
  getTestPriority(testPath, testOrder) {
    for (let i = 0; i < testOrder.length; i++) {
      if (testPath.includes(testOrder[i])) {
        return i;
      }
    }
    
    // Default priority for unmatched tests
    return testOrder.length;
  }
}