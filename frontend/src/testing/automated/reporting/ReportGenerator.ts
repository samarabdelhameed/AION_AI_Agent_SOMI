import { TestResults, TestReport, HackathonReadinessScore } from '../interfaces';

/**
 * Comprehensive report generator with QA scoring and hackathon readiness assessment
 */
export class ReportGenerator {
  private testHistory: TestResults[] = [];

  // Generate comprehensive test report
  async generateComprehensiveReport(results: TestResults): Promise<TestReport> {
    console.log('📊 Generating comprehensive test report...');

    const report: TestReport = {
      summary: this.calculateTestSummary(results),
      detailedResults: results,
      qaScore: this.calculateQAScore(results),
      hackathonReadiness: this.calculateHackathonReadiness(results),
      improvementSuggestions: this.generateImprovementSuggestions(results)
    };

    console.log(`✅ Report generated - QA Score: ${report.qaScore}/100`);
    return report;
  }

  // QA scoring algorithm with weighted components
  calculateQAScore(results: TestResults): number {
    console.log('🎯 Calculating QA score...');

    let totalScore = 0;
    let totalWeight = 0;

    // Component Testing Score (30% weight)
    if (results.componentResults.length > 0) {
      const componentScore = this.calculateComponentScore(results.componentResults);
      totalScore += componentScore * 0.3;
      totalWeight += 0.3;
      console.log(`📱 Component Score: ${componentScore}/100`);
    }

    // Workflow Testing Score (25% weight)
    if (results.workflowResults.length > 0) {
      const workflowScore = this.calculateWorkflowScore(results.workflowResults);
      totalScore += workflowScore * 0.25;
      totalWeight += 0.25;
      console.log(`🔄 Workflow Score: ${workflowScore}/100`);
    }

    // Performance Score (20% weight)
    const performanceScore = this.calculatePerformanceScore(results.performanceMetrics);
    totalScore += performanceScore * 0.2;
    totalWeight += 0.2;
    console.log(`⚡ Performance Score: ${performanceScore}/100`);

    // Data Accuracy Score (15% weight)
    if (results.dataValidationResults.length > 0) {
      const dataScore = this.calculateDataAccuracyScore(results.dataValidationResults);
      totalScore += dataScore * 0.15;
      totalWeight += 0.15;
      console.log(`📊 Data Accuracy Score: ${dataScore}/100`);
    }

    // Overall System Health (10% weight)
    const systemHealthScore = this.calculateSystemHealthScore(results);
    totalScore += systemHealthScore * 0.1;
    totalWeight += 0.1;
    console.log(`🏥 System Health Score: ${systemHealthScore}/100`);

    const finalScore = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
    console.log(`🎯 Final QA Score: ${finalScore}/100`);

    return finalScore;
  }

  // Hackathon readiness assessment with wow factor
  calculateHackathonReadiness(results: TestResults): HackathonReadinessScore {
    console.log('🏆 Calculating hackathon readiness...');

    const baseScore = results.overallScore;

    // Presentation Score (how well it demos)
    const presentationScore = this.calculatePresentationScore(results);
    
    // Functionality Score (core features working)
    const functionalityScore = this.calculateFunctionalityScore(results);
    
    // Data Accuracy Score (real data integration)
    const dataAccuracyScore = results.dataValidationResults.length > 0
      ? results.dataValidationResults.reduce((sum, r) => sum + r.validation.accuracy, 0) / results.dataValidationResults.length
      : baseScore;
    
    // User Experience Score (smooth interactions)
    const userExperienceScore = this.calculateUserExperienceScore(results);
    
    // Wow Factor Score (innovative features)
    const wowFactorScore = this.calculateWowFactorScore(results);

    // Overall hackathon readiness
    const overallScore = Math.round(
      (presentationScore * 0.25) +
      (functionalityScore * 0.25) +
      (dataAccuracyScore * 0.2) +
      (userExperienceScore * 0.2) +
      (wowFactorScore * 0.1)
    );

    const readiness: HackathonReadinessScore = {
      overall: overallScore,
      presentation: presentationScore,
      functionality: functionalityScore,
      dataAccuracy: dataAccuracyScore,
      userExperience: userExperienceScore,
      wowFactor: wowFactorScore
    };

    console.log('🏆 Hackathon Readiness:', readiness);
    return readiness;
  }

