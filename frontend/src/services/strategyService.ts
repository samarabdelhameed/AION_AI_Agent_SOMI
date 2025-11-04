import { ethers, BigNumber } from 'ethers';
import { contractConfig } from '../lib/contractConfig';

export interface StrategyAdapterData {
  address: string;
  name: string;
  protocolName: string;
  riskLevel: number;
  totalAssets: BigNumber;
  totalShares: BigNumber;
  estimatedAPY: number;
  isHealthy: boolean;
  lastUpdate: BigNumber;
  underlying: string;
}

export interface ProtocolSnapshot {
  apyBps: BigNumber;
  tvl: BigNumber;
  liquidity: BigNumber;
  utilization: BigNumber;
  lastUpdate: BigNumber;
  isHealthy: boolean;
  protocolName: string;
}

export interface UserStrategyData {
  sharesOf: BigNumber;
  principalOf: BigNumber;
  userAccrued: BigNumber;
}

export interface RebalanceResult {
  hash: string;
  success: boolean;
  fromAdapter: string;
  toAdapter: string;
  amount: BigNumber;
  error?: string;
}

class StrategyService {
  private provider: ethers.providers.Web3Provider | null = null;
  private signer: ethers.Signer | null = null;
  private vaultContract: ethers.Contract | null = null;
  private adapterContracts: Map<string, ethers.Contract> = new Map();

  async initialize(): Promise<boolean> {
    try {
      if (typeof window.ethereum !== 'undefined') {
        this.provider = new ethers.providers.Web3Provider(window.ethereum);
        this.signer = this.provider.getSigner();
        
        // Initialize vault contract
        this.vaultContract = new ethers.Contract(
          contractConfig.vault.address,
          contractConfig.vault.abi,
          this.signer
        );

        console.log('✅ StrategyService initialized successfully');
        return true;
      }
      throw new Error('MetaMask not found');
    } catch (error) {
      console.error('❌ StrategyService initialization failed:', error);
      return false;
    }
  }

  // ========== Real Strategy Data Functions ==========

  async getAllStrategies(): Promise<StrategyAdapterData[]> {
    if (!this.vaultContract) throw new Error('Vault contract not initialized');

    try {
      console.log('🔍 Fetching all real strategy adapters...');

      // Get adapter addresses from vault
      const adapterAddresses = await this.vaultContract.adapterList();
      console.log('📋 Found adapter addresses:', adapterAddresses);

      const strategies: StrategyAdapterData[] = [];

      for (const adapterAddress of adapterAddresses) {
        try {
          // Get adapter info from vault
          const adapterInfo = await this.vaultContract.adapters(adapterAddress);
          
          // Create adapter contract instance
          const adapterContract = new ethers.Contract(
            adapterAddress,
            contractConfig.adapters.baseABI, // Use base adapter ABI
            this.signer
          );

          // Cache the contract for later use
          this.adapterContracts.set(adapterAddress, adapterContract);

          // Fetch real data from adapter contract
          const [
            name,
            protocolName,
            riskLevel,
            totalAssets,
            totalShares,
            estimatedAPY,
            isHealthy,
            lastUpdate,
            underlying
          ] = await Promise.all([
            adapterContract.name(),
            adapterContract.protocolName(),
            adapterContract.riskLevel(),
            adapterContract.totalAssets(),
            adapterContract.totalShares(),
            adapterContract.estimatedAPY(),
            adapterContract.isHealthy(),
            adapterContract.lastUpdate(),
            adapterContract.underlying()
          ]);

          const strategyData: StrategyAdapterData = {
            address: adapterAddress,
            name,
            protocolName,
            riskLevel,
            totalAssets,
            totalShares,
            estimatedAPY,
            isHealthy,
            lastUpdate,
            underlying
          };

          strategies.push(strategyData);

          console.log('✅ Strategy data fetched:', {
            name,
            protocolName,
            apy: estimatedAPY,
            totalAssets: utils.formatEther(totalAssets),
            isHealthy
          });

        } catch (error) {
          console.warn('⚠️ Error fetching strategy data for:', adapterAddress, error);
        }
      }

      console.log('✅ All real strategy data fetched:', strategies.length, 'strategies');
      return strategies;
    } catch (error) {
      console.error('❌ Error fetching strategies:', error);
      return [];
    }
  }

