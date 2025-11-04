import { ethers, BrowserProvider, Contract, BigNumber } from '../utils/ethersCompat';
import { contractConfig, networkConfig, PROTOCOL_INFO } from '../lib/contractConfig';

export interface Web3State {
  isConnected: boolean;
  account: string | null;
  chainId: number | null;
  provider: BrowserProvider | null;
  signer: any | null;
  network: string;
}

export interface ContractCallResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  gasUsed?: BigNumber;
  transactionHash?: string;
}

export interface StrategyInfo {
  name: string;
  protocol: string;
  totalAssets: BigNumber;
  totalShares: BigNumber;
  estimatedAPY: BigNumber;
  riskLevel: number;
  isHealthy: boolean;
  lastUpdate: BigNumber;
  underlying: string;
}

export interface VaultInfo {
  totalAssets: BigNumber;
  totalShares: BigNumber;
  currentAdapter: string;
  minDeposit: BigNumber;
  accumulatedYield: BigNumber;
}

export interface UserPosition {
  balance: BigNumber;
  shares: BigNumber;
  principal: BigNumber;
  userYieldClaimed: BigNumber;
  pendingYield: BigNumber;
}

class Web3Service {
  private state: Web3State = {
    isConnected: false,
    account: null,
    chainId: null,
    provider: null,
    signer: null,
    network: 'bscTestnet'
  };

  private contracts: Map<string, Contract> = new Map();
  private eventListeners: Map<string, any> = new Map();

  // ========== INITIALIZATION ==========

  async initialize(): Promise<boolean> {
    try {
      if (typeof window.ethereum === 'undefined') {
        throw new Error('MetaMask not found. Please install MetaMask.');
      }

      // Initialize provider
      this.state.provider = new BrowserProvider(window.ethereum);
      
      // Get signer
      this.state.signer = await this.state.provider.getSigner();
      
      // Get account
      const accounts = await this.state.provider.listAccounts();
      if (accounts.length > 0) {
        this.state.account = accounts[0].address;
      }

      // Get network
      const network = await this.state.provider.getNetwork();
      this.state.chainId = Number(network.chainId);
      this.state.network = this.getNetworkName(this.state.chainId);

      // Initialize contracts
      await this.initializeContracts();

      this.state.isConnected = true;
      console.log('✅ Web3Service initialized successfully');
      console.log('🔗 Network:', this.state.network);
      console.log('👤 Account:', this.state.account);
      
      return true;
    } catch (error) {
      console.error('❌ Web3Service initialization failed:', error);
      return false;
    }
  }

  private async initializeContracts(): Promise<void> {
    try {
      // Initialize AIONVault contract
      const vaultContract = new Contract(
        contractConfig.vault.address,
        contractConfig.vault.abi,
        this.state.signer
      );
      this.contracts.set('vault', vaultContract);

      // Initialize strategy contracts
      for (const [name, strategy] of Object.entries(contractConfig.strategies)) {
        const contract = new Contract(
          strategy.address,
          strategy.abi,
          this.state.signer
        );
        this.contracts.set(`strategy_${name}`, contract);
      }

      // Initialize adapter contracts
      for (const [name, adapter] of Object.entries(contractConfig.adapters)) {
        const contract = new Contract(
          adapter.address,
          adapter.abi,
          this.state.signer
        );
        this.contracts.set(`adapter_${name}`, contract);
      }

      console.log('✅ All contracts initialized');
    } catch (error) {
      console.error('❌ Contract initialization failed:', error);
      throw error;
    }
  }

  // ========== NETWORK MANAGEMENT ==========

  private getNetworkName(chainId: number): string {
    switch (chainId) {
      case 97:
        return 'bscTestnet';
      case 56:
        return 'bscMainnet';
      case 1:
        return 'ethereum';
      default:
        return 'unknown';
    }
  }

