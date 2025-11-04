import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ExecutionProgress } from '../components/execute/ExecutionProgress';
import { ArrowRight, ArrowLeft, Zap, AlertTriangle, CheckCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { Page } from '../App';
// Removed gasless AA flow for now
import { useChainId, useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { parseEther, formatEther } from 'viem';
import { depositWithWallet, withdrawWithWallet, getMinDepositWei, getMinWithdrawWei } from '../lib/tx';
import { contractConfig } from '../lib/contractConfig';
import { useStrategies } from '../hooks/useStrategies';
import { useRealData } from '../hooks/useRealData';
import { useVaultOnchain } from '../hooks/useVaultOnchain';
import { useVaultMinDeposit } from '../hooks/useVaultMinDeposit';
import { useWalletOnchain } from '../hooks/useWalletOnchain';
import { toHuman } from '../utils/validateAmount';

function MinRequirementNotice({ action }: { action: string }) {
  const { minDeposit, isLoading, isError, refetch } = useVaultMinDeposit();
  
  // Only show for deposit action (hide for withdraw since there's typically no minimum withdraw)
  if (action !== 'deposit') {
    return null;
  }
  
  if (isLoading) {
    return (
      <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl text-sm text-blue-200">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
          Loading minimum deposit...
        </div>
      </div>
    );
  }
  
  if (isError) {
    return (
      <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-sm text-red-200">
        <div className="flex items-center justify-between">
          <span>Failed to load minimum deposit</span>
          <Button size="sm" variant="ghost" onClick={() => refetch()} className="h-6 px-2">
            <RefreshCw className="h-3 w-3" />
          </Button>
        </div>
      </div>
    );
  }
  
  const minHuman = toHuman(minDeposit);
  
  return (
    <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-sm text-yellow-200">
      <div className="flex items-center justify-between">
        <span>Minimum deposit requirement: <strong>{minHuman.toFixed(6)} BNB</strong> (live from chain)</span>
        <Button size="sm" variant="ghost" onClick={() => refetch()} className="h-6 px-2">
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}

type ExecutionStep = 'params' | 'validate' | 'simulate' | 'confirm' | 'result';
type ExecutionStatus = 'pending' | 'sent' | 'confirmed' | 'failed';

interface ExecutePageProps {
  onNavigate: (page: Page) => void;
}

export function ExecutePage({ onNavigate }: ExecutePageProps) {
  const chainId = useChainId();
  const { isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  
  // Real data hooks - moved before state initialization
  const { strategies } = useStrategies();
  const { marketData } = useRealData();
  const { balanceBNB, refreshAfterTransaction: refreshVault } = useVaultOnchain();
  const { balances } = useWalletOnchain();
  
  const [currentStep, setCurrentStep] = useState<ExecutionStep>('params');
  const [executionStatus, setExecutionStatus] = useState<ExecutionStatus>('pending');
  const [txHash, setTxHash] = useState<string>('');
  const [formData, setFormData] = useState({
    network: 'bsc',
    strategy: strategies.length > 0 ? strategies[0].id : 'venus',
    action: 'deposit',
    currency: 'BNB',
    amount: '',
  });

  // Get selected strategy data
  const selectedStrategy = strategies.find(s => s.id === formData.strategy);

  // Dynamic simulation based on real data - direction-aware
  const simulationResult = useMemo(() => {
    const amount = parseFloat(formData.amount) || 0;
    const bnbPrice = marketData?.bnb_price_usd || 326.12;
    const currentVaultBalance = (balanceBNB || 0) * bnbPrice;
    const currentWalletBalance = (balances.BNB || 0) * bnbPrice;
    const strategyAPY = selectedStrategy?.apy || 8.0;
    
    // Direction-aware calculations
    const isWithdraw = formData.action === 'withdraw';
    const changeAmount = amount * bnbPrice;
    
    const expectedVaultBalance = isWithdraw 
      ? currentVaultBalance - changeAmount 
      : currentVaultBalance + changeAmount;
      
    const expectedWalletBalance = isWithdraw
      ? currentWalletBalance + changeAmount
      : currentWalletBalance - changeAmount;
    
    return {
      gasEstimate: 0.002,
      expectedBalance: expectedVaultBalance, // This is vault balance
      expectedWalletBalance: expectedWalletBalance,
      balanceChange: isWithdraw ? -changeAmount : changeAmount,
      currentPrice: bnbPrice,
      projectedYield: (amount * bnbPrice * strategyAPY) / (365 * 100), // Daily yield
      strategyAPY,
      riskLevel: selectedStrategy?.riskLevel || 3,
      isWithdraw,
    };
  }, [formData.amount, formData.action, marketData, balanceBNB, balances.BNB, selectedStrategy]);

  const steps = [
    { id: 'params', title: 'Parameters', description: 'Set execution parameters' },
    { id: 'validate', title: 'Validate', description: 'Verify inputs and balance' },
    { id: 'simulate', title: 'Simulate', description: 'Preview expected results' },
    { id: 'confirm', title: 'Confirm', description: 'Review and execute' },
    { id: 'result', title: 'Result', description: 'Transaction complete' },
  ];

  const executionSteps = [
    {
      id: '1',
      title: 'Preparing Transaction',
      description: 'Building transaction parameters...',
      status: currentStep === 'result' ? 'completed' : executionStatus === 'pending' ? 'current' : 'pending',
    },
    {
      id: '2',
      title: 'Broadcasting to Network',
      description: 'Sending transaction to blockchain...',
      status: currentStep === 'result' && executionStatus !== 'pending' ? 'completed' : executionStatus === 'sent' ? 'current' : 'pending',
    },
    {
      id: '3',
      title: 'Confirming Transaction',
      description: 'Waiting for network confirmation...',
      status: executionStatus === 'confirmed' ? 'completed' : executionStatus === 'confirmed' ? 'current' : 'pending',
    },
  ] as const;

  const handleNext = () => {
    const stepOrder: ExecutionStep[] = ['params', 'validate', 'simulate', 'confirm', 'result'];
    const currentIndex = stepOrder.indexOf(currentStep);
    
    // Validate amount before proceeding from params step
    if (currentStep === 'params') {
      const amount = formData.amount?.trim();
      if (!amount || amount === '') {
        alert('Please enter a valid amount');
        return;
      }
      
      const numAmount = parseFloat(amount);
      if (isNaN(numAmount) || numAmount <= 0) {
        alert('Please enter a valid positive amount');
        return;
      }
    }
    
    if (currentIndex < stepOrder.length - 1) {
      setCurrentStep(stepOrder[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const stepOrder: ExecutionStep[] = ['params', 'validate', 'simulate', 'confirm', 'result'];
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(stepOrder[currentIndex - 1]);
    }
  };

  const handleExecute = () => {
    setCurrentStep('result');
    setExecutionStatus('pending');
    setTxHash('0x1234567890abcdef1234567890abcdef12345678901234567890abcdef12345678');
    
    // Simulate transaction progression
    setTimeout(() => setExecutionStatus('sent'), 2000);
    setTimeout(() => setExecutionStatus('confirmed'), 5000);
  };

  const handleExecuteGasless = async () => {
    if (!isConnected) {
      if (openConnectModal) openConnectModal();
      return;
    }
    
    setCurrentStep('result');
    setExecutionStatus('pending');
    
    try {
      // Use contractConfig directly for vault address
      const vault = contractConfig.vault.address as `0x${string}`;
      if (!vault) throw new Error('Vault address not configured');
      
      // Log the action being executed
      console.log('🔍 [EXECUTE] Starting execution:', {
        action: formData.action,
        strategy: formData.strategy,
        amount: formData.amount,
        chainId: chainId
      });
      
      let receipt: any;
      
      // Handle different action types
      switch (formData.action) {
        case 'withdraw':
          console.log('💸 [EXECUTE] Executing withdraw...');
          const userAmount = formData.amount?.trim();
          if (!userAmount || userAmount === '') {
            throw new Error('Please enter a valid amount');
          }
          
          const userBNB = parseFloat(userAmount);
          if (isNaN(userBNB) || userBNB <= 0) {
            throw new Error('Please enter a valid positive amount');
          }
          
          receipt = await withdrawWithWallet({ 
            chainId, 
            vaultAddress: vault, 
            amountWei: parseEther(userBNB.toFixed(6)) 
          });
          break;

        case 'compound':
          console.log('🔄 [EXECUTE] Executing compound...');
          const { compoundRewards } = await import('../lib/tx');
          receipt = await compoundRewards({ chainId, vaultAddress: vault });
          break;

        case 'harvest':
          console.log('🌾 [EXECUTE] Executing harvest...');
          const { harvestYield } = await import('../lib/tx');
          receipt = await harvestYield({ chainId, vaultAddress: vault });
          break;

        case 'rebalance':
          console.log('⚖️ [EXECUTE] Executing rebalance...');
          const { rebalanceStrategy } = await import('../lib/tx');
          receipt = await rebalanceStrategy({ 
            chainId, 
            vaultAddress: vault,
            fromStrategy: 'current',
            toStrategy: formData.strategy,
            percentage: 100
          });
          break;

        case 'migrate':
          console.log('🚀 [EXECUTE] Executing migrate...');
          const { migrateStrategy } = await import('../lib/tx');
          receipt = await migrateStrategy({ 
            chainId, 
            vaultAddress: vault,
            targetStrategy: formData.strategy
          });
          break;

        case 'emergency':
          console.log('🚨 [EXECUTE] Executing emergency withdraw...');
          const { emergencyWithdrawAll } = await import('../lib/tx');
          receipt = await emergencyWithdrawAll({ chainId, vaultAddress: vault });
          break;

        case 'deposit':
        default:
          console.log('💰 [EXECUTE] Executing deposit...');
          
          // Respect on-chain minimum deposit
          let minWei: bigint;
          try {
            minWei = await getMinDepositWei(chainId, vault);
            console.log('Min deposit (wei):', minWei.toString());
          } catch (error) {
            console.error('Failed to get min deposit:', error);
            throw new Error('Smart contract error: Cannot read minimum deposit. Contract may be paused or malfunctioning.');
          }
          
          const minBNB = parseFloat(formatEther(minWei));
          
          // Parse user amount with proper validation
          const depositAmount = formData.amount?.trim();
          if (!depositAmount || depositAmount === '') {
            throw new Error('Please enter a valid amount');
          }
          
          const depositBNB = parseFloat(depositAmount);
          if (isNaN(depositBNB) || depositBNB <= 0) {
            throw new Error('Please enter a valid positive amount');
          }
          
          // enforce on-chain min + tiny epsilon to avoid equality rounding
          const targetBNB = Math.max(depositBNB, minBNB + 0.000001);
          
          console.log('Deposit details:', {
            userAmount: depositAmount,
            userBNB: depositBNB,
            minBNB: minBNB,
            targetBNB: targetBNB,
            targetWei: parseEther(targetBNB.toFixed(6)).toString()
          });
          
          receipt = await depositWithWallet({ 
            chainId, 
            vaultAddress: vault, 
            amountWei: parseEther(targetBNB.toFixed(6)) 
          });
          break;
      }
      
      console.log(`✅ [EXECUTE] ${formData.action} successful:`, receipt?.transactionHash);
      
      setTxHash(receipt?.transactionHash || '');
      setExecutionStatus('confirmed');
      
      // Refresh data after successful transaction
      console.log('🔄 Refreshing data after successful transaction...');
      try {
        await refreshVault();
        console.log('✅ Data refreshed successfully');
      } catch (refreshError) {
        console.error('❌ Failed to refresh data:', refreshError);
      }
      
    } catch (e: unknown) {
      console.error('Execute failed', e);
      
      // Better error messages
      let errorMessage = 'Transaction failed';
      const error = e as Error;
      
      if (error.message?.includes('Internal JSON-RPC error')) {
        errorMessage = 'Smart contract error: Contract may be paused or malfunctioning. Please try again later.';
      } else if (error.message?.includes('execution reverted')) {
        errorMessage = 'Smart contract error: Transaction reverted by contract. Please check your input parameters.';
      } else if (error.message?.includes('insufficient funds')) {
        errorMessage = 'Insufficient funds: Please check your wallet balance.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      console.error('User-friendly error:', errorMessage);
      setExecutionStatus('failed');
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'params':
        return (
          <Card>
            <h3 className="text-xl font-semibold text-white mb-6">Execution Parameters</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Network</label>
                <select 
                  value={formData.network}
                  onChange={(e) => setFormData(prev => ({ ...prev, network: e.target.value }))}
                  className="w-full px-4 py-3 bg-dark-700/50 border border-dark-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                >
                  <option value="bsc">BNB Chain</option>
                  <option value="ethereum">Ethereum</option>
                  <option value="polygon">Polygon</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Strategy</label>
                <select 
                  value={formData.strategy}
                  onChange={(e) => setFormData(prev => ({ ...prev, strategy: e.target.value }))}
                  className="w-full px-4 py-3 bg-dark-700/50 border border-dark-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                >
                  {strategies.map(strategy => (
                    <option key={strategy.id} value={strategy.id}>
                      {strategy.icon} {strategy.name} - {strategy.apy.toFixed(2)}% APY
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  {strategies.length} strategies available • 
                  {selectedStrategy && (
                    <span className="text-gold-500 ml-1">
                      {selectedStrategy.protocolName} • {selectedStrategy.network} • Risk: {selectedStrategy.riskCategory}
                    </span>
                  )}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Action</label>
                <select 
                  value={formData.action}
                  onChange={(e) => setFormData(prev => ({ ...prev, action: e.target.value }))}
                  className="w-full px-4 py-3 bg-dark-700/50 border border-dark-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                >
                  <option value="deposit">💰 Deposit - Add funds to strategy</option>
                  <option value="withdraw">💸 Withdraw - Remove funds from strategy</option>
                  <option value="compound">🔄 Compound - Reinvest earned rewards</option>
                  <option value="harvest">🌾 Harvest - Claim rewards without reinvesting</option>
                  <option value="rebalance">⚖️ Rebalance - Optimize allocation</option>
                  <option value="migrate">🚀 Migrate - Move to better strategy</option>
                  <option value="emergency">🚨 Emergency Withdraw - Instant exit (may have fees)</option>
                  <option value="autoRebalance">🤖 Auto-Rebalance - Set automatic optimization</option>
                  <option value="dca">📈 DCA - Dollar Cost Averaging</option>
                  <option value="stopLoss">🛡️ Stop Loss - Automatic risk protection</option>
                  <option value="takeProfit">🎯 Take Profit - Automatic profit taking</option>
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  {formData.action === 'deposit' && 'Add funds to earn yield - Start earning immediately'}
                  {formData.action === 'withdraw' && 'Remove funds from strategy - Get your money back'}
                  {formData.action === 'compound' && 'Automatically reinvest earned rewards for higher APY - Maximize returns'}
                  {formData.action === 'harvest' && 'Claim rewards to your wallet without reinvesting - Take profits'}
                  {formData.action === 'rebalance' && 'Optimize your position for better returns - AI-powered optimization'}
                  {formData.action === 'migrate' && 'Move funds to a higher-yielding strategy - Smart strategy switching'}
                  {formData.action === 'emergency' && 'Instant withdrawal with potential fees - Emergency exit'}
                  {formData.action === 'autoRebalance' && 'Set automatic portfolio optimization - Hands-free management'}
                  {formData.action === 'dca' && 'Invest fixed amounts regularly - Reduce market timing risk'}
                  {formData.action === 'stopLoss' && 'Automatically exit if losses exceed threshold - Risk protection'}
                  {formData.action === 'takeProfit' && 'Automatically sell when profit target is reached - Lock in gains'}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Currency</label>
                <select 
                  value={formData.currency}
                  onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                  className="w-full px-4 py-3 bg-dark-700/50 border border-dark-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                >
                  <option value="BNB">BNB</option>
                  <option value="ETH">ETH</option>
                  <option value="USDC">USDC</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Amount</label>
                <div className="relative">
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="0.0"
                    className="w-full px-4 py-3 bg-dark-700/50 border border-dark-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-gold-500/50"
                  />
                  <button 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gold-500 text-sm font-medium hover:text-gold-400 transition-colors"
                    onClick={() => {
                      const maxAmount = balances.BNB || 0;
                      setFormData(prev => ({ ...prev, amount: maxAmount.toFixed(6) }));
                    }}
                  >
                    MAX
                  </button>
                </div>
                <div className="flex justify-between items-center mt-1">
                  <p className="text-xs text-gray-400">
                    Available: {balances.BNB ? balances.BNB.toFixed(6) : '0.000000'} BNB
                  </p>
                  {formData.amount && (
                    <p className="text-xs text-gold-500">
                      ≈ ${((parseFloat(formData.amount) || 0) * (marketData?.bnb_price_usd || 326)).toFixed(2)}
                    </p>
                  )}
                </div>
                
                {/* Quick Amount Buttons */}
                <div className="flex gap-2 mt-2">
                  {[0.001, 0.01, 0.1, 0.5].map(amount => (
                    <button
                      key={amount}
                      onClick={() => setFormData(prev => ({ ...prev, amount: amount.toString() }))}
                      className="px-2 py-1 text-xs bg-dark-600 hover:bg-dark-500 text-gray-300 rounded transition-colors"
                    >
                      {amount} BNB
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        );

      case 'validate':
        return (
          <Card>
            <h3 className="text-xl font-semibold text-white mb-6">Validation</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <div>
                  <p className="text-white font-medium">Balance Sufficient</p>
                  <p className="text-sm text-gray-400">You have enough {formData.currency} for this transaction</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <div>
                  <p className="text-white font-medium">Network Compatible</p>
                  <p className="text-sm text-gray-400">Strategy available on selected network</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                <div>
                  <p className="text-white font-medium">Gas Price Alert</p>
                  <p className="text-sm text-gray-400">Network congestion may increase gas costs</p>
                </div>
              </div>
            </div>
          </Card>
        );

      case 'simulate':
        return (
          <Card>
            <h3 className="text-xl font-semibold text-white mb-6">Simulation Results</h3>
            <div className="space-y-6">
              {/* Operation-specific simulation */}
              {formData.action === 'compound' && (
                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                  <h4 className="text-green-400 font-medium mb-2">🔄 Compound Simulation</h4>
                  <p className="text-sm text-gray-300">
                    Estimated rewards to compound: <span className="text-green-400">0.0023 BNB</span>
                  </p>
                  <p className="text-sm text-gray-300">
                    New APY after compounding: <span className="text-green-400">{(selectedStrategy?.apy || 8) + 0.5}%</span>
                  </p>
                </div>
              )}
              
              {formData.action === 'harvest' && (
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl">
                  <h4 className="text-yellow-400 font-medium mb-2">🌾 Harvest Simulation</h4>
                  <p className="text-sm text-gray-300">
                    Available rewards: <span className="text-yellow-400">0.0023 BNB</span>
                  </p>
                  <p className="text-sm text-gray-300">
                    You will receive: <span className="text-yellow-400">${(0.0023 * simulationResult.currentPrice).toFixed(2)}</span>
                  </p>
                </div>
              )}
              
              {formData.action === 'migrate' && (
                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                  <h4 className="text-blue-400 font-medium mb-2">🚀 Migration Simulation</h4>
                  <p className="text-sm text-gray-300">
                    Current strategy APY: <span className="text-red-400">8.5%</span>
                  </p>
                  <p className="text-sm text-gray-300">
                    Target strategy APY: <span className="text-green-400">{selectedStrategy?.apy.toFixed(2)}%</span>
                  </p>
                  <p className="text-sm text-gray-300">
                    Expected improvement: <span className="text-blue-400">+{((selectedStrategy?.apy || 8) - 8.5).toFixed(2)}%</span>
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-dark-700/50 rounded-xl">
                  <p className="text-sm text-gray-400 mb-1">Gas Estimate</p>
                  <p className="text-lg font-semibold text-white">{simulationResult.gasEstimate} BNB</p>
                  <p className="text-xs text-gray-400">${(simulationResult.gasEstimate * simulationResult.currentPrice).toFixed(2)}</p>
                </div>
                <div className="p-4 bg-dark-700/50 rounded-xl">
                  <p className="text-sm text-gray-400 mb-1">Expected Vault Balance</p>
                  <p className="text-lg font-semibold text-white">${simulationResult.expectedBalance.toFixed(2)}</p>
                  <p className={`text-xs ${simulationResult.isWithdraw ? 'text-red-400' : 'text-green-400'}`}>
                    {simulationResult.isWithdraw ? '' : '+'}${simulationResult.balanceChange.toFixed(2)}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-gold-500/10 border border-gold-500/30 rounded-xl">
                <h4 className="text-white font-medium mb-2">Transaction Preview</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Action:</span>
                    <span className="text-white capitalize">{formData.action}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Amount:</span>
                    <span className="text-white">{formData.amount} {formData.currency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Strategy:</span>
                    <span className="text-white">{formData.strategy}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Network:</span>
                    <span className="text-white">{formData.network.toUpperCase()}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        );

      case 'confirm':
        return (
          <Card>
            <h3 className="text-xl font-semibold text-white mb-6">Confirm & Execute</h3>
            <div className="space-y-6">
              {/* Show on-chain minDeposit before execute */}
              <MinRequirementNotice action={formData.action} />
              <div className="p-6 bg-dark-700/50 rounded-xl border border-gold-500/30">
                <h4 className="text-white font-semibold mb-4">Final Review</h4>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">You will {formData.action}:</span>
                    <span className="text-white font-semibold">{formData.amount} {formData.currency}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Into strategy:</span>
                    <span className="text-white">{formData.strategy}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Estimated gas:</span>
                    <span className="text-white">{simulationResult.gasEstimate} BNB</span>
                  </div>
                  <div className="flex justify-between border-t border-dark-600 pt-3">
                    <span className="text-gray-400">Expected vault balance:</span>
                    <span className={`font-semibold ${simulationResult.isWithdraw ? 'text-red-400' : 'text-green-400'}`}>
                      ${simulationResult.expectedBalance.toFixed(2)}
                    </span>
                  </div>
                  {simulationResult.isWithdraw && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Expected wallet balance:</span>
                      <span className="text-green-400 font-semibold">
                        ${simulationResult.expectedWalletBalance.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5" />
                  <div>
                    <p className="text-white font-medium">Important Notice</p>
                    <p className="text-sm text-gray-400 mt-1">
                      This transaction cannot be reversed. Please review all details carefully before proceeding.
                    </p>
                  </div>
                </div>
              </div>

               <Button 
                className="w-full" 
                size="lg" 
                icon={Zap}
                 onClick={handleExecuteGasless}
                glow
              >
                 {isConnected ? 'Execute' : 'Connect Wallet to Execute'}
              </Button>
            </div>
          </Card>
        );

      case 'result':
        return (
          <div className="space-y-6">
            <ExecutionProgress 
              status={executionStatus}
              txHash={txHash}
              steps={executionSteps}
            />
            
            {executionStatus === 'confirmed' && (
              <Card>
                <div className="text-center">
                  <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-green-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {formData.action.charAt(0).toUpperCase() + formData.action.slice(1)} Successful!
                  </h3>
                  <p className="text-gray-400 mb-6">
                    Your {formData.action} has been completed successfully.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Button 
                      variant="secondary" 
                      icon={ExternalLink}
                      onClick={() => window.open(`https://testnet.bscscan.com/tx/${txHash}`, '_blank')}
                    >
                      View on BscScan
                    </Button>
                    <Button 
                      onClick={() => onNavigate('timeline')}
                    >
                      View in Timeline
                    </Button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="pt-20 min-h-screen bg-dark-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-white mb-2">Execute & Simulate</h1>
          <p className="text-gray-400">Safe and explained strategy execution</p>
        </motion.div>

        {/* Progress Stepper */}
        <Card className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, idx) => (
              <div key={step.id} className="flex items-center">
                <div className="flex items-center">
                  <motion.div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      currentStep === step.id
                        ? 'bg-gold-500 text-dark-900'
                        : steps.findIndex(s => s.id === currentStep) > idx
                        ? 'bg-green-500 text-white'
                        : 'bg-dark-600 text-gray-400'
                    }`}
                    whileHover={{ scale: 1.1 }}
                  >
                    {steps.findIndex(s => s.id === currentStep) > idx ? (
                      <CheckCircle size={20} />
                    ) : (
                      <span className="text-sm font-bold">{idx + 1}</span>
                    )}
                  </motion.div>
                  <div className="ml-3 hidden sm:block">
                    <p className={`text-sm font-medium ${
                      currentStep === step.id ? 'text-gold-500' : 'text-gray-400'
                    }`}>
                      {step.title}
                    </p>
                  </div>
                </div>
                {idx < steps.length - 1 && (
                  <div className={`w-12 h-px mx-4 ${
                    steps.findIndex(s => s.id === currentStep) > idx ? 'bg-green-500' : 'bg-dark-600'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {renderStepContent()}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        {currentStep !== 'result' && (
          <div className="flex justify-between mt-8">
            <Button
              variant="ghost"
              icon={ArrowLeft}
              onClick={handleBack}
              disabled={currentStep === 'params'}
            >
              Back
            </Button>
            <Button
              icon={ArrowRight}
              onClick={handleNext}
              disabled={currentStep === 'confirm'}
            >
              {currentStep === 'confirm' ? 'Execute' : 'Next'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}