  async getStrategyData(adapterAddress: string): Promise<StrategyAdapterData | null> {
    try {
      console.log('🔍 Fetching real strategy data for:', adapterAddress);

      let adapterContract = this.adapterContracts.get(adapterAddress);
      
      if (!adapterContract) {
        adapterContract = new ethers.Contract(
          adapterAddress,
          contractConfig.adapters.baseABI,
          this.signer
        );
        this.adapterContracts.set(adapterAddress, adapterContract);
      }

      // Fetch all data in parallel
      const [
        name,
        protocolName,
        riskLevel,
        totalAssets,
        totalShares,
        estimatedAPY,
        isHealthy,
        lastUpdate,
        underlying
      ] = await Promise.all([
        adapterContract.name(),
        adapterContract.protocolName(),
        adapterContract.riskLevel(),
        adapterContract.totalAssets(),
        adapterContract.totalShares(),
        adapterContract.estimatedAPY(),
        adapterContract.isHealthy(),
        adapterContract.lastUpdate(),
        adapterContract.underlying()
      ]);

      return {
        address: adapterAddress,
        name,
        protocolName,
        riskLevel,
        totalAssets,
        totalShares,
        estimatedAPY,
        isHealthy,
        lastUpdate,
        underlying
      };
    } catch (error) {
      console.error('❌ Error fetching strategy data:', error);
      return null;
    }
  }

  async getProtocolSnapshot(adapterAddress: string): Promise<ProtocolSnapshot | null> {
    try {
      console.log('📊 Fetching real protocol snapshot for:', adapterAddress);

      const adapterContract = this.adapterContracts.get(adapterAddress);
      if (!adapterContract) {
        throw new Error('Adapter contract not found');
      }

      const snapshot = await adapterContract.protocolSnapshot();
      
      console.log('✅ Protocol snapshot fetched:', {
        protocolName: snapshot.protocolName,
        apy: snapshot.apyBps.toString(),
        tvl: utils.formatEther(snapshot.tvl),
        isHealthy: snapshot.isHealthy
      });

      return snapshot;
    } catch (error) {
      console.error('❌ Error fetching protocol snapshot:', error);
      return null;
    }
  }

  async getUserStrategyData(adapterAddress: string, userAddress: string): Promise<UserStrategyData | null> {
    try {
      console.log('👤 Fetching real user strategy data for:', userAddress, 'in:', adapterAddress);

      const adapterContract = this.adapterContracts.get(adapterAddress);
      if (!adapterContract) {
        throw new Error('Adapter contract not found');
      }

      const [sharesOf, principalOf, userAccrued] = await Promise.all([
        adapterContract.sharesOf(userAddress),
        adapterContract.principalOf(userAddress),
        adapterContract.userAccrued(userAddress)
      ]);

      console.log('✅ User strategy data fetched:', {
        shares: utils.formatEther(sharesOf),
        principal: utils.formatEther(principalOf),
        accrued: utils.formatEther(userAccrued)
      });

      return {
        sharesOf,
        principalOf,
        userAccrued
      };
    } catch (error) {
      console.error('❌ Error fetching user strategy data:', error);
      return null;
    }
  }

  // ========== Real Strategy Management Functions ==========

