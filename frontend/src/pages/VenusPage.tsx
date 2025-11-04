import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useVenus } from '../hooks/useVenus';
import { useWallet } from '../hooks/useWallet';
import { LoadingSpinner } from '../components/ui/LoadingStates';

const VenusPage: React.FC = () => {
  const { address, isConnected } = useWallet();
  const {
    venusStats,
    userPosition,
    healthData,
    isLoading,
    error,
    supplyBNB,
    redeemBNB,
    refreshData,
    getUserYield,
    getTotalYield,
    getExchangeRate,
    getSupplyRate,
    getAnalytics,
    getMarketData,
    startMonitoring,
    stopMonitoring
  } = useVenus(address);

  const [supplyAmount, setSupplyAmount] = useState('');
  const [redeemShares, setRedeemShares] = useState('');
  const [isTransacting, setIsTransacting] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [analytics, setAnalytics] = useState<any>(null);
  const [marketData, setMarketData] = useState<any>(null);
  const [realTimeData, setRealTimeData] = useState({
    userYield: '0',
    totalYield: '0',
    exchangeRate: '0',
    supplyRate: '0'
  });

  // Fetch additional data on mount
  useEffect(() => {
    if (isConnected && address) {
      fetchAdditionalData();
      startMonitoring();
    }

    return () => {
      stopMonitoring();
    };
  }, [isConnected, address]);

  // Fetch real-time data periodically
  useEffect(() => {
    if (isConnected && address) {
      const interval = setInterval(fetchRealTimeData, 15000); // Every 15 seconds
      return () => clearInterval(interval);
    }
  }, [isConnected, address]);

  const fetchAdditionalData = async () => {
    try {
      const [analyticsData, marketDataResult] = await Promise.all([
        getAnalytics(),
        getMarketData()
      ]);
      
      setAnalytics(analyticsData);
      setMarketData(marketDataResult);
    } catch (error) {
      console.error('Error fetching additional data:', error);
    }
  };

  const fetchRealTimeData = async () => {
    try {
      const [userYield, totalYield, exchangeRate, supplyRate] = await Promise.all([
        getUserYield(),
        getTotalYield(),
        getExchangeRate(),
        getSupplyRate()
      ]);

      setRealTimeData({
        userYield,
        totalYield,
        exchangeRate,
        supplyRate
      });
    } catch (error) {
      console.error('Error fetching real-time data:', error);
    }
  };

  const handleSupply = async () => {
    if (!supplyAmount || parseFloat(supplyAmount) <= 0) return;

    try {
      setIsTransacting(true);
      setTxHash('');
      
      console.log('🚀 Starting Venus supply transaction...');
      const result = await supplyBNB(supplyAmount);
      
      if (result.success) {
        setTxHash(result.hash);
        setSupplyAmount('');
        await fetchRealTimeData();
        console.log('✅ Venus supply completed successfully!');
      } else {
        console.error('❌ Venus supply failed:', result.error);
      }
    } catch (error) {
      console.error('❌ Venus supply error:', error);
    } finally {
      setIsTransacting(false);
    }
  };

  const handleRedeem = async () => {
    if (!redeemShares || parseFloat(redeemShares) <= 0) return;

    try {
      setIsTransacting(true);
      setTxHash('');
      
      console.log('🚀 Starting Venus redeem transaction...');
      const result = await redeemBNB(redeemShares);
      
      if (result.success) {
        setTxHash(result.hash);
        setRedeemShares('');
        await fetchRealTimeData();
        console.log('✅ Venus redeem completed successfully!');
      } else {
        console.error('❌ Venus redeem failed:', result.error);
      }
    } catch (error) {
      console.error('❌ Venus redeem error:', error);
    } finally {
      setIsTransacting(false);
    }
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-4">Venus Protocol Integration</h1>
          <p className="text-gray-300 mb-8">Please connect your wallet to access Venus Protocol</p>
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
          <h3 className="text-white text-xl font-semibold mb-2">Loading Venus Protocol</h3>
          <p className="text-gray-300">Fetching live APY, exchange rates, and user positions</p>
          <div className="mt-4 space-y-2">
            <div className="text-sm text-gray-400">• Connecting to Venus Protocol</div>
            <div className="text-sm text-gray-400">• Reading market data</div>
            <div className="text-sm text-gray-400">• Calculating user positions</div>
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
          <h1 className="text-5xl font-bold text-white mb-4">🌟 Venus Protocol</h1>
          <p className="text-gray-300 text-lg">Real-time BNB lending with live blockchain data</p>
          {address && (
            <p className="text-blue-300 mt-2">Connected: {address.slice(0, 6)}...{address.slice(-4)}</p>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6">
            <p className="text-red-300">❌ Error: {error}</p>
            <button 
              onClick={refreshData}
              className="mt-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm"
            >
              Retry
            </button>
          </div>
        )}

        {/* Transaction Hash Display */}
        {txHash && (
          <div className="bg-green-500/20 border border-green-500 rounded-lg p-4 mb-6">
            <p className="text-green-300">✅ Transaction successful!</p>
            <p className="text-green-200 text-sm mt-1">Hash: {txHash}</p>
            <a 
              href={`https://testnet.bscscan.com/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-300 hover:text-blue-200 text-sm underline"
            >
              View on BSCScan
            </a>
          </div>
        )}

        {/* Venus Protocol Stats */}
        {venusStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <h3 className="text-white text-lg font-semibold mb-2">Total Supplied</h3>
              <p className="text-3xl font-bold text-blue-300">
                {ethers.utils.formatEther(venusStats.totalSupplied)} BNB
              </p>
              <p className="text-gray-400 text-sm mt-1">
                ${(parseFloat(ethers.utils.formatEther(venusStats.totalSupplied)) * 326.12).toLocaleString()}
              </p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <h3 className="text-white text-lg font-semibold mb-2">Current APY</h3>
              <p className="text-3xl font-bold text-green-300">
                {(venusStats.currentAPY / 100).toFixed(2)}%
              </p>
              <p className="text-gray-400 text-sm mt-1">Live from Venus Protocol</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <h3 className="text-white text-lg font-semibold mb-2">Exchange Rate</h3>
              <p className="text-3xl font-bold text-yellow-300">
                {parseFloat(ethers.utils.formatEther(venusStats.exchangeRate)).toFixed(6)}
              </p>
              <p className="text-gray-400 text-sm mt-1">vBNB to BNB</p>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <h3 className="text-white text-lg font-semibold mb-2">Protocol Health</h3>
              <p className={`text-3xl font-bold ${healthData?.healthy ? 'text-green-300' : 'text-red-300'}`}>
                {healthData?.healthy ? '✅ Healthy' : '⚠️ Warning'}
              </p>
              <p className="text-gray-400 text-sm mt-1">Real-time status</p>
            </div>
          </div>
        )}

        {/* User Position */}
        {userPosition && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 mb-8">
            <h3 className="text-white text-xl font-semibold mb-4">📊 Your Venus Position</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-gray-300 text-sm">vBNB Balance</p>
                <p className="text-xl font-bold text-blue-300">
                  {ethers.utils.formatEther(userPosition.vTokenBalance)}
                </p>
              </div>
              <div>
                <p className="text-gray-300 text-sm">Underlying BNB</p>
                <p className="text-xl font-bold text-white">
                  {ethers.utils.formatEther(userPosition.underlyingBalance)}
                </p>
              </div>
              <div>
                <p className="text-gray-300 text-sm">Principal Deposited</p>
                <p className="text-xl font-bold text-yellow-300">
                  {ethers.utils.formatEther(userPosition.principalAmount)}
                </p>
              </div>
              <div>
                <p className="text-gray-300 text-sm">Yield Accrued</p>
                <p className="text-xl font-bold text-green-300">
                  {ethers.utils.formatEther(userPosition.yieldAccrued)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Real-time Data */}
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-white text-xl font-semibold">🔴 Live Data</h3>
            <button
              onClick={fetchRealTimeData}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm"
            >
              🔄 Refresh
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-gray-300 text-sm">Your Yield</p>
              <p className="text-lg font-bold text-green-300">{realTimeData.userYield} BNB</p>
            </div>
            <div>
              <p className="text-gray-300 text-sm">Total Protocol Yield</p>
              <p className="text-lg font-bold text-blue-300">{realTimeData.totalYield} BNB</p>
            </div>
            <div>
              <p className="text-gray-300 text-sm">Live Exchange Rate</p>
              <p className="text-lg font-bold text-yellow-300">{parseFloat(realTimeData.exchangeRate).toFixed(6)}</p>
            </div>
            <div>
              <p className="text-gray-300 text-sm">Supply Rate/Block</p>
              <p className="text-lg font-bold text-purple-300">{realTimeData.supplyRate}</p>
            </div>
          </div>
        </div>

        {/* Venus Operations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Supply BNB */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h3 className="text-white text-xl font-semibold mb-4">💰 Supply BNB to Venus</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Amount (BNB)
                </label>
                <input
                  type="number"
                  value={supplyAmount}
                  onChange={(e) => setSupplyAmount(e.target.value)}
                  placeholder="0.0"
                  className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                />
              </div>
              
              {supplyAmount && parseFloat(supplyAmount) > 0 && (
                <div className="bg-blue-500/20 rounded-lg p-3">
                  <p className="text-blue-300 text-sm">
                    You will receive vBNB tokens that earn interest automatically
                  </p>
                  <p className="text-blue-200 text-xs mt-1">
                    Current APY: {venusStats ? (venusStats.currentAPY / 100).toFixed(2) : '0'}%
                  </p>
                </div>
              )}
              
              <button
                onClick={handleSupply}
                disabled={!supplyAmount || parseFloat(supplyAmount) <= 0 || isTransacting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition-colors"
              >
                {isTransacting ? 'Processing...' : 'Supply to Venus'}
              </button>
            </div>
          </div>

          {/* Redeem BNB */}
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h3 className="text-white text-xl font-semibold mb-4">💸 Redeem from Venus</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  Shares to Redeem
                </label>
                <input
                  type="number"
                  value={redeemShares}
                  onChange={(e) => setRedeemShares(e.target.value)}
                  placeholder="0.0"
                  className="w-full bg-white/5 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-red-500"
                />
              </div>
              
              {redeemShares && parseFloat(redeemShares) > 0 && userPosition && (
                <div className="bg-red-500/20 rounded-lg p-3">
                  <p className="text-red-300 text-sm">
                    Available to redeem: {ethers.utils.formatEther(userPosition.vTokenBalance)} vBNB
                  </p>
                  <p className="text-red-200 text-xs mt-1">
                    Estimated BNB: {(parseFloat(redeemShares) * parseFloat(realTimeData.exchangeRate)).toFixed(6)}
                  </p>
                </div>
              )}
              
              <button
                onClick={handleRedeem}
                disabled={!redeemShares || parseFloat(redeemShares) <= 0 || isTransacting}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition-colors"
              >
                {isTransacting ? 'Processing...' : 'Redeem from Venus'}
              </button>
            </div>
          </div>
        </div>

        {/* Analytics */}
        {analytics && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 mb-8">
            <h3 className="text-white text-xl font-semibold mb-4">📈 Venus Analytics</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <p className="text-gray-300 text-sm">Total Supplied</p>
                <p className="text-2xl font-bold text-blue-300">
                  {ethers.utils.formatEther(analytics.totalSupplied)} BNB
                </p>
              </div>
              <div>
                <p className="text-gray-300 text-sm">Total Yield Generated</p>
                <p className="text-2xl font-bold text-green-300">
                  {ethers.utils.formatEther(analytics.totalYield)} BNB
                </p>
              </div>
              <div>
                <p className="text-gray-300 text-sm">Average APY</p>
                <p className="text-2xl font-bold text-yellow-300">
                  {analytics.averageAPY.toFixed(2)}%
                </p>
              </div>
              <div>
                <p className="text-gray-300 text-sm">Utilization Rate</p>
                <p className="text-2xl font-bold text-purple-300">
                  {analytics.utilizationRate}%
                </p>
              </div>
              <div>
                <p className="text-gray-300 text-sm">Health Score</p>
                <p className="text-2xl font-bold text-green-300">
                  {analytics.healthScore}/100
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Market Data */}
        {marketData && (
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h3 className="text-white text-xl font-semibold mb-4">🏪 Venus Market Data</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <p className="text-gray-300 text-sm">Market Cap</p>
                <p className="text-xl font-bold text-blue-300">
                  {ethers.utils.formatEther(marketData.marketCap)} BNB
                </p>
              </div>
              <div>
                <p className="text-gray-300 text-sm">Total Borrowed</p>
                <p className="text-xl font-bold text-red-300">
                  {ethers.utils.formatEther(marketData.totalBorrowed)} BNB
                </p>
              </div>
              <div>
                <p className="text-gray-300 text-sm">Available Liquidity</p>
                <p className="text-xl font-bold text-green-300">
                  {ethers.utils.formatEther(marketData.availableLiquidity)} BNB
                </p>
              </div>
              <div>
                <p className="text-gray-300 text-sm">Supply APY</p>
                <p className="text-xl font-bold text-green-300">
                  {marketData.supplyAPY.toFixed(2)}%
                </p>
              </div>
              <div>
                <p className="text-gray-300 text-sm">Borrow APY</p>
                <p className="text-xl font-bold text-red-300">
                  {marketData.borrowAPY.toFixed(2)}%
                </p>
              </div>
              <div>
                <p className="text-gray-300 text-sm">Utilization Rate</p>
                <p className="text-xl font-bold text-yellow-300">
                  {marketData.utilizationRate}%
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VenusPage;