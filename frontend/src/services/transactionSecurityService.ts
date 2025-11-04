import { ethers, BigNumber, utils, BrowserProvider, Contract } from '../utils/ethersCompat';
import { vaultService } from './vaultService';

export interface SecurityCheck {
  type: 'amount_limit' | 'frequency_limit' | 'suspicious_activity' | 'contract_verification' | 'gas_estimation';
  status: 'passed' | 'warning' | 'blocked';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface TransactionLimits {
  dailyLimit: BigNumber;
  singleTransactionLimit: BigNumber;
  weeklyLimit: BigNumber;
  monthlyLimit: BigNumber;
  requireConfirmationAbove: BigNumber;
  requireMultiSigAbove: BigNumber;
}

export interface SecuritySettings {
  limits: TransactionLimits;
  enableSuspiciousActivityDetection: boolean;
  enableContractVerification: boolean;
  enableGasEstimation: boolean;
  notificationSettings: {
    largeTransactions: boolean;
    suspiciousActivity: boolean;
    securityAlerts: boolean;
  };
}

export interface TransactionSecurityResult {
  approved: boolean;
  requiresConfirmation: boolean;
  requiresMultiSig: boolean;
  checks: SecurityCheck[];
  estimatedGas: BigNumber;
  securityScore: number;
  recommendations: string[];
}

class TransactionSecurityService {
  private userSettings: Map<string, SecuritySettings> = new Map();
  private transactionHistory: Map<string, any[]> = new Map();

  async getSecuritySettings(userAddress: string): Promise<SecuritySettings> {
    const existing = this.userSettings.get(userAddress);
    if (existing) return existing;

    // Default security settings
    const defaultSettings: SecuritySettings = {
      limits: {
        dailyLimit: utils.parseEther('10'), // 10 BNB per day
        singleTransactionLimit: utils.parseEther('5'), // 5 BNB per transaction
        weeklyLimit: utils.parseEther('50'), // 50 BNB per week
        monthlyLimit: utils.parseEther('200'), // 200 BNB per month
        requireConfirmationAbove: utils.parseEther('1'), // Confirm above 1 BNB
        requireMultiSigAbove: utils.parseEther('10') // Multi-sig above 10 BNB
      },
      enableSuspiciousActivityDetection: true,
      enableContractVerification: true,
      enableGasEstimation: true,
      notificationSettings: {
        largeTransactions: true,
        suspiciousActivity: true,
        securityAlerts: true
      }
    };

    this.userSettings.set(userAddress, defaultSettings);
    return defaultSettings;
  }

  async updateSecuritySettings(userAddress: string, settings: Partial<SecuritySettings>): Promise<void> {
    const currentSettings = await this.getSecuritySettings(userAddress);
    const updatedSettings = { ...currentSettings, ...settings };
    this.userSettings.set(userAddress, updatedSettings);
    
    console.log('✅ Security settings updated for:', userAddress);
  }

  async validateTransaction(
    userAddress: string,
    transactionType: string,
    amount: BigNumber,
    targetContract?: string
  ): Promise<TransactionSecurityResult> {
    console.log('🛡️ Validating transaction security:', {
      type: transactionType,
      amount: utils.formatEther(amount),
      target: targetContract
    });

    const settings = await this.getSecuritySettings(userAddress);
    const checks: SecurityCheck[] = [];
    let approved = true;
    let requiresConfirmation = false;
    let requiresMultiSig = false;
    let securityScore = 100;

    // Check 1: Amount limits
    const amountCheck = await this.checkAmountLimits(userAddress, amount, settings.limits);
    checks.push(amountCheck);
    
    if (amountCheck.status === 'blocked') {
      approved = false;
      securityScore -= 50;
    } else if (amountCheck.status === 'warning') {
      securityScore -= 20;
    }

    // Check 2: Frequency limits
    const frequencyCheck = await this.checkFrequencyLimits(userAddress, amount);
    checks.push(frequencyCheck);
    
    if (frequencyCheck.status === 'blocked') {
      approved = false;
      securityScore -= 30;
    } else if (frequencyCheck.status === 'warning') {
      securityScore -= 10;
    }

    // Check 3: Suspicious activity detection
    if (settings.enableSuspiciousActivityDetection) {
      const suspiciousCheck = await this.checkSuspiciousActivity(userAddress, transactionType, amount);
      checks.push(suspiciousCheck);
      
      if (suspiciousCheck.status === 'blocked') {
        approved = false;
        securityScore -= 40;
      } else if (suspiciousCheck.status === 'warning') {
        securityScore -= 15;
      }
    }

    // Check 4: Contract verification
    if (settings.enableContractVerification && targetContract) {
      const contractCheck = await this.verifyContract(targetContract);
      checks.push(contractCheck);
      
      if (contractCheck.status === 'blocked') {
        approved = false;
        securityScore -= 60;
      } else if (contractCheck.status === 'warning') {
        securityScore -= 25;
      }
    }

    // Check 5: Gas estimation
    let estimatedGas = BigNumber.from(200000); // Default
    if (settings.enableGasEstimation) {
      const gasCheck = await this.estimateGas(transactionType, amount);
      checks.push(gasCheck);
      estimatedGas = gasCheck.type === 'gas_estimation' ? BigNumber.from(300000) : estimatedGas;
    }

    // Determine confirmation requirements
    if (amount.gte(settings.limits.requireConfirmationAbove)) {
      requiresConfirmation = true;
    }

    if (amount.gte(settings.limits.requireMultiSigAbove)) {
      requiresMultiSig = true;
    }

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (securityScore < 70) {
      recommendations.push('Consider reducing transaction amount or frequency');
    }
    
    if (requiresMultiSig) {
      recommendations.push('Multi-signature required for this transaction amount');
    }
    
    if (checks.some(c => c.severity === 'high' || c.severity === 'critical')) {
      recommendations.push('Review security alerts before proceeding');
    }

    const result: TransactionSecurityResult = {
      approved,
      requiresConfirmation,
      requiresMultiSig,
      checks,
      estimatedGas,
      securityScore: Math.max(0, securityScore),
      recommendations
    };

    console.log('🛡️ Security validation result:', {
      approved,
      securityScore: result.securityScore,
      checksCount: checks.length
    });

    return result;
  }

