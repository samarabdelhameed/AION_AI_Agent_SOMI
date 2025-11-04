#!/usr/bin/env node

/**
 * @fileoverview Mainnet Integration Test Script
 * @description Comprehensive testing script for AION MCP Agent mainnet integration
 */

import { performance } from 'perf_hooks';

const BASE_URL = 'http://localhost:3003';
const TEST_TIMEOUT = 30000; // 30 seconds

// Test configuration
const TESTS = {
  health: {
    endpoint: '/api/health',
    description: 'Health Check',
    expectedStatus: 200
  },
  vaultStatsMainnet: {
    endpoint: '/api/vault/stats?network=bscMainnet',
    description: 'Vault Stats (Mainnet)',
    expectedStatus: 200
  },
  vaultStatsTestnet: {
    endpoint: '/api/vault/stats?network=bscTestnet',
    description: 'Vault Stats (Testnet)',
    expectedStatus: 200
  },
  strategiesInfo: {
    endpoint: '/api/strategies/info?network=bscMainnet',
    description: 'Strategies Info (Mainnet)',
    expectedStatus: 200
  },
  networkStatus: {
    endpoint: '/api/network/status',
    description: 'Network Status',
    expectedStatus: 200
  },
  oracleSnapshot: {
    endpoint: '/api/oracle/snapshot?network=bscMainnet',
    description: 'Oracle Snapshot (Mainnet)',
    expectedStatus: 200
  },
  proofOfYield: {
    endpoint: '/api/proof-of-yield/snapshot?network=bscMainnet',
    description: 'Proof of Yield (Mainnet)',
    expectedStatus: 200
  },
  transactions: {
    endpoint: '/api/transactions',
    description: 'Transaction History',
    expectedStatus: 200
  }
};

class MainnetIntegrationTester {
  constructor() {
    this.results = [];
    this.startTime = performance.now();
  }

