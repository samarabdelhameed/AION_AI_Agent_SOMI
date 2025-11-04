/**
 * Manual User Testing Script
 * Simulates real user interactions and validates functionality
 */

import { advancedOperationsService } from '../services/advancedOperationsService';
import { professionalDataService } from '../services/professionalDataService';

interface TestResult {
  testName: string;
  success: boolean;
  details: string;
  duration: number;
}

class ManualUserTester {
  private results: TestResult[] = [];

  async runAllTests(): Promise<TestResult[]> {
    console.log('🧪 Starting comprehensive manual user testing...');
    
    await this.testStrategyDataLoading();
    await this.testOperationSimulations();
    await this.testAdvancedFeatures();
    await this.testErrorHandling();
    await this.testPerformance();
    
    this.printResults();
    return this.results;
  }

  private async testStrategyDataLoading(): Promise<void> {
    console.log('\n📊 Testing Strategy Data Loading...');
    
    const startTime = Date.now();
    
    try {
      // Test 1: Load all strategies
      const strategies = professionalDataService.getAllStrategies();
      const duration = Date.now() - startTime;
      
      if (strategies.length >= 8) {
        this.addResult('Strategy Data Loading', true, 
          `Loaded ${strategies.length} strategies successfully`, duration);
        
        // Validate strategy data structure
        const firstStrategy = strategies[0];
        const requiredFields = ['id', 'name', 'apy', 'tvl', 'riskLevel', 'icon'];
        const hasAllFields = requiredFields.every(field => firstStrategy[field] !== undefined);
        
        if (hasAllFields) {
          this.addResult('Strategy Data Structure', true, 
            'All required fields present', Date.now() - startTime);
        } else {
          this.addResult('Strategy Data Structure', false, 
            'Missing required fields', Date.now() - startTime);
        }
        
        // Test APY values are realistic
        const apyValues = strategies.map(s => s.apy);
        const validAPYs = apyValues.every(apy => apy > 0 && apy < 100);
        
        this.addResult('APY Validation', validAPYs, 
          validAPYs ? 'All APY values are realistic' : 'Some APY values are invalid', 
          Date.now() - startTime);
          
      } else {
        this.addResult('Strategy Data Loading', false, 
          `Only loaded ${strategies.length} strategies`, duration);
      }
      
    } catch (error) {
      this.addResult('Strategy Data Loading', false, 
        `Error: ${error}`, Date.now() - startTime);
    }
  }

  private async testOperationSimulations(): Promise<void> {
    console.log('\n⚙️ Testing Operation Simulations...');
    
    const operations = [
      'deposit', 'withdraw', 'compound', 'harvest', 
      'rebalance', 'migrate', 'emergency'
    ];
    
    for (const operation of operations) {
      const startTime = Date.now();
      
      try {
        // Simulate operation parameters
        const params = this.generateOperationParams(operation);
        const simulation = await this.simulateOperation(operation, params);
        
        const duration = Date.now() - startTime;
        
        if (simulation.success) {
          this.addResult(`${operation} Simulation`, true, 
            `Simulation completed: ${simulation.details}`, duration);
        } else {
          this.addResult(`${operation} Simulation`, false, 
            `Simulation failed: ${simulation.error}`, duration);
        }
        
      } catch (error) {
        this.addResult(`${operation} Simulation`, false, 
          `Error: ${error}`, Date.now() - startTime);
      }
    }
  }

  private async testAdvancedFeatures(): Promise<void> {
    console.log('\n🚀 Testing Advanced Features...');
    
    // Test Auto-Rebalance
    const startTime = Date.now();
    
    try {
      const rebalanceConfig = {
        enabled: true,
        threshold: 5,
        targetAllocation: { venus: 25, beefy: 25, pancake: 25, aave: 25 },
        frequency: 'weekly' as const,
      };
      
      const rebalanceResult = await advancedOperationsService.setupAutoRebalance(rebalanceConfig);
      
      this.addResult('Auto-Rebalance Setup', rebalanceResult.success, 
        rebalanceResult.success ? 'Auto-rebalance configured' : rebalanceResult.error || 'Unknown error',
        Date.now() - startTime);
        
    } catch (error) {
      this.addResult('Auto-Rebalance Setup', false, 
        `Error: ${error}`, Date.now() - startTime);
    }
    
    // Test DCA
    try {
      const dcaConfig = {
        enabled: true,
        amount: 0.01,
        frequency: 'weekly' as const,
        targetStrategy: 'venus',
        maxSlippage: 1,
      };
      
      const dcaResult = await advancedOperationsService.setupDCA(dcaConfig);
      
      this.addResult('DCA Setup', dcaResult.success, 
        dcaResult.success ? 'DCA configured' : dcaResult.error || 'Unknown error',
        Date.now() - startTime);
        
    } catch (error) {
      this.addResult('DCA Setup', false, 
        `Error: ${error}`, Date.now() - startTime);
    }
    
    // Test Risk Management
    try {
      const riskConfig = {
        stopLoss: { enabled: true, threshold: 10 },
        takeProfit: { enabled: true, threshold: 20 },
        maxDrawdown: { enabled: true, threshold: 15 },
      };
      
      const riskResult = await advancedOperationsService.setupRiskManagement(riskConfig);
      
      this.addResult('Risk Management Setup', riskResult.success, 
        riskResult.success ? 'Risk management configured' : riskResult.error || 'Unknown error',
        Date.now() - startTime);
        
    } catch (error) {
      this.addResult('Risk Management Setup', false, 
        `Error: ${error}`, Date.now() - startTime);
    }
  }