  private async checkAmountLimits(
    userAddress: string,
    amount: BigNumber,
    limits: TransactionLimits
  ): Promise<SecurityCheck> {
    // Check single transaction limit
    if (amount.gt(limits.singleTransactionLimit)) {
      return {
        type: 'amount_limit',
        status: 'blocked',
        message: `Transaction amount exceeds single transaction limit of ${utils.formatEther(limits.singleTransactionLimit)} BNB`,
        severity: 'high'
      };
    }

    // Check daily limit
    const dailyUsage = await this.getDailyUsage(userAddress);
    if (dailyUsage.add(amount).gt(limits.dailyLimit)) {
      return {
        type: 'amount_limit',
        status: 'blocked',
        message: `Transaction would exceed daily limit of ${utils.formatEther(limits.dailyLimit)} BNB`,
        severity: 'medium'
      };
    }

    // Warning for large amounts
    if (amount.gt(limits.requireConfirmationAbove)) {
      return {
        type: 'amount_limit',
        status: 'warning',
        message: `Large transaction amount requires confirmation`,
        severity: 'medium'
      };
    }

    return {
      type: 'amount_limit',
      status: 'passed',
      message: 'Transaction amount within limits',
      severity: 'low'
    };
  }

  private async checkFrequencyLimits(userAddress: string, amount: BigNumber): Promise<SecurityCheck> {
    const recentTransactions = await this.getRecentTransactions(userAddress, 60); // Last hour
    
    if (recentTransactions.length > 10) {
      return {
        type: 'frequency_limit',
        status: 'blocked',
        message: 'Too many transactions in the last hour. Please wait before making another transaction.',
        severity: 'high'
      };
    }

    if (recentTransactions.length > 5) {
      return {
        type: 'frequency_limit',
        status: 'warning',
        message: 'High transaction frequency detected',
        severity: 'medium'
      };
    }

    return {
      type: 'frequency_limit',
      status: 'passed',
      message: 'Transaction frequency within normal limits',
      severity: 'low'
    };
  }

  private async checkSuspiciousActivity(
    userAddress: string,
    transactionType: string,
    amount: BigNumber
  ): Promise<SecurityCheck> {
    const recentTransactions = await this.getRecentTransactions(userAddress, 1440); // Last 24 hours
    
    // Check for unusual patterns
    const sameTypeTransactions = recentTransactions.filter(tx => tx.type === transactionType);
    const totalAmount = sameTypeTransactions.reduce((sum, tx) => sum.add(tx.amount), BigNumber.from(0));
    
    // Suspicious if many similar transactions
    if (sameTypeTransactions.length > 20) {
      return {
        type: 'suspicious_activity',
        status: 'blocked',
        message: 'Unusual transaction pattern detected. Account may be compromised.',
        severity: 'critical'
      };
    }

    // Check for round-trip transactions (deposit then immediate withdraw)
    const hasRoundTrip = this.detectRoundTripTransactions(recentTransactions);
    if (hasRoundTrip) {
      return {
        type: 'suspicious_activity',
        status: 'warning',
        message: 'Round-trip transaction pattern detected',
        severity: 'medium'
      };
    }

    return {
      type: 'suspicious_activity',
      status: 'passed',
      message: 'No suspicious activity detected',
      severity: 'low'
    };
  }

  private async verifyContract(contractAddress: string): Promise<SecurityCheck> {
    // In real implementation, verify contract against known good contracts
    const knownContracts = [
      '0x1234567890abcdef1234567890abcdef12345678', // Vault contract
      '0xabcdef1234567890abcdef1234567890abcdef12', // Venus adapter
      '0x567890abcdef1234567890abcdef1234567890ab'  // Beefy adapter
    ];

    if (knownContracts.includes(contractAddress.toLowerCase())) {
      return {
        type: 'contract_verification',
        status: 'passed',
        message: 'Contract verified and trusted',
        severity: 'low'
      };
    }

    // Check if contract is verified on BSCScan (mock)
    const isVerified = Math.random() > 0.2; // 80% chance of being verified
    
    if (!isVerified) {
      return {
        type: 'contract_verification',
        status: 'blocked',
        message: 'Contract not verified. Transaction blocked for security.',
        severity: 'critical'
      };
    }

    return {
      type: 'contract_verification',
      status: 'warning',
      message: 'Contract verified but not in trusted list',
      severity: 'medium'
    };
  }

