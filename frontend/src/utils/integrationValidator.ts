import { portfolioMetricsService } from '../services/portfolioMetricsService';
import { aiRecommendationService } from '../services/aiRecommendationService';
import { autoRebalancingService } from '../services/autoRebalancingService';
import { transactionHistoryService } from '../services/transactionHistoryService';
import { websocketService } from '../services/websocketService';
import { PerformanceMonitor } from './performanceOptimization';

export interface ValidationResult {
  service: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  duration?: number;
  data?: any;
}

export interface IntegrationHealth {
  overall: 'healthy' | 'degraded' | 'critical';
  services: ValidationResult[];
  performance: {
    avgResponseTime: number;
    memoryUsage: number;
    errorRate: number;
  };
  recommendations: string[];
}

class IntegrationValidator {
  async validateAllServices(userAddress: string): Promise<IntegrationHealth> {
    console.log('🔍 Starting comprehensive integration validation...');
    
    const results: ValidationResult[] = [];
    const startTime = Date.now();

    // Test Portfolio Metrics Service
    try {
      const endTiming = PerformanceMonitor.startTiming('portfolio_metrics_validation');
      const metrics = await portfolioMetricsService.calculatePortfolioMetrics(userAddress);
      endTiming();
      
      results.push({
        service: 'Portfolio Metrics',
        status: 'success',
        message: `Portfolio metrics calculated successfully. Total value: $${metrics.totalValueUSD.toFixed(2)}`,
        duration: PerformanceMonitor.getAverageTime('portfolio_metrics_validation'),
        data: { totalValueUSD: metrics.totalValueUSD, currentAPY: metrics.currentAPY }
      });
    } catch (error) {
      results.push({
        service: 'Portfolio Metrics',
        status: 'error',
        message: `Portfolio metrics failed: ${error.message}`
      });
    }

    // Test AI Recommendation Service
    try {
      const endTiming = PerformanceMonitor.startTiming('ai_recommendations_validation');
      const recommendations = await aiRecommendationService.getRecommendations(userAddress);
      const marketAnalysis = await aiRecommendationService.getMarketAnalysis();
      endTiming();
      
      results.push({
        service: 'AI Recommendations',
        status: 'success',
        message: `AI service operational. Generated ${recommendations.length} recommendations. Market trend: ${marketAnalysis.marketTrend}`,
        duration: PerformanceMonitor.getAverageTime('ai_recommendations_validation'),
        data: { recommendationCount: recommendations.length, marketTrend: marketAnalysis.marketTrend }
      });
    } catch (error) {
      results.push({
        service: 'AI Recommendations',
        status: 'error',
        message: `AI recommendations failed: ${error.message}`
      });
    }

    // Test Auto-Rebalancing Service
    try {
      const endTiming = PerformanceMonitor.startTiming('auto_rebalancing_validation');
      const config = await autoRebalancingService.getConfig(userAddress);
      const needsRebalance = await autoRebalancingService.checkRebalanceNeeded(userAddress);
      endTiming();
      
      results.push({
        service: 'Auto-Rebalancing',
        status: 'success',
        message: `Auto-rebalancing configured. Enabled: ${config.enabled}, Needs rebalance: ${needsRebalance}`,
        duration: PerformanceMonitor.getAverageTime('auto_rebalancing_validation'),
        data: { enabled: config.enabled, needsRebalance }
      });
    } catch (error) {
      results.push({
        service: 'Auto-Rebalancing',
        status: 'error',
        message: `Auto-rebalancing failed: ${error.message}`
      });
    }

    // Test Transaction History Service
    try {
      const endTiming = PerformanceMonitor.startTiming('transaction_history_validation');
      const transactions = await transactionHistoryService.getTransactionHistory(userAddress, 10);
      const summary = await transactionHistoryService.getTransactionSummary(userAddress);
      endTiming();
      
      results.push({
        service: 'Transaction History',
        status: 'success',
        message: `Transaction history loaded. ${transactions.length} recent transactions, ${summary.totalTransactions} total this month`,
        duration: PerformanceMonitor.getAverageTime('transaction_history_validation'),
        data: { recentCount: transactions.length, monthlyTotal: summary.totalTransactions }
      });
    } catch (error) {
      results.push({
        service: 'Transaction History',
        status: 'error',
        message: `Transaction history failed: ${error.message}`
      });
    }

    // Test WebSocket Service
    try {
      const isConnected = websocketService.getConnectionStatus();
      
      if (isConnected) {
        results.push({
          service: 'WebSocket',
          status: 'success',
          message: 'WebSocket connection active, real-time updates available'
        });
      } else {
        // Try to connect
        await websocketService.connect(userAddress);
        results.push({
          service: 'WebSocket',
          status: 'success',
          message: 'WebSocket connected successfully'
        });
      }
    } catch (error) {
      results.push({
        service: 'WebSocket',
        status: 'warning',
        message: `WebSocket connection issues: ${error.message}`
      });
    }

    // Calculate overall health
    const errorCount = results.filter(r => r.status === 'error').length;
    const warningCount = results.filter(r => r.status === 'warning').length;
    const successCount = results.filter(r => r.status === 'success').length;

    let overall: 'healthy' | 'degraded' | 'critical';
    if (errorCount === 0 && warningCount === 0) {
      overall = 'healthy';
    } else if (errorCount === 0 && warningCount <= 2) {
      overall = 'degraded';
    } else {
      overall = 'critical';
    }

    // Calculate performance metrics
    const allMetrics = PerformanceMonitor.getMetrics();
    const avgResponseTime = Object.values(allMetrics).reduce((sum, metric) => sum + metric.avg, 0) / Object.keys(allMetrics).length;
    const errorRate = (errorCount / results.length) * 100;

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (avgResponseTime > 1000) {
      recommendations.push('Consider optimizing service response times (>1s detected)');
    }
    
    if (errorRate > 20) {
      recommendations.push('High error rate detected, check service configurations');
    }
    
    if (warningCount > 0) {
      recommendations.push('Some services have warnings, monitor for stability');
    }
    
    if (overall === 'healthy') {
      recommendations.push('All systems operational, integration working correctly');
    }

    const totalTime = Date.now() - startTime;
    console.log(`✅ Integration validation completed in ${totalTime}ms`);
    console.log(`📊 Results: ${successCount} success, ${warningCount} warnings, ${errorCount} errors`);

    return {
      overall,
      services: results,
      performance: {
        avgResponseTime,
        memoryUsage: 0, // Would be calculated from MemoryMonitor in real implementation
        errorRate
      },
      recommendations
    };
  }

