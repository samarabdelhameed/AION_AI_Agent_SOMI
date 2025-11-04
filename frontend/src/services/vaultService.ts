import { ethers, utils } from '../utils/ethersCompat';
import { contractConfig } from '../lib/contractConfig';

interface VaultData {
  balance: any;
  shares: any;
  principal: any;
  totalAssets: any;
  totalShares: any;
  currentAdapter: string;
  minDeposit: any;
  userYieldClaimed: any;
  accumulatedYield: any;
}

interface TransactionResult {
  hash: string;
  success: boolean;
  error?: string;
  gasUsed?: any;
  receipt?: any;
}

interface AdapterInfo {
  adapter: string;
  active: boolean;
  addedAt: any;
  totalDeposited: any;
  totalWithdrawn: any;
  name: string;
  riskLevel: number;
}

class VaultService {
  private provider: any | null = null;
  private signer: any | null = null;
  private vaultContract: ethers.Contract | null = null;
  private eventListeners: Map<string, any> = new Map();

  async initialize(): Promise<boolean> {
    try {
      if (typeof window.ethereum !== 'undefined') {
        this.provider = new ethers.BrowserProvider(window.ethereum);
        this.signer = this.provider.getSigner();
        
        // Initialize vault contract
        this.vaultContract = new ethers.Contract(
          contractConfig.vault.address,
          contractConfig.vault.abi,
          this.signer
        );

        console.log('✅ VaultService initialized successfully');
        return true;
      }
      throw new Error('MetaMask not found');
    } catch (error) {
      console.error('❌ VaultService initialization failed:', error);
      return false;
    }
  }

  // ========== Real Vault Data Functions ==========

  async getVaultData(userAddress: string): Promise<VaultData> {
    if (!this.vaultContract) throw new Error('Vault contract not initialized');

    try {
      console.log('🔍 Fetching real vault data for:', userAddress);

      // Get all data in parallel for better performance
      const [
        balance,
        shares,
        principal,
        totalAssets,
        totalShares,
        currentAdapter,
        minDeposit,
        userYieldClaimed,
        accumulatedYield
      ] = await Promise.all([
        this.vaultContract.balances(userAddress),
        this.vaultContract.sharesOf(userAddress),
        this.vaultContract.principalOf(userAddress),
        this.vaultContract.totalAssets(),
        this.vaultContract.totalShares(),
        this.vaultContract.currentAdapter(),
        this.vaultContract.minDeposit(),
        this.vaultContract.userYieldClaimed(userAddress),
        this.vaultContract.accumulatedYield()
      ]);

      const vaultData: VaultData = {
        balance,
        shares,
        principal,
        totalAssets,
        totalShares,
        currentAdapter,
        minDeposit,
        userYieldClaimed,
        accumulatedYield
      };

      console.log('✅ Real vault data fetched:', {
        balance: utils.formatEther(balance),
        shares: utils.formatEther(shares),
        principal: utils.formatEther(principal),
        totalAssets: utils.formatEther(totalAssets),
        currentAdapter
      });

      return vaultData;
    } catch (error) {
      console.error('❌ Error fetching vault data:', error);
      throw error;
    }
  }

  async getAllAdapters(): Promise<AdapterInfo[]> {
    if (!this.vaultContract) throw new Error('Vault contract not initialized');

    try {
      console.log('🔍 Fetching all adapters from contract...');

      // Get adapter list length first
      const adapterList = await this.vaultContract.adapterList();
      console.log('📋 Found adapters:', adapterList);

      const adapters: AdapterInfo[] = [];
      
      for (const adapterAddress of adapterList) {
        try {
          const adapterInfo = await this.vaultContract.adapters(adapterAddress);
          adapters.push({
            adapter: adapterAddress,
            active: adapterInfo.active,
            addedAt: adapterInfo.addedAt,
            totalDeposited: adapterInfo.totalDeposited,
            totalWithdrawn: adapterInfo.totalWithdrawn,
            name: adapterInfo.name,
            riskLevel: adapterInfo.riskLevel
          });
        } catch (error) {
          console.warn('⚠️ Error fetching adapter info for:', adapterAddress, error);
        }
      }

      console.log('✅ Real adapters data fetched:', adapters);
      return adapters;
    } catch (error) {
      console.error('❌ Error fetching adapters:', error);
      return [];
    }
  }

  // ========== Real Transaction Functions ==========