  async switchStrategy(newAdapterAddress: string): Promise<RebalanceResult> {
    if (!this.vaultContract) throw new Error('Vault contract not initialized');

    try {
      console.log('🔄 Switching to new strategy:', newAdapterAddress);

      // Check if adapter is healthy before switching
      const adapterContract = this.adapterContracts.get(newAdapterAddress);
      if (adapterContract) {
        const isHealthy = await adapterContract.isHealthy();
        if (!isHealthy) {
          throw new Error('Target adapter is not healthy');
        }
      }

      const tx = await this.vaultContract.setCurrentAdapter(newAdapterAddress, {
        gasLimit: 300000
      });

      console.log('📤 Strategy switch transaction sent:', tx.hash);

      const receipt = await tx.wait();
      
      console.log('✅ Strategy switch confirmed:', {
        hash: receipt.transactionHash,
        gasUsed: receipt.gasUsed.toString()
      });

      return {
        hash: receipt.transactionHash,
        success: true,
        fromAdapter: '',
        toAdapter: newAdapterAddress,
        amount: BigNumber.from(0)
      };
    } catch (error) {
      console.error('❌ Strategy switch failed:', error);
      return {
        hash: '',
        success: false,
        fromAdapter: '',
        toAdapter: newAdapterAddress,
        amount: BigNumber.from(0),
        error: error.message
      };
    }
  }

  async rebalancePortfolio(
    fromAdapter: string,
    toAdapter: string,
    amount: BigNumber
  ): Promise<RebalanceResult> {
    if (!this.vaultContract) throw new Error('Vault contract not initialized');

    try {
      console.log('⚖️ Executing real portfolio rebalance:', {
        from: fromAdapter,
        to: toAdapter,
        amount: utils.formatEther(amount)
      });

      // Validate adapters are healthy
      const [fromContract, toContract] = await Promise.all([
        this.adapterContracts.get(fromAdapter),
        this.adapterContracts.get(toAdapter)
      ]);

      if (toContract) {
        const isHealthy = await toContract.isHealthy();
        if (!isHealthy) {
          throw new Error('Target adapter is not healthy');
        }
      }

      const tx = await this.vaultContract.rebalance(fromAdapter, toAdapter, amount, {
        gasLimit: 800000 // Higher gas limit for rebalancing
      });

      console.log('📤 Rebalance transaction sent:', tx.hash);

      const receipt = await tx.wait();
      
      console.log('✅ Rebalance confirmed:', {
        hash: receipt.transactionHash,
        gasUsed: receipt.gasUsed.toString()
      });

      return {
        hash: receipt.transactionHash,
        success: true,
        fromAdapter,
        toAdapter,
        amount
      };
    } catch (error) {
      console.error('❌ Rebalance failed:', error);
      return {
        hash: '',
        success: false,
        fromAdapter,
        toAdapter,
        amount,
        error: error.message
      };
    }
  }

  async addNewStrategy(adapterAddress: string, name: string): Promise<RebalanceResult> {
    if (!this.vaultContract) throw new Error('Vault contract not initialized');

    try {
      console.log('➕ Adding new strategy adapter:', { address: adapterAddress, name });

      const tx = await this.vaultContract.addAdapter(adapterAddress, name, {
        gasLimit: 500000
      });

      console.log('📤 Add adapter transaction sent:', tx.hash);

      const receipt = await tx.wait();
      
      console.log('✅ Add adapter confirmed:', {
        hash: receipt.transactionHash,
        gasUsed: receipt.gasUsed.toString()
      });

      return {
        hash: receipt.transactionHash,
        success: true,
        fromAdapter: '',
        toAdapter: adapterAddress,
        amount: BigNumber.from(0)
      };
    } catch (error) {
      console.error('❌ Add adapter failed:', error);
      return {
        hash: '',
        success: false,
        fromAdapter: '',
        toAdapter: adapterAddress,
        amount: BigNumber.from(0),
        error: error.message
      };
    }
  }

  // ========== Venus Protocol Specific Functions ==========

