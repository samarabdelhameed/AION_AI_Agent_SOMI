import { aiRecommendationService } from './aiRecommendationService';
import { portfolioMetricsService } from './portfolioMetricsService';
import { vaultService } from './vaultService';
import { ethers, BigNumber, utils, BrowserProvider, Contract } from '../utils/ethersCompat';

export interface AutoRebalanceConfig {
  enabled: boolean;
  targetAllocations: Record<string, number>;
  rebalanceThreshold: number; // Percentage drift before rebalancing
  maxSlippage: number;
  minRebalanceAmount: BigNumber;
  cooldownPeriod: number; // Hours between rebalances
  riskLimits: RiskLimits;
  notifications: NotificationSettings;
}

export interface RiskLimits {
  maxRiskScore: number;
  maxSingleAllocation: number;
  minLiquidityReserve: number;
  stopLossThreshold: number;
}

export interface NotificationSettings {
  rebalanceExecuted: boolean;
  riskThresholdBreached: boolean;
  performanceAlerts: boolean;
  email?: string;
}

export interface RebalanceExecution {
  id: string;
  timestamp: Date;
  trigger: 'drift' | 'risk' | 'performance' | 'manual';
  fromAllocations: Record<string, number>;
  toAllocations: Record<string, number>;
  transactions: RebalanceTransaction[];
  status: 'pending' | 'executing' | 'completed' | 'failed';
  gasUsed: BigNumber;
  slippage: number;
  executionTime: number;
}

export interface RebalanceTransaction {
  protocol: string;
  action: 'withdraw' | 'deposit';
  amount: BigNumber;
  hash?: string;
  status: 'pending' | 'confirmed' | 'failed';
}

class AutoRebalancingService {
  private configs: Map<string, AutoRebalanceConfig> = new Map();
  private executions: Map<string, RebalanceExecution[]> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;

  async getConfig(userAddress: string): Promise<AutoRebalanceConfig> {
    const existing = this.configs.get(userAddress);
    if (existing) return existing;

    // Default configuration
    const defaultConfig: AutoRebalanceConfig = {
      enabled: false,
      targetAllocations: {
        'Venus': 25,
        'Beefy': 25,
        'PancakeSwap': 25,
        'Aave': 25
      },
      rebalanceThreshold: 10, // 10% drift
      maxSlippage: 2, // 2% max slippage
      minRebalanceAmount: utils.parseEther('0.1'),
      cooldownPeriod: 24, // 24 hours
      riskLimits: {
        maxRiskScore: 70,
        maxSingleAllocation: 50,
        minLiquidityReserve: 10,
        stopLossThreshold: -15
      },
      notifications: {
        rebalanceExecuted: true,
        riskThresholdBreached: true,
        performanceAlerts: true
      }
    };

    this.configs.set(userAddress, defaultConfig);
    return defaultConfig;
  }

  async updateConfig(userAddress: string, config: Partial<AutoRebalanceConfig>): Promise<void> {
    const currentConfig = await this.getConfig(userAddress);
    const updatedConfig = { ...currentConfig, ...config };
    
    // Validate configuration
    this.validateConfig(updatedConfig);
    
    this.configs.set(userAddress, updatedConfig);
    
    console.log('✅ Auto-rebalancing config updated:', {
      enabled: updatedConfig.enabled,
      threshold: updatedConfig.rebalanceThreshold,
      targetAllocations: updatedConfig.targetAllocations
    });

    // Restart monitoring if enabled
    if (updatedConfig.enabled && !this.isMonitoring) {
      this.startMonitoring();
    } else if (!updatedConfig.enabled && this.isMonitoring) {
      this.stopMonitoring();
    }
  }

  private validateConfig(config: AutoRebalanceConfig): void {
    // Validate target allocations sum to 100%
    const totalAllocation = Object.values(config.targetAllocations).reduce((sum, val) => sum + val, 0);
    if (Math.abs(totalAllocation - 100) > 0.1) {
      throw new Error('Target allocations must sum to 100%');
    }

    // Validate thresholds
    if (config.rebalanceThreshold < 1 || config.rebalanceThreshold > 50) {
      throw new Error('Rebalance threshold must be between 1% and 50%');
    }

    if (config.maxSlippage < 0.1 || config.maxSlippage > 10) {
      throw new Error('Max slippage must be between 0.1% and 10%');
    }
  }