  async deposit(amount: any): Promise<TransactionResult> {
    if (!this.vaultContract) throw new Error('Vault contract not initialized');

    try {
      console.log('💰 Executing real deposit transaction:', utils.formatEther(amount));

      // Check minimum deposit
      const minDeposit = await this.vaultContract.minDeposit();
      if (amount.lt(minDeposit)) {
        throw new Error(`Amount below minimum deposit: ${utils.formatEther(minDeposit)} BNB`);
      }

      // Execute deposit transaction
      const tx = await this.vaultContract.deposit({
        value: amount,
        gasLimit: 500000 // Set reasonable gas limit
      });

      console.log('📤 Transaction sent:', tx.hash);

      // Wait for confirmation
      const receipt = await tx.wait();
      
      console.log('✅ Deposit transaction confirmed:', {
        hash: receipt.transactionHash,
        gasUsed: receipt.gasUsed.toString(),
        blockNumber: receipt.blockNumber
      });

      // Trigger automatic data refresh after successful transaction
      this.scheduleDataRefresh();

      return {
        hash: receipt.transactionHash,
        success: true,
        gasUsed: receipt.gasUsed,
        receipt
      };
    } catch (error: any) {
      console.error('❌ Deposit transaction failed:', error);
      return {
        hash: '',
        success: false,
        error: error.message
      };
    }
  }

  async withdraw(amount: any): Promise<TransactionResult> {
    if (!this.vaultContract) throw new Error('Vault contract not initialized');

    try {
      console.log('💸 Executing real withdraw transaction:', utils.formatEther(amount));

      const tx = await this.vaultContract.withdraw(amount, {
        gasLimit: 500000
      });

      console.log('📤 Withdraw transaction sent:', tx.hash);

      const receipt = await tx.wait();
      
      console.log('✅ Withdraw transaction confirmed:', {
        hash: receipt.transactionHash,
        gasUsed: receipt.gasUsed.toString(),
        blockNumber: receipt.blockNumber
      });

      // Trigger automatic data refresh after successful transaction
      this.scheduleDataRefresh();

      return {
        hash: receipt.transactionHash,
        success: true,
        gasUsed: receipt.gasUsed,
        receipt
      };
    } catch (error: any) {
      console.error('❌ Withdraw transaction failed:', error);
      return {
        hash: '',
        success: false,
        error: error.message
      };
    }
  }

  async withdrawShares(shares: any): Promise<TransactionResult> {
    if (!this.vaultContract) throw new Error('Vault contract not initialized');

    try {
      console.log('📊 Executing real withdrawShares transaction:', utils.formatEther(shares));

      const tx = await this.vaultContract.withdrawShares(shares, {
        gasLimit: 500000
      });

      console.log('📤 WithdrawShares transaction sent:', tx.hash);

      const receipt = await tx.wait();
      
      console.log('✅ WithdrawShares transaction confirmed:', {
        hash: receipt.transactionHash,
        gasUsed: receipt.gasUsed.toString(),
        blockNumber: receipt.blockNumber
      });

      // Trigger automatic data refresh after successful transaction
      this.scheduleDataRefresh();

      return {
        hash: receipt.transactionHash,
        success: true,
        gasUsed: receipt.gasUsed,
        receipt
      };
    } catch (error: any) {
      console.error('❌ WithdrawShares transaction failed:', error);
      return {
        hash: '',
        success: false,
        error: error.message
      };
    }
  }

  async claimYield(): Promise<TransactionResult> {
    if (!this.vaultContract) throw new Error('Vault contract not initialized');

    try {
      console.log('🎯 Executing real claimYield transaction...');

      const tx = await this.vaultContract.claimYield({
        gasLimit: 300000
      });

      console.log('📤 ClaimYield transaction sent:', tx.hash);

      const receipt = await tx.wait();
      
      console.log('✅ ClaimYield transaction confirmed:', {
        hash: receipt.transactionHash,
        gasUsed: receipt.gasUsed.toString(),
        blockNumber: receipt.blockNumber
      });

      // Trigger automatic data refresh after successful transaction
      this.scheduleDataRefresh();

      return {
        hash: receipt.transactionHash,
        success: true,
        gasUsed: receipt.gasUsed,
        receipt
      };
    } catch (error: any) {
      console.error('❌ ClaimYield transaction failed:', error);
      return {
        hash: '',
        success: false,
        error: error.message
      };
    }
  }

  async emergencyWithdraw(): Promise<TransactionResult> {
    if (!this.vaultContract) throw new Error('Vault contract not initialized');

    try {
      console.log('🚨 Executing EMERGENCY withdraw transaction...');

      const tx = await this.vaultContract.emergencyWithdraw({
        gasLimit: 500000
      });

      console.log('📤 Emergency withdraw transaction sent:', tx.hash);

      const receipt = await tx.wait();
      
      console.log('✅ Emergency withdraw confirmed:', {
        hash: receipt.transactionHash,
        gasUsed: receipt.gasUsed.toString(),
        blockNumber: receipt.blockNumber
      });

      // Trigger automatic data refresh after successful transaction
      this.scheduleDataRefresh();

      return {
        hash: receipt.transactionHash,
        success: true,
        gasUsed: receipt.gasUsed,
        receipt
      };
    } catch (error: any) {
      console.error('❌ Emergency withdraw failed:', error);
      return {
        hash: '',
        success: false,
        error: error.message
      };
    }
  }