  // Generate improvement suggestions
  generateImprovementSuggestions(results: TestResults): any[] {
    console.log('💡 Generating improvement suggestions...');

    const suggestions = [];

    // Performance improvements
    if (results.performanceMetrics.responseTime > 2000) {
      suggestions.push({
        category: 'Performance',
        priority: 'high',
        description: 'Response times are slower than optimal for hackathon demos',
        implementation: 'Optimize API calls, implement caching, reduce bundle size',
        estimatedImpact: 'significant',
        hackathonImpact: 'Critical for smooth live demos'
      });
    }

    // Component reliability
    const failedComponents = results.componentResults.filter(r => !r.passed);
    if (failedComponents.length > 0) {
      suggestions.push({
        category: 'Reliability',
        priority: 'critical',
        description: `${failedComponents.length} components are failing tests`,
        implementation: 'Fix component implementations and add error boundaries',
        estimatedImpact: 'major',
        hackathonImpact: 'Essential - broken components will hurt demo'
      });
    }

    // Data accuracy
    const lowAccuracyData = results.dataValidationResults.filter(r => r.validation.accuracy < 90);
    if (lowAccuracyData.length > 0) {
      suggestions.push({
        category: 'Data Quality',
        priority: 'medium',
        description: 'Some data validation accuracy is below 90%',
        implementation: 'Improve data validation logic and API integration',
        estimatedImpact: 'moderate',
        hackathonImpact: 'Important for credibility with judges'
      });
    }

    // Workflow completeness
    const failedWorkflows = results.workflowResults.filter(r => !r.success);
    if (failedWorkflows.length > 0) {
      suggestions.push({
        category: 'User Experience',
        priority: 'high',
        description: `${failedWorkflows.length} user workflows are not completing successfully`,
        implementation: 'Debug workflow steps and improve error handling',
        estimatedImpact: 'significant',
        hackathonImpact: 'Critical - judges need to see complete user journeys'
      });
    }

    // Wow factor enhancements
    if (this.calculateWowFactorScore(results) < 70) {
      suggestions.push({
        category: 'Innovation',
        priority: 'medium',
        description: 'Wow factor could be enhanced for better hackathon impact',
        implementation: 'Add AI insights, real-time animations, or unique visualizations',
        estimatedImpact: 'moderate',
        hackathonImpact: 'Helps stand out from other projects'
      });
    }

    console.log(`💡 Generated ${suggestions.length} improvement suggestions`);
    return suggestions;
  }

  // Calculate component score
  private calculateComponentScore(componentResults: any[]): number {
    const passedComponents = componentResults.filter(r => r.passed).length;
    const totalComponents = componentResults.length;
    
    if (totalComponents === 0) return 0;
    
    const baseScore = (passedComponents / totalComponents) * 100;
    
    // Bonus for high performance scores
    const avgPerformanceScore = componentResults.reduce((sum, r) => sum + r.performanceScore, 0) / totalComponents;
    const performanceBonus = Math.min(10, avgPerformanceScore / 10);
    
    // Bonus for high data accuracy
    const avgDataAccuracy = componentResults.reduce((sum, r) => sum + r.dataAccuracy, 0) / totalComponents;
    const accuracyBonus = Math.min(10, avgDataAccuracy / 10);
    
    return Math.min(100, baseScore + performanceBonus + accuracyBonus);
  }

  // Calculate workflow score
  private calculateWorkflowScore(workflowResults: any[]): number {
    const successfulWorkflows = workflowResults.filter(r => r.success).length;
    const totalWorkflows = workflowResults.length;
    
    if (totalWorkflows === 0) return 0;
    
    const baseScore = (successfulWorkflows / totalWorkflows) * 100;
    
    // Bonus for fast completion times
    const avgDuration = workflowResults.reduce((sum, r) => sum + r.duration, 0) / totalWorkflows;
    const speedBonus = avgDuration < 10000 ? 10 : avgDuration < 30000 ? 5 : 0;
    
    return Math.min(100, baseScore + speedBonus);
  }

  // Calculate performance score
  private calculatePerformanceScore(metrics: any): number {
    let score = 100;
    
    // Response time penalty
    if (metrics.responseTime > 3000) {
      score -= 30;
    } else if (metrics.responseTime > 2000) {
      score -= 15;
    } else if (metrics.responseTime > 1000) {
      score -= 5;
    }
    
    // Load time penalty
    if (metrics.loadTime > 5000) {
      score -= 25;
    } else if (metrics.loadTime > 3000) {
      score -= 10;
    }
    
    // Memory usage penalty
    const memoryMB = metrics.memoryUsage / (1024 * 1024);
    if (memoryMB > 200) {
      score -= 20;
    } else if (memoryMB > 100) {
      score -= 10;
    }
    
    return Math.max(0, score);
  }