  async checkRebalanceNeeded(userAddress: string): Promise<boolean> {
    try {
      const config = await this.getConfig(userAddress);
      if (!config.enabled) return false;

      // Check cooldown period
      const lastExecution = await this.getLastExecution(userAddress);
      if (lastExecution) {
        const hoursSinceLastRebalance = (Date.now() - lastExecution.timestamp.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastRebalance < config.cooldownPeriod) {
          return false;
        }
      }

      // Get current allocations
      const currentAllocations = await this.getCurrentAllocations(userAddress);
      
      // Check drift from target allocations
      const maxDrift = this.calculateMaxDrift(currentAllocations, config.targetAllocations);
      
      if (maxDrift > config.rebalanceThreshold) {
        console.log(`🎯 Rebalance needed: ${maxDrift.toFixed(2)}% drift detected`);
        return true;
      }

      // Check risk limits
      const riskMetrics = await portfolioMetricsService.calculateRiskMetrics(userAddress);
      if (riskMetrics.overallRiskScore > config.riskLimits.maxRiskScore) {
        console.log(`⚠️ Risk-based rebalance needed: Risk score ${riskMetrics.overallRiskScore.toFixed(1)}`);
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ Error checking rebalance need:', error);
      return false;
    }
  }

  async executeRebalance(userAddress: string, trigger: RebalanceExecution['trigger'] = 'manual'): Promise<RebalanceExecution> {
    try {
      console.log('⚡ Executing auto-rebalance for:', userAddress);

      const config = await this.getConfig(userAddress);
      const currentAllocations = await this.getCurrentAllocations(userAddress);
      
      const execution: RebalanceExecution = {
        id: `rebal_${Date.now()}`,
        timestamp: new Date(),
        trigger,
        fromAllocations: currentAllocations,
        toAllocations: config.targetAllocations,
        transactions: [],
        status: 'pending',
        gasUsed: BigNumber.from(0),
        slippage: 0,
        executionTime: 0
      };

      // Store execution
      const userExecutions = this.executions.get(userAddress) || [];
      userExecutions.unshift(execution);
      this.executions.set(userAddress, userExecutions);

      // Calculate required transactions
      const transactions = await this.calculateRebalanceTransactions(
        userAddress,
        currentAllocations,
        config.targetAllocations
      );

      execution.transactions = transactions;
      execution.status = 'executing';

      const startTime = Date.now();

      // Execute transactions
      let totalGasUsed = BigNumber.from(0);
      let totalSlippage = 0;

      for (const transaction of transactions) {
        try {
          const result = await this.executeTransaction(userAddress, transaction);
          
          if (result.success) {
            transaction.status = 'confirmed';
            transaction.hash = result.hash;
            totalGasUsed = totalGasUsed.add(result.gasUsed || BigNumber.from(0));
          } else {
            transaction.status = 'failed';
            throw new Error(`Transaction failed: ${result.error}`);
          }
        } catch (error) {
          console.error('❌ Transaction failed:', error);
          transaction.status = 'failed';
          execution.status = 'failed';
          return execution;
        }
      }

      execution.status = 'completed';
      execution.gasUsed = totalGasUsed;
      execution.executionTime = Date.now() - startTime;

      console.log('✅ Auto-rebalance completed:', {
        executionTime: execution.executionTime,
        gasUsed: execution.gasUsed.toString(),
        transactions: execution.transactions.length
      });

      // Send notification
      if (config.notifications.rebalanceExecuted) {
        await this.sendNotification(userAddress, 'rebalance_completed', execution);
      }

      return execution;
    } catch (error) {
      console.error('❌ Auto-rebalance failed:', error);
      throw error;
    }
  }

  private async getCurrentAllocations(userAddress: string): Promise<Record<string, number>> {
    try {
      const adapters = await vaultService.getAllAdapters();
      const vaultData = await vaultService.getVaultData(userAddress);
      
      const totalAssets = parseFloat(utils.formatEther(vaultData.totalAssets));
      const allocations: Record<string, number> = {};

      for (const adapter of adapters) {
        const adapterAssets = parseFloat(utils.formatEther(adapter.totalDeposited));
        allocations[adapter.name] = totalAssets > 0 ? (adapterAssets / totalAssets) * 100 : 0;
      }

      return allocations;
    } catch (error) {
      console.error('❌ Error getting current allocations:', error);
      return {};
    }
  }

  private calculateMaxDrift(current: Record<string, number>, target: Record<string, number>): number {
    let maxDrift = 0;
    
    for (const protocol in target) {
      const currentAlloc = current[protocol] || 0;
      const targetAlloc = target[protocol] || 0;
      const drift = Math.abs(currentAlloc - targetAlloc);
      maxDrift = Math.max(maxDrift, drift);
    }
    
    return maxDrift;
  }

  private async calculateRebalanceTransactions(
    userAddress: string,
    current: Record<string, number>,
    target: Record<string, number>
  ): Promise<RebalanceTransaction[]> {
    const transactions: RebalanceTransaction[] = [];
    const vaultData = await vaultService.getVaultData(userAddress);
    const totalValue = parseFloat(utils.formatEther(vaultData.balance));

    for (const protocol in target) {
      const currentAlloc = current[protocol] || 0;
      const targetAlloc = target[protocol] || 0;
      const diff = targetAlloc - currentAlloc;
      
      if (Math.abs(diff) > 1) { // Only rebalance if difference > 1%
        const amount = utils.parseEther(((Math.abs(diff) / 100) * totalValue).toFixed(6));
        
        transactions.push({
          protocol,
          action: diff > 0 ? 'deposit' : 'withdraw',
          amount,
          status: 'pending'
        });
      }
    }

    return transactions;
  }

  private async executeTransaction(userAddress: string, transaction: RebalanceTransaction): Promise<any> {
    // In real implementation, this would call actual smart contract functions
    console.log(`🔄 Executing ${transaction.action} of ${utils.formatEther(transaction.amount)} BNB to ${transaction.protocol}`);
    
    // Simulate transaction execution
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    return {
      success: Math.random() > 0.05, // 95% success rate
      hash: `0x${Math.random().toString(16).substr(2, 64)}`,
      gasUsed: BigNumber.from(Math.floor(Math.random() * 100000 + 50000)),
      error: Math.random() > 0.05 ? null : 'Simulated transaction failure'
    };
  }

  async getExecutionHistory(userAddress: string): Promise<RebalanceExecution[]> {
    return this.executions.get(userAddress) || [];
  }

  private async getLastExecution(userAddress: string): Promise<RebalanceExecution | null> {
    const executions = this.executions.get(userAddress) || [];
    return executions.length > 0 ? executions[0] : null;
  }

  startMonitoring(): void {
    if (this.isMonitoring) return;

    console.log('🔄 Starting auto-rebalancing monitoring...');
    this.isMonitoring = true;

    this.monitoringInterval = setInterval(async () => {
      try {
        // Check all enabled configurations
        for (const [userAddress, config] of this.configs.entries()) {
          if (config.enabled) {
            const needsRebalance = await this.checkRebalanceNeeded(userAddress);
            
            if (needsRebalance) {
              console.log(`🎯 Auto-rebalancing triggered for ${userAddress}`);
              await this.executeRebalance(userAddress, 'drift');
            }
          }
        }
      } catch (error) {
        console.error('❌ Error in monitoring cycle:', error);
      }
    }, 5 * 60 * 1000); // Check every 5 minutes
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      this.isMonitoring = false;
      console.log('⏹️ Auto-rebalancing monitoring stopped');
    }
  }

  private async sendNotification(userAddress: string, type: string, data: any): Promise<void> {
    console.log(`📧 Sending notification: ${type}`, {
      userAddress: userAddress.slice(0, 8) + '...',
      data: data.id
    });
    
    // In real implementation, send email/push notification
  }

  // Performance tracking
  async getPerformanceMetrics(userAddress: string): Promise<any> {
    const executions = await this.getExecutionHistory(userAddress);
    const completedExecutions = executions.filter(e => e.status === 'completed');

    if (completedExecutions.length === 0) {
      return {
        totalExecutions: 0,
        successRate: 0,
        avgExecutionTime: 0,
        totalGasSaved: BigNumber.from(0)
      };
    }

    const successRate = (completedExecutions.length / executions.length) * 100;
    const avgExecutionTime = completedExecutions.reduce((sum, e) => sum + e.executionTime, 0) / completedExecutions.length;
    const totalGasUsed = completedExecutions.reduce((sum, e) => sum.add(e.gasUsed), BigNumber.from(0));

    return {
      totalExecutions: executions.length,
      successRate,
      avgExecutionTime,
      totalGasUsed,
      lastExecution: executions[0]?.timestamp
    };
  }
}

export const autoRebalancingService = new AutoRebalancingService();