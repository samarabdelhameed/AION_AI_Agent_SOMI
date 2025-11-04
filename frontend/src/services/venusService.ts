import { ethers, BigNumber, utils, BrowserProvider, Contract } from '../utils/ethersCompat';
import { contractConfig } from '../lib/contractConfig';

export interface VenusData {
  vTokenAddress: string;
  comptrollerAddress: string;
  totalSupplied: BigNumber;
  currentAPY: number;
  exchangeRate: BigNumber;
  isMarketListed: boolean;
  supplyRatePerBlock: BigNumber;
  totalBorrows: BigNumber;
  totalReserves: BigNumber;
  reserveFactorMantissa: BigNumber;
  borrowRatePerBlock: BigNumber;
  cash: BigNumber;
}

export interface UserVenusPosition {
  vTokenBalance: BigNumber;
  underlyingBalance: BigNumber;
  principalAmount: BigNumber;
  yieldAccrued: BigNumber;
  borrowBalance: BigNumber;
  accountLiquidity: BigNumber;
}

export interface VenusUserData {
  vBNBBalance: BigNumber;
  underlyingBalance: BigNumber;
  accruedInterest: BigNumber;
  supplyAPY: number;
  exchangeRate: BigNumber;
  lastUpdate: Date;
}

export interface VenusTransaction {
  type: 'mint' | 'redeem' | 'redeemUnderlying';
  amount: BigNumber;
  hash: string;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: Date;
}

class VenusService {
  private provider: any | null = null;
  private signer: any | null = null;
  private venusAdapter: any | null = null;

  async initialize(): Promise<boolean> {
    try {
      if (typeof window !== 'undefined' && window.ethereum) {
        this.provider = new BrowserProvider(window.ethereum);
        this.signer = await this.provider.getSigner();
        
        this.venusAdapter = new Contract(
          contractConfig.adapters.venus.address,
          contractConfig.adapters.venus.abi,
          this.signer
        );

        console.log('✅ VenusService initialized successfully');
        return true;
      }
      console.warn('⚠️ MetaMask not found, using mock data');
      return true; // Return true to allow mock data usage
    } catch (error) {
      console.error('❌ VenusService initialization failed:', error);
      return true; // Return true to allow mock data usage
    }
  }

  async getVenusStats(): Promise<VenusData | null> {
    try {
      console.log('🌟 Fetching Venus protocol stats...');

      // Mock Venus data for testing
      const mockStats: VenusData = {
        vTokenAddress: '0x95c78222B3D6e262426ccC7F8F5c8A8A8B8B8B8B',
        comptrollerAddress: '0xfD36E2c2a6789Db23113685031d7F16329158384',
        totalSupplied: utils.parseEther('1000000'),
        currentAPY: 8.5,
        exchangeRate: utils.parseEther('0.02'),
        isMarketListed: true,
        supplyRatePerBlock: BigNumber.from('4000000000000000'),
        totalBorrows: utils.parseEther('850000'),
        totalReserves: utils.parseEther('50000'),
        reserveFactorMantissa: utils.parseEther('0.25'),
        borrowRatePerBlock: BigNumber.from('6000000000000000'),
        cash: utils.parseEther('150000')
      };

      console.log('✅ Venus stats (mock):', {
        totalSupplied: utils.formatEther(mockStats.totalSupplied),
        currentAPY: mockStats.currentAPY,
        exchangeRate: utils.formatEther(mockStats.exchangeRate)
      });

      return mockStats;
    } catch (error) {
      console.error('❌ Error fetching Venus stats:', error);
      return null;
    }
  }

  async getUserVenusPosition(userAddress: string): Promise<UserVenusPosition | null> {
    try {
      console.log('👤 Fetching user Venus position for:', userAddress);

      // Mock user position data
      const mockPosition: UserVenusPosition = {
        vTokenBalance: utils.parseEther('50'),
        underlyingBalance: utils.parseEther('1'),
        principalAmount: utils.parseEther('0.95'),
        yieldAccrued: utils.parseEther('0.05'),
        borrowBalance: BigNumber.from(0),
        accountLiquidity: utils.parseEther('100')
      };

      console.log('✅ User Venus position (mock):', {
        vTokenBalance: utils.formatEther(mockPosition.vTokenBalance),
        underlyingBalance: utils.formatEther(mockPosition.underlyingBalance),
        yieldAccrued: utils.formatEther(mockPosition.yieldAccrued)
      });

      return mockPosition;
    } catch (error) {
      console.error('❌ Error fetching user Venus position:', error);
      return null;
    }
  }

  async getUserData(userAddress: string): Promise<VenusUserData> {
    try {
      const position = await this.getUserVenusPosition(userAddress);
      const stats = await this.getVenusStats();

      if (!position || !stats) {
        throw new Error('Failed to get Venus data');
      }

      return {
        vBNBBalance: position.vTokenBalance,
        underlyingBalance: position.underlyingBalance,
        accruedInterest: position.yieldAccrued,
        supplyAPY: stats.currentAPY,
        exchangeRate: stats.exchangeRate,
        lastUpdate: new Date()
      };
    } catch (error) {
      console.error('❌ Error getting Venus user data:', error);
      throw error;
    }
  }

  async getCurrentExchangeRate(): Promise<BigNumber> {
    try {
      const stats = await this.getVenusStats();
      return stats?.exchangeRate || utils.parseEther('0.02');
    } catch (error) {
      console.error('❌ Error getting exchange rate:', error);
      return utils.parseEther('0.02');
    }
  }

  async supplyBNB(amount: BigNumber): Promise<{ hash: string; success: boolean; error?: string }> {
    try {
      console.log('💰 Supplying BNB to Venus:', utils.formatEther(amount));

      // Mock transaction
      const mockHash = '0x' + Math.random().toString(16).substr(2, 64);
      
      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('✅ Venus supply confirmed (mock):', mockHash);

      return {
        hash: mockHash,
        success: true
      };
    } catch (error) {
      console.error('❌ Venus supply failed:', error);
      return {
        hash: '',
        success: false,
        error: error.message
      };
    }
  }

  async redeemBNB(shares: BigNumber): Promise<{ hash: string; success: boolean; error?: string }> {
    try {
      console.log('💸 Redeeming BNB from Venus:', utils.formatEther(shares));

      // Mock transaction
      const mockHash = '0x' + Math.random().toString(16).substr(2, 64);
      
      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('✅ Venus redeem confirmed (mock):', mockHash);

      return {
        hash: mockHash,
        success: true
      };
    } catch (error) {
      console.error('❌ Venus redeem failed:', error);
      return {
        hash: '',
        success: false,
        error: error.message
      };
    }
  }

  cleanup(): void {
    this.provider = null;
    this.signer = null;
    this.venusAdapter = null;
    console.log('🧹 VenusService cleaned up');
  }
}

export const venusService = new VenusService();

export const venusService = new VenusService();