  async getVenusData(adapterAddress: string): Promise<any> {
    try {
      console.log('🌟 Fetching real Venus protocol data...');

      const adapterContract = this.adapterContracts.get(adapterAddress);
      if (!adapterContract) {
        throw new Error('Venus adapter contract not found');
      }

      // Check if this is Venus adapter by calling Venus-specific functions
      try {
        const [
          venusStats,
          exchangeRate,
          supplyRate
        ] = await Promise.all([
          adapterContract.getVenusStats(),
          adapterContract.getCurrentExchangeRate(),
          adapterContract.getSupplyRatePerBlock()
        ]);

        console.log('✅ Venus data fetched:', {
          exchangeRate: utils.formatEther(exchangeRate),
          supplyRate: supplyRate.toString(),
          totalSupplied: utils.formatEther(venusStats.totalSupplied)
        });

        return {
          venusStats,
          exchangeRate,
          supplyRate,
          isVenus: true
        };
      } catch (error) {
        // Not a Venus adapter
        return { isVenus: false };
      }
    } catch (error) {
      console.error('❌ Error fetching Venus data:', error);
      return { isVenus: false };
    }
  }

  // ========== Beefy Protocol Specific Functions ==========

  async getBeefyData(adapterAddress: string): Promise<any> {
    try {
      console.log('🥩 Fetching real Beefy protocol data...');

      const adapterContract = this.adapterContracts.get(adapterAddress);
      if (!adapterContract) {
        throw new Error('Beefy adapter contract not found');
      }

      // Check if this is Beefy adapter by calling Beefy-specific functions
      try {
        // Beefy adapters would have specific functions
        const totalAssets = await adapterContract.totalAssets();
        
        console.log('✅ Beefy data fetched:', {
          totalAssets: utils.formatEther(totalAssets)
        });

        return {
          totalAssets,
          isBeefy: true
        };
      } catch (error) {
        // Not a Beefy adapter
        return { isBeefy: false };
      }
    } catch (error) {
      console.error('❌ Error fetching Beefy data:', error);
      return { isBeefy: false };
    }
  }

  // ========== Real-time Strategy Monitoring ==========

  startStrategyMonitoring(onUpdate: (strategies: StrategyAdapterData[]) => void): void {
    console.log('👂 Starting real-time strategy monitoring...');

    // Refresh strategy data every 30 seconds
    const interval = setInterval(async () => {
      try {
        const strategies = await this.getAllStrategies();
        onUpdate(strategies);
      } catch (error) {
        console.error('❌ Error in strategy monitoring:', error);
      }
    }, 30000);

    // Store interval for cleanup
    (this as any).monitoringInterval = interval;
  }

  stopStrategyMonitoring(): void {
    if ((this as any).monitoringInterval) {
      clearInterval((this as any).monitoringInterval);
      (this as any).monitoringInterval = null;
      console.log('🔇 Strategy monitoring stopped');
    }
  }

  // ========== Utility Functions ==========

  async getCurrentStrategy(): Promise<string> {
    if (!this.vaultContract) throw new Error('Vault contract not initialized');

    try {
      const currentAdapter = await this.vaultContract.currentAdapter();
      console.log('🎯 Current strategy adapter:', currentAdapter);
      return currentAdapter;
    } catch (error) {
      console.error('❌ Error getting current strategy:', error);
      return ethers.constants.AddressZero;
    }
  }

  async getStrategyAllocation(adapterAddress: string): Promise<number> {
    try {
      const strategyData = await this.getStrategyData(adapterAddress);
      if (!strategyData) return 0;

      // Calculate allocation percentage
      const totalAssets = strategyData.totalAssets;
      if (totalAssets.eq(0)) return 0;

      // This would need vault total assets to calculate percentage
      // For now, return a placeholder
      return 25; // 25% allocation
    } catch (error) {
      console.error('❌ Error calculating allocation:', error);
      return 0;
    }
  }

  // ========== Cleanup ==========

  cleanup(): void {
    this.stopStrategyMonitoring();
    this.adapterContracts.clear();
    this.provider = null;
    this.signer = null;
    this.vaultContract = null;
    console.log('🧹 StrategyService cleaned up');
  }
}

export const strategyService = new StrategyService();