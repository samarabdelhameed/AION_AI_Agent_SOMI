import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useVault } from '../hooks/useVault';
import { useWallet } from '../hooks/useWallet';
import { LoadingSpinner } from '../components/ui/LoadingStates';

interface VaultPageProps {}

const VaultPage: React.FC<VaultPageProps> = () => {
  const { address, isConnected } = useWallet();
  const {
    vaultData,
    adapters,
    isLoading,
    error,
    deposit,
    withdraw,
    withdrawShares,
    claimYield,
    emergencyWithdraw,
    calculateShares,
    calculateAssets,
    refreshData
  } = useVault(address);

  const [depositAmount, setDepositAmount] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawShares, setWithdrawShares] = useState('');
  const [calculatedShares, setCalculatedShares] = useState('0');
  const [calculatedAssets, setCalculatedAssets] = useState('0');
  const [isTransacting, setIsTransacting] = useState(false);
  const [txHash, setTxHash] = useState('');

  // Calculate shares when deposit amount changes
  useEffect(() => {
    if (depositAmount && parseFloat(depositAmount) > 0) {
      calculateShares(depositAmount).then(setCalculatedShares);
    } else {
      setCalculatedShares('0');
    }
  }, [depositAmount, calculateShares]);

  // Calculate assets when withdraw shares changes
  useEffect(() => {
    if (withdrawShares && parseFloat(withdrawShares) > 0) {
      calculateAssets(withdrawShares).then(setCalculatedAssets);
    } else {
      setCalculatedAssets('0');
    }
  }, [withdrawShares, calculateAssets]);

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) return;

    try {
      setIsTransacting(true);
      setTxHash('');
      
      console.log('🚀 Starting deposit transaction...');
      const result = await deposit(depositAmount);
      
      if (result.success) {
        setTxHash(result.hash);
        setDepositAmount('');
        console.log('✅ Deposit completed successfully!');
        
        // Wait for blockchain confirmation and refresh data
        console.log('🔄 Waiting for blockchain confirmation...');
        setTimeout(async () => {
          try {
            await refreshData();
            console.log('✅ Vault data refreshed after deposit');
          } catch (error) {
            console.error('❌ Error refreshing data after deposit:', error);
          }
        }, 3000); // Wait 3 seconds for blockchain to settle
        
      } else {
        console.error('❌ Deposit failed:', result.error);
      }
    } catch (error) {
      console.error('❌ Deposit error:', error);
    } finally {
      setIsTransacting(false);
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) return;

    try {
      setIsTransacting(true);
      setTxHash('');
      
      console.log('🚀 Starting withdraw transaction...');
      const result = await withdraw(withdrawAmount);
      
      if (result.success) {
        setTxHash(result.hash);
        setWithdrawAmount('');
        console.log('✅ Withdraw completed successfully!');
      } else {
        console.error('❌ Withdraw failed:', result.error);
      }
    } catch (error) {
      console.error('❌ Withdraw error:', error);
    } finally {
      setIsTransacting(false);
    }
  };

  const handleWithdrawShares = async () => {
    if (!withdrawShares || parseFloat(withdrawShares) <= 0) return;

    try {
      setIsTransacting(true);
      setTxHash('');
      
      console.log('🚀 Starting withdraw shares transaction...');
      const result = await withdrawShares(withdrawShares);
      
      if (result.success) {
        setTxHash(result.hash);
        setWithdrawShares('');
        console.log('✅ Withdraw shares completed successfully!');
      } else {
        console.error('❌ Withdraw shares failed:', result.error);
      }
    } catch (error) {
      console.error('❌ Withdraw shares error:', error);
    } finally {
      setIsTransacting(false);
    }
  };

  const handleClaimYield = async () => {
    try {
      setIsTransacting(true);
      setTxHash('');
      
      console.log('🚀 Starting claim yield transaction...');
      const result = await claimYield();
      
      if (result.success) {
        setTxHash(result.hash);
        console.log('✅ Claim yield completed successfully!');
      } else {
        console.error('❌ Claim yield failed:', result.error);
      }
    } catch (error) {
      console.error('❌ Claim yield error:', error);
    } finally {
      setIsTransacting(false);
    }
  };

  const handleEmergencyWithdraw = async () => {
    if (!window.confirm('⚠️ Are you sure you want to perform an EMERGENCY withdrawal? This action cannot be undone.')) {
      return;
    }

    try {
      setIsTransacting(true);
      setTxHash('');
      
      console.log('🚨 Starting EMERGENCY withdraw transaction...');
      const result = await emergencyWithdraw();
      
      if (result.success) {
        setTxHash(result.hash);
        console.log('✅ Emergency withdraw completed successfully!');
      } else {
        console.error('❌ Emergency withdraw failed:', result.error);
      }
    } catch (error) {
      console.error('❌ Emergency withdraw error:', error);
    } finally {
      setIsTransacting(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">AION Vault</h1>
          <p className="text-gray-300 mb-8">Please connect your wallet to access the vault</p>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold">
            Connect Wallet
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="xl" className="mx-auto mb-4" />
          <h3 className="text-white text-xl font-semibold mb-2">Loading Vault Data</h3>
          <p className="text-gray-300">Fetching real-time data from blockchain...</p>
          <div className="mt-4 space-y-2">
            <div className="text-sm text-gray-400">• Connecting to BSC network</div>
            <div className="text-sm text-gray-400">• Reading vault contracts</div>
            <div className="text-sm text-gray-400">• Calculating yields</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-4">AION Vault</h1>
          <p className="text-gray-300 text-lg">AI-Powered DeFi Vault with Real-Time Data</p>
          {address && (
            <p className="text-blue-300 mt-2">Connected: {address.slice(0, 6)}...{address.slice(-4)}</p>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6">
            <p className="text-red-300">❌ Error: {error}</p>
          </div>
        )}

        {/* Transaction Hash Display */}
        {txHash && (
          <div className="bg-green-500/20 border border-green-500 rounded-lg p-4 mb-6">
            <p className="text-green-300">✅ Transaction successful!</p>
            <p className="text-green-200 text-sm mt-1">Hash: {txHash}</p>
          </div>
        )}

        {/* Real Vault Data Display */}
        {vaultData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <h3 className="text-white text-lg font-semibold mb-2">Your Balance</h3>
              <p className="text-3xl font-bold text-blue-300">
                {ethers.utils.formatEther(vaultData.balance)} BNB
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <h3 className="text-white text-lg font-semibold mb-2">Your Shares</h3>
              <p className="text-3xl font-bold text-green-300">
                {ethers.utils.formatEther(vaultData.shares)}
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <h3 className="text-white text-lg font-semibold mb-2">Principal</h3>
              <p className="text-3xl font-bold text-yellow-300">
                {ethers.utils.formatEther(vaultData.principal)} BNB
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <h3 className="text-white text-lg font-semibold mb-2">Total Assets</h3>
              <p className="text-3xl font-bold text-purple-300">
                {ethers.utils.formatEther(vaultData.totalAssets)} BNB
              </p>
            </div>
          </div>
        )}

        {/* Vault Operations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Deposit Section */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h3 className="text-white text-xl font-semibold mb-4">💰 Deposit BNB</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Amount (BNB)
                </label>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  placeholder="0.0"
                  className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
              </div>
              
              {calculatedShares !== '0' && (
                <div className="bg-blue-500/20 rounded-lg p-3">
                  <p className="text-blue-300 text-sm">
                    You will receive: <span className="font-semibold">{calculatedShares} shares</span>
                  </p>
                </div>
              )}
              
              <button
                onClick={handleDeposit}
                disabled={!depositAmount || parseFloat(depositAmount) <= 0 || isTransacting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition-colors"
              >
                {isTransacting ? 'Processing...' : 'Deposit'}
              </button>
            </div>
          </div>

          {/* Withdraw Section */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h3 className="text-white text-xl font-semibold mb-4">💸 Withdraw</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Amount (BNB)
                </label>
                <input
                  type="number"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder="0.0"
                  className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-red-500"
                />
              </div>
              
              <button
                onClick={handleWithdraw}
                disabled={!withdrawAmount || parseFloat(withdrawAmount) <= 0 || isTransacting}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition-colors"
              >
                {isTransacting ? 'Processing...' : 'Withdraw'}
              </button>
            </div>
          </div>
        </div>

        {/* Advanced Operations */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Withdraw Shares */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h3 className="text-white text-lg font-semibold mb-4">📊 Withdraw by Shares</h3>
            <div className="space-y-4">
              <input
                type="number"
                value={withdrawShares}
                onChange={(e) => setWithdrawShares(e.target.value)}
                placeholder="Shares amount"
                className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-yellow-500"
              />
              
              {calculatedAssets !== '0' && (
                <div className="bg-yellow-500/20 rounded-lg p-3">
                  <p className="text-yellow-300 text-sm">
                    You will receive: <span className="font-semibold">{calculatedAssets} BNB</span>
                  </p>
                </div>
              )}
              
              <button
                onClick={handleWithdrawShares}
                disabled={!withdrawShares || parseFloat(withdrawShares) <= 0 || isTransacting}
                className="w-full bg-yellow-600 hover:bg-yellow-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition-colors"
              >
                {isTransacting ? 'Processing...' : 'Withdraw Shares'}
              </button>
            </div>
          </div>

          {/* Claim Yield */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h3 className="text-white text-lg font-semibold mb-4">🎯 Claim Yield</h3>
            <div className="space-y-4">
              {vaultData && (
                <div className="bg-green-500/20 rounded-lg p-3">
                  <p className="text-green-300 text-sm">
                    Yield Claimed: <span className="font-semibold">
                      {ethers.utils.formatEther(vaultData.userYieldClaimed)} BNB
                    </span>
                  </p>
                </div>
              )}
              
              <button
                onClick={handleClaimYield}
                disabled={isTransacting}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition-colors"
              >
                {isTransacting ? 'Processing...' : 'Claim Yield'}
              </button>
            </div>
          </div>

          {/* Emergency Withdraw */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-red-500/50">
            <h3 className="text-red-300 text-lg font-semibold mb-4">🚨 Emergency</h3>
            <div className="space-y-4">
              <p className="text-red-200 text-sm">
                Emergency withdrawal will withdraw all your funds immediately. Use only in emergencies.
              </p>
              
              <button
                onClick={handleEmergencyWithdraw}
                disabled={isTransacting}
                className="w-full bg-red-700 hover:bg-red-800 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition-colors"
              >
                {isTransacting ? 'Processing...' : 'Emergency Withdraw'}
              </button>
            </div>
          </div>
        </div>

        {/* Current Strategy Info */}
        {vaultData && vaultData.currentAdapter !== ethers.constants.AddressZero && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 mb-8">
            <h3 className="text-white text-xl font-semibold mb-4">🎯 Current Strategy</h3>
            <p className="text-gray-300">
              Active Adapter: <span className="text-blue-300 font-mono">{vaultData.currentAdapter}</span>
            </p>
          </div>
        )}

        {/* Available Adapters */}
        {adapters.length > 0 && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h3 className="text-white text-xl font-semibold mb-4">📋 Available Strategies</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {adapters.map((adapter, index) => (
                <div key={index} className="bg-white/5 rounded-lg p-4 border border-white/10">
                  <h4 className="text-white font-semibold mb-2">{adapter.name}</h4>
                  <p className="text-gray-300 text-sm mb-2">
                    Risk Level: <span className="text-yellow-300">{adapter.riskLevel}/10</span>
                  </p>
                  <p className="text-gray-300 text-sm mb-2">
                    Status: <span className={adapter.active ? 'text-green-300' : 'text-red-300'}>
                      {adapter.active ? 'Active' : 'Inactive'}
                    </span>
                  </p>
                  <p className="text-gray-300 text-sm">
                    Total Deposited: {ethers.utils.formatEther(adapter.totalDeposited)} BNB
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Refresh Button */}
        <div className="text-center mt-8">
          <button
            onClick={refreshData}
            disabled={isTransacting}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            🔄 Refresh Data
          </button>
        </div>
      </div>
    </div>
  );
};

export default VaultPage;