  // Calculate data accuracy score
  private calculateDataAccuracyScore(dataResults: any[]): number {
    if (dataResults.length === 0) return 0;
    
    const avgAccuracy = dataResults.reduce((sum, r) => sum + r.validation.accuracy, 0) / dataResults.length;
    
    // Bonus for high confidence
    const avgConfidence = dataResults.reduce((sum, r) => sum + r.validation.confidence, 0) / dataResults.length;
    const confidenceBonus = Math.min(10, (avgConfidence - 80) / 2);
    
    return Math.min(100, avgAccuracy + Math.max(0, confidenceBonus));
  }

  // Calculate system health score
  private calculateSystemHealthScore(results: TestResults): number {
    let score = 100;
    
    // Penalty for errors
    const totalErrors = results.componentResults.reduce((sum, r) => sum + r.issues.length, 0) +
                       results.workflowResults.reduce((sum, r) => sum + r.errors.length, 0);
    
    score -= Math.min(50, totalErrors * 5);
    
    // Bonus for comprehensive testing
    if (results.componentResults.length >= 5) score += 5;
    if (results.workflowResults.length >= 2) score += 5;
    if (results.dataValidationResults.length >= 3) score += 5;
    
    return Math.max(0, Math.min(100, score));
  }

  // Calculate presentation score
  private calculatePresentationScore(results: TestResults): number {
    let score = results.overallScore;
    
    // Bonus for visual components working
    const visualComponents = results.componentResults.filter(r => 
      r.componentName.includes('Chart') || 
      r.componentName.includes('Performance') ||
      r.componentName.includes('Overview')
    );
    
    if (visualComponents.length > 0) {
      const visualScore = visualComponents.filter(r => r.passed).length / visualComponents.length * 100;
      score = Math.max(score, visualScore);
    }
    
    // Bonus for fast loading (important for demos)
    if (results.performanceMetrics.loadTime < 3000) {
      score += 10;
    }
    
    return Math.min(100, score);
  }

  // Calculate functionality score
  private calculateFunctionalityScore(results: TestResults): number {
    let score = 0;
    let totalWeight = 0;
    
    // Core functionality weight
    if (results.componentResults.length > 0) {
      const coreComponents = results.componentResults.filter(r => 
        r.componentName.includes('Wallet') || 
        r.componentName.includes('Vault') ||
        r.componentName.includes('Strategy')
      );
      
      if (coreComponents.length > 0) {
        const coreScore = coreComponents.filter(r => r.passed).length / coreComponents.length * 100;
        score += coreScore * 0.6;
        totalWeight += 0.6;
      }
    }
    
    // Workflow functionality
    if (results.workflowResults.length > 0) {
      const workflowScore = results.workflowResults.filter(r => r.success).length / results.workflowResults.length * 100;
      score += workflowScore * 0.4;
      totalWeight += 0.4;
    }
    
    return totalWeight > 0 ? score / totalWeight : results.overallScore;
  }

  // Calculate user experience score
  private calculateUserExperienceScore(results: TestResults): number {
    let score = results.overallScore;
    
    // Penalty for slow interactions
    if (results.performanceMetrics.responseTime > 1000) {
      score -= 20;
    }
    
    // Bonus for successful workflows
    if (results.workflowResults.length > 0) {
      const workflowSuccessRate = results.workflowResults.filter(r => r.success).length / results.workflowResults.length;
      score = Math.max(score, workflowSuccessRate * 100);
    }
    
    // Bonus for error-free components
    const errorFreeComponents = results.componentResults.filter(r => r.issues.length === 0).length;
    if (results.componentResults.length > 0) {
      const errorFreeRate = errorFreeComponents / results.componentResults.length;
      score += errorFreeRate * 10;
    }
    
    return Math.min(100, score);
  }

  // Calculate wow factor score
  private calculateWowFactorScore(results: TestResults): number {
    let score = 50; // Base wow factor
    
    // Bonus for AI components
    const aiComponents = results.componentResults.filter(r => 
      r.componentName.toLowerCase().includes('ai') ||
      r.componentName.toLowerCase().includes('recommendation')
    );
    
    if (aiComponents.length > 0 && aiComponents.every(r => r.passed)) {
      score += 20;
    }
    
    // Bonus for real-time data
    if (results.dataValidationResults.some(r => r.validation.source === 'blockchain')) {
      score += 15;
    }
    
    // Bonus for comprehensive testing (shows thoroughness)
    if (results.componentResults.length >= 6) {
      score += 10;
    }
    
    // Bonus for performance optimization
    if (results.performanceMetrics.responseTime < 1000) {
      score += 10;
    }
    
    // Bonus for multiple successful workflows
    if (results.workflowResults.length >= 3 && results.workflowResults.every(r => r.success)) {
      score += 15;
    }
    
    return Math.min(100, score);
  }