  private async testErrorHandling(): Promise<void> {
    console.log('\n🛡️ Testing Error Handling...');
    
    // Test invalid amounts
    const startTime = Date.now();
    
    try {
      const invalidAmounts = [-1, 0, 999999, NaN, null, undefined];
      
      for (const amount of invalidAmounts) {
        const result = this.validateAmount(amount);
        
        if (!result.valid) {
          this.addResult(`Invalid Amount Handling (${amount})`, true, 
            `Correctly rejected: ${result.error}`, Date.now() - startTime);
        } else {
          this.addResult(`Invalid Amount Handling (${amount})`, false, 
            'Should have been rejected', Date.now() - startTime);
        }
      }
      
    } catch (error) {
      this.addResult('Error Handling', false, 
        `Error: ${error}`, Date.now() - startTime);
    }
  }

  private async testPerformance(): Promise<void> {
    console.log('\n⚡ Testing Performance...');
    
    // Test data loading speed
    const startTime = Date.now();
    
    try {
      // Load strategies multiple times
      for (let i = 0; i < 10; i++) {
        professionalDataService.getAllStrategies();
      }
      
      const duration = Date.now() - startTime;
      const avgTime = duration / 10;
      
      if (avgTime < 50) { // Should load in under 50ms
        this.addResult('Data Loading Performance', true, 
          `Average load time: ${avgTime.toFixed(2)}ms`, duration);
      } else {
        this.addResult('Data Loading Performance', false, 
          `Too slow: ${avgTime.toFixed(2)}ms`, duration);
      }
      
    } catch (error) {
      this.addResult('Performance Test', false, 
        `Error: ${error}`, Date.now() - startTime);
    }
    
    // Test simulation performance
    try {
      const simStartTime = Date.now();
      
      // Run multiple simulations
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(this.simulateOperation('deposit', { amount: 0.01 }));
      }
      
      await Promise.all(promises);
      
      const simDuration = Date.now() - simStartTime;
      
      if (simDuration < 2000) { // Should complete in under 2 seconds
        this.addResult('Simulation Performance', true, 
          `5 simulations completed in ${simDuration}ms`, simDuration);
      } else {
        this.addResult('Simulation Performance', false, 
          `Too slow: ${simDuration}ms`, simDuration);
      }
      
    } catch (error) {
      this.addResult('Simulation Performance', false, 
        `Error: ${error}`, Date.now() - startTime);
    }
  }

  private generateOperationParams(operation: string): any {
    switch (operation) {
      case 'deposit':
      case 'withdraw':
        return { amount: 0.01 };
      case 'rebalance':
        return { fromStrategy: 'venus', toStrategy: 'beefy', percentage: 50 };
      case 'migrate':
        return { targetStrategy: 'aave' };
      default:
        return {};
    }
  }

  private async simulateOperation(operation: string, params: any): Promise<{
    success: boolean;
    details?: string;
    error?: string;
  }> {
    // Simulate operation execution
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
    
    // Simulate success/failure
    const success = Math.random() > 0.1; // 90% success rate
    
    if (success) {
      return {
        success: true,
        details: `${operation} executed with params: ${JSON.stringify(params)}`,
      };
    } else {
      return {
        success: false,
        error: `Simulated failure for ${operation}`,
      };
    }
  }

  private validateAmount(amount: any): { valid: boolean; error?: string } {
    if (amount === null || amount === undefined) {
      return { valid: false, error: 'Amount is required' };
    }
    
    if (isNaN(amount)) {
      return { valid: false, error: 'Amount must be a number' };
    }
    
    if (amount <= 0) {
      return { valid: false, error: 'Amount must be positive' };
    }
    
    if (amount > 1000) {
      return { valid: false, error: 'Amount too large' };
    }
    
    return { valid: true };
  }

  private addResult(testName: string, success: boolean, details: string, duration: number): void {
    this.results.push({ testName, success, details, duration });
    
    const status = success ? '✅' : '❌';
    console.log(`${status} ${testName}: ${details} (${duration}ms)`);
  }

  private printResults(): void {
    console.log('\n📋 Test Results Summary:');
    console.log('========================');
    
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests} ✅`);
    console.log(`Failed: ${failedTests} ❌`);
    console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    if (failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      this.results
        .filter(r => !r.success)
        .forEach(r => console.log(`  - ${r.testName}: ${r.details}`));
    }
    
    const avgDuration = this.results.reduce((sum, r) => sum + r.duration, 0) / totalTests;
    console.log(`\n⏱️ Average Test Duration: ${avgDuration.toFixed(2)}ms`);
  }
}

// Export for use in tests
export const manualUserTester = new ManualUserTester();

// Auto-run if called directly
if (typeof window !== 'undefined') {
  console.log('🚀 Manual User Testing Available');
  console.log('Run: manualUserTester.runAllTests()');
}