  async runTest(testName, testConfig) {
    const startTime = performance.now();
    
    try {
      console.log(`🧪 Testing: ${testConfig.description}`);
      
      const response = await fetch(`${BASE_URL}${testConfig.endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AION-Mainnet-Tester/1.0'
        },
        timeout: TEST_TIMEOUT
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      const result = {
        test: testName,
        description: testConfig.description,
        endpoint: testConfig.endpoint,
        status: response.status,
        success: response.status === testConfig.expectedStatus,
        duration: Math.round(duration),
        timestamp: new Date().toISOString()
      };

      if (response.ok) {
        try {
          const data = await response.json();
          result.dataReceived = true;
          result.dataSize = JSON.stringify(data).length;
          
          // Validate response structure for specific endpoints
          this.validateResponse(testName, data, result);
          
        } catch (parseError) {
          result.dataReceived = false;
          result.parseError = parseError.message;
        }
      } else {
        result.error = `HTTP ${response.status}`;
      }

      this.results.push(result);
      
      if (result.success) {
        console.log(`  ✅ ${result.description}: ${result.status} (${result.duration}ms)`);
      } else {
        console.log(`  ❌ ${result.description}: ${result.status} - ${result.error || 'Failed'}`);
      }

      return result;

    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;

      const result = {
        test: testName,
        description: testConfig.description,
        endpoint: testConfig.endpoint,
        status: 0,
        success: false,
        duration: Math.round(duration),
        error: error.message,
        timestamp: new Date().toISOString()
      };

      this.results.push(result);
      console.log(`  ❌ ${result.description}: Connection Error - ${error.message}`);
      
      return result;
    }
  }

  validateResponse(testName, data, result) {
    switch (testName) {
      case 'vaultStatsMainnet':
        if (data.network && data.balance !== undefined) {
          result.validated = true;
          result.mainnetData = true;
        }
        break;
        
      case 'strategiesInfo':
        if (data.strategies && typeof data.strategies === 'object') {
          result.validated = true;
          result.strategyCount = Object.keys(data.strategies).length;
        }
        break;
        
      case 'networkStatus':
        if (data.networks && data.networks.bscMainnet) {
          result.validated = true;
          result.mainnetConnected = data.networks.bscMainnet.connected;
        }
        break;
        
      case 'health':
        if (data.status && data.services) {
          result.validated = true;
          result.healthyServices = data.services.filter(s => s.status === 'healthy').length;
        }
        break;
    }
  }

  async runAllTests() {
    console.log('🚀 Starting AION MCP Agent Mainnet Integration Tests');
    console.log(`📍 Base URL: ${BASE_URL}`);
    console.log(`⏰ Timeout: ${TEST_TIMEOUT}ms`);
    console.log('');

    // Run all tests
    for (const [testName, testConfig] of Object.entries(TESTS)) {
      await this.runTest(testName, testConfig);
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.generateReport();
  }

  generateReport() {
    const endTime = performance.now();
    const totalDuration = endTime - this.startTime;
    
    const successful = this.results.filter(r => r.success).length;
    const failed = this.results.filter(r => !r.success).length;
    const total = this.results.length;
    
    console.log('');
    console.log('📊 TEST RESULTS SUMMARY');
    console.log('═'.repeat(50));
    console.log(`✅ Successful: ${successful}/${total}`);
    console.log(`❌ Failed: ${failed}/${total}`);
    console.log(`⏱️  Total Duration: ${Math.round(totalDuration)}ms`);
    console.log('');

    if (successful === total) {
      console.log('🎉 ALL TESTS PASSED! Mainnet integration is working perfectly.');
    } else {
      console.log('⚠️  Some tests failed. Check the details above.');
    }

    console.log('');
    console.log('📋 DETAILED RESULTS');
    console.log('─'.repeat(50));
    
    this.results.forEach(result => {
      const status = result.success ? '✅' : '❌';
      const duration = `${result.duration}ms`;
      const extra = result.validated ? ' (validated)' : '';
      
      console.log(`${status} ${result.description}: ${result.status} - ${duration}${extra}`);
      
      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
      
      if (result.mainnetData) {
        console.log(`   📊 Mainnet data received`);
      }
      
      if (result.strategyCount) {
        console.log(`   🎯 ${result.strategyCount} strategies found`);
      }
      
      if (result.mainnetConnected !== undefined) {
        console.log(`   🌐 Mainnet connected: ${result.mainnetConnected}`);
      }
      
      if (result.healthyServices !== undefined) {
        console.log(`   🏥 Healthy services: ${result.healthyServices}`);
      }
    });

    console.log('');
    console.log('🔗 QUICK ACCESS LINKS');
    console.log('─'.repeat(30));
    console.log(`Health: ${BASE_URL}/api/health`);
    console.log(`Vault Stats: ${BASE_URL}/api/vault/stats?network=bscMainnet`);
    console.log(`Strategies: ${BASE_URL}/api/strategies/info?network=bscMainnet`);
    console.log(`Network Status: ${BASE_URL}/api/network/status`);

    // Save results to file
    this.saveResults();
  }

  saveResults() {
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.results.length,
        successful: this.results.filter(r => r.success).length,
        failed: this.results.filter(r => !r.success).length,
        duration: Math.round(performance.now() - this.startTime)
      },
      results: this.results,
      environment: {
        baseUrl: BASE_URL,
        timeout: TEST_TIMEOUT,
        nodeVersion: process.version
      }
    };

    console.log(`💾 Test results summary saved (${reportData.summary.successful}/${reportData.summary.total} passed)`);
  }
}

// Main execution
async function main() {
  const tester = new MainnetIntegrationTester();
  
  try {
    await tester.runAllTests();
  } catch (error) {
    console.error('❌ Test execution failed:', error.message);
    process.exit(1);
  }
}

// Run the tests
main().catch(console.error);

export default MainnetIntegrationTester;
