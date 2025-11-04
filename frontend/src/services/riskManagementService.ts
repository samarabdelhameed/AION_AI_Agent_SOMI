import { ethers, BigNumber } from 'ethers';
import { web3Service } from './web3Service';
import { PROTOCOL_INFO } from '../lib/contractConfig';

export interface RiskMetrics {
  totalValueLocked: BigNumber;
  portfolioValue: BigNumber;
  exposureByProtocol: Record<string, BigNumber>;
  exposureByAsset: Record<string, BigNumber>;
  concentrationRisk: number;
  volatilityRisk: number;
  liquidityRisk: number;
  smartContractRisk: number;
  overallRiskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface RiskFactor {
  factor: string;
  impact: number; // 0-100
  description: string;
  mitigation: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface RiskAlert {
  id: string;
  type: 'warning' | 'error' | 'info';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  acknowledged: boolean;
  actionRequired: boolean;
  suggestedActions: string[];
}

export interface RiskLimits {
  maxSingleProtocolExposure: number; // Percentage
  maxConcentrationRisk: number; // Percentage
  minLiquidityRatio: number; // Percentage
  maxVolatilityThreshold: number; // Percentage
  maxSmartContractRisk: number; // Score 0-100
}

export interface RiskReport {
  timestamp: Date;
  metrics: RiskMetrics;
  factors: RiskFactor[];
  alerts: RiskAlert[];
  recommendations: string[];
  compliance: boolean;
}

class RiskManagementService {
  private riskLimits: RiskLimits = {
    maxSingleProtocolExposure: 30, // 30%
    maxConcentrationRisk: 50, // 50%
    minLiquidityRatio: 20, // 20%
    maxVolatilityThreshold: 25, // 25%
    maxSmartContractRisk: 70 // Score 70/100
  };

  private alerts: Map<string, RiskAlert> = new Map();
  private updateInterval: NodeJS.Timeout | null = null;

  // ========== INITIALIZATION ==========

  async initialize(): Promise<void> {
    try {
      console.log('🛡️ Initializing Risk Management Service...');
      
      // Start continuous monitoring
      this.startMonitoring();
      
      console.log('✅ Risk Management Service initialized');
    } catch (error) {
      console.error('❌ Risk Management Service initialization failed:', error);
    }
  }

  // ========== RISK ASSESSMENT ==========

  async assessPortfolioRisk(userAddress: string): Promise<RiskReport> {
    try {
      console.log('🔍 Assessing portfolio risk for:', userAddress);

      // Get user position
      const positionResult = await web3Service.getUserPosition(userAddress);
      if (!positionResult.success || !positionResult.data) {
        throw new Error('Failed to get user position');
      }

      const position = positionResult.data;
      
      // Get vault info
      const vaultResult = await web3Service.getVaultInfo();
      if (!vaultResult.success || !vaultResult.data) {
        throw new Error('Failed to get vault info');
      }

      const vault = vaultResult.data;

      // Calculate risk metrics
      const metrics = await this.calculateRiskMetrics(position, vault);
      
      // Identify risk factors
      const factors = this.identifyRiskFactors(metrics);
      
      // Generate alerts
      const alerts = this.generateRiskAlerts(metrics, factors);
      
      // Generate recommendations
      const recommendations = this.generateRecommendations(metrics, factors);
      
      // Check compliance
      const compliance = this.checkCompliance(metrics);

      const report: RiskReport = {
        timestamp: new Date(),
        metrics,
        factors,
        alerts,
        recommendations,
        compliance
      };

      console.log('📊 Risk assessment completed');
      return report;

    } catch (error) {
      console.error('❌ Risk assessment failed:', error);
      throw error;
    }
  }

  private async calculateRiskMetrics(position: any, vault: any): Promise<RiskMetrics> {
    try {
      const portfolioValue = position.balance;
      const totalValueLocked = vault.totalAssets;

      // Calculate exposure by protocol
      const exposureByProtocol: Record<string, BigNumber> = {};
      const strategies = await web3Service.getAllStrategiesInfo();
      
      if (strategies.success && strategies.data) {
        for (const strategy of strategies.data) {
          const protocolExposure = strategy.totalAssets;
          exposureByProtocol[strategy.protocol] = protocolExposure;
        }
      }

      // Calculate concentration risk
      const concentrationRisk = this.calculateConcentrationRisk(exposureByProtocol, totalValueLocked);

      // Calculate volatility risk
      const volatilityRisk = this.calculateVolatilityRisk(position, vault);

      // Calculate liquidity risk
      const liquidityRisk = this.calculateLiquidityRisk(position, vault);

      // Calculate smart contract risk
      const smartContractRisk = this.calculateSmartContractRisk();

      // Calculate overall risk score
      const overallRiskScore = this.calculateOverallRiskScore({
        concentrationRisk,
        volatilityRisk,
        liquidityRisk,
        smartContractRisk
      });

      // Determine risk level
      const riskLevel = this.determineRiskLevel(overallRiskScore);

      return {
        totalValueLocked,
        portfolioValue,
        exposureByProtocol,
        exposureByAsset: {}, // Will be implemented with multi-asset support
        concentrationRisk,
        volatilityRisk,
        liquidityRisk,
        smartContractRisk,
        overallRiskScore,
        riskLevel
      };

    } catch (error) {
      console.error('❌ Failed to calculate risk metrics:', error);
      throw error;
    }
  }

  private calculateConcentrationRisk(exposureByProtocol: Record<string, BigNumber>, totalValue: BigNumber): number {
    try {
      if (totalValue.isZero()) return 0;

      let maxExposure = BigNumber.from(0);
      for (const exposure of Object.values(exposureByProtocol)) {
        if (exposure.gt(maxExposure)) {
          maxExposure = exposure;
        }
      }

      const concentrationPercentage = maxExposure.mul(100).div(totalValue).toNumber();
      return Math.min(concentrationPercentage, 100);
    } catch (error) {
      console.error('❌ Failed to calculate concentration risk:', error);
      return 0;
    }
  }

  private calculateVolatilityRisk(position: any, vault: any): number {
    try {
      // Calculate yield volatility based on historical data
      const principal = position.principal;
      const balance = position.balance;
      
      if (principal.isZero()) return 0;

      const yieldRatio = balance.sub(principal).mul(100).div(principal);
      const volatilityScore = Math.min(yieldRatio.toNumber() / 10, 100); // Normalize to 0-100
      
      return Math.max(0, Math.min(volatilityScore, 100));
    } catch (error) {
      console.error('❌ Failed to calculate volatility risk:', error);
      return 0;
    }
  }

  private calculateLiquidityRisk(position: any, vault: any): number {
    try {
      const totalAssets = vault.totalAssets;
      const userShares = position.shares;
      const totalShares = vault.totalShares;

      if (totalShares.isZero()) return 100;

      const userPercentage = userShares.mul(100).div(totalShares).toNumber();
      const liquidityScore = Math.min(userPercentage * 2, 100); // Higher percentage = higher liquidity risk
      
      return Math.max(0, Math.min(liquidityScore, 100));
    } catch (error) {
      console.error('❌ Failed to calculate liquidity risk:', error);
      return 0;
    }
  }

  private calculateSmartContractRisk(): number {
    try {
      // Base risk score for smart contracts
      let riskScore = 30; // Base risk

      // Add risk based on protocol complexity
      const protocols = Object.keys(PROTOCOL_INFO);
      for (const protocol of protocols) {
        const protocolInfo = PROTOCOL_INFO[protocol as keyof typeof PROTOCOL_INFO];
        if (protocolInfo.riskLevel > 2) {
          riskScore += 10; // Higher risk protocols add to score
        }
      }

      // Normalize to 0-100
      return Math.max(0, Math.min(riskScore, 100));
    } catch (error) {
      console.error('❌ Failed to calculate smart contract risk:', error);
      return 50; // Default medium risk
    }
  }

  private calculateOverallRiskScore(risks: {
    concentrationRisk: number;
    volatilityRisk: number;
    liquidityRisk: number;
    smartContractRisk: number;
  }): number {
    try {
      // Weighted average of all risk factors
      const weights = {
        concentration: 0.3,
        volatility: 0.25,
        liquidity: 0.25,
        smartContract: 0.2
      };

      const overallScore = 
        risks.concentrationRisk * weights.concentration +
        risks.volatilityRisk * weights.volatility +
        risks.liquidityRisk * weights.liquidity +
        risks.smartContractRisk * weights.smartContract;

      return Math.round(overallScore);
    } catch (error) {
      console.error('❌ Failed to calculate overall risk score:', error);
      return 50; // Default medium risk
    }
  }

  private determineRiskLevel(riskScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (riskScore < 25) return 'low';
    if (riskScore < 50) return 'medium';
    if (riskScore < 75) return 'high';
    return 'critical';
  }

  // ========== RISK FACTOR IDENTIFICATION ==========

  private identifyRiskFactors(metrics: RiskMetrics): RiskFactor[] {
    const factors: RiskFactor[] = [];

    // Check concentration risk
    if (metrics.concentrationRisk > this.riskLimits.maxSingleProtocolExposure) {
      factors.push({
        factor: 'High Protocol Concentration',
        impact: metrics.concentrationRisk,
        description: `Single protocol exposure (${metrics.concentrationRisk.toFixed(2)}%) exceeds limit (${this.riskLimits.maxSingleProtocolExposure}%)`,
        mitigation: 'Consider diversifying across multiple protocols',
        priority: metrics.concentrationRisk > 50 ? 'urgent' : 'high'
      });
    }

    // Check volatility risk
    if (metrics.volatilityRisk > this.riskLimits.maxVolatilityThreshold) {
      factors.push({
        factor: 'High Yield Volatility',
        impact: metrics.volatilityRisk,
        description: `Yield volatility (${metrics.volatilityRisk.toFixed(2)}%) exceeds threshold (${this.riskLimits.maxVolatilityThreshold}%)`,
        mitigation: 'Consider stable yield strategies or reduce position size',
        priority: metrics.volatilityRisk > 50 ? 'high' : 'medium'
      });
    }

    // Check liquidity risk
    if (metrics.liquidityRisk > (100 - this.riskLimits.minLiquidityRatio)) {
      factors.push({
        factor: 'Low Liquidity',
        impact: metrics.liquidityRisk,
        description: `Liquidity ratio (${(100 - metrics.liquidityRisk).toFixed(2)}%) below minimum (${this.riskLimits.minLiquidityRatio}%)`,
        mitigation: 'Reduce position size or wait for better liquidity',
        priority: metrics.liquidityRisk > 80 ? 'urgent' : 'high'
      });
    }

    // Check smart contract risk
    if (metrics.smartContractRisk > this.riskLimits.maxSmartContractRisk) {
      factors.push({
        factor: 'High Smart Contract Risk',
        impact: metrics.smartContractRisk,
        description: `Smart contract risk score (${metrics.smartContractRisk}) exceeds limit (${this.riskLimits.maxSmartContractRisk})`,
        mitigation: 'Review protocol security and consider reducing exposure',
        priority: metrics.smartContractRisk > 85 ? 'urgent' : 'high'
      });
    }

    return factors;
  }

  // ========== RISK ALERTS ==========

  private generateRiskAlerts(metrics: RiskMetrics, factors: RiskFactor[]): RiskAlert[] {
    const alerts: RiskAlert[] = [];

    // Generate alerts based on risk factors
    for (const factor of factors) {
      const alert: RiskAlert = {
        id: `risk_${factor.factor.replace(/\s+/g, '_').toLowerCase()}_${Date.now()}`,
        type: factor.priority === 'urgent' ? 'error' : factor.priority === 'high' ? 'warning' : 'info',
        title: factor.factor,
        description: factor.description,
        severity: factor.priority === 'urgent' ? 'critical' : factor.priority,
        timestamp: new Date(),
        acknowledged: false,
        actionRequired: factor.priority === 'urgent' || factor.priority === 'high',
        suggestedActions: [factor.mitigation]
      };

      alerts.push(alert);
      this.alerts.set(alert.id, alert);
    }

    // Generate overall risk alert
    if (metrics.overallRiskScore > 75) {
      const overallAlert: RiskAlert = {
        id: `overall_risk_${Date.now()}`,
        type: 'error',
        title: 'Critical Portfolio Risk',
        description: `Overall risk score (${metrics.overallRiskScore}) indicates critical risk level`,
        severity: 'critical',
        timestamp: new Date(),
        acknowledged: false,
        actionRequired: true,
        suggestedActions: [
          'Immediately review portfolio allocation',
          'Consider reducing exposure to high-risk protocols',
          'Contact support for risk assessment'
        ]
      };

      alerts.push(overallAlert);
      this.alerts.set(overallAlert.id, overallAlert);
    }

    return alerts;
  }

  // ========== RECOMMENDATIONS ==========

  private generateRecommendations(metrics: RiskMetrics, factors: RiskFactor[]): string[] {
    const recommendations: string[] = [];

    // Portfolio diversification
    if (metrics.concentrationRisk > 30) {
      recommendations.push('Diversify portfolio across multiple DeFi protocols to reduce concentration risk');
    }

    // Yield stability
    if (metrics.volatilityRisk > 25) {
      recommendations.push('Consider stable yield strategies like lending protocols for more predictable returns');
    }

    // Liquidity management
    if (metrics.liquidityRisk > 70) {
      recommendations.push('Reduce position size to improve liquidity and reduce exit risk');
    }

    // Risk tolerance adjustment
    if (metrics.overallRiskScore > 60) {
      recommendations.push('Review risk tolerance and consider reducing exposure to high-risk strategies');
    }

    // Protocol selection
    if (metrics.smartContractRisk > 60) {
      recommendations.push('Focus on well-audited protocols with proven track records');
    }

    // Regular monitoring
    recommendations.push('Monitor portfolio risk metrics regularly and adjust strategies accordingly');

    return recommendations;
  }

  // ========== COMPLIANCE CHECKING ==========

  private checkCompliance(metrics: RiskMetrics): boolean {
    return (
      metrics.concentrationRisk <= this.riskLimits.maxSingleProtocolExposure &&
      metrics.concentrationRisk <= this.riskLimits.maxConcentrationRisk &&
      metrics.liquidityRisk <= (100 - this.riskLimits.minLiquidityRatio) &&
      metrics.volatilityRisk <= this.riskLimits.maxVolatilityThreshold &&
      metrics.smartContractRisk <= this.riskLimits.maxSmartContractRisk
    );
  }

  // ========== MONITORING ==========

  private startMonitoring(): void {
    // Monitor risk every 5 minutes
    this.updateInterval = setInterval(async () => {
      try {
        await this.performRiskMonitoring();
      } catch (error) {
        console.error('❌ Risk monitoring failed:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes
  }

  private async performRiskMonitoring(): Promise<void> {
    try {
      // Get all active alerts
      const activeAlerts = Array.from(this.alerts.values()).filter(alert => !alert.acknowledged);
      
      // Check for new risk conditions
      for (const alert of activeAlerts) {
        if (this.shouldEscalateAlert(alert)) {
          await this.escalateAlert(alert);
        }
      }

      console.log('🔄 Risk monitoring completed');
    } catch (error) {
      console.error('❌ Risk monitoring failed:', error);
    }
  }

  private shouldEscalateAlert(alert: RiskAlert): boolean {
    // Escalate if alert is older than 1 hour and still critical
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return alert.severity === 'critical' && alert.timestamp < oneHourAgo;
  }

  private async escalateAlert(alert: RiskAlert): Promise<void> {
    try {
      console.log(`🚨 Escalating alert: ${alert.title}`);
      
      // Here you would implement escalation logic
      // - Send notifications
      // - Create support tickets
      // - Trigger automated actions
      
      // For now, just log the escalation
      console.log(`🚨 Alert escalated: ${alert.title} - ${alert.description}`);
    } catch (error) {
      console.error('❌ Alert escalation failed:', error);
    }
  }

  // ========== PUBLIC METHODS ==========

  async getRiskReport(userAddress: string): Promise<RiskReport> {
    return await this.assessPortfolioRisk(userAddress);
  }

  getActiveAlerts(): RiskAlert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.acknowledged);
  }

  acknowledgeAlert(alertId: string): void {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      this.alerts.set(alertId, alert);
    }
  }

  updateRiskLimits(newLimits: Partial<RiskLimits>): void {
    this.riskLimits = { ...this.riskLimits, ...newLimits };
    console.log('⚙️ Risk limits updated:', this.riskLimits);
  }

  getRiskLimits(): RiskLimits {
    return { ...this.riskLimits };
  }

  // ========== CLEANUP ==========

  async cleanup(): Promise<void> {
    try {
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
      }

      this.alerts.clear();
      console.log('🧹 Risk Management Service cleaned up');
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
    }
  }
}

// Export singleton instance
export const riskManagementService = new RiskManagementService();

// Export types
export type { RiskMetrics, RiskFactor, RiskAlert, RiskLimits, RiskReport };