  async validateRealDataIntegration(userAddress: string): Promise<boolean> {
    console.log('🔍 Validating real data integration...');
    
    try {
      // Test that we can fetch real portfolio data
      const portfolioMetrics = await portfolioMetricsService.calculatePortfolioMetrics(userAddress);
      
      // Validate data structure
      const requiredFields = ['totalValue', 'totalValueUSD', 'currentAPY', 'dailyYield'];
      const hasAllFields = requiredFields.every(field => portfolioMetrics[field] !== undefined);
      
      if (!hasAllFields) {
        console.error('❌ Portfolio metrics missing required fields');
        return false;
      }

      // Test that values are reasonable
      if (portfolioMetrics.totalValueUSD < 0 || portfolioMetrics.currentAPY < 0) {
        console.error('❌ Portfolio metrics contain invalid values');
        return false;
      }

      // Test yield breakdown
      const yieldBreakdown = await portfolioMetricsService.getYieldBreakdown(userAddress);
      if (!yieldBreakdown.protocolYields || yieldBreakdown.protocolYields.length === 0) {
        console.warn('⚠️ No protocol yields found');
      }

      // Test risk metrics
      const riskMetrics = await portfolioMetricsService.calculateRiskMetrics(userAddress);
      if (riskMetrics.overallRiskScore < 0 || riskMetrics.overallRiskScore > 100) {
        console.error('❌ Risk score out of valid range');
        return false;
      }

      console.log('✅ Real data integration validated successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Real data integration validation failed:', error);
      return false;
    }
  }

  async validatePerformance(): Promise<{ passed: boolean; metrics: any }> {
    console.log('⚡ Validating performance...');
    
    const metrics = PerformanceMonitor.getMetrics();
    const thresholds = {
      portfolio_metrics: 500, // 500ms max
      ai_recommendations: 1000, // 1s max
      transaction_history: 300, // 300ms max
      auto_rebalancing: 200 // 200ms max
    };

    let passed = true;
    const results: any = {};

    for (const [operation, threshold] of Object.entries(thresholds)) {
      const metric = metrics[operation];
      if (metric) {
        const operationPassed = metric.avg <= threshold;
        results[operation] = {
          avgTime: metric.avg,
          threshold,
          passed: operationPassed,
          count: metric.count
        };
        
        if (!operationPassed) {
          passed = false;
          console.warn(`⚠️ ${operation} performance below threshold: ${metric.avg.toFixed(2)}ms > ${threshold}ms`);
        }
      }
    }

    if (passed) {
      console.log('✅ Performance validation passed');
    } else {
      console.warn('⚠️ Some performance thresholds not met');
    }

    return { passed, metrics: results };
  }

  generateHealthReport(health: IntegrationHealth): string {
    let report = `# AION Vault Integration Health Report\n\n`;
    report += `**Overall Status:** ${health.overall.toUpperCase()}\n`;
    report += `**Generated:** ${new Date().toISOString()}\n\n`;

    report += `## Service Status\n\n`;
    health.services.forEach(service => {
      const emoji = service.status === 'success' ? '✅' : service.status === 'warning' ? '⚠️' : '❌';
      report += `${emoji} **${service.service}**: ${service.message}\n`;
      if (service.duration) {
        report += `   - Response time: ${service.duration.toFixed(2)}ms\n`;
      }
      report += `\n`;
    });

    report += `## Performance Metrics\n\n`;
    report += `- Average Response Time: ${health.performance.avgResponseTime.toFixed(2)}ms\n`;
    report += `- Error Rate: ${health.performance.errorRate.toFixed(1)}%\n`;
    report += `- Memory Usage: ${health.performance.memoryUsage}MB\n\n`;

    report += `## Recommendations\n\n`;
    health.recommendations.forEach(rec => {
      report += `- ${rec}\n`;
    });

    return report;
  }
}

export const integrationValidator = new IntegrationValidator();

// Export validation functions for easy use
export async function validateIntegration(userAddress: string): Promise<IntegrationHealth> {
  return integrationValidator.validateAllServices(userAddress);
}

export async function validateRealData(userAddress: string): Promise<boolean> {
  return integrationValidator.validateRealDataIntegration(userAddress);
}

export async function validatePerformance(): Promise<{ passed: boolean; metrics: any }> {
  return integrationValidator.validatePerformance();
}

export function generateHealthReport(health: IntegrationHealth): string {
  return integrationValidator.generateHealthReport(health);
}