  // Calculate test summary
  private calculateTestSummary(results: TestResults): any {
    const totalTests = results.componentResults.length + results.workflowResults.length;
    const passedComponents = results.componentResults.filter(r => r.passed).length;
    const passedWorkflows = results.workflowResults.filter(r => r.success).length;
    const passed = passedComponents + passedWorkflows;
    const failed = totalTests - passed;

    return {
      totalTests,
      passed,
      failed,
      skipped: 0,
      duration: results.duration,
      successRate: totalTests > 0 ? Math.round((passed / totalTests) * 100) : 0
    };
  }

  // Export report to different formats
  async exportReport(report: TestReport, format: 'json' | 'html' | 'pdf' = 'json'): Promise<string> {
    console.log(`📤 Exporting report in ${format} format...`);

    switch (format) {
      case 'json':
        return JSON.stringify(report, null, 2);
      
      case 'html':
        return this.generateHTMLReport(report);
      
      case 'pdf':
        // In a real implementation, this would generate a PDF
        return `PDF report generated for QA Score: ${report.qaScore}`;
      
      default:
        return JSON.stringify(report, null, 2);
    }
  }

  // Generate HTML report
  private generateHTMLReport(report: TestReport): string {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>AION Dashboard Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f0f0f0; padding: 20px; border-radius: 8px; }
        .score { font-size: 24px; font-weight: bold; color: #2196F3; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 8px; }
        .success { color: #4CAF50; }
        .error { color: #f44336; }
        .warning { color: #ff9800; }
    </style>
</head>
<body>
    <div class="header">
        <h1>AION Dashboard Test Report</h1>
        <div class="score">QA Score: ${report.qaScore}/100</div>
        <p>Generated: ${new Date().toLocaleString()}</p>
    </div>
    
    <div class="section">
        <h2>Test Summary</h2>
        <p>Total Tests: ${report.summary.totalTests}</p>
        <p class="success">Passed: ${report.summary.passed}</p>
        <p class="error">Failed: ${report.summary.failed}</p>
        <p>Duration: ${report.summary.duration}ms</p>
    </div>
    
    <div class="section">
        <h2>Hackathon Readiness</h2>
        <p>Overall: ${report.hackathonReadiness.overall}/100</p>
        <p>Presentation: ${report.hackathonReadiness.presentation}/100</p>
        <p>Functionality: ${report.hackathonReadiness.functionality}/100</p>
        <p>User Experience: ${report.hackathonReadiness.userExperience}/100</p>
        <p>Wow Factor: ${report.hackathonReadiness.wowFactor}/100</p>
    </div>
    
    <div class="section">
        <h2>Improvement Suggestions</h2>
        ${report.improvementSuggestions.map(s => `
            <div class="suggestion">
                <h3>${s.category} (${s.priority})</h3>
                <p>${s.description}</p>
                <p><strong>Implementation:</strong> ${s.implementation}</p>
                <p><strong>Hackathon Impact:</strong> ${s.hackathonImpact || 'Not specified'}</p>
            </div>
        `).join('')}
    </div>
</body>
</html>`;
  }

  // Add test results to history
  addToHistory(results: TestResults): void {
    this.testHistory.push(results);
    
    // Keep only last 50 results
    if (this.testHistory.length > 50) {
      this.testHistory = this.testHistory.slice(-50);
    }
  }

  // Get test history trends
  getHistoryTrends(): any {
    if (this.testHistory.length < 2) {
      return { trend: 'insufficient_data', message: 'Need at least 2 test runs for trend analysis' };
    }

    const recent = this.testHistory.slice(-5);
    const scores = recent.map(r => r.overallScore);
    
    const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const trend = scores[scores.length - 1] > scores[0] ? 'improving' : 'declining';
    
    return {
      trend,
      averageScore: Math.round(avgScore),
      latestScore: scores[scores.length - 1],
      improvement: scores[scores.length - 1] - scores[0],
      totalRuns: this.testHistory.length
    };
  }
}