  async switchNetwork(targetChainId: number): Promise<boolean> {
    try {
      if (this.state.chainId === targetChainId) {
        return true;
      }

      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${targetChainId.toString(16)}` }],
      });

      // Reinitialize after network switch
      await this.initialize();
      return true;
    } catch (error) {
      console.error('❌ Network switch failed:', error);
      return false;
    }
  }

  // ========== VAULT OPERATIONS ==========

  async getVaultInfo(): Promise<ContractCallResult<VaultInfo>> {
    try {
      const vaultContract = this.contracts.get('vault');
      if (!vaultContract) throw new Error('Vault contract not initialized');

      const [totalAssets, totalShares, currentAdapter, minDeposit, accumulatedYield] = await Promise.all([
        vaultContract.totalAssets(),
        vaultContract.totalShares(),
        vaultContract.currentAdapter(),
        vaultContract.minDeposit(),
        vaultContract.accumulatedYield()
      ]);

      return {
        success: true,
        data: {
          totalAssets,
          totalShares,
          currentAdapter,
          minDeposit,
          accumulatedYield
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getUserPosition(userAddress: string): Promise<ContractCallResult<UserPosition>> {
    try {
      const vaultContract = this.contracts.get('vault');
      if (!vaultContract) throw new Error('Vault contract not initialized');

      const [balance, shares, principal, userYieldClaimed] = await Promise.all([
        vaultContract.balanceOf(userAddress),
        vaultContract.sharesOf(userAddress),
        vaultContract.principalOf(userAddress),
        vaultContract.userYieldClaimed(userAddress)
      ]);

      // Calculate pending yield
      const pendingYield = balance.sub(principal);

      return {
        success: true,
        data: {
          balance,
          shares,
          principal,
          userYieldClaimed,
          pendingYield
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async deposit(amount: BigNumber): Promise<ContractCallResult<BigNumber>> {
    try {
      const vaultContract = this.contracts.get('vault');
      if (!vaultContract) throw new Error('Vault contract not initialized');

      console.log('💰 Depositing:', ethers.formatEther(amount), 'BNB');

      const tx = await vaultContract.deposit({ value: amount });
      const receipt = await tx.wait();

      // Get shares from event
      const depositEvent = receipt.logs.find((log: any) => 
        log.topics[0] === vaultContract.interface.getEventTopic('Deposited')
      );

      let shares = BigNumber.from(0);
      if (depositEvent) {
        const decoded = vaultContract.interface.parseLog(depositEvent);
        shares = decoded.args.shares;
      }

      return {
        success: true,
        data: shares,
        gasUsed: receipt.gasUsed,
        transactionHash: receipt.transactionHash
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async withdraw(amount: BigNumber): Promise<ContractCallResult<void>> {
    try {
      const vaultContract = this.contracts.get('vault');
      if (!vaultContract) throw new Error('Vault contract not initialized');

      console.log('💸 Withdrawing:', ethers.formatEther(amount), 'BNB');

      const tx = await vaultContract.withdraw(amount);
      const receipt = await tx.wait();

      return {
        success: true,
        gasUsed: receipt.gasUsed,
        transactionHash: receipt.transactionHash
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async claimYield(): Promise<ContractCallResult<void>> {
    try {
      const vaultContract = this.contracts.get('vault');
      if (!vaultContract) throw new Error('Vault contract not initialized');

      console.log('🎯 Claiming yield...');

      const tx = await vaultContract.claimYield();
      const receipt = await tx.wait();

      return {
        success: true,
        gasUsed: receipt.gasUsed,
        transactionHash: receipt.transactionHash
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ========== STRATEGY OPERATIONS ==========

  async getStrategyInfo(strategyName: string): Promise<ContractCallResult<StrategyInfo>> {
    try {
      const strategyContract = this.contracts.get(`strategy_${strategyName}`);
      if (!strategyContract) throw new Error(`Strategy ${strategyName} not found`);

      const [
        name,
        totalAssets,
        totalShares,
        estimatedAPY,
        riskLevel,
        isHealthy,
        lastUpdate,
        underlying
      ] = await Promise.all([
        strategyContract.strategyName(),
        strategyContract.totalAssets(),
        strategyContract.totalShares(),
        strategyContract.estimatedAPY(),
        strategyContract.riskLevel ? strategyContract.riskLevel() : 2,
        strategyContract.isHealthy ? strategyContract.isHealthy() : true,
        strategyContract.lastUpdate ? strategyContract.lastUpdate() : BigNumber.from(0),
        strategyContract.underlying ? strategyContract.underlying() : '0x0000000000000000000000000000000000000000'
      ]);

      return {
        success: true,
        data: {
          name,
          protocol: strategyName,
          totalAssets,
          totalShares,
          estimatedAPY,
          riskLevel,
          isHealthy,
          lastUpdate,
          underlying
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async getAllStrategiesInfo(): Promise<ContractCallResult<StrategyInfo[]>> {
    try {
      const strategies = Object.keys(contractConfig.strategies);
      const results = await Promise.all(
        strategies.map(strategy => this.getStrategyInfo(strategy))
      );

      const successfulResults = results
        .filter(result => result.success && result.data)
        .map(result => result.data!);

      return {
        success: true,
        data: successfulResults
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ========== ADAPTER OPERATIONS ==========

  async getAdapterInfo(adapterName: string): Promise<ContractCallResult<StrategyInfo>> {
    try {
      const adapterContract = this.contracts.get(`adapter_${adapterName}`);
      if (!adapterContract) throw new Error(`Adapter ${adapterName} not found`);

      const [
        name,
        totalAssets,
        totalShares,
        estimatedAPY,
        riskLevel,
        isHealthy,
        lastUpdate,
        underlying
      ] = await Promise.all([
        adapterContract.name(),
        adapterContract.totalAssets(),
        adapterContract.totalShares(),
        adapterContract.estimatedAPY(),
        adapterContract.riskLevel(),
        adapterContract.isHealthy(),
        adapterContract.lastUpdate(),
        adapterContract.underlying()
      ]);

      return {
        success: true,
        data: {
          name,
          protocol: adapterName,
          totalAssets,
          totalShares,
          estimatedAPY,
          riskLevel,
          isHealthy,
          lastUpdate,
          underlying
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // ========== UTILITY FUNCTIONS ==========

  async getGasPrice(): Promise<BigNumber> {
    try {
      if (!this.state.provider) throw new Error('Provider not initialized');
      const feeData = await this.state.provider.getFeeData();
      return feeData.gasPrice || BigNumber.from(0);
    } catch (error) {
      console.error('❌ Failed to get gas price:', error);
      return BigNumber.from(0);
    }
  }

  async estimateGas(contract: Contract, method: string, args: any[]): Promise<BigNumber> {
    try {
      return await contract.estimateGas[method](...args);
    } catch (error) {
      console.error('❌ Gas estimation failed:', error);
      return BigNumber.from(0);
    }
  }

  // ========== EVENT LISTENING ==========

  onVaultEvent(eventName: string, callback: (data: any) => void): void {
    try {
      const vaultContract = this.contracts.get('vault');
      if (!vaultContract) throw new Error('Vault contract not initialized');

      const listener = (data: any) => callback(data);
      vaultContract.on(eventName, listener);
      this.eventListeners.set(`vault_${eventName}`, listener);

      console.log(`👂 Listening to vault event: ${eventName}`);
    } catch (error) {
      console.error('❌ Failed to listen to vault event:', error);
    }
  }

  offVaultEvent(eventName: string): void {
    try {
      const vaultContract = this.contracts.get('vault');
      if (!vaultContract) return;

      const listener = this.eventListeners.get(`vault_${eventName}`);
      if (listener) {
        vaultContract.off(eventName, listener);
        this.eventListeners.delete(`vault_${eventName}`);
        console.log(`🔇 Stopped listening to vault event: ${eventName}`);
      }
    } catch (error) {
      console.error('❌ Failed to stop listening to vault event:', error);
    }
  }

  // ========== STATE GETTERS ==========

  getState(): Web3State {
    return { ...this.state };
  }

  isConnected(): boolean {
    return this.state.isConnected;
  }

  getAccount(): string | null {
    return this.state.account;
  }

  getNetwork(): string {
    return this.state.network;
  }

  getChainId(): number | null {
    return this.state.chainId;
  }

  // ========== CLEANUP ==========

  async disconnect(): Promise<void> {
    try {
      // Remove all event listeners
      for (const [key, listener] of this.eventListeners) {
        const [contractType, eventName] = key.split('_');
        const contract = this.contracts.get(contractType);
        if (contract) {
          contract.off(eventName, listener);
        }
      }
      this.eventListeners.clear();

      // Clear contracts
      this.contracts.clear();

      // Reset state
      this.state = {
        isConnected: false,
        account: null,
        chainId: null,
        provider: null,
        signer: null,
        network: 'bscTestnet'
      };

      console.log('🔌 Web3Service disconnected');
    } catch (error) {
      console.error('❌ Disconnect failed:', error);
    }
  }
}

// Export singleton instance
export const web3Service = new Web3Service();

// Export types
export type { Web3State, ContractCallResult, StrategyInfo, VaultInfo, UserPosition };