  // ========== Real-time Event Listening ==========

  startEventListening(userAddress: string, onUpdate: (data: VaultData) => void): void {
    if (!this.vaultContract) return;

    console.log('👂 Starting real-time event listening for:', userAddress);

    // Listen for Deposited events
    const depositedFilter = this.vaultContract.filters.Deposited(userAddress);
    const depositedListener = (user: string, amount: any, shares: any, event: any) => {
      console.log('🔔 Deposited event:', {
        user,
        amount: utils.formatEther(amount),
        shares: utils.formatEther(shares),
        txHash: event.transactionHash
      });
      this.refreshVaultData(userAddress, onUpdate);
    };

    // Listen for Withdrawn events
    const withdrawnFilter = this.vaultContract.filters.Withdrawn(userAddress);
    const withdrawnListener = (user: string, amount: any, shares: any, event: any) => {
      console.log('🔔 Withdrawn event:', {
        user,
        amount: utils.formatEther(amount),
        shares: utils.formatEther(shares),
        txHash: event.transactionHash
      });
      this.refreshVaultData(userAddress, onUpdate);
    };

    // Listen for YieldClaimed events
    const yieldClaimedFilter = this.vaultContract.filters.YieldClaimed(userAddress);
    const yieldClaimedListener = (user: string, amount: any, event: any) => {
      console.log('🔔 YieldClaimed event:', {
        user,
        amount: utils.formatEther(amount),
        txHash: event.transactionHash
      });
      this.refreshVaultData(userAddress, onUpdate);
    };

    // Add listeners
    this.vaultContract.on(depositedFilter, depositedListener);
    this.vaultContract.on(withdrawnFilter, withdrawnListener);
    this.vaultContract.on(yieldClaimedFilter, yieldClaimedListener);

    // Store listeners for cleanup
    this.eventListeners.set('deposited', depositedListener);
    this.eventListeners.set('withdrawn', withdrawnListener);
    this.eventListeners.set('yieldClaimed', yieldClaimedListener);
  }

  stopEventListening(): void {
    if (!this.vaultContract) return;

    console.log('🔇 Stopping event listening...');
    
    // Remove all listeners from the contract
    this.vaultContract.removeAllListeners();
    
    this.eventListeners.clear();
  }

  private async refreshVaultData(userAddress: string, onUpdate: (data: VaultData) => void): Promise<void> {
    try {
      const vaultData = await this.getVaultData(userAddress);
      onUpdate(vaultData);
    } catch (error) {
      console.error('❌ Error refreshing vault data:', error);
    }
  }

  // ========== Utility Functions ==========

  async calculateSharesForDeposit(amount: any): Promise<any> {
    if (!this.vaultContract) throw new Error('Vault contract not initialized');

    try {
      return await this.vaultContract.calculateSharesForDeposit(amount);
    } catch (error) {
      console.error('❌ Error calculating shares:', error);
      return 0;
    }
  }

  async calculateAssetsForShares(shares: any): Promise<any> {
    if (!this.vaultContract) throw new Error('Vault contract not initialized');

    try {
      return await this.vaultContract.calculateAssetsForShares(shares);
    } catch (error) {
      console.error('❌ Error calculating assets:', error);
      return 0;
    }
  }

  // ========== Network and Connection ==========

  async checkConnection(): Promise<boolean> {
    try {
      if (!this.provider) return false;
      
      const network = await this.provider.getNetwork();
      const accounts = await this.provider.listAccounts();
      
      console.log('🌐 Network connection check:', {
        chainId: network.chainId,
        name: network.name,
        accounts: accounts.length
      });

      return accounts.length > 0;
    } catch (error) {
      console.error('❌ Connection check failed:', error);
      return false;
    }
  }

  async switchNetwork(chainId: number): Promise<boolean> {
    try {
      if (!window.ethereum) return false;

      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });

      return true;
    } catch (error) {
      console.error('❌ Network switch failed:', error);
      return false;
    }
  }

  // ========== Cleanup ==========

  cleanup(): void {
    this.stopEventListening();
    this.provider = null;
    this.signer = null;
    this.vaultContract = null;
    console.log('🧹 VaultService cleaned up');
  }

  // ========== Automatic Data Refresh ==========

  private scheduleDataRefresh(): void {
    console.log('🔄 Scheduling automatic data refresh after transaction...');
    
    // Wait for blockchain to settle, then refresh all connected components
    setTimeout(() => {
      console.log('🔄 Executing automatic data refresh...');
      
      // Emit a custom event that components can listen to
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('vaultDataRefresh', {
          detail: { timestamp: Date.now() }
        }));
      }
      
      console.log('✅ Automatic data refresh completed');
    }, 3000); // Wait 3 seconds for blockchain to settle
  }
}

export const vaultService = new VaultService();