  private async estimateGas(transactionType: string, amount: BigNumber): Promise<SecurityCheck> {
    // Estimate gas based on transaction type
    const gasEstimates = {
      'deposit': 150000,
      'withdraw': 200000,
      'withdrawShares': 180000,
      'claimYield': 120000,
      'rebalance': 300000
    };

    const estimatedGas = gasEstimates[transactionType] || 200000;
    const gasPrice = utils.parseUnits('5', 'gwei'); // 5 gwei
    const gasCost = BigNumber.from(estimatedGas).mul(gasPrice);
    const gasCostBNB = parseFloat(utils.formatEther(gasCost));

    if (gasCostBNB > 0.01) { // More than 0.01 BNB
      return {
        type: 'gas_estimation',
        status: 'warning',
        message: `High gas cost estimated: ${gasCostBNB.toFixed(4)} BNB`,
        severity: 'medium'
      };
    }

    return {
      type: 'gas_estimation',
      status: 'passed',
      message: `Gas cost estimated: ${gasCostBNB.toFixed(4)} BNB`,
      severity: 'low'
    };
  }

  private async getDailyUsage(userAddress: string): Promise<BigNumber> {
    const transactions = await this.getRecentTransactions(userAddress, 1440); // 24 hours
    return transactions
      .filter(tx => tx.type === 'deposit' || tx.type === 'withdraw')
      .reduce((sum, tx) => sum.add(tx.amount), BigNumber.from(0));
  }

  private async getRecentTransactions(userAddress: string, minutes: number): Promise<any[]> {
    const cached = this.transactionHistory.get(userAddress) || [];
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    
    // Mock recent transactions
    if (cached.length === 0) {
      const mockTransactions = [];
      for (let i = 0; i < Math.floor(Math.random() * 5); i++) {
        mockTransactions.push({
          type: ['deposit', 'withdraw', 'claimYield'][Math.floor(Math.random() * 3)],
          amount: utils.parseEther((Math.random() * 2).toFixed(4)),
          timestamp: new Date(Date.now() - Math.random() * minutes * 60 * 1000)
        });
      }
      this.transactionHistory.set(userAddress, mockTransactions);
      return mockTransactions;
    }
    
    return cached.filter(tx => tx.timestamp >= cutoff);
  }

  private detectRoundTripTransactions(transactions: any[]): boolean {
    // Look for deposit followed by withdraw within short time
    for (let i = 0; i < transactions.length - 1; i++) {
      const tx1 = transactions[i];
      const tx2 = transactions[i + 1];
      
      if (tx1.type === 'deposit' && tx2.type === 'withdraw') {
        const timeDiff = Math.abs(tx1.timestamp.getTime() - tx2.timestamp.getTime());
        if (timeDiff < 10 * 60 * 1000) { // Within 10 minutes
          return true;
        }
      }
    }
    return false;
  }

  // Multi-signature simulation
  async requestMultiSigApproval(
    userAddress: string,
    transactionData: any
  ): Promise<{ approvalId: string; requiredSignatures: number }> {
    const approvalId = `multisig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log('🔐 Multi-signature approval requested:', {
      approvalId,
      userAddress: userAddress.slice(0, 8) + '...',
      amount: utils.formatEther(transactionData.amount)
    });

    // In real implementation, this would integrate with a multi-sig wallet
    return {
      approvalId,
      requiredSignatures: 2 // Require 2 signatures
    };
  }

  async checkMultiSigStatus(approvalId: string): Promise<{
    status: 'pending' | 'approved' | 'rejected';
    signatures: number;
    required: number;
  }> {
    // Mock multi-sig status
    return {
      status: Math.random() > 0.7 ? 'approved' : 'pending',
      signatures: Math.floor(Math.random() * 2),
      required: 2
    };
  }

  // Emergency pause functionality
  async emergencyPause(userAddress: string, reason: string): Promise<void> {
    console.log('🚨 Emergency pause activated:', {
      userAddress: userAddress.slice(0, 8) + '...',
      reason
    });

    // In real implementation, this would pause all user transactions
    const settings = await this.getSecuritySettings(userAddress);
    settings.limits.singleTransactionLimit = BigNumber.from(0);
    this.userSettings.set(userAddress, settings);
  }

  async resumeOperations(userAddress: string): Promise<void> {
    console.log('✅ Operations resumed for:', userAddress.slice(0, 8) + '...');
    
    // Restore normal limits
    const defaultSettings = await this.getSecuritySettings('default');
    this.userSettings.set(userAddress, defaultSettings);
  }
}

export const transactionSecurityService = new TransactionSecurityService();